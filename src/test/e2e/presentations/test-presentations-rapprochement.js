/* PRESENTATIONS A L'ESSAI DES SAISIES : TEST DE RAPPROCHEMENT (regle du 05/11, docs/notices/STRATEGIE_TESTS.md).
 *
 * Une meme donnee doit etre identique partout. Pour chaque ecran et chaque variante (A, B, C), on compare :
 *   - suggestion : quantite de chaque ligne (variante, page de la grille d'origine, base) sur deux pages ; lignes,
 *     boites et montant de toute la suggestion (variante, agregat de la base) ; montant d'achat du haut (en-tete
 *     d'origine) ; apres une quantite changee par la variante, tout est compare de nouveau ;
 *   - commande : quantite de chaque ligne (variante, grille d'origine, base) ; lignes, boites, montant (variante, grille
 *     d'origine, base, montant d'achat du haut), avant et apres une quantite changee ;
 *   - entrees : quantite recue et statut de chaque ligne (variante, grille d'origine, base : commandee - reliquat) ;
 *     quantite recue totale et montant recu (variante, grille d'origine, base).
 *
 * Jeux d'essai varies : quantites 1 a 13, prix differents d'une ligne a l'autre, douze lignes de suggestion (deux
 * pages), reception complete, partielle et nulle (zero recu), surplus impossible ici (reliquat >= 0).
 * Documents E2E-PS-R*, retires a la fin avec les fiches produits remises, meme en cas d'echec.
 *
 * Lancement (un test d'ecran a la fois) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node src/test/e2e/presentations/test-presentations-rapprochement.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const { q, exec, ok } = C;

const SUF = String(Date.now()).slice(-6);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${C.ENV_E2E.LOGIN}'`);
const P = C.produits(12);
const G = P.length ? P[0].g : null;

const SID = 'E2E-PS-RSG' + SUF, SREF = 'E2EPSRS' + SUF;
const QS = [1, 2, 3, 5, 7, 1, 13, 2, 9, 1, 4, 6];
const DS = P.map((x, i) => SID + '-L' + String(i).padStart(2, '0'));

const OID = 'E2E-PS-RCM' + SUF, OREF = 'E2EPSRC' + SUF;
const QC = [1, 3, 7, 12];
const DC = QC.map((x, i) => OID + '-L' + i);

const EOID = 'E2E-PS-REO' + SUF, BID = 'E2E-PS-REB' + SUF, BREF = 'E2EPSRE' + SUF;
/* [commandee, recue] : complete, partielle, nulle, complete */
const QE = [[5, 5], [4, 2], [3, 0], [6, 6]];
const DE = QE.map((x, i) => BID + '-L' + i);

function retirer() {
  const refs = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(\"'\", str_REF_LIVRAISON, \"'\")), \"''\") FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-REB%'");
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-RSG%'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-RSG%';"
    + " DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE 'E2E-PS-RCM%'; DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-RCM%';"
    + ` DELETE FROM t_lot WHERE str_REF_LIVRAISON IN (${refs}); DELETE FROM t_warehouse WHERE str_REF_LIVRAISON IN (${refs});`
    + " DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-REB%'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-REB%';"
    + " DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-REO%';");
  C.remettre('rap');
}

function creer() {
  exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, int_NUMBER, dt_CREATED, dt_UPDATED, str_STATUT)`
    + ` VALUES ('${SID}', '${SREF}', '${G}', ${P.length}, NOW(), NOW(), 'is_Process');`
    + P.map((x, i) => `INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER,`
      + ` int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('${DS[i]}', '${SID}', '${G}', '${x.id}', ${QS[i]}, ${QS[i] * x.paf},`
      + ` ${x.prix}, ${x.paf}, NOW(), NOW(), 'is_Process');`).join(''));
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${OID}', '${OREF}', ${QC.length}, '${G}', '${ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0);`);
  /* une instruction par ligne : le declencheur de t_order_detail modifie t_famille */
  QC.forEach((n, i) => { const x = P[i]; exec(`INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE,`
    + ` int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${DC[i]}', '${OID}', '${x.id}', '${G}', ${n}, ${n * x.paf},`
    + ` ${x.paf}, ${x.prix}, ${x.paf}, ${x.prix}, 'is_Process', NOW(), NOW())`); });
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${EOID}', '${EOID}', ${QE.length}, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` VALUES ('${BID}', '${BREF}', NOW(), 0, 0, 0, '${EOID}', 'enable', NOW(), NOW(), '${ADMIN}');`
    + QE.map(([cde, recu], i) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG,`
      + ` int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
      + ` SELECT '${DE[i]}', '${G}', f.lg_FAMILLE_ID, '${BID}', ${cde}, 0, ${recu}, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable',`
      + ` NOW(), NOW(), ${cde - recu}, 0, ${P[i].stock} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P[i].id}';`).join(''));
}

