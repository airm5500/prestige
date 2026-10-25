/* PAGE DE CONNEXION : BOUTON « POINTAGE » ET QR DE POINTAGE MOBILE (demande du 16/10).
 *
 * Un bouton rond, hors du cadre, en haut au milieu, ouvre une fenetre avec le QR de pointage mobile de l'onglet RH
 * (code qui change chaque minute). Ce que le test etablit :
 *  - sans connexion, sur un poste de l'officine (adresse locale) : bouton visible, au-dessus du cadre et centre ;
 *  - clic : fenetre « Pointage mobile », QR lisible = PRESTIGE-POINTAGE:<code>, meme code que l'onglet RH (connecte) ;
 *    compte a rebours affiche ; fermeture par la croix ;
 *  - la route publique ne rend que le code et son delai (ni GPS, ni coordonnees, ni reglages) ;
 *  - pointage mobile desactive (KEY_RH_MOBILE_POINTAGE = 0) : bouton masque, route sans code ;
 *  - la connexion par mot de passe fonctionne toujours.
 * Prerequis : jsqr et pngjs (NODE_PATH). Parametre remis a sa valeur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const AVANT = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_RH_MOBILE_POINTAGE'), 'ABSENT')");
const poser = (v) => {
  if (AVANT === 'ABSENT') {
    q("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) SELECT 'KEY_RH_MOBILE_POINTAGE', '" + v + "', 'E2E', 'NUMBER', 'enable', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_RH_MOBILE_POINTAGE')");
  }
  q("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = 'KEY_RH_MOBILE_POINTAGE'");
};

(async () => {
  poser('1');
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'networkidle' });
    await p.waitForSelector('#pl-pointage', { state: 'visible', timeout: 10000 }).catch(() => null);
    const pos = await p.evaluate(() => {
      const bt = document.getElementById('pl-pointage'); if (!bt) { return null; }
      const r = bt.getBoundingClientRect(), carte = document.querySelector('.pl-card') ;
      const c = carte ? carte.getBoundingClientRect() : null;
      return { vis: r.width > 0 && getComputedStyle(bt).display !== 'none', centre: r.left + r.width / 2, haut: r.top, bas: r.bottom, cCentre: c && c.left + c.width / 2, cHaut: c && c.top };
    });
    ok('Sans connexion : bouton « Pointage » visible, centré, à cheval sur le haut du cadre', pos && pos.vis && Math.abs(pos.centre - pos.cCentre) < 4 && pos.haut < pos.cHaut && pos.bas > pos.cHaut, JSON.stringify(pos));

    const route = await p.evaluate(async () => { const r = await fetch('../api/v1/pointage-affichage'); return { s: r.status, j: await r.json() }; });
    const cles = Object.keys(route.j || {}).sort().join(',');
    ok('Route publique : code et délai seulement (ni GPS ni réglages)', route.s === 200 && route.j.actif === true && /^PRESTIGE-POINTAGE:/.test(route.j.contenu || '') && !/latitude|longitude|gps|rayon/i.test(cles), cles);

    await p.click('#pl-pointage');
    await p.waitForSelector('#pl-pf-qr svg', { state: 'visible', timeout: 10000 });
    const titre = await p.textContent('#pl-pointage-fenetre');
    ok('Clic : fenêtre « Pointage mobile » avec compte à rebours', /Pointage mobile/.test(titre) && /Nouveau code dans\s+\d:\d\d/.test(titre), titre.replace(/\s+/g, ' ').slice(0, 160));
    const capture = await p.locator('#pl-pf-qr svg').screenshot();
    const png = PNG.sync.read(capture);
    const lu = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    ok('QR affiché lisible : PRESTIGE-POINTAGE:<code>', lu && /^PRESTIGE-POINTAGE:[A-Z0-9]+$/.test(lu.data), lu && lu.data);

    /* meme code que l'onglet RH (connecte) */
    const p2 = await (await b.newContext()).newPage();
    await p2.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p2.fill('#str_login', 'admin'); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
    await p2.waitForURL('**/general/**', { timeout: 60000 });
    ok('La connexion par mot de passe fonctionne toujours', /general/.test(p2.url()));
    const rh = await p2.evaluate(async () => (await fetch('../api/v1/rh/mobile/code')).json());
    const relu = await p.evaluate(async () => (await fetch('../api/v1/pointage-affichage')).json());
    ok('Même code que l\'onglet RH « Pointage mobile »', rh.contenu === relu.contenu && lu && (lu.data === rh.contenu || rh.resteSec > 58), rh.contenu + ' / ' + relu.contenu);

    await p.click('#pl-pointage-fermer');
    await p.waitForTimeout(300);
    ok('Croix : la fenêtre se ferme', await p.evaluate(() => { const f = document.getElementById('pl-pointage-fenetre'); return !f || f.hidden || getComputedStyle(f).display === 'none'; }));

    poser('0');
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const off = await p.evaluate(async () => { const bt = document.getElementById('pl-pointage'); const r = await (await fetch('../api/v1/pointage-affichage')).json();
      return { vis: !!bt && bt.getBoundingClientRect().width > 0 && getComputedStyle(bt).display !== 'none', actif: r.actif, contenu: r.contenu || null }; });
    ok('Pointage mobile désactivé : bouton masqué, aucun code rendu', !off.vis && off.actif === false && !off.contenu, JSON.stringify(off));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (AVANT === 'ABSENT') { q("DELETE FROM t_parameters WHERE str_KEY = 'KEY_RH_MOBILE_POINTAGE'"); } else { poser(AVANT); }
    ok('Paramètre remis', q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_RH_MOBILE_POINTAGE'), 'ABSENT')") === AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
