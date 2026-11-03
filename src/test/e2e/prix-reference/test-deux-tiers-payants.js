/* CAS 2 DU 03/11/2026, TEST D'ECRAN 4 : vente a deux tiers-payants.
 *
 * Client assure a deux tiers-payants (A 70 %, B 20 %) ; vente assurance avec un article ; « Ajouter une Assurance
 * complémentaire » -> B choisi, « Valider » : deux groupes de colonnes dans l'ordre de priorite, DESIGNATION garde sa
 * largeur minimale, la grille tient ou defile ; saisie sur le second groupe -> la ligne prix_reference est ecrite pour
 * B et B seulement, journal AJOUT pour B ; « Retirer » B -> un seul groupe. Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/prix-reference/test-deux-tiers-payants.js
 */
const C = require('./commun');
const { ok, q, A } = C;

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  const TA = A.tiersPayant('R4A', '1'), TB = A.tiersPayant('R4B', '1');
  const P = C.produitSansReference(6);
  const CIP = C.cip(P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    const cl = await A.clientAssure(api, 'REF4', [{ tp: TA, taux: 70 }, { tp: TB, taux: 20 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF4');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-A');
    await C.taperArticle(p, CIP);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const e1 = await C.entete(p);
    ok('Préparation : vente assurance sur A, un groupe de colonnes', !!venteId && e1 && e1.groupes.join(',') === TA, JSON.stringify(e1 && e1.groupes));

    /* ajout de B par le bouton de l'ecran */
    await p.locator('text=/Ajouter une Assurance compl/').filter({ visible: true }).first().click();
    const COMBO = 'window[title="TIERS-PAYANTS ASSOCIES"] combobox[name=compteTp]';
    await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), COMBO, { timeout: 15000 });
    await C.vues.cliquer(p, COMBO);
    await p.keyboard.type(TB, { delay: 25 });
    const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: TB }).first();
    await item.waitFor({ timeout: 20000 });
    await item.click();
    const repAjout = p.waitForResponse((r) => /vente\/addtp\//.test(r.url()), { timeout: 30000 });
    const repLignes = p.waitForResponse((r) => /vente\/deatails/.test(r.url()), { timeout: 30000 });
    await p.locator('.x-window').filter({ visible: true, hasText: 'TIERS-PAYANTS ASSOCIES' }).getByText('Valider', { exact: true }).click();
    await repAjout;
    await repLignes;
    await p.waitForTimeout(1500);
    const e2 = await C.entete(p);
    ok('B ajouté : deux groupes de colonnes, A puis B (ordre de priorité)', e2 && e2.groupes.join(',') === TA + ',' + TB, JSON.stringify(e2 && e2.groupes));
    ok('DESIGNATION garde au moins 170 px ; la grille tient dans sa largeur ou défile horizontalement',
      e2 && e2.colonnes.find((c) => c.texte === 'DESIGNATION').largeur >= 170 && (e2.defilement || e2.colonnes.reduce((s, c) => s + c.largeur, 0) <= e2.largeurGrille + 2),
      e2 && (e2.colonnes.map((c) => c.texte + ':' + c.largeur).join(' ') + ' / grille ' + e2.largeurGrille + ' / défilement ' + e2.defilement));
    const l2 = await C.ligne(p, CIP);
    ok('La ligne porte deux références par défaut : A 70 %, B 20 %', l2 && l2.refs.length === 2 && l2.refs[0].tpId === TA && l2.refs[0].taux === 70
      && l2.refs[1].tpId === TB && l2.refs[1].taux === 20 && l2.cellules.length === 4, JSON.stringify(l2 && l2.refs));

    /* saisie sur le second groupe */
    const prixRef = P.pu - 200;
    const r = await C.saisirEtEnregistrer(p, CIP, TB, 'valeur', prixRef);
    ok('P.REF saisi sur B : PUT accepté', r.http === 200 && r.success === true, JSON.stringify(r).slice(0, 200));
    ok('Écrit pour B et B seulement (MIX, taux 20 de B)', C.references(P.id) === TB + '/MIX_TAUX_PRIX/' + prixRef + '/20/1', C.references(P.id));
    ok('Journal AJOUT pour B, portant la vente', new RegExp('^AJOUT/NULL/' + prixRef + '/NULL/20/MIX_TAUX_PRIX/' + venteId + '/.*/' + TB + '$').test(C.journal(P.id)), C.journal(P.id));
    const l3 = await C.ligne(p, CIP);
    ok('À l\'écran : A reste en gris (défaut), B passe en violet', l3 && l3.refs[0].defaut === true && l3.refs[1].defaut === false && l3.refs[1].valeur === prixRef
      && /vp-ref-defaut/.test(l3.cellules[0].classes) && /vp-ref-fiche/.test(l3.cellules[2].classes), JSON.stringify(l3));
    const serveur = await C.netServeur(sess, venteId);
    const affiche = await C.netAffiche(p);
    ok('Net affiché = net/assurance du serveur', affiche.montantNet === serveur.data.montantNet && affiche.montantTp === serveur.data.montantTp, JSON.stringify({ affiche, serveur: serveur.data }));

    /* retrait de B : bouton « Retirer » du second bloc */
    const repRetrait = p.waitForResponse((r) => /vente\/removetp\//.test(r.url()), { timeout: 30000 });
    const retirer = p.locator('.x-btn').filter({ visible: true, hasText: /^\s*Retirer\s*$/ }).nth(1);
    await retirer.click();
    const confirmation = await C.vues.texteMessage(p);
    if (confirmation) { await C.vues.repondre(p, 'yes').catch(() => C.vues.repondre(p, 'ok').catch(() => {})); }
    await repRetrait;
    await p.waitForTimeout(2000);
    const e4 = await C.entete(p);
    ok('B retiré de la vente : un seul groupe de colonnes (A)', e4 && e4.groupes.join(',') === TA, JSON.stringify(e4 && e4.groupes));
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
