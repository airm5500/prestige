/* SUPPRESSION D'UN LOT SUR UN BL : SEULEMENT CE BL (demandes serveur des applications mobiles, demande 16, D1).
 * Constat : PUT commande/remove-lots avec removeLot = true cherchait le lot par numero + produit SEULEMENT : le meme
 * numero de lot etait supprime sur TOUS les BL (y compris deja entres en stock) ; et les lignes d'entrepot (t_warehouse)
 * etaient cherchees en comparant le n° de BL au numero de lot : elles n'etaient jamais retirees.
 *  - removeLot = true : seul le lot de CE BL est retire, avec sa ligne d'entrepot ; le meme lot d'un autre BL reste ;
 *  - removeLot = false (ecran de saisie du BL) : les lots du produit sur ce BL, et rien sur l'autre BL ;
 *  - quantites UG et recue de la ligne de BL diminuees des seules unites gratuites retirees.
 * Donnees d'essai (lots, entrepot) retirees ; ligne de BL remise a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const [DET, REF, PROD, RECUE, UG] = q("SELECT CONCAT_WS('|', d.lg_BON_LIVRAISON_DETAIL, b.str_REF_LIVRAISON, d.lg_FAMILLE_ID, d.int_QTE_RECUE, d.int_QTE_UG) FROM t_bon_livraison_detail d"
  + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.str_REF_LIVRAISON NOT LIKE 'E2E%' ORDER BY d.dt_CREATED DESC LIMIT 1").split('|');
const AUTRE = 'E2E-BL-AUTRE';
function lot(id, ref, num, ug) {
  return `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_REF_LIVRAISON, str_STATUT, dt_CREATED, dt_UPDATED, int_QTY_VENDUE)`
    + ` VALUES ('${id}', '${ADMIN}', '${PROD}', '${num}', ${5 + ug}, ${ug}, '${ref}', 'enable', NOW(), NOW(), 0);`
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_REF_LIVRAISON, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${id}-w', '${ADMIN}', '${PROD}', '${num}', ${5 + ug}, ${ug}, '${ref}', 'enable', NOW(), NOW());`;
}
const nettoyer = () => exec("DELETE FROM t_lot WHERE lg_LOT_ID LIKE 'E2E-LOTD-%'; DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE 'E2E-LOTD-%';"
  + `UPDATE t_bon_livraison_detail SET int_QTE_RECUE = ${RECUE}, int_QTE_UG = ${UG} WHERE lg_BON_LIVRAISON_DETAIL = '${DET}'`);
const present = (id) => q(`SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID = '${id}'`) + '/' + q(`SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID = '${id}-w'`);
const ligne = () => q(`SELECT CONCAT(int_QTE_RECUE, '/', int_QTE_UG) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${DET}'`);

(async () => {
  nettoyer();
  exec(lot('E2E-LOTD-1', REF, 'E2ELOTX', 2) + lot('E2E-LOTD-2', AUTRE, 'E2ELOTX', 1) + lot('E2E-LOTD-3', REF, 'E2ELOTY', 0)
    + `UPDATE t_bon_livraison_detail SET int_QTE_RECUE = 20, int_QTE_UG = 3 WHERE lg_BON_LIVRAISON_DETAIL = '${DET}'`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext()).newPage();
  const api = (corps) => p.evaluate(async (c) => { const r = await fetch('../api/v1/commande/remove-lots', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    return r.status; }, corps);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    const r1 = await api({ idBonDetail: DET, idProduit: PROD, refBon: REF, numLot: 'E2ELOTX', removeLot: true });
    ok('Lot E2ELOTX retiré de CE BL, avec sa ligne d\'entrepôt', r1 === 200 && present('E2E-LOTD-1') === '0/0', r1 + ' ' + present('E2E-LOTD-1'));
    ok('Le même lot sur un AUTRE BL n\'est pas touché (lot et entrepôt)', present('E2E-LOTD-2') === '1/1', present('E2E-LOTD-2'));
    ok('L\'autre lot de ce BL (E2ELOTY) reste', present('E2E-LOTD-3') === '1/1', present('E2E-LOTD-3'));
    ok('Ligne du BL : reçue et UG diminuées des 2 UG retirées (20/3 → 18/1)', ligne() === '18/1', ligne());
    const r2 = await api({ idBonDetail: DET, idProduit: PROD, refBon: REF, removeLot: false });
    ok('Écran de saisie du BL (removeLot = false) : lots du produit sur ce BL retirés, l\'autre BL intact', r2 === 200 && present('E2E-LOTD-3') === '0/0' && present('E2E-LOTD-2') === '1/1',
      present('E2E-LOTD-3') + ' ' + present('E2E-LOTD-2'));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, ligne de BL remise', q("SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID LIKE 'E2E-LOTD-%'") === '0' && ligne() === RECUE + '/' + UG);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
