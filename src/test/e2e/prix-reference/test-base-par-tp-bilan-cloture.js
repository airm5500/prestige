/* LOT « BASE PAR TIERS-PAYANT » (Q2.5), TEST DE BILAN AVANT / APRES : la cloture par l'ecran d'une vente assurance a
 * deux organismes et deux references differentes laisse exactement les traces attendues, ni plus ni moins, parametre
 * a 0 puis a 1 (une vente par valeur, meme client, memes produits, memes references).
 *
 * Vente : A prioritaire 70 % (reference prix - 500 sur la ligne 1), B complementaire 20 % (reference prix - 1 000 sur
 * la ligne 1, prix - 300 sur la ligne 2) ; ligne 1 en quantite 1, ligne 2 en quantite 2.
 * Traces comparees avant / apres la cloture :
 *   - stock de chaque produit : avant - quantite, sur l'emplacement 1 ; un seul mouvement de stock par ligne,
 *     debut + mouvement = fin = stock lu ;
 *   - un seul mouvement de caisse (mvttransaction), une recette, un reglement, au net de la vente ;
 *   - parts des organismes en base = regle (minimum a 0, base propre a 1) ; encours du lien et de l'organisme :
 *     avant + part ;
 *   - taux_produit : exactement un taux par ligne et organisme ayant une reference, celui de la reference, et aucune
 *     autre ligne ; base de calcul par ligne ;
 *   - le journal des prix de reference n'est pas touche par la cloture (ni plus ni moins de lignes) ;
 *   - la vente a 1 differe de la vente a 0 exactement par les parts (A plus grand), pas par les autres traces.
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/prix-reference/test-base-par-tp-bilan-cloture.js
 */
const C = require('./commun');
const L = require('../ligne-comptant/commun');
const { ok, q, exec, A } = C;
const CLE = 'KEY_PRIX_REF_BASE_PAR_TP';
const arrondi5 = (n) => { const m = n % 5; return m <= 2 ? n - m : n - m + 5; };

const mvtStock = (venteId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(h.lg_FAMILLE_ID, ':', h.qteDebut, '-', h.qteMvt, '=', h.qteFinale, '@', h.lg_EMPLACEMENT_ID) ORDER BY h.lg_FAMILLE_ID SEPARATOR ';'), 'aucun')"
  + " FROM hmvtproduit h JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = h.lg_PREENREGISTREMENT_DETAIL_ID WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");
