/* LOT « BASE PAR TIERS-PAYANT » (Q2.5), TEST DE RAPPROCHEMENT ECRAN / TICKET / BASE, parametre a 1 : vente assurance a
 * deux organismes (A prioritaire 70 %, B complementaire 20 %) et deux lignes de quantites differentes (1 et 2), avec
 * des prix ET des taux de reference differents par organisme, cloturee par l'ecran ; puis le ticket relu (apercu, sans
 * impression) et rapproche, ligne par ligne et organisme par organisme, de l'ecran et de la base.
 *
 * Saisies dans la grille (cellules P.REF et TAUX, Entree) :
 *   ligne 1 (qte 1) : A -> prix - 500 a 60 % ; B -> prix - 1 000 a 30 % ;
 *   ligne 2 (qte 2) : B seulement -> prix - 300 a 30 % (A reste sur le prix de vente a 70 %).
 * Regle a 1, par ligne et par organisme : part = sa propre reference x quantite x son taux, bornee au reste de la
 * ligne ; ce que le ticket doit imprimer sur chaque ligne (« NOM · Taux x % : part ») et dans son bloc client.
 * Rapproches : taux par ligne et organisme (ecran = ticket = taux_produit) ; part par ligne et organisme (regle =
 * ticket) ; part de chaque organisme (somme des lignes du ticket = bloc client du ticket = base = ecran) ; base de
 * calcul de la ligne (base = P.REF imprime) ; net (ticket = ecran = prix - parts, arrondi a 5).
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/prix-reference/test-base-par-tp-rapprochement-ticket.js
 */
