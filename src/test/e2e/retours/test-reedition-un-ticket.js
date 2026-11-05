/* RETOUR DU 05/11 : « à la réédition du ticket d'une vente assurance + comptant (produit coché), on a 3 tickets alors
 * qu'on a juste cliqué sur le bouton imprimer de la vente crédit de cette opération ». Attendu (réponse du 05/11) :
 * seulement le ticket de cette vente.
 *
 * Par le vrai chemin : ligne comptant active (KEY_LIGNE_COMPTANT_VO a 1), vente assurance a un tiers-payant, deux
 * articles dont un coché « C », TERMINER LA VENTE sans imprimer ; puis Ventes terminées, recherche de la vente
 * assurance, icône « Réimprimer le ticket ». Le nombre de tickets envoyés a l'imprimante est lu dans la mesure
 * d'impression du journal du serveur (seuil KEY_TICKET_LENT_SEUIL_MS mis a 0 le temps du test : chaque impression
 * y est écrite, « envoi au spouleur … (n fois) »).
 * Tout est retiré a la fin (ventes, client, tiers-payant, paramètres, stock, caisse).
 * Lancement seul : node src/test/e2e/retours/test-reedition-un-ticket.js
 */
const fs = require('fs');
const C = require('../ligne-comptant/commun');
const { ok, A } = C;

/* nombre d'envois au spouleur de la derniere impression « libelle » ecrite dans le journal depuis « depuis » */
function envois(journal, depuis, libelle) {
  if (!fs.existsSync(journal)) { return null; }
  const taille = fs.statSync(journal).size;
  const tampon = Buffer.alloc(Math.max(0, taille - depuis));
  const fd = fs.openSync(journal, 'r'); fs.readSync(fd, tampon, 0, tampon.length, depuis); fs.closeSync(fd);
  const lignes = tampon.toString('latin1').split('\n').filter((l) => l.includes('Impression lente du ticket (' + libelle));
  if (!lignes.length) { return null; }
  const l = lignes[lignes.length - 1];
  const m = l.match(/envoi au spouleur [^;]*?(?:\((\d+) fois\))?(?:\s*;|\s*$|\s*\.)/);
  return m ? (m[1] ? Number(m[1]) : 1) : 0;
}

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_TICKET_LENT_SEUIL_MS', '0');
  const TP = A.tiersPayant('RE1', '1');
  const P1 = C.produitSimple(2);
  const P2 = C.produitSimple(3);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const journal = A.ENV_E2E.JOURNAL_SERVEUR;
  try {
    ok('Précondition : journal du serveur lisible', fs.existsSync(journal), journal);
    await A.clientAssure(api, 'RE1', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' RE1');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-RE1');
    await C.taperArticle(p, C.cip(P1));
    await C.taperArticle(p, C.cip(P2));
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    await C.cocher(p, C.cip(P2));
    const clot = await C.terminerVente(p, false);
    const vnoId = clot.venteLiee;
    C.noterVente(vnoId);
    ok('Vente assurance + comptant terminée sans impression (deux ventes liées)', clot.http === 200 && clot.success === true && !!vnoId, JSON.stringify(clot).slice(0, 300));
    const vo = C.vente(venteId);

    /* Ventes terminées : réimpression de la vente assurance (à crédit) */
    await C.ouvrirEcran(p, 'ventemanager');
    await C.visible(p, 'ventemanager #query');
    await C.vues.cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(vo.ref, { delay: 20 });
    await C.vues.cliquer(p, 'ventemanager #rechercher');
    await p.waitForTimeout(2500);
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: vo.ref }).first();
    await rangee.waitFor({ timeout: 30000 });
    const depuis = fs.existsSync(journal) ? fs.statSync(journal).size : 0;
    const rep = p.waitForResponse((x) => /\/vente\/ticket\/vo\//.test(x.url()), { timeout: 240000 });
    rep.catch(() => {});
    await rangee.locator('img[data-qtip="Réimprimer le ticket"]').first().click();
    const r = await rep.catch(() => null);
    const corps = r ? await r.json().catch(() => ({})) : {};
    ok('Réimpression acceptée par le serveur', r && r.status() === 200 && corps.success === true, (r ? r.status() : 'pas de réponse') + ' ' + JSON.stringify(corps));
    await p.waitForTimeout(3000);
    /* le journal du serveur n'est pas en UTF-8 : « réimpression » y est reconnu par son début */
    const n = envois(journal, depuis, 'vente/ticket/vo (r');
    ok('Un seul ticket imprimé : celui de la vente assurance, ni ticket combiné ni copie', n === 1, n === null ? 'mesure absente du journal' : n + ' ticket(s)');
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
