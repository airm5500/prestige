/* RETOUR DU 10/11/2026 : explication depliable d'un parametre, par le bouton « i » de l'ecran « Gestion des
 * parametres ». Lecture seule, compte de test.
 *  - le service de liste ne donne une explication qu'aux parametres qui en ont une (table parametre_explication) ;
 *  - a l'ecran, KEY_PRISE_EN_CHARGE_TOTALE a un bouton « i », les parametres sans explication n'en ont pas ;
 *  - repliee par defaut ; un clic sur « i » la deplie SOUS la ligne (aucune fenetre) : la regle, le tableau des six cas
 *    (memes montants que le moteur : RO / RC1 / client) et les trois rappels ; un second clic la replie ;
 *  - l'ecran, la base et le service disent la meme chose (rapprochement).
 * Lancement seul : node src/test/e2e/retours/test-parametres-explication-1011.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '-sN', '--raw', ENV_E2E.BASE, '-e', s], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const URL = (process.env.BASE || 'http://localhost:8080/prestige').replace(/\/$/, '');
const CLE = 'KEY_PRISE_EN_CHARGE_TOTALE';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 240000 });
    await p.waitForTimeout(1500);

    /* base et service */
    const enBase = JSON.parse(q("SELECT explication FROM parametre_explication WHERE str_KEY = '" + CLE + "'"));
    const nbExplications = Number(q('SELECT COUNT(*) FROM parametre_explication'));
    const liste = await p.evaluate(async () => (await fetch('../api/v1/app-params/liste?start=0&limit=0')).json());
    const avec = liste.results.filter((x) => x.explication);
    const lui = liste.results.find((x) => x.str_KEY === CLE);
    ok('Service : le paramètre est listé à 0 ou 1, rubrique « Ventes et caisse », avec son explication', lui && /^[01]$/.test(lui.str_VALUE) && lui.rubrique === 'VENTE' && !!lui.explication,
      lui && JSON.stringify({ v: lui.str_VALUE, r: lui.rubrique }));
    ok('Service : seuls les paramètres qui ont une explication en portent une (' + avec.length + ' sur ' + liste.total + ')', avec.length >= 1 && avec.length <= nbExplications && avec.length < liste.total, avec.map((x) => x.str_KEY).join(','));
    ok('Rapprochement base / service : même explication', lui && JSON.stringify(JSON.parse(lui.explication)) === JSON.stringify(enBase));

    /* ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('parametermanager', 'Paramètres', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('parametermanager')[0]; return g && g.rendered && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    /* recherche tapee dans le champ, puis Entree */
    await p.click('#rechecher input');
    await p.keyboard.type('PRISE_EN_CHARGE', { delay: 20 });
    const charge = p.evaluate(() => new Promise((fin) => { const g = Ext.ComponentQuery.query('parametermanager')[0]; g.getStore().on('load', () => fin(true), null, { single: true }); setTimeout(() => fin(false), 20000); }));
    await p.keyboard.press('Enter');
    await charge;
    await p.waitForTimeout(600);
    const etat = () => p.evaluate((cle) => {
      const g = Ext.ComponentQuery.query('parametermanager')[0], s = g.getStore(), r = s.findRecord('str_KEY', cle, 0, false, true, true);
      const ligne = r ? g.getView().getNode(r) : null;
      const corps = ligne ? ligne.parentNode.querySelector('.param-explication') || (ligne.nextElementSibling && ligne.nextElementSibling.querySelector('.param-explication')) : null;
      const visible = !!(corps && corps.offsetParent !== null && corps.getBoundingClientRect().height > 0);
      return { total: s.getCount(), bouton: ligne ? ligne.querySelectorAll('.param-info').length : -1, visible,
        texte: corps ? corps.textContent : '', lignesTableau: corps ? Array.from(corps.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((c) => c.textContent)) : [],
        rappels: corps ? Array.from(corps.querySelectorAll('li')).map((li) => li.textContent) : [], fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length,
        boutonsAutres: Array.from(g.getView().getEl().dom.querySelectorAll('.param-info')).length };
    }, CLE);
    let e = await etat();
    ok('Écran : la ligne du paramètre porte un bouton « i », explication repliée par défaut', e.bouton === 1 && !e.visible, JSON.stringify({ bouton: e.bouton, visible: e.visible, total: e.total }));
    const cliquerI = async () => {
      const id = await p.evaluate((cle) => { const g = Ext.ComponentQuery.query('parametermanager')[0], r = g.getStore().findRecord('str_KEY', cle, 0, false, true, true);
        const i = g.getView().getNode(r).querySelector('.param-info'); i.id = i.id || 'e2e-param-info'; return i.id; }, CLE);
      await p.click('#' + id);
      await p.waitForTimeout(500);
    };
    await cliquerI();
    e = await etat();
    ok('Clic sur « i » : l\'explication se déplie sous la ligne, sans fenêtre', e.visible && e.fenetres === 0 && e.texte.indexOf(enBase.regle) >= 0, JSON.stringify({ visible: e.visible, fenetres: e.fenetres, debut: e.texte.slice(0, 80) }));
    ok('Tableau : les entêtes et les six cas, mêmes montants que la base (RO / RC1 / client)',
      JSON.stringify(e.lignesTableau) === JSON.stringify([enBase.entetes].concat(enBase.cas)) && enBase.cas.length === 6
      && enBase.cas.map((c) => c.slice(1).join('/')).join(' ; ') === '800/200/0 ; 800/200/0 ; 0/1 000/0 ; 200/800/0 ; 1 000/0/0 ; 0/600/400', JSON.stringify(e.lignesTableau).slice(0, 300));
    ok('Rappels : les trois rappels de la base', JSON.stringify(e.rappels) === JSON.stringify(enBase.rappels) && e.rappels.length === 3, JSON.stringify(e.rappels).slice(0, 200));
    await cliquerI();
    e = await etat();
    ok('Second clic : l\'explication se replie', !e.visible && e.bouton === 1, JSON.stringify({ visible: e.visible }));

    /* un parametre sans explication n'a pas de bouton */
    await p.click('#rechecher input');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('KEY_LIGNE_COMPTANT_VO', { delay: 15 });
    const charge2 = p.evaluate(() => new Promise((fin) => { const g = Ext.ComponentQuery.query('parametermanager')[0]; g.getStore().on('load', () => fin(true), null, { single: true }); setTimeout(() => fin(false), 20000); }));
    await p.keyboard.press('Enter');
    await charge2;
    await p.waitForTimeout(600);
    const sans = await p.evaluate(() => { const g = Ext.ComponentQuery.query('parametermanager')[0];
      return { cles: g.getStore().collect('str_KEY'), boutons: g.getView().getEl().dom.querySelectorAll('.param-info').length, explications: g.getStore().collect('explication') }; });
    const attenduSans = q("SELECT COUNT(*) FROM parametre_explication WHERE str_KEY = 'KEY_LIGNE_COMPTANT_VO'") === '0';
    ok('Un paramètre sans explication n\'a pas de bouton « i » (KEY_LIGNE_COMPTANT_VO)', sans.cles.indexOf('KEY_LIGNE_COMPTANT_VO') >= 0 && (attenduSans ? sans.boutons === 0 : sans.boutons >= 1), JSON.stringify(sans));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
