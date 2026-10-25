/* GESTION DE CAISSE (besoins du 11/10, point 5) : a l'ouverture, la liste montre les donnees DU JOUR
 * (Du = Au = aujourd'hui) et la premiere recherche porte sur le jour ; l'utilisateur peut toujours elargir.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const LOGIN = ENV_E2E.LOGIN;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const requetes = [];
  p.on('request', (r) => { if (r.url().includes('/api/v1/caisse/resumecaisse')) requetes.push(r.url()); });
  const jour = new Date();
  const iso = jour.getFullYear() + '-' + String(jour.getMonth() + 1).padStart(2, '0') + '-' + String(jour.getDate()).padStart(2, '0');
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('gestcaissemanager', 'Gestion de caisse', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gestioncaisseonglets gestcaissemanager').length > 0, null, { timeout: 30000 });
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('gestcaissemanager #dtStart')[0]; return s && s.getValue(); }, null, { timeout: 15000 });
    await p.waitForTimeout(1500);
    const dates = await p.evaluate(() => { const v = Ext.ComponentQuery.query('gestcaissemanager')[0];
      return [Ext.Date.format(v.down('#dtStart').getValue(), 'Y-m-d'), Ext.Date.format(v.down('#dtEnd').getValue(), 'Y-m-d')]; });
    ok('A l\'ouverture : Du = aujourd\'hui', dates[0] === iso, dates[0]);
    ok('A l\'ouverture : Au = aujourd\'hui', dates[1] === iso, dates[1]);
    const r = requetes[requetes.length - 1] || '';
    ok('Recherche lancee sur le jour', r.includes('dtStart=' + iso) && r.includes('dtEnd=' + iso), r);
    /* elargir reste possible */
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('gestcaissemanager')[0]; v.down('#dtStart').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -7)); });
    const v2 = await p.evaluate(() => Ext.Date.format(Ext.ComponentQuery.query('gestcaissemanager #dtStart')[0].getValue(), 'Y-m-d'));
    ok('Periode elargissable par l\'utilisateur', v2 < iso, v2);
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
