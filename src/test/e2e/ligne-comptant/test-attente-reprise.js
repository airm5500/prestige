/* CAS 1 DU 03/11/2026, TEST D'ECRAN 4 : la coche « C » survit a la mise en attente et a la reprise.
 *
 *  1. parametre a 1, vente assurance, deux articles, le second coche ;
 *  2. « METTRE EN ATTENTE » : la vente passe en attente, la coche reste en base ;
 *  3. Ventes en attente > « Modifier (reprendre la vente) » : la ligne revient cochee (fond jaune, pastille), la
 *     colonne « C » est visible, « AFFICHER NET A PAYER » montre DONT COMPTANT.
 * Lancement seul : node src/test/e2e/ligne-comptant/test-attente-reprise.js
 */
const C = require('./commun');
const { ok, q, A } = C;

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  const TP = A.tiersPayant('C4', '1');
  const P1 = C.produitSimple(5);
  const P2 = C.produitSimple(6);
  const CIP1 = C.cip(P1);
  const CIP2 = C.cip(P2);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    await A.clientAssure(api, 'CPT4', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' CPT4');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-C4');
    await C.taperArticle(p, CIP1);
    await C.taperArticle(p, CIP2);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const put = await C.cocher(p, CIP2);
    ok('Préparation : vente assurance, deux articles, le second coché', !!venteId && put && put.success === true, venteId);

    /* 2. mise en attente */
    await C.vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await p.waitForTimeout(2500);
    if (await C.vues.texteMessage(p)) { await C.vues.repondre(p, 'yes').catch(() => C.vues.repondre(p, 'ok').catch(() => {})); }
    await p.waitForTimeout(1500);
    const statut = q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('Vente mise en attente, la coche reste en base', (statut === 'is_Process' || statut === 'is_Pending') && (await C.venteCourante(p)) === null
      && q("SELECT comptant FROM t_preenregistrement_detail WHERE lg_FAMILLE_ID = '" + P2.id + "' AND lg_PREENREGISTREMENT_ID = '" + venteId + "'") === '1', statut);

    /* 3. reprise */
    const ref = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    await C.ouvrirEcran(p, 'cloturerventemanager');
    await C.visible(p, 'cloturerventemanager #addBtn');
    await p.waitForTimeout(2000);
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: ref }).first();
    await rangee.waitFor({ timeout: 30000 });
    const details = p.waitForResponse((x) => /\/vente\/deatails/.test(x.url()), { timeout: 60000 });
    details.catch(() => {});
    await rangee.locator('.act-modifier').first().click();
    await C.visible(p, C.CHAMP_PRODUIT);
    await details;
    await p.waitForTimeout(2500);
    ok('Vente reprise à l\'écran', (await C.venteCourante(p)) === venteId, await C.venteCourante(p));
    const l = await C.ligne(p, CIP2);
    ok('La ligne revient cochée : fond jaune, pastille COMPTANT', l && l.comptant && l.fondJaune && l.pastille, JSON.stringify(l));
    const l1 = await C.ligne(p, CIP1);
    ok('L\'autre ligne reste non cochée', l1 && !l1.comptant && !l1.fondJaune, JSON.stringify(l1));
    const e = await C.entete(p);
    ok('Colonne « C » visible après la reprise', e && e.colonneCVisible && e.largeurC === 40, JSON.stringify(e));
    const rep = p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 });
    rep.catch(() => {});
    await C.vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #netBtn');
    await rep;
    await p.waitForTimeout(1500);
    const r = await C.rail(p);
    ok('AFFICHER NET A PAYER : DONT COMPTANT = ligne cochée (arrondi à 5), DONT PART CLIENT = net - comptant', r.comptant && r.comptant.visible && r.comptant.valeur > 0
      && r.comptant.valeur === r.montantComptant && r.partClient.valeur === r.net.valeur - r.comptant.valeur && Math.abs(r.montantTp - P1.pu * 0.7) <= 1, JSON.stringify(r));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
