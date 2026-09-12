/* Capture d'ecran d'un menu : node support/capture-ecran.js <xtype> <fichier.png> [largeur] [hauteur] */
const { chromium } = require('playwright-core');
(async () => {
  const [xtype, sortie, largeur, hauteur] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: parseInt(largeur || '1600', 10), height: parseInt(hauteur || '900', 10) } });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate((x) => testextjs.app.getController('App').onRedirectTo(x, {}), xtype);
  await p.waitForFunction((x) => Ext.ComponentQuery.query(x).length > 0, xtype, { timeout: 20000 });
  if (process.env.SCRIPT) {
    await p.evaluate(process.env.SCRIPT);
    await p.waitForTimeout(6000);
  }
  await p.waitForTimeout(4000);
  await p.screenshot({ path: sortie, fullPage: true });
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
