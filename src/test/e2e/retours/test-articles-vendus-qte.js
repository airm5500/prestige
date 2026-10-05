/* ARTICLES VENDUS RECAPITULATIF : operateur propre a la quantite vendue (demande du 05/10).
 *
 * L'operateur compare le TOTAL vendu par produit sur la periode, et se combine avec le filtre du stock : par exemple
 * stock = 0 ET quantite vendue = 2. Reference : la meme liste sans filtre de quantite, filtree ici sur le total vendu.
 * Sans le nouvel operateur, les reponses restent celles d'avant (verifie a part, a l'octet pres). Lecture seule.
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
    const base = 'dtStart=2026-01-01&dtEnd=2026-09-30&hStart=&hEnd=&user=&query=&typeTransaction=ALL&nbre=0&prixachatFiltre=TOUT&rayonId=&grossisteId=';
    const lire = (q) => p.evaluate(async (q) => JSON.parse(await (await fetch('../api/v1/ventestats/article-vendus-recap?' + q)).text()), q);
    const CAS = [
      { nom: 'stock = 0 et qté vendue = 2', stock: '&stock=0&stockFiltre=EQUAL', op: 'EQUAL', v: 2, f: (q) => q === 2 },
      { nom: 'stock = 0 et qté vendue < 2', stock: '&stock=0&stockFiltre=EQUAL', op: 'LESS', v: 2, f: (q) => q < 2 },
      { nom: 'stock > 5 et qté vendue ≥ 10', stock: '&stock=5&stockFiltre=MORE', op: 'MOREOREQUAL', v: 10, f: (q) => q >= 10 },
      { nom: 'tous stocks et qté vendue ≠ 1', stock: '', op: 'DIFF', v: 1, f: (q) => q !== 1 },
      { nom: 'stock ≤ 3 et qté vendue > 20', stock: '&stock=3&stockFiltre=LESSOREQUAL', op: 'MORE', v: 20, f: (q) => q > 20 }
    ];
    for (const c of CAS) {
      const ref = await lire(base + c.stock + '&start=0&limit=100000');
      const attendus = ref.data.filter((x) => c.f(x.intQUANTITY));
      const r = await lire(base + c.stock + '&start=0&limit=100000&qteVendu=' + c.v + '&qteVenduFiltre=' + c.op);
      const idsA = attendus.map((x) => x.lgFAMILLEID).sort().join(','), idsR = r.data.map((x) => x.lgFAMILLEID).sort().join(',');
      const montant = attendus.reduce((s, x) => s + x.intPRICE, 0), montantR = r.data.reduce((s, x) => s + x.intPRICE, 0);
      /* Le compteur de l'ecran (total) compte, depuis toujours, quelques produits que la liste ne rend pas (ecart deja
         present sans filtre de quantite : ref.total - ref.data.length). On verifie qu'il ne s'en ecarte pas davantage. */
      const ecartRef = ref.total - ref.data.length, ecart = r.total - r.data.length;
      ok(c.nom + ' : mêmes produits que la référence (' + attendus.length + '), même montant, compteur cohérent', idsA === idsR && montant === montantR && ecart >= 0 && ecart <= ecartRef,
        'attendu ' + attendus.length + ' / obtenu ' + r.data.length + ' (compteur ' + r.total + ', écart ' + ecart + ' ≤ ' + ecartRef + ') ; montant ' + montant + ' / ' + montantR);
    }
    /* pagination sur le resultat filtre */
    const p1 = await lire(base + '&stock=0&stockFiltre=EQUAL&start=0&limit=20&qteVendu=2&qteVenduFiltre=EQUAL');
    const p2 = await lire(base + '&stock=0&stockFiltre=EQUAL&start=20&limit=20&qteVendu=2&qteVenduFiltre=EQUAL');
    ok('Pagination du résultat filtré : 20 par page, pages distinctes', p1.data.length === Math.min(20, p1.total) && p2.data.every((x) => p1.data.every((y) => y.lgFAMILLEID !== x.lgFAMILLEID)), p1.total + ' ; page 2 ' + p2.data.length);
    /* export CSV avec l'operateur */
    const csv = await p.evaluate(async (q) => (await (await fetch('../api/v1/ventestats/article-vendus-recap/csv?' + q)).text()), base + '&stock=0&stockFiltre=EQUAL&start=0&limit=100000&qteVendu=2&qteVenduFiltre=EQUAL');
    const lignesCsv = csv.trim().split('\n').length - 1;
    const tous = await lire(base + '&stock=0&stockFiltre=EQUAL&start=0&limit=100000&qteVendu=2&qteVenduFiltre=EQUAL');
    ok('Export CSV : les mêmes produits que la liste (' + tous.data.length + ')', lignesCsv === tous.data.length, lignesCsv + ' lignes');
    /* a l'ecran */
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('articlevendurecapitulatif', 'Articles vendus', ''); });
    await p.waitForFunction(() => !!Ext.getCmp('qteVenduFiltre') && Ext.getCmp('GridArticleID').rendered, null, { timeout: 30000 });
    const op = await p.evaluate(() => { const c = Ext.getCmp('qteVenduFiltre'); return { valeur: c.getValue(), choix: c.getStore().collect('libelle'), apresStock: c.getEl().getLeft() > Ext.getCmp('stock').getEl().getLeft() && c.getEl().getRight() <= Ext.getCmp('qteVendu').getEl().getLeft() + 2 }; });
    ok('Écran : opérateur devant « Qté vendue » (=, <, >, ≤, ≥, ≠), « = » par défaut', op.valeur === 'EQUAL' && op.choix.join('') === '=<>≤≥≠' && op.apresStock, JSON.stringify(op));
    await p.evaluate(() => { Ext.getCmp('dt_debut').setValue(new Date(2026, 0, 1)); Ext.getCmp('dt_fin').setValue(new Date(2026, 8, 30)); Ext.getCmp('stockFiltre').setValue('EQUAL'); Ext.getCmp('stock').setValue('0'); Ext.getCmp('qteVendu').setValue('2'); Ext.getCmp('GridArticleID').onRechClick(); });
    await p.waitForFunction(() => !Ext.getCmp('GridArticleID').getStore().isLoading(), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const ecran = await p.evaluate(() => { const s = Ext.getCmp('GridArticleID').getStore(); return { total: s.getTotalCount(), toutes: s.getRange().every((r) => r.get('intQUANTITY') === 2 && (r.get('currentStock') === 0 || r.get('stockTotal') === 0)) }; });
    ok('Écran : stock = 0 et qté vendue = 2 → le même compteur que l\'API, tous conformes', ecran.total === p1.total && ecran.toutes, JSON.stringify(ecran) + ' / API ' + p1.total);
    const lien = await p.evaluate(() => Ext.getCmp('GridArticleID').buildLinkUrl());
    ok('Impressions et exports reçoivent l\'opérateur', /qteVendu=2&qteVenduFiltre=EQUAL/.test(lien), lien.slice(-120));
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
