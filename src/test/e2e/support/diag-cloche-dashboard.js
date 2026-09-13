/* Diagnostic (retours du 09/09, points 1 et 3) : la cloche des notifications et le rechargement du
   tableau de bord au clic sur la barre de navigation. Ne modifie rien. */
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const requetes = []; p.on('request', r => { if (/dashboard\.html|count|en-attente|perimes|avoirs-ouverts|app-params/.test(r.url())) requetes.push(r.method() + ' ' + r.url().replace(/^.*\/prestige\//, '')); });
  const reponses = []; p.on('response', async r => { if (/count|en-attente\b|perimes\/count|avoirs-ouverts\/count|KEY_NOTIFICATION/.test(r.url())) { let t = ''; try { t = (await r.text()).slice(0, 120); } catch (e) { } reponses.push(r.status() + ' ' + r.url().replace(/^.*\/prestige\//, '') + ' => ' + t); } });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(8000);

  const cloche = await p.evaluate(() => {
    const bell = document.querySelector('#notif-bell .hdr-bell');
    const i = bell && bell.querySelector('i.fa-bell');
    const cs = i && getComputedStyle(i);
    return {
      presente: !!bell, classes: bell && bell.className, badge: (document.getElementById('notif-badge') || {}).innerText,
      badgeAffiche: document.getElementById('notif-badge') && getComputedStyle(document.getElementById('notif-badge')).display,
      couleur: cs && cs.color, animation: cs && cs.animationName, fontFamily: cs && cs.fontFamily,
      timer: !!window.PRESTIGE_NOTIF_TIMER
    };
  });
  console.log('CLOCHE ' + JSON.stringify(cloche));
  console.log('REPONSES\n  ' + reponses.join('\n  '));

  // Tableau de bord : compter les chargements de l'iframe pendant des clics sur la barre de navigation
  const etat = await p.evaluate(() => {
    const frames = Array.from(document.querySelectorAll('iframe'));
    return { iframes: frames.map(f => f.src.replace(/^.*\/general\//, '')), nav: !!Ext.ComponentQuery.query('navigation')[0] };
  });
  console.log('ETAT ' + JSON.stringify(etat));
  const chargementsAvant = requetes.filter(r => /dashboard\.html/.test(r)).length;
  await p.evaluate(() => {
    window.__chargements = 0;
    Array.from(document.querySelectorAll('iframe')).forEach(f => f.addEventListener('load', () => { window.__chargements++; }));
  });
  // Clic sur la barre repliee de la navigation (placeholder), puis ailleurs, trois fois
  for (let k = 0; k < 3; k++) {
    const cible = await p.evaluate(() => {
      const nav = Ext.ComponentQuery.query('navigation')[0];
      const el = nav && nav.placeholder && nav.placeholder.el ? nav.placeholder.el.dom : (nav && nav.el ? nav.el.dom : null);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: Math.min(r.top + 60, r.top + r.height / 2), w: r.width, h: r.height, id: el.id };
    });
    if (!cible) { console.log('NAV introuvable'); break; }
    await p.mouse.click(cible.x, cible.y);
    await p.waitForTimeout(1500);
    await p.mouse.click(1200, 500);
    await p.waitForTimeout(1500);
  }
  const apres = await p.evaluate(() => ({ chargements: window.__chargements, iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src.replace(/^.*\/general\//, '')) }));
  const chargementsApres = requetes.filter(r => /dashboard\.html/.test(r)).length;
  console.log('DASHBOARD requetes dashboard.html avant=' + chargementsAvant + ' apres=' + chargementsApres + ' loads=' + JSON.stringify(apres));
  console.log('ERREURS ' + err.join(' | '));
  await b.close();
})();
