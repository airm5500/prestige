/* CAS 2 DU 03/11/2026, TEST D'ECRAN 1 : vente assurance a un tiers-payant, parametre actif.
 *
 * Parcours (compte de test, KEY_PRIX_REF_CAISSE mis a 1 le temps du test) :
 *  1. Ventes > nouvelle vente > « Assurance » > client tape puis Entree > article tape par son CIP ;
 *  2. la grille porte un groupe « <tiers-payant> » -> P.REF | TAUX, en gris italique (valeurs par defaut : prix de
 *     vente et taux du client), C.CIP a 80 px ;
 *  3. P.REF saisi puis Entree, TAUX saisi puis Entree : une ligne prix_reference MIX_TAUX_PRIX, journal AJOUT puis
 *     MODIFICATION portant la vente, net recalcule (identique a net/assurance), focus rendu au champ produit, aucun
 *     update/item/vno ;
 *  4. GESTION DES ARTICLES > « Prix de reference » du produit : la ligne est la, le journal l'affiche ; « Supprimer »
 *     -> journal SUPPRESSION, fiche et caisse d'accord.
 * Tout est retire a la fin (vente, client, tiers-payant, prix de reference, journal, parametre, stock, caisse).
 * Lancement seul : node src/test/e2e/prix-reference/test-saisie-un-tiers-payant.js
 */
