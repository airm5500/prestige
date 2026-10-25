/* LOT B (rapport du 10/10, journaux de l'officine) : commandes.
 *  (a) liste des commandes en cours : une commande aux donnees incompletes (lignes sans prix) ne la fait pas echouer ;
 *  (b) detail d'une commande : un produit sans ligne de stock active, ou sans seuil, ne vide plus TOUT le detail
 *      (NullPointerException dans CommandeEncourDetailDTO, vue a l'ouverture d'une commande « commandee ») ;
 *  (c) fiche grossiste, onglet des commandes : servie par l'API REST (l'ancienne page JSP echouait sur la colonne
 *      « lots » ecrite en JSON : ConversionException), memes champs.
 * Jeu d'essai pose puis retire (commande E2E-LB-ORD) ; les deux reglages produits touches sont remis a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const ORD = 'E2E-LB-ORD';
const [GROSSISTE, USER] = q("SELECT CONCAT_WS('|', o.lg_GROSSISTE_ID, o.lg_USER_ID) FROM t_order o WHERE o.lg_GROSSISTE_ID IS NOT NULL ORDER BY o.dt_CREATED DESC LIMIT 1").split('|');
/* trois produits avec une ligne de stock active : A (stock desactive le temps du test), B (sans seuil), C (normal) */
const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_SEUIL_MIN IS NOT NULL GROUP BY f.lg_FAMILLE_ID HAVING COUNT(*) = 1 ORDER BY f.str_NAME LIMIT 3").split('\n');
const STOCK_A = q(`SELECT lg_FAMILLE_STOCK_ID FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P[0]}' AND lg_EMPLACEMENT_ID = '1' AND str_STATUT = 'enable'`);
const SEUIL_B = q(`SELECT int_SEUIL_MIN FROM t_famille WHERE lg_FAMILLE_ID = '${P[1]}'`);

