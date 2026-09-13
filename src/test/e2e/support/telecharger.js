/* Telecharge une URL (relative a /prestige/general/) dans la session KGA3 : node support/telecharger.js <url> <fichier> */
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const [url, sortie] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  const r = await p.evaluate(async (u) => { const x = await fetch(u); return { statut: x.status, type: x.headers.get('content-type'), octets: Array.from(new Uint8Array(await x.arrayBuffer())) }; }, url);
  fs.writeFileSync(sortie, Buffer.from(r.octets));
  console.log(r.statut, r.type, r.octets.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
