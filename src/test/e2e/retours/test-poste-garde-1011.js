/* PLAN DU 09/11, POINT 7 : LE NOM DU POSTE N'EST PLUS PERDU A LA DECONNEXION ; LISTE SERVEUR DES POSTES CONNUS.
 *
 * Parcours par de vrais clics, en une seule session de navigateur (le stockage du poste est celui du navigateur) :
 *  1. connexion par la page de connexion ; Parametrages › rubrique « Poste » : nom saisi, « Enregistrer » arme le
 *     bouton (rien n'est garde au premier clic, aucune fenetre), second clic : nom garde ;
 *  2. deconnexion par le bouton du bandeau : le nom reste sur le poste (avant : tout le stockage etait vide) ;
 *  3. reconnexion par la page de connexion : le journal (Authentification … nom poste) et le journal RH des
 *     connexions (t_session_utilisateur) portent ce nom (avant : la page de connexion n'envoyait pas le nom) ;
 *  4. liste des postes connus de la rubrique = API = calcul independant sur t_session_utilisateur (365 jours),
 *     ligne par ligne (poste, derniere connexion, utilisateur, adresse, nombre de connexions) ;
 *  5. « Effacer » (confirmation dans le bouton) : nom retire ; nouvelle connexion : nom reseau a nouveau ;
 *  6. API refusee sans session (401).
 * Bilan : lignes de journal et sessions portant le nom d'essai retirees ; aucun autre parametre touche.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const ACCUEIL = (process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html';
const POSTE = 'E2E Poste é 1011';
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const empreinteParams = () => q("SELECT CONCAT(COUNT(*), '|', IFNULL(MAX(dt_UPDATED), '')) FROM t_parameters");

function nettoyer() {
  q(`DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND remote_host = '${POSTE}';`
    + ` DELETE FROM t_session_utilisateur WHERE debut >= '${DEBUT}' AND poste = '${POSTE}';`);
}

/* reference independante : sessions des 365 derniers jours, regroupees par poste (la plus recente donne
   l'utilisateur et l'adresse), de la plus recente a la plus ancienne */
