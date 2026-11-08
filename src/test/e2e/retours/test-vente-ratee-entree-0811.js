/* PLAN DU 08/11, POINT 13 : UNE VENTE RATEE PASSE « COMMANDÉ » A L'ENTREE EN STOCK DE SON PRODUIT.
 * Jeu d'essai (retire a la fin, produits remis) : un bon de livraison de deux lignes, produit P (2 unites) et produit Q
 * (0 unite) ; registre des ventes ratees :
 *   R1  P, active, demandee 2 h avant                    -> « Commandé » a l'entree, BL garde
 *   R2  P, deja commandee a la main (sans BL)             -> intacte (date, auteur, pas de BL)
 *   R3  P, desactivee                                     -> intacte
 *   R4  P, demandee APRES l'entree (date dans le futur)   -> intacte
 *   R5  Q, active (quantite entree 0)                     -> intacte
 *   R6  Z, autre produit hors du bon                      -> intacte
 *   R7  saisie libre (sans produit)                       -> intacte
 * Par les ecrans : « Bon de livraison » > detail > « ENTREE EN STOCK » (questions de l'ecran), puis « Ventes ratées »,
 * filtre Produit + dates, « Rechercher » :
 *  - etat de R1 a l'ecran = « Commandé · BL <ref> » (info-bulle « Commandé à l'entrée en stock du BL <ref> »), les autres sans BL ; ecran = API = base ;
 *  - base : R1 commandee, date = cloture du BL, auteur = compte de test, BL = reference ; bilan avant / apres :
 *    seule R1 change, et seulement sur ces colonnes ;
 *  - stock : P avant + 2, Q inchange ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const BL = 'E2E-P13-BL', ORD = 'E2E-P13-ORD', DP = 'E2E-P13-BLDP', DQ = 'E2E-P13-BLDQ';
const REF = 'E2EP13' + String(Date.now()).slice(-6);
const MARQUE = 'ZZE2EP13';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const debut = q('SELECT NOW()');
const choisir = (offset, exclus) => q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE, f.int_CIP) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.bool_DECONDITIONNE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + (exclus.length ? " AND f.lg_FAMILLE_ID NOT IN ('" + exclus.join("','") + "')" : '')
  + ' ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET ' + offset).split('|');
const [P, G, STOCK_P] = choisir(7, []);
const [Q, , STOCK_Q] = choisir(9, [P]);
const [Z] = choisir(11, [P, Q]);
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
const R = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'].map((x) => 'E2E-P13-' + x);

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_p13_${t}; CREATE TABLE e2e_p13_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN ('${P}', '${Q}');`));
}
function remettre() {
  exec(`DELETE FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'E2E-P13-%';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN ('${P}', '${Q}') AND dt_CREATED >= '${debut}';`
    + `DELETE FROM HMvtProduit WHERE pkey IN ('${DP}', '${DQ}'); DELETE FROM MvtTransaction WHERE pkey = '${BL}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON LIKE 'E2EP13%'; DELETE FROM notification WHERE entity_ref = '${BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%E2EP13%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_p13_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_p13_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_p13_${t};`);
    });
  }
}
const stock = (f) => q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${f}' AND lg_EMPLACEMENT_ID = '1'`);
const registre = () => {
  const o = {};
  q("SELECT CONCAT_WS('|', lg_VENTE_RATEE_ID, bool_COMMANDE, IFNULL(dt_COMMANDE, '-'), IFNULL(lg_USER_COMMANDE_ID, '-'), IFNULL(str_REF_ENTREE, '-'),"
    + " str_STATUT, dt_CREATED, IFNULL(lg_FAMILLE_ID, '-'), int_QUANTITE) FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'E2E-P13-%'")
    .split('\n').filter(Boolean).forEach((l) => { const c = l.split('|'); o[c[0]] = { commande: c[1], dt: c[2], user: c[3], bl: c[4], statut: c[5], cree: c[6], famille: c[7], qte: c[8] }; });
  return o;
};

(async () => {
  remettre();
  ok('Précondition : trois produits distincts en stock au rayon, avec grossiste', !!P && !!Q && !!Z && new Set([P, Q, Z]).size === 3 && !!G, [P, Q, Z].join(' '));
  sauver();
  const vr = (id, famille, cip, design, statut, commande, cree) => `INSERT INTO t_vente_ratee (lg_VENTE_RATEE_ID, lg_FAMILLE_ID, str_CIP, str_DESIGNATION, str_DESIGNATION_NORM, int_QUANTITE,`
    + ' bool_COMMANDE, dt_COMMANDE, lg_USER_COMMANDE_ID, dt_CREATED, dt_UPDATED, lg_USER_ID, str_STATUT)'
    + ` VALUES ('${id}', ${famille ? "'" + famille + "'" : 'NULL'}, ${cip ? "'" + cip + "'" : 'NULL'}, '${design}', LOWER('${design}'), ${1 + R.indexOf(id)},`
    + ` ${commande ? 1 : 0}, ${commande ? "NOW() - INTERVAL 1 DAY" : 'NULL'}, ${commande ? "'" + ADMIN + "'" : 'NULL'}, ${cree}, ${cree}, '${ADMIN}', '${statut}');`;
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${ORD}', '${REF}', 2, '${G}', '${ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 2 * f.int_PAF, 0, 2 * f.int_PAF, '${ORD}', 'enable', NOW(), NOW(), '${ADMIN}' FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`
    + [[DP, P, 2, STOCK_P], [DQ, Q, 0, STOCK_Q]].map(([d, f, n, s]) => 'INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE,'
      + ' int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)'
      + ` SELECT '${d}', '${G}', f.lg_FAMILLE_ID, '${BL}', ${n}, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${s} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${f}';`).join('')
    + vr(R[0], P, null, MARQUE + ' R1 P', 'enable', false, 'NOW() - INTERVAL 2 HOUR')
    + vr(R[1], P, null, MARQUE + ' R2 P', 'enable', true, 'NOW() - INTERVAL 3 HOUR')
    + vr(R[2], P, null, MARQUE + ' R3 P', 'disable', false, 'NOW() - INTERVAL 2 HOUR')
    + vr(R[3], P, null, MARQUE + ' R4 P', 'enable', false, 'NOW() + INTERVAL 1 DAY')
    + vr(R[4], Q, null, MARQUE + ' R5 Q', 'enable', false, 'NOW() - INTERVAL 2 HOUR')
    + vr(R[5], Z, null, MARQUE + ' R6 Z', 'enable', false, 'NOW() - INTERVAL 2 HOUR')
    + vr(R[6], null, null, MARQUE + ' R7 libre', 'enable', false, 'NOW() - INTERVAL 2 HOUR'));
  const avant = registre();
  ok('Préparation : 7 demandes au registre, une seule (R1) candidate', Object.keys(avant).length === 7, JSON.stringify(avant).slice(0, 200));
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    /* ----- entree en stock du BL par l'ecran ----- */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, BL);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { Ext.getCmp('btn_enterstock').btnEl.dom.click(); });
    /* questions de l'ecran, dans l'ordre ou elles viennent : on entre, on n'imprime rien */
    const reponses = { 'UNITÉS GRATUITES': 'yes', "Confirmer l'entrée en stock": 'yes', 'impression des entrées': 'no', 'imprimer les étiquettes': 'no' };
    for (let i = 0; i < 20 && q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) !== 'is_Closed' || i < 3; i++) {
      const m = await p.waitForFunction(() => Ext.Msg.isVisible() && Ext.Msg.msg.getEl().dom.innerText, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => '');
      if (!m) { if (q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === 'is_Closed') { break; } continue; }
      const cle = Object.keys(reponses).find((k) => m.indexOf(k) >= 0);
      const bouton = cle ? reponses[cle] : 'ok';
      await p.evaluate((x) => { const bt = Ext.Msg.down('button[itemId=' + x + ']'); (bt && bt.isVisible() ? bt : Ext.Msg.down('button[itemId=ok]')).btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(400);
    }
    /* questions restantes apres la cloture (etiquettes, impression) : « Non » / « OK », comme l'utilisateur */
    for (let k = 0; k < 6; k++) {
      const m = await p.waitForFunction(() => Ext.Msg.isVisible() && Ext.Msg.msg.getEl().dom.innerText, null, { timeout: 3000 }).then((h) => h.jsonValue()).catch(() => '');
      if (!m) { break; }
      await p.evaluate(() => { const n = Ext.Msg.down('button[itemId=no]'); (n && n.isVisible() ? n : Ext.Msg.down('button[itemId=ok]')).btnEl.dom.click(); });
      await p.waitForTimeout(400);
    }
    await p.evaluate(() => Ext.ComponentQuery.query('window').forEach((w) => { if (w.isVisible() && !w.isXType('messagebox')) { w.close(); } }));
    const ferme = q(`SELECT CONCAT_WS('|', str_STATUT, dt_UPDATED) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`).split('|');
    ok('Entrée en stock par l\'écran : BL clôturé ; stock P avant + 2, Q inchangé (quantité 0)', ferme[0] === 'is_Closed' && Number(stock(P)) === Number(STOCK_P) + 2 && stock(Q) === STOCK_Q,
      JSON.stringify({ ferme, p: stock(P), avantP: STOCK_P, q: stock(Q), avantQ: STOCK_Q }));

    /* ----- base et bilan avant / apres ----- */
    const apres = registre();
    const r1 = apres[R[0]];
    ok('Base : R1 « Commandé », date = clôture du BL, auteur = compte de test, BL = ' + REF,
      r1 && r1.commande === '1' && r1.dt === ferme[1] && r1.user === ADMIN && r1.bl === REF, JSON.stringify(r1) + ' cloture ' + ferme[1]);
    const changees = R.filter((id) => JSON.stringify(avant[id]) !== JSON.stringify(apres[id]));
    const memeSaufMarquage = ['statut', 'cree', 'famille', 'qte'].every((k) => avant[R[0]][k] === r1[k]);
    ok('Bilan : seule R1 change (R2 déjà commandée, R3 désactivée, R4 postérieure, R5 quantité 0, R6 autre produit, R7 saisie libre intactes), et seulement sur le marquage',
      changees.length === 1 && changees[0] === R[0] && memeSaufMarquage, JSON.stringify(changees) + ' ' + JSON.stringify({ avant: avant[R[1]], apres: apres[R[1]] }));

    /* ----- ecran « Ventes ratées » ----- */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('ventesrateesmanager', 'Ventes ratées', ''));
    await p.waitForFunction(() => { const m = Ext.ComponentQuery.query('ventesrateesmanager')[0]; return m && m.down('#filtreProduit') && m.down('#filtreProduit').isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const hier = q("SELECT DATE_FORMAT(CURDATE() - INTERVAL 1 DAY, '%d/%m/%Y')"), demain = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 2 DAY, '%d/%m/%Y')");
    const champ = async (item, v) => {
      const id = await p.evaluate((x) => Ext.ComponentQuery.query('ventesrateesmanager #' + x)[0].inputEl.dom.id, item);
      await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.type(v, { delay: 15 }); await p.keyboard.press('Tab');
    };
    await champ('filtreDebut', hier);
    await champ('filtreFin', demain);
    await champ('filtreProduit', MARQUE);
    const [rep] = await Promise.all([p.waitForResponse((r) => /ventes-ratees\/recherche/.test(r.url()), { timeout: 30000 }),
      p.locator(await p.evaluate(() => '#' + Ext.ComponentQuery.query('ventesrateesmanager #btnRechercher')[0].id)).click()]);
    const api = await rep.json();
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventesrateesmanager #grilleRegistre')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ventesrateesmanager #grilleRegistre')[0], v = g.getView();
      const col = g.columns.find((c) => c.dataIndex === 'etat'), o = {};
      g.getStore().getRange().forEach((r, i) => { const n = v.getNode(i), td = n && n.querySelector('.x-grid-cell-' + col.id);
        o[r.get('id')] = { etat: td ? td.innerText.trim() : null, qtip: td ? (td.getAttribute('data-qtip') || '') : '', tronque: td ? td.firstChild.scrollWidth > td.firstChild.clientWidth + 1 : null }; });
      return o; });
    const apiLignes = {};
    (api.data || []).forEach((l) => { apiLignes[l.id] = l; });
    const attendu = (id) => apres[id].commande === '1' ? 'Commandé' + (apres[id].bl !== '-' ? ' · BL ' + apres[id].bl : '') : null;
    const visibles = R.filter((id) => id !== R[2]);
    const ecarts = visibles.filter((id) => !ecran[id] || !apiLignes[id] || (apiLignes[id].entreeBl || '-') !== (apres[id].bl === '-' ? '-' : apres[id].bl)
      || (attendu(id) ? ecran[id].etat !== attendu(id) : /· BL/.test(ecran[id].etat)));
    ok('Écran « Ventes ratées » = API = base, ligne par ligne : R1 « Commandé · BL ' + REF + ' », R2 « Commandé » sans BL, les autres sans BL',
      ecarts.length === 0, JSON.stringify(ecarts.map((id) => ({ id, ecran: ecran[id], api: apiLignes[id] && apiLignes[id].entreeBl, base: apres[id] }))));
    /* export CSV de la liste filtree (memes filtres que l'ecran) : etat et BL = ecran = base */
    const csv = await p.evaluate(async () => { const m = Ext.ComponentQuery.query('ventesrateesmanager')[0];
      return (await fetch('../api/v1/ventes-ratees/recherche/csv?' + Ext.Object.toQueryString(m.parametresRegistre()))).text(); });
    const lignesCsv = csv.replace(/^\ufeff/, '').split(/\r\n/).filter(Boolean).map((l) => l.split(';'));
    const ent = lignesCsv[0] || [], iEtat = ent.indexOf('État'), iBl = ent.indexOf('Entrée BL'), iDes = ent.indexOf('Produit / désignation');
    const csvR = {}; lignesCsv.slice(1).forEach((c) => { const m = /R\d/.exec(c[iDes] || ''); if (m) { csvR['E2E-P13-' + m[0]] = { etat: c[iEtat], bl: c[iBl] }; } });
    const ecartsCsv = visibles.filter((id) => !csvR[id] || csvR[id].etat !== (apres[id].commande === '1' ? 'Commandé' : 'Non commandé') || csvR[id].bl !== (apres[id].bl === '-' ? '' : apres[id].bl));
    ok('Export CSV (filtres de l\'écran) : colonnes « État » et « Entrée BL » = base, ligne par ligne ; R1 porte ' + REF, iBl > 0 && ecartsCsv.length === 0,
      JSON.stringify({ entetes: ent, ecarts: ecartsCsv.map((id) => ({ id, csv: csvR[id], base: apres[id] })) }));
    ok('Ergonomie : l\'état de R1 tient dans sa colonne, info-bulle avec le BL', ecran[R[0]] && ecran[R[0]].tronque === false && ecran[R[0]].qtip.indexOf(REF) >= 0, JSON.stringify(ecran[R[0]]));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Jeu d\'essai retiré, produits remis', q(`SELECT COUNT(*) FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'E2E-P13-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0' && stock(P) === STOCK_P && stock(Q) === STOCK_Q);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
