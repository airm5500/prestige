/* PLAN DU 19/11, POINT 3 : ANALYSE TIERS PAYANT, LENTEUR A L'OUVERTURE.
 *
 * Constat : a l'ouverture, l'ecran chargeait les tiers payants ET tous les produits, sans pagination ; « Rechercher »
 * chargeait les produits deux fois (deselectAll declenche selectionchange, puis chargerProduits). Les ventes de la
 * periode etaient parcourues trois fois.
 *
 * Decision du pharmacien : les produits ne se chargent qu'au clic (sur un tiers payant, ou sur « Tous les produits »),
 * avec une pagination.
 *
 * Verifie, par l'ecran (clics de l'utilisateur) :
 *  - ouverture : une seule requete « tiers-payants », aucune requete « produits » ; message « Cliquez sur un tiers
 *    payant… » dans la grille des produits ; duree mesuree (avant / apres) ;
 *  - clic sur un tiers payant : UNE requete « produits » pour ce tiers payant, paginee (limit) ; barre de pagination ;
 *  - rapprochement : la ligne du tiers payant (quantite, CA TTC, CA HT, achat, marge) = totaux du pied de la grille des
 *    produits = somme de la liste complete rendue par l'API sans pagination ;
 *  - page suivante : lignes differentes, memes totaux ;
 *  - « Tous les produits » : une requete sans tiers payant ;
 *  - « Rechercher » : une requete « tiers-payants », jamais deux requetes « produits ».
 * Lecture seule : aucune donnee ecrite.
 * Lancement seul : node src/test/e2e/analyse/test-analyse-tierspayant-ouverture-1911.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const URL = process.env.BASE || 'http://localhost:8080/prestige';
/* periode de mesure : un mois complet de ventes (la copie de travail s'arrete fin octobre 2026) */
const DEBUT = process.env.E2E_DEBUT || '2026-10-01';
const FIN = process.env.E2E_FIN || '2026-10-31';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    const appels = [];
    p.on('request', (r) => { if (r.url().includes('analyse-tierspayant/')) { appels.push({ url: r.url(), t: Date.now() }); } });
    const fins = [];
    p.on('response', (r) => { if (r.url().includes('analyse-tierspayant/')) { fins.push({ url: r.url(), t: Date.now() }); } });
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }

    /* 1. ouverture */
    const t0 = Date.now();
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysetierspayant', 'Analyse tiers payant', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return e && e.storeTiersPayants.lastOptions && !e.storeTiersPayants.isLoading(); }, null, { timeout: 300000 });
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return !e.storeProduits.isLoading(); }, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    const tOuverture = (fins.length ? Math.max(...fins.map((x) => x.t)) : Date.now()) - t0;
    const tp0 = appels.filter((a) => a.url.includes('/tiers-payants')).length;
    const pr0 = appels.filter((a) => a.url.includes('/produits')).length;
    console.log('MESURE  ouverture (dernière réponse de l\'analyse) : ' + tOuverture + ' ms ; requêtes tiers-payants ' + tp0 + ', produits ' + pr0);
    ok('Ouverture : une seule requête « tiers-payants »', tp0 === 1, tp0);
    ok('Ouverture : aucune requête « produits » (chargés au clic)', pr0 === 0, pr0);
    const vide = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysetierspayant')[0].down('#grilleProduits'); return { n: g.getStore().getCount(), txt: g.getView().getEl().dom.innerText }; });
    ok('Grille des produits vide, avec le message « Cliquez sur un tiers payant »', vide.n === 0 && /Cliquez sur un tiers payant/.test(vide.txt), JSON.stringify(vide));

    /* 1 bis. periode de mesure, puis « Rechercher » (meme travail que l'ouverture sur un mois plein) */
    appels.length = 0; fins.length = 0;
    await p.evaluate((x) => {
      const e = Ext.ComponentQuery.query('analysetierspayant')[0];
      e.down('#dtStart').setValue(Ext.Date.parse(x.d, 'Y-m-d'));
      e.down('#dtEnd').setValue(Ext.Date.parse(x.f, 'Y-m-d'));
    }, { d: DEBUT, f: FIN });
    const tm = Date.now();
    await p.locator('.x-btn').filter({ visible: true, hasText: 'Rechercher' }).first().click();
    await p.waitForTimeout(800);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return e.storeTiersPayants.getCount() > 0 && !e.storeTiersPayants.isLoading() && !e.storeProduits.isLoading(); }, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    const tMois = (fins.length ? Math.max(...fins.map((x) => x.t)) : Date.now()) - tm;
    const nTpM = appels.filter((a) => a.url.includes('/tiers-payants')).length, nPrM = appels.filter((a) => a.url.includes('/produits')).length;
    console.log('MESURE  Rechercher sur ' + DEBUT + ' - ' + FIN + ' : ' + tMois + ' ms ; requêtes tiers-payants ' + nTpM + ', produits ' + nPrM);
    ok('Rechercher (sans tiers payant choisi) : une requête « tiers-payants », aucune requête « produits »', nTpM === 1 && nPrM === 0, nTpM + ' / ' + nPrM);

    /* 2. clic sur le premier tiers payant */
    const ligneTp = await p.evaluate(() => { const r = Ext.ComponentQuery.query('analysetierspayant')[0].storeTiersPayants.getAt(0); return r.data; });
    appels.length = 0; fins.length = 0;
    const t1 = Date.now();
    await p.locator('.x-grid-row').filter({ visible: true, hasText: ligneTp.tiersPayant }).first().click();
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return e.storeProduits.getCount() > 0 && !e.storeProduits.isLoading(); }, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    const tClic = (fins.length ? Math.max(...fins.map((x) => x.t)) : Date.now()) - t1;
    const reqProd = appels.filter((a) => a.url.includes('/produits'));
    console.log('MESURE  clic sur un tiers payant : ' + tClic + ' ms ; ' + reqProd.length + ' requête(s) produits');
    ok('Clic : une seule requête « produits », pour ce tiers payant, paginée', reqProd.length === 1 && reqProd[0].url.includes('tiersPayantId=' + ligneTp.tiersPayantId) && /[?&]limit=\d+/.test(reqProd[0].url),
      reqProd.map((x) => x.url).join(' | '));
    const page1 = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysetierspayant')[0], g = e.down('#grilleProduits');
      const pg = g.down('pagingtoolbar');
      const pied = g.getEl().dom.querySelector('.x-grid-row-summary, .x-docked-summary');
      return { n: e.storeProduits.getCount(), total: e.storeProduits.getTotalCount(), pageSize: e.storeProduits.pageSize,
        pagination: !!pg && pg.isVisible(), ids: e.storeProduits.collect('cip'), totaux: e.totauxProduits || null, pied: pied ? pied.innerText : '' };
    });
    ok('Barre de pagination visible, page de ' + page1.pageSize + ' produits au plus', page1.pagination && page1.n <= page1.pageSize && page1.total >= page1.n, JSON.stringify({ n: page1.n, total: page1.total, pageSize: page1.pageSize }));

    /* rapprochement : ligne du tiers payant = pied de la grille = liste complete de l'API */
    const params = await p.evaluate(() => Ext.ComponentQuery.query('analysetierspayant')[0].parametres());
    const complet = await p.evaluate(async (x) => {
      const r = await fetch('../api/v1/analyse-tierspayant/produits?' + Ext.Object.toQueryString({ dtStart: x.p.dtStart, dtEnd: x.p.dtEnd, tiersPayantId: x.id, query: '', tri: x.p.tri, groupeId: x.p.groupeId }));
      return r.json();
    }, { p: params, id: ligneTp.tiersPayantId });
    const somme = (k) => complet.data.reduce((s, x) => s + (x[k] || 0), 0);
    const cles = ['quantite', 'caTtc', 'caHt', 'montantAchat', 'marge'];
    const api = {}; cles.forEach((k) => { api[k] = somme(k); });
    const tp = {}; cles.forEach((k) => { tp[k] = ligneTp[k]; });
    ok('Rapprochement : ligne du tiers payant = somme de ses produits (API complète)', cles.every((k) => tp[k] === api[k]), JSON.stringify({ tp, api }));
    ok('Rapprochement : totaux du pied de grille = somme de tous les produits (pas seulement la page)', !!page1.totaux && cles.every((k) => page1.totaux[k] === api[k]), JSON.stringify(page1.totaux));
    const fmt = (v) => new Intl.NumberFormat('en-US').format(v).replace(/,/g, '[ ,.  ]?');
    ok('Pied de grille affiché : CA TTC et marge totaux', new RegExp(fmt(api.caTtc)).test(page1.pied) && new RegExp(fmt(api.marge)).test(page1.pied), page1.pied);
    ok('Nombre total de produits = liste complète', page1.total === complet.data.length, page1.total + ' / ' + complet.data.length);

    /* 3. page suivante (si plusieurs pages) */
    if (page1.total > page1.pageSize) {
      appels.length = 0;
      await p.locator('.x-tbar-page-next').filter({ visible: true }).first().click();
      await p.waitForFunction((x) => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return !e.storeProduits.isLoading() && e.storeProduits.currentPage === 2 && e.storeProduits.getCount() > 0 && e.storeProduits.getAt(0).get('cip') !== x; }, page1.ids[0], { timeout: 120000 });
      const page2 = await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return { ids: e.storeProduits.collect('cip'), totaux: e.totauxProduits }; });
      const r2 = appels.filter((a) => a.url.includes('/produits'));
      ok('Page 2 : même tiers payant, start = taille de page, produits différents, mêmes totaux',
        r2.length === 1 && r2[0].url.includes('tiersPayantId=' + ligneTp.tiersPayantId) && r2[0].url.includes('start=' + page1.pageSize)
        && page2.ids.every((c) => !page1.ids.includes(c)) && cles.every((k) => page2.totaux[k] === api[k]), r2.map((x) => x.url).join(' | '));
    } else {
      ok('Page 2 : sans objet (une seule page pour ce tiers payant)', true, page1.total);
    }

    /* 4. « Tous les produits » */
    appels.length = 0;
    await p.locator('.x-btn').filter({ visible: true, hasText: 'Tous les produits' }).first().click();
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return !e.storeProduits.isLoading() && /tous tiers payants/.test(e.down('#grilleProduits').title); }, null, { timeout: 300000 });
    await p.waitForTimeout(1000);
    const rTous = appels.filter((a) => a.url.includes('/produits'));
    ok('« Tous les produits » : une requête, sans tiers payant, paginée', rTous.length === 1 && /tiersPayantId=(&|$)/.test(rTous[0].url) && /[?&]limit=\d+/.test(rTous[0].url), rTous.map((x) => x.url).join(' | '));

    /* 5. « Rechercher » : jamais de double chargement */
    appels.length = 0; fins.length = 0;
    const t3 = Date.now();
    await p.locator('.x-btn').filter({ visible: true, hasText: 'Rechercher' }).first().click();
    await p.waitForTimeout(800);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return !e.storeTiersPayants.isLoading() && !e.storeProduits.isLoading(); }, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    const tRech = (fins.length ? Math.max(...fins.map((x) => x.t)) : Date.now()) - t3;
    const nTp = appels.filter((a) => a.url.includes('/tiers-payants')).length, nPr = appels.filter((a) => a.url.includes('/produits')).length;
    console.log('MESURE  Rechercher : ' + tRech + ' ms ; requêtes tiers-payants ' + nTp + ', produits ' + nPr);
    ok('Rechercher : une requête « tiers-payants », au plus une requête « produits »', nTp === 1 && nPr <= 1, nTp + ' / ' + nPr);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
