/* REPRODUCTION — MODULE DIFFERES (constats DIF-01, DIF-02, DIF-03, D2/DIF-05, D3/DIF-06, D4/DIF-04, D5, DIF-07, DIF-08,
 * DIF-09). Ventes comptant reglees en differe (mode 4) pour des clients d'essai, reglements par la route de l'ecran
 * « Faire un reglement ». Invariant de reference : caisse nette de la vente + dette restante = prix de la vente.
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-differes.js
 */
const C = require('./commun');
const { ok, q, exec, MARQUE } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(4, 500);
  const clients = {};
  const client = (code) => {
    const id = MARQUE + '-CL-' + code;
    exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + id + "', 'Client', '" + MARQUE + ' ' + code + "', 'enable', NOW());"
      + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + id + "-cpt', '" + id + "', 'enable', NOW())");
    clients[code] = id;
    return id;
  };
  const sess = await C.connecter();
  const { api } = sess;
  const V = C.venteComptant(api);
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, e.stack); } };
  /* ligne de dette d'une vente : id | client | prix | reste | statut */
  const dette = (v) => q("SELECT CONCAT_WS('|', tp.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, cc.lg_CLIENT_ID, tp.int_PRICE, tp.int_PRICE_RESTE, tp.str_STATUT)"
    + " FROM t_preenregistrement_compte_client tp JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID WHERE tp.lg_PREENREGISTREMENT_ID = '" + v + "' LIMIT 1").split('|');
  const restes = (cl) => Number(q("SELECT COALESCE(SUM(tp.int_PRICE_RESTE), 0) FROM t_preenregistrement_compte_client tp JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID"
    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID WHERE cc.lg_CLIENT_ID = '" + cl + "' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND tp.str_STATUT = 'is_Closed'"));
  /* caisse nette d'une vente et de ses copies / annulations : montants payes des transactions de vente */
  const caisseVente = (v) => Number(q("SELECT COALESCE(SUM(m.montantPaye), 0) FROM mvttransaction m WHERE m.pkey IN (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement"
    + " WHERE lg_PREENREGISTREMENT_ID = '" + v + "' OR lg_PARENT_ID = '" + v + "' OR lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'"
    + " OR lg_PREENGISTREMENT_ANNULE_ID IN (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "'))"));
  const regle = async (cl, lignes, montant, recu) => {
    const attendus = {};
    lignes.forEach((l) => { attendus[l] = Number(q("SELECT int_PRICE_RESTE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = '" + l + "'")); });
    const total = Object.values(attendus).reduce((a, b) => a + b, 0);
    return api('POST', '../api/v1/reglement/reglementdiffere', { montantRecu: recu !== undefined ? recu : montant, montantRemis: 0, montantPaye: montant, clientId: cl,
      typeRegleId: '1', nom: '', banque: '', lieux: '', totalRecap: total, natureVenteId: q('SELECT CURDATE()'), commentaire: JSON.stringify(lignes),
      restesAttendus: JSON.stringify(attendus) });
  };
  const encaissementsReglement = (cl) => Number(q("SELECT COALESCE(SUM(dbl_AMOUNT), 0) FROM t_dossier_reglement WHERE str_ORGANISME_ID = '" + cl + "'"));
  const modifier = async (v) => {
    await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
    const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' AND copy = 1 AND str_STATUT = 'is_Process' LIMIT 1");
    if (copie) { C.etat.ventes.push(copie); }
    return copie;
  };
  const prix2 = 2 * P.pu;
  try {
    /* DIF-01 */
    await cas('DIF-01', async () => {
      const cl = client('D01');
      const v = await V.vendre(P, 2, { mode: '4', clientId: cl, recu: 0 });
      const copie = await modifier(v);
      const r = await regle(cl, [dette(v)[0]], P.pu);
      const c = await V.cloturer(copie, { mode: '4', clientId: cl, recu: 0 });
      const encaisse = encaissementsReglement(cl);
      ok('DIF-01 attendu : un règlement fait pendant la modification est refusé, ou déduit de la dette de la copie (caisse + dette = prix)',
        r.success === false || restes(cl) + encaisse === prix2,
        'règlement pendant modification ' + JSON.stringify({ s: r.success, m: r.msg }).slice(0, 100) + ' ; clôture copie ' + c.success + ' ; dette restante ' + restes(cl)
        + ' + réglé ' + encaisse + ' = ' + (restes(cl) + encaisse) + ' (prix ' + prix2 + ')');
    });

    /* DIF-02 */
    await cas('DIF-02', async () => {
      const cl = client('D02');
      const acompte = P.pu;
      const v = await V.vendre(P, 2, { mode: '4', clientId: cl, recu: acompte });
      const avant = [caisseVente(v), restes(cl)];
      const copie = await modifier(v);
      const c = await V.cloturer(copie, { mode: '4', clientId: cl, recu: 0 });
      const caisse = caisseVente(v);
      ok('DIF-02 précondition : vente différée de ' + prix2 + ' avec ' + acompte + ' d\'acompte ; caisse + dette = prix',
        avant[0] + avant[1] === prix2, 'caisse ' + avant[0] + ' ; dette ' + avant[1]);
      ok('DIF-02 attendu : après modification sans changement (copie en différé, 0 reçu), caisse + dette = prix',
        c.success === true && caisse + restes(cl) === prix2, 'clôture copie ' + c.success + ' ; caisse nette ' + caisse + ' + dette ' + restes(cl) + ' = '
        + (caisse + restes(cl)) + ' (prix ' + prix2 + ')');
    });

    /* DIF-03 */
    await cas('DIF-03', async () => {
      const cl1 = client('D03A'), cl2 = client('D03B');
      const v = await V.vendre(P, 2, { mode: '4', clientId: cl1, recu: 0 });
      await regle(cl1, [dette(v)[0]], P.pu);
      const copie = await modifier(v);
      const c = await V.cloturer(copie, { mode: '4', clientId: cl2, recu: 0 });
      const encaisse = encaissementsReglement(cl1);
      ok('DIF-03 attendu : vente déjà réglée de ' + P.pu + ' puis passée à un autre client : refus, ou règlement reporté (dettes + réglé = prix)',
        c.success === false || restes(cl1) + restes(cl2) + encaisse === prix2,
        'clôture copie ' + c.success + ' ; dette client 1 ' + restes(cl1) + ' ; dette client 2 ' + restes(cl2) + ' ; réglé par le client 1 ' + encaisse
        + ' ; total ' + (restes(cl1) + restes(cl2) + encaisse) + ' (prix ' + prix2 + ')');
    });

    /* D2 puis D3 */
    await cas('D2', async () => {
      const cl = client('D2');
      const v = await V.vendre(P, 2, { mode: '4', clientId: cl, recu: 0 });
      await regle(cl, [dette(v)[0]], P.pu);
      const a = await api('GET', '../api/v1/vente/annulation/' + v);
      ok('D2 attendu : annuler une vente différée déjà réglée en partie est refusé (ou un avoir est créé)',
        a.success === false, 'annulation ' + JSON.stringify({ s: a.success, m: a.msg }).slice(0, 100) + ' ; dette ' + restes(cl) + ' ; réglé resté en caisse ' + encaissementsReglement(cl));
      const autre = client('D3');
      const v3 = await V.vendre(P, 1, { mode: '4', clientId: autre, recu: 0 });
      await regle(autre, [dette(v3)[0]], 1);
      const j = q('SELECT CURDATE()');
      const l = await api('GET', '../api/v1/reglement/delayed?dtStart=' + j + '&dtEnd=' + j + '&clientId=');
      ok('D3 attendu : la liste des règlements de différés du jour montre les règlements de tous les clients (dont celui dont la vente a été annulée)',
        Number(l.total) >= 2, 'lignes renvoyées ' + l.total + ' (règlements du jour faits par le test : 2 clients)');
    });

    /* D4 */
    await cas('D4', async () => {
      const cl = client('D4');
      const acompte = P.pu;
      await V.vendre(P, 2, { mode: '4', clientId: cl, recu: acompte });
      const r = await api('GET', '../api/v1/reglement/releve?dtStart=2020-01-01&dtEnd=2030-12-31&clientId=' + cl);
      ok('D4 attendu : le solde du relevé = reste dû (prix ' + prix2 + ' − acompte ' + acompte + ' = ' + (prix2 - acompte) + ')',
        Number(r.soldeFinal) === restes(cl), 'solde du relevé ' + r.soldeFinal + ' ; reste dû ' + restes(cl));
    });

    /* D5 */
    await cas('D5', async () => {
      const cl = client('D5');
      const v = await V.vendre(P, 1, { mode: '4', clientId: cl, recu: 0 });
      exec("INSERT INTO t_preenregistrement_compte_client (lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, int_PRICE_RESTE)"
        + " SELECT '" + MARQUE + "-D5-DOUBLON', lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, int_PRICE_RESTE"
        + " FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      const a = await api('GET', '../api/v1/vente/annulation/' + v);
      const actives = q("SELECT COUNT(*) FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "' AND str_STATUT <> 'delete'");
      ok('D5 attendu : une vente portant deux lignes de dette (doublon, données réelles) est annulée sans laisser de dette',
        a.success === true && actives === '0', 'annulation ' + a.success + ' ; lignes de dette encore actives ' + actives + ' ; dette du client ' + restes(cl));
    });

    /* DIF-07 */
    await cas('DIF-07', async () => {
      const cl = client('D07');
      const v = await V.vendre(P, 2, { mode: '4', clientId: cl, recu: 0 });
      const r = await regle(cl, [dette(v)[0]], P.pu, 1);
      ok('DIF-07 attendu : un règlement partiel qui déclare 1 F reçu pour ' + P.pu + ' F payés est refusé',
        r.success === false, 'règlement ' + JSON.stringify({ s: r.success, m: r.msg }).slice(0, 80) + ' ; dette ' + restes(cl));
    });

    /* DIF-08 */
    await cas('DIF-08', async () => {
      const cl = client('D08');
      const v = await V.vendre(P, 1, { mode: '4', clientId: cl, recu: 0 });
      exec("UPDATE t_preenregistrement SET dt_UPDATED = dt_UPDATED - INTERVAL 30 DAY, dt_CREATED = dt_CREATED - INTERVAL 30 DAY WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
        + "UPDATE t_preenregistrement_compte_client SET dt_UPDATED = dt_UPDATED - INTERVAL 30 DAY, dt_CREATED = dt_CREATED - INTERVAL 30 DAY WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      const ligne = dette(v)[0];
      await regle(cl, [ligne], 1);
      const d = q("SELECT CONCAT(DATE(p.dt_UPDATED), ' | ', DATE(tp.dt_UPDATED)) FROM t_preenregistrement p JOIN t_preenregistrement_compte_client tp ON tp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE p.lg_PREENREGISTREMENT_ID = '" + v + "'");
      const il30 = q('SELECT CURDATE() - INTERVAL 30 DAY');
      ok('DIF-08 attendu : la date de la ligne de dette reste celle de la vente (il y a 30 jours) après un règlement',
        d.split(' | ')[1] === il30, 'date de la vente | date de la ligne de dette après règlement : ' + d + ' (la liste « Différés » affiche, trie et filtre sur cette date : ReglementServiceImpl.java:213-215, :242)');
    });

    /* DIF-09 */
    await cas('DIF-09', async () => {
      const cl = client('D09');
      const vAncienne = await V.vendre(P, 1, { mode: '4', clientId: cl, recu: 0 });
      exec("UPDATE t_preenregistrement SET dt_UPDATED = dt_UPDATED - INTERVAL 10 DAY WHERE lg_PREENREGISTREMENT_ID = '" + vAncienne + "'");
      const vRecente = await V.vendre(P, 1, { mode: '4', clientId: cl, recu: 0 });
      /* l'operateur clique la recente puis l'ancienne, et verse le prix d'une seule */
      await regle(cl, [dette(vRecente)[0], dette(vAncienne)[0]], P.pu);
      ok('DIF-09 attendu : un règlement partiel solde d\'abord la vente la plus ancienne',
        Number(dette(vAncienne)[3]) === 0, 'reste de l\'ancienne ' + dette(vAncienne)[3] + ' ; reste de la récente ' + dette(vRecente)[3]);
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
