/* REPRODUCTION — MODULE VENTE ASSURANCE (constats CR-01, CR-02, CR-03, CR-04, CR-05/N3, CR-06, CR-07, CR-09, CR-10,
 * CA-03, CA-09/N5). Tiers payants d'essai (copies d'un organisme existant, compteurs a zero) et clients d'essai crees
 * par l'ecran client ; chaque cas a ses propres tiers payants, pour que les compteurs ne se melangent pas.
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-vente-assurance.js
 */
const C = require('./commun');
const { ok, q, exec, MARQUE } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(5, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0)");
  const sess = await C.connecter();
  const { api } = sess;
  const VO = C.venteAssurance(api);
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, (String(e.message).match(/ERROR.*/) || [])[0] || e.stack); } };
  /* un tiers payant et un client a un seul tiers payant, a 80 % */
  const simple = async (suffixe, taux) => {
    const tp = C.tiersPayant(suffixe, '1');
    const cl = await C.clientAssure(api, suffixe, [{ tp, taux: taux || 80 }]);
    return { tp, cl, lien: cl.lien(tp), tps: (bon) => [{ lien: cl.lien(tp), taux: taux || 80, bon: bon || MARQUE + '-' + suffixe + '-' + Date.now() }] };
  };
  try {
    /* CR-01 */
    await cas('CR-01', async () => {
      const s = await simple('CR01');
      const { v, c } = await VO.vendre(s.cl, s.tps(), P, 1);
      const part = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
      const apresVente = [C.encoursTp(s.tp), C.encoursLien(s.lien)];
      ok('CR-01 précondition : vente assurance encaissée, encours organisme et client = part tiers payant (' + part + ')',
        part > 0 && apresVente[0] === part && apresVente[1] === part, 'encours organisme|client ' + apresVente.join('|') + ' ; net ' + c.net.montantNet);
      const a = await api('GET', '../api/v1/vente/annulation/' + v);
      ok('CR-01 attendu : après annulation, l\'encours revient à 0', a.success === true && C.encoursTp(s.tp) === 0 && C.encoursLien(s.lien) === 0,
        'annulation ' + a.success + ' ; encours organisme ' + apresVente[0] + ' → ' + C.encoursTp(s.tp) + ' ; encours client ' + apresVente[1] + ' → ' + C.encoursLien(s.lien));
    });

    /* CR-02 */
    await cas('CR-02', async () => {
      const s = await simple('CR02');
      const { v } = await VO.vendre(s.cl, s.tps(), P, 1);
      const part = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
      await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
      const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' AND copy = 1 AND str_STATUT = 'is_Process' LIMIT 1");
      ok('CR-02 précondition : modification ouverte', !!copie, copie);
      C.etat.ventes.push(copie);
      const c = await VO.cloturer(s.cl, copie, s.tps());
      ok('CR-02 attendu : modification sans changement → encours = une seule part (' + part + ')',
        c.success === true && C.encoursTp(s.tp) === part && C.encoursLien(s.lien) === part,
        'clôture copie ' + JSON.stringify({ s: c.success, m: c.msg }) + ' ; encours organisme ' + C.encoursTp(s.tp) + ' ; encours client ' + C.encoursLien(s.lien));
    });

    /* CR-03 */
    await cas('CR-03', async () => {
      const tpA = C.tiersPayant('CR03A', '1'), tpB = C.tiersPayant('CR03B', '1');
      const cl = await C.clientAssure(api, 'CR03', [{ tp: tpA, taux: 50 }, { tp: tpB, taux: 30 }]);
      const lA = cl.lien(tpA), lB = cl.lien(tpB);
      await VO.vendre(cl, [{ lien: lA, taux: 50, bon: MARQUE + '-A1' }, { lien: lB, taux: 30, bon: MARQUE + '-DOUBLON' }], P, 1);
      const avant = [C.encoursTp(tpA), C.encoursTp(tpB)];
      const tps2 = [{ lien: lA, taux: 50, bon: MARQUE + '-A2' }, { lien: lB, taux: 30, bon: MARQUE + '-DOUBLON' }];
      const v2 = await VO.ajouter(cl, tps2, P, 1);
      const c2 = await VO.cloturer(cl, v2, tps2);
      ok('CR-03 attendu : clôture refusée (bon déjà utilisé) → aucun encours modifié, aucune ligne tiers payant close',
        c2.success === false && C.encoursTp(tpA) === avant[0] && C.encoursTp(tpB) === avant[1] && !/is_Closed/.test(C.lignesTp(v2)),
        'clôture ' + JSON.stringify({ s: c2.success, m: (c2.msg || '').replace(/<[^>]+>/g, '') }).slice(0, 160) + ' ; encours A ' + avant[0] + ' → ' + C.encoursTp(tpA)
        + ' ; encours B ' + avant[1] + ' → ' + C.encoursTp(tpB) + ' ; vente ' + C.vente(v2).statut + ' ; lignes ' + C.lignesTp(v2));
      const c3 = await VO.cloturer(cl, v2, tps2);
      ok('CR-03 attendu : un second essai identique ne recompte rien', C.encoursTp(tpA) === avant[0],
        'second essai ' + c3.success + ' ; encours A ' + avant[0] + ' → ' + C.encoursTp(tpA));
    });

    /* CR-04 */
    await cas('CR-04', async () => {
      const s = await simple('CR04');
      const tps = (i) => s.tps(MARQUE + '-CR04-' + i);
      const ventes = [];
      for (let i = 0; i < 6; i++) { ventes.push(await VO.ajouter(s.cl, tps(i), P, 1)); }
      const res = [];
      for (let i = 0; i < 6; i += 2) {
        res.push(...await Promise.all([VO.cloturer(s.cl, ventes[i], tps(i)), VO.cloturer(s.cl, ventes[i + 1], tps(i + 1))]));
      }
      const somme = Number(q("SELECT COALESCE(SUM(int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (" + C.liste(ventes) + ") AND str_STATUT = 'is_Closed'"));
      ok('CR-04 attendu : 3 paires de clôtures simultanées sur le même organisme → encours = somme des parts',
        C.encoursTp(s.tp) === somme && C.encoursLien(s.lien) === somme,
        'clôtures réussies ' + res.filter((r) => r.success).length + '/6 ; somme des parts ' + somme + ' ; encours organisme ' + C.encoursTp(s.tp) + ' ; encours client ' + C.encoursLien(s.lien));
    });

    /* CR-07 */
    await cas('CR-07', async () => {
      const s = await simple('CR07');
      const v = await VO.ajouter(s.cl, s.tps(), P, 1);
      const c = await VO.cloturer(s.cl, v, s.tps(), { falsifier: (d) => { d.tierspayants.forEach((t) => { t.tpnet = 1; t.taux = 1; }); } });
      const ligne07 = C.lignesTp(v).split('/');
      ok('CR-07 attendu : une part de 1 F et un taux de 1 % renvoyés par le poste (calcul serveur : 80 %) sont refusés, ou ignorés au profit du calcul serveur',
        c.success === false || (ligne07[1] === '80' && Number(ligne07[2]) > 1), 'clôture ' + c.success + ' ; part calculée ' + JSON.stringify((c.net.montantTierspayants || []).map((m) => m.montant)) + ' ; ligne enregistrée '
        + C.lignesTp(v) + ' ; encours organisme ' + C.encoursTp(s.tp));
    });

    /* CR-09 et CR-10 */
    await cas('CR-09', async () => {
      const tpA = C.tiersPayant('CR09A', '1'), tpB = C.tiersPayant('CR09B', '1');
      const cl = await C.clientAssure(api, 'CR09', [{ tp: tpA, taux: 70 }, { tp: tpB, taux: 20 }]);
      const v = await VO.ajouter(cl, [{ lien: cl.lien(tpA), taux: 70, bon: 'X' }], P, 1);
      const r = await api('POST', '../api/v1/vente/addtp/' + v, { typeVenteId: cl.lien(tpB), qte: 250 });
      ok('CR-09 attendu : ajouter un tiers payant à 250 % est refusé', r.success === false, 'réponse ' + JSON.stringify(r).slice(0, 100) + ' ; lignes ' + C.lignesTp(v));
    });
    await cas('CR-10', async () => {
      const s = await simple('CR10');
      const { v } = await VO.vendre(s.cl, s.tps(), P, 1);
      const avant = C.lignesTp(v);
      const r = await api('GET', '../api/v1/vente/removetp/' + s.lien + '/' + v);
      ok('CR-10 attendu : retirer le tiers payant d\'une vente assurance encaissée est refusé, la ligne reste facturable',
        r.success === false && C.lignesTp(v) === avant, 'réponse ' + JSON.stringify(r).slice(0, 100) + ' ; lignes avant ' + avant + ' ; après ' + C.lignesTp(v));
    });

    /* CA-03 */
    await cas('CA-03', async () => {
      const tpX = C.tiersPayant('CA03X', '1', 'to_be_exclude = 1');
      const clX = await C.clientAssure(api, 'CA03X', [{ tp: tpX, taux: 80 }]);
      const s = await simple('CA03');
      const { v: vx } = await VO.vendre(clX, [{ lien: clX.lien(tpX), taux: 80, bon: MARQUE + '-X1' }], P, 1);
      const ordinaires = [];
      for (let i = 0; i < 8; i++) { ordinaires.push((await VO.vendre(s.cl, s.tps(MARQUE + '-CA03-' + i), P, 1)).v); }
      const exclues = Number(q("SELECT COUNT(*) FROM vente_exclu WHERE preenregistrement_id IN (" + C.liste(ordinaires) + ")"));
      ok('CA-03 précondition : la vente du tiers payant exclu a sa ligne vente_exclu',
        q("SELECT COUNT(*) FROM vente_exclu WHERE preenregistrement_id = '" + vx + "'") === '1');
      ok('CA-03 attendu : aucune des 8 ventes ordinaires suivantes n\'a de ligne « vente exclue »', exclues === 0,
        exclues + ' vente(s) ordinaire(s) enregistrée(s) comme exclues, au nom de ' + q("SELECT IFNULL(GROUP_CONCAT(DISTINCT tiersPayant_id), '-') FROM vente_exclu WHERE preenregistrement_id IN (" + C.liste(ordinaires) + ")"));
      /* Le champ garde le tiers payant exclu, qui sera supprime au nettoyage : toute cloture assurance servie ensuite par
         cette instance echouerait (TransientPropertyValueException, constate le 25/10 a 23:35). Une vente sur un carnet
         depot NON exclu ecrase le champ sans rien enregistrer ; on verifie qu'une vente ordinaire se cloture encore. */
      const tpD = C.tiersPayant('CA03D', '1', 'is_depot = 1, account = 100000');
      const clD = await C.clientAssure(api, 'CA03D', [{ tp: tpD, taux: 80 }]);
      for (let i = 0; i < 3; i++) { await VO.vendre(clD, [{ lien: clD.lien(tpD), taux: 80, bon: MARQUE + '-CA03D-' + i }], P, 1); }
      const apres = await VO.vendre(s.cl, s.tps(MARQUE + '-CA03-fin'), P, 1);
      ok('CA-03 remise en état : une vente ordinaire après une vente « dépôt » n\'est plus enregistrée comme exclue',
        q("SELECT COUNT(*) FROM vente_exclu WHERE preenregistrement_id = '" + apres.v + "'") === '0');
    });

    /* CA-09 / N5 */
    await cas('CA-09', async () => {
      const tpA = C.tiersPayant('CA09A', '1'), tpB = C.tiersPayant('CA09B', '1');
      const cl = await C.clientAssure(api, 'CA09', [{ tp: tpA, taux: 80 }]);
      const lA = cl.lien(tpA);
      const { v } = await VO.vendre(cl, [{ lien: lA, taux: 80, bon: MARQUE + '-C9' }], P, 1);
      const part = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
      const item = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: tpB, numBon: MARQUE + '-C9B', taux: 80, itemId: item, principal: true }] });
      ok('CA-09 attendu : la part passe de l\'organisme A à l\'organisme B (encours A ' + part + ' → 0, B 0 → ' + part + ')',
        r.success === true && C.encoursTp(tpA) === 0 && C.encoursTp(tpB) === part,
        'réponse ' + JSON.stringify(r).slice(0, 100) + ' ; encours A ' + C.encoursTp(tpA) + ' ; encours B ' + C.encoursTp(tpB) + ' ; lignes ' + C.lignesTp(v));
      /* N5 : meme operation sur une vente deja facturee */
      const tpC = C.tiersPayant('CA09C', '1');
      const { v: v2 } = await VO.vendre(cl, [{ lien: lA, taux: 80, bon: MARQUE + '-C9F' }], P, 1);
      exec("UPDATE t_preenregistrement_compte_client_tiers_payent SET str_STATUT_FACTURE = 'charged' WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'");
      const item2 = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'");
      const r2 = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v2,
        tierspayants: [{ compteTp: tpC, numBon: MARQUE + '-C9G', taux: 80, itemId: item2, principal: true }] });
      ok('N5 attendu : changer le tiers payant d\'une vente déjà facturée (ligne « charged ») est refusé, la ligne facturée reste',
        r2.success === false && q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + item2 + "'") === '1',
        'réponse ' + JSON.stringify(r2).slice(0, 100) + ' ; ligne facturée encore présente ? '
        + q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + item2 + "'")
        + ' ; lignes de la vente ' + C.lignesTp(v2));
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
