/* DEMANDE 59 : CLOTURE « ENTRER LE REÇU » D'UN BL, ECARTS ET RETOUR DES MANQUANTS SANS SORTIE DE STOCK.
 *
 * Jeu d'essai : un BL de 4 lignes (quantites differentes) et un BL de 2 lignes sans aucun lot.
 *   D1 : commande 10, deux lots (3 + 4)          -> recu 7, manquant 3
 *   D2 : commande 4, un lot de 4                  -> recu 4, complet
 *   D3 : commande 5, un lot de 3 + 1 UG          -> recu 4 (UG comprises, plafond 5 + 1), manquant 1
 *   D4 : commande 6, aucun lot                    -> recu 0, manquant 6, rien n'entre
 * Les lots sont saisis par la route de saisie des lots (celle de l'ecran et de l'application mobile) ; la cloture au
 * reçu est la route de l'application mobile (PUT validerbl?mode=RECU). Les ecarts sont lus a l'ecran « Etat de
 * contrôle Achats » ; le retour des manquants est valide a l'ecran « Retour fournisseur ».
 *
 *  - Non-regression : sans parametre, « Produits non saisis » ; avecEcart=true, refus ; rien n'entre.
 *  - Ecarts provisoires avant la cloture (calcules sur les lots), identiques a ceux de la cloture.
 *  - Sans P_ENTREE_EN_STOCK : 403, rien n'entre. BL sans aucun lot : AUCUN_RECU, rien n'entre.
 *  - Cloture au reçu avec X-Client-Ref ; rejeu de la meme cle : meme reponse, rien de plus ; seconde cloture refusee.
 *  - Bilan avant / apres : stock (avant + reçu), un mouvement par ligne entree, aucun pour la ligne sans lot, lots,
 *    quantites de la ligne (reçu, manquant, UG), total du BL, une transaction, le journal « entré avec écart ».
 *  - Rapprochement ligne par ligne : reponse de la cloture = route des ecarts = cellule de l'etat de controle = base.
 *  - Retour des manquants : en attente, sans sortie de stock, une ligne par manquant ; second appel : le meme retour ;
 *    visible dans la liste ; valide a l'ecran (confirmation dans le bouton) : stock et mouvements inchanges.
 * Tout est retire : BL, commandes, lots, entrepot, etiquettes, mouvements, transactions, notifications, journal,
 * retour et son historique, cles mobiles ; produits remis a l'identique (fiche, stock, grossiste) ; droit remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-D59-';
const B1 = M + 'B1', B2 = M + 'B2', C1 = M + 'C1', C2 = M + 'C2';
const REF1 = 'E2ED59A' + String(Date.now()).slice(-5), REF2 = 'E2ED59B' + String(Date.now()).slice(-5);
const CLE = 'e2e-d59-' + Date.now();
const debut = q('SELECT NOW()');
const droitEntree = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_ENTREE_EN_STOCK');
/* peremption obligatoire : valeur du poste (0 en general), remise a la fin */
const PEREMPTION0 = q("SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = 'KEY_ACTIVATE_PEREMPTION_DATE'");
const peremptionObligatoire = (v) => exec(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = 'KEY_ACTIVATE_PEREMPTION_DATE'`);
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
/* 4 produits au rayon, une seule ligne de stock, hors reserve, sans avoir en attente (aucun SMS ne part) */
const P = q("SELECT GROUP_CONCAT(x.id ORDER BY x.id SEPARATOR '|') FROM (SELECT f.lg_FAMILLE_ID id FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.bool_RESERVE, 0) = 0"
  + " AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 2 AND 200"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail a WHERE a.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND a.b_IS_AVOIR = 1"
  + "   AND a.str_STATUT = 'is_Closed' AND a.int_QUANTITY <> a.int_QUANTITY_SERVED AND a.int_QUANTITY > 0)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 4 OFFSET 21) x").split('|');
const NOM = P.map((id) => q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`));
/* lignes du BL : commande, UG prevues, lots [quantite, UG], attendu */
const LIGNES = [
  { cmde: 10, lots: [[3, 0], [4, 0]], recu: 7, manquant: 3, ug: 0 },
  { cmde: 4, lots: [[4, 0]], recu: 4, manquant: 0, ug: 0 },
  { cmde: 5, lots: [[3, 1]], recu: 4, manquant: 1, ug: 1 },
  { cmde: 6, lots: [], recu: 0, manquant: 6, ug: 0 }
];
const TOTAL_MANQUANT = LIGNES.reduce((s, l) => s + l.manquant, 0);
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
const liste = (a) => a.map((x) => "'" + x + "'").join(',');
const stock = (id) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1'`));
const mvts = (id) => Number(q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '${id}'`));
const statutBl = (id) => q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${id}'`);
const retoursDuBl = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE lg_BON_LIVRAISON_ID IN ('${B1}', '${B2}')`);

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_d59_${t}; CREATE TABLE e2e_d59_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${liste(P)});`));
}
function retirer() {
  const ret = retoursDuBl();
  const refs = q(`SELECT IFNULL(GROUP_CONCAT(str_REF_RETOUR_FRS SEPARATOR '|'), '') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ret})`).split('|').filter(Boolean);
  /* codes lus d'abord : une sous-requete dans le DELETE serait rejouee pour chaque etiquette */
  const etiquettes = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", str_CODE_ETIQUETTE, "'")), "''") FROM t_warehouse WHERE str_REF_LIVRAISON IN ('${REF1}', '${REF2}') AND str_CODE_ETIQUETTE IS NOT NULL`);
  const dets = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_DETAIL, "'")), "''") FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN ('${B1}', '${B2}')`);
  exec(`DELETE FROM mobile_client_ref WHERE ref LIKE 'e2e-d59-%';`
    + (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_retour_fournisseur_historique'") === '1' ? `DELETE FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID IN (${ret});` : '')
    + `DELETE FROM notification WHERE entity_ref IN (${ret}) OR entity_ref IN ('${B1}', '${B2}');`
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ret});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ret});`
    + `DELETE FROM HMvtProduit WHERE pkey IN (${dets}); DELETE FROM MvtTransaction WHERE pkey IN ('${B1}', '${B2}');`
    + `DELETE FROM t_etiquette WHERE str_CODE IN (${etiquettes}) AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON IN ('${REF1}', '${REF2}');`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON IN ('${REF1}', '${REF2}');`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (str_TYPE_LOG IN ('${REF1}', '${REF2}') OR str_DESCRIPTION LIKE '%${REF1}%' OR str_DESCRIPTION LIKE '%${REF2}%'`
    + refs.map((r) => ` OR str_DESCRIPTION LIKE '%${r}%' OR str_TYPE_LOG = '${r}'`).join('') + ');'
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN ('${B1}', '${B2}');`
    + `DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN ('${B1}', '${B2}');`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID IN ('${C1}', '${C2}'); DELETE FROM t_order WHERE lg_ORDER_ID IN ('${C1}', '${C2}');`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_d59_t_famille'") === '1') {
    /* mise a jour depuis la copie (une suppression bute sur les cles etrangeres) */
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_d59_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_d59_${t};`);
    });
  }
}
function poser() {
  const bl = (b, c, ref, lignes) => `INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
    VALUES ('${c}', '${c}', ${lignes.length}, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);
    INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)
    VALUES ('${b}', '${ref}', CURDATE(), 50000, 0, 50000, '${c}', 'enable', NOW(), NOW(), '${ADMIN}', 0);`
    + lignes.map(([d, id, cmde]) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE,
      int_PAF, int_PRIX_VENTE, int_PRIX_REFERENCE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)
      SELECT '${d}', '${G}', f.lg_FAMILLE_ID, '${b}', ${cmde}, 0, 0, f.int_PAF, f.int_PRICE, f.int_PRICE, f.int_PAF, 'enable', NOW(), NOW(), ${cmde}, 0, 0, f.lg_ZONE_GEO_ID
      FROM t_famille f WHERE f.lg_FAMILLE_ID = '${id}';`).join('');
  exec(bl(B1, C1, REF1, LIGNES.map((l, i) => [M + 'D' + (i + 1), P[i], l.cmde]))
    + bl(B2, C2, REF2, [[M + 'E1', P[0], 2], [M + 'E2', P[1], 3]]));
}

