/* AUDIT 05 PR-01 : RAPPROCHEMENT ET BILAN D'UNE VENTE AU COMPTANT AVEC PROMOTIONS (regle de test du 05/11).
 * Vente de cinq lignes, chacune d'un cas different, par l'ecran (compte de test) :
 *  - P  PRIX SPECIAL (prix public - 135), quantite 2 ;
 *  - R  REMISE 15 %, promotion creee quand le prix public etait plus bas de 500 : la remise suit le prix du jour ;
 *  - U1 UNITES GRATUITES, 2 offertes a partir de 3, quantite 4 : 3 payees, 1 offerte (groupe incomplet) ;
 *  - U2 UNITES GRATUITES, 1 offerte a partir de 2, quantite 7 : 6 payees, 1 offerte (« a partir de » : une seule
 *    fois, choix du 07/11 ; avant : 5 payees, 2 offertes) ;
 *  - N  sans promotion, quantite 3 : seule ligne remisee par la remise client (10 %).
 * Parcours : SERVICE CLIENT > Ventes > nouvelle vente ; articles scannes ; quantites tapees dans la cellule QD ; remise
 * choisie dans la liste « REMISE » ; Entree dans le champ produit vide (net a payer) ; montant recu ; « TERMINER LA
 * VENTE » sans ticket ; puis « Vente terminées » > icone « Annuler.Vente » > Oui.
 * Rapprochement, ligne par ligne : ecran (grille) = ticket (apercu de la reimpression) = base, quantite, prix unitaire,
 * montant, mention PROMOTION et unites offertes ; total, remise et net : ecran = ticket = vente = mouvement de caisse =
 * recette = reglement.
 * Bilan : stock de chaque produit = avant - quantite (offertes comprises), une sortie par ligne, un mouvement de caisse,
 * une recette, un reglement ; rien d'autre. Annulation : stock rendu a l'identique, une entree par ligne, mouvement et
 * recette opposes.
 * Tout est retire a la fin (ventes, promotions, remise, stock, caisse, droits).
 * Lancement seul : node src/test/e2e/audits/test-ecran-promotion-rapprochement.js
 */
const { chromium } = require('playwright-core');
const A = require('./commun');
const vues = require('../outils/vues');
const privilegeEssai = require('../support/privilege-essai');
const { ok, q, exec, MARQUE } = A;

const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;
const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
const REMISE = MARQUE + '-PR01-REMISE', NOM_REMISE = MARQUE + ' PR01 remise', GRILLE = MARQUE + '-PR01-GRILLE';
const TYPE_REMISE_PRODUIT = '54291528198233221411';
const [CODE, CODE_GRILLE] = q("SELECT str_CODE_REMISE_ARTICLE, str_CODE_GRILLE_VNO FROM t_workflow_remise_article WHERE str_STATUT = 'enable'"
  + " AND str_CODE_REMISE_ARTICLE NOT IN ('2', '3') AND str_CODE_GRILLE_VNO IS NOT NULL ORDER BY str_CODE_REMISE_ARTICLE DESC LIMIT 1").split('\t');
const droitAnnuler = privilegeEssai(q, exec, A.ENV_E2E.LOGIN, 'P_BT_ANNULER_VENTE');

/* cinq produits sans promotion, CIP a 7 chiffres, prix differents ; stock force a 60 (remis a la fin) */
const filtre = " AND f.int_PRICE BETWEEN 1000 AND 5000 AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)';
const [P, R, U1, U2, N] = [11, 23, 37, 41, 53].map((rang) => A.produit(rang, 60, filtre));
for (const x of [P, R, U1, U2, N]) {
  const [cip, code, drapeau] = q(`SELECT CONCAT_WS('|', int_CIP, IFNULL(str_CODE_REMISE, 'NULL'), IFNULL(bl_PROMOTED + 0, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`).split('|');
  Object.assign(x, { cip, code, drapeau });
}
const promotions = [];
const promo = (type, f, remise, prix, seuil, offertes) => {
  const id = Number(q(`INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE) VALUES ('${type}', CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY);`
    + ' SELECT LAST_INSERT_ID();'));
  promotions.push(id);
  exec(`INSERT INTO t_promotion_product (int_DISCOUNT, bl_MODE, int_PACK_NUMBER, db_PRICE, int_ACTIVE_AT, dt_PROMOTED_DATE, lg_FAMILLE_ID, lg_CODE_PROMOTION_ID)`
    + ` VALUES (${remise}, ${type === 'REMISE' ? 1 : 0}, ${offertes}, ${prix}, ${seuil}, NOW(), '${f.id}', ${id}); UPDATE t_famille SET bl_PROMOTED = 1 WHERE lg_FAMILLE_ID = '${f.id}'`);
};
/* attendus, calcules ici sans le code de Prestige */
const CAS = [
  { f: P, qte: 2, pu: P.pu - 135, offertes: 0, promo: true },
  { f: R, qte: 1, pu: Math.round(R.pu * 85 / 100), offertes: 0, promo: true },
  { f: U1, qte: 4, pu: U1.pu, offertes: 1, promo: true, seuil: 3 },
  { f: U2, qte: 7, pu: U2.pu, offertes: 1, promo: true, seuil: 2 },
  { f: N, qte: 3, pu: N.pu, offertes: 0, promo: false },
];
CAS.forEach((c) => { c.montant = c.pu * (c.qte - c.offertes); });

