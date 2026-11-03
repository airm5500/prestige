/* CAS 2 DU 03/11/2026 (prix et taux de reference par tiers-payant saisis a la caisse) : aide commune aux tests d'ecran.
 *
 * Jeu d'essai (audits/commun.js) : tiers-payants d'essai ZZAUDIT, client assure, produit a stock force, caisse ouverte,
 * parametre KEY_PRIX_REF_CAISSE pose le temps du test. Parcours par le vrai chemin de l'ecran : menu Ventes, bouton
 * « Assurance », client tape puis Entree, article tape par son CIP, cellule cliquee, valeur tapee, Entree. Tout est
 * retire a la fin, y compris les prix de reference et leur journal.
 * Base : copie de travail uniquement (outils/poste.js). Un test a la fois.
 */
const { chromium } = require('playwright-core');
const A = require('../audits/commun');
const vues = require('../outils/vues');
const { ok, q, exec, MARQUE } = A;

const CHAMP_PRODUIT = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
const GRILLE = 'doventemanager #contenu #gridContainer #venteGrid';

/* prix de reference et journal poses pendant le test : retires par tiers-payant d'essai et par produit du test */
function retirerReferences() {
  const produits = A.etat.produits.map((p) => "'" + p.id + "'").join(',') || "'-'";
  exec("DELETE FROM prix_reference_journal WHERE tiers_payant_id LIKE '" + MARQUE + "%' OR (produit_id IN (" + produits + ") AND date_action >= '" + A.DEBUT + "');"
    + " DELETE FROM prix_reference WHERE tiersPayant_id LIKE '" + MARQUE + "%' OR produit_id IN (" + produits + ");"
    + " DELETE FROM taux_produit WHERE sale_iem_id IN (SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail d JOIN t_preenregistrement p"
    + " ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE p.dt_CREATED >= '" + A.DEBUT + "' AND p.lg_USER_ID = '" + A.ADMIN + "')");
}

/* produit du test : stock large, prix entre 1 000 et 9 000, sans prix de reference ni promotion, CIP unique */
function produitSansReference(rang) {
  return A.produit(rang || 0, 50, " AND f.int_PRICE BETWEEN 1000 AND 9000 AND f.int_CIP REGEXP '^[0-9]{7}$'"
    + ' AND NOT EXISTS (SELECT 1 FROM prix_reference pr WHERE pr.produit_id = f.lg_FAMILLE_ID)'
    + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)'
    + ' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1');
}
const cip = (p) => q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + p.id + "'");

/* menu du volet, retrouve par l'ecran qu'il ouvre : parent puis entree, par leurs libelles affiches */
async function ouvrirEcran(p, composant) {
  const lib = await p.evaluate((c) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === c && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, composant);
  if (!lib) { throw new Error('Menu absent pour ' + composant); }
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  await p.waitForTimeout(800);
  if (await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).count() > 0) {
    await p.mouse.click(1000, 33);
    await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}
const visible = (p, requete) => p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), requete, { timeout: 60000 });

/* navigateur connecte, menu Ventes, nouvelle vente ; attend la navigation chargee */
async function connecterEtOuvrirVente() {
  const sess = await A.connecter();
  const { p } = sess;
  await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
    return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
  await nouvelleVente(p);
  return sess;
}
async function nouvelleVente(p) {
  await ouvrirEcran(p, 'cloturerventemanager');
  await visible(p, 'cloturerventemanager #addBtn');
  await vues.cliquer(p, 'cloturerventemanager #addBtn');
  await visible(p, CHAMP_PRODUIT);
  await p.waitForTimeout(1500);
}

