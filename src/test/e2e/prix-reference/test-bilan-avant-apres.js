/* CAS 2, TEST DE BILAN AVANT / APRES (regle du 05/11) : chaque saisie a la caisse laisse EXACTEMENT les traces attendues,
 * ni plus ni moins. Avant et apres chaque operation, un releve de la base est pris (prix de reference, journal, taux
 * par ligne, ventes, lignes, organismes de la vente, caisse, mouvements de produit, recettes, reglements, stock,
 * parametre, fiche produit) et l'ecart est compare a la liste attendue.
 *
 * Operations, par le vrai chemin de l'ecran (cellule cliquee, valeur tapee, Entree) sur une vente assurance de deux
 * lignes (quantites 2 et 1) :
 *  1. P.REF sur la ligne 1                -> + 1 prix_reference (MIX, taux de l'organisme), + 1 journal AJOUT, + 1 taux
 *     de ligne (taux_produit), part de l'organisme et part du client de la vente ouverte recalculees (= regle) ;
 *  2. TAUX 60 sur la ligne 1              -> meme ligne prix_reference modifiee, + 1 journal MODIFICATION, taux de
 *     ligne remplace (pas empile), parts recalculees ;
 *  3. P.REF 0 sur la ligne 1 (refuse)     -> rien ;
 *  4. TAUX 60 a nouveau (sans changement) -> rien ;
 *  5. TAUX 35 sur la ligne 2              -> + 1 prix_reference (prix de vente, 35), + 1 journal AJOUT, + 1 taux de
 *     ligne, parts recalculees ;
 *  6. parametre a 0, saisie par le service -> 403, rien ;
 *  7. « Supprimer » en fiche article (ligne 1) -> - 1 prix_reference, + 1 journal SUPPRESSION, rien d'autre (la vente
 *     ouverte n'est pas recalculee par la fiche).
 * Jamais : stock, mouvements de produit, caisse, recette, reglement, nombre de ventes, lignes de vente (quantites,
 * prix), nombre d'organismes, prix du produit. Le defaut remis a l'essai : les taux de ligne s'empilaient a chaque
 * recalcul (6 lignes taux_produit pour une ligne de vente) ; un seul par ligne et par organisme desormais.
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/prix-reference/test-bilan-avant-apres.js
 */
