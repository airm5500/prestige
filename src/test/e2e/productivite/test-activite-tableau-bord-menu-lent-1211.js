/* RETOUR DU 12/11 : « je ne vois plus l'activite des equipes sur le dashboard ».
 *
 * Cause : la carte « Activite des equipes (jour) » n'est construite que si le menu de l'utilisateur contient l'ecran.
 * Le tableau de bord attend le menu 5 s au plus, puis se construit sans lui ; la carte est alors sautee et ne revient
 * jamais, meme quand le menu arrive. Le menu (ws_tree_menu.jsp) depasse 5 s a la premiere connexion apres un
 * deploiement (JSP recompilee) ou sur un serveur charge ; un premier chargement en echec la faisait aussi sauter.
 *
 * Par l'ecran (vraie connexion du compte de test), la reponse du menu etant retardee ou en echec par le navigateur :
 *  1. menu immediat : carte presente (temoin) ;
 *  2. menu a 7 s : carte presente une fois le menu arrive, une seule fois, contenu charge, lien vers le menu ;
 *  3. premiere lecture du menu en echec (500) puis reprise : carte presente ;
 *  4. menu a 7 s mais droit du menu retire au role du compte : pas de carte (aucune apparition a tort), droit remis ;
 * dans chaque cas : toutes les autres cartes presentes, aucune en double, aucune erreur JavaScript.
 * Bilan : droits des roles et preferences du tableau de bord identiques avant / apres.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID WHERE ru.lg_USER_ID = '" + U + "' AND r.str_STATUT = 'enable' LIMIT 1");
const empreinte = () => q("SELECT IFNULL(MD5(GROUP_CONCAT(CONCAT(lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID) ORDER BY lg_ROLE_PRIVILEGE)), '') FROM t_role_privelege");
const LIGNE = q("SELECT IFNULL((SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_PRIVILEGE_ID, '|', IFNULL(rp.dt_CREATED, ''), '|', IFNULL(rp.dt_UPDATED, '')) FROM t_role_privelege rp"
  + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_SM_ACTIVITE_EQUIPES' AND rp.lg_ROLE_ID = '" + ROLE + "'), '')");
const remettreDroit = () => { if (LIGNE && q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + LIGNE.split('|')[0] + "'") === '0') {
  const [id, priv, c, u] = LIGNE.split('|');
  q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + id + "', '" + ROLE + "', '" + priv + "', "
    + (c ? "'" + c + "'" : 'NULL') + ', ' + (u ? "'" + u + "'" : 'NULL') + ')'); } };
const pref = () => q("SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'), '#AUCUNE#')");
const DROITS_AVANT = empreinte();
const PREF_AVANT = pref();
const AUTRES = ['evolution', 'valorisation', 'encaissements', 'mouvements', 'alertes', 'frequentation', 'affluence', 'topmois', 'grossistes', 'topca', 'topqte', 'tva', 'emplacements', 'tiers'];

/* une connexion ; menu : { delai: ms, echecs: nombre de reponses 500 avant la bonne } */
async function cas(b, nom, menu, carteAttendue) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  let echecs = menu.echecs || 0, lectures = 0, arrivee = 0;
  await p.route('**/ws_tree_menu.jsp*', async (r) => {
    lectures++;
    if (echecs > 0) { echecs--; await r.fulfill({ status: 500, body: 'essai' }); return; }
    if (menu.delai) { await new Promise((x) => setTimeout(x, menu.delai)); }
    await r.continue();
    arrivee = Date.now();
  });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => document.querySelector('[data-carte="evolution"]'), null, { timeout: 60000 });
    /* le menu est la (connexion l'attend) : on laisse au tableau de bord 3 s pour en tenir compte */
    await p.waitForTimeout(3000);
    const etat = await p.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[data-carte]')).map((e) => e.getAttribute('data-carte'));
      const corps = document.querySelector('[data-corps="activite"]');
      return { ids, corps: corps ? corps.innerText.slice(0, 200) : null, menu: !!Ext.ComponentQuery.query('tableaubord')[0].menu('activiteequipes') };
    });
    const n = etat.ids.filter((x) => x === 'activite').length;
    ok(`${nom} : lectures du menu par l'écran (${lectures})`, lectures >= 1 + (menu.echecs || 0), lectures);
    ok(`${nom} : menu de l'utilisateur ${carteAttendue ? 'avec' : 'sans'} « Activité des équipes »`, etat.menu === carteAttendue, etat.menu);
    ok(`${nom} : carte « Activité des équipes (jour) » ${carteAttendue ? 'présente, une seule fois' : 'absente'}`, n === (carteAttendue ? 1 : 0), etat.ids.join(','));
    if (carteAttendue) {
      await p.waitForFunction(() => { const c = document.querySelector('[data-corps="activite"]'); return c && !c.querySelector('.tb-attente'); }, null, { timeout: 60000 }).catch(() => {});
      const corps = await p.evaluate(() => { const c = document.querySelector('[data-corps="activite"]'); return c ? c.innerText : ''; });
      ok(`${nom} : contenu de la carte chargé (plus de « Chargement… »)`, corps && !/Chargement/.test(corps), corps.slice(0, 160));
    }
    const manquantes = AUTRES.filter((x) => !etat.ids.includes(x));
    const doubles = etat.ids.filter((x, i) => etat.ids.indexOf(x) !== i);
    ok(`${nom} : toutes les autres cartes présentes, aucune en double`, !manquantes.length && !doubles.length, 'manquantes ' + manquantes + ' doubles ' + doubles);
    ok(`${nom} : aucune erreur JavaScript`, erreurs.length === 0, erreurs.join(' | '));
  } finally {
    await ctx.close();
  }
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    ok('Précondition : le rôle du compte de test a le droit du menu', !!LIGNE, ROLE);
    await cas(b, '1. Menu immédiat', {}, true);
    await cas(b, '2. Menu à 7 s', { delai: 7000 }, true);
    await cas(b, '3. Menu en échec puis repris', { echecs: 1 }, true);
    q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + LIGNE.split('|')[0] + "'");
    await cas(b, '4. Menu à 7 s, sans le droit', { delai: 7000 }, false);
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    remettreDroit();
    await b.close();
    ok('Bilan : droits des rôles identiques avant / après', empreinte() === DROITS_AVANT);
    ok('Bilan : préférences du tableau de bord identiques avant / après', pref() === PREF_AVANT);
    const bons = res.filter((r) => r.c).length;
    console.log(`\n${bons}/${res.length} ${bons === res.length ? 'OK' : 'ECHEC'}`);
    process.exit(bons === res.length ? 0 : 1);
  }
})();