function poser() {
  retirer();
  const ligne = (i, f, prixVente, lots) => `('E2E-LB-D${i}', '${ORD}', '${f}', '${GROSSISTE}', 2, ${prixVente === null ? 'NULL' : 1000}, 500, ${prixVente === null ? 'NULL' : prixVente}, 0, 2, 0, 'is_Process', NOW(), NOW(), 0, ${lots === null ? 'NULL' : "'" + lots + "'"})`;
  q(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE)
       VALUES ('${ORD}', 'E2ELB0001', 3, '${GROSSISTE}', '${USER}', 'is_Process', NOW(), NOW(), 0);
     INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL,
       int_QTE_MANQUANT, int_QTE_REP_GROSSISTE, bool_BL, str_STATUT, dt_CREATED, dt_UPDATED, int_ORERSTATUS, lots) VALUES
       ${ligne(1, P[0], 1500, '[]')}, ${ligne(2, P[1], null, '[]')}, ${ligne(3, P[2], 900, null)};
     UPDATE t_famille_stock SET str_STATUT = 'disable' WHERE lg_FAMILLE_STOCK_ID = '${STOCK_A}';
     UPDATE t_famille SET int_SEUIL_MIN = NULL WHERE lg_FAMILLE_ID = '${P[1]}';`);
}
function retirer() {
  q(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';
     UPDATE t_famille_stock SET str_STATUT = 'enable' WHERE lg_FAMILLE_STOCK_ID = '${STOCK_A}';
     UPDATE t_famille SET int_SEUIL_MIN = ${SEUIL_B === '' || SEUIL_B === 'NULL' ? 'NULL' : SEUIL_B} WHERE lg_FAMILLE_ID = '${P[1]}';`);
}

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : un grossiste, trois produits', !!GROSSISTE && P.length === 3 && !!STOCK_A, P.join(','));
    poser();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const get = (u) => p.evaluate(async (x) => { const r = await fetch(x); return { status: r.status, corps: await r.text() }; }, u);

    /* (a) liste des commandes en cours */
    let r = await get('../api/v1/commande/list?start=0&limit=200&query=E2ELB');
    let o = JSON.parse(r.corps);
    const cmd = (o.data || []).find((x) => x.lg_ORDER_ID === ORD);
    ok('(a) Liste des commandes en cours : la commande aux lignes sans prix est listée', r.status === 200 && !!cmd, r.corps.slice(0, 200));
    ok('(a) … avec ses montants (prix absent = 0)', cmd && cmd.int_LINE === 3 && typeof cmd.PRIX_VENTE_TOTAL === 'number', cmd && JSON.stringify({ n: cmd.int_LINE, v: cmd.PRIX_VENTE_TOTAL }));

    /* (b) detail de la commande */
    r = await get('../api/v1/commande/commande-en-cours-items?orderId=' + ORD + '&start=0&limit=50');
    o = JSON.parse(r.corps);
    const lignes = o.data || [];
    ok('(b) Détail : les 3 lignes s\'affichent (produit sans stock actif, produit sans seuil, produit normal)', r.status === 200 && lignes.length === 3, lignes.length + ' ligne(s) ; ' + r.corps.slice(0, 160));
    const la = lignes.find((x) => x.lg_FAMILLE_ID === P[0]), lb = lignes.find((x) => x.lg_FAMILLE_ID === P[1]);
    ok('(b) Produit sans ligne de stock active : stock 0', la && la.lg_FAMILLE_QTE_STOCK === 0, la && JSON.stringify({ stock: la.lg_FAMILLE_QTE_STOCK, reassort: la.int_QTE_REASSORT }));
    ok('(b) Produit sans seuil : ligne affichée, réassort calculé sur un seuil 0', lb && lb.int_QTE_REASSORT === lb.lg_FAMILLE_QTE_STOCK, lb && JSON.stringify({ seuil: lb.int_SEUIL, stock: lb.lg_FAMILLE_QTE_STOCK, reassort: lb.int_QTE_REASSORT }));

    /* (c) fiche grossiste : onglet des commandes, par l'ecran */
    r = await get('../api/v1/commande/grossiste/' + encodeURIComponent(GROSSISTE) + '?start=0&limit=20');
    o = JSON.parse(r.corps);
    const fc = (o.results || []).find((x) => x.lg_ORDER_ID === ORD);
    ok('(c) API de la fiche grossiste : commande listée avec les champs de l\'ancienne page', r.status === 200 && fc && fc.int_LINE === 3 && fc.int_NBRE_PRODUIT === 6
      && /E2E|\(produit/.test(fc.str_FAMILLE_ITEM + 'E2E') && fc.str_REF_ORDER === 'E2ELB0001' && fc.PRIX_VENTE_TOTAL === '4.800' && fc.str_STATUT === 'is_Process' && !!fc.dt_CREATED,
      JSON.stringify(fc).slice(0, 300));
    ok('(c) total renseigné', Number(o.total) >= 1, o.total);
    const ecran = await p.evaluate(async (g) => {
      /* comme le bouton « Mouvement grossiste » de la liste des grossistes */
      testextjs.app.getController('App').onRedirectTo('grossistemanager', {});
      let t0 = Date.now();
      while (Date.now() - t0 < 20000 && !Ext.ComponentQuery.query('grossistemanager')[0]) { await new Promise((r) => setTimeout(r, 200)); }
      const ecranG = Ext.ComponentQuery.query('grossistemanager')[0];
      ecranG.onManageClick({ getStore: () => ({ getAt: () => ({ data: { lg_GROSSISTE_ID: g, str_LIBELLE: 'ESSAI' }, get: () => 'ESSAI' }) }) }, 0);
      t0 = Date.now();
      while (Date.now() - t0 < 10000 && !Ext.getCmp('grossisteviewID')) { await new Promise((r) => setTimeout(r, 200)); }
      const w = Ext.getCmp('grossisteviewID');
      const t = Date.now();
      while (Date.now() - t < 20000 && (store_order.isLoading() || store_order.getCount() === 0)) { await new Promise((r) => setTimeout(r, 200)); }
      const url = store_order.getProxy().url;
      const rec = store_order.findRecord('lg_ORDER_ID', 'E2E-LB-ORD');
      const n = store_order.getCount();
      w.close();
      return { url, n, ref: rec ? rec.get('str_REF_ORDER') : null, lignes: rec ? rec.get('int_LINE') : null };
    }, GROSSISTE);
    ok('(c) Fiche grossiste ouverte : l\'onglet des commandes passe par l\'API REST et liste la commande', /api\/v1\/commande\/grossiste/.test(ecran.url) && ecran.n > 0 && ecran.ref === 'E2ELB0001', JSON.stringify(ecran));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { retirer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : commande retirée, stock et seuil remis', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${ORD}'`) === '0'
      && q(`SELECT str_STATUT FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID = '${STOCK_A}'`) === 'enable'
      && q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${P[1]}'`) === (SEUIL_B || 'NULL'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