const C = require('./commun');
const { ok, q, A } = C;

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  const TAUX_TP = 80;
  const TP = A.tiersPayant('BIL', '1');
  const P1 = C.produitSansReference(9);
  const P2 = C.produitSansReference(10);
  const CIP1 = C.cip(P1); const CIP2 = C.cip(P2);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  let venteId = null;

  /* releve des traces : tout ce qu'une saisie pourrait toucher */
  const releve = () => ({
    prixReference: q('SELECT COUNT(*) FROM prix_reference'),
    referencesDesProduits: C.references(P1.id) + ' | ' + C.references(P2.id),
    journal: q('SELECT COUNT(*) FROM prix_reference_journal'),
    journalDesProduits: C.journal(P1.id) + ' | ' + C.journal(P2.id),
    tauxProduit: q('SELECT COUNT(*) FROM taux_produit'),
    ventes: q('SELECT COUNT(*) FROM t_preenregistrement'),
    vente: venteId ? q("SELECT CONCAT_WS('|', str_STATUT, int_PRICE, IFNULL(int_CUST_PART, 'NULL'), IFNULL(int_PRICE_REMISE, 0)) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") : '',
    lignes: venteId ? q("SELECT GROUP_CONCAT(CONCAT_WS('/', lg_FAMILLE_ID, int_QUANTITY, int_PRICE_UNITAIR, int_PRICE) ORDER BY lg_FAMILLE_ID SEPARATOR ' ; ') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") : '',
    organismesDeLaVente: venteId ? A.lignesTp(venteId) : '',
    organismes: q('SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent'),
    caisse: q('SELECT COUNT(*) FROM mvttransaction'),
    mouvementsProduit: q('SELECT COUNT(*) FROM hmvtproduit'),
    recettes: q('SELECT COUNT(*) FROM t_recettes'),
    reglements: q('SELECT COUNT(*) FROM vente_reglement'),
    stock: A.stock(P1) + '/' + A.stock(P2),
    produits: q("SELECT GROUP_CONCAT(CONCAT_WS('/', int_PRICE, IFNULL(int_NOMBRE_VENTES, 'NULL')) ORDER BY lg_FAMILLE_ID SEPARATOR ' ; ') FROM t_famille WHERE lg_FAMILLE_ID IN ('" + P1.id + "', '" + P2.id + "')"),
    parametre: q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_PRIX_REF_CAISSE'"),
  });
  /* ecart entre deux releves : la liste des traces qui ont bouge */
  const ecart = (avant, apres) => Object.keys(avant).filter((k) => avant[k] !== apres[k]).sort();
  const compte = (r, k) => Number(r[k]);
  /* parts de la vente ouverte : part de l'organisme (ligne tiers-payant de la vente) et part du client (vente) */
  const partOrganisme = (r) => Number(String(r.organismesDeLaVente).split('/')[2]);
  const partClient = (r) => Number(String(r.vente).split('|')[2]);
  const prixVente = () => 2 * P1.pu + P2.pu;
  /* regle : part de l'organisme = somme des (prix de reference ou prix de vente) x quantite x taux de la ligne */
  const regle = (valeur1, taux1, taux2) => Math.round((valeur1 * 2 * taux1 + P2.pu * taux2) / 100);
  const partsRecalculees = (r, attendu) => Math.abs(partOrganisme(r) - attendu) <= 1 && Math.abs(partClient(r) - (prixVente() - partOrganisme(r))) <= 1;
  const AVEC_RECALCUL = ['tauxProduit', 'vente', 'organismesDeLaVente'];
  /* bilan d'une operation : exactement les traces attendues ont bouge, et comme attendu */
  const bilan = (nom, avant, apres, attendus, verif) => {
    const e = ecart(avant, apres);
    const detail = e.map((k) => k + ' : ' + String(avant[k]).slice(0, 120) + ' -> ' + String(apres[k]).slice(0, 120)).join(' ; ') || 'aucune trace';
    ok(nom + ' : seules ces traces bougent [' + attendus.join(', ') + ']', JSON.stringify(e) === JSON.stringify(attendus.slice().sort()), detail);
    if (verif) { ok(nom + ' : contenu des traces attendu', verif(avant, apres), detail); }
  };

  try {
    await A.clientAssure(api, 'BIL', [{ tp: TP, taux: TAUX_TP }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' BIL');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-BIL');
    await C.taperArticle(p, CIP1);
    await C.taperArticle(p, CIP2);
    venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    /* QD 2 sur la ligne 1, par la cellule */
    const idQd = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
      const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cel = grille.getView().getCell(r, col);
      cel.dom.id = cel.dom.id || 'e2e-qd-bilan'; return cel.dom.id; }, [C.GRILLE, CIP1]);
    const repQd = p.waitForResponse((r) => /\/vente\/update\/item/.test(r.url()), { timeout: 30000 });
    repQd.catch(() => {});
    await p.click('#' + idQd);
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2', { delay: 30 });
    await p.keyboard.press('Enter');
    await repQd;
    await p.waitForTimeout(1500);
    const t0 = releve();
    ok('Préparation : vente assurance ouverte, quantités 2 et 1, aucune référence sur les deux produits', !!venteId
      && t0.lignes.indexOf(P1.id + '/2/' + P1.pu + '/' + (2 * P1.pu)) >= 0 && t0.lignes.indexOf(P2.id + '/1/' + P2.pu) >= 0 && t0.referencesDesProduits === 'aucune | aucune', t0.lignes);

    /* 1. P.REF sur la ligne 1 */
    const valeur1 = P1.pu - 200;
    const r1 = await C.saisirEtEnregistrer(p, CIP1, TP, 'valeur', valeur1);
    const t1 = releve();
    ok('1. P.REF ' + valeur1 + ' sur la ligne 1 : accepté', r1.http === 200 && r1.success === true, JSON.stringify(r1).slice(0, 200));
    bilan('1. Ajout par P.REF', t0, t1, ['prixReference', 'referencesDesProduits', 'journal', 'journalDesProduits', ...AVEC_RECALCUL], (a, b) => compte(b, 'prixReference') === compte(a, 'prixReference') + 1
      && compte(b, 'journal') === compte(a, 'journal') + 1 && b.referencesDesProduits === TP + '/MIX_TAUX_PRIX/' + valeur1 + '/' + TAUX_TP + '/1 | aucune'
      && new RegExp('^AJOUT/NULL/' + valeur1 + '/NULL/' + TAUX_TP + '/MIX_TAUX_PRIX/' + venteId + '/' + A.ADMIN + '/[^/]+/' + TP + ' \\| aucun$').test(b.journalDesProduits)
      && compte(b, 'tauxProduit') === compte(a, 'tauxProduit') + 1 && partsRecalculees(b, regle(valeur1, TAUX_TP, TAUX_TP)));

    /* 2. TAUX 60 sur la ligne 1 */
    const r2 = await C.saisirEtEnregistrer(p, CIP1, TP, 'taux', 60);
    const t2 = releve();
    ok('2. TAUX 60 sur la ligne 1 : accepté', r2.http === 200 && r2.success === true, JSON.stringify(r2).slice(0, 200));
    bilan('2. Modification du taux', t1, t2, ['referencesDesProduits', 'journal', 'journalDesProduits', 'vente', 'organismesDeLaVente'], (a, b) => compte(b, 'prixReference') === compte(a, 'prixReference')
      && compte(b, 'journal') === compte(a, 'journal') + 1 && b.referencesDesProduits === TP + '/MIX_TAUX_PRIX/' + valeur1 + '/60/1 | aucune'
      && new RegExp(' ; MODIFICATION/' + valeur1 + '/' + valeur1 + '/' + TAUX_TP + '/60/MIX_TAUX_PRIX/' + venteId + '/' + A.ADMIN + '/[^/]+/' + TP + ' \\| aucun$').test(b.journalDesProduits)
      && compte(b, 'tauxProduit') === compte(a, 'tauxProduit') && partsRecalculees(b, regle(valeur1, 60, TAUX_TP)));
    const tauxLigne1 = q("SELECT IFNULL(GROUP_CONCAT(ROUND(t.taux * 100)), 'aucun') FROM taux_produit t JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = t.sale_iem_id"
      + " WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "' AND d.lg_FAMILLE_ID = '" + P1.id + "'");
    ok('2. Un seul taux de ligne pour la ligne 1, le dernier (60), pas d\'empilement des recalculs', tauxLigne1 === '60', tauxLigne1);

    /* 3. P.REF 0 : refuse a l'ecran, rien ne part */
    const requetes = [];
    const ecouteur = (r) => { if (/prix-reference/.test(r.url())) { requetes.push(r.method() + ' ' + r.url().replace(/.*api\/v1\//, '')); } };
    p.on('request', ecouteur);
    await C.saisirCellule(p, CIP1, TP, 'valeur', 0);
    await p.waitForTimeout(2000);
    const t3 = releve();
    const e3 = await C.entete(p);
    ok('3. P.REF 0 : refusé à l\'écran (message), aucune requête', /au moins 5/.test(e3.message) && requetes.length === 0, e3.message + ' / ' + requetes.join(' '));
    bilan('3. Saisie refusée', t2, t3, []);

    /* 4. TAUX 60 a nouveau : sans changement, rien ne part */
    await C.saisirCellule(p, CIP1, TP, 'taux', 60);
    await p.waitForTimeout(2000);
    p.off('request', ecouteur);
    const t4 = releve();
    ok('4. TAUX 60 à nouveau : aucune requête', requetes.length === 0, requetes.join(' '));
    bilan('4. Saisie sans changement', t3, t4, []);

    /* 5. TAUX 35 sur la ligne 2 (quantite 1, prix de vente garde comme prix de reference) */
    const r5 = await C.saisirEtEnregistrer(p, CIP2, TP, 'taux', 35);
    const t5 = releve();
    ok('5. TAUX 35 sur la ligne 2 : accepté', r5.http === 200 && r5.success === true, JSON.stringify(r5).slice(0, 200));
    bilan('5. Ajout par TAUX', t4, t5, ['prixReference', 'referencesDesProduits', 'journal', 'journalDesProduits', ...AVEC_RECALCUL], (a, b) => compte(b, 'prixReference') === compte(a, 'prixReference') + 1
      && compte(b, 'journal') === compte(a, 'journal') + 1 && b.referencesDesProduits === TP + '/MIX_TAUX_PRIX/' + valeur1 + '/60/1 | ' + TP + '/MIX_TAUX_PRIX/' + P2.pu + '/35/1'
      && new RegExp(' \\| AJOUT/NULL/' + P2.pu + '/NULL/35/MIX_TAUX_PRIX/' + venteId + '/' + A.ADMIN + '/[^/]+/' + TP + '$').test(b.journalDesProduits)
      && compte(b, 'tauxProduit') === compte(a, 'tauxProduit') + 1 && partsRecalculees(b, regle(valeur1, 60, 35)));

    /* 6. parametre a 0 : le service refuse, rien n'est ecrit */
    A.exec("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'KEY_PRIX_REF_CAISSE'");
    const l1 = await C.ligne(p, CIP1);
    const put = await p.evaluate(async ([u, tp]) => { const r = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiersPayantId: tp, valeur: 500, taux: 50 }) }); return r.status; }, ['../api/v1/prix-reference/vente/' + venteId + '/ligne/' + l1.detailId, TP]);
    const t6 = releve();
    ok('6. Paramètre à 0 : la saisie par le service est refusée (403)', put === 403, put);
    bilan('6. Paramètre à 0', t5, t6, ['parametre']);
    A.exec("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_PRIX_REF_CAISSE'");
    const t6b = releve();

    /* 7. suppression en fiche article de la reference de la ligne 1 */
    await C.ouvrirEcran(p, 'famillemanager');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await C.vues.cliquer(p, '#rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(CIP1, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligneArticle = p.locator('.x-grid-row').filter({ visible: true, hasText: CIP1 }).first();
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
    const idGrille = await p.evaluate(() => Ext.ComponentQuery.query('prixReference #prixGrid')[0].getId());
    const repSuppr = p.waitForResponse((r) => r.request().method() === 'DELETE' && /prix-reference\//.test(r.url()), { timeout: 30000 }).catch(() => null);
    await p.locator('#' + idGrille + ' .x-grid-row').first().locator('img[data-qtip="Supprimer"]').click();
    await repSuppr;
    await p.waitForTimeout(1500);
    const t7 = releve();
    bilan('7. Suppression en fiche article', t6b, t7, ['prixReference', 'referencesDesProduits', 'journal', 'journalDesProduits'], (a, b) => compte(b, 'prixReference') === compte(a, 'prixReference') - 1
      && compte(b, 'journal') === compte(a, 'journal') + 1 && b.referencesDesProduits === 'aucune | ' + TP + '/MIX_TAUX_PRIX/' + P2.pu + '/35/1'
      && new RegExp(' ; SUPPRESSION/' + valeur1 + '/NULL/60/NULL/NULL/NULL/' + A.ADMIN + '/[^/]+/' + TP + ' \\| ').test(b.journalDesProduits));

    /* en tout : la vente, ses lignes, le stock, la caisse, les recettes et les reglements n'ont jamais bouge */
    const jamais = ['ventes', 'lignes', 'organismes', 'caisse', 'mouvementsProduit', 'recettes', 'reglements', 'stock', 'produits'];
    ok('Du début à la fin : stock, mouvements de produit, caisse, recettes, règlements, nombre de ventes, lignes de vente et prix du produit strictement inchangés',
      jamais.every((k) => t0[k] === t7[k]), jamais.filter((k) => t0[k] !== t7[k]).map((k) => k + ' : ' + t0[k] + ' -> ' + t7[k]).join(' ; '));
    ok('Du début à la fin : deux taux de ligne en tout (un par ligne avec référence), la vente toujours ouverte', compte(t7, 'tauxProduit') === compte(t0, 'tauxProduit') + 2
      && t7.vente.indexOf('is_Process|' + prixVente() + '|') === 0, t0.tauxProduit + ' -> ' + t7.tauxProduit + ' ; ' + t7.vente);
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