/* bouton « Assurance » du type de vente (segments), puis client tape et choisi par Entree */
async function passerEnAssurance(p) {
  await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
  await p.waitForTimeout(800);
  await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #typeVente')[0]; return c && c.getValue() === '2'; }, null, { timeout: 15000 });
}
async function choisirClient(p, nomClient) {
  await vues.cliquer(p, 'doventemanager #contenu #clientSearchTextField');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(nomClient, { delay: 20 });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu hiddenfield[itemId^=compteTp]').length > 0, null, { timeout: 30000 });
  await p.waitForTimeout(600);
}
/* le numero de bon du bloc tiers-payant de rang donne (1, 2...) */
async function saisirBon(p, rang, bon) {
  await vues.cliquer(p, 'doventemanager #contenu #refBon' + rang);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(bon, { delay: 15 });
  await p.keyboard.press('Tab');
  await p.waitForTimeout(300);
}
async function taperArticle(p, cipProduit) {
  await vues.cliquer(p, CHAMP_PRODUIT);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(cipProduit, { delay: 15 });
  const rep = p.waitForResponse((r) => /\/vente\/add\/(assurance|item|vno)/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1200);
}
const venteCourante = (p) => p.evaluate(() => { const v = testextjs.app.getController('VenteCtr').current; return v ? v.lgPREENREGISTREMENTID : null; });
const noterVente = (id) => { if (id && !A.etat.ventes.includes(id)) { A.etat.ventes.push(id); } };

/* en-tete de la grille : colonnes de premier niveau (texte, largeur, groupe) et groupes de reference en place */
const entete = (p) => p.evaluate((g) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  if (!grille) { return null; }
  const colonnes = grille.headerCt.items.getRange().filter((c) => !c.hidden).map((c) => ({
    texte: String(c.text || '').replace(/<[^>]+>/g, '').replace(/&#160;| /g, '').trim(), largeur: c.getWidth(), flex: c.flex || null,
    groupe: c.groupeReferenceTp ? c.groupeReferenceTp.tpId : null,
    sous: c.groupeReferenceTp ? c.items.getRange().map((s) => ({ texte: s.text, largeur: s.getWidth(), champ: s.referenceTp.champ })) : null }));
  const vue = grille.getView().el.dom;
  return { colonnes, groupes: colonnes.filter((c) => c.groupe).map((c) => c.groupe), largeurGrille: grille.getWidth(),
    defilement: vue.scrollWidth > vue.clientWidth, rappel: !!Ext.ComponentQuery.query('doventemanager #rappelReferenceTp').filter((x) => x.isVisible())[0],
    message: (Ext.ComponentQuery.query('doventemanager #messageReferenceTp').filter((x) => x.isVisible())[0] || { el: { dom: { textContent: '' } } }).el.dom.textContent };
}, GRILLE);

/* la ligne de grille d'un article : references portees et classes des cellules de reference */
const ligne = (p, cipProduit) => p.evaluate(([g, c]) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  const r = grille && grille.getStore().findRecord('intCIP', c, 0, false, true, true);
  if (!r) { return null; }
  const noeud = grille.getView().getNode(r);
  const cellules = Array.from(noeud.querySelectorAll('td.vp-ref-cellule')).map((td) => ({ texte: td.textContent.trim(), classes: td.className }));
  return { refs: r.get('referencesTp'), cellules, pu: r.get('intPRICEUNITAIR'), detailId: r.get('lgPREENREGISTREMENTDETAILID') };
}, [GRILLE, cipProduit]);