/* ------------------------------------------------------------------ lectures */

const nombre = (s) => Number(String(s || '').replace(/[^\d-]/g, '')) || 0;
/* montant d'achat du haut (champ d'origine int_ACHAT, mis a jour par l'ecran d'origine) */
const achatHaut = (p) => p.evaluate(() => { const c = Ext.getCmp('int_ACHAT'); return c ? String(c.getValue()) : null; }).then(nombre);
const totaux = async (p) => ({ lignes: await C.total(p, 'lignes'), boites: await C.total(p, 'boites'), montant: await C.total(p, 'montant') });
const qtesVariante = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pp-vue input[data-pp-qte]')]
  .map((i) => [i.getAttribute('data-pp-qte'), Number(i.value)])));
const qtesGrille = (p, grille, champId) => p.evaluate(([g, c]) => Object.fromEntries(Ext.getCmp(g).getStore().getRange()
  .map((r) => [r.get(c), Number(r.get('int_NUMBER'))])), [grille, champId]);
const egaux = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/* attend que la variante, l'en-tete et la base disent la meme chose (ou rend la main au bout du delai) */
async function attendre(p, cond, ms) {
  const fin = Date.now() + (ms || 15000);
  while (Date.now() < fin) {
    if (await cond()) { return true; }
    await p.waitForTimeout(400);
  }
  return false;
}

/* ------------------------------------------------------------------ 1. suggestion */

const baseSugg = () => { const [l, b, m] = q(`SELECT CONCAT_WS('|', COUNT(*), SUM(int_NUMBER), SUM(int_PRICE)) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SID}'`).split('|').map(Number);
  return { lignes: l, boites: b, montant: m }; };
const qtesBaseSugg = () => Object.fromEntries(q(`SELECT CONCAT(lg_SUGGESTION_ORDER_DETAILS_ID, '|', int_NUMBER) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SID}'`)
  .split(/\r?\n/).filter(Boolean).map((l) => { const [id, n] = l.split('|'); return [id, Number(n)]; }));

async function comparerPageSuggestion(p, v, etape) {
  /* B range les lignes par urgence et replie « Confort » : on deplie chaque groupe replie, comme l'utilisateur */
  for (let i = 0; i < 3; i++) {
    const replie = await p.$('.pp-vue .pp-groupe[aria-expanded="false"]');
    if (!replie) { break; }
    await replie.click();
    await p.waitForTimeout(300);
  }
  const vue = await qtesVariante(p), grille = await qtesGrille(p, 'gridpanelSuggestionID', 'lg_SUGGESTION_ORDER_DETAILS_ID'), base = qtesBaseSugg();
  const memesLignes = egaux(Object.fromEntries(Object.keys(vue).map((k) => [k, 1])), Object.fromEntries(Object.keys(grille).map((k) => [k, 1])));
  const enBase = Object.keys(vue).every((k) => vue[k] === base[k]);
  ok(`Suggestion ${v} (${etape}) : mêmes lignes que la page de la grille d'origine (${Object.keys(vue).length})`, memesLignes && Object.keys(vue).length > 0,
    JSON.stringify({ vue: Object.keys(vue).length, grille: Object.keys(grille).length }));
  ok(`Suggestion ${v} (${etape}) : quantité de chaque ligne = grille d'origine = base`, enBase && egaux(vue, grille), JSON.stringify({ vue, grille }));
}
async function comparerTotauxSuggestion(p, v, etape) {
  const b = baseSugg();
  await attendre(p, async () => { const t = await totaux(p); return t.boites === b.boites && t.montant === b.montant && (await achatHaut(p)) === b.montant; });
  const t = await totaux(p), haut = await achatHaut(p);
  ok(`Suggestion ${v} (${etape}) : lignes, boîtes, montant de toute la suggestion = base`, t.lignes === b.lignes && t.boites === b.boites && t.montant === b.montant,
    JSON.stringify({ variante: t, base: b }));
  ok(`Suggestion ${v} (${etape}) : montant d'achat du haut = montant de la variante = base`, haut === t.montant && haut === b.montant, JSON.stringify({ haut, variante: t.montant, base: b.montant }));
}

