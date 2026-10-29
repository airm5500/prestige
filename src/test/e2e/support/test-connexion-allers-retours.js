/* CONNEXION : allers-retours avec la base (retour du 14/10 « lenteur a la connexion »), par l'ecran.
 * Chaque poste interroge la base centrale par le reseau : chaque requete SQL coute un aller-retour (0,5 a 5 ms).
 * Les droits de l'utilisateur etaient charges un par un (211 requetes pour un administrateur, une de plus a chaque
 * nouveau droit) : la connexion d'un administrateur faisait 277 allers-retours, dont 211 pour les droits.
 *  - la connexion (v1/user/auth) d'un administrateur et d'un caissier reste sous 70 allers-retours, quel que soit
 *    le nombre de droits ;
 *  - aucune regression : le menu affiche est exactement celui que donnent les droits du role en base (menus et
 *    sous-menus actifs dont la cle est un droit actif du role) ; administrateur et caissier ;
 *  - un mauvais mot de passe est toujours refuse ;
 *  - aucune fenetre, aucune erreur JavaScript ; utilisateur de test supprime, journal SQL du banc coupe.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const ID = 'E2E-CNX-CAISSE', LOGIN = 'e2e.cnx.caisse', MDP = 'E2e-Caisse-14';
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock' LIMIT 1");
const MAX = 70;

/* menu attendu d'apres la base : meme regle que ws_tree_menu.jsp (droit actif du role, comparaison sans casse) */
function menuAttendu(login) {
  const droits = "SELECT LOWER(p.str_NAME) FROM t_privilege p JOIN t_role_privelege rp ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID "
    + "JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID "
    + `WHERE u.str_LOGIN = '${login}' AND p.str_STATUT = 'enable'`;
  return q("SELECT CONCAT(m.lg_MENU_ID, '>', COALESCE(s.str_COMPOSANT, '')) FROM t_menu m "
    + "LEFT JOIN t_sous_menu s ON s.lg_MENU_ID = m.lg_MENU_ID AND s.str_Status = 'enable' AND LOWER(s.P_KEY) IN (" + droits + ") "
    + "WHERE m.str_Status = 'enable' AND m.lg_MODULE_ID = '1' AND LOWER(m.P_KEY) IN (" + droits + ")")
    .split(/\r?\n/).filter(Boolean).map((x) => x.replace(/^[^>]*>/, '')).filter(Boolean).sort();
}

async function connexion(b, login, mdp) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const dialogues = [], err = [];
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('pageerror', (e) => err.push(String(e.message)));
  await p.goto(URL + '/security/index.html', { waitUntil: 'networkidle' });
  await p.fill('#str_login', login); await p.fill('#str_password', mdp);
  exec('TRUNCATE mysql.general_log');
  let recu;
  const reponse = new Promise((ok) => { recu = ok; });
  await p.route('**/api/v1/user/auth', async (route) => {
    const r = await route.fetch();
    const texte = await r.text();
    recu(JSON.parse(texte));
    await route.fulfill({ response: r, body: texte });
  });
  await p.click('#login');
  const corps = await reponse;
  await new Promise((r) => setTimeout(r, 300));
  const allers = Number(q("SELECT COUNT(*) FROM mysql.general_log WHERE command_type IN ('Query', 'Execute') AND argument NOT LIKE '%general_log%'"));
  return { ctx, p, corps, allers, dialogues, err };
}

async function menuAffiche(p) {
  await p.waitForURL('**/general/**', { timeout: 60000 });
  return p.evaluate(async () => {
    const r = await fetch('../webservices/menumanagement/ws_tree_menu.jsp?node=root');
    const t = JSON.parse(await r.text());
    const ids = [];
    t.forEach((m) => (m.children || []).forEach((s) => ids.push(s.id)));
    return ids.sort();
  });
}

(async () => {
  const journalAvant = q('SELECT @@general_log'), sortieAvant = q('SELECT @@log_output');
  exec(`DELETE FROM t_role_user WHERE lg_USER_ID = '${ID}'; DELETE FROM t_user WHERE lg_USER_ID = '${ID}';`
    + "INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + ` VALUES ('${ID}', '${LOGIN}', MD5('${MDP}'), 'E2E', 'CONNEXION', 'Caissier', 'enable', '1', NOW(), 0);`
    + `INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${ID}', '${ROLE_CAISSE}', '${ID}', NOW());`
    + "SET GLOBAL log_output = 'TABLE'; SET GLOBAL general_log = 1;");
  const b = await ENV_E2E.lancer(chromium);
  const fenetres = [], erreurs = [];
  try {
    const nbDroitsAdmin = q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "'");
    for (const [nom, login, mdp] of [['Administrateur', ENV_E2E.LOGIN, 'e2etest'], ['Caissier', LOGIN, MDP]]) {
      const c = await connexion(b, login, mdp);
      fenetres.push(...c.dialogues); erreurs.push(...c.err);
      ok(`${nom} : connexion acceptée`, c.corps.success === true, JSON.stringify(c.corps).slice(0, 120));
      ok(`${nom} : connexion en ${MAX} allers-retours avec la base au plus`, c.allers <= MAX,
        c.allers + ' allers-retours' + (nom === 'Administrateur' ? ' (' + nbDroitsAdmin + ' droits)' : ''));
      const affiche = await menuAffiche(c.p), attendu = menuAttendu(login);
      const manquants = attendu.filter((x) => affiche.indexOf(x) < 0), enTrop = affiche.filter((x) => attendu.indexOf(x) < 0);
      ok(`${nom} : menu identique aux droits du rôle en base (${attendu.length} sous-menus)`, attendu.length > 0 && !manquants.length && !enTrop.length,
        'manquants ' + manquants.join(',') + ' | en trop ' + enTrop.join(','));
      await c.ctx.close();
    }
    const mauvais = await connexion(b, ENV_E2E.LOGIN, 'mauvais-mot-de-passe');
    ok('Mauvais mot de passe toujours refusé', mauvais.corps.success === false && /incorrect/i.test(mauvais.corps.message || ''), mauvais.corps.message);
    await mauvais.ctx.close();
    ok('Aucune fenêtre, aucune erreur JavaScript', fenetres.length === 0 && erreurs.length === 0, fenetres.concat(erreurs).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    exec(`SET GLOBAL general_log = ${journalAvant}; SET GLOBAL log_output = '${sortieAvant}'; TRUNCATE mysql.general_log;`
      + `DELETE FROM t_session_utilisateur WHERE lg_USER_ID = '${ID}'; DELETE FROM t_event_log WHERE lg_USER_ID = '${ID}';`
      + `DELETE FROM t_role_user WHERE lg_USER_ID = '${ID}'; DELETE FROM t_user WHERE lg_USER_ID = '${ID}';`);
    ok('Utilisateur de test supprimé, journal SQL remis', q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${ID}'`) === '0' && q('SELECT @@general_log') === journalAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
