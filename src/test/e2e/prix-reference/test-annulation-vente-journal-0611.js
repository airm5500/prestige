/* PLAN DU 06/11, POINT 5.1 (reponse par defaut retenue) : L'ANNULATION D'UNE VENTE CLOSE LAISSE LE PRIX DE REFERENCE SUR
 * LA FICHE ARTICLE ET LA NOTE AU JOURNAL.
 *
 * Avant : l'annulation ne laissait aucune trace dans le journal des prix de reference ; on ne pouvait pas savoir que la
 * vente qui avait pose le prix avait ete annulee.
 *
 * Par l'ecran (compte de test, KEY_PRIX_REF_CAISSE a 1 le temps du test, organisme d'essai a 80 %) :
 *  A. vente assurance : P1 x 2 (P.REF = prix - 120), P2 (TAUX 55), P3 (rien) ; TERMINER LA VENTE -> fiche P1 et P2
 *     ecrites, un AJOUT chacun ;
 *     Ventes terminees > « Annuler.Vente » -> fiche P1 et P2 inchangees (meme prix, meme taux), une ligne ANNULATION
 *     au journal pour P1 et pour P2 portant la vente annulee (avant = apres = valeur de la fiche), rien pour P3 ;
 *     bilan : journal + 2 exactement, prix_reference inchange, aucune saisie gardee ;
 *     fiche article de P1 (ecran) : historique « Annulation de la vente », origine « Annulation — vente <ref> » ;
 *  B. vente assurance sans rien de saisi (P3), close puis annulee -> journal inchange.
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/prix-reference/test-annulation-vente-journal-0611.js
 */
const C = require('./commun');
const L = require('../ligne-comptant/commun');
const { ok, q, A } = C;