const nbMvtStock = (produits, depuis) => Number(q("SELECT COUNT(*) FROM hmvtproduit WHERE lg_FAMILLE_ID IN ('" + produits.join("','") + "') AND createdAt >= '" + depuis + "'"));
const journal = (produits) => Number(q("SELECT COUNT(*) FROM prix_reference_journal WHERE produit_id IN ('" + produits.join("','") + "')"));
const tauxProduit = (venteId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '|', t.compte_tiers_payant_id, '=', ROUND(t.taux * 100)) ORDER BY d.lg_FAMILLE_ID, t.compte_tiers_payant_id SEPARATOR ';'), 'aucun')"
  + " FROM taux_produit t JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = t.sale_iem_id WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_LIGNE_COMPTANT_VO', '0');
  A.parametre(CLE, '0');
  const TA = A.tiersPayant('B7A', '1'), TB = A.tiersPayant('B7B', '1');
  const P1 = C.produitSansReference(10), P2 = C.produitSansReference(11);
  const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
  const refA1 = P1.pu - 500, refB1 = P1.pu - 1000, refB2 = P2.pu - 300;
  const prix = P1.pu + 2 * P2.pu;
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const resultats = {};
  try {
    const cl = await A.clientAssure(api, 'REF7', [{ tp: TA, taux: 70 }, { tp: TB, taux: 20 }]);
    const compteA = cl.clientId + '-L0', compteB = cl.clientId + '-L1';
    /* references posees une fois, par la grille de la premiere vente */
    let premiere = true;

    for (const valeur of ['0', '1']) {
      exec("UPDATE t_parameters SET str_VALUE = '" + valeur + "' WHERE str_KEY = '" + CLE + "'");
      if (!premiere) { await C.nouvelleVente(p); }
      await C.passerEnAssurance(p);
      await C.choisirClient(p, C.MARQUE + ' REF7');
      await C.saisirBon(p, 1, C.MARQUE + '-BON-B7-' + valeur);
      await C.taperArticle(p, CIP1);
      await C.taperArticle(p, CIP2);
      const venteId = await C.venteCourante(p);
      C.noterVente(venteId);
      await C.saisirQuantite(p, CIP2, 2);
      await C.ajouterTiersPayant(p, TB);
      await C.saisirBon(p, 2, C.MARQUE + '-BON-B7B-' + valeur); /* le net exige un numero de bon par organisme */
      if (premiere) {
        for (const s of [[CIP1, TA, 'valeur', refA1], [CIP1, TB, 'valeur', refB1], [CIP2, TB, 'valeur', refB2]]) { await C.saisirEtEnregistrer(p, s[0], s[1], s[2], s[3]); }
        premiere = false;
      }
      ok('Paramètre à ' + valeur + ' : vente assurance à deux organismes et deux lignes (1 et 2), références posées', !!venteId
        && C.references(P1.id) === TA + '/MIX_TAUX_PRIX/' + refA1 + '/70/1 ; ' + TB + '/MIX_TAUX_PRIX/' + refB1 + '/20/1' && C.references(P2.id) === TB + '/MIX_TAUX_PRIX/' + refB2 + '/20/1',
        C.references(P1.id) + ' | ' + C.references(P2.id));

      /* parts attendues selon la regle de la valeur */
      let partA, partB;
      if (valeur === '0') {
        /* minimum des references de la ligne, pour tous : ligne 1 base refB1, ligne 2 base refB2 x 2 */
        partA = Math.round(refB1 * 0.7) + Math.round(refB2 * 2 * 0.7);
        partB = Math.min(Math.round(refB1 * 0.2), refB1 - Math.round(refB1 * 0.7)) + Math.min(Math.round(refB2 * 2 * 0.2), refB2 * 2 - Math.round(refB2 * 2 * 0.7));
      } else {
        partA = Math.round(refA1 * 0.7) + Math.round(P2.pu * 2 * 0.7);
        partB = Math.min(Math.round(refB1 * 0.2), P1.pu - Math.round(refA1 * 0.7)) + Math.min(Math.round(refB2 * 2 * 0.2), P2.pu * 2 - Math.round(P2.pu * 2 * 0.7));
      }

      /* AVANT */
      const avant = { stock: [A.stock(P1), A.stock(P2)], encoursLienA: A.encoursLien(compteA), encoursLienB: A.encoursLien(compteB), encoursTpA: A.encoursTp(TA), encoursTpB: A.encoursTp(TB),
        journal: journal([P1.id, P2.id]), mvtStock: nbMvtStock([P1.id, P2.id], A.DEBUT), mouvements: L.mouvements(venteId), recettes: L.recettes(venteId), reglements: L.reglements(venteId) };
      ok('Paramètre à ' + valeur + ' : avant la clôture, aucun mouvement de caisse, aucune recette, aucun règlement pour la vente',
        avant.mouvements === 'aucun' && avant.recettes === 'aucune' && avant.reglements === 'aucun', JSON.stringify(avant));

      /* CLOTURE par l'ecran */
      const clot = await L.terminerVente(p, false);
      ok('Paramètre à ' + valeur + ' : TERMINER LA VENTE, succès', clot.http === 200 && clot.success === true, JSON.stringify(clot).slice(0, 300));

      /* APRES */
      const v = L.vente(venteId);
      const tp = {}; A.lignesTp(venteId).split(' ; ').forEach((x) => { const c = x.split('/'); tp[c[0]] = Number(c[2]); });
      ok('Paramètre à ' + valeur + ' : parts enregistrées A = ' + partA + ', B = ' + partB, tp[TA] === partA && tp[TB] === partB, A.lignesTp(venteId));
      const net = arrondi5(prix - partA - partB);
      ok('Paramètre à ' + valeur + ' : vente close, prix ' + prix + ', part client en base = prix - parts à 4 F près', v.statut === 'is_Closed' && v.prix === prix && Math.abs(v.partClient - (prix - partA - partB)) <= 4, JSON.stringify(v));
      ok('Paramètre à ' + valeur + ' : stock P1 = avant - 1, stock P2 = avant - 2 (emplacement 1)', A.stock(P1) === avant.stock[0] - 1 && A.stock(P2) === avant.stock[1] - 2,
        avant.stock.join('/') + ' -> ' + A.stock(P1) + '/' + A.stock(P2));
      const mvts = mvtStock(venteId);
      ok('Paramètre à ' + valeur + ' : un seul mouvement de stock par ligne, début - quantité = fin = stock lu',
        mvts === [P1.id + ':' + avant.stock[0] + '-1=' + (avant.stock[0] - 1) + '@1', P2.id + ':' + avant.stock[1] + '-2=' + (avant.stock[1] - 2) + '@1'].sort().join(';')
        && nbMvtStock([P1.id, P2.id], A.DEBUT) === avant.mvtStock + 2, mvts + ' (' + (nbMvtStock([P1.id, P2.id], A.DEBUT) - avant.mvtStock) + ' nouveaux)');
      const mouvements = L.mouvements(venteId), recettes = L.recettes(venteId), reglements = L.reglements(venteId);
      /* mvttransaction : type/montant/montantNet/montantCredit/montantVerse/montantRegle/montantPaye/... : montant = prix de la vente, credit = parts des
         organismes, verse = paye = net ; recette = net ; vente_reglement : type/montant/montant_attentu/montant_verse : montant = net */
      const m = mouvements.split('/');
      ok('Paramètre à ' + valeur + ' : un seul mouvement de caisse (prix ' + prix + ', crédit organismes ' + (partA + partB) + ', versé = payé = net ' + net + '), une recette au net, un règlement au net',
        mouvements.split(' ; ').length === 1 && m[1] === String(prix) && m[3] === String(partA + partB) && m[4] === String(net) && m[6] === String(net)
        && recettes.split(' ; ').length === 1 && recettes.split('/')[0] === String(net) && reglements.split(' ; ').length === 1 && reglements.split('/')[1] === String(net),
        mouvements + ' | ' + recettes + ' | ' + reglements);
      ok('Paramètre à ' + valeur + ' : encours du lien et de l\'organisme = avant + part (A puis B)',
        A.encoursLien(compteA) === avant.encoursLienA + partA && A.encoursTp(TA) === avant.encoursTpA + partA
        && A.encoursLien(compteB) === avant.encoursLienB + partB && A.encoursTp(TB) === avant.encoursTpB + partB,
        [A.encoursLien(compteA), A.encoursTp(TA), A.encoursLien(compteB), A.encoursTp(TB)].join('/') + ' avant ' + [avant.encoursLienA, avant.encoursTpA, avant.encoursLienB, avant.encoursTpB].join('/'));
      const taux = tauxProduit(venteId);
      /* a 0 : un taux par ligne et organisme ayant une reference ; a 1 : des qu'une reference existe sur la ligne, chaque organisme laisse sa trace
         (taux applique et base propre), relue par le ticket */
      const tauxAttendus = valeur === '0' ? [P1.id + '|' + compteA + '=70', P1.id + '|' + compteB + '=20', P2.id + '|' + compteB + '=20']
        : [P1.id + '|' + compteA + '=70', P1.id + '|' + compteB + '=20', P2.id + '|' + compteA + '=70', P2.id + '|' + compteB + '=20'];
      ok('Paramètre à ' + valeur + ' : taux_produit = ' + (valeur === '0' ? 'un taux par ligne et organisme ayant une référence (3)' : 'une trace par organisme sur chaque ligne portant une référence (4)') + ', sans doublon ni ligne en trop',
        taux === tauxAttendus.sort().join(';'), taux);
      const bases = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', IFNULL(calculation_base_price, 'NULL')) ORDER BY lg_FAMILLE_ID SEPARATOR ';') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
      const basesAttendues = valeur === '0' ? [P1.id + ':' + refB1, P2.id + ':' + refB2] : [P1.id + ':' + refA1, P2.id + ':' + refB2];
      ok('Paramètre à ' + valeur + ' : base de calcul par ligne = ' + (valeur === '0' ? 'le plus petit prix de référence' : 'la référence du premier organisme qui en a une'),
        bases === basesAttendues.sort().join(';'), bases);
      ok('Paramètre à ' + valeur + ' : le journal des prix de référence n\'a pas bougé à la clôture', journal([P1.id, P2.id]) === avant.journal, avant.journal + ' -> ' + journal([P1.id, P2.id]));
      resultats[valeur] = { partA, partB, net, mouvements: mouvements.split(' ; ').length, stock: [avant.stock[0] - A.stock(P1), avant.stock[1] - A.stock(P2)] };
    }
    ok('Entre 0 et 1, seules les parts changent (A plus grand à 1, net plus petit), pas les traces (stock, mouvements)',
      resultats['1'].partA > resultats['0'].partA && resultats['1'].net < resultats['0'].net && resultats['0'].mouvements === resultats['1'].mouvements
      && resultats['0'].stock.join('/') === resultats['1'].stock.join('/'), JSON.stringify(resultats));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    ok('Paramètre ' + CLE + ' remis à 0', q("SELECT IFNULL(str_VALUE, '') FROM t_parameters WHERE str_KEY = '" + CLE + "'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
