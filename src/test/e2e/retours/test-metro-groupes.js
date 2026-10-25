/* METRO A (choix du 25/10) : accueil en tuiles Metro proportionnees (une couleur par menu), sous-menus en groupes
 * par famille, icones modernes (Lucide) : une par menu et une par sous-menu.
 *
 * Par les vues (admin, 1366 x 768), Metro ouvert par le logo de l'en-tete (« Retour au menu principal ») :
 *  - le Metro est la nouvelle page (general/metro/), servie par la route v1/metro (sans session : 401) ;
 *  - accueil : autant de tuiles que de menus dans la navigation, chacune avec son icone et sa couleur, sans
 *    defilement ni defilement horizontal ;
 *  - « Gestion du stock » : les sous-menus de la navigation, ranges en groupes titres ; chaque sous-menu a SON icone
 *    (aucune icone manquante, aucune icone de secours) ; badge des articles a reassortir sur « Gestion des reserves » ;
 *  - un sous-menu ouvre l'ecran dans Prestige, avec son titre (« Retour fournisseur ») ;
 *  - retour a l'accueil par la fleche ; recherche au clavier (« perim ») puis Echap ;
 *  - profil restreint (role Vendeur, compte d'essai) : seulement ses menus ;
 *  - aucune erreur JavaScript, aucune fenetre. Compte d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-METRO', LOGIN = 'e2e-metro', MDP = 'E2e-Metro-7';
const ROLE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const nettoyer = () => q("DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "';"
  + " DELETE FROM t_session_utilisateur WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");

/* le Metro, ouvert comme l'utilisateur : logo de l'en-tete « Retour au menu principal » */
async function metro(p, ouvrir) {
  if (ouvrir) { await p.click('.hdr-brand'); }
  await p.waitForFunction(() => { const f = document.querySelector('#mainmenumanager iframe'); return f && f.contentDocument && f.contentDocument.querySelector('.tuile'); }, null, { timeout: 60000 });
  return p.frames().find((f) => /\/metro\//.test(f.url()));
}

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const erreurs = [], dialogues = [];
  try {
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const sans = await anonyme.evaluate(async () => (await fetch('../api/v1/metro')).status);
    ok('Route v1/metro sans session : 401', sans === 401, sans);

    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, 'admin', 'e2etest');
    await p.waitForTimeout(2000);
    let f = await metro(p, true).catch(() => null);
    ok('Accueil : le Métro est la nouvelle page (general/metro/)', !!f, p.frames().map((x) => x.url()).join(' | '));
    if (!f) { throw new Error('nouveau Metro absent'); }
    await f.waitForTimeout(1500);
    const nav = await p.evaluate(() => { const o = {}; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().childNodes.forEach((n) => { o[n.get('text')] = n.childNodes.map((c) => c.get('id')); }); return o; });
    const accueil = await f.evaluate(() => {
      const t = [...document.querySelectorAll('.tuile')];
      const zone = document.getElementById('zone');
      return { n: t.length, noms: t.map((x) => x.querySelector('.nom').textContent.trim()),
        icones: t.filter((x) => { const u = x.querySelector('use'); return u && document.querySelector(u.getAttribute('href')); }).length,
        couleurs: new Set(t.map((x) => getComputedStyle(x).backgroundColor)).size,
        defile: zone.scrollHeight - zone.clientHeight, horiz: document.documentElement.scrollWidth > innerWidth };
    });
    const nbNav = Object.keys(nav).length;
    ok('Accueil : une tuile par menu de la navigation (' + nbNav + ')', accueil.n === nbNav, JSON.stringify(accueil.noms));
    ok('Accueil : chaque menu a son icône et sa couleur', accueil.icones === accueil.n && accueil.couleurs === accueil.n, accueil.icones + ' icônes, ' + accueil.couleurs + ' couleurs');
    ok('Accueil : tout tient à l\'écran (ni défilement, ni défilement horizontal)', accueil.defile <= 2 && !accueil.horiz, JSON.stringify(accueil));

    /* Gestion du stock : groupes, une icone par sous-menu */
    await f.click('.tuile[aria-label^="Gestion du stock"]');
    await f.waitForSelector('.groupe .tuile', { timeout: 10000 });
    await f.waitForTimeout(1200);
    const stockNav = nav['GESTION DU STOCK'] || [];
    const stock = await f.evaluate(() => {
      const t = [...document.querySelectorAll('.groupe .tuile')];
      const ids = t.map((x) => (x.querySelector('use') || { getAttribute: () => '' }).getAttribute('href'));
      return { n: t.length, groupes: [...document.querySelectorAll('.groupe h2')].map((h) => h.textContent.trim()),
        manquantes: t.filter((x, i) => !ids[i] || !document.querySelector(ids[i])).map((x) => x.querySelector('.nom').textContent),
        secours: t.filter((x) => x.dataset.icone === 'secours').map((x) => x.querySelector('.nom').textContent),
        titre: document.getElementById('titre').textContent, horiz: document.documentElement.scrollWidth > innerWidth };
    });
    ok('« Gestion du stock » : tous ses sous-menus (' + stockNav.length + '), rangés en groupes titrés', stock.n === stockNav.length && stock.groupes.length >= 3 && stock.titre === 'Gestion du stock', stock.n + ' / ' + stock.groupes.join(', '));
    ok('« Gestion du stock » : chaque sous-menu a son icône (aucune manquante, aucune de secours)', !stock.manquantes.length && !stock.secours.length, stock.manquantes.concat(stock.secours).join(', '));
    /* badge des articles a reassortir sur « Gestion des réserves », comme l'ancien Metro */
    const reserve = await f.evaluate(async () => {
      const d = await (await fetch('../../api/v1/reserve/suggestions?start=0&limit=1')).json();
      const t = document.querySelector('.tuile[data-composant="reservemanager"]');
      const bdg = t && t.querySelector('.badge');
      return { total: parseInt(d.total || 0, 10), tuile: !!t, badge: bdg ? bdg.textContent : '' };
    });
    ok('« Gestion des réserves » : badge des articles à réassortir (' + reserve.total + ')', reserve.tuile && (reserve.total > 0 ? reserve.badge === String(reserve.total) : reserve.badge === ''), JSON.stringify(reserve));
    /* toutes les icones de tous les menus : aucune de secours */
    const toutes = await f.evaluate(() => window.PrestigeMetro.sansIcone());
    ok('Tous les menus : aucun sous-menu sans icône dédiée', toutes.length === 0, toutes.join(', '));

    /* retour a l'accueil, puis un sous-menu qui ouvre l'ecran dans Prestige */
    await f.click('#retour');
    await f.waitForFunction(() => document.getElementById('titre').textContent === 'Accueil', null, { timeout: 5000 });
    await f.click('.tuile[aria-label^="Gestion des commandes"]');
    await f.waitForSelector('.groupe .tuile[aria-label^="Retour fournisseur"]', { timeout: 10000 });
    await f.waitForTimeout(800);
    await f.click('.groupe .tuile[aria-label^="Retour fournisseur"]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourfrsmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const titreEcran = await p.evaluate(() => String(Ext.getCmp('content-panel').title || '').replace(/&nbsp;/g, '').trim());
    ok('Un sous-menu ouvre l\'écran dans Prestige, avec son titre', titreEcran === 'Retour fournisseur', titreEcran);

    /* retour au Metro, recherche au clavier puis Echap */
    f = await metro(p, true);
    await f.waitForTimeout(1200);
    await f.click('h1');
    await p.keyboard.type('perim', { delay: 40 });
    await f.waitForTimeout(800);
    const rech = await f.evaluate(() => ({ titre: document.getElementById('titre').textContent, noms: [...document.querySelectorAll('.tuile')].map((x) => x.querySelector('.nom').textContent) }));
    ok('Recherche au clavier « perim » : les écrans des périmés', rech.titre === 'Recherche' && rech.noms.length >= 3 && rech.noms.every((n) => /p[ée]rim/i.test(n)), JSON.stringify(rech).slice(0, 200));
    await p.keyboard.press('Escape');
    await f.waitForTimeout(800);
    ok('Échap : retour à l\'accueil', await f.evaluate(() => document.getElementById('titre').textContent) === 'Accueil');

    /* profil restreint */
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'METRO', 'Vendeur', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
    const p2 = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p2.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p2, LOGIN, MDP);
    await p2.waitForTimeout(2000);
    const f2 = await metro(p2, true);
    await f2.waitForTimeout(1200);
    const nav2 = await p2.evaluate(() => Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().childNodes.length);
    const n2 = await f2.evaluate(() => document.querySelectorAll('.tuile').length);
    ok('Profil restreint (Vendeur) : seulement ses menus (' + nav2 + ')', n2 === nav2 && n2 < accueil.n, n2 + ' tuiles / ' + nav2 + ' menus');
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Compte d\'essai retiré', q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
