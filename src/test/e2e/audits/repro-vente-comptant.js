/* REPRODUCTION — MODULE VENTE COMPTANT (constats VC-01, VC-02, VC-04, VC-08, VC-09, VC-11, VC-12, VC-14, N1, N2).
 * Chaque cas joue le parcours de l'ecran de vente par son API (session du compte de test) et affirme le comportement
 * ATTENDU : FAIL = defaut reproduit, avec la mesure entre crochets. Jeu d'essai retire a la fin.
 * Lancement (seul, jamais en meme temps qu'un autre test d'ecran) : node src/test/e2e/audits/repro-vente-comptant.js
 */
const C = require('./commun');
const { ok, q, exec, ADMIN, MARQUE } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(3, 100);
  const sess = await C.connecter();
  const { api } = sess;
  const V = C.venteComptant(api);
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, (String(e.message).match(/ERROR.*/) || [])[0] || e.stack); } };
  try {
    /* VC-01 */
    await cas('VC-01', async () => {
      const v = await V.vendre(P, 2);
      ok('VC-01 précondition : vente comptant de 2 boîtes encaissée', !!v && C.vente(v).statut === 'is_Closed', v);
      const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      const r = await api('POST', '../api/v1/vente/update/item/vno', { itemId: ligne, itemPu: P.pu, qte: 5, qteServie: 5, venteId: v });
      const apres = q("SELECT CONCAT(int_QUANTITY, '|', int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + ligne + "'");
      ok('VC-01 attendu : modifier la quantité d\'une ligne d\'une vente encaissée est refusé, ligne inchangée (2 boîtes)',
        r.success === false && apres === '2|' + (2 * P.pu), 'réponse ' + JSON.stringify(r).slice(0, 160) + ' ; ligne après = qté|montant ' + apres
        + ' ; vente ' + JSON.stringify(C.vente(v)) + ' ; stock ' + C.stock(P));
    });

    /* VC-02 */
    await cas('VC-02', async () => {
      const v = await V.vendre(P, 1);
      const r = await api('PUT', '../api/v1/vente/terminerprevente/' + v);
      const st = C.vente(v).statut;
      const tr = q("SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + v + "'");
      ok('VC-02 attendu : « Terminer la prévente » sur une vente encaissée est refusé, statut is_Closed conservé',
        r.success !== true && st === 'is_Closed', 'réponse ' + JSON.stringify(r).slice(0, 120) + ' ; statut après ' + st + ' ; transactions de caisse ' + tr);
    });

    /* VC-04 */
    await cas('VC-04', async () => {
      const s0 = C.stock(P);
      const v = await V.vendre(P, 1);
      const m = await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
      const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' AND copy = 1 AND str_STATUT = 'is_Process' LIMIT 1");
      ok('VC-04 précondition : modification ouverte (copie en cours)', !!copie, JSON.stringify(m).slice(0, 160));
      const a = await api('GET', '../api/v1/vente/annulation/' + v);
      const c = await V.cloturer(copie, { vendeur: C.AUTRE_VENDEUR });
      /* une modification normale laisse DEUX enregistrements pointant l'origine : la copie et UNE contre-passation (prix negatif) */
      const annulations = Number(q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + v + "' AND int_PRICE < 0"));
      const caisse = q("SELECT COALESCE(SUM(montant), 0) FROM mvttransaction WHERE pkey IN (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement"
        + " WHERE lg_PREENREGISTREMENT_ID IN ('" + v + "', '" + copie + "') OR lg_PREENGISTREMENT_ANNULE_ID = '" + v + "')");
      ok('VC-04 attendu : annuler la vente pendant sa modification est refusé, ou la clôture de la copie ne la réannule pas'
        + ' (une seule annulation ; stock = stock de départ − 1 car la copie est vendue)',
        (a.success === false || c.success === false) && annulations <= 1 && C.stock(P) === s0 - 1 && Number(caisse) === (c.success ? P.pu : 0),
        'annulation ' + JSON.stringify(a).slice(0, 80) + ' ; clôture copie ' + JSON.stringify({ s: c.success, m: c.msg }) + ' ; annulations de l\'origine '
        + annulations + ' ; stock départ ' + s0 + ' → fin ' + C.stock(P) + ' ; somme caisse origine+copie+annulations ' + caisse + ' (attendu ' + P.pu + ')');
    });

    /* VC-08 */
    await cas('VC-08', async () => {
      const cl = MARQUE + '-CL-VC08';
      exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + cl + "', 'Client', '" + MARQUE + " VC08', 'enable', NOW());"
        + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + cl + "-cpt', '" + cl + "', 'enable', NOW())");
      const v = await V.vendre(P, 1, { clientId: cl });
      ok('VC-08 précondition : vente encaissée rattachée au client d\'essai', C.vente(v).client === cl, JSON.stringify(C.vente(v)));
      const r = await api('POST', '../api/v1/vente/update/client', { venteId: v, clientId: 'inconnu-' + MARQUE });
      ok('VC-08 attendu : changer le client d\'une vente encaissée (identifiant inconnu) est refusé, client conservé',
        r.success === false && C.vente(v).client === cl, 'réponse ' + JSON.stringify(r).slice(0, 120) + ' ; client après ' + C.vente(v).client);
    });

    /* VC-09 */
    await cas('VC-09', async () => {
      C.parametre('FORCER_STOCK_VENTE', '0');
      exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 1, int_NUMBER = 1 WHERE lg_FAMILLE_ID = '" + P.id + "' AND lg_EMPLACEMENT_ID = '1'");
      const v1 = await V.ajouter(P, 1);
      const v2 = await V.ajouter(P, 1);
      ok('VC-09 précondition : deux ventes en cours de 1 boîte chacune, stock 1, FORCER_STOCK_VENTE = 0', !!v1 && !!v2, v1 + ' / ' + v2);
      const c1 = await V.cloturer(v1);
      const c2 = await V.cloturer(v2);
      ok('VC-09 attendu : la seconde validation est refusée, le stock ne passe pas sous zéro',
        c2.success === false && C.stock(P) >= 0, 'clôture 1 ' + c1.success + ' ; clôture 2 ' + JSON.stringify({ s: c2.success, m: c2.msg }) + ' ; stock final ' + C.stock(P));
      exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + P.id + "' AND lg_EMPLACEMENT_ID = '1'");
    });

    /* VC-11 */
    await cas('VC-11', async () => {
      const L = C.produit(0, 100, "AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID)");
      const lot = (id, jours, courant) => exec("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION,"
        + " str_STATUT, int_QTY_VENDUE, current_stock) VALUES ('" + id + "', '" + ADMIN + "', '" + L.id + "', '" + id + "', 5, NOW(), NOW(), NOW() + INTERVAL " + jours
        + " DAY, 'enable', 0, " + courant + ")");
      C.etat.restaurations.push("DELETE FROM t_lot WHERE lg_LOT_ID LIKE '" + MARQUE + "-LOT-%'");
      lot(MARQUE + '-LOT-A', 200, 0);
      lot(MARQUE + '-LOT-B', 400, 5);
      const lots = () => q("SELECT GROUP_CONCAT(CONCAT(int_NUM_LOT, '=', current_stock) ORDER BY int_NUM_LOT) FROM t_lot WHERE lg_LOT_ID LIKE '" + MARQUE + "-LOT-%'");
      /* une vente ne suit pas la reception du lot dans la meme seconde (dates de lot egales : ordre arbitraire) */
      await new Promise((r) => setTimeout(r, 2500));
      const v = await V.vendre(L, 2);
      const apresVente = lots();
      ok('VC-11 précondition : lot A (péremption proche) épuisé, lot B à 5 ; la vente de 2 boîtes sort du lot B', apresVente.endsWith('LOT-B=3'), apresVente);
      const a = await api('GET', '../api/v1/vente/annulation/' + v);
      const apres = lots();
      ok('VC-11 attendu : l\'annulation rend les 2 boîtes au lot B d\'où elles sont sorties (A=0, B=5)',
        a.success === true && apres === MARQUE + '-LOT-A=0,' + MARQUE + '-LOT-B=5', 'annulation ' + a.success + ' ; lots après annulation ' + apres);
    });

    /* VC-12 */
    await cas('VC-12', async () => {
      const v = await V.vendre(P, 1);
      exec("UPDATE t_preenregistrement SET dt_CREATED = dt_CREATED - INTERVAL 1 DAY, dt_UPDATED = dt_UPDATED - INTERVAL 1 DAY, completion_date = completion_date - INTERVAL 1 DAY"
        + " WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
        + "UPDATE mvttransaction SET createdAt = createdAt - INTERVAL 1 DAY, mvtdate = mvtdate - INTERVAL 1 DAY WHERE pkey = '" + v + "'");
      await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
      const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' AND copy = 1 AND str_STATUT = 'is_Process' LIMIT 1");
      const c = await V.cloturer(copie, { vendeur: C.AUTRE_VENDEUR });
      const dates = q("SELECT CONCAT_WS(' ; ', CONCAT('transaction de la copie ', (SELECT GROUP_CONCAT(mvtdate) FROM mvttransaction WHERE pkey = '" + copie + "')),"
        + " CONCAT('contre-passation ', (SELECT GROUP_CONCAT(m.mvtdate) FROM mvttransaction m JOIN t_preenregistrement a ON a.lg_PREENREGISTREMENT_ID = m.pkey"
        + "   WHERE a.lg_PREENGISTREMENT_ANNULE_ID = '" + v + "')),"
        + " CONCAT('recette de la copie ', (SELECT GROUP_CONCAT(DATE(dt_CREATED)) FROM t_recettes WHERE str_REF_FACTURE = '" + copie + "')),"
        + " CONCAT('mouvement de stock de la copie ', (SELECT GROUP_CONCAT(h.mvtdate) FROM hmvtproduit h JOIN t_preenregistrement_detail d"
        + "   ON d.lg_PREENREGISTREMENT_DETAIL_ID = h.lg_PREENREGISTREMENT_DETAIL_ID WHERE d.lg_PREENREGISTREMENT_ID = '" + copie + "')),"
        + " CONCAT('mouvement de stock de l\\'annulation ', (SELECT GROUP_CONCAT(h.mvtdate) FROM hmvtproduit h JOIN t_preenregistrement_detail d"
        + "   ON d.lg_PREENREGISTREMENT_DETAIL_ID = h.lg_PREENREGISTREMENT_DETAIL_ID JOIN t_preenregistrement a ON a.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
        + "   WHERE a.lg_PREENGISTREMENT_ANNULE_ID = '" + v + "')), CONCAT('aujourd\\'hui ', CURDATE()))");
      /* toutes les dates des ecritures (la derniere est celle du jour, pour lecture) */
      const toutes = dates.match(/\d{4}-\d{2}-\d{2}/g) || [];
      const jours = new Set(toutes.slice(0, -1));
      ok('VC-12 attendu : toutes les écritures de la modification d\'une vente d\'hier portent la même date',
        c.success === true && jours.size === 1, 'clôture copie ' + c.success + ' ; ' + dates);
    });

    /* VC-14 */
    await cas('VC-14', async () => {
      const v = await V.ajouter(P, 2);
      const c = await V.cloturer(v, { recu: 1, paye: 1 });
      const t = q("SELECT CONCAT_WS('|', montant, montantNet, montantPaye, montantRegle) FROM mvttransaction WHERE pkey = '" + v + "'");
      const rec = q("SELECT IFNULL(SUM(int_AMOUNT), 'aucune') FROM t_recettes WHERE str_REF_FACTURE = '" + v + "'");
      ok('VC-14 attendu : une clôture qui déclare 1 F payé pour une vente de ' + (2 * P.pu) + ' F est refusée',
        c.success === false, 'clôture ' + JSON.stringify({ s: c.success, m: c.msg }) + ' ; transaction montant|net|payé|réglé ' + t + ' ; recette ' + rec);
    });

    /* N1 */
    await cas('N1', async () => {
      const v = await V.vendre(P, 1);
      const sauve = MARQUE.toLowerCase() + '_n1_stock';
      exec('DROP TABLE IF EXISTS ' + sauve + '; CREATE TABLE ' + sauve + " AS SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + P.id + "' AND lg_EMPLACEMENT_ID = '1'");
      C.etat.restaurations.push('SET FOREIGN_KEY_CHECKS = 0; INSERT IGNORE INTO t_famille_stock SELECT * FROM ' + sauve + '; SET FOREIGN_KEY_CHECKS = 1; DROP TABLE IF EXISTS ' + sauve);
      /* la ligne est referencee par l'inventaire : retiree et remise a l'identique dans la meme connexion, controles de cles suspendus */
      exec("SET FOREIGN_KEY_CHECKS = 0; DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + P.id + "' AND lg_EMPLACEMENT_ID = '1'; SET FOREIGN_KEY_CHECKS = 1");
      const a = await api('GET', '../api/v1/vente/annulation/' + v);
      const etatV = C.vente(v);
      const copies = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'");
      const contre = q("SELECT COUNT(*) FROM mvttransaction m JOIN t_preenregistrement a ON a.lg_PREENREGISTREMENT_ID = m.pkey WHERE a.lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'");
      exec('SET FOREIGN_KEY_CHECKS = 0; INSERT IGNORE INTO t_famille_stock SELECT * FROM ' + sauve + '; SET FOREIGN_KEY_CHECKS = 1; DROP TABLE IF EXISTS ' + sauve);
      C.etat.restaurations.pop();
      ok('N1 attendu : une annulation qui échoue (produit sans ligne de stock dans l\'emplacement) ne laisse aucune écriture',
        a.success === false && !etatV.annulee && copies === '0' && contre === '0',
        'réponse ' + JSON.stringify(a).slice(0, 120) + ' ; vente annulée ? ' + etatV.annulee + ' ; copies d\'annulation ' + copies + ' ; contre-passations ' + contre);
    });

    /* N2 */
    await cas('N2', async () => {
      const v = await V.vendre(P, 1);
      await api('GET', '../api/v1/vente/annulation/' + v);
      const m = await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
      const renvoye = m.data ? m.data.lgPREENREGISTREMENTID : null;
      const nature = renvoye ? q("SELECT CONCAT_WS('|', str_STATUT, copy, int_PRICE, IFNULL(lg_PREENGISTREMENT_ANNULE_ID, '-')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + renvoye + "'") : '-';
      ok('N2 attendu : ouvrir la modification d\'une vente annulée est refusé',
        m.success === false, 'réponse ' + JSON.stringify(m).slice(0, 160) + ' ; vente renvoyée comme « copie » : statut|copy|prix|annule ' + nature);
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
