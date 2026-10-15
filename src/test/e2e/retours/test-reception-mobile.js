/* RECEPTION BL ET RETOUR FOURNISSEUR MOBILES (prestige_vente_app, docs/ETAPE_D_SERVEUR_RECEPTION_RETOUR.md, D10 a D18).
 *
 * Un BL d'essai (commande, BL ouvert, une ligne de 10 boites) est pose en base ; les lots sont saisis par la route de
 * l'application (commande/add-lot), le retour par retourfournisseur/new et produit/validerretourfour. Ce que le test
 * etablit :
 *  - D10 : parametres servis (peremption obligatoire, 6 mois, motif obligatoire, scans repetes) ;
 *  - D18 : une boite au numero de serie deja scanne est refusee « Boîte déjà scannée », sans lot de plus ;
 *  - D11 : lots de la ligne avec auteur et heure ; effacer UN lot (les autres restent) ; sans P_BL_MOBILE_CORRIGER :
 *    403 ; BL entre en stock : 409 ;
 *  - D12 : peremption courte acceptee sans motif refusee, avec motif journalisee (valeur = PAF x quantite) ; rapport ;
 *    statut RECLAME ; sans P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE : acceptation 403, refus permis ;
 *  - D13 : anomalie enregistree et relue ; type inconnu 400 ;
 *  - D15 : le retour en preparation sur ce BL est retrouve ;
 *  - D14 : lot retourne range sur la ligne de retour ; lot non recu sur ce BL refuse ; a la validation le lot perd
 *    les boites retournees ;
 *  - D16 : presence et verrou (meme ligne + meme lot pris par un autre : signale ; autre lot : libre).
 * Tout le jeu d'essai est retire, le stock du produit remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-RM-', REF = 'E2E-RM-BL1', NOTE = 'E2E-RM-RETOUR';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const AUTRE_USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN <> 'admin' AND str_STATUT = 'enable' LIMIT 1");
const PRODUIT = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 7");
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const MOTIF = q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 1");
const STOCK0 = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
const corriger = require('../support/privilege-essai')(q, exec, 'admin', 'P_BL_MOBILE_CORRIGER');
const accepter = require('../support/privilege-essai')(q, exec, 'admin', 'P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE');

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}' OR lg_RETOUR_FRS_ID LIKE '${M}%'`);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref IN (${ids}));`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_serie_consommee WHERE lg_BON_LIVRAISON_DETAIL = '${M}D1' OR serie LIKE 'E2ERM%';`
    + `DELETE FROM t_reception_peremption_courte WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_reception_anomalie WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_reception_session WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_order WHERE lg_ORDER_ID = '${M}C1';`);
}

function poser() {
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
    VALUES ('${M}C1', '${M}C1', 1, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);
    INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)
    VALUES ('${M}B1', '${REF}', CURDATE(), 10000, 0, 10000, '${M}C1', 'enable', NOW(), NOW(), '${ADMIN}', 0);
    INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PAF, int_PRIX_VENTE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)
    SELECT '${M}D1', '${G}', '${PRODUIT}', '${M}B1', 10, 0, 10, 1000, 1500, 1000, 'enable', NOW(), NOW(), 0, 0, 0, f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.lg_FAMILLE_ID = '${PRODUIT}';`);
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
}

(async () => {
  corriger.remettre(); accepter.remettre();
  retirer();
  try { poser(); } catch (e) { retirer(); throw e; }
  const peremption = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 3 MONTH, '%Y-%m-%d')");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let p;
  const connecter = async () => {
    p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
  };
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [m, u, c]);
  const nbLots = () => q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'`);
  try {
    await connecter();
    /* D10 */
    const par = await api('GET', '../api/v1/reception/parametres');
    ok('D10 : paramètres servis au mobile', par.http === 200 && par.moisPeremptionCourte === 6 && par.motifObligatoirePeremptionCourte === true
      && par.scansRepetesActifs === true && typeof par.peremptionObligatoire === 'boolean', JSON.stringify(par));

    /* lots saisis par la route de l'application ; D18 */
    const l1 = await api('POST', '../api/v1/commande/add-lot', { idBonDetail: M + 'D1', qty: 3, freeQty: 0, numLot: 'E2ERMA', datePeremption: peremption });
    const l2 = await api('POST', '../api/v1/commande/add-lot', { idBonDetail: M + 'D1', qty: 1, freeQty: 0, numLot: 'E2ERMB', datePeremption: peremption, serie: 'E2ERM-SN1', gtin: '03400930000017' });
    ok('Deux lots saisis (dont un avec numéro de série)', l1.success === true && l2.success === true && nbLots() === '2', JSON.stringify([l1, l2]));
    const l3 = await api('POST', '../api/v1/commande/add-lot', { idBonDetail: M + 'D1', qty: 1, freeQty: 0, numLot: 'E2ERMB', datePeremption: peremption, serie: 'E2ERM-SN1', gtin: '03400930000017' });
    ok('D18 : même numéro de série : « Boîte déjà scannée », aucun lot de plus', l3.success === false && /déjà scannée/.test(l3.msg || '') && nbLots() === '2', JSON.stringify(l3));
    const l4 = await api('POST', '../api/v1/commande/add-lot', { idBonDetail: M + 'D1', qty: 1, freeQty: 0, numLot: 'E2ERMC', datePeremption: peremption });
    ok('Sans numéro de série : saisie inchangée', l4.success === true && nbLots() === '3', JSON.stringify(l4));

    /* D11 */
    const lots = await api('GET', '../api/v1/commande/bon/items/' + M + 'D1/lots');
    const a = (lots.data || []).find((x) => x.numLot === 'E2ERMA') || {}, c = (lots.data || []).find((x) => x.numLot === 'E2ERMC') || {};
    ok('D11 : lots de la ligne avec auteur et heure', lots.http === 200 && lots.data.length === 3 && a.quantite === 3 && a.login === 'admin' && /^\d{4}-\d\d-\d\dT/.test(a.creeLe || '') && a.datePeremption === peremption, JSON.stringify(lots.data));
    corriger.retirer();
    await p.context().close(); await connecter();
    const refus = await api('DELETE', '../api/v1/commande/bon/lots/' + c.lotId);
    ok('D11 : sans P_BL_MOBILE_CORRIGER : 403, lot conservé', refus.http === 403 && refus.interdit === true && nbLots() === '3', JSON.stringify(refus));
    corriger.remettre();
    await p.context().close(); await connecter();
    const eff = await api('DELETE', '../api/v1/commande/bon/lots/' + c.lotId);
    ok('D11 : effacer UN lot : les deux autres restent', eff.http === 200 && eff.success === true && nbLots() === '2'
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}' AND int_NUM_LOT = 'E2ERMC'`) === '0', JSON.stringify(eff));
    exec(`UPDATE t_bon_livraison SET str_STATUT = 'is_Closed' WHERE lg_BON_LIVRAISON_ID = '${M}B1'`);
    const clos = await api('DELETE', '../api/v1/commande/bon/lots/' + a.lotId);
    ok('D11 : BL entré en stock : 409, lot conservé', clos.http === 409 && clos.code === 'BL_CLOTURE' && nbLots() === '2', JSON.stringify(clos));
    exec(`UPDATE t_bon_livraison SET str_STATUT = 'enable' WHERE lg_BON_LIVRAISON_ID = '${M}B1'`);

    /* D12 */
    const sansMotif = await api('POST', '../api/v1/reception/peremptions-courtes', { detailId: M + 'D1', lotId: a.lotId, numLot: 'E2ERMA', datePeremption: peremption, quantite: 3, decision: 'ACCEPTE' });
    ok('D12 : acceptation sans motif : refusée (motif obligatoire)', sansMotif.http === 400 && sansMotif.code === 'MOTIF_OBLIGATOIRE', JSON.stringify(sansMotif));
    const acc = await api('POST', '../api/v1/reception/peremptions-courtes', { detailId: M + 'D1', lotId: a.lotId, numLot: 'E2ERMA', datePeremption: peremption, quantite: 3, decision: 'ACCEPTE', motif: 'Produit en rupture chez les autres grossistes' });
    ok('D12 : acceptation avec motif journalisée', acc.http === 200 && acc.success === true, JSON.stringify(acc));
    const rap = await api('GET', '../api/v1/reception/peremptions-courtes');
    const ligne = (rap.data || []).find((x) => x.id === acc.id) || {};
    ok('D12 : rapport : BL, lot, valeur = PAF x quantité (3 000), utilisateur, motif', ligne.bl === REF && ligne.numLot === 'E2ERMA' && ligne.valeur === 3000 && ligne.decision === 'ACCEPTE'
      && ligne.statut === 'A_TRAITER' && /rupture/.test(ligne.motif) && ligne.joursRestants > 80, JSON.stringify(ligne));
    const st = await api('PUT', '../api/v1/reception/peremptions-courtes/' + acc.id + '/statut?statut=RECLAME');
    ok('D12 : statut de traitement « réclamé »', st.http === 200 && q(`SELECT statut FROM t_reception_peremption_courte WHERE id = '${acc.id}'`) === 'RECLAME', JSON.stringify(st));
    accepter.retirer();
    await p.context().close(); await connecter();
    const accRefus = await api('POST', '../api/v1/reception/peremptions-courtes', { detailId: M + 'D1', datePeremption: peremption, quantite: 1, decision: 'ACCEPTE', motif: 'x' });
    const refusOk = await api('POST', '../api/v1/reception/peremptions-courtes', { detailId: M + 'D1', datePeremption: peremption, quantite: 1, decision: 'REFUSE' });
    ok('D12 : sans le droit : accepter 403, refuser permis', accRefus.http === 403 && refusOk.http === 200, accRefus.http + ' / ' + refusOk.http);
    accepter.remettre();
    await p.context().close(); await connecter();

    /* D13 */
    const an = await api('POST', '../api/v1/reception/anomalies', { blId: M + 'B1', type: 'PRODUIT_NON_PREVU', code: '3400999999999', quantite: 2, commentaire: 'Scanné, absent du BL' });
    const anMauvais = await api('POST', '../api/v1/reception/anomalies', { blId: M + 'B1', type: 'AUTRE', code: 'x' });
    const lus = await api('GET', '../api/v1/reception/anomalies?blId=' + M + 'B1');
    ok('D13 : anomalie enregistrée et relue ; type inconnu refusé (400)', an.http === 200 && anMauvais.http === 400 && lus.data.length === 1 && lus.data[0].code === '3400999999999' && lus.data[0].quantite === 2 && lus.data[0].type === 'PRODUIT_NON_PREVU', JSON.stringify(lus.data));

    /* D14 + D15 */
    const inconnu = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: REF, strCOMMENTAIRE: NOTE, items: [{ produitId: PRODUIT, lgMOTIFRETOUR: MOTIF, intNUMBERRETURN: 1, numLot: 'PAS-RECU' }] });
    ok('D14 : lot non reçu sur ce BL : refus lisible', inconnu.success === false && /n'a pas été reçu/.test(inconnu.msg || ''), JSON.stringify(inconnu).slice(0, 200));
    const r = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: REF, strCOMMENTAIRE: NOTE, items: [{ produitId: PRODUIT, lgMOTIFRETOUR: MOTIF, intNUMBERRETURN: 2, numLot: 'E2ERMA' }] });
    const retourId = r.data && r.data.lgRETOURFRSID;
    ok('D14 : retour avec lot : lot rangé sur la ligne', r.success === true && q(`SELECT CONCAT(num_lot, '|', lg_LOT_ID) FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${retourId}'`) === 'E2ERMA|' + a.lotId, JSON.stringify(r).slice(0, 200));
    const prep = await api('GET', '../api/v1/retourfournisseur/en-preparation?blId=' + M + 'B1');
    ok('D15 : retour en préparation retrouvé sur ce BL', prep.http === 200 && prep.data.length === 1 && prep.data[0].lgRETOURFRSID === retourId && prep.data[0].nbLignes === 1 && prep.data[0].blRef === REF, JSON.stringify(prep.data));
    const avantLot = q(`SELECT IFNULL(current_stock, int_NUMBER) FROM t_lot WHERE lg_LOT_ID = '${a.lotId}'`);
    const v = await api('POST', '../api/v1/produit/validerretourfour', { ref: retourId, refTwo: '', description: NOTE });
    ok('D14 : validation : le lot perd les 2 boîtes retournées', v.success === true && q(`SELECT current_stock FROM t_lot WHERE lg_LOT_ID = '${a.lotId}'`) === String(Number(avantLot) - 2), avantLot + ' → ' + q(`SELECT current_stock FROM t_lot WHERE lg_LOT_ID = '${a.lotId}'`));
    const prep2 = await api('GET', '../api/v1/retourfournisseur/en-preparation?blId=' + M + 'B1');
    ok('D15 : retour validé : plus en préparation', prep2.data.length === 0, JSON.stringify(prep2.data));

    /* D16 */
    const pres = await api('POST', '../api/v1/reception/' + M + 'B1/presence', { appareil: 'TERMINAL-1', detailId: M + 'D1', numLot: 'E2ERMA' });
    exec(`INSERT INTO t_reception_session (lg_BON_LIVRAISON_ID, lg_USER_ID, appareil, lg_BON_LIVRAISON_DETAIL, num_lot, depuis, dernier_signal) VALUES ('${M}B1', '${AUTRE_USER}', 'TERMINAL-2', '${M}D1', 'E2ERMB', NOW(), NOW())`);
    const memeLot = await api('POST', '../api/v1/reception/' + M + 'B1/presence', { appareil: 'TERMINAL-1', detailId: M + 'D1', numLot: 'E2ERMB' });
    const autreLot = await api('POST', '../api/v1/reception/' + M + 'B1/presence', { appareil: 'TERMINAL-1', detailId: M + 'D1', numLot: 'E2ERMA' });
    const presents = await api('GET', '../api/v1/reception/' + M + 'B1/presence');
    ok('D16 : verrou posé ; même ligne et même lot pris par un autre : signalé ; autre lot : libre', pres.verrou === true && memeLot.verrou === false && !!memeLot.verrouPar && autreLot.verrou === true, JSON.stringify([pres, memeLot, autreLot]));
    ok('D16 : présents sur le BL avec le produit en cours', presents.data.length === 2 && presents.data.every((x) => x.produitEnCours), JSON.stringify(presents.data).slice(0, 250));
    exec(`UPDATE t_reception_session SET dernier_signal = NOW() - INTERVAL 5 MINUTE WHERE lg_USER_ID = '${AUTRE_USER}'`);
    const expire = await api('POST', '../api/v1/reception/' + M + 'B1/presence', { appareil: 'TERMINAL-1', detailId: M + 'D1', numLot: 'E2ERMB' });
    ok('D16 : verrou abandonné (plus de 2 min sans signal) : repris', expire.verrou === true, JSON.stringify(expire));

    const sansSession = await p.evaluate(async () => { const r = await fetch('../api/v1/reception/parametres', { credentials: 'omit' }); return r.status; });
    ok('Sans session : 401', sansSession === 401, sansSession);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    corriger.remettre(); accepter.remettre();
    await b.close();
    retirer();
    exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
    ok('Jeu d\'essai retiré, stock remis', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1'`) === '0' && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'`) === '0'
      && q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`) === STOCK0.join('|'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
