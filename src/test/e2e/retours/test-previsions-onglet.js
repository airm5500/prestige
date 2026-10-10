/* ONGLET PREVISIONS (retours du 10/10, lot 3) — par l'ecran, donnees d'essai retirees a la fin.
 *  - filtres methode / stock / « avec equivalent en stock » : memes produits qu'une requete independante ;
 *  - nombre de lignes 25 / 50 / 100 / 200 ;
 *  - infobulles avec le calcul (recommande, couverture, valeur) ;
 *  - Generer une suggestion (Q3 : toute la liste filtree) : quantite = recommande, lignes a 0 exclues, produits
 *    retires exclus ; une suggestion par grossiste habituel ;
 *  - Equivalents d'un produit : stock rayon / reserve, retrait depuis la fenetre ;
 *  - exports Excel et PDF de la liste filtree ; creation d'un inventaire (coches).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const SQLBASE = " FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_EMPLACEMENT_ID = '1'";
/* deux produits du jeu : l'un passe en methode HOLT avec 7 equivalents en stock (valeurs remises a la fin) */
const [A, CIPA, METH_A, EQ_A] = q("SELECT p.lg_FAMILLE_ID, f.int_CIP, p.methode, p.equivalents" + SQLBASE + " AND p.recommande > 0 AND f.lg_GROSSISTE_ID IS NOT NULL"
  + " AND f.bool_DECONDITIONNE = 0 AND f.int_CIP REGEXP '^[0-9]{6,}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP LIKE CONCAT(f.int_CIP, '%')) = 1 ORDER BY f.str_NAME LIMIT 1").split('\t');
