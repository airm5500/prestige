/* REPRODUCTION — MODULE CARNET DEPOT ET RETOURS CARNET (constats CA-06, CA-07, CA-08/CA-15, CA-12).
 * Carnet depot d'essai (copie d'un carnet existant, solde 5 000 F), retours par les routes de l'ecran « Retour carnet ».
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-carnet.js
 */
const C = require('./commun');
const { ok, q } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(7, 100);
  const TP = C.tiersPayant('CAD', '2', 'is_depot = 1, account = 5000');
  /* N9 : la cloture d'un retour ecrit un mouvement de stock dont la cle (pkey, unique) est l'identifiant numerique de la
     ligne de retour ; sur la copie, les identifiants 7498 et suivants sont deja pris par des mouvements d'inventaire et la
     cloture echoue. Pour mesurer CA-07 et CA-12, le compteur des lignes de retour est place au-dessus de toute cle
     existante, puis remis a sa valeur. */
  const auto = q("SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'retour_carnet_detail'");
  C.etat.restaurations.push('ALTER TABLE retour_carnet_detail AUTO_INCREMENT = ' + auto);
  C.exec('ALTER TABLE retour_carnet_detail AUTO_INCREMENT = 9000000');
  const motif = q('SELECT id FROM motif_retour_carnet ORDER BY id LIMIT 1');
  const solde = () => Number(q("SELECT account FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + TP + "'"));
  const sess = await C.connecter();
  const { api } = sess;
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, e.stack); } };
  const creerRetour = (qte, motifId) => api('POST', '../api/v2/retour-carnet-depot/creeation',
    { refParent: null, value: qte, description: C.MARQUE, refTwo: P.id, valueFour: motifId, ref: TP });
  try {
    /* CA-06 */
    await cas('CA-06', async () => {
      const avant = solde();
      ok('CA-06 précondition : solde du carnet dépôt d\'essai = 5 000', avant === 5000, avant);
      const r = await api('PUT', '../api/v2/carnet-depot/regler/' + TP, { montantPaye: -1000, typeReglement: '1', dateReglement: q('SELECT CURDATE()') });
      ok('CA-06 attendu : un règlement de carnet dépôt de −1 000 F est refusé, solde inchangé',
        r.success !== true && solde() === avant, 'réponse ' + JSON.stringify(r).slice(0, 120) + ' ; solde ' + avant + ' → ' + solde());
    });

    /* CA-12 puis CA-07 */
    await cas('CA-07/CA-12', async () => {
      const s0 = C.stock(P), solde0 = solde();
      const r = await creerRetour(2, Number(motif));
      const id = r.data ? r.data.id : null;
      ok('CA-07 précondition : retour carnet de 2 boîtes créé (stock ' + s0 + ')', !!id, JSON.stringify(r).slice(0, 120));
      const detail = q("SELECT CONCAT(stock_init, '|', stock_final, '|', qty_retour, '|', prix_uni) FROM retour_carnet_detail WHERE retour_carnet_id = " + id).split('|');
      ok('CA-12 attendu : le détail du retour (une entrée en stock) note stock final = stock initial + 2',
        Number(detail[1]) === Number(detail[0]) + 2, 'stock initial ' + detail[0] + ' ; stock final noté ' + detail[1] + ' ; quantité ' + detail[2]);
      const c1 = await api('PUT', '../api/v2/retour-carnet-depot/' + id, { description: C.MARQUE });
      const apres1 = [C.stock(P), solde()];
      const c2 = await api('PUT', '../api/v2/retour-carnet-depot/' + id, { description: C.MARQUE });
      const apres2 = [C.stock(P), solde()];
      ok('CA-07 attendu : clôturer deux fois le même retour ne recompte ni le stock ni le solde',
        apres2[0] === apres1[0] && apres2[1] === apres1[1],
        'clôtures ' + c1.success + '/' + c2.success + ' ; stock ' + s0 + ' → ' + apres1[0] + ' → ' + apres2[0] + ' ; solde ' + solde0 + ' → ' + apres1[1] + ' → ' + apres2[1]);
      const h = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(qteDebut, '+', qteMvt, '=', qteFinale) SEPARATOR ' ; '), 'aucun') FROM hmvtproduit WHERE typeMvt = '13' AND lg_FAMILLE_ID = '" + P.id + "' AND pkey IN (SELECT CAST(id AS CHAR) FROM retour_carnet_detail WHERE retour_carnet_id = " + id + ")");
      ok('CA-12 attendu : l\'historique de stock du retour enchaîne (début + quantité = fin) et n\'est écrit qu\'une fois', /^\d+\+\d+=\d+$/.test(h) && h.split('+').length === 2
        && Number(h.split('+')[0]) + Number(h.split('+')[1].split('=')[0]) === Number(h.split('=')[1]), 'mouvements : ' + h);
    });

    /* CA-08 / CA-15 */
    await cas('CA-08', async () => {
      const s0 = C.stock(P);
      const r = await creerRetour(-3, Number(motif));
      ok('CA-08 attendu : un retour de −3 boîtes est refusé', r.success !== true, 'réponse ' + JSON.stringify(r).slice(0, 120) + ' ; stock ' + s0 + ' → ' + C.stock(P));
      const r2 = await creerRetour(1, null);
      ok('CA-15 attendu : un retour sans motif est refusé avec un message (pas une erreur 500)', r2.http === 200 && r2.success === false,
        'HTTP ' + r2.http + ' ; ' + JSON.stringify(r2).slice(0, 120));
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
