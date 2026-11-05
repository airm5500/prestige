/* LOT « BASE DE CALCUL PAR TIERS-PAYANT » (Q2.5 du cas 2 du 03/11/2026), TEST D'ECRAN : vente a deux tiers-payants
 * avec deux prix de reference saisis a la caisse, parametre KEY_PRIX_REF_BASE_PAR_TP a 0 puis a 1.
 *
 * Client assure a deux tiers-payants (A 70 %, B 20 %), produit sans reference, KEY_PRIX_REF_CAISSE a 1.
 *   1. Parametre a 0 : vente assurance, B ajoute par « Ajouter une Assurance complémentaire », P.REF saisi sur A
 *      (prix - 500) puis sur B (prix - 1 000) dans la grille. Parts attendues (regle du minimum, inchangee) :
 *      A = (prix - 1 000) x 70 %, B = (prix - 1 000) x 20 % ; « Part TP » affiche la valeur du serveur ; le rappel de
 *      la regle du minimum est sous la grille.
 *   2. Parametre a 1 : nouvelle vente (l'ecran relit le parametre a son ouverture), meme client, meme produit (les
 *      deux references sont maintenant celles de la fiche, en violet). Parts attendues : A = (prix - 500) x 70 %,
 *      B = (prix - 1 000) x 20 % ; « Part TP » = serveur ; le rappel ne parle plus du plus petit prix, la legende reste.
 * Tout est retire a la fin (ventes, client, tiers-payants, references, journal), parametres remis.
 * Lancement seul : node src/test/e2e/prix-reference/test-base-par-tp-deux-tiers-payants.js
 */
const C = require('./commun');
const { ok, q, exec, A } = C;
const CLE = 'KEY_PRIX_REF_BASE_PAR_TP';