async function suggestion(p) {
  await C.ouvrirDocument(p, 'Suggestion de reappro.', 'i_sugg_manager', 'str_REF', SREF, 'Modifier');
  await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
  await p.waitForTimeout(800);
  for (const v of ['A', 'B', 'C']) {
    await C.choisirPresentation(p, v);
    await comparerPageSuggestion(p, v, 'page 1');
    await comparerTotauxSuggestion(p, v, 'ouverture');
    /* page suivante par la variante : la grille d'origine suit, les quantites concordent toujours */
    const suiv = await p.$('.pp-vue button[data-pp-page="1"]:not([disabled])');
    ok(`Suggestion ${v} : page suivante proposée (12 lignes, pages de 10)`, !!suiv);
    if (suiv) {
      await suiv.click();
      await p.waitForFunction(() => Ext.getCmp('gridpanelSuggestionID').getStore().currentPage === 2, null, { timeout: 30000 }).catch(() => {});
      await C.attendreCalme(p);
      await comparerPageSuggestion(p, v, 'page 2');
      /* une ligne de la page 2 changee par la variante : partout la meme nouvelle quantite et les memes totaux */
      const id = Object.keys(await qtesVariante(p))[0];
      const avant = qtesBaseSugg()[id], nouv = avant + 10;
      await C.saisirQuantite(p, id, nouv);
      await attendre(p, async () => qtesBaseSugg()[id] === nouv);
      await comparerPageSuggestion(p, v, 'après saisie');
      await comparerTotauxSuggestion(p, v, 'après saisie');
      await C.saisirQuantite(p, id, avant);
      await attendre(p, async () => qtesBaseSugg()[id] === avant);
      await comparerTotauxSuggestion(p, v, 'quantité remise');
      await p.click('.pp-vue button[data-pp-page="-1"]');
      await p.waitForFunction(() => Ext.getCmp('gridpanelSuggestionID').getStore().currentPage === 1, null, { timeout: 30000 }).catch(() => {});
      await C.attendreCalme(p);
    }
  }
  await C.choisirPresentation(p, 'actuel');
}

/* ------------------------------------------------------------------ 2. commande */

const baseCmd = () => { const [l, b, m] = q(`SELECT CONCAT_WS('|', COUNT(*), SUM(int_NUMBER), SUM(int_PRICE)) FROM t_order_detail WHERE lg_ORDER_ID = '${OID}'`).split('|').map(Number);
  return { lignes: l, boites: b, montant: m }; };
const qtesBaseCmd = () => Object.fromEntries(q(`SELECT CONCAT(lg_ORDERDETAIL_ID, '|', int_NUMBER) FROM t_order_detail WHERE lg_ORDER_ID = '${OID}'`)
  .split(/\r?\n/).filter(Boolean).map((l) => { const [id, n] = l.split('|'); return [id, Number(n)]; }));
const grilleCmd = (p) => p.evaluate(() => { const st = Ext.getCmp('gridpanelID').getStore(); let b = 0, m = 0;
  st.each((r) => { b += Number(r.get('int_NUMBER')); m += Number(r.get('int_PRICE')); }); return { lignes: st.getCount(), boites: b, montant: m }; });

async function comparerCommande(p, v, etape) {
  const b = baseCmd();
  await attendre(p, async () => { const t = await totaux(p); return t.boites === b.boites && t.montant === b.montant && (await achatHaut(p)) === b.montant
    && (await grilleCmd(p)).montant === b.montant; });
  const t = await totaux(p), g = await grilleCmd(p), haut = await achatHaut(p);
  const vue = await qtesVariante(p), grille = await qtesGrille(p, 'gridpanelID', 'lg_ORDERDETAIL_ID'), base = qtesBaseCmd();
  ok(`Commande ${v} (${etape}) : quantité de chaque ligne = grille d'origine = base`, egaux(vue, base) && egaux(grille, base), JSON.stringify({ vue, grille, base }));
  ok(`Commande ${v} (${etape}) : boîtes et montant = grille d'origine = base`, t.boites === b.boites && t.montant === b.montant && g.boites === b.boites
    && g.montant === b.montant && g.lignes === b.lignes, JSON.stringify({ variante: t, grille: g, base: b }));
  ok(`Commande ${v} (${etape}) : montant d'achat du haut = variante = base`, haut === b.montant && haut === t.montant, JSON.stringify({ haut, variante: t.montant, base: b.montant }));
}

async function commande(p) {
  await C.ouvrirDocument(p, 'Commande en cours', 'i_order_manager', 'str_REF_ORDER', OREF, 'Modifier');
  await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === n; }, QC.length, { timeout: 60000 });
  await p.waitForTimeout(800);
  for (const v of ['A', 'B', 'C']) {
    await C.choisirPresentation(p, v);
    await comparerCommande(p, v, 'ouverture');
    /* la ligne de 7 boites passe a 1, puis revient a 7 */
    await C.saisirQuantite(p, DC[2], 1);
    await attendre(p, async () => qtesBaseCmd()[DC[2]] === 1);
    await comparerCommande(p, v, '7 → 1');
    await C.saisirQuantite(p, DC[2], 7);
    await attendre(p, async () => qtesBaseCmd()[DC[2]] === 7);
    await comparerCommande(p, v, '1 → 7');
  }
  await C.choisirPresentation(p, 'actuel');
}

