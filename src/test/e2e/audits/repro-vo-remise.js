/* REPRODUCTION — REMISE SUR LA VENTE ASSURANCE (constats CR-05, N3, CR-06).
 * Remise d'essai de 10 % (grille VO), tiers payant d'essai a 80 % puis a 95 %, client pose en base.
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-vo-remise.js
 */
const C = require('./commun');
const { ok, q, exec, MARQUE } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(9, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0) AND f.int_PRICE >= 2000");
  const codeAvant = q("SELECT IFNULL(str_CODE_REMISE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
  C.etat.restaurations.push("UPDATE t_famille SET str_CODE_REMISE = " + (codeAvant === 'NULL' ? 'NULL' : "'" + codeAvant + "'") + " WHERE lg_FAMILLE_ID = '" + P.id + "'");
  const REMISE = MARQUE + '-R10';
  const type = q('SELECT lg_TYPE_REMISE_ID FROM t_type_remise ORDER BY lg_TYPE_REMISE_ID LIMIT 1');
  exec("INSERT INTO t_remise (lg_REMISE_ID, str_NAME, str_CODE, dbl_TAUX, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_REMISE_ID)"
    + " VALUES ('" + REMISE + "', 'ZZAUDIT 10', 'ZZA10', 10, 'enable', NOW(), NOW(), '" + type + "');"
    + "INSERT INTO t_workflow_remise_article (lg_WORKFLOW_REMISE_ARTICLE_ID, str_DESCRIPTION, str_CODE_REMISE_ARTICLE, str_CODE_GRILLE_VO, str_CODE_GRILLE_VNO, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MARQUE + "-WF', 'essai', 'Z9', 990001, 990001, 'enable', NOW(), NOW());"
    + "INSERT INTO t_grille_remise (lg_GRILLE_REMISE_ID, str_CODE_GRILLE, str_DESCRIPTION, dbl_TAUX, str_STATUT, lg_REMISE_ID, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MARQUE + "-GR', 990001, 'essai', 10, 'enable', '" + REMISE + "', NOW(), NOW());"
    + "UPDATE t_famille SET str_CODE_REMISE = 'Z9' WHERE lg_FAMILLE_ID = '" + P.id + "'");
  const sess = await C.connecter();
  const { api } = sess;
  const VO = C.venteAssurance(api);
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, e.stack); } };
  const partsTp = (v) => Number(q("SELECT COALESCE(SUM(int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
  try {
    /* CR-05 (especes) et N3 (differe) */
    await cas('CR-05', async () => {
      const tp = C.tiersPayant('VR80', '1');
      const cl = await C.clientAssure(api, 'VR80', [{ tp, taux: 80 }]);
      const tps = (b) => [{ lien: cl.lien(tp), taux: 80, bon: MARQUE + '-' + b }];
      const { v, c } = await VO.vendre(cl, tps('VR1'), P, 1, { remiseId: REMISE });
      const e = C.vente(v);
      const t = q("SELECT CONCAT_WS('|', montantPaye, montantRegle, montantRemise) FROM mvttransaction WHERE pkey = '" + v + "'");
      ok('CR-05 précondition : remise appliquée sur la vente assurance', e.remise > 0, JSON.stringify(e) + ' ; net affiché ' + c.net.montantNet);
      ok('CR-05 attendu : en espèces, le montant réglé de la transaction = part client (' + e.partClient + ')', Number(t.split('|')[1]) === e.partClient,
        'prix ' + e.prix + ' ; remise ' + e.remise + ' ; parts TP ' + partsTp(v) + ' ; part client ' + e.partClient + ' ; transaction payé|réglé|remise ' + t);
      const { v: v2 } = await VO.vendre(cl, tps('VR2'), P, 1, { remiseId: REMISE, mode: '4', recu: 0 });
      const e2 = C.vente(v2);
      const dette = q("SELECT CONCAT(int_PRICE, '|', int_PRICE_RESTE) FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'");
      ok('N3 attendu : en différé sans acompte, la dette du client = part client (' + e2.partClient + ')', Number(dette.split('|')[1]) === e2.partClient,
        'part client ' + e2.partClient + ' ; remise ' + e2.remise + ' ; dette prix|reste ' + dette);
    });

    /* CR-06 */
    await cas('CR-06', async () => {
      const tp = C.tiersPayant('VR95', '1');
      const cl = await C.clientAssure(api, 'VR95', [{ tp, taux: 95 }]);
      const { v } = await VO.vendre(cl, [{ lien: cl.lien(tp), taux: 95, bon: MARQUE + '-VR95' }], P, 1, { remiseId: REMISE });
      const e = C.vente(v);
      ok('CR-06 attendu : avec une remise (10 %) supérieure à la part client (5 %), parts TP + part client = prix − remise',
        partsTp(v) + e.partClient === e.prix - e.remise, 'prix ' + e.prix + ' ; remise ' + e.remise + ' ; parts TP ' + partsTp(v) + ' ; part client ' + e.partClient
        + ' ; total ' + (partsTp(v) + e.partClient) + ' (attendu ' + (e.prix - e.remise) + ')');
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
