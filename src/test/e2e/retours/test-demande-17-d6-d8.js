/* DEMANDE 17 DES APPLICATIONS MOBILES, D6 ET D8 (reception BL et retour fournisseur).
 *
 *  - D6 : commande/creerbl sans montant HT ni TVA : accepte, BL a 0 (avant : erreur) ; reference absente ou de plus
 *         de 20 caracteres, date illisible : refus lisible, aucun BL cree.
 *  - D8 : deux BL de meme numero chez deux grossistes. retourfournisseur/new avec blId vise ce BL ; avec le couple
 *         (numero, lgGROSSISTEID) aussi ; le numero seul garde l'ancien comportement (le plus recent). Une ligne
 *         ajoutee ensuite (add-item) vient du BL du retour, pas de l'homonyme.
 * Commandes, BL, retours et stock d'essai poses en base puis retires.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const M = 'E2E-D68-', REF = 'E2E-D8-HOMONYME', NOTE = 'E2E-D8-RETOUR';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const [G1, G2] = q("SELECT GROUP_CONCAT(x.id SEPARATOR '|') FROM (SELECT lg_GROSSISTE_ID id FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 2) x").split('|');
const PRODUIT = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 23");
const MOTIF = q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1");
const STOCK0 = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`).split('|');

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`);
  q(`DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids}); DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + ` DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID LIKE '${M}%');`
    + ` DELETE FROM t_bon_livraison WHERE lg_ORDER_ID LIKE '${M}%'; DELETE FROM t_order WHERE lg_ORDER_ID LIKE '${M}%';`
    + ` UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
}
const commande = (id, g) => q(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
  + ` VALUES ('${id}', '${id}', 0, '${g}', '${ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0)`);
const bl = (n, g, age) => {
  commande(M + 'C' + n, g);
  q(`INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)`
    + ` VALUES ('${M}B${n}', '${REF}', CURDATE(), 1000, 0, 1000, '${M}C${n}', 'is_Closed', NOW() - INTERVAL ${age} HOUR, NOW(), '${ADMIN}', 0);`
    + ` INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PAF, int_PRIX_VENTE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)`
    + ` SELECT '${M}D${n}', '${g}', '${PRODUIT}', '${M}B${n}', 10, 0, 10, 1000, 1500, 1000, 'is_Closed', NOW(), NOW(), 0, 0, 0, f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.lg_FAMILLE_ID = '${PRODUIT}'`);
};

(async () => {
  retirer();
  bl(1, G1, 5); /* le plus ancien, grossiste 1 */
  bl(2, G2, 1); /* le plus recent, grossiste 2, meme numero */
  commande(M + 'C3', G1);
  q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c]);
  const blsC3 = () => q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${M}C3'`);
  try {
    await connexion(p, 'admin', 'e2etest');
    /* D6 */
    const sansRef = await api('POST', '../api/v1/commande/creerbl', { refParent: M + 'C3', ref: '  ', dtStart: '2026-10-19' });
    ok('D6 : référence absente : refus lisible, aucun BL', sansRef.j && sansRef.j.success === false && /référence/i.test(sansRef.j.msg || '') && blsC3() === '0', JSON.stringify(sansRef));
    const longue = await api('POST', '../api/v1/commande/creerbl', { refParent: M + 'C3', ref: 'E2E-D6-REFERENCE-TROP-LONGUE', dtStart: '2026-10-19' });
    ok('D6 : référence de plus de 20 caractères : refus lisible, aucun BL', longue.j && longue.j.success === false && /20 caractères/.test(longue.j.msg || '') && blsC3() === '0', JSON.stringify(longue));
    const date = await api('POST', '../api/v1/commande/creerbl', { refParent: M + 'C3', ref: 'E2E-D6-DATE', dtStart: 'pas-une-date' });
    ok('D6 : date illisible : refus lisible, aucun BL', date.j && date.j.success === false && /date/i.test(date.j.msg || '') && blsC3() === '0', JSON.stringify(date));
    const sansMontant = await api('POST', '../api/v1/commande/creerbl', { refParent: M + 'C3', ref: 'E2E-D6-OK', dtStart: '2026-10-19' });
    ok('D6 : sans montant HT ni TVA : BL créé à 0', sansMontant.j && sansMontant.j.success === true
      && q(`SELECT CONCAT(int_MHT, '|', int_TVA) FROM t_bon_livraison WHERE lg_ORDER_ID = '${M}C3'`) === '0|0', JSON.stringify(sansMontant));

    /* D8 */
    const nouveau = (extra) => api('POST', '../api/v1/retourfournisseur/new', Object.assign({ lgBONLIVRAISONID: REF, strCOMMENTAIRE: NOTE,
      items: [{ produitId: PRODUIT, lgMOTIFRETOUR: MOTIF, intNUMBERRETURN: 1 }] }, extra));
    const blDe = (r) => r.j && r.j.data ? q(`SELECT CONCAT(r.lg_BON_LIVRAISON_ID, '|', d.bonLivraisonDetail_id) FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE r.lg_RETOUR_FRS_ID = '${r.j.data.lgRETOURFRSID}' LIMIT 1`) : '';
    const r1 = await nouveau({ blId: M + 'B1' });
    ok('D8 : blId → le retour vise ce BL (le plus ancien, grossiste 1)', blDe(r1) === M + 'B1|' + M + 'D1', blDe(r1) + ' ' + JSON.stringify(r1.j).slice(0, 120));
    const r2 = await nouveau({ lgGROSSISTEID: G1 });
    ok('D8 : numéro + grossiste → le BL de ce grossiste', blDe(r2) === M + 'B1|' + M + 'D1', blDe(r2));
    const inconnu = await nouveau({ lgBONLIVRAISONID: 'E2E-D8-INCONNU' });
    ok('D8 : numéro de BL inconnu : même refus qu\'avant (« pas sur le BL »), pas d\'erreur 500', inconnu.status === 200 && inconnu.j
      && inconnu.j.success === false && /pas sur le BL n° E2E-D8-INCONNU/.test(inconnu.j.msg || ''), JSON.stringify(inconnu));
    const r3 = await nouveau({});
    ok('D8 : numéro seul → comme avant, le BL le plus récent', blDe(r3) === M + 'B2|' + M + 'D2', blDe(r3));
    const ajout = await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: r1.j && r1.j.data && r1.j.data.lgRETOURFRSID,
      produitId: PRODUIT, lgMOTIFRETOUR: q(`SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1 OFFSET 1`), intNUMBERRETURN: 1 });
    const lignes = r1.j && r1.j.data ? q(`SELECT GROUP_CONCAT(DISTINCT bonLivraisonDetail_id) FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${r1.j.data.lgRETOURFRSID}'`) : '';
    ok('D8 : ligne ajoutée ensuite : prise sur le BL du retour, pas sur l\'homonyme', ajout.j && ajout.j.success === true && lignes === M + 'D1', lignes + ' ' + JSON.stringify(ajout.j).slice(0, 120));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Jeu d\'essai retiré, stock remis', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE '${M}%'`) === '0'
      && q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`) === STOCK0.join('|'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