const LIGNE_A = q("SELECT CONCAT_WS('|', methode, equivalents, recommande, en_cours, IFNULL(couverture_jours, 'NULL')) FROM t_prevision_produit WHERE lg_FAMILLE_ID = '" + A + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
const remettreA = () => exec("UPDATE t_prevision_produit SET methode = '" + LIGNE_A[0] + "', equivalents = " + LIGNE_A[1] + ", recommande = " + LIGNE_A[2]
  + ", en_cours = " + LIGNE_A[3] + ", couverture_jours = " + LIGNE_A[4] + " WHERE lg_FAMILLE_ID = '" + A + "' AND lg_EMPLACEMENT_ID = '1'");
const [Z, CIPZ] = q("SELECT p.lg_FAMILLE_ID, f.int_CIP" + SQLBASE + " AND p.recommande = 0 AND f.int_CIP REGEXP '^[0-9]{6,}$'"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP LIKE CONCAT(f.int_CIP, '%')) = 1 ORDER BY f.str_NAME LIMIT 1").split('\t');
function nettoyer() {
  remettreA();
  exec("DELETE d FROM t_suggestion_order_details d JOIN t_suggestion_order s ON s.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE s.str_COMMENTAIRE LIKE 'Prévisions du%' AND s.dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM t_suggestion_order WHERE str_COMMENTAIRE LIKE 'Prévisions du%' AND dt_CREATED >= '" + DEBUT + "';"
    + "DELETE fi FROM t_inventaire_famille fi JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = fi.lg_INVENTAIRE_ID WHERE i.str_NAME LIKE 'Prévisions %' AND i.dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM t_inventaire WHERE str_NAME LIKE 'Prévisions %' AND dt_CREATED >= '" + DEBUT + "';");
}

(async () => {
  exec("UPDATE t_prevision_produit SET methode = 'HOLT', equivalents = 7 WHERE lg_FAMILLE_ID = '" + A + "' AND lg_EMPLACEMENT_ID = '1'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Prévisions', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').length, null, { timeout: 30000 });
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; a.setActiveTab(a.down('#ongletPrevisions')); });
    const charge = () => p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; return g.getStore().getProxy().getReader().rawData && !g.getStore().isLoading(); }, null, { timeout: 120000 });
    await charge();
    /* criteres poses dans les champs, liste rechargee comme par l'ecran */
    const chercher = async (c) => {
      await p.evaluate((c) => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0], s = g.getStore();
        g.down('#filtre').setValue(c.filtre || ''); g.down('#methode').setValue(c.methode || ''); g.down('#stock').setValue(c.stock || '');
        g.down('#equivalent').suspendEvents(); g.down('#equivalent').setValue(!!c.equivalent); g.down('#equivalent').resumeEvents();
        g.down('#query').setValue(c.query || ''); s.getProxy().getReader().rawData = null; s.loadPage(1); }, c);
      await charge();
      return p.evaluate(() => { const s = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0].getStore(); return { total: s.getTotalCount(), ids: s.collect('id') }; });
    };
    const compter = (cond) => Number(q('SELECT COUNT(*)' + SQLBASE + cond));

    let r = await chercher({ methode: 'HOLT' });
    ok('Filtre méthode « Tendance (Holt) » : ' + r.total + ' produit(s), comme la base', r.total === compter(" AND p.methode = 'HOLT'") && r.ids.indexOf(A) >= 0, JSON.stringify(r).slice(0, 200));
    r = await chercher({ methode: 'MOYENNE' });
    ok('Filtre méthode « Moyenne 3 mois » : ' + r.total + ' produit(s)', r.total === compter(" AND p.methode = 'MOYENNE'"), r.total);
    r = await chercher({ equivalent: true });
    ok('Filtre « avec équivalent en stock » : ' + r.total + ' produit(s)', r.total === compter(' AND p.equivalents > 0') && r.ids.indexOf(A) >= 0, r.total);
    r = await chercher({ stock: 'RUPTURE' });
    ok('Filtre stock à zéro : ' + r.total, r.total === compter(' AND p.stock <= 0'), r.total);
    r = await chercher({ stock: 'EN_STOCK', filtre: 'ACOMMANDER' });
    ok('Filtres combinés « à commander » + « en stock » : ' + r.total, r.total === compter(' AND p.stock > 0 AND p.recommande > 0'), r.total);

    /* nombre de lignes */
    r = await chercher({});
    const lignes = await p.evaluate(async () => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0], c = g.down('#choixLignes');
      const choix = c.getStore().collect('n'); c.setValue(100); c.fireEvent('select', c); return choix; });
    await charge();
    const n100 = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0].getStore().getCount());
    ok('Nombre de lignes 25 / 50 / 100 / 200 ; à 100 : ' + n100 + ' lignes', JSON.stringify(lignes) === '[25,50,100,200]' && n100 === Math.min(100, r.total), JSON.stringify(lignes));

    /* infobulles du calcul */
    r = await chercher({ query: CIPA });
    const tips = await p.evaluate(() => [...Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0].getView().getEl().dom.querySelectorAll('td[data-qtip]')].map((t) => t.getAttribute('data-qtip')));
    ok('Infobulles : calcul du recommandé, de la couverture et de la valeur sur la ligne', tips.some((t) => /Ventes par jour .* × \(délai .* \+ couverture .*\) = .* stock de sécurité .* − stock .* − en cours .* − équivalents 7 = /.test(t))
      && tips.some((t) => /÷ ventes par jour/.test(t)) && tips.some((t) => /× prix d'achat/.test(t)), tips.join(' || ').slice(0, 400));

    /* equivalents : fenetre (lecture seule), retrait depuis la fenetre */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; g.up('analysecommande').fenetreEquivalents(g.getStore().getAt(0)); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenEquivalents').length && Ext.ComponentQuery.query('#fenEquivalents')[0].down('grid').getStore().getCount() > 0, null, { timeout: 30000 });
    const eq = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenEquivalents')[0], s = w.down('grid').getStore();
      return { premiere: s.getAt(0).get('niveau'), colonnes: w.down('grid').headerCt.getGridColumns().map((c) => c.text), dispo: !!w.down('#btnDispoEq') }; });
    const reserveA = q("SELECT IFNULL(SUM(int_NUMBER), 0) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + A + "'");
    const lA = await p.evaluate(() => { const s = Ext.ComponentQuery.query('#fenEquivalents')[0].down('grid').getStore(); return { rayon: s.getAt(0).get('rayon'), reserve: s.getAt(0).get('reserve') }; });
    ok('Équivalents : le produit puis ses équivalents, colonnes Rayon / Réserve, vérification PharmaML proposée', eq.premiere === 'PRODUIT' && eq.colonnes.indexOf('Rayon') >= 0 && eq.colonnes.indexOf('Réserve') >= 0 && eq.dispo
      && String(lA.reserve) === reserveA, JSON.stringify(eq) + JSON.stringify(lA) + ' reserve base ' + reserveA);
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenEquivalents')[0]; w.down('#btnRetirerEq').handler(w.down('#btnRetirerEq')); w.close(); });
    const retire = await p.evaluate((A) => { const a = Ext.ComponentQuery.query('analysecommande')[0]; return { r: !!a.retires[A], info: a.down('#infoRetires').getEl().dom.textContent }; }, A);
    ok('Retirer depuis la fenêtre : produit retiré (ligne barrée, compteur)', retire.r && /1 produit\(s\) retiré/.test(retire.info), JSON.stringify(retire));

    /* generation sur la ligne d'origine (les 7 equivalents d'essai changeraient le recommande) */
    remettreA();
    /* generation : produit retire -> rien ; remis -> une suggestion, quantite = recommande */
    const gen = async () => {
      await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #btnGenerer')[0].handler());
      await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Créer une suggestion/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 10000 });
      await p.evaluate(() => { Ext.MessageBox.down('button[itemId=yes]') ? Ext.MessageBox.down('button[itemId=yes]').btnEl.dom.click() : Ext.MessageBox.msgButtons.yes.btnEl.dom.click(); });
      await p.waitForFunction(() => Ext.MessageBox.isVisible() && /suggestion\(s\) créée|Aucun produit|Aucune suggestion/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
      const t = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
      await p.evaluate(() => Ext.MessageBox.hide());
      return t;
    };
    const creees = () => q("SELECT COUNT(*) FROM t_suggestion_order WHERE str_COMMENTAIRE LIKE 'Prévisions du%' AND dt_CREATED >= '" + DEBUT + "'");
    let t = await gen();
    ok('Générer avec le seul produit de la liste retiré : aucune suggestion', /Aucun produit/.test(t) && creees() === '0', t);
    await p.evaluate((A) => Ext.ComponentQuery.query('analysecommande')[0].basculerRetire(A), A);
    const recA = q("SELECT recommande FROM t_prevision_produit WHERE lg_FAMILLE_ID = '" + A + "' AND lg_EMPLACEMENT_ID = '1'");
    t = await gen();
    const lignesSugg = q("SELECT CONCAT(d.lg_FAMILLE_ID, ':', d.int_NUMBER) FROM t_suggestion_order_details d JOIN t_suggestion_order s ON s.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID"
      + " WHERE s.str_COMMENTAIRE LIKE 'Prévisions du%' AND s.dt_CREATED >= '" + DEBUT + "'");
    ok('Remis puis généré : 1 suggestion, la ligne du produit à la quantité recommandée (' + recA + ')', /1<\/b>|1 suggestion/.test(t.replace(/\s+/g, ' ')) && creees() === '1' && lignesSugg === A + ':' + recA, t + ' / ' + lignesSugg);
    const z = await p.evaluate(async (cip) => (await fetch('../api/v1/analyse-commande/previsions/suggestion', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteres: { query: cip } }) })).json(), CIPZ);
    ok('Liste dont le recommandé est 0 : aucune suggestion (pas de ligne à 0)', z.success === false && z.aZero === 1 && creees() === '1', JSON.stringify(z));

    /* exports de la liste filtree */
    const xls = await p.evaluate(async (cip) => { const r = await fetch('../api/v1/analyse-commande/previsions/excel?query=' + cip); return { s: r.status, t: r.headers.get('content-type'), d: r.headers.get('content-disposition'), n: (await r.arrayBuffer()).byteLength }; }, CIPA);
    ok('Excel de la liste filtrée', xls.s === 200 && /excel/.test(xls.t) && /previsions_.*\.xls/.test(xls.d) && xls.n > 1000, JSON.stringify(xls));
    const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/analyse-commande/previsions/pdf?filtre=ACOMMANDER'); const b = new Uint8Array(await r.arrayBuffer()); return { s: r.status, t: r.headers.get('content-type'), debut: String.fromCharCode.apply(null, b.slice(0, 5)), n: b.length }; });
    ok('PDF de la liste filtrée', pdf.s === 200 && /pdf/.test(pdf.t) && pdf.debut === '%PDF-' && pdf.n > 1500, JSON.stringify(pdf));

    /* inventaire des produits coches */
    r = await chercher({ filtre: 'ACOMMANDER' });
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; g.getSelectionModel().select([g.getStore().getAt(0), g.getStore().getAt(1)]); g.up('analysecommande').creerInventaire(); });
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /2<\/b>|2 produit/.test(Ext.MessageBox.msg.getEl().dom.innerHTML), null, { timeout: 10000 });
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Inventaire/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    const inv = q("SELECT CONCAT(i.str_NAME, '|', COUNT(fi.lg_INVENTAIRE_FAMILLE_ID)) FROM t_inventaire i LEFT JOIN t_inventaire_famille fi ON fi.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID WHERE i.str_NAME LIKE 'Prévisions %' AND i.dt_CREATED >= '" + DEBUT + "' GROUP BY i.lg_INVENTAIRE_ID");
    ok('Créer un inventaire : les 2 produits cochés', /^Prévisions .*\|2$/.test(inv), inv);
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré (photo remise, suggestions et inventaire supprimés)', q("SELECT CONCAT_WS('|', methode, equivalents, recommande, en_cours, IFNULL(couverture_jours, 'NULL')) FROM t_prevision_produit WHERE lg_FAMILLE_ID = '" + A + "' AND lg_EMPLACEMENT_ID = '1'") === LIGNE_A.join('|')
      && q("SELECT COUNT(*) FROM t_suggestion_order WHERE str_COMMENTAIRE LIKE 'Prévisions du%' AND dt_CREATED >= '" + DEBUT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'Prévisions %' AND dt_CREATED >= '" + DEBUT + "'") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
