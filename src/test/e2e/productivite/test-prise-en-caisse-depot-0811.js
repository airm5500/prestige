/* PLAN DU 08/11, POINT 15.3 (suite) : PRISE EN CAISSE D'UNE PREVENTE DANS L'ECRAN DE VENTE EN DEPOT.
 *
 * L'ecran de vente en depot (onglet « Saisir vente dépôt » de GESTION DES TIERS-PAYANTS > Gestion depots extensions)
 * est un clone de l'ecran de vente : la prise en caisse doit y etre enregistree de la meme facon. Par les vues (admin) :
 *  - prevente d'un autre vendeur saisie dans un depot d'extension, numero tape dans « N° ticket / scan » de l'onglet :
 *    la prevente est chargee et sa prise en caisse enregistree (vente, caissiere, heure), une seule fois meme rechargee ;
 *  - prevente dont le vendeur est la caissiere elle-meme : chargee, rien d'enregistre ;
 *  - bilan : ni la vente (statut, montant, annulation, lignes) ni le stock du depot ni celui de l'officine ne bougent ;
 *  - cas varies : deux preventes de montants et quantites differents (2 et 3), une rechargee ; aucune erreur
 *    JavaScript ; jeu d'essai retire (ventes, prises, depot, stock).
 */
const C = require('../audits/commun');
const { ADMIN, AUTRE_VENDEUR, ok, q } = C;
const { ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');

const DEPOT = 'E2E-PCD-DEPOT', MARQUE = 'E2E-PCD-STOCK';
const TABLE = () => q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vente_prise_caisse'") === '1';
const prises = (ids) => (TABLE() ? q(`SELECT CONCAT(vente_id, '|', user_id, '|', pris_le) FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)}) ORDER BY vente_id`)
  .split('\n').filter(Boolean) : null);
const empreinte = (id) => q(`SELECT CONCAT(str_STATUT, '|', int_PRICE, '|', b_IS_CANCEL, '|', (SELECT COUNT(*) FROM t_preenregistrement_detail d`
  + ` WHERE d.lg_PREENREGISTREMENT_ID = '${id}')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`);
const stockDe = (pid, empl) => q(`SELECT IFNULL(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${pid}' AND lg_EMPLACEMENT_ID = '${empl}'`);

function retirerDepot() {
  C.exec(`DELETE FROM hmvtproduit WHERE lg_EMPLACEMENT_ID = '${DEPOT}'; DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '${MARQUE}%';`
    + ` DELETE FROM reference WHERE emplacement_id = '${DEPOT}'; DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${DEPOT}';`);
}

(async () => {
  const { b, p, api, erreurs } = await C.connecter();
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const champ = 'doventeendepot #preventeSearchField';
  try {
    C.ouvrirCaisse();
    retirerDepot();
    const compte = q('SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1');
    C.exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME,"
      + ` str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION) VALUES ('${DEPOT}', '${compte}', 'DEPOT E2E PRISE CAISSE',`
      + " 'E2E', 'ABOBO', 'KOFFI', 'Jean', '0700000000', NOW(), NOW(), 'enable', '2', 0)");
    const v = C.venteComptant(api);
    const pa = C.produit(0, 40), pb = C.produit(1, 40);
    [pa, pb].forEach((x, i) => C.exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE, dt_CREATED,"
      + ` dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION) VALUES ('${MARQUE}-${i}', '${x.id}', 30, 30, NOW(), NOW(), '${DEPOT}', 'enable', 0, 0)`));
    const stocks = () => [stockDe(pa.id, DEPOT), stockDe(pb.id, DEPOT), C.stock(pa), C.stock(pb)].join('|');
    const prevente = async (lignes, vendeur) => {
      let id = null;
      for (const [prod, qte] of lignes) { id = await v.ajouter(prod, qte, id, { prevente: true, userVendeurId: vendeur, depotVenteId: DEPOT }); }
      await api('PUT', '../api/v1/vente/terminerprevente/' + id);
      return { id, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`) };
    };
    const p1 = await prevente([[pa, 2], [pb, 3]], AUTRE_VENDEUR);
    const p2 = await prevente([[pb, 1]], ADMIN);
    ok('Précondition : deux préventes du dépôt, en attente de la caisse', !!p1.ref && !!p2.ref
      && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${p1.id}', '${p2.id}') AND str_STATUT = 'is_Process'`) === '2', JSON.stringify([p1, p2]));
    const avant = [p1, p2].map((x) => empreinte(x.id)), stocksAvant = stocks();

    /* l'onglet de vente en depot, par le menu */
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion dépôts extensions').catch(() => ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion depots extensions'));
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const scanner = async (ref) => {
      await cliquer(p, champ);
      await p.waitForTimeout(300);
      await p.keyboard.type(ref, { delay: 10 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(3500);
      if (await texteMessage(p)) { await repondre(p, 'ok').catch(() => {}); }
      await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 30000 });
      return p.evaluate(() => { const c = testextjs.app.getController('VenteEnDepotCtr').current; return c && c.lgPREENREGISTREMENTID; });
    };

    const t0 = q('SELECT NOW() - INTERVAL 1 SECOND');
    ok('Prévente d\'un autre vendeur chargée dans l\'écran de vente en dépôt', (await scanner(p1.ref)) === p1.id, p1.ref);
    let l = prises([p1.id]);
    ok('Prise en caisse enregistrée : vente, caissière, heure du chargement', l !== null && l.length === 1 && l[0].split('|')[1] === ADMIN
      && l[0].split('|')[2] >= t0 && l[0].split('|')[2] <= q('SELECT NOW()'), JSON.stringify(l));
    const premiere = l && l[0];
    await p.waitForTimeout(1500);
    ok('Prévente rechargée : chargée de nouveau', (await scanner(p1.ref)) === p1.id);
    l = prises([p1.id]);
    ok('Rechargée : une seule prise, la première heure gardée', l !== null && l.length === 1 && l[0] === premiere, JSON.stringify(l));
    ok('Vente dont le vendeur est la caissière : chargée, aucune prise enregistrée', (await scanner(p2.ref)) === p2.id && (prises([p2.id]) || ['x']).length === 0,
      JSON.stringify(prises([p2.id])));
    ok('Bilan : ni la vente (statut, montant, annulation, lignes) ni le stock du dépôt et de l\'officine ne changent',
      JSON.stringify([p1, p2].map((x) => empreinte(x.id))) === JSON.stringify(avant) && stocks() === stocksAvant,
      JSON.stringify({ avant, apres: [p1, p2].map((x) => empreinte(x.id)), stocksAvant, stocks: stocks() }));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    const ids = C.ventesDuTest();
    if (TABLE()) { C.exec(`DELETE FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)})`); }
    C.nettoyer();
    retirerDepot();
    ok('Jeu d\'essai retiré : prises, dépôt et son stock', (!TABLE() || q(`SELECT COUNT(*) FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)})`) === '0')
      && q(`SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${DEPOT}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '${MARQUE}%'`) === '0');
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
