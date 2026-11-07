/* PLAN DU 06/11, POINT 9 : VENTES TERMINEES, ICONES DISTINCTES ET BOUTON « GENERER UNE SUGGESTION » CACHE.
 *
 * Avant : « Réimprimer le ticket » et « Re-imprimer la facture » avaient la meme imprimante ; « Modifier » et « Modifier
 * info client » le meme crayon (icones au trait choisies d'apres le nom de l'image) ; « Generer une suggestion » etait
 * propose sur chaque vente.
 * Par les ecrans (compte de test) : vente assurance close par l'ecran ; Ventes terminees > recherche par sa reference :
 *  - « Re-imprimer la facture » a le dessin « facture », different de l'imprimante du ticket ;
 *  - « Modifier info client » a le dessin « client », different du crayon « Modifier » ;
 *  - sur la ligne, deux actions visibles d'info-bulles differentes n'ont jamais le meme dessin ;
 *  - « Generer une suggestion » n'est visible sur aucune ligne de la liste ;
 *  - aucune erreur JavaScript. La vente est retiree a la fin.
 * Lancement seul : node src/test/e2e/retours/test-ventes-terminees-icones-0611.js
 */
const C = require('../prix-reference/commun');
const L = require('../ligne-comptant/commun');
const { ok, A } = C;

(async () => {
  const TP = A.tiersPayant('ICO', '1');
  const P = C.produitSansReference(21);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    await A.clientAssure(api, 'ICO', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' ICO');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-ICO');
    await C.taperArticle(p, C.cip(P));
    const v = await C.venteCourante(p);
    C.noterVente(v);
    const clot = await L.terminerVente(p, false);
    ok('Préparation : vente assurance close par l\'écran', clot.success === true, JSON.stringify(clot).slice(0, 200));
    const ref = L.vente(v).ref;

    await C.ouvrirEcran(p, 'ventemanager');
    await C.visible(p, 'ventemanager #query');
    await C.vues.cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(ref, { delay: 20 });
    await C.vues.cliquer(p, 'ventemanager #rechercher');
    await p.waitForTimeout(2500);
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: ref }).first();
    await rangee.waitFor({ timeout: 30000 });
    const icones = await rangee.evaluate((tr) => Array.from(tr.querySelectorAll('.x-action-col-icon')).filter((i) => !i.classList.contains('x-hide-display') && i.offsetParent)
      .map((i) => ({ bulle: i.getAttribute('data-qtip') || '', dessin: getComputedStyle(i).backgroundImage, classes: i.className })));
    const par = (re) => icones.find((i) => re.test(i.bulle));
    const ticket = par(/^Réimprimer le ticket$/), facture = par(/^Re-imprimer la facture$/), client = par(/^Modifier info client$/), modifier = par(/^Modifier$/);
    ok('« Re-imprimer la facture » : dessin « facture », différent de l\'imprimante du ticket', ticket && facture && /act-facture/.test(facture.classes) && facture.dessin !== ticket.dessin,
      JSON.stringify({ ticket, facture }).slice(0, 400));
    ok('« Modifier info client » : dessin « client »' + (modifier ? ', différent du crayon « Modifier »' : ''), client && /act-client/.test(client.classes) && (!modifier || modifier.dessin !== client.dessin),
      JSON.stringify({ client, modifier }).slice(0, 400));
    const doublons = [];
    icones.forEach((a, i) => icones.slice(i + 1).forEach((b) => { if (a.bulle !== b.bulle && a.dessin === b.dessin && a.dessin !== 'none') { doublons.push(a.bulle + ' = ' + b.bulle); } }));
    ok('Sur la ligne, deux actions différentes n\'ont jamais le même dessin', icones.length >= 3 && doublons.length === 0, doublons.join(' ; ') || icones.map((i) => i.bulle).join(', '));
    const suggestions = await p.evaluate(() => Array.from(document.querySelectorAll('.x-action-col-icon')).filter((i) => /suggestion/i.test(i.getAttribute('data-qtip') || '')
      && !i.classList.contains('x-hide-display') && i.offsetParent).length);
    const lignes = await p.locator('.x-grid-row').filter({ visible: true }).count();
    ok('« Générer une suggestion » n\'est visible sur aucune ligne de la liste', lignes > 0 && suggestions === 0, suggestions + ' visible(s) sur ' + lignes + ' ligne(s)');
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
