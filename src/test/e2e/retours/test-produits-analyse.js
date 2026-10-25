/* MENU PRODUITS, onglet ANALYSE (besoins du 11/10, point 13). Lecture seule : aucune donnee creee.
 *  - API v1/analyse-produits sur septembre 2026 : totaux = calcul SQL independant (ventes, quantites, CA, marge) ;
 *    somme des periodes = totaux, par jour, semaine, mois et annee ; filtre par CIP = calcul du seul produit ;
 *  - refus : dates inversees, pas inconnu, par jour sur plus de 400 jours ;
 *  - ecran : le menu ouvre le conteneur, onglet Liste inchange (produitsxx), onglet Analyse (tuiles, graphique,
 *    selecteur de mesure, tableaux), periode « 3 derniers mois » du selecteur commun ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || ENV_E2E.TMP;
const PERIM = "FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID LEFT JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID"
  + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_TYPE_VENTE_ID <> '5'"
  + " AND p.dt_UPDATED >= '2026-09-01' AND p.dt_UPDATED < '2026-10-01'";
const attendu = (filtre) => q("SELECT COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID), SUM(d.int_QUANTITY), SUM(d.int_PRICE - IFNULL(d.int_PRICE_REMISE,0)),"
  + " ROUND(SUM((d.int_PRICE - IFNULL(d.int_PRICE_REMISE,0)) / (1 + IFNULL(v.int_VALUE,0)/100))) - SUM(f.int_PAF * d.int_QUANTITY) " + PERIM + (filtre || '')).split('\t').map(Number);

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------ API */
    const att = attendu();
    ok('Précondition : des ventes en septembre 2026', att[0] > 0, att.join(' / '));
    const sep = (pas, extra) => api('../api/v1/analyse-produits?debut=2026-09-01&fin=2026-09-30&pas=' + pas + (extra || ''));
    const m = await sep('MOIS');
    const t = m.total || {};
    ok('Totaux = calcul SQL indépendant (ventes, quantités, CA)', t.ventes === att[0] && t.quantite === att[1] && t.ca === att[2], JSON.stringify(t) + ' / ' + att);
    ok('Marge = CA HT − achat (à 1 F près, arrondis)', Math.abs(t.marge - att[3]) <= 1 && t.taux === Math.round(t.marge * 1000 / t.caHT) / 10, t.marge + ' / ' + att[3]);
    const somme = (o, k) => (o.serie || []).reduce((s, x) => s + x[k], 0);
    for (const pas of ['JOUR', 'SEMAINE', 'MOIS', 'ANNEE']) {
      const o = await sep(pas);
      const nb = { JOUR: 30, SEMAINE: 5, MOIS: 1, ANNEE: 1 }[pas];
      ok('Par ' + pas.toLowerCase() + ' : somme des périodes = totaux (CA, quantités), ' + (o.serie || []).length + ' période(s)',
        o.success && somme(o, 'ca') === t.ca && somme(o, 'quantite') === t.quantite && (o.serie || []).length <= nb && (o.serie || []).length > 0,
        JSON.stringify((o.serie || []).slice(0, 2)));
    }
    const sem = await sep('SEMAINE');
    ok('Clés de semaine ISO (2026-S36…)', /^2026-S3[5-9]$/.test(sem.serie[0].cle), sem.serie.map((x) => x.cle).join(','));
    ok('Top produits : 50 au plus, triés par CA décroissant', m.produits.length <= 50 && m.produits.every((x, i, a) => i === 0 || a[i - 1].ca >= x.ca), m.produits.length);
    const top = m.produits[0];
    const attP = attendu(" AND f.int_CIP LIKE '" + top.cip.replace(/'/g, "''") + "%'");
    const fp = await sep('MOIS', '&query=' + encodeURIComponent(top.cip));
    ok('Filtre par CIP (début) : totaux du produit = calcul indépendant', fp.total.ca === attP[2] && fp.total.quantite === attP[1], JSON.stringify(fp.total) + ' / ' + attP);
    const rien = await sep('MOIS', '&query=' + encodeURIComponent("ZZ%_'!INEXISTANT"));
    ok('Recherche avec caractères spéciaux : aucune vente, pas d\'erreur', rien.success && rien.total.ca === 0 && rien.serie.length === 0, JSON.stringify(rien.total));
    const inv = await api('../api/v1/analyse-produits?debut=2026-09-30&fin=2026-09-01&pas=MOIS');
    const pasX = await api('../api/v1/analyse-produits?debut=2026-09-01&fin=2026-09-30&pas=HEURE');
    const long = await api('../api/v1/analyse-produits?debut=2024-01-01&fin=2026-09-30&pas=JOUR');
    ok('Refus : dates inversées, pas inconnu, par jour sur plus de 400 jours', inv.success === false && /début/.test(inv.msg) && pasX.success === false
      && long.success === false && /400/.test(long.msg), [inv.msg, pasX.msg, long.msg].join(' | '));

    /* ------------------------------------------------ ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('produitsxx', 'Produits', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('produitsonglets').length > 0 && Ext.ComponentQuery.query('produitsonglets produitsxx').length > 0, null, { timeout: 30000 });
    const onglets = await p.evaluate(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0];
      return { boutons: w.query('#ongletsPa button').map((x) => x.text).join('|'), actif: w.getLayout().getActiveItem().xtype }; });
    ok('Le menu ouvre le conteneur : onglets Liste | Analyse, liste existante affichée d\'abord', onglets.boutons === 'Liste|Analyse' && onglets.actif === 'produitsxx', JSON.stringify(onglets));
    await p.waitForFunction(() => !Ext.ComponentQuery.query('produitsxx')[0].getStore().isLoading(), null, { timeout: 60000 });
    await p.evaluate(() => Ext.ComponentQuery.query('produitsonglets #pa-analyse')[0].btnEl.dom.click());
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return w.donnees && !w.enCours; }, null, { timeout: 120000 });
    /* periode de septembre par les champs, puis Actualiser */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('produitsonglets #analyseProduits')[0]; a.down('#paDebut').setValue(new Date(2026, 8, 1)); a.down('#paFin').setValue(new Date(2026, 8, 30));
      a.down('#paPas').setValue('SEMAINE'); const w = Ext.ComponentQuery.query('produitsonglets')[0]; w.donnees = null; a.down('#paActualiser').btnEl.dom.click(); });
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return w.donnees && w.donnees.pas === 'SEMAINE' && !w.enCours; }, null, { timeout: 120000 });
    await p.waitForTimeout(800);
    const ecran = await p.evaluate(() => { const a = Ext.ComponentQuery.query('produitsonglets #analyseProduits')[0], d = a.getEl().dom;
      return { tuiles: d.querySelectorAll('.pa-tuiles .pml-tuile').length, ca: (d.querySelector('.pa-tuiles .pml-tuile-valeur') || {}).textContent,
        periodes: d.querySelectorAll('tr.pa-periode').length, premiere: (d.querySelector('tr.pa-periode td') || {}).textContent,
        produits: d.querySelectorAll('tr.pa-produit').length, graphe: !!a.down('#paCourbe'), points: Ext.ComponentQuery.query('produitsonglets')[0].serie.getCount(),
        mesures: a.query('#paMesures button').map((x) => x.text).join('|') }; });
    const caTexte = String(t.ca).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';
    ok('Analyse : 4 tuiles (CA = API), tableau par semaine (S36 2026…), top produits, graphique', ecran.tuiles === 4 && ecran.ca === caTexte && ecran.periodes === sem.serie.length
      && /^S3\d 2026$/.test(ecran.premiere) && ecran.produits === m.produits.length && ecran.graphe && ecran.points === sem.serie.length, JSON.stringify(ecran));
    ok('Sélecteur de mesure du graphique : CA | Marge | Ventes | Quantités', ecran.mesures === 'CA|Marge|Ventes|Quantités', ecran.mesures);
    await p.evaluate(() => Ext.ComponentQuery.query('produitsonglets #pa-mesure-marge')[0].btnEl.dom.click());
    await p.waitForTimeout(500);
    const marge = await p.evaluate(() => { const c = Ext.ComponentQuery.query('produitsonglets #paCourbe')[0]; return c && c.series.getAt(0).yField; });
    ok('Clic sur « Marge » : le graphique montre la marge', marge === 'marge', marge);
    await p.screenshot({ path: SORTIE + '/produits-analyse.png' });
    /* periode « 3 derniers mois » du selecteur commun (besoins du 11/10, point 13) */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('produitsonglets #paFinRaccourcis')[0].getId()));
    await p.waitForSelector('.periode-menu .x-menu-item', { timeout: 5000 });
    await p.locator('.periode-menu .x-menu-item-text', { hasText: '3 derniers mois' }).click();
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return w.donnees && w.donnees.debut !== '2026-09-01' && !w.enCours; }, null, { timeout: 120000 });
    const per = await p.evaluate(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return [w.donnees.debut, w.donnees.fin, w.donnees.pas]; });
    const j = new Date(), iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    ok('« 3 derniers mois » : période recalculée jusqu\'à aujourd\'hui, analyse rechargée', per[1] === iso(j) && per[0] < per[1] && per[0] >= iso(new Date(j.getFullYear(), j.getMonth() - 3, j.getDate() - 1)), per.join(' → '));
    /* retour a la liste */
    await p.evaluate(() => Ext.ComponentQuery.query('produitsonglets #pa-liste')[0].btnEl.dom.click());
    const retour = await p.evaluate(() => Ext.ComponentQuery.query('produitsonglets')[0].getLayout().getActiveItem().xtype);
    ok('Retour à l\'onglet Liste', retour === 'produitsxx', retour);
    const doublons = await p.evaluate(() => { const vus = {}; let n = 0; document.querySelectorAll('[id]:not([id=""])').forEach((e) => { if (vus[e.id]) { n++; } vus[e.id] = 1; }); return n; });
    ok('Aucun élément en double dans la page (bouton fantôme de la barre)', doublons === 0, doublons);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
