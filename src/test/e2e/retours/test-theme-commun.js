/* THEME COMMUN (maquette validee le 30/09) sur les ordonnances : pagination numerotee de l'historique et raccourcis de
 * periode de l'analyse. Lecture seule (aucune ecriture en base).
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const requetes = []; p.on('request', (r) => requetes.push(r.url()));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const h = await p.evaluate(() => { const bar = Ext.ComponentQuery.query('ordonnanceclient pagingtoolbar')[0];
      return { plugin: !!bar.down('#pagesNumerotees'), nums: [...bar.getEl().dom.querySelectorAll('.pg-num')].map((x) => x.textContent), saisieCachee: !bar.child('#inputItem').isVisible(),
        suivant: !!bar.child('#next'), actualiser: !!bar.child('#refresh') }; });
    ok('Historique : pagination numérotée (1 actif), champ « Page » masqué, boutons suivant / actualiser gardés', h.plugin && h.nums[0] === '1' && h.saisieCachee && h.suivant && h.actualiser, JSON.stringify(h));
    /* Analyse : raccourci « Mois dernier ». */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const t = e.down('tabpanel') || e; const v = e.down('#vueAnalyse'); if (v.up('tabpanel')) { v.up('tabpanel').setActiveTab(v); } else { e.getLayout().setActiveItem(v); } });
    await p.waitForTimeout(1500);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #anaFinRaccourcis')[0].getId()));
    await p.waitForSelector('.periode-menu .x-menu-item', { timeout: 5000 });
    const libelles = await p.evaluate(() => [...document.querySelectorAll('.periode-menu .x-menu-item-text')].map((x) => x.textContent));
    ok('Bouton « Période » : les raccourcis du jour à l\'année', libelles.join('|') === "Aujourd'hui|Hier|7 derniers jours|30 derniers jours|Ce mois|Mois dernier|12 derniers mois|Cette année", libelles.join('|'));
    const avant = requetes.length;
    await p.locator('.periode-menu .x-menu-item-text', { hasText: 'Mois dernier' }).click();
    await p.waitForTimeout(2000);
    const d = await p.evaluate(() => { const f = (s) => Ext.Date.format(Ext.ComponentQuery.query('ordonnanceclient ' + s)[0].getValue(), 'Y-m-d'); return [f('#anaDebut'), f('#anaFin')]; });
    const j = new Date(); const m = new Date(j.getFullYear(), j.getMonth() - 1, 1); const fm = new Date(j.getFullYear(), j.getMonth(), 0);
    const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    ok('« Mois dernier » : du 1er au dernier jour du mois précédent', d[0] === iso(m) && d[1] === iso(fm), d.join(' → '));
    const calcul = requetes.slice(avant).filter((u) => /ordonnance-client\/analyse/.test(u) && u.indexOf(iso(m)) >= 0);
    ok('Le calcul est relancé sur la nouvelle période', calcul.length > 0, requetes.slice(avant).join(' '));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
