const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs, null, { timeout: 60000 });
  for (const [a, z] of [['2026-08-01','2026-08-31'],['2026-01-01','2026-12-31'],['2025-01-01','2026-12-31']]) {
    const r = await p.evaluate(async ([a,z]) => {
      const rep = await fetch('../api/v1/facture-subro/list?dtStart='+a+'&dtEnd='+z+'&start=0&limit=5');
      const j = JSON.parse(await rep.text());
      return (j.total||0) + ' ex=' + JSON.stringify((j.data||[])[0]||{}).slice(0,300);
    }, [a,z]);
    console.log(a+'..'+z+' : '+r);
  }
  await b.close();
})();
