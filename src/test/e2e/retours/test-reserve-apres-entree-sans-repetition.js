/* FENETRE « SEUIL DE RESERVE ATTEINT » : UNIQUEMENT LE MOUVEMENT LIE A L'ENTREE (plan du 08/11, point 8).
 *
 * Retour : « j'ai encore vu des produits se repeter alors qu'on a dit qu'on affichait uniquement le mouvement lie a
 * l'entree ; j'ai du aller vider des suggestions de reserve avant de voir les produits une seule fois ».
 * Cause : la fenetre lisait les lignes de TOUTES les suggestions automatiques encore ouvertes pour les produits du bon.
 * Depuis « une suggestion par bon » (04/11), les suggestions des bons precedents restent ouvertes tant qu'on ne les
 * traite pas : un produit du bon qui n'atteint pas son seuil cette fois-ci y figurait encore, une fois par ancienne
 * suggestion.
 *
 * Jeu d'essai : un bon de deux produits.
 *  - P : gere en reserve, capacite maxi rayon = son stock : l'entree le fait deborder (rayon -> reserve, 2) ;
 *  - P2 : non gere en reserve, mais present dans DEUX anciennes suggestions automatiques ouvertes (une par sens).
 * Par l'ecran « Bon de livraison » : detail, ENTREE EN STOCK, reponses habituelles. Attendu dans la fenetre :
 *  - P une seule fois (rayon -> reserve, 2), dans la suggestion du bon ;
 *  - P2 absent : l'entree n'a declenche aucun mouvement pour lui ;
 *  - aucun produit deux fois ; toutes les lignes appartiennent a la suggestion du bon.
 * Les anciennes suggestions ne sont pas touchees (les lignes de P2 restent ouvertes).
 * Tout est retire ; produits, stocks et grossistes remis a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const X = 'E2E-RSR-';
const BL = X + 'BL', ORD = X + 'ORD', TSF = X + 'TSF';
const REF = 'E2ERSR' + String(Date.now()).slice(-6);
const debut = q('SELECT NOW()');
/* deux produits actifs du meme grossiste, stock rayon positif, sans reserve, sans ligne de suggestion */
const lignes = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2')"
  + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 3").split(/\r?\n/).map((l) => l.split('|'));
