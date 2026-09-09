/* Retours des tests du 09/09 (2e) - lot N : balance vente / caisse (point 1).
 *
 *  - chaque onglet a sa propre recherche ; la liste deroulante de periode n'est pas sur l'onglet Balance ;
 *  - grille Balance sans pagination, deux lignes entieres, COMPTANT / CREDIT ;
 *  - synthese modernisee (memes chiffres que l'affichage historique, qui reste visible pour comparer) ;
 *  - part dans le CA : nombre de ventes et % par mode ; libelle « Part tiers payant » ; bloc TVA ;
 *  - analyse comparative : taux d'evolution sous chaque montant, TOTAL GENERAL, « recherche en cours »,
 *    graphique en barres avec legende (mois par annee, jours par semaine, ou une barre par periode) ;
 *  - evolution par mode : plus de « (mobile) », taux d'evolution ;
 *  - les barres du bas (affichage historique) masquees sur les onglets d'analyse.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const { q, MOIS_A, MOIS_B, FIN_B, jour, fr, poserJeuDEssai, retirerJeuDEssai } = require('../support/jeu-balance');
const TMP = '/tmp/claude-0/lot-n';

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  poserJeuDEssai();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const appel = (url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return await r.json(); }, url);
  const texteDe = (sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].el.dom.innerText, sel);

  try {
    /* ------------------------------------------------------- API */
    const v = (await appel('../api/v1/balance/balancesalecash?dtStart=' + MOIS_A + '&dtEnd=' + FIN_B)).ventilation || {};
    ok('API : chaque mode porte son nombre de ventes et sa part du nombre total (especes 4/5 = 80,0 %, ORANGE 1/5 = 20,0 %)',
      v.especes && v.especes.ventes === 4 && v.especes.partVentes === 80
      && (v.mobile.operateurs || []).some(o => o.libelle === 'ORANGE' && o.ventes === 1 && o.partVentes === 20)
      && v.mobile.ventes === 2 && v.mobile.partVentes === 40, JSON.stringify(v.especes) + ' ' + JSON.stringify(v.mobile));
    ok('API : la repartition par taux de TVA est jointe (un taux 0 %, TTC 53 000 = 100 %)',
      Array.isArray(v.tva) && v.tva.length === 1 && v.tva[0].taux === 0 && v.tva[0].montantTtc === 53000 && v.tva[0].part === 100, JSON.stringify(v.tva));
    const ans = await appel('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_ANS');
    const gAns = ans.graphique || {};
    const anneeFixture = MOIS_A.slice(0, 4);
    const serieFixture = (gAns.series || []).find(s => (s.libelle || '').indexOf(anneeFixture) >= 0) || {};
    const moisA = parseInt(MOIS_A.slice(5, 7), 10) - 1, moisB = parseInt(MOIS_B.slice(5, 7), 10) - 1;
    ok('API : 3 dernieres annees -> graphique mois par mois, une serie par annee, avec le jeu d essai sur ses deux mois (35 000 puis 18 000)',
      gAns.type === 'ANNEES' && (gAns.categories || []).length === 12 && (gAns.series || []).length >= 3
      && serieFixture.valeurs && serieFixture.valeurs[moisA] === 35000 && serieFixture.valeurs[moisB] === 18000,
      JSON.stringify({ type: gAns.type, series: (gAns.series || []).map(s => s.libelle), valeurs: serieFixture.valeurs }));
    ok('API : l analyse porte les evolutions et le TOTAL GENERAL', (ans.data || []).every(l => l.evolutions) && ans.totalGeneral && ans.totalGeneral.libelle === 'TOTAL GÉNÉRAL',
      JSON.stringify(ans.totalGeneral).slice(0, 200));
    const sem = await appel('../api/v1/balance/balancesalecash/analyse?typePeriode=TROIS_SEMAINES');
    ok('API : 3 dernieres semaines -> jours de la semaine en abscisse, une serie par semaine',
      (sem.graphique || {}).type === 'SEMAINES' && sem.graphique.categories.length === 7 && sem.graphique.categories[0] === 'Lun' && sem.graphique.series.length === 4,
      JSON.stringify((sem.graphique || {}).categories));

    /* ------------------------------------------------------- onglet Balance */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('balancesalecahs', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const structure = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      const onglet = (id) => vue.down('#' + id);
      return {
        periodeSurBalance: !!onglet('ongletBalance').down('combobox'),
        datesBalance: !!onglet('ongletBalance').down('#dtStart') && !!onglet('ongletBalance').down('#rechercher'),
        datesAnalyse: !!onglet('ongletAnalyseBalance').down('#dtStartAnalyse') && !!onglet('ongletAnalyseBalance').down('#typePeriode') && !!onglet('ongletAnalyseBalance').down('#rechercherAnalyse'),
        datesModes: !!onglet('ongletModesBalance').down('#dtStartModes') && !!onglet('ongletModesBalance').down('#typePeriodeModes') && !!onglet('ongletModesBalance').down('#rechercherModes'),
        pagination: !!vue.down('#balanceGrid').down('pagingtoolbar'),
        // lot P : les barres du bas vivent dans l'onglet cache « Balance (ancienne) »
        recapBasVisible: ['recapBas1', 'recapBas2', 'recapBas3'].map(id => !!vue.down('#ongletBalanceAncienne').down('#' + id)),
        ancienneCachee: !vue.down('#ongletBalanceAncienne').tab.isVisible(),
        du: vue.down('#dtStart').inputEl.id, au: vue.down('#dtEnd').inputEl.id, rechercher: vue.down('#rechercher').el.id
      };
    });
    ok('chaque onglet a sa recherche ; la liste de periode n est pas sur l onglet Balance',
      !structure.periodeSurBalance && structure.datesBalance && structure.datesAnalyse && structure.datesModes, JSON.stringify(structure));
    ok('grille Balance sans pagination ; les barres du bas sont dans l onglet « Balance (ancienne) », cache sans privilege',
      !structure.pagination && structure.recapBasVisible.every(Boolean) && structure.ancienneCachee, JSON.stringify(structure.recapBasVisible) + ' cachee=' + structure.ancienneCachee);
    await p.fill('#' + structure.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + structure.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + structure.rechercher);
    await p.waitForFunction(() => {
      const c = Ext.ComponentQuery.query('balancesalecahs #syntheseBalance')[0];
      return c && c.el && /TOTAL/.test(c.el.dom.innerText);
    }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const balance = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      const g = vue.down('#balanceGrid');
      const vueEl = g.getView().getEl().dom;
      return {
        lignes: g.getStore().getCount(), lignesDom: vueEl.querySelectorAll('tr.x-grid-row').length,
        scroll: vueEl.scrollHeight > vueEl.clientHeight + 2,
        types: Array.from(vueEl.querySelectorAll('tr.x-grid-row td:first-child')).map(td => td.innerText.trim()),
        synthese: vue.down('#syntheseBalance').el.dom.innerText,
        ventilation: vue.down('#ventilationBalance').el.dom.innerText,
        montantVenteBas: vue.down('#montantTTC').getValue(), especesBas: vue.down('#montantEsp').getValue()
      };
    });
    ok('la balance porte ses 2 lignes (COMPTANT et CREDIT) dans la synthese, l ancienne grille n est plus affichee',
      balance.lignes === 2 && balance.lignesDom === 0 && /COMPTANT/.test(balance.synthese) && /CRÉDIT/.test(balance.synthese), JSON.stringify(balance.types) + ' dom=' + balance.lignesDom);
    ok('synthese modernisee : memes lignes (COMPTANT 23 000, CREDIT 30 000, TOTAL 53 000) et resume (montant vente = champ du bas)',
      /COMPTANT\s+3\s+23[\s .,]000/.test(balance.synthese) && /CRÉDIT\s+2\s+30[\s .,]000/.test(balance.synthese) && /TOTAL\s+5\s+53[\s .,]000/.test(balance.synthese)
      && /MONTANT VENTE\s+53[\s .,]?000/.test(balance.synthese.replace(/\n/g, ' ')) && /SORTIES/.test(balance.synthese),
      balance.synthese.replace(/\n/g, ' | ').slice(0, 500));
    ok('ventilation : ventes et % ventes par mode (especes 4 / 80,0 %), libelle « Part tiers payant », bloc TVA (0 % : 53 000, 100,0 %)',
      /% ventes/.test(balance.ventilation) && /Espèces\s+22[\s .,]000\s+41,5 %\s+4\s+80,0 %/.test(balance.ventilation)
      && /Part tiers payant \(sur ventes à crédit\)/.test(balance.ventilation) && /RÉPARTITION PAR TAUX DE TVA/.test(balance.ventilation)
      && /0 %\s+53[\s .,]000\s+0\s+53[\s .,]000\s+100,0 %/.test(balance.ventilation), balance.ventilation.replace(/\n/g, ' | ').slice(0, 700));
    await p.screenshot({ path: TMP + '/balance.png', fullPage: false });

    /* ------------------------------------------------------- onglet Analyse comparative */
    await p.evaluate(() => {
      window.__chargements = [];
      const onglet = Ext.ComponentQuery.query('balancesalecahs #ongletAnalyseBalance')[0];
      const orig = onglet.setLoading;
      onglet.setLoading = function (v) { window.__chargements.push(v); return orig.apply(this, arguments); };
    });
    const ongletAnalyse = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletAnalyseBalance')[0].tab.el.id);
    await p.click('#' + ongletAnalyse);
    await p.waitForTimeout(2500);
    const idsA = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      vue.down('#typePeriode').setValue('LIBRE');
      return { du: vue.down('#dtStartAnalyse').inputEl.id, au: vue.down('#dtEndAnalyse').inputEl.id, rechercher: vue.down('#rechercherAnalyse').el.id,
        recapBas: ['recapBas1', 'recapBas2', 'recapBas3'].map(id => vue.down('#' + id).isVisible()) };
    });
    ok('sur l onglet Analyse, les barres du bas (ancien recap) sont masquees', idsA.recapBas.every(x => !x), JSON.stringify(idsA.recapBas));
    await p.fill('#' + idsA.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + idsA.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + idsA.rechercher);
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #grilleAnalyse')[0].getStore().getCount() > 2, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const analyse = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      const g = vue.down('#grilleAnalyse');
      const texte = g.getView().getEl().dom.innerText;
      const graphique = vue.down('#graphiqueAnalyse');
      const chart = graphique.down('chart');
      return {
        chargements: window.__chargements, lignes: g.getStore().getCount(), texte: texte,
        evolutions: Array.from(g.getView().getEl().dom.querySelectorAll('.evolution')).map(e => e.innerText),
        chart: !!chart, legende: !!(chart && chart.legend), typeSerie: chart ? chart.series.getAt(0).type : '',
        categories: chart ? chart.store.getRange().map(r => r.get('categorie')) : []
      };
    });
    ok('un indicateur « recherche en cours » est pose puis retire pendant l analyse',
      analyse.chargements.some(v => typeof v === 'string' && /Recherche en cours/.test(v)) && analyse.chargements[analyse.chargements.length - 1] === false, JSON.stringify(analyse.chargements));
    ok('la grille porte la ligne TOTAL GENERAL avec les sommes (5 ventes, net 53 000)',
      /TOTAL GÉNÉRAL\s+5\s+53[\s .,]000/.test(analyse.texte.replace(/\n/g, ' ')), analyse.texte.replace(/\n/g, ' | ').slice(-400));
    ok('les taux d evolution sont affiches sous les montants (la semaine qui suit la semaine A : -100,00 %)',
      analyse.evolutions.length > 0 && analyse.evolutions.some(e => /-100,00 %/.test(e)), analyse.evolutions.slice(0, 12).join(' | '));
    ok('un graphique en barres avec legende, une barre par periode (semaines), est dessine sous la grille',
      analyse.chart && analyse.legende && analyse.typeSerie === 'column' && analyse.categories.length === analyse.lignes, JSON.stringify(analyse.categories).slice(0, 200));
    await p.screenshot({ path: TMP + '/analyse.png', fullPage: false });

    // 3 dernieres annees : le graphique mois par mois, une barre par annee, avec le jeu d'essai
    await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #typePeriode')[0].setValue('TROIS_ANS'));
    await p.click('#' + idsA.rechercher);
    await p.waitForFunction(() => {
      const c = Ext.ComponentQuery.query('balancesalecahs #graphiqueAnalyse')[0].down('chart');
      return c && c.store.getCount() === 12;
    }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const annees = await p.evaluate(() => {
      const chart = Ext.ComponentQuery.query('balancesalecahs #graphiqueAnalyse')[0].down('chart');
      return { categories: chart.store.getRange().map(r => r.get('categorie')), series: chart.series.getAt(0).title, champs: chart.series.getAt(0).yField };
    });
    ok('3 dernieres annees : 12 mois en abscisse, une barre (et une legende) par annee',
      annees.categories.length === 12 && annees.categories[0] === 'Janv' && annees.series.length >= 3 && annees.series.some(t => /en cours/.test(t)),
      JSON.stringify(annees.series));
    await p.screenshot({ path: TMP + '/analyse-3ans.png', fullPage: false });

    /* ------------------------------------------------------- onglet Evolution par mode */
    const ongletModes = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletModesBalance')[0].tab.el.id);
    await p.click('#' + ongletModes);
    await p.waitForTimeout(2000);
    const idsM = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      vue.down('#typePeriodeModes').setValue('LIBRE');
      return { du: vue.down('#dtStartModes').inputEl.id, au: vue.down('#dtEndModes').inputEl.id, rechercher: vue.down('#rechercherModes').el.id,
        recapBas: ['recapBas1', 'recapBas2', 'recapBas3'].map(id => vue.down('#' + id).isVisible()) };
    });
    await p.fill('#' + idsM.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + idsM.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + idsM.rechercher);
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #grilleModes')[0].getStore().getCount() > 2, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    const modes = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('balancesalecahs #grilleModes')[0];
      return {
        entetes: g.headerCt.getGridColumns().map(c => (c.text || '').replace(/<[^>]+>/g, '').trim()),
        evolutions: Array.from(g.getView().getEl().dom.querySelectorAll('.evolution')).map(e => e.innerText),
        texte: g.getView().getEl().dom.innerText
      };
    });
    ok('sur l onglet Evolution par mode, les barres du bas sont masquees', idsM.recapBas.every(x => !x), JSON.stringify(idsM.recapBas));
    ok('les en-tetes des modes ne rappellent plus « (mobile) », les taux d evolution sont sous les montants, la ligne TOTAL est la',
      modes.entetes.some(e => e === 'ORANGE') && !modes.entetes.some(e => /mobile\)/.test(e)) && modes.evolutions.length > 0 && /TOTAL/.test(modes.texte),
      modes.entetes.join(' | ') + ' evolutions=' + modes.evolutions.length);
    await p.screenshot({ path: TMP + '/modes.png', fullPage: false });

    // retour sur Balance : les barres du bas reviennent
    const ongletBalance = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletBalance')[0].tab.el.id);
    await p.click('#' + ongletBalance);
    await p.waitForTimeout(800);
    const retour = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletsBalance')[0].getActiveTab().itemId);
    ok('de retour sur l onglet Balance', retour === 'ongletBalance', retour);

    ok('aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
    retirerJeuDEssai();
    ok('jeu d essai retire', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-LL-%'") === '0');
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\nTOTAL ' + (res.length - ko) + '/' + res.length + (ko ? '  FAIL=' + ko : '  OK'));
  process.exit(ko ? 1 : 0);
})();
