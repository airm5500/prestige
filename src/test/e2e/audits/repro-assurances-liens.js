/* REPRODUCTION — MODULE ASSURANCES : LIENS CLIENT / TIERS PAYANT (constats M1, M2, M3, M4).
 * Regle metier de reference : un seul RO actif par client, un carnet n'est jamais RO.
 * Clients d'essai crees par l'ecran client, tiers payants d'essai copies d'organismes existants.
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-assurances-liens.js
 */
const C = require('./commun');
const { ok, q, exec, MARQUE } = C;

/* liens du client : tiers payant / statut / RO / priorite */
const liens = (clientId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', REPLACE(l.lg_TIERS_PAYANT_ID, '" + MARQUE + "-TP-', ''), l.str_STATUT, CONCAT('RO=', l.b_IS_RO), CONCAT('prio=', l.int_PRIORITY))"
  + " ORDER BY l.dt_CREATED, l.lg_TIERS_PAYANT_ID SEPARATOR ' ; '), 'aucun') FROM t_compte_client_tiers_payant l JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
  + " WHERE c.lg_CLIENT_ID = '" + clientId + "'");
const nbRoActifs = (clientId) => Number(q("SELECT COUNT(*) FROM t_compte_client_tiers_payant l JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
  + " WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.str_STATUT = 'enable' AND l.b_IS_RO = 1"));

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(6, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0)");
  const sess = await C.connecter();
  const { api } = sess;
  const VO = C.venteAssurance(api);
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, (String(e.message).match(/ERROR.*/) || [])[0] || e.stack); } };
  try {
    /* N8 : creation d'un client assure par l'ecran */
    await cas('N8', async () => {
      const tp = C.tiersPayant('N8', '1');
      let r = null, erreur = null;
      try { r = await C.clientAssureParEcran(api, 'N8', [{ tp, taux: 80 }]); } catch (e) { erreur = e.message; }
      const id = r ? r.clientId : null;
      const enBase = id ? q("SELECT CONCAT_WS(' / ', (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + id + "'), (SELECT COUNT(*) FROM t_compte_client WHERE lg_CLIENT_ID = '" + id
        + "'), (SELECT COUNT(*) FROM t_ayant_droit WHERE lg_CLIENT_ID = '" + id + "'))") : '-';
      ok('N8 attendu : un client assuré créé avec succès par l\'écran existe en base (client / compte / ayant droit = 1 / 1 / 1)', enBase === '1 / 1 / 1',
        (erreur ? 'erreur ' + erreur.slice(0, 160) : 'réponse succès, identifiant ' + id) + ' ; en base client / compte / ayant droit : ' + enBase);
    });

    /* M1 */
    await cas('M1', async () => {
      const tpA = C.tiersPayant('M1A', '1'), tpK = C.tiersPayant('M1K', '2');
      const cl = await C.clientAssure(api, 'M1', [{ tp: tpA, taux: 80 }]);
      const avant = liens(cl.clientId);
      const r = await api('POST', '../api/v1/client/add/carnet', { bIsAbsolute: false, dbPLAFONDENCOURS: 0, dblQUOTACONSOMENSUELLE: 0, dtNAISSANCE: '',
        intPOURCENTAGE: 100, intPRIORITY: 1, lgCATEGORIEAYANTDROITID: '', lgCLIENTID: cl.clientId, lgCOMPANYID: '', lgRISQUEID: '', lgTIERSPAYANTID: tpK,
        lgTYPECLIENTID: '2', lgVILLEID: '', strADRESSE: '', strCODEPOSTAL: '', strFIRSTNAME: 'Essai', strLASTNAME: MARQUE + ' M1', compteTp: '',
        strNUMEROSECURITESOCIAL: MARQUE + '-M1', strSEXE: 'M', remiseId: null, forcerCreation: true });
      const apres = liens(cl.clientId);
      ok('M1 attendu : associer un carnet à un client assuré garde son assurance active et RO, le carnet n\'est pas RO',
        r.success === true && /M1A\/enable\/RO=1/.test(apres) && /M1K\/enable\/RO=0/.test(apres),
        'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres);
    });

    /* M2 */
    await cas('M2', async () => {
      const tpA = C.tiersPayant('M2A', '1'), tpB = C.tiersPayant('M2B', '1');
      const cl = await C.clientAssure(api, 'M2', [{ tp: tpA, taux: 80 }]);
      const { v } = await VO.vendre(cl, [{ lien: cl.lien(tpA), taux: 80, bon: MARQUE + '-M2' }], P, 1);
      const item = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: tpB, numBon: MARQUE + '-M2B', taux: 80, itemId: item, principal: true }] });
      ok('M2 attendu : après « Modifier client / tiers payant » vers un organisme non rattaché, le client n\'a qu\'un seul RO actif',
        r.success === true && nbRoActifs(cl.clientId) === 1, 'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; RO actifs ' + nbRoActifs(cl.clientId) + ' ; liens ' + liens(cl.clientId));
    });

    /* M3 */
    await cas('M3', async () => {
      const tpA = C.tiersPayant('M3A', '1'), tpB = C.tiersPayant('M3B', '1'), tpC = C.tiersPayant('M3C', '1');
      const cl = await C.clientAssure(api, 'M3', [{ tp: tpA, taux: 70 }, { tp: tpB, taux: 20 }]);
      const lA = cl.lien(tpA), lB = cl.lien(tpB);
      const { v } = await VO.vendre(cl, [{ lien: lA, taux: 70, bon: MARQUE + '-M3A' }, { lien: lB, taux: 20, bon: MARQUE + '-M3B' }], P, 1);
      /* le lien B est retire du client depuis sa fiche (meme geste que desabledCompteClientTiersPayant) */
      exec("UPDATE t_compte_client_tiers_payant SET str_STATUT = 'delete', int_PRIORITY = -1 WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lB + "'");
      const itemA = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lA + "'");
      const itemB = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lB + "'");
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: lA, numBon: MARQUE + '-M3A', taux: 70, itemId: itemA, principal: true },
          { compteTp: tpC, numBon: MARQUE + '-M3C', taux: 20, itemId: itemB, principal: false }] });
      const apres = liens(cl.clientId);
      ok('M3 attendu : la complémentaire C remplaçant un lien supprimé est créée active avec une priorité ≥ 1, sans hériter du lien supprimé',
        r.success === true && /M3C\/enable\/RO=0\/prio=[1-9]/.test(apres), 'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens ' + apres);
    });

    /* M2 et M3, variante « aucune case principal cochee » : updateTiersPayantPriority sort alors sans rien reclasser */
    await cas('M2b', async () => {
      const tpA = C.tiersPayant('M2bA', '1'), tpB = C.tiersPayant('M2bB', '1');
      const cl = await C.clientAssure(api, 'M2b', [{ tp: tpA, taux: 80 }]);
      const { v } = await VO.vendre(cl, [{ lien: cl.lien(tpA), taux: 80, bon: MARQUE + '-M2b' }], P, 1);
      const item = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: tpB, numBon: MARQUE + '-M2bB', taux: 80, itemId: item, principal: false }] });
      ok('M2 attendu (case « principal » non cochée) : un seul RO actif après le changement d\'organisme',
        r.success === true && nbRoActifs(cl.clientId) === 1, 'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; RO actifs ' + nbRoActifs(cl.clientId) + ' ; liens ' + liens(cl.clientId));
    });
    await cas('M3b', async () => {
      const tpA = C.tiersPayant('M3bA', '1'), tpB = C.tiersPayant('M3bB', '1'), tpC = C.tiersPayant('M3bC', '1');
      const cl = await C.clientAssure(api, 'M3b', [{ tp: tpA, taux: 70 }, { tp: tpB, taux: 20 }]);
      const lA = cl.lien(tpA), lB = cl.lien(tpB);
      const { v } = await VO.vendre(cl, [{ lien: lA, taux: 70, bon: MARQUE + '-M3bA' }, { lien: lB, taux: 20, bon: MARQUE + '-M3bB' }], P, 1);
      exec("UPDATE t_compte_client_tiers_payant SET str_STATUT = 'delete', int_PRIORITY = -1 WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lB + "'");
      const itemA = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lA + "'");
      const itemB = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lB + "'");
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: lA, numBon: MARQUE + '-M3bA', taux: 70, itemId: itemA, principal: false },
          { compteTp: tpC, numBon: MARQUE + '-M3bC', taux: 20, itemId: itemB, principal: false }] });
      const apres = liens(cl.clientId);
      ok('M3 attendu (case « principal » non cochée) : la complémentaire C est créée active avec une priorité ≥ 1',
        r.success === true && /M3bC\/enable\/RO=0\/prio=[1-9]/.test(apres), 'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens ' + apres);
    });

    /* M4 */
    await cas('M4', async () => {
      const tpA = C.tiersPayant('M4A', '1'), tpK = C.tiersPayant('M4K', '2'), tpD = C.tiersPayant('M4D', '1');
      const cl = await C.clientAssure(api, 'M4', [{ tp: tpA, taux: 70 }, { tp: tpK, taux: 30 }, { tp: tpD, taux: 10 }]);
      const lA = cl.lien(tpA), lK = cl.lien(tpK), lD = cl.lien(tpD);
      const { v } = await VO.vendre(cl, [{ lien: lA, taux: 70, bon: MARQUE + '-M4A' }, { lien: lK, taux: 30, bon: MARQUE + '-M4K' }], P, 1);
      /* donnees telles que M1/M2 les laissent : carnet en priorite 1, assurance en 2 ; un lien supprime (priorite -1) */
      exec("UPDATE t_compte_client_tiers_payant SET int_PRIORITY = 1, b_IS_RO = 0 WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lK + "';"
        + "UPDATE t_compte_client_tiers_payant SET int_PRIORITY = 2, b_IS_RO = 1 WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lA + "';"
        + "UPDATE t_compte_client_tiers_payant SET str_STATUT = 'delete', int_PRIORITY = -1, b_IS_RO = 0 WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lD + "'");
      const avant = liens(cl.clientId);
      const items = q("SELECT GROUP_CONCAT(CONCAT(lg_COMPTE_CLIENT_TIERS_PAYANT_ID, '=', lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID)) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'")
        .split(',').reduce((m, x) => { const [k, i] = x.split('='); m[k] = i; return m; }, {});
      /* l'ecran pre-coche « principal » sur le lien de priorite 1 (TiersPayantParams : principal = int_PRIORITY == 1) : ici le carnet */
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: lK, numBon: MARQUE + '-M4K', taux: 30, itemId: items[lK], principal: true },
          { compteTp: lA, numBon: MARQUE + '-M4A', taux: 70, itemId: items[lA], principal: false }] });
      const apres = liens(cl.clientId);
      ok('M4 attendu : enregistrer la modification sans rien changer laisse l\'assurance RO et le carnet non RO',
        r.success === true && /M4A\/enable\/RO=1/.test(apres) && /M4K\/enable\/RO=0/.test(apres),
        'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres);
      ok('M4 attendu : le lien supprimé garde sa priorité -1 (il n\'est pas reclassé avec les liens actifs)', /M4D\/delete\/RO=0\/prio=-1/.test(apres), apres);
    });
    /* Point 21 (28/10) : vente assurance → « Modifier infos client » (VenteCtr.onBtnAddClientAssuranceClick → client/add/assurance).
       Regles : l'ancien RO reste actif en priorite libre ; une priorite n'est portee que par un seul lien actif ; un seul lien
       par organisme. */
    const modifierInfos = (cl, nom, tpRo, lienRo, complementaires) => api('POST', '../api/v1/client/add/assurance', { bIsAbsolute: false, dbPLAFONDENCOURS: 0,
      dblQUOTACONSOMENSUELLE: 0, dtNAISSANCE: '', intPOURCENTAGE: 80, intPRIORITY: 1, lgCATEGORIEAYANTDROITID: '', lgCLIENTID: cl.clientId, lgCOMPANYID: '',
      lgRISQUEID: '', lgTIERSPAYANTID: tpRo, lgTYPECLIENTID: '1', lgVILLEID: '', strADRESSE: '', strCODEPOSTAL: '', strFIRSTNAME: 'ESSAI',
      strLASTNAME: MARQUE + ' ' + nom, compteTp: lienRo, strNUMEROSECURITESOCIAL: MARQUE + '-' + nom, strSEXE: 'M',
      tiersPayants: complementaires.map((t) => ({ compteTp: t.lien || '', lgTIERSPAYANTID: t.tp, numSecurity: MARQUE + '-' + nom + '-' + t.order, order: t.order,
        taux: t.taux, bIsAbsolute: false, dbPLAFONDENCOURS: 0, tpFullName: '' })) });
    /* priorites des liens actifs portees par plus d'un lien, et organismes rattaches par plus d'un lien */
    const doublons = (clientId) => q("SELECT CONCAT_WS(' / ', IFNULL((SELECT GROUP_CONCAT(x.p) FROM (SELECT l.int_PRIORITY p FROM t_compte_client_tiers_payant l JOIN t_compte_client c"
      + " ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.str_STATUT = 'enable' GROUP BY l.int_PRIORITY HAVING COUNT(*) > 1) x), '-'),"
      + " IFNULL((SELECT GROUP_CONCAT(REPLACE(y.t, '" + MARQUE + "-TP-', '')) FROM (SELECT l.lg_TIERS_PAYANT_ID t FROM t_compte_client_tiers_payant l JOIN t_compte_client c"
      + " ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + clientId + "' GROUP BY l.lg_TIERS_PAYANT_ID HAVING COUNT(*) > 1) y), '-'))");
    const prioritesValides = (clientId) => q("SELECT COUNT(*) FROM t_compte_client_tiers_payant l JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
      + " WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.str_STATUT = 'enable' AND (l.int_PRIORITY IS NULL OR l.int_PRIORITY < 1)") === '0';

    await cas('P21-a', async () => {
      const tpA = C.tiersPayant('P21aA', '1'), tpB = C.tiersPayant('P21aB', '1'), tpC = C.tiersPayant('P21aC', '1');
      const cl = await C.clientAssure(api, 'P21a', [{ tp: tpA, taux: 80 }, { tp: tpC, taux: 20 }]);
      const avant = liens(cl.clientId);
      const r = await modifierInfos(cl, 'P21a', tpB, cl.lien(tpA), [{ tp: tpC, lien: cl.lien(tpC), order: 2, taux: 20 }]);
      const apres = liens(cl.clientId);
      ok('P21-a attendu : RO changé de A en B par « Modifier infos client » : B RO en priorité 1, A reste actif (non RO) en priorité libre, aucune priorité en double',
        r.success === true && /P21aB\/enable\/RO=1\/prio=1/.test(apres) && /P21aA\/enable\/RO=0\/prio=[3-9]/.test(apres) && /P21aC\/enable\/RO=0\/prio=2/.test(apres)
        && nbRoActifs(cl.clientId) === 1 && doublons(cl.clientId) === '- / -' && prioritesValides(cl.clientId),
        'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres + ' ; doublons priorité / organisme ' + doublons(cl.clientId));
    });

    await cas('P21-b', async () => {
      const tpA = C.tiersPayant('P21bA', '1'), tpC = C.tiersPayant('P21bC', '1'), tpD = C.tiersPayant('P21bD', '1');
      const cl = await C.clientAssure(api, 'P21b', [{ tp: tpA, taux: 70 }, { tp: tpC, taux: 20 }]);
      const avant = liens(cl.clientId);
      /* la grille propose l'ordre 2 pour le complementaire ajoute, deja porte par C */
      const r = await modifierInfos(cl, 'P21b', tpA, cl.lien(tpA), [{ tp: tpC, lien: cl.lien(tpC), order: 2, taux: 20 }, { tp: tpD, order: 2, taux: 10 }]);
      const apres = liens(cl.clientId);
      ok('P21-b attendu : un complémentaire ajouté avec une priorité déjà occupée prend la priorité libre suivante',
        r.success === true && /P21bA\/enable\/RO=1\/prio=1/.test(apres) && /P21bC\/enable\/RO=0\/prio=2/.test(apres) && /P21bD\/enable\/RO=0\/prio=3/.test(apres)
        && doublons(cl.clientId) === '- / -' && prioritesValides(cl.clientId),
        'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres + ' ; doublons priorité / organisme ' + doublons(cl.clientId));
    });

    await cas('P21-c', async () => {
      const tpA = C.tiersPayant('P21cA', '1'), tpC = C.tiersPayant('P21cC', '1');
      const cl = await C.clientAssure(api, 'P21c', [{ tp: tpA, taux: 80 }, { tp: tpC, taux: 20 }]);
      const avant = liens(cl.clientId);
      /* le complementaire C devient RO : la grille ne le liste plus */
      const r = await modifierInfos(cl, 'P21c', tpC, cl.lien(tpA), []);
      const apres = liens(cl.clientId);
      ok('P21-c attendu : RO changé vers un organisme déjà rattaché : son lien est repris (pas de second lien), RO en priorité 1 ; A reste actif en priorité libre',
        r.success === true && /P21cC\/enable\/RO=1\/prio=1/.test(apres) && /P21cA\/enable\/RO=0\/prio=[2-9]/.test(apres)
        && nbRoActifs(cl.clientId) === 1 && doublons(cl.clientId) === '- / -' && prioritesValides(cl.clientId),
        'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres + ' ; doublons priorité / organisme ' + doublons(cl.clientId));
    });

    await cas('P21-d', async () => {
      const tpA = C.tiersPayant('P21dA', '1'), tpC = C.tiersPayant('P21dC', '1');
      const cl = await C.clientAssure(api, 'P21d', [{ tp: tpA, taux: 80 }, { tp: tpC, taux: 20 }]);
      const avant = liens(cl.clientId);
      /* non-regression : enregistrer sans rien changer ne touche ni aux priorites ni au RO */
      const r = await modifierInfos(cl, 'P21d', tpA, cl.lien(tpA), [{ tp: tpC, lien: cl.lien(tpC), order: 2, taux: 20 }]);
      const apres = liens(cl.clientId);
      ok('P21-d attendu (non-régression) : enregistrer la fiche sans changement garde A RO en priorité 1 et C en priorité 2',
        r.success === true && apres === avant, 'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres);
    });

    await cas('P21-e', async () => {
      const tpA = C.tiersPayant('P21eA', '1'), tpC = C.tiersPayant('P21eC', '1'), tpD = C.tiersPayant('P21eD', '1');
      const cl = await C.clientAssure(api, 'P21e', [{ tp: tpA, taux: 80 }, { tp: tpC, taux: 20 }]);
      const lA = cl.lien(tpA), lC = cl.lien(tpC);
      const { v } = await VO.vendre(cl, [{ lien: lA, taux: 80, bon: MARQUE + '-P21eA' }, { lien: lC, taux: 20, bon: MARQUE + '-P21eC' }], P, 1);
      const items = q("SELECT GROUP_CONCAT(CONCAT(lg_COMPTE_CLIENT_TIERS_PAYANT_ID, '=', lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID)) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'")
        .split(',').reduce((m, x) => { const [k, i] = x.split('='); m[k] = i; return m; }, {});
      const avant = liens(cl.clientId);
      /* « Modifier info client » de Ventes terminees : le complementaire C remplace par D (non rattache), case « principal » non cochee */
      const r = await api('POST', '../api/v1/vente/updateclientortierpayant', { clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, venteId: v,
        tierspayants: [{ compteTp: lA, numBon: MARQUE + '-P21eA', taux: 80, itemId: items[lA], principal: false },
          { compteTp: tpD, numBon: MARQUE + '-P21eD', taux: 20, itemId: items[lC], principal: false }] });
      const apres = liens(cl.clientId);
      ok('P21-e attendu : le lien créé par la modification de vente ne reprend pas une priorité déjà occupée',
        r.success === true && /P21eD\/enable\/RO=0\/prio=3/.test(apres) && doublons(cl.clientId) === '- / -' && prioritesValides(cl.clientId),
        'réponse ' + JSON.stringify(r).slice(0, 80) + ' ; liens avant ' + avant + ' ; après ' + apres + ' ; doublons priorité / organisme ' + doublons(cl.clientId));
    });

    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