function poser() {
  exec(`INSERT INTO t_remise (lg_REMISE_ID, str_NAME, str_CODE, dbl_TAUX, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_REMISE_ID)`
    + ` VALUES ('${REMISE}', '${NOM_REMISE}', 'ZZPR01', 10, 'enable', NOW(), NOW(), '${TYPE_REMISE_PRODUIT}');`
    + ` INSERT INTO t_grille_remise (lg_GRILLE_REMISE_ID, str_CODE_GRILLE, str_DESCRIPTION, dbl_TAUX, str_STATUT, lg_REMISE_ID, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${GRILLE}', ${CODE_GRILLE}, '${MARQUE} PR01', 10, 'enable', '${REMISE}', NOW(), NOW());`
    + ` UPDATE t_famille SET str_CODE_REMISE = '${CODE}' WHERE lg_FAMILLE_ID IN (${A.liste(CAS.map((c) => c.f.id))})`);
  promo('PRIX SPECIAL', P, 0, P.pu - 135, 0, 0);
  promo('REMISE', R, 15, Math.round((R.pu - 500) * 85 / 100), 0, 0);
  promo('UNITES GRATUITES', U1, 0, U1.pu, 3, 2);
  promo('UNITES GRATUITES', U2, 0, U2.pu, 2, 1);
}
function retirer() {
  const l = promotions.join(',') || '0';
  exec(`DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (${l}); DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${l})`);
  for (const c of CAS) {
    exec(`UPDATE t_famille SET bl_PROMOTED = ${c.f.drapeau}, str_CODE_REMISE = ${c.f.code === 'NULL' ? 'NULL' : "'" + c.f.code + "'"} WHERE lg_FAMILLE_ID = '${c.f.id}'`);
  }
}

/* ---- lectures ---- */
const ligneBase = (v, f) => {
  const r = q(`SELECT CONCAT_WS('|', int_QUANTITY, int_PRICE_UNITAIR, int_PRICE, IFNULL(int_FREE_PACK_NUMBER, 0), IFNULL(int_PRICE_REMISE, 0), IFNULL(promotion_produit_id, ''))`
    + ` FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${v}' AND lg_FAMILLE_ID = '${f.id}'`).split('|');
  return { qte: Number(r[0]), pu: Number(r[1]), montant: Number(r[2]), offertes: Number(r[3]), remise: Number(r[4]), promo: r[5] !== '' };
};
const compter = (sql) => Number(q(sql));