(async () => {
  droitEntree.remettre();
  retirer();
  ok('Précondition : 4 produits au rayon, hors réserve, sans avoir en attente', P.length === 4 && P.every(Boolean) && !!G, P.join(' '));
  sauver();
  try { poser(); } catch (e) { retirer(); throw e; }
  const STOCK0 = P.map(stock), MVT0 = P.map(mvts);
  const peremption = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 2 YEAR, '%Y-%m-%d')");
  const b = await ENV_E2E.lancer(chromium);
  const err = [], dialogues = [];
  let p;
  const ouvrir = async () => {
    if (p) { await p.context().close(); }
    p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
  };
  const api = (m, u, c, cle) => p.evaluate(async ([m, u, c, cle]) => { const h = { 'Content-Type': 'application/json' }; if (cle) { h['X-Client-Ref'] = cle; }
    const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : JSON.stringify(c) });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c, cle]);
  /* compare des ecarts (reponse ou route) aux lignes attendues, ligne par ligne */
  const attendus = LIGNES.map((l, i) => ({ detailId: M + 'D' + (i + 1), nom: NOM[i], ...l })).filter((l) => l.manquant > 0);
  const memesEcarts = (ecarts) => Array.isArray(ecarts) && ecarts.length === attendus.length && attendus.every((a) => {
    const e = ecarts.find((x) => x.detailId === a.detailId);
    return e && e.commande === a.cmde && e.recu === a.recu && e.manquant === a.manquant && e.nom === a.nom;
  });
  try {
    await ouvrir();
    /* saisie des lots */
    let lotsOk = true, n = 0;
    for (let i = 0; i < LIGNES.length; i++) {
      for (const [qty, ug] of LIGNES[i].lots) {
        const r = await api('POST', '../api/v1/commande/add-lot', { idBonDetail: M + 'D' + (i + 1), qty, freeQty: ug, numLot: 'E2ED59L' + (++n), datePeremption: peremption });
        lotsOk = lotsOk && r.status === 200 && r.j && r.j.success === true;
      }
    }
    ok('Lots saisis (4 lots sur 3 lignes, une ligne sans lot)', lotsOk && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF1}'`) === '4');

    /* non-regression */
    const v0 = await api('PUT', '../api/v1/commande/validerbl/' + B1);
    /* comportement d'origine : seules les lignes commencees et incompletes sont nommees (une ligne sans lot entrerait
       en entier) */
    ok('Sans paramètre : refus « Produits non saisis » qui nomme les lignes incomplètes, comme avant', v0.j && v0.j.success === false
      && v0.j.code === 'PRODUITS_NON_SAISIS' && v0.j.msg.includes(NOM[0]) && v0.j.msg.includes(NOM[2]) && !v0.j.msg.includes(NOM[1]) && !v0.j.msg.includes(NOM[3]), JSON.stringify(v0.j));
    const v1 = await api('PUT', '../api/v1/commande/validerbl/' + B1 + '?avecEcart=true');
    ok('avecEcart=true : refus, comme avant', v1.j && v1.j.success === false, JSON.stringify(v1.j));
    ok('Rien n\'est entré (BL ouvert, stocks et mouvements inchangés)', statutBl(B1) === 'enable' && P.every((id, i) => stock(id) === STOCK0[i] && mvts(id) === MVT0[i]));

    /* ecarts provisoires */
    const e0 = await api('GET', '../api/v1/reception/' + B1 + '/ecarts');
    ok('Écarts provisoires avant la clôture : mêmes lignes et quantités que la clôture', e0.status === 200 && e0.j && e0.j.provisoire === true
      && memesEcarts(e0.j.ecarts) && e0.j.totalManquant === TOTAL_MANQUANT && e0.j.retourManquants == null, JSON.stringify(e0.j));
    const par = await api('GET', '../api/v1/reception/parametres');
    ok('Paramètres de réception : clotureRecu et retourManquants annoncés', par.j && JSON.stringify(par.j).includes('"clotureRecu":true') && JSON.stringify(par.j).includes('"retourManquants":true'), JSON.stringify(par.j).slice(0, 200));

    /* sans le droit d'entree en stock */
    droitEntree.retirer();
    await ouvrir();
    const v2 = await api('PUT', '../api/v1/commande/validerbl/' + B1 + '?mode=RECU', undefined, CLE + '-sansdroit');
    ok('Sans P_ENTREE_EN_STOCK : 403 interdit, rien n\'entre', v2.status === 403 && v2.j && v2.j.interdit === true && statutBl(B1) === 'enable' && P.every((id, i) => stock(id) === STOCK0[i]), JSON.stringify(v2));
    droitEntree.remettre();
    await ouvrir();

    /* BL sans aucun lot */
    const v3 = await api('PUT', '../api/v1/commande/validerbl/' + B2 + '?mode=RECU', undefined, CLE + '-vide');
    ok('BL sans aucun lot : refus AUCUN_RECU, BL ouvert', v3.j && v3.j.success === false && v3.j.code === 'AUCUN_RECU' && statutBl(B2) === 'enable', JSON.stringify(v3.j));

    /* peremption obligatoire (parametre a 1, produits controles) : un lot saisi sans date refuse la cloture au recu ;
       la ligne sans lot n'a rien a controler. Le parametre a 0 (valeur du poste) : aucun controle, cas de la cloture
       des versions precedentes de ce test. */
    peremptionObligatoire('1');
    exec(`UPDATE t_famille SET bool_CHECKEXPIRATIONDATE = 1 WHERE lg_FAMILLE_ID IN (${liste(P)})`);
    /* lot du grossiste du BL, comme ceux saisis a l'ecran : la cloture ne compte que les lots de ce grossiste (audit 06, EN-02) */
    exec("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock, str_REF_LIVRAISON, int_NUMBER_GRATUIT, lg_GROSSISTE_ID)"
      + ` VALUES ('${M}LND', '${ADMIN}', '${P[1]}', 'E2ED59ND', 1, NOW(), NOW(), NULL, 'enable', 1, '${REF1}', 0, '${G}')`);
    const vp = await api('PUT', '../api/v1/commande/validerbl/' + B1 + '?mode=RECU', undefined, CLE + '-peremption');
    ok('Péremption obligatoire (paramètre à 1) : un lot sans date refuse la clôture au reçu, rien n\'entre', vp.j && vp.j.success === false && /péremption/i.test(vp.j.msg || '')
      && statutBl(B1) === 'enable' && P.every((id, i) => stock(id) === STOCK0[i] && mvts(id) === MVT0[i]), JSON.stringify(vp.j));
    exec(`DELETE FROM t_lot WHERE lg_LOT_ID = '${M}LND'`);

    /* cloture au recu, peremption obligatoire : lots dates, ligne sans lot acceptee */
    const v4 = await api('PUT', '../api/v1/commande/validerbl/' + B1 + '?mode=RECU', undefined, CLE + '-cloture');
    ok('Clôture au reçu (péremption obligatoire, lots datés, une ligne sans lot) : succès, mode RECU, écarts ligne par ligne, total manquant', v4.status === 200 && v4.j && v4.j.success === true && v4.j.mode === 'RECU'
      && memesEcarts(v4.j.ecarts) && v4.j.totalManquant === TOTAL_MANQUANT, JSON.stringify(v4.j));
    peremptionObligatoire(PEREMPTION0);
    const STOCK1 = P.map(stock), MVT1 = P.map(mvts);
    const v5 = await api('PUT', '../api/v1/commande/validerbl/' + B1 + '?mode=RECU', undefined, CLE + '-cloture');
    ok('Rejeu de la même clé : même réponse, rien de plus en stock', JSON.stringify(v5.j) === JSON.stringify(v4.j) && P.every((id, i) => stock(id) === STOCK1[i] && mvts(id) === MVT1[i]), JSON.stringify(v5.j).slice(0, 200));
    const v6 = await api('PUT', '../api/v1/commande/validerbl/' + B1 + '?mode=RECU', undefined, CLE + '-cloture2');
    ok('Seconde clôture (autre clé) : refusée, rien de plus en stock', v6.j && v6.j.success === false && P.every((id, i) => stock(id) === STOCK1[i] && mvts(id) === MVT1[i]), JSON.stringify(v6.j));

    /* bilan avant / apres */
    const bilan = LIGNES.map((l, i) => ({ attendu: STOCK0[i] + l.recu, stock: STOCK1[i], mvt: MVT1[i] - MVT0[i],
      qteMvt: q(`SELECT IFNULL(GROUP_CONCAT(qteMvt), '') FROM HMvtProduit WHERE pkey = '${M}D${i + 1}'`),
      ligne: q(`SELECT CONCAT_WS('|', int_QTE_RECUE, int_QTE_MANQUANT, int_QTE_UG, str_STATUT) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${M}D${i + 1}'`) }));
    ok('Stock : avant + reçu sur chaque ligne (UG comprises), rien pour la ligne sans lot', bilan.every((x) => x.stock === x.attendu), JSON.stringify(bilan.map((x) => x.attendu + '/' + x.stock)));
    ok('Mouvements : un par ligne entrée, de la quantité reçue ; aucun pour la ligne sans lot', bilan.every((x, i) => LIGNES[i].recu
      ? x.mvt === 1 && x.qteMvt === String(LIGNES[i].recu) : x.mvt === 0 && x.qteMvt === ''), JSON.stringify(bilan.map((x) => x.mvt + ':' + x.qteMvt)));
    ok('Lignes du BL : reçu, manquant, UG écrits ; toutes closes', bilan.every((x, i) => x.ligne === [LIGNES[i].recu, LIGNES[i].manquant, LIGNES[i].ug, 'is_Closed'].join('|')), JSON.stringify(bilan.map((x) => x.ligne)));
    ok('Lots : 4, aucun lot créé pour la ligne sans lot', q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF1}'`) === '4'
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF1}' AND lg_FAMILLE_ID = '${P[3]}'`) === '0');
    ok('BL clos, total manquant du BL, une transaction', statutBl(B1) === 'is_Closed' && q(`SELECT int_MANQUANT_RECEPTION FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${B1}'`) === String(TOTAL_MANQUANT)
      && q(`SELECT COUNT(*) FROM MvtTransaction WHERE pkey = '${B1}'`) === '1');
    const journal = q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE 'BL ${REF1} entré avec écart : ${attendus.length} ligne(s), ${TOTAL_MANQUANT} boîte(s) manquante(s), par %'`);
    ok('Journal : une ligne « BL … entré avec écart : 3 ligne(s), 10 boîte(s) manquante(s) »', journal === '1', journal);
    ok('BL sans lot et BL refusé : aucune trace', statutBl(B2) === 'enable' && q(`SELECT COUNT(*) FROM MvtTransaction WHERE pkey = '${B2}'`) === '0');

    /* rapprochement : route des ecarts = reponse = base */
    const e1 = await api('GET', '../api/v1/reception/' + B1 + '/ecarts');
    const base = q(`SELECT GROUP_CONCAT(CONCAT_WS(':', lg_BON_LIVRAISON_DETAIL, int_QTE_CMDE, int_QTE_RECUE, int_QTE_MANQUANT) ORDER BY lg_BON_LIVRAISON_DETAIL) FROM t_bon_livraison_detail
      WHERE lg_BON_LIVRAISON_ID = '${B1}' AND int_QTE_RECUE < int_QTE_CMDE`);
    const route = e1.j && (e1.j.ecarts || []).slice().sort((a, x) => a.detailId.localeCompare(x.detailId)).map((e) => [e.detailId, e.commande, e.recu, e.manquant].join(':')).join(',');
    ok('Route des écarts après clôture = réponse de la clôture = base, ligne par ligne', e1.j && e1.j.mode === 'RECU' && e1.j.provisoire === false && memesEcarts(e1.j.ecarts)
      && e1.j.totalManquant === TOTAL_MANQUANT && route === base, route + ' / ' + base);

    /* etat de controle des achats, a l'ecran */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.waitForFunction(() => Ext.ComponentQuery.query('etatscontrolemanager').some((g) => g.isVisible(true)) && Ext.getCmp('rechecher'), null, { timeout: 60000 });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().isLoading(), null, { timeout: 60000 });
    await saisir(p, '#rechecher', REF1);
    await cliquer(p, 'etatscontrolemanager button[text=Rechercher]');
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lgBONLIVRAISONID', bl) >= 0; }, B1, { timeout: 60000 });
    await p.waitForTimeout(500);
    const cel = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0], r = g.getStore().getAt(g.getStore().findExact('lgBONLIVRAISONID', bl));
      const s = g.getView().getNode(r).querySelector('.bl-manquants'); const t = s && (s.closest('[data-qtip]') || s);
      return { texte: s ? s.textContent.replace(/\s+/g, ' ').trim() : '', infobulle: t ? (t.getAttribute('data-qtip') || '') : '' }; }, B1);
    const detail = attendus.every((a) => cel.infobulle.includes(a.nom + ' : ' + a.manquant));
    ok('État de contrôle à l\'écran : « 10 boîtes · 3 lignes », détail par produit = base', cel.texte.includes(TOTAL_MANQUANT + ' boîtes') && cel.texte.includes(attendus.length + ' lignes') && detail, JSON.stringify(cel));

    /* retour des manquants */
    const r1 = await api('POST', '../api/v1/reception/' + B1 + '/retour-manquants', {}, CLE + '-retour');
    const retourId = r1.j && r1.j.retourId;
    ok('Retour des manquants : créé en attente, 3 lignes, 10 boîtes', r1.j && r1.j.success === true && r1.j.deja === false && r1.j.lignes === attendus.length
      && r1.j.totalManquant === TOTAL_MANQUANT && r1.j.statut === 'is_Waiting', JSON.stringify(r1.j));
    const rb = q(`SELECT CONCAT_WS('|', str_STATUT, bool_SANS_SORTIE_STOCK, IF(dt_ATTENTE IS NULL, '-', 'date'), lg_USER_ATTENTE = '${ADMIN}') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`);
    const rd = q(`SELECT GROUP_CONCAT(CONCAT_WS(':', d.lg_FAMILLE_ID, d.int_NUMBER_RETURN, m.str_LIBELLE) ORDER BY d.lg_FAMILLE_ID) FROM t_retour_fournisseur_detail d
      JOIN t_motif_retour m ON m.lg_MOTIF_RETOUR = d.lg_MOTIF_RETOUR WHERE d.lg_RETOUR_FRS_ID = '${retourId}'`);
    const rdAttendu = LIGNES.map((l, i) => ({ id: P[i], m: l.manquant })).filter((x) => x.m > 0).sort((a, x) => a.id.localeCompare(x.id)).map((x) => x.id + ':' + x.m + ':Manquant').join(',');
    ok('Base : retour en attente, sans sortie de stock, une ligne par manquant (motif « Manquant »)', rb === 'is_Waiting|1|date|1' && rd === rdAttendu, rb + ' / ' + rd + ' / ' + rdAttendu);
    const r2 = await api('POST', '../api/v1/reception/' + B1 + '/retour-manquants', {}, CLE + '-retour2');
    const r3 = await api('POST', '../api/v1/reception/' + B1 + '/retour-manquants', {}, CLE + '-retour');
    ok('Second appel : le même retour (deja) ; rejeu de la clé : même réponse ; un seul retour en base', r2.j && r2.j.deja === true && r2.j.retourId === retourId
      && JSON.stringify(r3.j) === JSON.stringify(r1.j) && q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_BON_LIVRAISON_ID = '${B1}'`) === '1', JSON.stringify(r2.j));
    const e2 = await api('GET', '../api/v1/reception/' + B1 + '/ecarts');
    ok('Route des écarts : le retour des manquants y est rattaché', e2.j && e2.j.retourManquants && e2.j.retourManquants.retourId === retourId, JSON.stringify(e2.j && e2.j.retourManquants));
    ok('Création du retour : stocks et mouvements inchangés', P.every((id, i) => stock(id) === STOCK1[i] && mvts(id) === MVT1[i]));
    const sansManquant = await api('POST', '../api/v1/reception/' + B2 + '/retour-manquants', {}, CLE + '-retourb2');
    ok('BL non entré au reçu : pas de retour des manquants (409)', sansManquant.status === 409 && sansManquant.j && sansManquant.j.code === 'BL_NON_ENTRE_AU_RECU', JSON.stringify(sansManquant));

    /* liste des retours, puis validation a l'ecran */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_RETOUR_FRS_ID', id) >= 0; }, retourId, { timeout: 60000 });
    await p.waitForTimeout(800);
    const l1 = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0], r = g.getStore().getAt(g.getStore().findExact('lg_RETOUR_FRS_ID', id));
      const n = g.getView().getNode(r), img = [...n.querySelectorAll('img.act-modifier, img[src*="page_white_edit"]')].find((i) => !i.classList.contains('x-hide-display'));
      if (img) { img.id = 'e2e-ouvrir-retour'; }
      return { texte: n.textContent.replace(/\s+/g, ' '), manquants: !!n.querySelector('.retour-manquants'), icone: !!img }; }, retourId);
    ok('Liste : « En attente de validation » et « Manquants · sans sortie de stock »', /En attente de validation/.test(l1.texte) && l1.manquants && /sans sortie de stock/.test(l1.texte) && l1.icone, JSON.stringify(l1));
    await p.click('#e2e-ouvrir-retour');
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_save'); return b && b.isVisible() && /Valider le retour/.test(b.getText()); }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    const t1 = await p.evaluate(() => Ext.getCmp('btn_save').getText());
    await cliquer(p, '#btn_save');
    await p.waitForTimeout(300);
    const arme = await p.evaluate(() => ({ texte: Ext.getCmp('btn_save').getText(), boite: Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()) }));
    await cliquer(p, '#btn_save');
    for (let i = 0; i < 40 && q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${retourId}'`) !== 'enable'; i++) { await p.waitForTimeout(500); }
    ok('Validation à l\'écran : confirmation dans le bouton, aucune fenêtre', /Valider le retour/.test(t1) && /Confirmer|sortent/.test(arme.texte) && !arme.boite, t1 + ' / ' + JSON.stringify(arme));
    const vb = q(`SELECT CONCAT_WS('|', r.str_STATUT, (SELECT COUNT(*) FROM t_retour_fournisseur_detail d WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND d.str_STATUT = 'enable'),
      (SELECT GROUP_CONCAT(action ORDER BY dt_ACTION, ordre) FROM t_retour_fournisseur_historique h WHERE h.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID)) FROM t_retour_fournisseur r WHERE r.lg_RETOUR_FRS_ID = '${retourId}'`);
    ok('Validé, lignes validées, historique tracé', vb.startsWith('enable|' + attendus.length + '|') && /VALIDATION/.test(vb), vb);
    await p.waitForTimeout(1000);
    ok('Validation du retour des manquants : stocks et mouvements inchangés (rien n\'est sorti)', P.every((id, i) => stock(id) === STOCK1[i] && mvts(id) === MVT1[i]),
      JSON.stringify(P.map((id, i) => STOCK1[i] + '->' + stock(id))));
    const jr = q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE 'Retour des manquants ${r1.j.ref} validé sans sortie de stock : ${attendus.length} ligne(s), ${TOTAL_MANQUANT} boîte(s)%'`);
    ok('Journal : la validation sans sortie de stock est tracée', jr === '1', jr);
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    droitEntree.remettre();
    if (PEREMPTION0 !== '') { peremptionObligatoire(PEREMPTION0); }
    retirer();
    ok('Données d\'essai retirées, produits remis, droit remis', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN ('${B1}', '${B2}')`) === '0'
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON IN ('${REF1}', '${REF2}')`) === '0'
      && P.every((id, i) => stock(id) === STOCK0[i] && mvts(id) === MVT0[i])
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e_d59_%'") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' AND p.str_NAME = 'P_ENTREE_EN_STOCK'") !== '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
