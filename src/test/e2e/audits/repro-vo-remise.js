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
  /* produit non remisable (code remise vide), meme filtre que P */
  const Q = C.produit(10, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0) AND f.int_PRICE >= 2000");
  const codeQ = q("SELECT IFNULL(str_CODE_REMISE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + Q.id + "'");
  C.etat.restaurations.push("UPDATE t_famille SET str_CODE_REMISE = " + (codeQ === 'NULL' ? 'NULL' : "'" + codeQ + "'") + " WHERE lg_FAMILLE_ID = '" + Q.id + "'");
  exec("UPDATE t_famille SET str_CODE_REMISE = NULL WHERE lg_FAMILLE_ID = '" + Q.id + "'");
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
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, (String(e.message).match(/ERROR.*/) || [])[0] || e.stack); } };
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
      /* le client paie le net arrondi a 5 F (200 pour une part de 201) : le montant regle doit etre ce montant paye, pas 0 */
      ok('CR-05 attendu : en espèces, le montant réglé de la transaction = montant payé par le client (net arrondi de la part client ' + e.partClient + ')',
        Number(t.split('|')[1]) === Number(t.split('|')[0]) && Number(t.split('|')[1]) >= e.partClient - 5,
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
    /* Regle du 26/10 : la remise d'un produit porte sur SA part client (prix de la ligne - part des organismes sur la
       ligne) ; un produit non remisable ne recoit rien mais sa part client reste due ; un plafond d'organisme est
       reparti sur ses lignes au prorata de sa part. */
    const remiseLignes = (v) => q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_PRICE, ':', int_PRICE_REMISE) SEPARATOR ';') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'")
      .split(';').reduce((m, l) => { const [f, prix, r] = l.split(':'); m[f] = { prix: Number(prix), remise: Number(r) }; return m; }, {});
    const remiseDe = (partClient) => Math.floor(Math.round(partClient) * 10 / 100);

    await cas('RÈGLE-1', async () => {
      const tp = C.tiersPayant('VRL1', '1');
      const cl = await C.clientAssure(api, 'VRL1', [{ tp, taux: 80 }]);
      const { v } = await VO.vendre(cl, [{ lien: cl.lien(tp), taux: 80, bon: MARQUE + '-L1' }], P, 1, { remiseId: REMISE });
      const e = C.vente(v), parts = partsTp(v), pc = e.prix - parts, attendue = remiseDe(pc);
      ok('Règle 1 attendu : produit remisable seul à 80 % : remise = part client (' + pc + ') × 10 % = ' + attendue + ', part client = ' + (pc - attendue),
        e.remise === attendue && remiseLignes(v)[P.id].remise === attendue && e.partClient === pc - attendue,
        'prix ' + e.prix + ' ; parts TP ' + parts + ' ; remise ' + e.remise + ' (ligne ' + remiseLignes(v)[P.id].remise + ') ; part client ' + e.partClient);
    });

    await cas('RÈGLE-2', async () => {
      const tp = C.tiersPayant('VRL2', '1');
      const cl = await C.clientAssure(api, 'VRL2', [{ tp, taux: 80 }]);
      const tps = [{ lien: cl.lien(tp), taux: 80, bon: MARQUE + '-L2' }];
      const v = await VO.ajouter(cl, tps, P, 1);
      await VO.ajouter(cl, tps, Q, 1, v);
      await api('POST', '../api/v1/vente/remise', { remiseId: REMISE, venteId: v });
      const c = await VO.cloturer(cl, v, tps, { remiseId: REMISE });
      const e = C.vente(v), l = remiseLignes(v), parts = partsTp(v);
      const partsLigne = (p) => parts * l[p.id].prix / (l[P.id].prix + l[Q.id].prix);
      const pcP = Math.round(l[P.id].prix - partsLigne(P)), attendue = remiseDe(pcP);
      ok('Règle 2 attendu : remisable + non remisable : remise sur la seule part client du remisable (' + pcP + ' → ' + attendue + '), 0 sur l\'autre, part client = total des parts client − remise',
        c.success === true && l[P.id].remise === attendue && l[Q.id].remise === 0 && e.remise === attendue && e.partClient === e.prix - parts - attendue,
        'clôture ' + c.success + ' ; prix ' + l[P.id].prix + ' + ' + l[Q.id].prix + ' ; parts TP ' + parts + ' ; remises lignes ' + l[P.id].remise + ' / ' + l[Q.id].remise
        + ' ; remise vente ' + e.remise + ' ; part client ' + e.partClient + ' (attendu ' + (e.prix - parts - attendue) + ')');
    });

    await cas('RÈGLE-3', async () => {
      const tp = C.tiersPayant('VRL3', '1');
      const cl = await C.clientAssure(api, 'VRL3', [{ tp, taux: 80 }]);
      exec("UPDATE t_compte_client_tiers_payant SET dbl_PLAFOND = 1000 WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + cl.lien(tp) + "'");
      const tps = [{ lien: cl.lien(tp), taux: 80, bon: MARQUE + '-L3' }];
      const v = await VO.ajouter(cl, tps, P, 1);
      await VO.ajouter(cl, tps, Q, 1, v);
      await api('POST', '../api/v1/vente/remise', { remiseId: REMISE, venteId: v });
      const c = await VO.cloturer(cl, v, tps, { remiseId: REMISE });
      const e = C.vente(v), l = remiseLignes(v), parts = partsTp(v);
      const pcP = Math.round(l[P.id].prix - parts * l[P.id].prix / (l[P.id].prix + l[Q.id].prix)), attendue = remiseDe(pcP);
      ok('Règle 3 attendu : plafond par vente de 1 000 : part de l\'organisme = 1 000, répartie au prorata ; remise sur la part client augmentée du remisable (' + pcP + ' → ' + attendue + ')',
        c.success === true && parts === 1000 && l[P.id].remise === attendue && l[Q.id].remise === 0 && e.remise === attendue && e.partClient === e.prix - parts - attendue,
        'clôture ' + c.success + ' ; prix ' + l[P.id].prix + ' + ' + l[Q.id].prix + ' ; parts TP ' + parts + ' ; remises lignes ' + l[P.id].remise + ' / ' + l[Q.id].remise
        + ' ; remise vente ' + e.remise + ' ; part client ' + e.partClient + ' (attendu ' + (e.prix - parts - attendue) + ')');
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
