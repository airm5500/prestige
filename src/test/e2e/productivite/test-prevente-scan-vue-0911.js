/* PLAN DU 09/11, POINT 11 : SCAN D'UNE PREVENTE SUR L'ECRAN DE PREVENTE.
 *
 * Avant : sur SERVICE CLIENT > Pre-vente > « Nouvelle Pré Vente », le scan du QR (ou la saisie du numero) d'une
 * prevente rechargeait la vente comme une vente normale : volet d'encaissement, type de reglement et bouton de
 * cloture visibles, « Fermer la prévente » cache. Par les vues (admin) :
 *  - QR (identifiant) puis numero de la prevente tapes dans « N° ticket / scan » : la prevente est chargee et la vue
 *    reste celle de la prevente (pas d'encaissement, pas de cloture, « Fermer la prévente » visible) ;
 *  - ce n'est pas une prise en caisse : rien dans vente_prise_caisse ;
 *  - non-regression : le meme scan a l'ecran de vente (SERVICE CLIENT > Ventes) montre l'encaissement ;
 *  - bilan : la vente (statut, montant, lignes) et le stock ne changent pas ; aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ADMIN, AUTRE_VENDEUR, ok, q } = C;
const { ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');

const TABLE = () => q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vente_prise_caisse'") === '1';
const empreinte = (id) => q(`SELECT CONCAT(str_STATUT, '|', int_PRICE, '|', b_IS_CANCEL, '|', (SELECT COUNT(*) FROM t_preenregistrement_detail d`
  + ` WHERE d.lg_PREENREGISTREMENT_ID = '${id}')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`);

(async () => {
  const { b, p, api, erreurs } = await C.connecter();
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const champ = 'doventemanager #preventeSearchField';
  /* etat de la vue de vente : volets visibles et vente chargee */
  const vue = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), vis = (x) => !!x && x.isVisible(true);
    return { id: c.current && c.current.lgPREENREGISTREMENTID, categorie: c.getCategorie(), encaissement: vis(c.getEncaissement()),
      reglement: vis(c.getVnotypeReglement()), cloture: vis(c.getVnobtnCloture()), fermer: vis(c.getBtnClosePrevente()) }; });
  const scanner = async (valeur) => {
    await cliquer(p, champ);
    await p.waitForTimeout(300);
    await p.keyboard.type(valeur, { delay: 10 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(4000);
    if (await texteMessage(p)) { await repondre(p, 'ok').catch(() => {}); }
    return vue();
  };
  const ecran = async (menu, manager) => {
    await ouvrirMenu(p, 'SERVICE CLIENT', menu);
    await p.waitForFunction((m) => Ext.ComponentQuery.query(m + ' #addBtn').some((x) => x.isVisible(true)), manager, { timeout: 60000 });
    await cliquer(p, manager + ' #addBtn');
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  try {
    C.ouvrirCaisse();
    const v = C.venteComptant(api);
    const pa = C.produit(0, 40), pb = C.produit(1, 40);
    const stockAvant = [C.stock(pa), C.stock(pb)];
    const prevente = async (lignes, vendeur) => {
      let id = null;
      for (const [prod, qte] of lignes) { id = await v.ajouter(prod, qte, id, { prevente: true, userVendeurId: vendeur }); }
      await api('PUT', '../api/v1/vente/terminerprevente/' + id);
      return { id, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`) };
    };
    const p1 = await prevente([[pa, 2], [pb, 3]], AUTRE_VENDEUR);
    const p2 = await prevente([[pb, 1]], AUTRE_VENDEUR);
    const avant = [p1, p2].map((x) => empreinte(x.id));

    await ecran('Pre-vente', 'preenregistrementmanager');
    const v0 = await vue();
    ok('Écran de prévente ouvert : catégorie PREVENTE, encaissement masqué', v0.categorie === 'PREVENTE' && !v0.encaissement, JSON.stringify(v0));
    const v1 = await scanner(p1.id);
    ok('QR de la prévente scanné sur l\'écran de prévente : prévente chargée', v1.id === p1.id, JSON.stringify(v1));
    ok('Vue de prévente gardée : pas d\'encaissement, pas de type de règlement, pas de clôture, « Fermer la prévente » visible',
      !v1.encaissement && !v1.reglement && !v1.cloture && v1.fermer, JSON.stringify(v1));
    const v2 = await scanner(p2.ref);
    ok('Numéro de la prévente tapé : chargée, vue de prévente gardée', v2.id === p2.id && !v2.encaissement && !v2.reglement && !v2.cloture && v2.fermer, JSON.stringify(v2));
    ok('Ouverture sur l\'écran de prévente : pas une prise en caisse', !TABLE() || q(`SELECT COUNT(*) FROM vente_prise_caisse WHERE vente_id IN ('${p1.id}', '${p2.id}')`) === '0');

    /* non-regression : ecran de vente */
    await ecran('Ventes', 'cloturerventemanager');
    const v3 = await scanner(p1.ref);
    ok('Écran de vente : la même prévente scannée montre l\'encaissement et la clôture', v3.id === p1.id && v3.categorie !== 'PREVENTE' && v3.encaissement && v3.cloture,
      JSON.stringify(v3));
    ok('Écran de vente : prise en caisse enregistrée (prévente d\'un autre vendeur)', !TABLE() || q(`SELECT COUNT(*) FROM vente_prise_caisse WHERE vente_id = '${p1.id}' AND user_id = '${ADMIN}'`) === '1');
    ok('Bilan : ventes (statut, montant, annulation, lignes) et stock inchangés',
      JSON.stringify([p1, p2].map((x) => empreinte(x.id))) === JSON.stringify(avant) && C.stock(pa) === stockAvant[0] && C.stock(pb) === stockAvant[1],
      JSON.stringify({ avant, apres: [p1, p2].map((x) => empreinte(x.id)) }));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    const ids = C.ventesDuTest();
    if (TABLE()) { C.exec(`DELETE FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)})`); }
    C.nettoyer();
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
