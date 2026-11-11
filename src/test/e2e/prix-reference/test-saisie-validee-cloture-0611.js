/* PLAN DU 06/11, POINT 5.1 : UN PRIX OU UN TAUX DE REFERENCE SAISI A LA CAISSE N'EST ECRIT SUR LA FICHE ARTICLE
 * QU'A LA CLOTURE DE LA VENTE.
 *
 * Avant : la fiche (prix_reference) et le journal etaient ecrits des la validation de la cellule ; une vente abandonnee
 * laissait la fiche modifiee, et les ventes suivantes du meme produit avec le meme organisme reprenaient ce prix.
 *
 * Par l'ecran de vente (compte de test, KEY_PRIX_REF_CAISSE et KEY_LIGNE_COMPTANT_VO a 1 le temps du test) :
 *  A. vente abandonnee : vente assurance (organisme a 80 %), P3, P.REF saisi dans la cellule, puis « nouvelle vente »
 *     sans cloturer -> fiche de P3 et journal intacts ;
 *  B. vente 1 : P1 x 2, P2, P3 ; P.REF = prix - 150 sur P1, TAUX 60 sur P2, rien sur P3 :
 *     - P3 n'a rien repris de la vente abandonnee (grille : valeur par defaut) ;
 *     - avant la cloture : fiche et journal intacts pour P1 et P2, exactement 2 saisies gardees sur la vente ;
 *       la grille montre les saisies ; part de l'organisme au rail = regle (P.REF x 2 x 80 % + P2 x 60 % + P3 x 80 %) ;
 *     - TERMINER LA VENTE : fiche P1 = MIX_TAUX_PRIX / prix - 150 / 80, fiche P2 = MIX_TAUX_PRIX / prix de vente / 60,
 *       une ligne AJOUT au journal pour chacun avec la vente, plus aucune saisie gardee, part de l'organisme en base
 *       = part au rail avant la cloture ;
 *     - rapprochement ticket : « P[prix - 150] * T[80%] » sous P1, « Taux 60 % » sous P2, rien sous P3 (point 5.2) ;
 *  C. vente 2 : P1 -> la grille reprend la fiche (prix - 150, 80 %) sans saisie.
 * Bilan : stock, caisse, mouvements, ventes : seulement ce que font les clotures (verifie par les tests de bilan
 * existants) ; ici, prix_reference, journal et saisies gardees, avant / apres chaque etape.
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/prix-reference/test-saisie-validee-cloture-0611.js
 */
const C = require('./commun');
const L = require('../ligne-comptant/commun');
const { ok, q, A } = C;