(async () => {
  ok('Jeu d\'essai : cinq produits de prix différents, un code remise article', [P, R, U1, U2, N].every((x) => x.id && x.cip) && !!CODE
    && new Set(CAS.map((c) => c.f.pu)).size === 5, CAS.map((c) => c.f.cip + ' ' + c.f.pu).join(', '));
  try { poser(); } catch (e) { retirer(); A.nettoyer(); throw e; }
  A.ouvrirCaisse();
  droitAnnuler.accorder();
  const stockAvant = CAS.map((c) => A.stock(c.f));
  const b = await A.ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  let vente = null;
  const attendre = async (ms) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(ms); };
  const grille = 'doventemanager gridpanel';
  const scanner = async (cip) => { await vues.cliquer(p, CHAMP); await p.keyboard.type(cip, { delay: 30 }); await p.keyboard.press('Enter'); await attendre(1500); };
  const quantite = async (cip, n) => {
    const id = await p.evaluate(([cip, sel]) => { const g = Ext.ComponentQuery.query(sel).filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
      const r = g.getStore().findRecord('intCIP', cip); const col = g.columns.filter((c) => c.dataIndex === 'intQUANTITY')[0];
      const c = g.getView().getCell(r, col); c.dom.id = c.dom.id || 'e2e-qd-' + cip; return c.dom.id; }, [cip, grille]);
    await p.click('#' + id); await p.waitForTimeout(500);
    await p.keyboard.press('Control+A'); await p.keyboard.type(String(n), { delay: 40 }); await p.keyboard.press('Enter');
    await attendre(2000);
  };
  /* ce que la grille affiche pour chaque ligne : valeurs du modele et texte de la ligne rendue */
  const ecran = () => p.evaluate((sel) => { const g = Ext.ComponentQuery.query(sel).filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
    return g.getStore().getRange().map((r) => ({ cip: String(r.get('intCIP')), qte: r.get('intQUANTITY'), pu: r.get('intPRICEUNITAIR'), montant: r.get('intPRICE'),
      offertes: r.get('unitesOffertes') || 0, texte: g.getView().getNode(r).innerText.replace(/\s+/g, ' ') })); }, grille);
  try {
    await vues.connexion(p, A.ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await vues.cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1500);
    for (const c of CAS) {
      await scanner(c.f.cip);
      if (!vente) { vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID); A.etat.ventes.push(vente); }
      if (c.qte !== 1) { await quantite(c.f.cip, c.qte); }
    }
    await vues.choisir(p, 'doventemanager #contenu [xtype=container] #remise', NOM_REMISE);
    await attendre(1500);
    await vues.cliquer(p, CHAMP);
    await p.keyboard.press('Enter');
    await attendre(2500);
    const lignesEcran = await ecran();
    const rail = await p.evaluate(() => { const lire = (x) => { const f = Ext.ComponentQuery.query('doventemanager #contenu #' + x)[0]; return f ? Number(String(f.getValue()).replace(/\D/g, '')) : null; };
      const c = testextjs.app.getController('VenteCtr'); return { total: Number(String(c.getTotalField().getValue()).replace(/\D/g, '')), net: lire('montantNet'), remise: lire('montantRemise') }; });

    /* clôture : montant recu = net affiche, « TERMINER LA VENTE », ticket refuse */
    await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
    await p.keyboard.press('Control+A'); await p.keyboard.type(String(rail.net), { delay: 20 }); await p.keyboard.press('Tab');
    await p.waitForTimeout(500);
    const rep = p.waitForResponse((x) => /\/vente\/cloturer\/vno/.test(x.url()), { timeout: 120000 });
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    const clot = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(1500);
    if (/imprimer/i.test(await vues.texteMessage(p))) { await vues.repondre(p, 'no').catch(() => {}); }
    ok('« TERMINER LA VENTE » : vente close', clot.success === true && A.vente(vente).statut === 'is_Closed', JSON.stringify(clot).slice(0, 200));

    /* ---- rapprochement ligne par ligne : attendu = ecran = ticket = base ---- */
    const apercu = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vno/' + v + '/apercu')).json(), vente);
    ok('Aperçu du ticket de la vente au comptant', apercu.success === true && apercu.tickets && apercu.tickets.length === 1, JSON.stringify(apercu).slice(0, 300));
    const ticket = []; const paires = {};
    for (const bloc of (apercu.tickets && apercu.tickets[0] ? apercu.tickets[0].blocs : [])) {
      for (const e of bloc.elements) {
        /* article : designation | « 2 × 1 175 » | | montant */
        if (e.genre === 'ARTICLE') { const [qte, pu] = String(e.b).split('×');
          ticket.push({ texte: [e.a, e.b, e.c, e.d].join(' | '), designation: e.a, qte: chiffres(qte), pu: chiffres(pu), montant: chiffres(e.d), mention: '' }); }
        else if (e.genre === 'TEXTE' && bloc.id === 'CORPS' && ticket.length && /PROMOTION/.test(e.a)) { ticket[ticket.length - 1].mention = e.a; }
        else if (e.genre === 'PAIRE' || e.genre === 'ENCADRE') { paires[e.a.replace(/\s*:\s*$/, '').trim()] = chiffres(e.b); }
      }
    }
    ok('Ticket : cinq lignes', ticket.length === 5, JSON.stringify(ticket.map((t) => t.texte)));
    for (let i = 0; i < CAS.length; i++) {
      const c = CAS[i], base = ligneBase(vente, c.f), e = lignesEcran.find((x) => x.cip === c.f.cip) || {};
      const t = ticket.find((x) => x.pu === c.pu && x.montant === c.montant && x.qte === c.qte) || ticket[i] || {};
      const nom = c.f.cip + ' (' + ['prix spécial', 'remise 15 %', '2 offertes dès 3', '1 offerte dès 2', 'sans promotion'][i] + ')';
      // plan du 06/11, point 3.2 : « PROMOTION s+n OFFERT(S) » (avant : « PROMOTION DONT n OFFERTE(S) »)
      const mentionAttendue = c.promo ? 'PROMOTION' + (c.offertes ? ' ' + c.seuil + '+' + c.offertes + ' OFFERT(S)' : '') : '';
      ok(`Ligne ${nom} : base = attendu (quantité ${c.qte}, PU ${c.pu}, ${c.offertes} offerte(s), montant ${c.montant}, promotion ${c.promo ? 'oui' : 'non'})`,
        base.qte === c.qte && base.pu === c.pu && base.offertes === c.offertes && base.montant === c.montant && base.promo === c.promo, JSON.stringify(base));
      ok(`Ligne ${nom} : écran = base (quantité, PU, montant, offertes, mention)`, e.qte === base.qte && e.pu === base.pu && e.montant === base.montant
        && e.offertes === base.offertes && /PROMOTION/.test(e.texte || '') === c.promo && (!c.offertes || (e.texte || '').includes(mentionAttendue)),
        JSON.stringify(e));
      ok(`Ligne ${nom} : ticket = base (quantité, PU, montant, mention « ${mentionAttendue || 'aucune'} »)`, t.qte === base.qte && t.pu === base.pu
        && t.montant === base.montant && (t.mention || '').trim() === mentionAttendue, JSON.stringify(t));
      ok(`Ligne ${nom} : remise client ${c.promo ? 'nulle (promotion seule)' : 'présente'}`, c.promo ? base.remise === 0 : base.remise > 0, base.remise);
    }
    const v = A.vente(vente);
    const total = CAS.reduce((s, c) => s + c.montant, 0);
    const remiseLignes = Number(q(`SELECT SUM(IFNULL(int_PRICE_REMISE, 0)) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${vente}'`));
    const mvt = q(`SELECT CONCAT_WS('|', montant, montantNet, montantRemise, montantPaye, typeTransaction, lg_USER_ID, mvtdate = CURDATE()) FROM mvttransaction WHERE pkey = '${vente}'`).split('|');
    const recette = compter(`SELECT IFNULL(SUM(int_AMOUNT), 0) FROM t_recettes WHERE str_REF_FACTURE = '${vente}'`);
    const regle = compter(`SELECT IFNULL(SUM(montant), 0) FROM vente_reglement WHERE vente_id = '${vente}'`);
    const netTicket = Object.keys(paires).filter((k) => /net/i.test(k)).map((k) => paires[k])[0];
    ok('Total : attendu = écran = vente = mouvement de caisse', v.prix === total && rail.total === total && Number(mvt[0]) === total,
      `attendu ${total} / écran ${rail.total} / vente ${v.prix} / mouvement ${mvt[0]}`);
    /* la vente porte la remise des lignes plus l'arrondi du net a 5 F (moins de 5 F) */
    ok('Remise : vente = écran = mouvement de caisse = somme des lignes + arrondi du net à 5 F', v.remise === rail.remise && Number(mvt[2]) === v.remise
      && v.remise - remiseLignes >= 0 && v.remise - remiseLignes < 5 && (v.prix - v.remise) % 5 === 0,
      `lignes ${remiseLignes} / vente ${v.remise} / écran ${rail.remise} / mouvement ${mvt[2]}`);
    ok('Net : écran = ticket = mouvement de caisse = recette = règlement', rail.net === Number(mvt[1]) && netTicket === rail.net && recette === rail.net && regle === rail.net,
      `écran ${rail.net} / ticket ${netTicket} / mouvement ${mvt[1]} / recette ${recette} / règlement ${regle} ${JSON.stringify(paires)}`);
    ok('Mouvement de caisse : le compte de test, daté du jour', mvt[5] === A.ADMIN && mvt[6] === '1', mvt.join('|'));

    /* ---- bilan avant / apres ---- */
    const sorties = CAS.map((c) => q(`SELECT IFNULL(GROUP_CONCAT(h.qteMvt), '') FROM hmvtproduit h JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID IN (h.pkey, h.lg_PREENREGISTREMENT_DETAIL_ID)`
      + ` WHERE d.lg_PREENREGISTREMENT_ID = '${vente}' AND d.lg_FAMILLE_ID = '${c.f.id}'`));
    ok('Bilan : stock de chaque produit = avant - quantité (offertes comprises)', CAS.every((c, i) => A.stock(c.f) === stockAvant[i] - c.qte),
      CAS.map((c, i) => `${c.f.cip} ${stockAvant[i]} -> ${A.stock(c.f)} (-${c.qte})`).join(', '));
    ok('Bilan : une seule sortie de stock par ligne, de la quantité de la ligne', CAS.every((c, i) => sorties[i] === String(c.qte)), sorties.join(' ; '));
    ok('Bilan : un mouvement de caisse, une recette, un règlement pour la vente',
      compter(`SELECT COUNT(*) FROM mvttransaction WHERE pkey = '${vente}'`) === 1 && compter(`SELECT COUNT(*) FROM t_recettes WHERE str_REF_FACTURE = '${vente}'`) === 1
      && compter(`SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '${vente}'`) === 1, A.ventesDuTest().length + ' vente(s) du test');
    ok('Bilan : aucune autre vente créée', A.ventesDuTest().length === 1, A.ventesDuTest().join(','));

    /* ---- annulation par l'ecran : tout est rendu ---- */
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A'); await p.keyboard.type(q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${vente}'`), { delay: 20 }); await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const s = Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore(); return !s.isLoading() && s.findExact('lgPREENREGISTREMENTID', id) >= 0; }, vente, { timeout: 60000 });
    await p.waitForTimeout(800);
    const rang = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore();
      return g.getView().getNode(s.getAt(s.findExact('lgPREENREGISTREMENTID', id))).id; }, vente);
    await p.locator(`#${rang} img[data-qtip="Annuler.Vente"]`).filter({ visible: true }).first().click();
    await p.waitForTimeout(800);
    await vues.repondre(p, 'yes');
    for (let i = 0; i < 60 && !/impression/i.test(await vues.texteMessage(p)); i++) { await p.waitForTimeout(1000); }
    await vues.repondre(p, 'no').catch(() => {});
    await p.waitForTimeout(1000);
    const annulation = q(`SELECT IFNULL(MAX(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_PARENT_ID = '${vente}' AND int_PRICE < 0`);
    if (annulation) { A.etat.ventes.push(annulation); }
    ok('Annulation par l\'écran : vente marquée annulée, vente d\'annulation créée', A.vente(vente).annulee && !!annulation, annulation);
    for (let i = 0; i < 20 && !CAS.every((c, k) => A.stock(c.f) === stockAvant[k]); i++) { await p.waitForTimeout(500); }
    ok('Annulation : stock de chaque produit rendu à l\'identique', CAS.every((c, i) => A.stock(c.f) === stockAvant[i]),
      CAS.map((c, i) => `${c.f.cip} ${A.stock(c.f)} / ${stockAvant[i]}`).join(', '));
    const entrees = CAS.map((c) => q(`SELECT IFNULL(GROUP_CONCAT(h.qteMvt), '') FROM hmvtproduit h JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID IN (h.pkey, h.lg_PREENREGISTREMENT_DETAIL_ID)`
      + ` WHERE d.lg_PREENREGISTREMENT_ID = '${annulation}' AND d.lg_FAMILLE_ID = '${c.f.id}'`));
    ok('Annulation : une seule entrée de stock par ligne, de la quantité vendue', CAS.every((c, i) => Math.abs(Number(entrees[i])) === c.qte && !entrees[i].includes(',')),
      entrees.join(' ; '));
    const mvtA = compter(`SELECT IFNULL(SUM(montantNet), 0) FROM mvttransaction WHERE pkey = '${annulation}'`);
    const recA = compter(`SELECT IFNULL(SUM(int_AMOUNT), 0) FROM t_recettes WHERE str_REF_FACTURE = '${annulation}'`);
    ok('Annulation : un mouvement de caisse et une recette opposés au net', mvtA === -rail.net && recA === -rail.net
      && compter(`SELECT COUNT(*) FROM mvttransaction WHERE pkey = '${annulation}'`) === 1, `mouvement ${mvtA} / recette ${recA} / net ${rail.net}`);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    droitAnnuler.reprendre();
    retirer();
    A.nettoyer();
    ok('Promotions et remise d\'essai retirées', q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${promotions.join(',') || 0})`) === '0'
      && q(`SELECT COUNT(*) FROM t_remise WHERE lg_REMISE_ID = '${REMISE}'`) === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
