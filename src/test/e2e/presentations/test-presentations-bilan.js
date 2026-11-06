/* PRESENTATIONS A L'ESSAI DES SAISIES : TEST DE BILAN AVANT / APRES (regle du 05/11, docs/notices/STRATEGIE_TESTS.md).
 *
 * Chaque operation faite par une variante laisse exactement les traces attendues, ni plus ni moins. Avant et apres
 * chaque operation, le test photographie toutes les tables que les trois ecrans peuvent toucher (documents, fiches
 * et stock des produits, lots, entrepot, mouvements, historiques, caisse) ; l'ecart entre les deux photos doit etre
 * exactement la liste attendue (les dates de mise a jour sont ignorees).
 *
 *   - suggestion (A) : quantite 3 -> 8 : la ligne seule (quantite, montant) ; remise a 3 : aucune trace ;
 *   - commande (B) : « + » 3 -> 4 : la ligne seule (quantite, montant) ; « − » : aucune trace ;
 *   - entrees, gestion des lots a 0 :
 *       A « Pointer » : pointage de la ligne seul ; aucun stock, aucun mouvement ;
 *       C lectures non enregistrees (annulation) : aucune trace ; puis enregistrees : pointage seul ;
 *       A « Saisir » (UG = 1, fenetre d'origine) : UG de la ligne, un lot, une entree d'entrepot ;
 *         « Retirer » confirme : retour exact a l'etat d'avant la saisie ;
 *       C « Entrée en stock » refusee au premier rappel (annulation) : aucune trace, stock inchange ;
 *   - entrees, gestion des lots a 1 : C etiquette GS1 lue puis enregistree : pointage et un lot (numero et quantite lus).
 *
 * Documents E2E-PS-B*, retires a la fin ; fiches produits, lots, mouvements et parametre remis, meme en cas d'echec.
 * Lancement (un test d'ecran a la fois) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node src/test/e2e/presentations/test-presentations-bilan.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const { attendreMessage, repondre } = require('../outils/vues');
const { q, exec, ok, liste } = C;

const SUF = String(Date.now()).slice(-6);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${C.ENV_E2E.LOGIN}'`);
/* jeu realiste : trois produits du meme grossiste, deja connus de lui au meme prix d'achat (une commande ordinaire) */
const P = (() => {
  const parG = {};
  for (const x of C.produits(80)) {
    if (q(`SELECT COUNT(*) FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '${x.id}' AND lg_GROSSISTE_ID = '${x.g}' AND int_PAF = ${x.paf}`) === '1') {
      (parG[x.g] = parG[x.g] || []).push(x);
      if (parG[x.g].length === 3) { return parG[x.g]; }
    }
  }
  return [];
})();
const G = P.length ? P[0].g : null;
const IDS = P.map((x) => x.id);
const PARAM = 'KEY_ACTIVATE_PEREMPTION_DATE';
const PARAM_AVANT = q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${PARAM}'`);

const SID = 'E2E-PS-BSG' + SUF, SREF = 'E2EPSBS' + SUF, QS = [3, 5];
const DS = QS.map((x, i) => SID + '-L' + i);
const OID = 'E2E-PS-BCM' + SUF, OREF = 'E2EPSBC' + SUF, QC = [2, 3];
const DC = QC.map((x, i) => OID + '-L' + i);
const EOID = 'E2E-PS-BEO' + SUF, BID = 'E2E-PS-BEB' + SUF, BREF = 'E2EPSBE' + SUF;
const QE = [[5, 5], [4, 2], [3, 0]];
const DE = QE.map((x, i) => BID + '-L' + i);

/* tables des produits : sauvees ligne a ligne et remises a l'identique a la fin */
const TABLES_PRODUIT = ['hmvtproduit', 't_famille_history', 't_mouvement', 't_mouvementprice', 't_mouvement_reserve', 't_mouvement_snapshot',
  't_rupture_history', 't_lot', 't_warehouse', 't_famille_grossiste'];
function sauverTraces() {
  TABLES_PRODUIT.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_psb_${t}; CREATE TABLE e2e_psb_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${liste(IDS)});`));
}
function remettreTraces() {
  TABLES_PRODUIT.forEach((t) => {
    if (q(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'e2e_psb_${t}'`) === '1') {
      exec(`DELETE FROM ${t} WHERE lg_FAMILLE_ID IN (${liste(IDS)}); INSERT INTO ${t} SELECT * FROM e2e_psb_${t}; DROP TABLE e2e_psb_${t};`);
    }
  });
}