const refTp = (ligne, tp) => (ligne && ligne.refs ? ligne.refs.find((r) => r.tpId === tp) : null) || {};
const nbJournal = (ids) => Number(q("SELECT COUNT(*) FROM prix_reference_journal WHERE produit_id IN ('" + ids.join("','") + "')"));
const nbReferences = () => Number(q('SELECT COUNT(*) FROM prix_reference'));

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_PRIX_REF_BASE_PAR_TP', '0');
  const TP = A.tiersPayant('AN', '1');
  const P = [C.produitSansReference(14), C.produitSansReference(15), C.produitSansReference(16)];
  const CIP = P.map(C.cip);
  const ids = P.map((x) => x.id);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    await A.clientAssure(api, 'AN', [{ tp: TP, taux: 80 }]);
    const ouvrirAssurance = async (bon) => {
      await C.passerEnAssurance(p);
      await C.choisirClient(p, C.MARQUE + ' AN');
      await C.saisirBon(p, 1, C.MARQUE + '-BON-' + bon);
    };

    /* ============ A. vente avec saisies, close puis annulee ============ */
    await ouvrirAssurance('AN1');
    for (const c of CIP) { await C.taperArticle(p, c); }
    await C.saisirQuantite(p, CIP[0], 2);
    const v1 = await C.venteCourante(p);
    C.noterVente(v1);
    const prixRef = P[0].pu - 120;
    const s1 = await C.saisirEtEnregistrer(p, CIP[0], TP, 'valeur', prixRef);
    const s2 = await C.saisirEtEnregistrer(p, CIP[1], TP, 'taux', 55);
    ok('A. P.REF sur P1 et TAUX 55 sur P2 saisis dans les cellules : acceptés', s1.success === true && s2.success === true, JSON.stringify([s1, s2]).slice(0, 300));
    const g1 = refTp(await C.ligne(p, CIP[0]), TP);
    ok('A. La grille montre la saisie de P1 (' + prixRef + ' / 80 %)', g1.valeur === prixRef && g1.taux === 80, JSON.stringify(g1));
    const clot = await L.terminerVente(p, false);
    ok('A. TERMINER LA VENTE : succès', clot.success === true, JSON.stringify(clot).slice(0, 200));
    const ficheAvant = ids.map(C.references);
    ok('A. Après la clôture : fiche P1 = ' + prixRef + ' / 80, fiche P2 = prix de vente / 55, rien sur P3',
      ficheAvant[0] === TP + '/MIX_TAUX_PRIX/' + prixRef + '/80/1' && ficheAvant[1] === TP + '/MIX_TAUX_PRIX/' + P[1].pu + '/55/1' && ficheAvant[2] === 'aucune', ficheAvant.join(' || '));
    const journalAvant = nbJournal(ids), refsAvant = nbReferences();
    ok('A. Journal : un AJOUT pour P1 et pour P2 avec la vente', journalAvant === 2 && C.journal(P[0].id).startsWith('AJOUT/') && C.journal(P[1].id).startsWith('AJOUT/'),
      ids.map(C.journal).join(' || '));

    const ref1 = L.vente(v1).ref;
    const http = await L.annulerVente(p, ref1);
    const annulee = (v) => L.vente(v).annulee || q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'") !== '0';
    ok('A. Ventes terminées > « Annuler.Vente » : annulation acceptée', http === 200 && annulee(v1), http + ' ' + JSON.stringify(L.vente(v1)));
    ok('A. Après l\'annulation : fiches de P1, P2 et P3 inchangées (le prix reste)', ids.map(C.references).join(' || ') === ficheAvant.join(' || '), ids.map(C.references).join(' || '));
    const j1 = C.journal(P[0].id), j2 = C.journal(P[1].id), j3 = C.journal(P[2].id);
    ok('A. Journal : une ligne ANNULATION pour P1 et pour P2, portant la vente annulée, avant = après = valeur de la fiche ; rien pour P3',
      new RegExp(' ; ANNULATION/' + prixRef + '/' + prixRef + '/80/80/MIX_TAUX_PRIX/' + v1 + '/').test(j1)
      && new RegExp(' ; ANNULATION/' + P[1].pu + '/' + P[1].pu + '/55/55/MIX_TAUX_PRIX/' + v1 + '/').test(j2) && j3 === 'aucun', [j1, j2, j3].join(' || '));
    ok('A. Bilan : journal + 2 exactement, prix_reference inchangé, aucune saisie gardée',
      nbJournal(ids) === journalAvant + 2 && nbReferences() === refsAvant && ids.every((x) => C.saisiesGardees(x) === 'aucune'),
      nbJournal(ids) + '/' + (journalAvant + 2) + ' ' + nbReferences() + '/' + refsAvant);

    /* fiche article de P1 : l'historique montre l'annulation */
    await C.ouvrirEcran(p, 'famillemanager');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await C.vues.cliquer(p, '#rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(CIP[0], { delay: 20 });
    await p.keyboard.press('Enter');
    const ligneArticle = p.locator('.x-grid-row').filter({ visible: true, hasText: CIP[0] }).first();
    await ligneArticle.waitFor({ timeout: 60000 });
    await p.waitForTimeout(800);
    if (await ligneArticle.locator('.fa-action-prix').count() > 0) {
      await ligneArticle.locator('.fa-action-prix').first().click({ timeout: 10000 });
    } else {
      await ligneArticle.locator('.fa-action-plus').first().click({ timeout: 10000 });
      await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Prix de référence' }).first().click({ timeout: 10000 });
    }
    await p.waitForFunction(() => Ext.ComponentQuery.query('prixReference').some((w) => w.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const fiche = await p.evaluate(() => { const w = Ext.ComponentQuery.query('prixReference')[0];
      return { prix: w.down('#prixGrid').getStore().getRange().map((r) => r.getData()), journal: w.down('#journalGrid').getStore().getRange().map((r) => r.getData()) }; });
    ok('A. Fiche article de P1 (écran) : la référence reste (' + prixRef + ', 80 %)', fiche.prix.length === 1 && fiche.prix[0].valeur === prixRef && fiche.prix[0].taux === 80, JSON.stringify(fiche.prix));
    ok('A. Fiche article de P1 (écran) : historique « Annulation de la vente » puis « Ajout », origine « Annulation — vente ' + ref1 + ' »',
      fiche.journal.length === 2 && fiche.journal[0].action === 'Annulation de la vente' && fiche.journal[0].origine === 'Annulation — vente ' + ref1
      && fiche.journal[1].action === 'Ajout' && fiche.journal[0].avant === fiche.journal[0].apres, JSON.stringify(fiche.journal));

    /* fermeture de la fenetre « Prix de reference » par son bouton « Fermer » ; la colonne « Action » montre le libelle entier */
    const idFenetre = await p.evaluate(() => Ext.ComponentQuery.query('prixReference').find((w) => w.isVisible(true)).getId());
    const coupe = await p.evaluate((id) => { const c = Array.from(document.querySelectorAll('#' + id + ' .x-grid-cell-inner')).find((x) => /Annulation de la vente/.test(x.textContent));
      return c ? c.scrollWidth > c.clientWidth + 1 : null; }, idFenetre);
    ok('A. Fiche article (écran) : « Annulation de la vente » se lit en entier dans la colonne Action', coupe === false, coupe);
    await p.locator('#' + idFenetre + ' .x-btn').filter({ hasText: 'Fermer' }).first().click({ timeout: 10000 });
    await p.waitForTimeout(800);

    /* ============ B. vente sans saisie, close puis annulee : journal inchange ============ */
    await C.nouvelleVente(p);
    await ouvrirAssurance('AN2');
    await C.taperArticle(p, CIP[2]);
    const v2 = await C.venteCourante(p);
    C.noterVente(v2);
    const clot2 = await L.terminerVente(p, false);
    ok('B. Vente sans saisie (P3) : TERMINER LA VENTE, succès', clot2.success === true, JSON.stringify(clot2).slice(0, 200));
    const jB = nbJournal(ids);
    const http2 = await L.annulerVente(p, L.vente(v2).ref);
    ok('B. Annulée par l\'écran : journal des prix de référence inchangé, fiche de P3 vide', http2 === 200 && annulee(v2) && nbJournal(ids) === jB && C.references(P[2].id) === 'aucune',
      http2 + ' ' + jB + ' -> ' + nbJournal(ids));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