const C = require('./commun');
const L = require('../ligne-comptant/commun');
const { ok, q, A } = C;
const CLE = 'KEY_PRIX_REF_BASE_PAR_TP';
const arrondi5 = (n) => { const m = n % 5; return m <= 2 ? n - m : n - m + 5; };

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1'); /* les lignes « Taux x % : part » du ticket n'existent qu'avec ce parametre */
  A.parametre(CLE, '1');
  const TA = A.tiersPayant('B6A', '1'), TB = A.tiersPayant('B6B', '1');
  const P1 = C.produitSansReference(8), P2 = C.produitSansReference(9);
  const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
  const refA1 = P1.pu - 500, refB1 = P1.pu - 1000, refB2 = P2.pu - 300;
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  let venteId = null;
  try {
    const cl = await A.clientAssure(api, 'REF6', [{ tp: TA, taux: 70 }, { tp: TB, taux: 20 }]);
    const compteA = cl.clientId + '-L0', compteB = cl.clientId + '-L1';
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF6');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-R6');
    await C.taperArticle(p, CIP1);
    await C.taperArticle(p, CIP2);
    venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    await C.saisirQuantite(p, CIP2, 2);
    await C.ajouterTiersPayant(p, TB);
    const lignesBase = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_QUANTITY) ORDER BY lg_FAMILLE_ID SEPARATOR ';') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('Préparation : vente assurance sur A et B, deux lignes, quantités 1 et 2', !!venteId
      && lignesBase === [P1.id + ':1', P2.id + ':2'].sort().join(';'), lignesBase);

    /* saisies des references dans la grille */
    const saisies = [
      [CIP1, TA, 'valeur', refA1], [CIP1, TA, 'taux', 60], [CIP1, TB, 'valeur', refB1], [CIP1, TB, 'taux', 30],
      [CIP2, TB, 'valeur', refB2], [CIP2, TB, 'taux', 30]];
    let acceptees = 0;
    for (const s of saisies) { const r = await C.saisirEtEnregistrer(p, s[0], s[1], s[2], s[3]); if (r.http === 200 && r.success === true) { acceptees++; } }
    ok('Six saisies de référence acceptées (P.REF et TAUX, deux organismes, deux lignes)', acceptees === 6, acceptees + '/6');
    ok('Références en base : A ' + refA1 + '/60 et B ' + refB1 + '/30 sur la ligne 1, B ' + refB2 + '/30 sur la ligne 2',
      C.references(P1.id) === TA + '/MIX_TAUX_PRIX/' + refA1 + '/60/1 ; ' + TB + '/MIX_TAUX_PRIX/' + refB1 + '/30/1'
      && C.references(P2.id) === TB + '/MIX_TAUX_PRIX/' + refB2 + '/30/1', C.references(P1.id) + ' | ' + C.references(P2.id));

    /* la regle : parts attendues par ligne et par organisme */
    const l1A = Math.round(refA1 * 0.6), l1B = Math.min(Math.round(refB1 * 0.3), P1.pu - l1A);
    const l2A = Math.round(P2.pu * 2 * 0.7), l2B = Math.min(Math.round(refB2 * 2 * 0.3), P2.pu * 2 - l2A);
    const partA = l1A + l2A, partB = l1B + l2B;
    const prix = P1.pu + 2 * P2.pu;

    /* ecran : references par ligne, part et net du rail */
    const e1 = await C.ligne(p, CIP1), e2 = await C.ligne(p, CIP2);
    ok('Écran : taux par ligne et organisme = 60/30 sur la ligne 1, 70/30 sur la ligne 2',
      e1 && e2 && e1.refs.map((r) => r.taux).join('/') === '60/30' && e2.refs.map((r) => r.taux).join('/') === '70/30', JSON.stringify([e1 && e1.refs, e2 && e2.refs]));
    const serveur = await C.netServeur(sess, venteId);
    const partsServeur = {}; (serveur.data.tierspayants || []).forEach((t) => { partsServeur[t.compteTp] = t.tpnet; });
    ok('Règle : part de A = ' + partA + ' et part de B = ' + partB + ' (chacun sur sa référence × quantité × son taux)',
      partsServeur[compteA] === partA && partsServeur[compteB] === partB, JSON.stringify(partsServeur));
    const rail = await L.rail(p);
    ok('Écran : « Part TP » = A + B et net = prix - parts arrondi à 5', rail.tp && rail.tp.valeur === partA + partB && rail.net.valeur === arrondi5(prix - partA - partB),
      JSON.stringify(rail) + ' attendu ' + (partA + partB) + ' / ' + arrondi5(prix - partA - partB));

    /* cloture par l'ecran, sans impression */
    const clot = await L.terminerVente(p, false);
    ok('TERMINER LA VENTE : succès', clot.http === 200 && clot.success === true, JSON.stringify(clot).slice(0, 300));

    /* base */
    const tpBase = {}; A.lignesTp(venteId).split(' ; ').forEach((x) => { const c = x.split('/'); tpBase[c[0]] = Number(c[2]); });
    ok('Base : part enregistrée de A = ' + partA + ', de B = ' + partB + ' (= écran)', tpBase[TA] === partA && tpBase[TB] === partB, A.lignesTp(venteId));
    const bases = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', IFNULL(calculation_base_price, 'NULL')) ORDER BY lg_FAMILLE_ID SEPARATOR ';') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('Base : base de calcul de la ligne = référence du premier organisme qui en a une (' + refA1 + ' puis ' + refB2 + ')',
      bases === [P1.id + ':' + refA1, P2.id + ':' + refB2].sort().join(';'), bases);
    const tauxBase = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '|', t.compte_tiers_payant_id, '=', ROUND(t.taux * 100)) ORDER BY d.lg_FAMILLE_ID, t.compte_tiers_payant_id SEPARATOR ';'), 'aucun')"
      + " FROM taux_produit t JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = t.sale_iem_id WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    const tauxAttendus = [P1.id + '|' + compteA + '=60', P1.id + '|' + compteB + '=30', P2.id + '|' + compteB + '=30'].sort().join(';');
    ok('Base : un taux par ligne et organisme ayant une référence, celui de la référence, sans doublon', tauxBase === tauxAttendus, tauxBase + ' attendu ' + tauxAttendus);
    const vente = q("SELECT CONCAT_WS('|', str_STATUT, int_PRICE, int_CUST_PART) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'").split('|');
    ok('Base : vente close, prix ' + prix + ', part client = prix - parts à 4 F près', vente[0] === 'is_Closed' && Number(vente[1]) === prix && Math.abs(Number(vente[2]) - (prix - partA - partB)) <= 4, vente.join('|'));

    /* ticket */
    const apercu = await C.apercuTicket(p, venteId);
    ok('Aperçu du ticket produit sans impression', apercu.success === true && apercu.tickets.length === 1 && apercu.tickets[0].modele === 'VENTE_ASSURANCE', JSON.stringify(apercu).slice(0, 200));
    const t = C.lireTicket(apercu.tickets[0]);
    ok('Ticket : deux lignes, chacune avec une ligne de crédit par organisme (A puis B)', t.articles.length === 2
      && t.articles.every((a) => a.credits.length === 2 && a.credits[0].nom === TA && a.credits[1].nom === TB), JSON.stringify(t.articles));
    const credit = (i, nom) => (t.articles[i] && t.articles[i].credits.find((c) => c.nom === nom)) || { taux: null, part: null };
    /* l'ordre des lignes du ticket est celui de la saisie : P1 puis P2 */
    ok('Ticket : taux imprimé par ligne et organisme = taux appliqué (60/30 puis 70/30), pas le taux du contrat',
      credit(0, TA).taux === 60 && credit(0, TB).taux === 30 && credit(1, TA).taux === 70 && credit(1, TB).taux === 30,
      t.articles.map((a) => a.credits.map((c) => c.taux).join('/')).join(' ; '));
    ok('Ticket : part imprimée par ligne et organisme = règle (A ' + l1A + ' / ' + l2A + ', B ' + l1B + ' / ' + l2B + ')',
      credit(0, TA).part === l1A && credit(1, TA).part === l2A && credit(0, TB).part === l1B && credit(1, TB).part === l2B,
      t.articles.map((a) => a.credits.map((c) => c.nom.replace(C.MARQUE + '-TP-', '') + ':' + c.part).join(' ')).join(' ; '));
    const blocA = C.chiffres(t.paires[TA]), blocB = C.chiffres(t.paires[TB]);
    ok('Ticket : bloc client A = somme des lignes de A = base = écran ; idem B', blocA === credit(0, TA).part + credit(1, TA).part && blocA === partA
      && blocB === credit(0, TB).part + credit(1, TB).part && blocB === partB, JSON.stringify(t.paires));
    ok('Ticket : P.REF imprimé = base de calcul de la ligne (' + refA1 + ', ' + refB2 + ')', t.articles[0].pref === refA1 && t.articles[1].pref === refB2, JSON.stringify(t.articles.map((a) => a.pref)));
    ok('Ticket : net imprimé = net affiché avant la clôture = prix - parts arrondi à 5', t.net === rail.net.valeur && t.net === arrondi5(prix - partA - partB), 'ticket ' + t.net + ' / écran ' + rail.net.valeur);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