function retirer() {
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-BSG%'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-BSG%';"
    + " DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE 'E2E-PS-BCM%'; DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-BCM%';"
    + " DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-BEB%'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-BEB%';"
    + " DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-BEO%';");
  remettreTraces();
  C.remettre('bil');
  if (PARAM_AVANT !== '') {
    exec(`UPDATE t_parameters SET str_VALUE = '${PARAM_AVANT}' WHERE str_KEY = '${PARAM}';`);
  }
}

function creer() {
  exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, int_NUMBER, dt_CREATED, dt_UPDATED, str_STATUT)`
    + ` VALUES ('${SID}', '${SREF}', '${G}', ${QS.length}, NOW(), NOW(), 'is_Process');`
    + QS.map((n, i) => `INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER,`
      + ` int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('${DS[i]}', '${SID}', '${G}', '${P[i].id}', ${n}, ${n * P[i].paf},`
      + ` ${P[i].prix}, ${P[i].paf}, NOW(), NOW(), 'is_Process');`).join(''));
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${OID}', '${OREF}', ${QC.length}, '${G}', '${ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0);`);
  QC.forEach((n, i) => exec(`INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE,`
    + ` int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_REP_GROSSISTE) VALUES ('${DC[i]}', '${OID}',`
    + ` '${P[i].id}', '${G}', ${n}, ${n * P[i].paf}, ${P[i].paf}, ${P[i].prix}, ${P[i].paf}, ${P[i].prix}, 'is_Process', NOW(), NOW(), ${n}, ${n})`));
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${EOID}', '${EOID}', ${QE.length}, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` VALUES ('${BID}', '${BREF}', NOW(), 0, 0, 0, '${EOID}', 'enable', NOW(), NOW(), '${ADMIN}');`
    + QE.map(([cde, recu], i) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG,`
      + ` int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
      + ` SELECT '${DE[i]}', '${G}', f.lg_FAMILLE_ID, '${BID}', ${cde}, 0, ${recu}, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable',`
      + ` NOW(), NOW(), ${cde - recu}, 0, ${P[i].stock} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P[i].id}';`).join(''));
}

/* ------------------------------------------------------------------ photos et ecarts */

const DATE = /^dt_|date|At$|_AT$|updated|created|heure|time/i;
const SOURCES = () => [
  ['t_suggestion_order', `lg_SUGGESTION_ORDER_ID = '${SID}'`],
  ['t_suggestion_order_details', `lg_SUGGESTION_ORDER_ID = '${SID}'`],
  ['t_order', `lg_ORDER_ID IN ('${OID}', '${EOID}')`],
  ['t_order_detail', `lg_ORDER_ID = '${OID}'`],
  ['t_bon_livraison', `lg_BON_LIVRAISON_ID = '${BID}'`],
  ['t_bon_livraison_detail', `lg_BON_LIVRAISON_ID = '${BID}'`],
  ['t_famille', `lg_FAMILLE_ID IN (${liste(IDS)})`],
  ['t_famille_stock', `lg_FAMILLE_ID IN (${liste(IDS)})`],
  ['t_famille_grossiste', `lg_FAMILLE_ID IN (${liste(IDS)})`],
  ...TABLES_PRODUIT.map((t) => [t, `lg_FAMILLE_ID IN (${liste(IDS)})`])
];
let DEBUT = null;
function photo() {
  const o = {};
  SOURCES().forEach(([t, w]) => {
    const lignes = exec(`SELECT * FROM ${t} WHERE ${w}`).split(/\r?\n/).filter((l) => l !== '');
    if (!lignes.length) { return; }
    const tete = lignes[0].split('\t');
    lignes.slice(1).forEach((l) => {
      const v = l.split('\t'), r = {};
      tete.forEach((c, i) => { if (!DATE.test(c)) { r[c] = v[i]; } });
      /* ligne nommee par sa table et son produit (P0, P1, P2) : « + t_lot (P0) » */
      const i = IDS.indexOf(r.lg_FAMILLE_ID);
      o[t + '|' + v[0]] = Object.assign(r, { _: t + (i >= 0 ? ' (P' + i + ')' : '') });
    });
  });
  /* caisse : aucune operation de ces ecrans ne doit creer de mouvement de caisse */
  o['mvttransaction|depuis le debut'] = { n: q(`SELECT COUNT(*) FROM mvttransaction WHERE createdAt >= '${DEBUT}'`) };
  return o;
}
/* ecart lisible : « table|cle colonne a → b », « + table » (ligne creee), « − table » (ligne retiree) */
function ecart(a, b) {
  const d = [];
  Object.keys(b).forEach((k) => {
    const t = k.split('|')[0];
    if (!a[k]) { d.push('+ ' + (b[k]._ || t)); return; }
    Object.keys(b[k]).forEach((c) => { if (a[k][c] !== b[k][c]) { d.push(`${k} ${c} ${a[k][c]} → ${b[k][c]}`); } });
  });
  Object.keys(a).forEach((k) => { if (!b[k]) { d.push('− ' + (a[k]._ || k.split('|')[0])); } });
  return d.sort();
}
/* l'ecart doit etre exactement la liste attendue */
function verifier(nom, avant, attendu) {
  const d = ecart(avant, photo());
  const att = [...attendu].sort();
  ok(nom, JSON.stringify(d) === JSON.stringify(att), 'obtenu ' + JSON.stringify(d) + ' ; attendu ' + JSON.stringify(att));
  return d;
}
const champ = (k, c, a, b) => `${k} ${c} ${a} → ${b}`;
/* valeur d'une colonne dans la photo (NULL ecrit par le client mariadb) */
const val = (ph, k, c) => (ph[k] ? ph[k][c] : undefined);