/* parts par compte tiers-payant, d'apres la reponse net/assurance du serveur */
const parts = (serveur) => { const r = {}; (serveur.data.tierspayants || []).forEach((t) => { r[t.compteTp] = t.tpnet; }); return r; };
/* net a payer arrondi au multiple de 5, comme le serveur (NumberUtils.arrondiModuloOfNumber) */
const arrondi5 = (n) => { const m = n % 5; return m <= 2 ? n - m : n - m + 5; };
const texteRappel = (p) => p.evaluate(() => { const r = Ext.ComponentQuery.query('doventemanager #rappelReferenceTp').filter((x) => x.isVisible())[0];
  return r ? r.el.dom.textContent : null; });

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre(CLE, '0');
  const TA = A.tiersPayant('B5A', '1'), TB = A.tiersPayant('B5B', '1');
  const P = C.produitSansReference(7);
  const CIP = C.cip(P);
  const refA = P.pu - 500, refB = P.pu - 1000;
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    const cl = await A.clientAssure(sess.api, 'REF5', [{ tp: TA, taux: 70 }, { tp: TB, taux: 20 }]);
    const compteA = cl.clientId + '-L0', compteB = cl.clientId + '-L1';

    /* ---- 1. parametre a 0 : regle du minimum ---- */
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF5');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-A');
    await C.taperArticle(p, CIP);
    const vente1 = await C.venteCourante(p);
    C.noterVente(vente1);
    await C.ajouterTiersPayant(p, TB);
    const e1 = await C.entete(p);
    ok('Paramètre à 0 : vente assurance sur A et B, deux groupes de colonnes', !!vente1 && e1 && e1.groupes.join(',') === TA + ',' + TB, JSON.stringify(e1 && e1.groupes));
    const rappel1 = await texteRappel(p);
    ok('Paramètre à 0 : le rappel de la règle du minimum est sous la grille', rappel1 && /plus petit des prix de référence/.test(rappel1), rappel1);

    const rA = await C.saisirEtEnregistrer(p, CIP, TA, 'valeur', refA);
    ok('P.REF saisi sur A (' + refA + ') : PUT accepté', rA.http === 200 && rA.success === true, JSON.stringify(rA).slice(0, 200));
    const rB = await C.saisirEtEnregistrer(p, CIP, TB, 'valeur', refB);
    ok('P.REF saisi sur B (' + refB + ') : PUT accepté', rB.http === 200 && rB.success === true, JSON.stringify(rB).slice(0, 200));
    ok('Deux références écrites, une par tiers-payant', C.references(P.id) === TA + '/MIX_TAUX_PRIX/' + refA + '/70/1 ; ' + TB + '/MIX_TAUX_PRIX/' + refB + '/20/1', C.references(P.id));

    const s1 = await C.netServeur(sess, vente1);
    const p1 = parts(s1);
    const attenduA0 = Math.round(refB * 0.7), attenduB0 = Math.round(refB * 0.2);
    ok('Paramètre à 0 : A = ' + attenduA0 + ' et B = ' + attenduB0 + ' (le plus petit prix, ' + refB + ', sert aux deux)', p1[compteA] === attenduA0 && p1[compteB] === attenduB0, JSON.stringify(p1));
    ok('Paramètre à 0 : net = prix - parts, arrondi à 5', s1.data.montantNet === arrondi5(P.pu - attenduA0 - attenduB0), JSON.stringify({ net: s1.data.montantNet, pu: P.pu }));
    const a1 = await C.netAffiche(p);
    ok('Paramètre à 0 : « Part TP » et net affichés = valeurs du serveur', a1.partTp === s1.data.montantTp && a1.net === s1.data.montantNet && a1.montantTp === s1.data.montantTp, JSON.stringify({ a1, serveur: s1.data }));
    const ligne1 = await C.ligne(p, CIP);
    ok('Les deux cellules P.REF sont en violet (références de la fiche)', ligne1 && ligne1.refs[0].valeur === refA && ligne1.refs[1].valeur === refB
      && /vp-ref-fiche/.test(ligne1.cellules[0].classes) && /vp-ref-fiche/.test(ligne1.cellules[2].classes), JSON.stringify(ligne1 && ligne1.refs));

    /* ---- 2. parametre a 1 : base par tiers-payant ---- */
    exec("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '" + CLE + "'");
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF5');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-A2');
    await C.taperArticle(p, CIP);
    const vente2 = await C.venteCourante(p);
    C.noterVente(vente2);
    await C.ajouterTiersPayant(p, TB);
    const e2 = await C.entete(p);
    ok('Paramètre à 1 : nouvelle vente sur A et B, deux groupes de colonnes', !!vente2 && vente2 !== vente1 && e2 && e2.groupes.join(',') === TA + ',' + TB, JSON.stringify(e2 && e2.groupes));
    const rappel2 = await texteRappel(p);
    ok('Paramètre à 1 : le rappel de la règle du minimum a disparu, la légende des couleurs reste',
      rappel2 && !/plus petit/.test(rappel2) && /Gris italique/.test(rappel2) && /Violet/.test(rappel2), rappel2);
    const ligne2 = await C.ligne(p, CIP);
    ok('La ligne porte les deux références de la fiche (A ' + refA + ', B ' + refB + ')', ligne2 && ligne2.refs[0].valeur === refA && ligne2.refs[1].valeur === refB
      && ligne2.refs[0].defaut === false && ligne2.refs[1].defaut === false, JSON.stringify(ligne2 && ligne2.refs));

    const s2 = await C.netServeur(sess, vente2);
    const p2 = parts(s2);
    const attenduA1 = Math.round(refA * 0.7), attenduB1 = Math.round(refB * 0.2);
    ok('Paramètre à 1 : A = ' + attenduA1 + ' (sa référence ' + refA + ' × 70 %) et B = ' + attenduB1 + ' (sa référence ' + refB + ' × 20 %)',
      p2[compteA] === attenduA1 && p2[compteB] === attenduB1, JSON.stringify(p2));
    ok('Paramètre à 1 : net = prix - parts, arrondi à 5', s2.data.montantNet === arrondi5(P.pu - attenduA1 - attenduB1), JSON.stringify({ net: s2.data.montantNet, pu: P.pu }));
    /* la valeur affichee vient du serveur : le net de la vente est recalcule par la saisie d'une cellule (meme valeur
       sur B, la saisie de A - 100 l'oblige a repasser par le PUT puis net) */
    const rB2 = await C.saisirEtEnregistrer(p, CIP, TA, 'valeur', refA - 100);
    ok('Paramètre à 1 : P.REF de A ramené à ' + (refA - 100) + ' : PUT accepté', rB2.http === 200 && rB2.success === true, JSON.stringify(rB2).slice(0, 200));
    const s3 = await C.netServeur(sess, vente2);
    const p3 = parts(s3);
    const attenduA2 = Math.round((refA - 100) * 0.7);
    ok('Paramètre à 1 : A suit sa nouvelle référence (' + attenduA2 + '), B inchangé (' + attenduB1 + ')', p3[compteA] === attenduA2 && p3[compteB] === attenduB1, JSON.stringify(p3));
    const a3 = await C.netAffiche(p);
    ok('Paramètre à 1 : « Part TP » et net affichés = valeurs calculées par le serveur', a3.partTp === s3.data.montantTp && a3.net === s3.data.montantNet && a3.montantTp === s3.data.montantTp, JSON.stringify({ a3, serveur: s3.data }));
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
