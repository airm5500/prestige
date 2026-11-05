/* RETOUR DU 05/11 : « une vente assurance + crédit est affichée dans la visualisation de caisse et la liste de caisse
 * avec le statut VENTE AU COMPTANT ». Attendu (réponse du 05/11) : deux lignes, « VENTE A CREDIT » pour la vente
 * assurance et « VENTE AU COMPTANT » pour la partie cochée ; le nom du client sur les deux ; sur la ligne à crédit,
 * seulement les espèces réellement encaissées (part client payée), jamais la part des tiers-payants.
 *
 * Par le vrai chemin : ligne comptant active (KEY_LIGNE_COMPTANT_VO a 1), vente assurance a un tiers-payant (70 %),
 * deux articles dont un coché « C », TERMINER LA VENTE sans imprimer ; puis « Liste de caisse » et « Visualisation
 * de caisse » ouvertes par le menu, lignes des deux ventes lues dans la grille.
 * Tout est retiré a la fin (ventes, client, tiers-payant, paramètre, stock, caisse).
 * Lancement seul : node src/test/e2e/retours/test-caisse-vente-scindee.js
 */
const C = require('../ligne-comptant/commun');
const { ok, q, A } = C;

const menu = (composant) => q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
  + " WHERE s.str_COMPOSANT = '" + composant + "' AND s.str_Status = 'enable' ORDER BY s.int_PRIORITY LIMIT 1").split('|');

/* lignes de la grille de l'ecran dont la reference est l'une de celles donnees : texte affiche de chaque colonne */
const lire = (p, xtype, refs) => p.evaluate((a) => {
  const g = Ext.ComponentQuery.query(a.x + ' gridpanel').find((x) => x.isVisible(true));
  if (!g) { return null; }
  const v = g.getView(), cols = (g.columns || g.headerCt.getGridColumns()).filter((c) => c.isVisible() && c.dataIndex);
  const out = [];
  g.getStore().each((r) => {
    const valeurs = Object.values(r.getData()).map(String);
    if (!a.r.some((ref) => valeurs.includes(ref))) { return; }
    const ligne = { brut: r.getData() };
    cols.forEach((c) => { const n = v.getCell(r, c); ligne[c.itemId || c.dataIndex] = n ? n.dom.innerText.trim() : ''; });
    out.push(ligne);
  });
  return out;
}, { x: xtype, r: refs });

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  const TP = A.tiersPayant('CS1', '1');
  const P1 = C.produitSimple(2);
  const P2 = C.produitSimple(3);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    const cl = await A.clientAssure(api, 'CS1', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' CS1');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-CS1');
    await C.taperArticle(p, C.cip(P1));
    await C.taperArticle(p, C.cip(P2));
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    await C.cocher(p, C.cip(P2));
    const clot = await C.terminerVente(p, false);
    const vnoId = clot.venteLiee;
    C.noterVente(vnoId);
    ok('Vente assurance + comptant terminée (deux ventes liées)', clot.http === 200 && clot.success === true && !!vnoId, JSON.stringify(clot).slice(0, 300));
    const vo = C.vente(venteId), vno = C.vente(vnoId);
    const nomClient = q("SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
    const encaisseVo = clot.partClient, encaisseVno = clot.montantComptant;
    const refs = [vo.ref, vno.ref, venteId, vnoId];

    for (const [composant, titre] of [['listecaissemanager', 'Liste de caisse'], ['visualisercaissemanager', 'Visualisation de caisse']]) {
      const m = menu(composant);
      await C.vues.ouvrirMenu(p, m[0], m[1]);
      await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query(x + ' gridpanel').find((y) => y.isVisible(true)); return g && !g.getStore().isLoading(); }, composant, { timeout: 120000 });
      await p.waitForTimeout(2000);
      const lignes = await lire(p, composant, refs) || [];
      const texte = (l) => Object.entries(l).filter(([k]) => k !== 'brut').map(([, v]) => v).join(' | ');
      const credit = lignes.filter((l) => /VENTE A CREDIT/.test(texte(l)));
      const comptant = lignes.filter((l) => /VENTE AU COMPTANT/.test(texte(l)));
      ok(titre + ' : deux lignes pour l\'opération', lignes.length === 2, lignes.map(texte).join(' || '));
      ok(titre + ' : une ligne « VENTE A CREDIT » et une ligne « VENTE AU COMPTANT »', credit.length === 1 && comptant.length === 1, lignes.map(texte).join(' || '));
      ok(titre + ' : le nom du client sur les deux lignes', lignes.length === 2 && lignes.every((l) => texte(l).toUpperCase().includes(nomClient.toUpperCase())), nomClient + ' / ' + lignes.map(texte).join(' || '));
      const montant = (l) => Number(String(l.brut.montant).replace(/\D/g, ''));
      /* ligne a credit : la part du client reglee (montant regle de la vente, avant l'arrondi a 5 du net, comme pour
         toute vente assurance), jamais la part du tiers-payant ni le total de la vente */
      ok(titre + ' : ligne à crédit = part client encaissée (' + encaisseVo + ' à l\'arrondi près, sans la part tiers-payant), ligne comptant = ' + encaisseVno,
        credit.length === 1 && comptant.length === 1 && Math.abs(montant(credit[0]) - encaisseVo) < 5 && montant(credit[0]) < vo.prix - 1
        && montant(comptant[0]) === encaisseVno,
        lignes.map((l) => JSON.stringify(l.brut).slice(0, 300)).join(' || '));
    }
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