async function attendreBase(p, cond, ms) {
  const fin = Date.now() + (ms || 15000);
  while (Date.now() < fin) { if (cond()) { return true; } await p.waitForTimeout(400); }
  return false;
}

/* ------------------------------------------------------------------ parcours */

async function suggestion(p) {
  await C.ouvrirDocument(p, 'Suggestion de reappro.', 'i_sugg_manager', 'str_REF', SREF, 'Modifier');
  await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === n; }, QS.length, { timeout: 60000 });
  await C.choisirPresentation(p, 'A');
  const avant = photo(), k = 't_suggestion_order_details|' + DS[0];
  await C.saisirQuantite(p, DS[0], 8);
  await attendreBase(p, () => q(`SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID = '${DS[0]}'`) === '8');
  verifier('Suggestion A : quantité 3 → 8 : la ligne seule change (quantité, montant), aucun stock ni mouvement', avant,
    [champ(k, 'int_NUMBER', 3, 8), champ(k, 'int_PRICE', val(avant, k, 'int_PRICE'), 8 * P[0].paf)]);
  await C.saisirQuantite(p, DS[0], 3);
  await attendreBase(p, () => q(`SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID = '${DS[0]}'`) === '3');
  verifier('Suggestion A : quantité remise à 3 : aucune trace', avant, []);
  await C.choisirPresentation(p, 'actuel');
}

/* quantite changee dans l'ecran actuel : clic sur la cellule « Qté » de la grille d'origine, frappe, Entree */
async function quantiteOrigine(p, id, n) {
  await p.evaluate((x) => { const g = Ext.getCmp('gridpanelID'), st = g.getStore(), r = st.getAt(st.findExact('lg_ORDERDETAIL_ID', x));
    const col = g.columns.filter((c) => c.dataIndex === 'int_NUMBER')[0];
    g.getView().getCell(r, col).dom.setAttribute('data-e2e', 'qte'); }, id);
  await p.click('[data-e2e=qte]');
  await p.waitForTimeout(400);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(n), { delay: 30 });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return !g.getStore().isLoading(); }, null, { timeout: 30000 });
  await p.waitForTimeout(1200);
}

