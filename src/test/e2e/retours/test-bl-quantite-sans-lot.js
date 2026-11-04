/* BL SANS GESTION DES LOTS : « Suppression de lot » (supprimer la quantite ajoutee), retour du 04/11.
 * Constat : sur l'ecran de saisie d'un BL, sans gestion des lots, l'icone « Suppression de lot » puis la confirmation
 * repondait « erreur interne » : la requete des lignes d'entrepot (OrderServiceImpl.getWSByIdProduitAndRefBon)
 * numerotait ses parametres ?1 ?2 ?4, sans ?3, quand aucun numero de lot n'est donne (audit 06, 591fdd3de).
 * Attendu : la quantite ajoutee est retiree (lot et ligne d'entrepot de ce BL), sans message d'erreur ; le meme
 * produit sur un autre BL n'est pas touche.
 * Preparation (hors parcours) : commande, BL et quantite ajoutee poses en base, comme les cree la saisie. Parcours :
 * liste des BL, icone « Detail livraison », icone « Suppression de lot » de la ligne, confirmation dans le bouton.
 * Donnees d'essai retirees, parametre de gestion des lots remis.
 * Lancement seul : node src/test/e2e/retours/test-bl-quantite-sans-lot.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-QSL-';
const SUF = String(Date.now()).slice(-5);
const REF = 'E2EQSL' + SUF, AUTRE = 'E2EQSLB' + SUF;
const CLE = 'KEY_ACTIVATE_PEREMPTION_DATE';
const PARAM = q(`SELECT IFNULL(MAX(str_VALUE), '<absent>') FROM t_parameters WHERE str_KEY = '${CLE}'`);
const [P, G] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID) FROM t_famille f"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND f.int_PAF > 0 AND f.lg_GROSSISTE_ID IS NOT NULL"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 5").split('|');
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);

function remettre() {
  exec(`DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%' OR str_REF_LIVRAISON IN ('${REF}', '${AUTRE}');`
    + `DELETE FROM t_lot WHERE lg_LOT_ID LIKE '${M}%' OR str_REF_LIVRAISON IN ('${REF}', '${AUTRE}');`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE '${M}%'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '${M}%';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE '${M}%'; DELETE FROM t_order WHERE lg_ORDER_ID LIKE '${M}%';`);
  if (PARAM !== '<absent>') { exec(`UPDATE t_parameters SET str_VALUE = '${PARAM}' WHERE str_KEY = '${CLE}'`); }
}
/* commande, BL ouvert et une ligne (5 commandees), comme « Créer le bon de livraison » les pose */
function bon(x, ref) {
  const o = M + 'O' + x, b = M + 'BL' + x;
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${o}', '${o}', 1, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${b}', '${ref}', NOW(), 5 * f.int_PAF, 0, 5 * f.int_PAF, '${o}', 'enable', NOW(), NOW(), '${ADMIN}' FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${b}-D', '${G}', f.lg_FAMILLE_ID, '${b}', 5, 1, 5, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, 0 FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`);
}
/* quantite ajoutee sans gestion des lots : un lot sans numero et sa ligne d'entrepot, sur le BL ; l'unite gratuite
 * est portee ensuite sur la ligne du BL, comme le fait l'ajout (le declencheur de la table remet a 0 celle de l'insertion) */
function ajout(id, ref) {
  exec(`UPDATE t_bon_livraison_detail SET int_QTE_UG = 1 WHERE lg_BON_LIVRAISON_DETAIL = '${M}BL${id}-D'`);
  exec(`INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_REF_LIVRAISON, str_STATUT, dt_CREATED, dt_UPDATED, int_QTY_VENDUE)`
    + ` VALUES ('${M}${id}', '${ADMIN}', '${P}', '${G}', '', 5, 1, '${ref}', 'enable', NOW(), NOW(), 0);`
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_REF_LIVRAISON, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${M}${id}-W', '${ADMIN}', '${P}', '${G}', '', 5, 1, '${ref}', 'enable', NOW(), NOW());`);
}
const present = (id) => q(`SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID = '${M}${id}'`) + '/' + q(`SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID = '${M}${id}-W'`);

(async () => {
  remettre();
  ok('Précondition : un produit avec grossiste, paramètre de gestion des lots présent', !!P && !!G && PARAM !== '<absent>', P + ' ' + G + ' ' + PARAM);
  /* sans gestion des lots : c'est le chemin « supprimer la quantité ajoutée » */
  exec(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${CLE}'`);
  bon('A', REF); ajout('A', REF);
  bon('B', AUTRE); ajout('B', AUTRE);

  const b = await ENV_E2E.lancer(chromium);
  const err = [], alertes = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }

    /* liste des BL, « Detail livraison » du BL A */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await p.waitForFunction((x) => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().findExact('lg_BON_LIVRAISON_ID', x) >= 0, M + 'BLA', { timeout: 30000 });
    const i = await p.evaluate((x) => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().findExact('lg_BON_LIVRAISON_ID', x), M + 'BLA');
    await p.locator('.x-grid-row').filter({ visible: true }).nth(i).locator('img[data-qtip="Detail livraison"]').click();
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* icone « Suppression de lot » de la ligne, puis la confirmation dans le bouton */
    const icone = p.locator('#gridpanelID .x-grid-row').filter({ visible: true }).first().locator('img[data-qtip="Suppression de lot"]');
    ok('L\'icône « Suppression de lot » est visible sur la ligne qui a une quantité ajoutée', await icone.isVisible());
    const rep = p.waitForResponse((r) => r.url().includes('commande/remove-lots'), { timeout: 30000 });
    await icone.click();
    const confirmer = p.locator('.prestige-confirmer-icone').first();
    await confirmer.waitFor({ timeout: 10000 });
    await p.waitForTimeout(600);
    await confirmer.click();
    const statut = (await rep).status();
    await p.waitForTimeout(1500);
    const msg = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.innerText : ''));
    if (msg) { alertes.push(msg); }
    ok('Le serveur accepte la suppression (pas d\'« erreur interne »)', statut === 200, statut);
    ok('Aucun message d\'erreur à l\'écran', !/erreur|error|exception/i.test(msg), msg);
    ok('La quantité ajoutée est retirée de ce BL (lot et ligne d\'entrepôt)', present('A') === '0/0', present('A'));
    ok('Le même produit sur un autre BL n\'est pas touché', present('B') === '1/1', present('B'));
    ok('Ligne du BL : l\'unité gratuite retirée (reçue 5 → 4, UG 1 → 0)',
      q(`SELECT CONCAT(int_QTE_RECUE, '/', int_QTE_UG) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${M}BLA-D'`) === '4/0',
      q(`SELECT CONCAT(int_QTE_RECUE, '/', int_QTE_UG) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${M}BLA-D'`));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | ') + ' ' + alertes.join(' | '));
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, paramètre remis', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '${M}%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID LIKE '${M}%'`) === '0' && q(`SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%'`) === '0'
      && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE}'`) === PARAM);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