const C = require('./commun');
const { ok, q, A } = C;

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  const TP = A.tiersPayant('R1', '1');
  const P = C.produitSansReference(3);
  const CIP = C.cip(P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const requetesVno = [];
  p.on('request', (r) => { if (/update\/item\/vno/.test(r.url())) { requetesVno.push(r.url()); } });
  try {
    const cl = await A.clientAssure(api, 'REF1', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF1');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-R1');
    await C.taperArticle(p, CIP);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    ok('Préparation : vente assurance ouverte à l\'écran avec le client et un article', !!venteId && q("SELECT lg_TYPE_VENTE_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === '2', venteId);

    /* 2. la grille */
    let e = await C.entete(p);
    ok('Un groupe de colonnes au nom du tiers-payant, P.REF à 80 px | TAUX à 60 px', e && e.groupes.length === 1 && e.groupes[0] === TP
      && e.colonnes.find((c) => c.groupe).sous.map((s) => s.texte + ':' + s.largeur).join(',') === 'P.REF:80,TAUX:60', JSON.stringify(e && e.colonnes));
    ok('C.CIP fixé à 100 px, le groupe placé entre P.U et MONTANT', e && e.colonnes.find((c) => c.texte === 'C.CIP').largeur === 100
      && e.colonnes.map((c) => c.groupe ? 'TP' : c.texte).join(',') === 'LG,C.CIP,DESIGNATION,QD,QS,P.U,TP,MONTANT,', e && e.colonnes.map((c) => c.texte + ':' + c.largeur).join(' '));
    ok('Libellé discret sous la grille (règle du minimum)', e && e.rappel);
    let l = await C.ligne(p, CIP);
    ok('Valeurs par défaut en gris italique : prix de vente et taux du client (70)', l && l.refs.length === 1 && l.refs[0].defaut === true && l.refs[0].valeur === P.pu
      && l.refs[0].taux === 70 && l.cellules.length === 2 && l.cellules.every((c) => /vp-ref-defaut/.test(c.classes)), JSON.stringify(l));
    ok('Rien n\'est écrit tant qu\'aucune cellule n\'est modifiée', C.references(P.id) === 'aucune' && C.journal(P.id) === 'aucun');

    /* 3. saisie P.REF puis TAUX, par Entree */
    const netAvant = await C.netAffiche(p);
    const prixRef = P.pu - 100;
    const r1 = await C.saisirEtEnregistrer(p, CIP, TP, 'valeur', prixRef);
    ok('P.REF saisi puis Entrée : PUT accepté, net renvoyé', r1.http === 200 && r1.success === true && r1.net && r1.net.success === true, JSON.stringify(r1).slice(0, 200));
    ok('Ligne prix_reference MIX_TAUX_PRIX créée (prix saisi, taux du client)', C.references(P.id) === TP + '/MIX_TAUX_PRIX/' + prixRef + '/70/1', C.references(P.id));
    ok('Journal : AJOUT portant la vente, l\'utilisateur et le poste', new RegExp('^AJOUT/NULL/' + prixRef + '/NULL/70/MIX_TAUX_PRIX/' + venteId + '/' + A.ADMIN + '/[^/]+/' + TP + '$').test(C.journal(P.id)), C.journal(P.id));
    l = await C.ligne(p, CIP);
    ok('La cellule passe en violet (référence de la fiche article)', l && l.refs[0].defaut === false && l.refs[0].valeur === prixRef && l.cellules.every((c) => /vp-ref-fiche/.test(c.classes)), JSON.stringify(l));
    const r2 = await C.saisirEtEnregistrer(p, CIP, TP, 'taux', 15);
    ok('TAUX saisi puis Entrée : PUT accepté', r2.http === 200 && r2.success === true, JSON.stringify(r2).slice(0, 200));
    ok('Même ligne prix_reference, taux 15', C.references(P.id) === TP + '/MIX_TAUX_PRIX/' + prixRef + '/15/1', C.references(P.id));
    ok('Journal : MODIFICATION (ancien taux 70, nouveau 15) portant la vente', new RegExp('; MODIFICATION/' + prixRef + '/' + prixRef + '/70/15/MIX_TAUX_PRIX/' + venteId + '/').test(C.journal(P.id)), C.journal(P.id));
    const netApres = await C.netAffiche(p);
    const serveur = await C.netServeur(sess, venteId);
    ok('Net recalculé : part tiers-payant = prix de référence x 15 %, net = prix - part, identique à net/assurance',
      netApres.montantTp === Math.round(prixRef * 0.15) && netApres.montantTp === serveur.data.montantTp && netApres.montantNet === serveur.data.montantNet
      && netApres.net === serveur.data.montantNet && netApres.montantTp !== netAvant.montantTp, JSON.stringify({ avant: netAvant, apres: netApres, serveur: serveur.data }));
    e = await C.entete(p);
    ok('Message vert sous la grille : enregistré sur la fiche article, net recalculé', /enregistrés sur la fiche article/.test(e.message) && /net recalculé/.test(e.message), e.message);
    ok('Aucun update/item/vno n\'est parti pour ces cellules', requetesVno.length === 0, requetesVno.join(' '));
    const focus = await C.focusProduit(p);
    ok('Le focus est rendu au champ produit', focus.ok, focus.actif);
    const qd = q("SELECT CONCAT_WS('/', int_QUANTITY, int_PRICE_UNITAIR, int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('La ligne de vente elle-même n\'a pas bougé (quantité, prix)', qd === '1/' + P.pu + '/' + P.pu, qd);

    /* 4. fiche article : la reference est la, le journal aussi ; suppression */
    await C.ouvrirEcran(p, 'famillemanager');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await C.vues.cliquer(p, '#rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(CIP, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligneArticle = p.locator('.x-grid-row').filter({ visible: true, hasText: CIP }).first();
    await ligneArticle.waitFor({ timeout: 60000 });
    await p.waitForTimeout(800);
    if (await ligneArticle.locator('.fa-action-prix').count() > 0) {
      await ligneArticle.locator('.fa-action-prix').first().click();
    } else {
      await ligneArticle.locator('.fa-action-plus').first().click();
      await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Prix de référence' }).first().click();
    }
    await p.waitForFunction(() => Ext.ComponentQuery.query('prixReference').some((w) => w.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const fiche = await p.evaluate(() => { const w = Ext.ComponentQuery.query('prixReference')[0];
      return { prix: w.down('#prixGrid').getStore().getRange().map((r) => r.getData()), journal: w.down('#journalGrid').getStore().getRange().map((r) => r.getData()) }; });
    ok('Fiche article : la référence saisie à la caisse est dans la liste (MIX, prix, taux 15)', fiche.prix.length === 1 && fiche.prix[0].type === 'MIX_TAUX_PRIX'
      && fiche.prix[0].valeur === prixRef && fiche.prix[0].taux === 15, JSON.stringify(fiche.prix));
    ok('Fiche article : l\'historique montre l\'ajout puis la modification, origine « Caisse — vente … »', fiche.journal.length === 2
      && fiche.journal[0].action === 'Modification' && fiche.journal[1].action === 'Ajout' && fiche.journal.every((j) => /^Caisse — vente /.test(j.origine))
      && fiche.journal[1].avant === '—' && /taux 70 %/.test(fiche.journal[1].apres) && /taux 15 %/.test(fiche.journal[0].apres), JSON.stringify(fiche.journal));
    const idGrille = await p.evaluate(() => Ext.ComponentQuery.query('prixReference #prixGrid')[0].getId());
    const repSuppr = p.waitForResponse((r) => r.request().method() === 'DELETE' && /prix-reference\//.test(r.url()), { timeout: 30000 }).catch(() => null);
    await p.locator('#' + idGrille + ' .x-grid-row').first().locator('img[data-qtip="Supprimer"]').click();
    await repSuppr;
    await p.waitForTimeout(1500);
    ok('« Supprimer » en fiche : la ligne prix_reference disparaît', C.references(P.id) === 'aucune', C.references(P.id));
    ok('Journal : SUPPRESSION (ancien prix et taux), sans vente', new RegExp('; SUPPRESSION/' + prixRef + '/NULL/15/NULL/NULL/NULL/' + A.ADMIN + '/').test(C.journal(P.id)), C.journal(P.id));
    const apres = await p.evaluate(() => Ext.ComponentQuery.query('prixReference')[0].down('#journalGrid').getStore().getRange().map((r) => r.getData()));
    ok('Fiche article : l\'historique affiche la suppression, origine « Fiche article »', apres.length === 3 && apres[0].action === 'Suppression' && apres[0].origine === 'Fiche article'
      && apres[0].apres === '—', JSON.stringify(apres[0]));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    const v = await C.venteCourante(p).catch(() => null);
    C.noterVente(v);
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