function reference() {
  const lignes = q("SELECT s.poste, DATE_FORMAT(s.debut, '%Y-%m-%d %H:%i:%s'), s.id, IFNULL(s.ip, ''),"
    + " TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, '')))"
    + " FROM t_session_utilisateur s LEFT JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID"
    + " WHERE s.debut >= NOW() - INTERVAL 365 DAY AND s.poste IS NOT NULL AND TRIM(s.poste) <> ''").split(/\r?\n/).filter(Boolean)
    .map((l) => { const [poste, debut, id, ip, util] = l.split('\t'); return { poste: poste.trim(), debut, id, ip, util }; });
  lignes.sort((a, b) => (a.debut < b.debut ? 1 : a.debut > b.debut ? -1 : (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)));
  const vus = new Map();
  for (const l of lignes) {
    const k = l.poste.toLowerCase();
    if (!vus.has(k)) { vus.set(k, { poste: l.poste, derniere: l.debut, utilisateur: l.util, ip: l.ip, connexions: 0 }); }
    vus.get(k).connexions++;
  }
  return Array.from(vus.values()).slice(0, 200);
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const avantParams = empreinteParams();
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(String(e.message)));
    const stockage = () => p.evaluate(() => window.localStorage.getItem('prestige.poste'));
    const connecter = async () => {
      await p.goto(ACCUEIL, { waitUntil: 'domcontentloaded' });
      await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
      await p.waitForURL('**/general/**', { timeout: 60000 });
      await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
        && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    };
    const deconnecter = async () => {
      await p.click('.hdr-logout');
      await p.waitForFunction(() => Array.from(document.querySelectorAll('.x-btn')).some((x) => /Se déconnecter/.test(x.textContent) && x.offsetParent), null, { timeout: 20000 });
      await p.evaluate(() => { const x = Array.from(document.querySelectorAll('.x-btn')).find((y) => /Se déconnecter/.test(y.textContent) && y.offsetParent); x.setAttribute('data-e2e', 'deco'); });
      await p.click('[data-e2e=deco]');
      await p.waitForURL((u) => !/\/general\//.test(String(u)), { timeout: 60000 });
      await p.waitForLoadState('domcontentloaded');
    };
    const ouvrirRubrique = async () => {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('parametermanager', 'Paramétrages', ''));
      await p.waitForSelector('.param-rubrique[data-code="POSTE"]', { timeout: 60000 });
      await p.click('.param-rubrique[data-code="POSTE"]');
      await p.waitForFunction(() => { const r = Ext.ComponentQuery.query('parametermanager #rubriquePoste')[0]; return r && r.isVisible() && r.__charge; }, null, { timeout: 30000 });
    };
    const champ = () => p.evaluate(() => Ext.ComponentQuery.query('parametermanager #nomPosteParam')[0].getValue());
    const bouton = async (id) => {
      await p.evaluate((i) => Ext.ComponentQuery.query('parametermanager #' + i)[0].getEl().dom.setAttribute('data-e2e', i), id);
      await p.click('[data-e2e=' + id + ']');
    };
    const texteBouton = (id) => p.evaluate((i) => Ext.ComponentQuery.query('parametermanager #' + i)[0].getText(), id);
    const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window[hidden=false]').length);

    /* 1. connexion, rubrique Poste, enregistrement confirme dans le bouton */
    await connecter();
    ok('Précondition : aucun nom de poste dans ce navigateur neuf', (await stockage()) === null, await stockage());
    await ouvrirRubrique();
    ok('Paramétrages : la rubrique « Poste » s\'ouvre, champ vide', (await champ()) === '', await champ());
    await p.evaluate(() => Ext.ComponentQuery.query('parametermanager #nomPosteParam')[0].inputEl.dom.setAttribute('data-e2e', 'nom'));
    await p.fill('[data-e2e=nom]', POSTE);
    await bouton('btnPosteEnregistrer');
    ok('Enregistrer, premier clic : le bouton demande confirmation, rien n\'est gardé, aucune fenêtre',
      /Confirmer/.test(await texteBouton('btnPosteEnregistrer')) && (await stockage()) === null && (await fenetres()) === 0,
      JSON.stringify([await texteBouton('btnPosteEnregistrer'), await stockage(), await fenetres()]));
    await p.waitForTimeout(500);
    await bouton('btnPosteEnregistrer');
    await p.waitForTimeout(500);
    ok('Enregistrer, second clic : nom gardé sur ce poste', (await stockage()) === POSTE && (await champ()) === POSTE, await stockage());
    const journalPoste = await p.evaluate(() => window.PrestigePoste.lire());
    ok('Même réglage que « Fichier journal › Ce poste »', journalPoste === POSTE, journalPoste);

    /* 2. deconnexion : le nom reste */
    await deconnecter();
    ok('Déconnexion par le bandeau : le nom du poste reste sur le poste', (await stockage()) === POSTE, await stockage());
    const autres = await p.evaluate(() => ['lg_EMPLACEMENT_ID', 'OFFICINE', 'xtypeuser'].map((k) => window.localStorage.getItem(k)));
    ok('Déconnexion : les données de la session sont toujours vidées', autres.every((x) => x === null), JSON.stringify(autres));

    /* 3. reconnexion : le nom part avec la connexion */
    const t3 = q('SELECT NOW() - INTERVAL 1 SECOND');
    await connecter();
    await p.waitForTimeout(1000);
    const util = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
    const rh = q(`SELECT poste FROM t_session_utilisateur WHERE debut >= '${t3}' AND lg_USER_ID = '${util}' ORDER BY debut DESC LIMIT 1`);
    ok('Connexion : le journal RH des connexions porte le nom du poste', rh === POSTE, rh);
    const lj = q(`SELECT CONCAT_WS('|', remote_host, str_DESCRIPTION LIKE '%nom poste ${POSTE} %') FROM t_event_log WHERE dt_CREATED >= '${t3}'`
      + " AND str_DESCRIPTION LIKE 'Authentification%' ORDER BY dt_CREATED DESC LIMIT 1");
    ok('Connexion : la ligne « Authentification … nom poste » du journal porte le nom', lj === POSTE + '|1', lj);

    /* 4. liste des postes connus : ecran = API = base */
    await ouvrirRubrique();
    ok('Après reconnexion : la rubrique affiche le nom gardé', (await champ()) === POSTE, await champ());
    const api = await p.evaluate(async () => (await fetch('../api/v1/postes/connus')).json());
    const ref = reference();
    const cle = (x) => [x.poste, x.derniere, x.utilisateur, x.ip, Number(x.connexions)].join('|');
    const ecartApi = ref.findIndex((x, i) => !api.data || cle(x) !== cle(api.data[i]));
    ok('API des postes connus = base, ligne par ligne', api.success === true && api.data.length === ref.length && ecartApi < 0,
      JSON.stringify({ n: [api.data && api.data.length, ref.length], ecartApi, api: api.data && api.data[ecartApi], ref: ref[ecartApi] }));
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('parametermanager #postesConnus')[0];
      return Array.from(g.getEl().dom.querySelectorAll('.x-grid-row')).map((r) => Array.from(r.querySelectorAll('.x-grid-cell')).map((c) => c.textContent.trim())); });
    const fr = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) + ' ' + d.slice(11, 16);
    const attendu = ref.map((x) => [x.poste + (x.poste === POSTE ? ' (ce poste)' : ''), fr(x.derniere), x.utilisateur, x.ip, String(x.connexions)]);
    const ecartEcran = attendu.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(ecran[i]));
    ok('Rubrique « Poste » : liste affichée = base, ligne par ligne (poste, dernière connexion, utilisateur, adresse, connexions)',
      ecran.length === attendu.length && ecartEcran < 0, JSON.stringify({ n: [ecran.length, attendu.length], ecartEcran, ecran: ecran[ecartEcran], attendu: attendu[ecartEcran] }));
    const ligneEssai = ref.find((x) => x.poste === POSTE);
    ok('Le poste d\'essai figure dans la liste : 1 connexion, utilisateur e2e, en tête', !!ligneEssai && ligneEssai.connexions === 1 && ref[0].poste === POSTE,
      JSON.stringify([ligneEssai, ref[0]]));
    ok('Jeu varié : plusieurs postes connus', ref.length >= 2, ref.length);

    /* bouton arme puis rubrique quittee : au retour, le bouton est revenu a son etat, rien n'est efface */
    await bouton('btnPosteEffacer');
    await p.click('.param-rubrique >> nth=1');
    await p.waitForFunction(() => !Ext.ComponentQuery.query('parametermanager #rubriquePoste')[0].isVisible() && Ext.ComponentQuery.query('parametermanager')[0].getView().isVisible(), null, { timeout: 20000 });
    await p.click('.param-rubrique[data-code="POSTE"]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('parametermanager #rubriquePoste')[0].isVisible(), null, { timeout: 20000 });
    ok('Bouton armé puis rubrique quittée : au retour, « Effacer » est désarmé et le nom est gardé',
      (await texteBouton('btnPosteEffacer')) === 'Effacer' && (await stockage()) === POSTE && (await champ()) === POSTE,
      JSON.stringify([await texteBouton('btnPosteEffacer'), await stockage()]));
    await p.waitForTimeout(600);

    /* 5. Effacer, confirme dans le bouton ; la connexion suivante reprend le nom reseau */
    await bouton('btnPosteEffacer');
    ok('Effacer, premier clic : confirmation dans le bouton, nom encore gardé', /Confirmer/.test(await texteBouton('btnPosteEffacer')) && (await stockage()) === POSTE,
      await texteBouton('btnPosteEffacer'));
    await p.waitForTimeout(500);
    await bouton('btnPosteEffacer');
    await p.waitForTimeout(500);
    ok('Effacer, second clic : nom retiré, champ vide', (await stockage()) === null && (await champ()) === '', JSON.stringify([await stockage(), await champ()]));
    await deconnecter();
    const t5 = q('SELECT NOW() - INTERVAL 1 SECOND');
    await connecter();
    await p.waitForTimeout(1000);
    const rh5 = q(`SELECT poste FROM t_session_utilisateur WHERE debut >= '${t5}' AND lg_USER_ID = '${util}' ORDER BY debut DESC LIMIT 1`);
    ok('Après « Effacer » : la connexion suivante reprend le nom réseau', rh5 !== '' && rh5 !== POSTE, rh5);
    ok('Aucune fenêtre surgissante', (await fenetres()) === 0);

    /* 6. securite : pas de liste sans session */
    const p2 = await (await b.newContext()).newPage();
    await p2.goto(ACCUEIL, { waitUntil: 'domcontentloaded' });
    const st = await p2.evaluate(async () => (await fetch('../api/v1/postes/connus')).status);
    ok('API des postes connus refusée sans session (401)', st === 401, st);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Bilan : sessions et lignes de journal du poste d\'essai retirées', q(`SELECT (SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND remote_host = '${POSTE}')`
      + ` + (SELECT COUNT(*) FROM t_session_utilisateur WHERE debut >= '${DEBUT}' AND poste = '${POSTE}')`) === '0');
    ok('Bilan : aucun paramètre touché', empreinteParams() === avantParams);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