async function commande(p) {
  await C.ouvrirDocument(p, 'Commande en cours', 'i_order_manager', 'str_REF_ORDER', OREF, 'Modifier');
  await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === n; }, QC.length, { timeout: 60000 });
  const k = 't_order_detail|' + DC[1], qte = () => q(`SELECT int_NUMBER FROM t_order_detail WHERE lg_ORDERDETAIL_ID = '${DC[1]}'`);
  /* traces de l'action d'origine (OrderServiceImpl.modificationProduitCommandeEncours) : quantite, montant, quantites
     grossiste et manquante de la ligne ; le declencheur de t_order_detail met a jour la fiche produit, dont le
     declencheur ecrit une ligne d'historique */
  const traces = (a, b, avant) => [champ(k, 'int_NUMBER', a, b), champ(k, 'int_PRICE', val(avant, k, 'int_PRICE'), b * P[1].paf),
    champ(k, 'int_QTE_MANQUANT', a, b), champ(k, 'int_QTE_REP_GROSSISTE', a, b), '+ t_famille_history (P1)'];

  /* ecran actuel d'abord : la reference des traces */
  let avant = photo();
  await quantiteOrigine(p, DC[1], 4);
  await attendreBase(p, () => qte() === '4');
  const origine = verifier('Commande, écran actuel : quantité 3 → 4 par la grille d\'origine : la ligne et l\'historique de la fiche, aucun stock ni mouvement', avant, traces(3, 4, avant));
  await quantiteOrigine(p, DC[1], 3);
  await attendreBase(p, () => qte() === '3');

  await C.choisirPresentation(p, 'B');
  avant = photo();
  await p.click(`.pp-vue button[data-pp-pas="1"][data-pp-ligne="${DC[1]}"]`);
  await C.attendreCalme(p);
  await attendreBase(p, () => qte() === '4');
  const variante = verifier('Commande B : « + » 3 → 4 : la ligne et l\'historique de la fiche, aucun stock ni mouvement', avant, traces(3, 4, avant));
  ok('Commande B : « + » laisse exactement les traces de la grille d\'origine', JSON.stringify(variante) === JSON.stringify(origine),
    JSON.stringify({ variante, origine }));
  await p.click(`.pp-vue button[data-pp-pas="-1"][data-pp-ligne="${DC[1]}"]`);
  await C.attendreCalme(p);
  await attendreBase(p, () => qte() === '3');
  verifier('Commande B : « − » 4 → 3 : ligne revenue à l\'identique (seul l\'historique de la fiche s\'allonge)', avant,
    ['+ t_famille_history (P1)', '+ t_famille_history (P1)']);
  await C.choisirPresentation(p, 'actuel');
}