const [P, G, STOCK] = lignes[0] || [];
const [P2, , STOCK2] = lignes[1] || [];
const PRODUITS = [P, P2];
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
const liste = (ids) => ids.map((x) => `'${x}'`).join(', ');

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_rsr_${t}; CREATE TABLE e2e_rsr_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${liste(PRODUITS)});`));
}
function remettre() {
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID NOT IN (${liste(PRODUITS)}))`);
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE '${X}%'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '${X}%';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${liste(PRODUITS)}) AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`
    + `DELETE FROM HMvtProduit WHERE pkey LIKE '${X}BLD%'; DELETE FROM MvtTransaction WHERE pkey = '${BL}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'; DELETE FROM notification WHERE entity_ref = '${BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%';`
    + `DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID IN (${liste(PRODUITS)}) AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_rsr_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_rsr_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_rsr_${t};`);
    });
  }
}
function ancienne(id, categorie, jours, produit) {
  return `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, lg_EMPLACEMENT_ID, lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED, str_COMMENTAIRE)`
    + ` SELECT '${X}${id}', '${X}${id}', '${categorie}', 'AUTOMATIQUE', 'A_TRAITER', '1', u.lg_USER_ID, NOW() - INTERVAL ${jours} DAY, NOW() - INTERVAL ${jours} DAY, 'Entree en stock du BL E2E${id}' FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,`
    + ` int_STOCK_RAYON, int_STOCK_RESERVE, int_SEUIL_DECLENCHEUR, str_ETAT, dt_CREATED) VALUES ('${X}${id}D', '${X}${id}', '${produit}', 2, 2, 0, 3, 4, 3, 'PROPOSEE', NOW() - INTERVAL ${jours} DAY);`;
}

(async () => {
  remettre();
  ok('Précondition : deux produits du même grossiste en stock au rayon', !!P && !!P2 && !!G, PRODUITS.join(' / '));
  sauver();
  exec(`UPDATE t_famille SET lg_GROSSISTE_ID = '${G}' WHERE lg_FAMILLE_ID = '${P2}';`
    + `UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = ${STOCK}, int_SEUIL_MINI_RAYON = 1 WHERE lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT, int_NUMBER)`
    + ` VALUES ('${TSF}', '${P}', '2', '1', 'reserve', 'reserve', NOW(), 'enable', 0);`
    + `INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', 2, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 0, 0, 0, '${ORD}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + [[P, STOCK, 'BLD1', 2], [P2, STOCK2, 'BLD2', 3]].map(([id, st, det, qte]) =>
      `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
      + ` SELECT '${X}${det}', '${G}', f.lg_FAMILLE_ID, '${BL}', ${qte}, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${st} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${id}';`).join('')
    + `UPDATE t_bon_livraison b SET int_MHT = (SELECT SUM(d.int_QTE_CMDE * d.int_PAF) FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = '${BL}'), int_HTTC = int_MHT WHERE b.lg_BON_LIVRAISON_ID = '${BL}';`
    /* deux anciennes suggestions automatiques ouvertes (bons precedents), une par sens, contenant P2 */
    + ancienne('A1', 'RESERVE', 20, P2) + ancienne('A2', 'RAYON', 10, P2));
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, BL);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('int_NUMBER_ETIQUETTE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const repondre = async (motif, bouton) => {
      await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await p.evaluate((b) => { Ext.Msg.down('button[itemId=' + b + ']').btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(300);
    };
    await p.evaluate(() => { if (!Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) { Ext.getCmp('int_NUMBER_ETIQUETTE').setValue(1); } Ext.getCmp('btn_enterstock').btnEl.dom.click(); });
    await repondre('UNITÉS GRATUITES', 'yes');
    await repondre("Confirmer l'entrée en stock", 'yes');
    await repondre('impression des entrées', 'no');
    await repondre('imprimer les étiquettes', 'no');
    await p.waitForFunction(() => Ext.ComponentQuery.query('reserveapresentree').some((w) => w.isVisible()), null, { timeout: 30000 });
    const f = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reserveapresentree')[0];
      return { lignes: w.down('grid').getStore().getRange().map((r) => ({ produitId: r.get('produitId'), cip: r.get('cip'), categorie: r.get('categorie'), quantite: r.get('quantite'), suggestionId: r.get('suggestionId') })),
        suggestion: w.suggestionId }; });
    const cip = (id) => q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`);
    const de = (id) => f.lignes.filter((l) => l.produitId === id || l.cip === cip(id));
    ok('Entrée en stock faite (bon clôturé)', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === 'is_Closed');
    ok('P une seule fois : rayon → réserve, 2', de(P).length === 1 && de(P)[0].categorie === 'RESERVE' && de(P)[0].quantite === 2, JSON.stringify(de(P)));
    ok('P2 absent : l\'entrée n\'a déclenché aucun mouvement pour lui', de(P2).length === 0, JSON.stringify(de(P2)));
    const vus = f.lignes.map((l) => l.cip);
    ok('Aucun produit deux fois', new Set(vus).size === vus.length, JSON.stringify(vus));
    ok('Toutes les lignes appartiennent à la suggestion du bon', !!f.suggestion && f.lignes.every((l) => l.suggestionId === f.suggestion), JSON.stringify(f.lignes.map((l) => l.suggestionId)) + ' / ' + f.suggestion);
    ok('Les anciennes suggestions ne sont pas touchées (lignes de P2 encore ouvertes)',
      q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID IN ('${X}A1D', '${X}A2D') AND str_ETAT = 'PROPOSEE'`) === '2');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produits remis à l\'identique', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q(`SELECT CONCAT_WS('|', f.bool_RESERVE, s.int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${P}'`) === '0|' + STOCK
      && q(`SELECT s.int_NUMBER_AVAILABLE FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = '${P2}' AND s.lg_EMPLACEMENT_ID = '1'`) === STOCK2
      && q(`SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '${X}%'`) === '0'
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_NAME LIKE 'e2e_rsr%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