/* clic sur une cellule P.REF ou TAUX d'un tiers-payant, frappe, puis la touche donnee (Enter par defaut) */
async function saisirCellule(p, cipProduit, tpId, champ, texte, touche) {
  const id = await p.evaluate(([g, c, tp, ch]) => {
    const grille = Ext.ComponentQuery.query(g)[0];
    const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
    const col = grille.headerCt.getGridColumns().filter((x) => x.referenceTp && x.referenceTp.tpId === tp && x.referenceTp.champ === ch)[0];
    if (!r || !col) { return null; }
    const cellule = grille.getView().getCell(r, col);
    cellule.dom.id = cellule.dom.id || ('e2e-ref-' + ch + '-' + Math.random().toString(36).slice(2));
    return cellule.dom.id;
  }, [GRILLE, cipProduit, tpId, champ]);
  if (!id) { throw new Error('Cellule introuvable : ' + cipProduit + ' ' + tpId + ' ' + champ); }
  /* un editeur reste ouvert (Tab, clic ailleurs) est ferme d'abord, comme le ferait Echap */
  await p.evaluate((g) => { const grille = Ext.ComponentQuery.query(g)[0]; const pl = grille && grille.getPlugin('cellplugin'); if (pl && pl.editing) { pl.cancelEdit(); } }, GRILLE);
  await p.waitForTimeout(200);
  await p.click('#' + id);
  await p.waitForTimeout(400);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(texte), { delay: 30 });
  await p.waitForTimeout(150);
  await p.keyboard.press(touche || 'Enter');
}
/* saisie validee par Entree, avec attente de la reponse du PUT ; renvoie le corps de la reponse */
async function saisirEtEnregistrer(p, cipProduit, tpId, champ, texte) {
  const rep = p.waitForResponse((r) => r.request().method() === 'PUT' && /prix-reference\/vente\//.test(r.url()), { timeout: 60000 });
  rep.catch(() => {}); /* une attente abandonnee (exception avant la reponse) ne doit pas faire tomber le processus */
  await saisirCellule(p, cipProduit, tpId, champ, texte);
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  corps.http = r.status();
  await p.waitForTimeout(1500);
  return corps;
}

/* le focus est-il dans le champ produit ? */
const focusProduit = (p) => p.evaluate((c) => { const champ = Ext.ComponentQuery.query(c)[0]; const a = document.activeElement;
  return { ok: !!(champ && champ.inputEl && a && a.id === champ.inputEl.dom.id), actif: a ? (a.id || a.tagName) : '' }; }, CHAMP_PRODUIT);

const netAffiche = (p) => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); const n = c.getNetAmountToPay() || {};
  return { net: Number(String(c.getMontantNet().getValue()).replace(/\D/g, '')), partTp: Number(String(c.getMontantTp().getValue()).replace(/\D/g, '')),
    montantNet: n.montantNet, montantTp: n.montantTp }; });

/* le net recalcule par le serveur, par le meme appel que l'ecran */
const netServeur = (sess, venteId) => sess.p.evaluate(async (v) => {
  const c = testextjs.app.getController('VenteCtr');
  const r = await fetch('../api/v1/vente/net/assurance', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remiseId: c.getVnoremise().getValue(), venteId: v, tierspayants: c.buildAssuranceData() }) });
  return r.json();
}, venteId);

const references = (produitId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', tiersPayant_id, type_prix, valeur, IFNULL(valeur_taux, 'NULL'), enabled + 0) ORDER BY tiersPayant_id SEPARATOR ' ; '), 'aucune')"
  + " FROM prix_reference WHERE produit_id = '" + produitId + "'");
const journal = (produitId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', action, IFNULL(ancienne_valeur, 'NULL'), IFNULL(nouvelle_valeur, 'NULL'), IFNULL(ancien_taux, 'NULL'),"
  + " IFNULL(nouveau_taux, 'NULL'), IFNULL(nouveau_type, 'NULL'), IFNULL(vente_id, 'NULL'), IFNULL(utilisateur_id, 'NULL'), IFNULL(poste, 'NULL'), tiers_payant_id)"
  + " ORDER BY date_action, id SEPARATOR ' ; '), 'aucun') FROM prix_reference_journal WHERE produit_id = '" + produitId + "'");

function nettoyer() {
  retirerReferences();
  A.nettoyer();
}

module.exports = { chromium, A, vues, ok, q, exec, MARQUE, CHAMP_PRODUIT, GRILLE, produitSansReference, cip, ouvrirEcran, visible, connecterEtOuvrirVente,
  nouvelleVente, passerEnAssurance, choisirClient, saisirBon, taperArticle, venteCourante, noterVente, entete, ligne, saisirCellule, saisirEtEnregistrer,
  netAffiche, focusProduit, netServeur, references, journal, retirerReferences, nettoyer };