/* ------------------------------------------------------------------ 3. entrees */

const baseEnt = () => q(`SELECT CONCAT(d.lg_BON_LIVRAISON_DETAIL, '|', d.int_QTE_CMDE, '|', d.int_QTE_MANQUANT, '|', d.int_PAF) FROM t_bon_livraison_detail d`
  + ` WHERE d.lg_BON_LIVRAISON_ID = '${BID}'`).split(/\r?\n/).filter(Boolean)
  .map((l) => { const [id, cde, manq, paf] = l.split('|'); return { id, cde: Number(cde), recue: Math.max(0, Number(cde) - Number(manq)), paf: Number(paf) }; });

/* quantite recue de chaque ligne affichee par la variante (colonne « Reçu » de son tableau), par ligne du bon : le CIP
   affiche est le code du grossiste, parfois vide, il ne sert pas a reconnaitre la ligne */
const recuesVariante = (p) => p.evaluate(() => {
  const o = {};
  document.querySelectorAll('.pp-vue table.pp-g').forEach((t) => {
    const th = [...t.querySelectorAll('thead th')].map((e) => e.textContent.trim());
    const iR = th.indexOf('Reçu');
    if (iR < 0) { return; }
    t.querySelectorAll('tbody tr').forEach((tr) => { const id = tr.querySelector('[data-pp-ligne]'), td = tr.children;
      if (id && td.length > iR) { o[id.getAttribute('data-pp-ligne')] = Number(td[iR].textContent.replace(/[^\d-]/g, '')); } });
  });
  return o;
});
const grilleEnt = (p) => p.evaluate(() => Object.fromEntries(Ext.getCmp('gridpanelID').getStore().getRange()
  .map((r) => [String(r.get('lg_BON_LIVRAISON_DETAIL')), Math.max(0, Number(r.get('int_QTE_CMDE')) - Number(r.get('int_QTE_MANQUANT')))])));

async function entrees(p) {
  await C.ouvrirDocument(p, 'Gestion des entrées', 'bonlivraisonmanager', 'str_REF_LIVRAISON', BREF, 'Detail livraison');
  await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === n; }, QE.length, { timeout: 60000 });
  await p.waitForTimeout(1200);
  const base = baseEnt();
  const parLigne = Object.fromEntries(base.map((l) => [l.id, l.recue]));
  const recuBase = base.reduce((s, l) => s + l.recue, 0), montantBase = base.reduce((s, l) => s + l.recue * l.paf, 0);
  for (const v of ['A', 'B', 'C']) {
    await C.choisirPresentation(p, v);
    const tout = await p.$$('.pp-vue .pp-onglets button');
    for (const o of tout) { if (/^Tout/.test((await o.textContent()).trim())) { await o.click(); await p.waitForTimeout(400); } }
    const vue = await recuesVariante(p), grille = await grilleEnt(p);
    ok(`Entrées ${v} : quantité reçue de chaque ligne = grille d'origine (commandée − reliquat) = base`, egaux(vue, parLigne) && egaux(grille, parLigne),
      JSON.stringify({ variante: vue, grille, base: parLigne }));
    const recu = await C.total(p, 'recu'), montant = await C.total(p, 'montant');
    if (recu !== null) {
      ok(`Entrées ${v} : quantité reçue totale = base (${recuBase})`, recu === recuBase, JSON.stringify({ variante: recu, base: recuBase }));
    }
    if (montant !== null) {
      ok(`Entrées ${v} : montant reçu = base (Σ reçue × PA)`, montant === montantBase, JSON.stringify({ variante: montant, base: montantBase }));
    }
  }
  await C.choisirPresentation(p, 'actuel');
}

/* ------------------------------------------------------------------ lancement */

(async () => {
  retirer();
  ok('Précondition : douze produits ordinaires avec un grossiste', P.length === 12 && !!G && !!ADMIN, P.length);
  if (P.length !== 12) { process.exit(C.bilan()); }
  C.sauver('rap', P.map((x) => x.id));
  let b = null, p = null, erreurs = [];
  try {
    creer();
    ({ b, p, erreurs } = await C.demarrer(chromium));
    await suggestion(p);
    await commande(p);
    await entrees(p);
    ok('Aucune erreur JavaScript ni fenêtre du navigateur', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e);
    if (p) { await C.ENV_E2E.capture(p, 'rapprochement-exception').catch(() => {}); }
  } finally {
    if (b) { await b.close().catch(() => {}); }
    retirer();
    const reste = q("SELECT (SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-PS-R%') + (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PS-R%')"
      + " + (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PS-R%')");
    ok('Données d\'essai retirées', reste === '0', reste);
    process.exit(C.bilan());
  }
})();
