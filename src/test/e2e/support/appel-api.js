/* Appelle une API dans la session KGA3 : node support/appel-api.js <methode> <url relative a /prestige/general/> [corpsJson] */
const { chromium } = require('playwright-core');
(async () => {
  const [methode, url, corps] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  const t0 = Date.now();
  const r = await p.evaluate(async (a) => { const x = await fetch(a.url, { method: a.methode, headers: { 'Content-Type': 'application/json' }, body: a.corps || undefined }); return { statut: x.status, corps: await x.text() }; }, { methode, url, corps });
  console.log(r.statut, (Date.now() - t0) + 'ms', r.corps.slice(0, 400));
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
