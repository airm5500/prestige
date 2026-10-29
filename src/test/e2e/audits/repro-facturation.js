/* REPRODUCTION — MODULE FACTURATION DES TIERS PAYANTS (constats F1, F2, F3, F4, F5, F6).
 * Factures definitives par le chemin des ecrans (« Edition des factures » : groupe-tierspayant/facturation-bons et
 * facturation-groupe, ancien controleur GroupeTierspayantController), provisoires par facturation/summary/generer,
 * reglement par reglement-facture/do-reglement. Tiers payants, clients, groupe et factures d'essai retires a la fin ;
 * compteur des numeros de facture remis a sa valeur.
 * FAIL = defaut reproduit (mesure entre crochets). Lancement seul : node src/test/e2e/audits/repro-facturation.js
 */
const C = require('./commun');
const { ok, q, exec, MARQUE } = C;
const FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };

(async () => {
  C.ouvrirCaisse();
  const compteur = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CODE_FACTURE'");
  C.etat.restaurations.push("UPDATE t_parameters SET str_VALUE = '" + compteur + "' WHERE str_KEY = 'KEY_CODE_FACTURE'");
  const P = C.produit(8, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0)");
  const sess = await C.connecter();
  const { api } = sess;
  const VO = C.venteAssurance(api);
  const jour = q('SELECT CURDATE()');
  const cas = async (id, f) => { try { await f(); } catch (e) { ok(id + ' : déroulé sans exception', false, (String(e.message).match(/ERROR.*/) || [])[0] || e.stack); } };
  const assure = async (code) => {
    const tp = C.tiersPayant(code, '1');
    const cl = await C.clientAssure(api, code, [{ tp, taux: 80 }]);
    const vendre = async (n) => (await VO.vendre(cl, [{ lien: cl.lien(tp), taux: 80, bon: MARQUE + '-' + code + '-' + n }], P, 1)).v;
    return { tp, cl, lien: cl.lien(tp), vendre };
  };
  const bon = (v) => q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  const statutBon = (b) => q("SELECT str_STATUT_FACTURE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'");
  const facturesDuBon = (b, provisoire) => q("SELECT IFNULL(GROUP_CONCAT(f.str_CODE_FACTURE), '') FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID"
    + " WHERE d.str_REF = '" + b + "' AND COALESCE(f.template, 0) = " + (provisoire ? 1 : 0)).split(',').filter(Boolean);
  const factureDuBon = (b) => q("SELECT f.lg_FACTURE_ID FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID WHERE d.str_REF = '" + b + "' AND COALESCE(f.template, 0) = 0 LIMIT 1");
  const definitive = (tp, bons, mode) => api('POST', '../api/v1/groupe-tierspayant/facturation-bons', { MODE_SELECTION: String(mode === undefined ? 2 : mode),
    lg_TIERS_PAYANT_ID: tp, unselectedrecords: '[]', listProductSelected: JSON.stringify(bons || []), dt_start: jour, dt_end: jour }, FORM);
  try {
    /* F2 (chemin de l'ecran des definitives, puis provisoire) */
    let factureF1 = null, bonF1 = null;
    await cas('F2', async () => {
      const a = await assure('F2');
      const b1 = bon(await a.vendre(1));
      const r1 = await definitive(a.tp, [b1]);
      ok('F2 précondition : facture définitive générée, bon marqué « charged »', statutBon(b1) === 'charged' && facturesDuBon(b1).length === 1,
        JSON.stringify(r1) + ' ; statut ' + statutBon(b1) + ' ; factures ' + facturesDuBon(b1).join(','));
      const r2 = await definitive(a.tp, [b1]);
      ok('F2 attendu (définitive, écran resté ouvert) : un bon déjà facturé n\'est pas facturé une seconde fois',
        facturesDuBon(b1).length === 1, 'seconde génération ' + JSON.stringify(r2) + ' ; factures définitives portant le bon : ' + facturesDuBon(b1).join(', '));
      const r3 = await api('POST', '../api/v1/facturation/summary/generer', { dtStart: jour, dtEnd: jour, mode: 'BONS', codegroup: null, tpid: a.tp, typetp: null,
        groupTp: null, query: '', datas: [b1] });
      ok('F2 attendu (provisoire) : un bon déjà facturé n\'entre pas dans une facture provisoire',
        facturesDuBon(b1, true).length === 0, 'génération provisoire ' + JSON.stringify(r3) + ' ; provisoires portant le bon : ' + facturesDuBon(b1, true).join(', '));
      factureF1 = factureDuBon(b1); bonF1 = b1;
    });

    /* F1 */
    await cas('F1', async () => {
      const r = await api('DELETE', '../api/v1/facturation/' + factureF1);
      const existe = q("SELECT COUNT(*) FROM t_facture WHERE lg_FACTURE_ID = '" + factureF1 + "'");
      ok('F1 attendu : supprimer une facture définitive par DELETE facturation/{id} est refusé (ou ses bons redeviennent facturables)',
        existe === '1' || statutBon(bonF1) === 'unpaid', 'HTTP ' + r.http + ' ; facture encore en base ? ' + existe + ' ; statut du bon ' + statutBon(bonF1)
        + ' ; factures définitives restantes portant le bon : ' + (facturesDuBon(bonF1).join(',') || 'aucune'));
    });

    /* F3 : course entre deux generations ; repetee 5 fois pour en mesurer la frequence */
    await cas('F3', async () => {
      const paires = [];
      for (let i = 0; i < 5; i++) {
        const a = await assure('F3A' + i), b = await assure('F3B' + i);
        const ba = bon(await a.vendre(1)), bb = bon(await b.vendre(1));
        await Promise.all([definitive(a.tp, [ba]), definitive(b.tp, [bb])]);
        paires.push(q("SELECT GROUP_CONCAT(f.str_CODE_FACTURE ORDER BY f.str_CODE_FACTURE) FROM t_facture f WHERE f.lg_FACTURE_ID IN (SELECT lg_FACTURE_ID FROM t_facture_detail WHERE str_REF IN ('" + ba + "', '" + bb + "'))"));
      }
      const doublons = paires.filter((p) => new Set(p.split(',')).size < 2).length;
      ok('F3 attendu : 5 paires de générations simultanées produisent toujours deux numéros différents', doublons === 0,
        doublons + ' paire(s) sur 5 avec le même numéro : ' + paires.join(' ; '));
    });

    /* F4 */
    await cas('F4', async () => {
      const a = await assure('F4A'), b = await assure('F4B');
      const ba = bon(await a.vendre(1)), bb = bon(await b.vendre(1));
      await api('POST', '../api/v1/groupe-tierspayant/transaction', { mode: '0', str_LIBELLE: MARQUE + ' F4', str_ADRESSE: '', str_TELEPHONE: '', str_MODE_TRI_FACTURE: 'ALPHABETIQUE' }, FORM);
      const g = q("SELECT MAX(lg_GROUPE_ID) FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + MARQUE + " F4'");
      const rat = await api('POST', '../api/v1/groupe-tierspayant/transaction', { mode: '3', lg_GROUPE_ID: g, listtp: JSON.stringify([a.tp, b.tp]) }, FORM);
      const r = await api('POST', '../api/v1/groupe-tierspayant/facturation-groupe', { MODE_SELECTION: '0', lg_GROUPE_ID: g, dt_start: jour, dt_end: jour,
        listProductSelected: '[]', unselectedrecords: '[]' }, FORM);
      const filles = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', str_CODE_FACTURE, dbl_MONTANT_Brut, dbl_MONTANT_CMDE, IFNULL(str_PERE, '-'))), 'aucune') FROM t_facture"
        + " WHERE lg_FACTURE_ID IN (SELECT lg_FACTURE_ID FROM t_facture_detail WHERE str_REF IN ('" + ba + "', '" + bb + "'))");
      const groupe = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', str_CODE_FACTURE, dbl_MONTANT_Brut, dbl_MONTANT_CMDE)), 'aucune') FROM t_facture WHERE groupeTp_id = " + (g || 0)
        + " OR lg_FACTURE_ID IN (SELECT str_PERE FROM t_facture WHERE lg_FACTURE_ID IN (SELECT lg_FACTURE_ID FROM t_facture_detail WHERE str_REF IN ('" + ba + "', '" + bb + "')))");
      const sommeBrut = Number(q("SELECT COALESCE(SUM(dbl_MONTANT_Brut), 0) FROM t_facture WHERE lg_FACTURE_ID IN (SELECT lg_FACTURE_ID FROM t_facture_detail WHERE str_REF IN ('" + ba + "', '" + bb + "'))"));
      const groupeGroupe = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', str_CODE_FACTURE, int_AMOUNT)), 'aucune') FROM t_groupe_factures WHERE lg_GROUPE_ID = " + (g || 0));
      const sommeNet = Number(q("SELECT COALESCE(SUM(dbl_MONTANT_CMDE), 0) FROM t_facture WHERE lg_FACTURE_ID IN (SELECT lg_FACTURE_ID FROM t_facture_detail WHERE str_REF IN ('" + ba + "', '" + bb + "'))"));
      const sommeGroupe = Number(q('SELECT COALESCE(SUM(int_AMOUNT), 0) FROM t_groupe_factures WHERE lg_GROUPE_ID = ' + (g || 0)));
      /* Le chemin de l'ecran (GroupeTierspayantController.generateGroupeFacture) n'utilise pas l'agregation de
         GenererFactureServiceImpl visee par F4 : il range le groupe dans t_groupe_factures, une ligne par facture membre.
         On controle donc ce que l'ecran produit. */
      ok('F4 (chemin de l\'écran) attendu : montants du groupe = somme des factures membres (' + sommeNet + '), brut des membres = net (sans remise)',
        sommeGroupe === sommeNet && sommeNet > 0 && sommeBrut === sommeNet,
        'rattachement ' + rat.status + ' ; génération ' + JSON.stringify(r) + ' ; membres code/brut/net/père : ' + filles + ' ; t_groupe_factures code/montant : '
        + groupeGroupe + ' ; facture de groupe agrégée dans t_facture : ' + groupe);
    });

    /* F5 */
    await cas('F5', async () => {
      const a = await assure('F5');
      const b1 = bon(await a.vendre(1));
      await a.vendre(2);
      const part = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b1 + "'"));
      const avant = [C.encoursTp(a.tp), C.encoursLien(a.lien)];
      await definitive(a.tp, [b1]);
      ok('F5 attendu : facturer un seul des deux bons laisse l\'encours de l\'autre (' + part + ')',
        C.encoursLien(a.lien) === part && C.encoursTp(a.tp) === part,
        'encours organisme ' + avant[0] + ' → ' + C.encoursTp(a.tp) + ' ; encours client ' + avant[1] + ' → ' + C.encoursLien(a.lien));
    });

    /* F6 */
    await cas('F6', async () => {
      const a = await assure('F6');
      const b1 = bon(await a.vendre(1));
      await definitive(a.tp, [b1]);
      const f = factureDuBon(b1);
      const avant = q("SELECT CONCAT(dbl_MONTANT_PAYE, '|', dbl_MONTANT_RESTANT, '|', str_STATUT) FROM t_facture WHERE lg_FACTURE_ID = '" + f + "'");
      const client = q("SELECT str_CUSTOMER FROM t_facture WHERE lg_FACTURE_ID = '" + f + "'");
      const r = await api('POST', '../api/v1/reglement-facture/do-reglement', { lg_FACTURE_ID: f, str_CUSTOMER: client, MODE_REGLEMENT: '1', TYPE_REGLEMENT: '1',
        lg_NATURE_PAIEMENT: '2', NET_A_PAYER: '-5000', int_AMOUNT_RECU: '-5000', int_AMOUNT_REMIS: '0', int_TAUX_CHANGE: '0', LISTDOSSIERS: '[]', checkedList: '[]',
        dt_reglement: jour, str_LIEU: '', str_BANQUE: '', str_NOM: '', str_CODE_MONNAIE: '', mode: 'doReglement' }, FORM);
      const apres = q("SELECT CONCAT(dbl_MONTANT_PAYE, '|', dbl_MONTANT_RESTANT, '|', str_STATUT) FROM t_facture WHERE lg_FACTURE_ID = '" + f + "'");
      ok('F6 attendu : un règlement de facture de −5 000 F est refusé, facture inchangée', apres === avant,
        'réponse ' + JSON.stringify(r).slice(0, 140) + ' ; facture payé|restant|statut ' + avant + ' → ' + apres);
    });
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
