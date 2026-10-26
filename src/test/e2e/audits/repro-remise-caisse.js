/* REPRODUCTION — REMISES DE LA VENTE COMPTANT ET MOUVEMENTS DE CAISSE (constats VC-05, VC-06, VC-07, VC-16).
 * Remise d'essai de 10 % (t_remise, t_grille_remise, t_workflow_remise_article marques ZZAUDIT) appliquee a un
 * produit TVA 18 % compte dans le chiffre d'affaires ; code remise du produit remis a la fin.
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-remise-caisse.js
 */
const C = require('./commun');
const { ok, q, exec, MARQUE } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(0, 100, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 18) AND MOD(f.int_PRICE, 50) <> 0");
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
  const V = C.venteComptant(api);
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, e.stack); } };
  const tvaLignes = (v) => Number(q("SELECT COALESCE(SUM(montantTva), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
  const remiseLignes = (v) => Number(q("SELECT COALESCE(SUM(int_PRICE_REMISE), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
  try {
    /* VC-05 et VC-07 : vente avec remise, encaissee */
    await cas('VC-05/VC-07', async () => {
      const v = await V.ajouter(P, 1);
      const pose = await api('POST', '../api/v1/vente/remise', { remiseId: REMISE, venteId: v });
      const net = await V.net(v, REMISE);
      ok('VC-05/07 précondition : remise de 10 % posée et appliquée (prix ' + P.pu + ' F, TVA 18 %)', pose.success === true && remiseLignes(v) > 0,
        'pose ' + JSON.stringify(pose).slice(0, 80) + ' ; net ' + JSON.stringify(net).slice(0, 200));
      const c = await V.cloturer(v, { remiseId: REMISE });
      const e = C.vente(v);
      ok('VC-05 attendu : TVA de la vente = somme des TVA des lignes', e.tva === tvaLignes(v),
        'clôture ' + c.success + ' ; TVA en-tête ' + e.tva + ' ; somme des lignes ' + tvaLignes(v) + ' ; TVA du mouvement de caisse '
        + q("SELECT GROUP_CONCAT(montantTva) FROM mvttransaction WHERE pkey = '" + v + "'"));
      const t = q("SELECT CONCAT_WS('|', montantRemise, montantNet, montantPaye) FROM mvttransaction WHERE pkey = '" + v + "'");
      ok('VC-07 attendu : la remise enregistrée est celle affichée et encaissée (prix − remise = net payé)',
        e.prix - e.remise === Number(t.split('|')[2]),
        'remise affichée ' + net.remise + ' ; net affiché ' + net.montantNet + ' ; remise enregistrée (vente) ' + e.remise + ' ; prix − remise enregistrée '
        + (e.prix - e.remise) + ' ; transaction remise|net|payé ' + t);
    });

    /* VC-06 : net demandé sans remiseId sur une vente qui porte une remise */
    await cas('VC-06', async () => {
      const v = await V.ajouter(P, 1);
      await api('POST', '../api/v1/vente/remise', { remiseId: REMISE, venteId: v });
      await V.net(v, REMISE);
      const sans = await V.net(v, '');
      const c = await V.cloturer(v, { remiseId: '' });
      const e = C.vente(v);
      const t = q("SELECT CONCAT_WS('|', montant, montantRemise, montantPaye) FROM mvttransaction WHERE pkey = '" + v + "'");
      ok('VC-06 attendu : une vente encaissée au net sans remise n\'enregistre pas de remise (remise de la vente = 0)',
        e.remise === 0, 'net demandé sans remiseId ' + sans.montantNet + ' (plein tarif ' + P.pu + ') ; clôture ' + c.success
        + ' ; remise enregistrée sur la vente ' + e.remise + ' ; transaction montant|remise|payé ' + t);
    });

    /* VC-16 : mouvement de caisse saisi a une autre date */
    await cas('VC-16', async () => {
      const mvt = async (jour) => api('POST', '../api/v1/caisse/addmvtCaisse', { idTypeRegl: '1', numPieceComptable: MARQUE, idTypeMvt: '5', idModeRegle: '1', taux: 0,
        codeMonnaie: '', banque: '', lieux: '', amount: 1000, commentaire: MARQUE, dateMvt: q('SELECT CURDATE() + INTERVAL ' + jour + ' DAY') });
      const hier = await mvt(-1);
      const dates = (id) => q("SELECT CONCAT_WS(' | ', CONCAT('mouvement ', DATE(c.dt_DATE_MVT)), CONCAT('règlement ', (SELECT DATE(dt_REGLEMENT) FROM t_reglement WHERE str_REF_RESSOURCE = c.lg_MVT_CAISSE_ID LIMIT 1)),"
        + " CONCAT('transaction ', (SELECT GROUP_CONCAT(mvtdate) FROM mvttransaction WHERE pkey = c.lg_MVT_CAISSE_ID))) FROM t_mvt_caisse c WHERE c.lg_MVT_CAISSE_ID = '" + id + "'");
      const d1 = hier.mvtId ? dates(hier.mvtId) : '-';
      ok('VC-16 attendu : un mouvement de caisse saisi à la date d\'hier porte la même date dans le mouvement, le règlement et la transaction',
        hier.success === true && new Set(d1.match(/\d{4}-\d{2}-\d{2}/g) || []).size === 1, JSON.stringify(hier).slice(0, 100) + ' ; ' + d1);
      const demain = await mvt(1);
      ok('VC-16 attendu : un mouvement de caisse daté de demain est refusé', demain.success !== true,
        JSON.stringify(demain).slice(0, 100) + (demain.mvtId ? ' ; ' + dates(demain.mvtId) : ''));
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