const pointage = (i) => q(`SELECT CONCAT_WS('|', IFNULL(checked, 0), IFNULL(quantite_controle, '-'), int_QTE_UG) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${DE[i]}'`);
async function ouvrirBon(p) {
  await C.ouvrirDocument(p, 'Gestion des entrées', 'bonlivraisonmanager', 'str_REF_LIVRAISON', BREF, 'Detail livraison');
  await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === n; }, QE.length, { timeout: 60000 });
  await p.waitForTimeout(1200);
}
async function fermerBon(p) {
  await C.choisirPresentation(p, 'actuel');
  await p.click('#btn_cancel');
  await p.waitForFunction(() => !(Ext.getCmp('btn_cancel') && Ext.getCmp('btn_cancel').isVisible(true)), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
}
const scan = async (p, code) => { await p.click('.pp-vue input[data-pp-scan]'); await p.keyboard.type(code, { delay: 10 }); await p.keyboard.press('Enter'); await p.waitForTimeout(900); };
async function enregistrerLectures(p) {
  const bouton = '.pp-vue button[data-pp-methode="enregistrer-lectures"]';
  await p.click(bouton);
  await p.waitForTimeout(600);
  await p.click(bouton);
  await p.waitForFunction(() => /Lectures enregistrées|refusé/.test((document.querySelector('.pp-vue .pp-message') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  await C.attendreCalme(p);
}

async function entreesSansLots(p) {
  exec(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${PARAM}';`);
  await ouvrirBon(p);
  const k0 = 't_bon_livraison_detail|' + DE[0], k1 = 't_bon_livraison_detail|' + DE[1];

  /* A : pointer */
  await C.choisirPresentation(p, 'A');
  let avant = photo();
  await p.click(`.pp-vue button[data-pp-ligne-action="pointer"][data-pp-ligne="${DE[0]}"]`);
  await attendreBase(p, () => pointage(0).startsWith('1|5'));
  await C.attendreCalme(p);
  verifier('Entrées A (lots à 0) : « Pointer » : le pointage de la ligne seul (5 boîtes), aucun stock ni mouvement', avant,
    [champ(k0, 'checked', val(avant, k0, 'checked'), 1), champ(k0, 'quantite_controle', val(avant, k0, 'quantite_controle'), 5),
      champ(k0, 'lg_CONTROLE_USER', val(avant, k0, 'lg_CONTROLE_USER'), ADMIN)]);

  /* C : lectures abandonnees, puis enregistrees */
  await C.choisirPresentation(p, 'C');
  avant = photo();
  await scan(p, P[1].cip);
  await scan(p, P[1].cip);
  await C.choisirPresentation(p, 'B');
  verifier('Entrées C (lots à 0) : lectures abandonnées (autre présentation) : aucune trace', avant, []);
  await C.choisirPresentation(p, 'C');
  await scan(p, P[1].cip);
  await scan(p, P[1].cip);
  await enregistrerLectures(p);
  await attendreBase(p, () => pointage(1).startsWith('1|2'));
  verifier('Entrées C (lots à 0) : 2 lectures enregistrées : le pointage de la ligne seul (2), aucun lot, aucun stock', avant,
    [champ(k1, 'checked', val(avant, k1, 'checked'), 1), champ(k1, 'quantite_controle', val(avant, k1, 'quantite_controle'), 2),
      champ(k1, 'lg_CONTROLE_USER', val(avant, k1, 'lg_CONTROLE_USER'), ADMIN)]);

  /* A : UG saisies par la fenetre d'origine, puis retirees */
  await C.choisirPresentation(p, 'A');
  avant = photo();
  await p.click(`.pp-vue button[data-pp-ligne-action="saisir"][data-pp-ligne="${DE[0]}"]`);
  await p.waitForFunction(() => Ext.getCmp('int_QUANTITE_FREE') && Ext.getCmp('int_QUANTITE_FREE').isVisible(true), null, { timeout: 20000 });
  await p.click('#int_QUANTITE_FREE-inputEl');
  await p.keyboard.press('Control+A');
  await p.keyboard.type('1');
  const enr = await p.evaluate(() => Ext.getCmp('int_QUANTITE_FREE').up('window').query('button').filter((b) => b.text === 'Enregistrer' && b.isVisible(true))[0].getId());
  await p.click('#' + enr);
  for (let i = 0; i < 2; i++) {
    if (await attendreMessage(p, 'Confirm', 4000) || await attendreMessage(p, 'quantite', 1000)) { await repondre(p, 'yes'); await p.waitForTimeout(500); }
  }
  await p.waitForFunction(() => !(Ext.getCmp('int_QUANTITE_FREE') && Ext.getCmp('int_QUANTITE_FREE').isVisible(true)), null, { timeout: 20000 });
  await C.attendreCalme(p);
  await attendreBase(p, () => pointage(0).endsWith('|1'));
  const ug = verifier('Entrées A (lots à 0) : UG = 1 par « Saisir » : UG et reçue de la ligne, un lot, une entrée d\'entrepôt ; aucun stock ni mouvement', avant,
    [champ(k0, 'int_QTE_UG', 0, 1), champ(k0, 'int_QTE_RECUE', 5, 6), '+ t_lot (P0)', '+ t_warehouse (P0)', '+ t_famille_history (P0)']);
  const apresUg = photo();
  await p.click(`.pp-vue button[data-pp-ligne-action="retirer"][data-pp-ligne="${DE[0]}"] .x-action-col-icon`);
  const conf = await p.waitForSelector('.prestige-confirmer-icone', { timeout: 5000 }).catch(() => null);
  if (conf) { await p.waitForTimeout(600); await conf.click(); }
  await p.waitForTimeout(1500);
  const erreur = await attendreMessage(p, 'erreur interne', 3000);
  if (erreur) { await repondre(p, 'ok'); }
  await C.attendreCalme(p);
  /* l'historique de la fiche ne fait que s'allonger : tout le reste revient a l'identique */
  const d = ecart(avant, photo()).filter((x) => !/^[+] t_famille_history/.test(x));
  ok('Entrées A (lots à 0) : « Retirer » confirmé : retour exact à l\'état d\'avant la saisie des UG (hors historique de la fiche)', !d.length, JSON.stringify(d));
  if (d.length) {
    console.log('DÉFAUT ' + (erreur ? 'CONFIRMÉ (réponse « erreur interne » de remove-lots, défaut d\'origine corrigé sur integration/recette-2026-10-29, 1e7094ac)' : 'à analyser')
      + ' ; traces laissées : ' + JSON.stringify(ecart(avant, photo())));
    /* remise a l'etat d'avant la saisie pour la suite du parcours */
    exec(`UPDATE t_bon_livraison_detail SET int_QTE_UG = 0 WHERE lg_BON_LIVRAISON_DETAIL = '${DE[0]}';`
      + ` DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${BREF}' AND lg_FAMILLE_ID = '${P[0].id}'; DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${BREF}' AND lg_FAMILLE_ID = '${P[0].id}';`);
    await p.evaluate(() => { Ext.getCmp('gridpanelID').getStore().reload(); });
    await C.attendreCalme(p);
  }
  void ug; void apresUg;

  /* C : « Entrée en stock » abandonnee au rappel des UG */
  await C.choisirPresentation(p, 'C');
  avant = photo();
  const btn = await p.$('.pp-vue [data-pp-action="btn_enterstock"]:not([disabled])');
  ok('Entrées C : « Entrée en stock » de la variante disponible', !!btn);
  if (btn) {
    await btn.click();
    const rappel = await attendreMessage(p, 'UNITÉS GRATUITES', 8000);
    ok('Entrées C : « Entrée en stock » ouvre le rappel d\'origine des UG', !!rappel);
    if (rappel) { await repondre(p, 'no'); }
    await p.waitForTimeout(1500);
    verifier('Entrées C : « Entrée en stock » abandonnée : aucune trace, stock inchangé', avant, []);
  }
  await fermerBon(p);
}

async function entreesAvecLots(p) {
  exec(`UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '${PARAM}';`);
  await ouvrirBon(p);
  await C.choisirPresentation(p, 'C');
  const note = await p.evaluate(() => /Gestion des lots active/.test((document.querySelector('.pp-vue') || {}).textContent || ''));
  ok('Entrées C (lots à 1) : la variante suit le paramètre (gestion des lots active)', note);
  const avant = photo(), k1 = 't_bon_livraison_detail|' + DE[1];
  await scan(p, `(17)281231(10)LOTB2E(240)${P[1].cip}`);
  await enregistrerLectures(p);
  await attendreBase(p, () => q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${BREF}' AND lg_FAMILLE_ID = '${P[1].id}'`) !== '0');
  const d = verifier('Entrées C (lots à 1) : étiquette GS1 enregistrée : pointage de la ligne (2 → 1) et un lot ; aucun stock ni mouvement', avant,
    [champ(k1, 'quantite_controle', val(avant, k1, 'quantite_controle'), 1), '+ t_lot (P1)', '+ t_warehouse (P1)', '+ t_famille_history (P1)']);
  const lot = q(`SELECT CONCAT_WS('|', int_NUM_LOT, int_NUMBER) FROM t_lot WHERE str_REF_LIVRAISON = '${BREF}' AND lg_FAMILLE_ID = '${P[1].id}'`);
  ok('Entrées C (lots à 1) : le lot écrit est celui de l\'étiquette (LOTB2E, 1 boîte) et l\'écran le relit', /^LOTB2E\|1$/.test(lot), lot + ' ; écart ' + JSON.stringify(d));
  await fermerBon(p);
}

/* ------------------------------------------------------------------ lancement */

(async () => {
  retirer();
  ok('Précondition : trois produits ordinaires avec un grossiste, paramètre des lots lu', P.length === 3 && !!G && !!ADMIN && PARAM_AVANT !== '', JSON.stringify({ n: P.length, PARAM_AVANT }));
  if (P.length !== 3 || PARAM_AVANT === '') { process.exit(C.bilan()); }
  C.sauver('bil', IDS);
  sauverTraces();
  DEBUT = q('SELECT NOW()');
  let b = null, p = null, erreurs = [];
  try {
    creer();
    ({ b, p, erreurs } = await C.demarrer(chromium));
    await suggestion(p);
    await commande(p);
    await entreesSansLots(p);
    await entreesAvecLots(p);
    ok('Aucune erreur JavaScript ni fenêtre du navigateur', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e);
    if (p) { await C.ENV_E2E.capture(p, 'bilan-exception').catch(() => {}); }
  } finally {
    if (b) { await b.close().catch(() => {}); }
    retirer();
    const reste = q("SELECT (SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-B%') + (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-B%')"
      + ` + (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-B%') + (SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${BREF}')`);
    ok('Données d\'essai retirées, paramètre des lots remis', reste === '0' && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${PARAM}'`) === PARAM_AVANT, reste);
    process.exit(C.bilan());
  }
})();
