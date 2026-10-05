/* EVOLUTION DU STOCK PAR MOIS (demande de l'officine du 05/10).
 *
 * « Par mois » rend un point par mois : la valeur du DERNIER jour connu du mois, lue dans la serie journaliere (qui
 * reste la reference, inchangee). Ecran : choix Par jour / Par mois, courbe, tableau et PDF suivent. Lecture seule.
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const lire = (q) => p.evaluate(async (q) => JSON.parse(await (await fetch('../api/v1/valorisation/all?' + q)).text()), q);
    const jours = await lire('dtStart=2025-12-01&dtEnd=2026-09-30');
    const sansParam = await lire('dtStart=2025-12-01&dtEnd=2026-09-30&granularite=jour');
    ok('Par jour : la série journalière est inchangée (avec ou sans le paramètre)', jours.length > 30 && JSON.stringify(jours) === JSON.stringify(sansParam), jours.length + ' jours');
    const mois = await lire('dtStart=2025-12-01&dtEnd=2026-09-30&granularite=mois');
    const attendu = {};
    jours.forEach((j) => { const m = j.date.slice(5, 7) + '/' + j.date.slice(0, 4); attendu[m] = j; });
    const cles = Object.keys(attendu);
    ok('Par mois : un point par mois présent dans la série (' + cles.length + '), dans l\'ordre', mois.map((m) => m.date).join(',') === cles.join(','), mois.map((m) => m.date).join(','));
    ok('Par mois : chaque valeur est celle du dernier jour connu du mois (achat et vente)', mois.every((m) => attendu[m.date] && attendu[m.date].valeurAchat === m.valeurAchat && attendu[m.date].valeurVente === m.valeurVente),
      JSON.stringify(mois.slice(0, 2)));
    const pdf = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/valorisation/all/pdf?dtStart=2025-12-01&dtEnd=2026-09-30&granularite=mois')).text()));
    ok('PDF par mois généré', pdf.success === true && /\.pdf$/.test(pdf.url), JSON.stringify(pdf));
    /* a l'ecran */
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('evolutionstock', 'Evolution du stock', ''); });
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('evolutionstock')[0]; return e && e.evolutionStore.getCount() > 0 && !e.evolutionStore.isLoading(); }, null, { timeout: 60000 });
    const e0 = await p.evaluate(() => { const e = Ext.ComponentQuery.query('evolutionstock')[0]; return { boutons: e.query('#granularite button').map((x) => x.getText() + (x.pressed ? '*' : '')), n: e.evolutionStore.getCount() }; });
    ok('Écran : choix « Par jour » (actif) / « Par mois »', e0.boutons.join('|') === 'Par jour*|Par mois' && e0.n > 0, JSON.stringify(e0));
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('evolutionstock')[0]; e.down('#dtStart').setValue(new Date(2025, 11, 1)); e.down('#dtEnd').setValue(new Date(2026, 8, 30)); });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('evolutionstock #parMois')[0].getId()));
    await p.waitForTimeout(800);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('evolutionstock')[0]; return !e.evolutionStore.isLoading() && /\//.test(e.evolutionStore.getAt(0).get('date')); }, null, { timeout: 60000 });
    const e1 = await p.evaluate(() => { const e = Ext.ComponentQuery.query('evolutionstock')[0]; return { dates: e.evolutionStore.collect('date'), entete: e.down('#evolutionGrid').columns[0].text, moyenne: e.down('#moyenneAchat').getValue() }; });
    ok('Écran « Par mois » : un point par mois, colonne « Mois », moyenne recalculée', e1.dates.join(',') === cles.join(',') && /Mois/.test(e1.entete) && e1.moyenne > 0, JSON.stringify(e1));
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
