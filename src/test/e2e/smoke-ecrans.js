/*
 * Non-regression : ouverture des principaux ecrans apres la refonte de la fiche
 * article. Verifie qu'aucune erreur JavaScript n'apparait (la feuille de style
 * vente-theme.css et les variables globales de FamilleManager.js sont partagees).
 */
const { chromium } = require('playwright-core');
const ECRANS = [
  ['famillemanager', 'Gestion des Articles'],
  ['monitoringproduct', 'Suivi mouvement article'],
  ['lotfamillemanager', 'Gestion des lots'],
  ['groupefamillemanager', 'Groupes de familles'],
  ['reservemanager', 'Gestion des reserves']
];
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 150) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
  const err = [];
  p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  ok('connexion et chargement de l application', true);

  for (const [xtype, titre] of ECRANS) {
    const avant = err.length;
    await p.evaluate(([x, t]) => testextjs.app.getController('App').onLoadNewComponent(x, t, ''), [xtype, titre]);
    const ouvert = await p.waitForFunction(x => Ext.ComponentQuery.query(x).length > 0, xtype, { timeout: 20000 })
      .then(() => true).catch(() => false);
    await p.waitForTimeout(1500);
    ok('ecran ' + xtype + ' ouvert sans erreur JS', ouvert && err.length === avant,
        ouvert ? err.slice(avant).join(' || ') : 'ecran non ouvert');
  }
  ok('aucune erreur JavaScript sur tout le parcours', err.length === 0, err.join(' || '));
  await b.close();
  const ko = res.filter(r => !r.c);
  console.log('\n===== ' + (res.length - ko.length) + '/' + res.length + ' PASS =====');
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
