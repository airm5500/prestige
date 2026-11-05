/* CAS 1 DU 03/11/2026, BILAN AVANT / APRES (regle du 05/11) : chaque cloture avec une ligne au comptant laisse
 * exactement les traces attendues, ni plus ni moins, sur des cas varies :
 *  A. deux organismes (RO 70 % plafonne par vente, RC 20 %), trois lignes de quantites 2, 3 et 1, deux lignes cochees,
 *     especes : stock −quantite une seule fois par produit, un mouvement de caisse par vente, une recette par vente,
 *     un reglement par vente, deux lignes tiers-payant (part RO = plafond atteint, part RC = 20 %), somme des parts =
 *     base ; puis annulation de la vente comptant par la liste des ventes terminees (ses produits reviennent en stock,
 *     la vente assurance ne bouge pas), puis annulation de la vente assurance (son produit revient, lignes tiers-payant
 *     annulees, la vente comptant deja annulee ne bouge pas) ;
 *  B. differe : rien de paye ; les deux ventes portent chacune leur dette (part client, comptant), solde du client
 *     = somme des dettes = net affiche, aucune recette, aucun mouvement de caisse encaisse ;
 *  C. zero : organisme a 100 %, part client nulle, une ligne cochee : net = comptant seul, la vente assurance
 *     n'encaisse rien, la vente comptant encaisse le comptant ; stock sorti une fois.
 * Lancement seul : node src/test/e2e/ligne-comptant/test-bilan-ligne-comptant.js
 */
const C = require('./commun');
const { ok, q, exec, A } = C;