/* saisies gardees sur la vente ; -1 si la table n'existe pas (ancien code : la saisie allait directement sur la fiche) */
const TABLE_SAISIES = q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'prix_reference_saisie'") === '1';
const saisies = (venteId) => (TABLE_SAISIES ? Number(q("SELECT COUNT(*) FROM prix_reference_saisie WHERE vente_id = '" + venteId + "'")) : -1);
const refTp = (ligne, tp) => (ligne && ligne.refs ? ligne.refs.find((r) => r.tpId === tp) : null) || {};

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_BASE_PAR_TP', '0');
  const TP = A.tiersPayant('SV', '1');
  const P = [C.produitSansReference(11), C.produitSansReference(12), C.produitSansReference(13)];
  const CIP = P.map(C.cip);
  const ventes = [];
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    await A.clientAssure(api, 'SV', [{ tp: TP, taux: 80 }]);
    const ouvrirAssurance = async (bon) => {
      await C.passerEnAssurance(p);
      await C.choisirClient(p, C.MARQUE + ' SV');
      await C.saisirBon(p, 1, C.MARQUE + '-BON-' + bon);
    };

    /* ============ A. vente abandonnee ============ */
    await ouvrirAssurance('SV0');
    await C.taperArticle(p, CIP[2]);
    const v0 = await C.venteCourante(p);
    C.noterVente(v0); ventes.push(v0);
    const r0 = await C.saisirEtEnregistrer(p, CIP[2], TP, 'valeur', P[2].pu - 200);
    ok('A. P.REF saisi sur P3 dans une vente qui sera abandonnée : accepté', r0.http === 200 && r0.success === true, JSON.stringify(r0).slice(0, 200));
    ok('A. Fiche de P3 et journal intacts après la saisie', C.references(P[2].id) === 'aucune' && C.journal(P[2].id) === 'aucun',
      C.references(P[2].id) + ' | ' + C.journal(P[2].id));
    await C.nouvelleVente(p);
    ok('A. Vente abandonnée (nouvelle vente sans clôture) : fiche de P3 toujours intacte', C.references(P[2].id) === 'aucune', C.references(P[2].id));

    /* ============ B. vente 1 ============ */
    await ouvrirAssurance('SV1');
    for (const c of CIP) { await C.taperArticle(p, c); }
    await C.saisirQuantite(p, CIP[0], 2);
    const v1 = await C.venteCourante(p);
    C.noterVente(v1); ventes.push(v1);
    const l3 = await C.ligne(p, CIP[2]);
    ok('B. P3 ne reprend rien de la vente abandonnée (valeur par défaut, 80 %)', refTp(l3, TP).defaut === true && refTp(l3, TP).taux === 80
      && refTp(l3, TP).valeur === P[2].pu, JSON.stringify(refTp(l3, TP)));

    const prixRef = P[0].pu - 150;
    const s1 = await C.saisirEtEnregistrer(p, CIP[0], TP, 'valeur', prixRef);
    const s2 = await C.saisirEtEnregistrer(p, CIP[1], TP, 'taux', 60);
    ok('B. P.REF sur P1 et TAUX 60 sur P2, saisis dans les cellules : acceptés', s1.success === true && s2.success === true,
      JSON.stringify([s1, s2]).slice(0, 300));
    ok('B. Avant la clôture : fiches de P1 et P2 et journal intacts', [0, 1].every((i) => C.references(P[i].id) === 'aucune' && C.journal(P[i].id) === 'aucun'),
      [0, 1].map((i) => C.references(P[i].id) + ' | ' + C.journal(P[i].id)).join(' || '));
    ok('B. Avant la clôture : exactement 2 saisies gardées sur la vente', saisies(v1) === 2, saisies(v1));
    const g1 = refTp(await C.ligne(p, CIP[0]), TP), g2 = refTp(await C.ligne(p, CIP[1]), TP);
    ok('B. La grille montre les saisies (P1 : ' + prixRef + ' / 80 % ; P2 : prix de vente / 60 %)', g1.valeur === prixRef && g1.taux === 80
      && g2.valeur === P[1].pu && g2.taux === 60, JSON.stringify([g1, g2]));
    const railAvant = await L.rail(p);
    const attendu = Math.round(prixRef * 2 * 0.8) + Math.round(P[1].pu * 0.6) + Math.round(P[2].pu * 0.8);
    ok('B. Part de l\'organisme au rail = règle (P.REF × 2 × 80 % + P2 × 60 % + P3 × 80 %, ±3 F)', railAvant && Math.abs(railAvant.montantTp - attendu) <= 3,
      'rail ' + (railAvant && railAvant.montantTp) + ' / attendu ' + attendu);

    const clot = await L.terminerVente(p, false);
    ok('B. TERMINER LA VENTE : succès', clot.success === true, JSON.stringify(clot).slice(0, 200));
    ok('B. Après la clôture : fiche P1 = MIX_TAUX_PRIX / ' + prixRef + ' / 80, fiche P2 = MIX_TAUX_PRIX / ' + P[1].pu + ' / 60',
      C.references(P[0].id) === TP + '/MIX_TAUX_PRIX/' + prixRef + '/80/1' && C.references(P[1].id) === TP + '/MIX_TAUX_PRIX/' + P[1].pu + '/60/1',
      C.references(P[0].id) + ' || ' + C.references(P[1].id));
    const j1 = C.journal(P[0].id), j2 = C.journal(P[1].id);
    ok('B. Journal : une ligne AJOUT pour P1 et pour P2, avec la vente', j1.split(' ; ').length === 1 && j1.startsWith('AJOUT/NULL/' + prixRef + '/NULL/80/MIX_TAUX_PRIX/' + v1 + '/')
      && j2.split(' ; ').length === 1 && j2.startsWith('AJOUT/NULL/' + P[1].pu + '/NULL/60/MIX_TAUX_PRIX/' + v1 + '/'), j1 + ' || ' + j2);
    ok('B. Après la clôture : plus aucune saisie gardée ; fiche de P3 intacte', saisies(v1) === 0 && C.references(P[2].id) === 'aucune',
      saisies(v1) + ' | ' + C.references(P[2].id));
    const partBase = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'"));
    ok('B. Rapprochement : part de l\'organisme en base = part au rail avant la clôture', partBase === railAvant.montantTp, partBase + ' / ' + railAvant.montantTp);

    const ap = await C.apercuTicket(p, v1);
    const t = ap.success ? C.lireTicket(ap.tickets[0]) : { articles: [] };
    const par = (cip, i) => t.articles.find((a) => a.designation === P[i].libelle) || t.articles[i];
    const a1 = par(CIP[0], 0), a2 = par(CIP[1], 1), a3 = par(CIP[2], 2);
    /* retour du 11/11 : des qu'une ligne imprime son detail, toutes l'impriment ; P3 suit le taux de l'assurance */
    ok('B. Ticket : « P[' + prixRef + '] * T[80%] » sous P1, « Taux 60 % » sous P2, « Taux 80 % » sous P3 (taux du contrat)',
      a1 && a1.credits.length === 1 && a1.credits[0].pref === prixRef && a1.credits[0].taux === 80
      && a2 && a2.credits.length === 1 && a2.credits[0].pref === null && a2.credits[0].taux === 60
      && a3 && a3.credits.length === 1 && a3.credits[0].pref === null && a3.credits[0].taux === 80
      && a1.credits[0].part + a2.credits[0].part + a3.credits[0].part === Object.keys(t.paires).filter((k) => k.indexOf(C.MARQUE + '-TP') === 0).map((k) => C.chiffres(t.paires[k]))[0],
      JSON.stringify(t.articles) + ' ' + JSON.stringify(t.paires));

    /* ============ C. vente 2 : la fiche est reprise ============ */
    await C.nouvelleVente(p);
    await ouvrirAssurance('SV2');
    await C.taperArticle(p, CIP[0]);
    const v2 = await C.venteCourante(p);
    C.noterVente(v2); ventes.push(v2);
    const g3 = refTp(await C.ligne(p, CIP[0]), TP);
    ok('C. Vente suivante : P1 reprend la fiche (' + prixRef + ', 80 %), sans saisie gardée', g3.valeur === prixRef && g3.taux === 80 && g3.defaut === false
      && saisies(v2) === 0, JSON.stringify(g3) + ' saisies ' + saisies(v2));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    const v = await C.venteCourante(p).catch(() => null);
    C.noterVente(v);
    if (v) { ventes.push(v); }
    if (TABLE_SAISIES) { ventes.filter(Boolean).forEach((x) => C.exec("DELETE FROM prix_reference_saisie WHERE vente_id = '" + x + "';")); }
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
