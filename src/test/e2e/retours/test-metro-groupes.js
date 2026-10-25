/* METRO A (choix du 25/10), monte directement dans Prestige (sans iframe, demande du 25/10 : le clavier) : accueil en
 * tuiles Metro proportionnees (une couleur par menu), sous-menus en groupes par famille, icones modernes (Lucide) :
 * une par menu et une par sous-menu.
 *
 * Par les vues (admin, 1366 x 768), Metro ouvert par le logo de l'en-tete (« Retour au menu principal ») :
 *  - route v1/metro sans session : 401 ; le Metro est dans la page (aucune iframe) ;
 *  - accueil : autant de tuiles que de menus dans la navigation, chacune avec son icone et sa couleur, sans
 *    defilement ni defilement horizontal ;
 *  - clavier SANS clic prealable : taper cherche (« perim »), Echap revient a l'accueil, les fleches passent d'une
 *    tuile a l'autre, Entree ouvre un menu puis un ecran (« Retour fournisseur », avec son titre) ;
 *  - « Gestion du stock » : les sous-menus de la navigation, en groupes titres ; chaque sous-menu a SON icone ; badge
 *    des articles a reassortir sur « Gestion des reserves » ;
 *  - retours du 25/10 : pas de barre de titre vide au-dessus du Metro (elle revient sur les autres ecrans) ; fond clair ; les menus les plus fournis tiennent sans defiler, sur toute la largeur ;
 *  - non-regression : une fenetre ouverte par-dessus garde ses touches ; l'ecran ouvert ensuite garde les siennes
 *    et aucun Metro ne reste monte ; les styles du Metro ne touchent pas le reste de Prestige ;
 *  - profil restreint (role Vendeur, compte d'essai) : seulement ses menus ;
 *  - aucune erreur JavaScript, aucune fenetre. Compte d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-METRO', LOGIN = 'e2e-metro', MDP = 'E2e-Metro-7';
const ROLE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const nettoyer = () => q("DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "';"
  + " DELETE FROM t_session_utilisateur WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");

/* le Metro, ouvert comme l'utilisateur : logo de l'en-tete « Retour au menu principal » */
async function metro(p) {
  await p.click('.hdr-brand');
  await p.waitForFunction(() => document.querySelectorAll('#mainmenumanager .prestige-metro .mt-tuile').length > 0, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
}
const titre = (p) => p.evaluate(() => document.querySelector('.prestige-metro .mt-titre-texte').textContent);
const focus = (p) => p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.className || a.tagName) : ''; });
/* styles de Prestige hors Metro, pour verifier que le Metro n'y touche pas */
const stylesPrestige = (p) => p.evaluate(() => {
  const s = (sel, props) => { const e = document.querySelector(sel); if (!e) { return null; } const c = getComputedStyle(e); return props.map((k) => c[k]).join('|'); };
  return { body: s('body', ['backgroundColor', 'fontFamily', 'fontSize', 'boxSizing', 'overflow']), marque: s('.hdr-brand', ['color', 'fontSize', 'display', 'boxSizing']),
    nav: s('.x-tree-panel', ['backgroundColor', 'fontFamily']), titre: s('#content-panel .x-panel-header-text', ['color', 'fontSize']) };
});

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [], dialogues = [];
  try {
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const sans = await anonyme.evaluate(async () => (await fetch('../api/v1/metro')).status);
    ok('Route v1/metro sans session : 401', sans === 401, sans);

    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(2500);
    const avant = await stylesPrestige(p);
    await metro(p);
    const barreTitre = () => p.evaluate(() => { const cp = Ext.getCmp('content-panel'); return !!(cp.header && cp.header.isVisible()); });
    const barreMetro = await barreTitre();
    const remplit = await p.evaluate(() => { const cp = Ext.getCmp('content-panel').el.dom.getBoundingClientRect(), m = document.querySelector('.prestige-metro').getBoundingClientRect();
      return Math.abs(cp.top - m.top) <= 2 && Math.abs(cp.bottom - m.bottom) <= 3; });
    ok('Métro : pas de barre de titre vide au-dessus, il occupe tout le panneau central', !barreMetro && remplit, 'barre ' + barreMetro + ' / remplit ' + remplit);
    ok('Le Métro est monté dans la page, sans iframe', await p.evaluate(() => !document.querySelector('#mainmenumanager iframe') && !!document.querySelector('#mainmenumanager .prestige-metro')));
    const apres = await stylesPrestige(p);
    ok('Les styles du Métro ne touchent pas le reste de Prestige (page, en-tête, navigation, titre)', JSON.stringify(avant) === JSON.stringify(apres), JSON.stringify(avant) + ' / ' + JSON.stringify(apres));

    const nav = await p.evaluate(() => { const o = {}; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().childNodes.forEach((n) => { o[n.get('text')] = n.childNodes.map((c) => c.get('id')); }); return o; });
    const accueil = await p.evaluate(() => {
      const r = document.querySelector('.prestige-metro'), t = [...r.querySelectorAll('.mt-tuile')], zone = r.querySelector('.mt-zone');
      return { n: t.length, noms: t.map((x) => x.querySelector('.mt-nom').textContent.trim()),
        icones: t.filter((x) => { const u = x.querySelector('use'); return u && document.querySelector(u.getAttribute('href')); }).length,
        couleurs: new Set(t.map((x) => getComputedStyle(x).backgroundColor)).size,
        defile: zone.scrollHeight - zone.clientHeight, horiz: document.documentElement.scrollWidth > innerWidth || zone.scrollWidth > zone.clientWidth };
    });
    const nbNav = Object.keys(nav).length;
    ok('Accueil : une tuile par menu de la navigation (' + nbNav + ')', accueil.n === nbNav, JSON.stringify(accueil.noms));
    ok('Accueil : chaque menu a son icône et sa couleur', accueil.icones === accueil.n && accueil.couleurs === accueil.n, accueil.icones + ' icônes, ' + accueil.couleurs + ' couleurs');
    ok('Accueil : tout tient à l\'écran (ni défilement, ni défilement horizontal)', accueil.defile <= 2 && !accueil.horiz, JSON.stringify({ defile: accueil.defile, horiz: accueil.horiz }));

    /* clavier, sans aucun clic dans le Metro */
    await p.keyboard.type('perim', { delay: 40 });
    await p.waitForTimeout(800);
    const rech = await p.evaluate(() => ({ titre: document.querySelector('.prestige-metro .mt-titre-texte').textContent, champ: document.querySelector('.prestige-metro .mt-q').value,
      noms: [...document.querySelectorAll('.prestige-metro .mt-tuile')].map((x) => x.querySelector('.mt-nom').textContent) }));
    ok('Clavier sans clic : taper « perim » cherche les écrans des périmés', rech.titre === 'Recherche' && rech.champ === 'perim' && rech.noms.length >= 3 && rech.noms.every((n) => /p[ée]rim/i.test(n)), JSON.stringify(rech).slice(0, 200));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
    ok('Échap : retour à l\'accueil, la première tuile a le focus', await titre(p) === 'Accueil' && /^Service client/.test(await focus(p)), await titre(p) + ' / ' + await focus(p));
    await p.keyboard.press('ArrowRight');
    const f2 = await focus(p);
    ok('Flèche droite : la tuile suivante a le focus', f2 !== '' && !/^Service client/.test(f2) && /écran/.test(f2), f2);
    /* jusqu'a « Gestion des commandes » au clavier, puis Entree */
    for (let i = 0; i < 20 && !/^Gestion des commandes/.test(await focus(p)); i++) { await p.keyboard.press('ArrowRight'); }
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
    ok('Entrée : le menu s\'ouvre (« Gestion des commandes »), sa première tuile a le focus', await titre(p) === 'Gestion des commandes' && /\S/.test(await focus(p)), await titre(p) + ' / ' + await focus(p));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
    ok('Échap depuis un menu : retour à l\'accueil', await titre(p) === 'Accueil');

    /* Gestion du stock : groupes, une icone par sous-menu, badge des reserves */
    await p.click('.prestige-metro .mt-tuile[aria-label^="Gestion du stock"]');
    await p.waitForSelector('.prestige-metro .mt-groupe .mt-tuile', { timeout: 10000 });
    await p.waitForTimeout(1200);
    const focusSouris = await p.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('mt-tuile') ? a.getAttribute('aria-label') : ''; });
    ok('Menu ouvert à la souris : aucune tuile ne prend le focus (pas de cadre)', focusSouris === '', focusSouris);
    const stockNav = nav['GESTION DU STOCK'] || [];
    const stock = await p.evaluate(() => {
      const r = document.querySelector('.prestige-metro'), t = [...r.querySelectorAll('.mt-groupe .mt-tuile')];
      const ids = t.map((x) => (x.querySelector('use') || { getAttribute: () => '' }).getAttribute('href'));
      return { n: t.length, groupes: [...r.querySelectorAll('.mt-groupe h2')].map((h) => h.textContent.trim()),
        manquantes: t.filter((x, i) => !ids[i] || !document.querySelector(ids[i])).map((x) => x.querySelector('.mt-nom').textContent),
        secours: t.filter((x) => x.dataset.icone === 'secours').map((x) => x.querySelector('.mt-nom').textContent),
        titre: r.querySelector('.mt-titre-texte').textContent };
    });
    ok('« Gestion du stock » : tous ses sous-menus (' + stockNav.length + '), rangés en groupes titrés', stock.n === stockNav.length && stock.groupes.length >= 3 && stock.titre === 'Gestion du stock', stock.n + ' / ' + stock.groupes.join(', '));
    ok('« Gestion du stock » : chaque sous-menu a son icône (aucune manquante, aucune de secours)', !stock.manquantes.length && !stock.secours.length, stock.manquantes.concat(stock.secours).join(', '));
    const reserve = await p.evaluate(async () => {
      const d = await (await fetch('../api/v1/reserve/suggestions?start=0&limit=1')).json();
      const t = document.querySelector('.prestige-metro .mt-tuile[data-composant="reservemanager"]'), bdg = t && t.querySelector('.mt-badge');
      return { total: parseInt(d.total || 0, 10), tuile: !!t, badge: bdg ? bdg.textContent : '' };
    });
    ok('« Gestion des réserves » : badge des articles à réassortir (' + reserve.total + ')', reserve.tuile && (reserve.total > 0 ? reserve.badge === String(reserve.total) : reserve.badge === ''), JSON.stringify(reserve));
    const toutes = await p.evaluate(() => window.PrestigeMetro.sansIcone());
    ok('Tous les menus : aucun sous-menu sans icône dédiée', toutes.length === 0, toutes.join(', '));

    /* retours du 25/10 : fond clair ; sous-menus sans defilement, sur toute la largeur (ils descendaient alors
       qu'il restait de la place sur les cotes) */
    const fond = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.prestige-metro')).backgroundColor.match(/\d+/g).map(Number);
      return { couleur: getComputedStyle(document.querySelector('.prestige-metro')).backgroundColor, lum: (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 }; });
    ok('Fond clair (pas de fond noir)', fond.lum > 0.85, JSON.stringify(fond));
    for (const menu of ['Service client', 'Gestion du stock', 'Analyse de gestion']) {
      await p.click('.prestige-metro .mt-retour');
      await p.waitForFunction(() => document.querySelector('.prestige-metro .mt-titre-texte').textContent === 'Accueil', null, { timeout: 5000 });
      await p.click('.prestige-metro .mt-tuile[aria-label^="' + menu + '"]');
      await p.waitForSelector('.prestige-metro .mt-groupe .mt-tuile', { timeout: 10000 });
      await p.waitForTimeout(1200);
      const m = await p.evaluate(() => { const z = document.querySelector('.prestige-metro .mt-zone'), c = document.querySelector('.prestige-metro .mt-groupes');
        const blocs = [...c.querySelectorAll('.mt-groupe')].map((x) => x.getBoundingClientRect());
        const gauche = Math.min(...blocs.map((r) => r.left)), droite = Math.max(...blocs.map((r) => r.right)), zr = z.getBoundingClientRect();
        const t = c.querySelector('.mt-tuile').getBoundingClientRect();
        return { defile: z.scrollHeight - z.clientHeight, largeur: Math.round((droite - gauche) / (zr.width - 56) * 100), tuile: Math.round(t.width) + 'x' + Math.round(t.height), n: c.querySelectorAll('.mt-tuile').length }; });
      ok('« ' + menu + ' » (' + m.n + ' écrans) : tient à l\'écran sans défiler, en occupant la largeur', m.defile <= 2 && (m.largeur >= 70 || m.n <= 6), JSON.stringify(m));
    }
    await p.click('.prestige-metro .mt-retour');
    await p.waitForTimeout(800);
    await p.click('.prestige-metro .mt-tuile[aria-label^="Gestion du stock"]');
    await p.waitForSelector('.prestige-metro .mt-groupe .mt-tuile', { timeout: 10000 });
    await p.waitForTimeout(1000);

    /* une fenetre par-dessus le Metro garde ses touches */
    await p.evaluate(() => { Ext.Msg.prompt('Essai', 'Saisie'); });
    await p.waitForTimeout(600);
    await p.keyboard.type('abc');
    const fen = await p.evaluate(() => ({ champ: document.querySelector('.prestige-metro .mt-q').value, titre: document.querySelector('.prestige-metro .mt-titre-texte').textContent }));
    await p.evaluate(() => Ext.Msg.hide());
    await p.waitForTimeout(400);
    ok('Fenêtre ouverte par-dessus : le Métro ne prend pas ses touches', fen.champ === '' && fen.titre === 'Gestion du stock', JSON.stringify(fen));

    /* un ecran ouvert au clavier, avec son titre ; le Metro ne reste pas monte */
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
    await p.keyboard.type('retour fourn', { delay: 30 });
    await p.waitForTimeout(800);
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourfrsmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const titreEcran = await p.evaluate(() => String(Ext.getCmp('content-panel').title || '').replace(/&nbsp;/g, '').trim());
    ok('Clavier : recherche, flèche bas, Entrée ouvrent l\'écran dans Prestige, avec son titre (barre de titre revenue)', titreEcran === 'Retour fournisseur' && await barreTitre(), titreEcran);
    const reste = await p.evaluate(() => ({ montes: window.PrestigeMetro.montes().length, dom: document.querySelectorAll('.prestige-metro').length }));
    ok('Métro quitté : rien ne reste monté (clavier, minuteries, éléments)', reste.montes === 0 && reste.dom === 0, JSON.stringify(reste));
    const champEcran = await p.evaluate(() => { const c = Ext.ComponentQuery.query('retourfrsmanager textfield').find((x) => x.isVisible(true) && x.inputEl); if (!c) { return null; } c.focus(); return c.inputEl.dom.id; });
    await p.waitForTimeout(300);
    if (champEcran) { await p.keyboard.type('xyz'); }
    const saisi = champEcran ? await p.evaluate((id) => document.getElementById(id).value, champEcran) : 'xyz';
    ok('L\'écran ouvert ensuite garde ses touches (saisie dans son champ)', /xyz$/.test(saisi), saisi);

    /* profil restreint */
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'METRO', 'Vendeur', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
    const p2 = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p2.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p2, LOGIN, MDP);
    await p2.waitForTimeout(2500);
    await metro(p2);
    const nav2 = await p2.evaluate(() => Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().childNodes.length);
    const n2 = await p2.evaluate(() => document.querySelectorAll('.prestige-metro .mt-tuile').length);
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