const arrondi5 = (v) => (v <= 0 ? 0 : (v % 5 === 0 ? v : v + (5 - (v % 5))));
const nb = (s) => (s === 'aucun' || s === 'aucune' ? 0 : s.split(' ; ').length);

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const RO = A.tiersPayant('BRO', '1');
  const RC = A.tiersPayant('BRC', '1');
  const TP100 = A.tiersPayant('B100', '1');
  const P = [C.produitSimple(12), C.produitSimple(13), C.produitSimple(14), C.produitSimple(15)];
  const CIP = P.map(C.cip);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const stocks = () => P.map((x) => A.stock(x));
  const quantite = async (cip, qte) => {
    const id = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
      const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cel = grille.getView().getCell(r, col);
      cel.dom.id = cel.dom.id || ('e2e-qd-' + Math.random().toString(36).slice(2)); return cel.dom.id; }, [C.GRILLE, cip]);
    const rep = p.waitForResponse((x) => /update\/item\/vno/.test(x.url()), { timeout: 30000 });
    await p.click('#' + id);
    await p.waitForTimeout(300);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(qte), { delay: 30 });
    await p.keyboard.press('Enter');
    await rep;
    await p.waitForTimeout(1200);
  };
  const net = async () => {
    await p.evaluate(() => testextjs.app.getController('VenteCtr').autoComputeNetAssurance());
    await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    return C.rail(p);
  };
  try {
    /* ================= A. deux organismes, plafond, quantites, deux coches, especes, annulations ================= */
    const clA = await A.clientAssure(api, 'BILA', [{ tp: RO, taux: 70 }, { tp: RC, taux: 20 }]);
    const PLAFOND = 1500;
    exec("UPDATE t_compte_client_tiers_payant SET dbl_PLAFOND = " + PLAFOND + " WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clA.lien(RO) + "'");
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' BILA');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-A1');
    await C.saisirBon(p, 2, C.MARQUE + '-BON-A2');
    const avantA = stocks();
    await C.taperArticle(p, CIP[0]);
    await quantite(CIP[0], 2);
    await C.taperArticle(p, CIP[1]);
    await quantite(CIP[1], 3);
    await C.taperArticle(p, CIP[2]);
    const vA = await C.venteCourante(p);
    C.noterVente(vA);
    const c1 = await C.cocher(p, CIP[1]);
    const c2 = await C.cocher(p, CIP[2]);
    const railA = await net();
    const baseAssurance = 2 * P[0].pu;
    const comptantA = 3 * P[1].pu + P[2].pu;
    ok('A. Préparation : deux organismes, lignes 2 × P1, 3 × P2 (cochée), 1 × P3 (cochée)', !!vA && c1 && c1.success && c2 && c2.success && C.lignes(vA).split(' ; ').length === 3, vA);
    ok('A. Écran : part RO = plafond par vente atteint (' + PLAFOND + '), part RC = 20 % de la ligne assurance, DONT COMPTANT = lignes cochées',
      railA.montantTp === PLAFOND + Math.round(baseAssurance * 0.2) && railA.comptant.valeur === arrondi5(comptantA) && railA.net.valeur === railA.partClient.valeur + railA.comptant.valeur
      && railA.partClient.valeur === arrondi5(baseAssurance - railA.montantTp), JSON.stringify(railA) + ' base ' + baseAssurance);
    const clotA = await C.terminerVente(p, false);
    const vnoA = clotA.venteLiee;
    C.noterVente(vnoA);
    ok('A. Clôture : deux ventes', clotA.success === true && !!vnoA, JSON.stringify(clotA).slice(0, 200));
    const apresA = stocks();
    ok('A. Stock : P1 −2, P2 −3, P3 −1, P4 inchangé, chaque produit sorti une seule fois', apresA[0] === avantA[0] - 2 && apresA[1] === avantA[1] - 3 && apresA[2] === avantA[2] - 1 && apresA[3] === avantA[3],
      avantA.join('/') + ' -> ' + apresA.join('/'));
    ok('A. Mouvements de stock : un par ligne, sur la bonne vente (P1 sur l\'assurance, P2 et P3 sur le comptant)',
      C.mouvementsStock(vA) === P[0].id + '/2/' + C.mouvementsStock(vA).split('/')[2] && nb(C.mouvementsStock(vnoA)) === 2 && C.mouvementsStock(vnoA).includes(P[1].id + '/3/') && C.mouvementsStock(vnoA).includes(P[2].id + '/1/'),
      C.mouvementsStock(vA) + ' || ' + C.mouvementsStock(vnoA));
    const tpA = C.lignesTp(vA);
    const partRO = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + vA + "' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clA.lien(RO) + "'"));
    const partRC = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + vA + "' AND lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clA.lien(RC) + "'"));
    ok('A. Lignes tiers-payant : RO au plafond (' + PLAFOND + '), RC = 20 % de la ligne assurance, aucune sur la vente comptant, somme = part affichée',
      partRO === PLAFOND && partRC === Math.round(baseAssurance * 0.2) && partRO + partRC === railA.montantTp && C.lignesTp(vnoA) === 'aucune', tpA);
    const mA = C.mouvements(vA), mAv = C.mouvements(vnoA);
    ok('A. Caisse : un mouvement par vente, montant payé = part client / comptant, crédit = parts des organismes sur l\'assurance',
      nb(mA) === 1 && nb(mAv) === 1 && Number(mA.split('/')[6]) === railA.partClient.valeur && Number(mA.split('/')[3]) === railA.montantTp && Number(mAv.split('/')[6]) === railA.comptant.valeur
      && Number(mAv.split('/')[3]) === 0, mA + ' || ' + mAv);
    ok('A. Recettes et règlements : une recette et un règlement par vente, aux mêmes montants',
      C.recettes(vA).startsWith(railA.partClient.valeur + '/') && C.recettes(vnoA).startsWith(railA.comptant.valeur + '/') && nb(C.reglements(vA)) === 1 && nb(C.reglements(vnoA)) === 1
      && Number(C.reglements(vA).split('/')[1]) === railA.partClient.valeur && Number(C.reglements(vnoA).split('/')[1]) === railA.comptant.valeur,
      C.recettes(vA) + ' | ' + C.recettes(vnoA) + ' | ' + C.reglements(vA) + ' | ' + C.reglements(vnoA));
    /* le ticket assurance : somme des parts par ligne = parts en base, organisme par organisme */
    const ap = await C.apercu(p, vA, false);
    const ta = ap.success ? C.lireTicket(ap.tickets[0]) : null;
    const partsRO = ta ? ta.articles.map((a) => (a.credits.find((c) => c.texte.indexOf(RO) === 0) || { part: 0 }).part).reduce((s, x) => s + x, 0) : -1;
    const partsRC = ta ? ta.articles.map((a) => (a.credits.find((c) => c.texte.indexOf(RC) === 0) || { part: 0 }).part).reduce((s, x) => s + x, 0) : -1;
    ok('A. Ticket assurance : une seule ligne (P1 × 2), parts par ligne RO et RC = parts en base (plafond compris)', ta && ta.articles.length === 1 && ta.articles[0].quantite === 2
      && partsRO === partRO && partsRC === partRC, JSON.stringify(ta && ta.articles));
    /* annulation de la vente comptant */
    const refVno = C.vente(vnoA).ref, refVo = C.vente(vA).ref;
    const a1 = await C.annulerVente(p, refVno);
    const apresAnnulVno = stocks();
    ok('A. Annulation de la vente comptant : P2 +3 et P3 +1 reviennent, P1 reste sorti ; la vente assurance ne bouge pas (close, non annulée, mêmes lignes tiers-payant)',
      a1 === 200 && apresAnnulVno[1] === avantA[1] && apresAnnulVno[2] === avantA[2] && apresAnnulVno[0] === avantA[0] - 2
      && C.vente(vA).statut === 'is_Closed' && !C.vente(vA).annulee && C.lignesTp(vA) === tpA && C.mouvements(vA) === mA, apresAnnulVno.join('/') + ' ' + JSON.stringify(C.vente(vA)));
    const a2 = await C.annulerVente(p, refVo);
    const apresAnnulVo = stocks();
    ok('A. Annulation de la vente assurance : P1 +2 revient, tout le stock est rendu ; la vente comptant déjà annulée ne bouge pas',
      a2 === 200 && apresAnnulVo.join('/') === avantA.join('/') && (C.vente(vA).annulee || q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + vA + "'") !== '0')
      && C.vente(vnoA).annulee, apresAnnulVo.join('/') + ' ' + JSON.stringify(C.vente(vA)));

    /* ================= B. differe : dettes et solde du client ================= */
    const clB = await A.clientAssure(api, 'BILB', [{ tp: RO, taux: 70 }]);
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' BILB');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-B1');
    const avantB = stocks();
    await C.taperArticle(p, CIP[0]);
    await C.taperArticle(p, CIP[3]);
    const vB = await C.venteCourante(p);
    C.noterVente(vB);
    const cB = await C.cocher(p, CIP[3]);
    const railB = await net();
    ok('B. Préparation : vente assurance différée, P1 assurance, P4 cochée', cB && cB.success && railB.comptant.valeur === arrondi5(P[3].pu), JSON.stringify(railB));
    const clotB = await C.terminerVente(p, false, 'differe');
    const vnoB = clotB.venteLiee;
    C.noterVente(vnoB);
    ok('B. Clôture en différé : deux ventes', clotB.success === true && !!vnoB, JSON.stringify(clotB).slice(0, 200));
    const dVo = C.dettes(vB), dVno = C.dettes(vnoB);
    const soldeClient = Number(q("SELECT IFNULL(SUM(c.int_PRICE_RESTE), 0) FROM t_preenregistrement_compte_client c JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
      + " WHERE v.lg_CLIENT_ID = '" + clB.clientId + "' AND c.str_STATUT <> 'delete'"));
    ok('B. Dettes : la vente assurance porte la part client, la vente comptant porte le comptant, rien de payé',
      dVo.split('/')[0] === String(C.vente(vB).partClient) && dVo.split('/')[1] === dVo.split('/')[0] && dVno.split('/')[0] === String(arrondi5(P[3].pu) === P[3].pu ? P[3].pu : P[3].pu) && dVno.split('/')[1] === dVno.split('/')[0],
      dVo + ' || ' + dVno);
    ok('B. Solde du client = somme des deux dettes = net affiché (à l\'arrondi près), même solde en base',
      Math.abs(soldeClient - railB.net.valeur) <= 4 && soldeClient === Number(dVo.split('/')[1]) + Number(dVno.split('/')[1]), soldeClient + ' / net ' + railB.net.valeur);
    ok('B. Aucune recette, mouvements de caisse à 0 payé, reste dû = dette', C.recettes(vB) === 'aucune' && C.recettes(vnoB) === 'aucune'
      && Number(C.mouvements(vB).split('/')[6]) === 0 && Number(C.mouvements(vnoB).split('/')[6]) === 0 && C.vente(vB).statutVente === 'Differe' && C.vente(vnoB).statutVente === 'Differe',
      C.mouvements(vB) + ' || ' + C.mouvements(vnoB) + ' ' + C.vente(vB).statutVente);
    const apresB = stocks();
    ok('B. Stock : P1 −1 et P4 −1, une fois', apresB[0] === avantB[0] - 1 && apresB[3] === avantB[3] - 1 && apresB[1] === avantB[1] && apresB[2] === avantB[2], avantB.join('/') + ' -> ' + apresB.join('/'));

    /* ================= C. zero : organisme a 100 % ================= */
    await A.clientAssure(api, 'BILC', [{ tp: TP100, taux: 100 }]);
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' BILC');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-C1');
    const avantC = stocks();
    await C.taperArticle(p, CIP[1]);
    await C.taperArticle(p, CIP[2]);
    const vC = await C.venteCourante(p);
    C.noterVente(vC);
    const cC = await C.cocher(p, CIP[2]);
    const railC = await net();
    ok('C. Préparation : organisme à 100 %, P2 assurance, P3 cochée : part client 0, net = comptant seul', cC && cC.success && railC.partClient.valeur === 0 && railC.net.valeur === railC.comptant.valeur
      && railC.comptant.valeur === arrondi5(P[2].pu) && railC.montantTp === P[1].pu, JSON.stringify(railC));
    const clotC = await C.terminerVente(p, false);
    const vnoC = clotC.venteLiee;
    C.noterVente(vnoC);
    ok('C. Clôture : deux ventes', clotC.success === true && !!vnoC, JSON.stringify(clotC).slice(0, 200));
    ok('C. La vente assurance n\'encaisse rien (part client 0, payé 0), la vente comptant encaisse le comptant',
      C.vente(vC).partClient === 0 && Number(C.mouvements(vC).split('/')[6]) === 0 && Number(C.mouvements(vnoC).split('/')[6]) === railC.comptant.valeur
      && C.recettes(vnoC).startsWith(railC.comptant.valeur + '/') && (C.recettes(vC) === 'aucune' || C.recettes(vC).startsWith('0/')),
      C.mouvements(vC) + ' || ' + C.mouvements(vnoC) + ' | ' + C.recettes(vC) + ' | ' + C.recettes(vnoC));
    const apresC = stocks();
    ok('C. Stock : P2 −1 et P3 −1, une fois', apresC[1] === avantC[1] - 1 && apresC[2] === avantC[2] - 1 && apresC[0] === avantC[0] && apresC[3] === avantC[3], avantC.join('/') + ' -> ' + apresC.join('/'));
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
