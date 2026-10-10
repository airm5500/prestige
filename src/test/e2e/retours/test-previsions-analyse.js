/* ONGLET ANALYSE D'UNE SUGGESTION / COMMANDE (retours du 10/10, lot 3, Q4) — par l'ecran.
 *  - la liste ne propose que les suggestions actives et les commandes en cours (memes statuts que le menu Commandes en
 *    cours) : une suggestion commandee n'y est plus ;
 *  - pastilles d'alertes cliquables (filtre), filtres recommande / stock, recommande en vert ;
 *  - « Appliquer les quantites recommandees » : quantite = recommande, ligne a 0 supprimee (recuperable dans les
 *    produits retires), ligne deja juste inchangee ; refuse sur une suggestion commandee ; refuse si tout est a 0 ;
 *  - exports Excel / PDF et inventaire des lignes affichees ;
 *  - fenetre produit (Q12) : quantites au-dessus des barres, vert / rouge doux, origine du delai, RAY / RES, derniere vente.
 * Jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const S = 'E2E-PA-SUGG', SC = 'E2E-PA-CMDEE', S0 = 'E2E-PA-ZERO';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const base = " FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0";
const avecRec = q("SELECT GROUP_CONCAT(x.id) FROM (SELECT p.lg_FAMILLE_ID id" + base + " AND p.recommande > 1 AND p.en_cours = 0 ORDER BY f.str_NAME LIMIT 2) x").split(',');
const zero = q("SELECT GROUP_CONCAT(x.id) FROM (SELECT p.lg_FAMILLE_ID id" + base + " AND p.recommande = 0 AND p.en_cours = 0 AND p.stock > 0 ORDER BY f.str_NAME LIMIT 2) x").split(',');
const [A, B] = avecRec, [Z, Z2] = zero;

function nettoyer() {
  exec("DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID IN ('" + S + "','" + SC + "','" + S0 + "');"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN ('" + S + "','" + SC + "','" + S0 + "');"
    + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + S + "','" + SC + "','" + S0 + "');"
    + "DELETE fi FROM t_inventaire_famille fi JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = fi.lg_INVENTAIRE_ID WHERE i.str_NAME LIKE 'Prévisions %' AND i.dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM t_inventaire WHERE str_NAME LIKE 'Prévisions %' AND dt_CREATED >= '" + DEBUT + "';");
}
const sugg = (id, ref, statut, lignes) => "INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('"
  + id + "', '" + ref + "', '" + G + "', NOW(), NOW() + INTERVAL 1 MINUTE, '" + statut + "');"
  + lignes.map(([f, n], i) => "INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + id + "-" + i + "', '" + id + "', '" + G + "', '" + f + "', " + n + ", " + (n * 100) + ", 200, 100, NOW() + INTERVAL " + i + " SECOND, NOW(), 'is_Process');").join('');

(async () => {
  nettoyer();
  const recB = Number(q("SELECT recommande FROM t_prevision_produit WHERE lg_FAMILLE_ID = '" + B + "' AND lg_EMPLACEMENT_ID = '1'"));
  exec(sugg(S, 'E2EPA1', 'is_Process', [[A, 99], [Z, 5], [B, recB]]) + sugg(SC, 'E2EPA2', 'commandee', [[A, 3]]) + sugg(S0, 'E2EPA3', 'is_Process', [[Z2, 4]]));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const poster = (url, corps) => p.evaluate(async (a) => (await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) })).json(), { url, corps });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Prévisions', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').length, null, { timeout: 30000 });
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; a.setActiveTab(a.down('#ongletAnalyse')); });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('analysecommande #choix')[0]; return c && c.getStore().getCount() > 0 && !c.getStore().isLoading(); }, null, { timeout: 60000 });

    const liste = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #choix')[0].getStore().getRange().map((r) => r.get('type') + '|' + r.get('id') + '|' + r.get('statut')));
    const statutsCmd = q("SELECT IFNULL(GROUP_CONCAT(DISTINCT str_STATUT), '') FROM t_order WHERE str_STATUT IN ('is_Process','pharma')");
    ok('Liste : suggestion active proposée, suggestion commandée absente ; commandes = statuts du menu Commandes en cours',
      liste.some((x) => x.startsWith('SUGGESTION|' + S + '|')) && !liste.some((x) => x.indexOf(SC) >= 0)
      && liste.filter((x) => x.startsWith('COMMANDE|')).every((x) => /\|(is_Process|pharma)$/.test(x))
      && liste.filter((x) => x.startsWith('COMMANDE|')).length === Number(q("SELECT COUNT(*) FROM t_order WHERE str_STATUT IN ('is_Process','pharma')")), statutsCmd + ' ' + liste.length);
    ok('Choix sur toute la ligne, nombre de lignes en vert dans la liste', await p.evaluate(() => { const c = Ext.ComponentQuery.query('analysecommande #choix')[0];
      return c.getWidth() > 900 && /ac-nb-lignes/.test(c.listConfig.getInnerTpl()); }), await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #choix')[0].getWidth()));

    const analyser = async (id) => {
      await p.evaluate((id) => { const c = Ext.ComponentQuery.query('analysecommande #choix')[0]; c.setValue('SUGGESTION|' + id); c.fireEvent('select', c); }, id);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0]; return g.down('#resume').isVisible() && !(g.getEl() && g.getEl().isMasked()); }, null, { timeout: 60000 });
      await p.waitForTimeout(400);
    };
    await analyser(S);
    const vue = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0];
      return { n: g.getStore().getCount(), puces: [...g.down('#resumeTexte').getEl().dom.querySelectorAll('[data-alerte]')].map((x) => x.getAttribute('data-alerte')),
        vert: [...g.getView().getEl().dom.querySelectorAll('b[style*="#17795f"], span[style*="#17795f"]')].length }; });
    ok('Analyse : 3 lignes, recommandé en vert, pastilles d\'alerte cliquables', vue.n === 3 && vue.vert >= 3 && vue.puces.length > 0, JSON.stringify(vue));
    const code = vue.puces[0];
    await p.evaluate((code) => Ext.ComponentQuery.query('analysecommande #resumeTexte')[0].getEl().dom.querySelector('[data-alerte="' + code + '"]').click(), code);
    const filtre = await p.evaluate((code) => { const s = Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0].getStore();
      return { n: s.getCount(), tous: s.getRange().every((r) => (r.get('alertes') || []).some((a) => a.code === code)) }; }, code);
    await p.evaluate((code) => Ext.ComponentQuery.query('analysecommande #resumeTexte')[0].getEl().dom.querySelector('[data-alerte="' + code + '"]').click(), code);
    const tout = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0].getStore().getCount());
    ok('Pastille « ' + code + ' » : filtre les lignes concernées ; second clic : toutes', filtre.tous && filtre.n >= 1 && filtre.n <= 3 && tout === 3, JSON.stringify(filtre) + ' / ' + tout);
    const filtres = await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0], g = a.down('#ongletAnalyse'), s = g.getStore(), o = {};
      g.down('#filtreRecommande').setValue('ZERO'); a.filtrerAlertes(); o.zero = s.collect('id');
      g.down('#filtreRecommande').setValue('POSITIF'); a.filtrerAlertes(); o.positif = s.getCount();
      g.down('#filtreRecommande').setValue(''); g.down('#filtreStock').setValue('EN_STOCK'); a.filtrerAlertes(); o.enStock = s.getRange().every((r) => r.get('stock') > 0);
      g.down('#filtreStock').setValue(''); a.filtrerAlertes(); o.fin = s.getCount(); return o; });
    ok('Filtres recommandé (= 0, > 0) et stock', JSON.stringify(filtres.zero) === JSON.stringify([Z]) && filtres.positif === 2 && filtres.enStock && filtres.fin === 3, JSON.stringify(filtres));

    /* exports et inventaire des lignes affichees */
    const xls = await p.evaluate(async (id) => { const r = await fetch('../api/v1/analyse-commande/analyse/excel?type=SUGGESTION&id=' + id); return { s: r.status, d: r.headers.get('content-disposition'), n: (await r.arrayBuffer()).byteLength }; }, S);
    const pdf = await p.evaluate(async (id) => { const r = await fetch('../api/v1/analyse-commande/analyse/pdf?type=SUGGESTION&id=' + id); const b = new Uint8Array(await r.arrayBuffer()); return { s: r.status, debut: String.fromCharCode.apply(null, b.slice(0, 5)), n: b.length }; }, S);
    ok('Analyse : Excel et PDF', xls.s === 200 && /analyse_.*\.xls/.test(xls.d) && xls.n > 1000 && pdf.s === 200 && pdf.debut === '%PDF-', JSON.stringify({ xls, pdf }));
    await p.evaluate(() => Ext.ComponentQuery.query('analysecommande')[0].inventaireAnalyse());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /3<\/b> produit/.test(Ext.MessageBox.msg.getEl().dom.innerHTML), null, { timeout: 10000 });
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /créé/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Inventaire des 3 produits affichés', q("SELECT COUNT(*) FROM t_inventaire_famille fi JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = fi.lg_INVENTAIRE_ID WHERE i.str_NAME LIKE 'Prévisions %' AND i.dt_CREATED >= '" + DEBUT + "'") === '3');

    /* appliquer les quantites recommandees */
    const recA = await p.evaluate((A) => Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0].getStore().findRecord('id', A, 0, false, true, true).get('recommande'), A);
    await p.evaluate(() => Ext.ComponentQuery.query('analysecommande')[0].appliquerRecommande());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Appliquer|quantité recommandée/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 10000 });
    const conf = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /modifiée/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    const bilan = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    const lignes = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', int_PRICE) ORDER BY dt_CREATED) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + S + "'");
    ok('Confirmation : 1 ligne modifiée, 1 supprimée annoncées', /1 ligne\(s\) prendront/.test(conf) && /1 ligne\(s\) recommandée\(s\) à 0 seront supprimées/.test(conf), conf);
    ok('Appliqué : A à ' + recA + ' (prix recalculé), ligne à 0 supprimée, B inchangée', lignes === A + ':' + recA + ':' + (recA * 100) + ',' + B + ':' + recB + ':' + (recB * 100)
      && /1 ligne\(s\) modifiée\(s\), 1 supprimée\(s\), 1 inchangée/.test(bilan), lignes + ' / ' + bilan);
    ok('Ligne supprimée récupérable (produits retirés)', q("SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '" + S + "' AND lg_FAMILLE_ID = '" + Z + "'") === '1');
    let r = await poster('../api/v1/analyse-commande/analyse/appliquer', { type: 'SUGGESTION', id: SC });
    ok('Suggestion commandée : refus, rien modifié', r.success === false && /plus active/.test(r.message) && q("SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SC + "'") === '3', JSON.stringify(r));
    r = await poster('../api/v1/analyse-commande/analyse/appliquer', { type: 'SUGGESTION', id: S0 });
    ok('Tout recommandé à 0 : refus, la suggestion garde sa ligne', r.success === false && /à 0/.test(r.message) && q("SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + S0 + "'") === '1', JSON.stringify(r));

    /* fenetre produit (Q12) */
    await p.evaluate((A) => testextjs.view.commandemanagement.analyse.FenetrePrevision.ouvrir(A), A);
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenPrevision').length > 0, null, { timeout: 30000 });
    const f = await p.evaluate(() => { const el = Ext.ComponentQuery.query('#fenPrevision')[0].body.dom;
      return { qte: el.querySelectorAll('text.pv-qte').length, barres: el.querySelectorAll('rect').length, plus: el.querySelectorAll('tr.pv-plus').length, moins: el.querySelectorAll('tr.pv-moins').length,
        fondPlus: el.querySelector('tr.pv-plus td') ? getComputedStyle(el.querySelector('tr.pv-plus td')).backgroundColor : '', fondMoins: el.querySelector('tr.pv-moins td') ? getComputedStyle(el.querySelector('tr.pv-moins td')).backgroundColor : '',
        texte: el.textContent.replace(/\s+/g, ' ') }; });
    const ray = q("SELECT COALESCE(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + A + "' AND lg_EMPLACEMENT_ID = '1'");
    const res_ = q("SELECT COALESCE(SUM(int_NUMBER), 0) FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '" + A + "' AND lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1'");
    const delaiG = Number(q("SELECT COALESCE(g.int_DELAI_REAPPROVISIONNEMENT, 0) FROM t_famille f LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID WHERE f.lg_FAMILLE_ID = '" + A + "'"));
    ok('Fenêtre produit : quantité au-dessus de chaque barre', f.qte === f.barres && f.qte > 1, JSON.stringify({ q: f.qte, b: f.barres }));
    ok('Fenêtre produit : 3 lignes vertes (besoin) et 3 rouge doux (retranché)', f.plus === 3 && f.moins === 3 && f.fondPlus === 'rgb(234, 247, 239)' && f.fondMoins === 'rgb(253, 238, 238)', JSON.stringify(f).slice(0, 200));
    ok('Fenêtre produit : origine du délai, RAY / RES, dernière vente avec quantité', (delaiG > 0 ? /délai du grossiste/.test(f.texte) : /paramètre \(délai par défaut\)/.test(f.texte))
      && f.texte.indexOf('(RAY = ' + ray + ', RES = ' + res_ + ')') >= 0 && /Dernière vente : (jamais|\d\d\/\d\d\/\d{4} — \d+ unités?)/.test(f.texte), f.texte.slice(f.texte.indexOf('Quantité recommandée'), f.texte.indexOf('Quantité recommandée') + 400));
    await p.evaluate(() => Ext.ComponentQuery.query('#fenPrevision')[0].close());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + S + "','" + SC + "','" + S0 + "')") === '0'
      && q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'Prévisions %' AND dt_CREATED >= '" + DEBUT + "'") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
