/* PREVISIONS, onglet « ANALYSE DE LA DEMANDE » (besoins du 11/10, point 14).
 * Jeu d'essai (retire a la fin) : un produit sans aucune vente recoit 40 unites en decembre 2024, 40 en decembre 2025
 * et 8 en juillet 2025. Sur 24 mois complets (oct. 2024 → sept. 2026) :
 *  - total 88 ; indice de decembre = 40 / (88 / 24) = 10,91 ; juillet = 4 / 3,667 = 1,09 ; pic en decembre ;
 *  - aujourd'hui en octobre : pic en decembre = « a anticiper » (novembre ou decembre) ;
 *  - mois en cours exclu ; refus d'une duree autre que 12, 24 ou 36 mois ;
 *  - ecran : 4e onglet, tuiles, matrice annee x mois avec indices colores, listes de produits, clic = prevision.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || ENV_E2E.TMP;
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const [FAM, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT='enable' AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID=f.lg_FAMILLE_ID)"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP LIKE CONCAT(f.int_CIP,'%'))=1 ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('\t');
const nettoyer = () => q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID LIKE 'e2e-dem-%';"
  + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-dem-%'");
const vente = (id, quand, qte) => q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, b_IS_CANCEL,"
  + " lg_TYPE_VENTE_ID, str_TYPE_VENTE, lg_USER_ID, dt_CREATED, dt_UPDATED) VALUES ('e2e-dem-" + id + "', 'E2E-DEM-" + id + "', " + qte * 100 + ", 0, " + qte * 100
  + ", 'is_Closed', 0, '1', 'VNO', '" + ADMIN + "', '" + quand + "', '" + quand + "');"
  + "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_PRICE,"
  + " int_PRICE_UNITAIR, int_PRICE_REMISE, str_STATUT, prixAchat, dt_CREATED, dt_UPDATED) VALUES ('e2e-dem-" + id + "', 'e2e-dem-" + id + "', '" + FAM + "', " + qte + ", " + qte
  + ", " + qte * 100 + ", 100, 0, 'is_Closed', 60, '" + quand + "', '" + quand + "')");

(async () => {
  nettoyer();
  vente('D24', '2024-12-10 10:00:00', 40);
  vente('D25', '2025-12-12 10:00:00', 40);
  vente('J25', '2025-07-05 10:00:00', 8);
  vente('X', new Date().toISOString().slice(0, 8) + '02 10:00:00', 500);   // mois en cours : exclu
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
    const d = await api('../api/v1/analyse-commande/demande?mois=24&query=' + CIP);
    const j = new Date(), fin = new Date(j.getFullYear(), j.getMonth() - 1, 1), deb = new Date(j.getFullYear(), j.getMonth() - 24, 1);
    const ym = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
    ok('Fenêtre : 24 mois complets, mois en cours exclu', d.success && d.debut === ym(deb) && d.fin === ym(fin), d.debut + ' → ' + d.fin);
    ok('Total : 88 unités (les 500 du mois en cours ne comptent pas)', d.total === 88, d.total);
    ok('Indices : décembre 10,91, juillet 1,09, les autres mois 0', d.indices[11] === 10.91 && d.indices[6] === 1.09 && d.indices.filter((v) => v === 0).length === 10, d.indices.join(' '));
    ok('Pic en décembre', d.pic === 12, d.pic);
    const a25 = (d.annees || []).find((a) => a.annee === 2025);
    ok('Matrice : 2025 = 8 en juillet, 40 en décembre, total 48', a25 && a25.mois[6] === 8 && a25.mois[11] === 40 && a25.total === 48, JSON.stringify(a25));
    const a24 = (d.annees || []).find((a) => a.annee === 2024);
    ok('Matrice : mois hors période vides (2024 avant octobre)', a24 && a24.mois[0] === null && a24.mois[9] === 0 && a24.mois[11] === 40, JSON.stringify(a24));
    ok('Tendance : 12 derniers mois (40 + 8 → 48 ? selon la date) contre les 12 précédents', d.tendance && typeof d.tendance.recent === 'number' && d.tendance.recent + d.tendance.avant === 88, JSON.stringify(d.tendance));
    const prod = (d.produits || [])[0] || {};
    ok('Produit classé : pic décembre, indice 10,91', d.produits.length === 1 && prod.cip === CIP && prod.pic === 12 && prod.indicePic === 10.91, JSON.stringify(prod));
    const prochain = j.getMonth() + 2 > 12 ? 1 : j.getMonth() + 2, suivant = prochain % 12 + 1;
    const attendu = prochain === 12 || suivant === 12;
    ok('« À anticiper » quand décembre est le mois prochain ou le suivant (' + prochain + '/' + suivant + ')', (d.anticiper.length === 1) === attendu && prod.anticiper === attendu, JSON.stringify(d.anticiper));
    const douze = await api('../api/v1/analyse-commande/demande?mois=12&query=' + CIP);
    ok('Sur 12 mois (oct. 2025 → sept. 2026) : seul décembre 2025 (40), pas de tendance', douze.total === 40 && Object.keys(douze.tendance).length === 0, douze.total);
    /* filtre par rayon seul (sans recherche) : avant, numerotation des parametres avec un trou -> erreur, 0 unite */
    const RAYON = q("SELECT lg_ZONE_GEO_ID FROM t_famille WHERE lg_FAMILLE_ID = '" + FAM + "'");
    const parRayon = await api('../api/v1/analyse-commande/demande?mois=24&rayonId=' + encodeURIComponent(RAYON));
    const enBase = Number(q("SELECT COALESCE(SUM(d.int_QUANTITY), 0) FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_TYPE_VENTE_ID <> '5'"
      + " AND f.lg_ZONE_GEO_ID = '" + RAYON + "' AND p.dt_UPDATED >= '" + d.debut + "-01' AND p.dt_UPDATED < DATE_ADD('" + d.fin + "-01', INTERVAL 1 MONTH)"));
    ok('Filtre rayon seul : unités du rayon, comme la base (' + enBase + ')', parRayon.success && parRayon.total === enBase && enBase > 0, JSON.stringify({ api: parRayon.total, base: enBase, msg: parRayon.msg }));
    const refus = await api('../api/v1/analyse-commande/demande?mois=7');
    ok('Durée refusée (7 mois) : message', refus.success === false && /12, 24 ou 36/.test(refus.msg), refus.msg);
    const vide = await api('../api/v1/analyse-commande/demande?mois=24&query=' + encodeURIComponent("ZZ%_'!INEXISTANT"));
    ok('Recherche sans résultat (caractères spéciaux) : 0 unité, pas d\'erreur', vide.success && vide.total === 0 && vide.pic === null, JSON.stringify({ t: vide.total, p: vide.pic }));

    /* ------------------------------------------------ ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Prévisions', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').length > 0, null, { timeout: 30000 });
    const titres = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande')[0].items.items.map((t) => t.title).join('|'));
    ok('4e onglet « Analyse de la demande »', /\|Analyse de la demande$/.test(titres), titres);
    await p.evaluate((cip) => { const t = Ext.ComponentQuery.query('analysecommande')[0], o = t.down('#ongletDemande'); o.down('#demRecherche').setValue(cip); t.setActiveTab(o); }, CIP);
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('analysecommande')[0]; return t.demande && !t.demandeEnCours; }, null, { timeout: 120000 });
    await p.waitForTimeout(600);
    const ecran = await p.evaluate(() => { const d = Ext.ComponentQuery.query('analysecommande #ongletDemande')[0].getEl().dom;
      const ind = [...d.querySelectorAll('tr.dem-indices td')].map((x) => x.textContent);
      return { tuiles: d.querySelectorAll('.dem-tuiles .pml-tuile').length, fort: (d.querySelectorAll('.dem-tuiles .pml-tuile-valeur')[1] || {}).textContent,
        faibles: (d.querySelectorAll('.dem-tuiles .pml-tuile-valeur')[2] || {}).textContent, janv: ind[1],
        annees: d.querySelectorAll('tr.dem-annee').length, dec: ind[12], fond: (d.querySelectorAll('tr.dem-indices td')[12] || {}).style.background,
        produits: d.querySelectorAll('table.dem-saisonniers tr.dem-produit').length, fenetre: Ext.ComponentQuery.query('analysecommande #demFenetre')[0].getEl().dom.textContent }; });
    ok('Écran : 4 tuiles, mois le plus fort « déc. », plus faibles « 10 mois sans vente », matrice (3 années), indice de décembre en vert, janvier 0,00', ecran.tuiles === 4 && ecran.fort === 'déc.' && ecran.faibles === '10 mois sans vente' && ecran.janv === '0,00' && ecran.annees === 3
      && ecran.dec === '10,91' && /169, 223, 191|a9dfbf/.test(ecran.fond) && ecran.produits === 1 && /Mois complets/.test(ecran.fenetre), JSON.stringify(ecran));
    await p.screenshot({ path: SORTIE + '/demande-saisonniere.png' });
    await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #ongletDemande')[0].getEl().dom.querySelector('table.dem-saisonniers tr.dem-produit td').click());
    const fen = await p.waitForFunction(() => Ext.ComponentQuery.query('#fenPrevision').some((w) => w.isVisible()), null, { timeout: 15000 }).then(() => true).catch(() => false);
    ok('Clic sur un produit : ouvre sa prévision (fenêtre de consultation existante)', fen);
    const doublons = await p.evaluate(() => { const vus = {}, d = []; document.querySelectorAll('[id]:not([id=""])').forEach((e) => { if (vus[e.id]) { d.push(e.id + ':' + e.tagName + '.' + e.className); } vus[e.id] = 1; }); return d; });
    ok('Aucun élément en double dans la page', doublons.length === 0, doublons.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-dem-%'") === '0' && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID LIKE 'e2e-dem-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
