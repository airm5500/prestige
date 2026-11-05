/* CAS 1 DU 03/11/2026 (ligne au comptant dans une vente assurance) : aide commune aux tests d'ecran.
 *
 * Jeu d'essai (audits/commun.js) : tiers-payant d'essai ZZAUDIT, client assure, produits a stock force, caisse ouverte,
 * parametre KEY_LIGNE_COMPTANT_VO pose le temps du test, remise d'essai de 5 % sur les produits du test. Parcours par
 * le vrai chemin de l'ecran : menu Ventes, bouton « Assurance », client tape puis Entree, article tape par son CIP,
 * case « C » cliquee, montant recu tape, « TERMINER LA VENTE ». Tout est retire a la fin (les deux ventes, la remise).
 * Base : copie de travail uniquement (outils/poste.js). Un test a la fois.
 */
const { chromium } = require('playwright-core');
const A = require('../audits/commun');
const vues = require('../outils/vues');
const { ok, q, exec, MARQUE } = A;

const CHAMP_PRODUIT = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
const GRILLE = 'doventemanager #contenu #gridContainer #venteGrid';
const COLONNES_ORIGINE = ',C.CIP,DESIGNATION,QD,QS,P.U,MONTANT,';

/* produit du test : stock large, prix entre 1 000 et 9 000, sans promotion, CIP unique, pas de deconditionnement */
function produitSimple(rang) {
  return A.produit(rang || 0, 50, " AND f.int_PRICE BETWEEN 1000 AND 9000 AND f.int_CIP REGEXP '^[0-9]{7}$'"
    + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)'
    + ' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1'
    + " AND COALESCE(f.is_scheduled, 0) = 0");
}
const cip = (p) => q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + p.id + "'");

/* remise d'essai de `taux` % (t_remise, grille, workflow) appliquee aux produits donnes ; retiree par A.nettoyer() */
function remiseEssai(taux, produits) {
  const REMISE = MARQUE + '-R' + taux;
  const type = q('SELECT lg_TYPE_REMISE_ID FROM t_type_remise ORDER BY lg_TYPE_REMISE_ID LIMIT 1');
  exec("INSERT INTO t_remise (lg_REMISE_ID, str_NAME, str_CODE, dbl_TAUX, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_REMISE_ID)"
    + " VALUES ('" + REMISE + "', '" + MARQUE + " " + taux + "', 'ZZA" + taux + "', " + taux + ", 'enable', NOW(), NOW(), '" + type + "');"
    + "INSERT INTO t_workflow_remise_article (lg_WORKFLOW_REMISE_ARTICLE_ID, str_DESCRIPTION, str_CODE_REMISE_ARTICLE, str_CODE_GRILLE_VO, str_CODE_GRILLE_VNO, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MARQUE + "-WF', 'essai', 'Z9', 990001, 990001, 'enable', NOW(), NOW());"
    + "INSERT INTO t_grille_remise (lg_GRILLE_REMISE_ID, str_CODE_GRILLE, str_DESCRIPTION, dbl_TAUX, str_STATUT, lg_REMISE_ID, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + MARQUE + "-GR', 990001, 'essai', " + taux + ", 'enable', '" + REMISE + "', NOW(), NOW())");
  for (const P of produits) {
    const codeAvant = q("SELECT IFNULL(str_CODE_REMISE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
    A.etat.restaurations.push("UPDATE t_famille SET str_CODE_REMISE = " + (codeAvant === 'NULL' ? 'NULL' : "'" + codeAvant + "'") + " WHERE lg_FAMILLE_ID = '" + P.id + "'");
    exec("UPDATE t_famille SET str_CODE_REMISE = 'Z9' WHERE lg_FAMILLE_ID = '" + P.id + "'");
  }
  return REMISE;
}

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

/* segment du type de vente (« Au comptant », « Assurance », « Carnet ») puis attente de la valeur */
async function choisirType(p, libelle, valeur) {
  await p.locator('text=/^\\s*' + libelle + '\\s*$/').filter({ visible: true }).first().click();
  await p.waitForTimeout(800);
  await p.waitForFunction((v) => { const c = Ext.ComponentQuery.query('doventemanager #typeVente')[0]; return c && c.getValue() === v; }, valeur, { timeout: 15000 });
  await p.waitForTimeout(600);
}
const passerEnAssurance = (p) => choisirType(p, 'Assurance', '2');
async function choisirClient(p, nomClient) {
  await vues.cliquer(p, 'doventemanager #contenu #clientSearchTextField');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(nomClient, { delay: 20 });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu hiddenfield[itemId^=compteTp]').length > 0, null, { timeout: 30000 });
  await p.waitForTimeout(600);
}
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
  await p.waitForTimeout(1500);
}
/* remise de la vente : liste deroulante REMISE, element par son libelle ; attend le POST vente/remise */
async function choisirRemise(p, libelle) {
  const rep = p.waitForResponse((r) => /\/vente\/remise/.test(r.url()), { timeout: 30000 });
  await vues.choisir(p, 'doventemanager #contenu [xtype=container] #remise', libelle);
  await rep;
  await p.waitForTimeout(800);
}
const venteCourante = (p) => p.evaluate(() => { const v = testextjs.app.getController('VenteCtr').current; return v ? v.lgPREENREGISTREMENTID : null; });
const noterVente = (id) => { if (id && !A.etat.ventes.includes(id)) { A.etat.ventes.push(id); } };

/* en-tete de la grille : colonnes visibles (texte, largeur, flex), colonne « C » (presente / visible) */
const entete = (p) => p.evaluate((g) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  if (!grille) { return null; }
  const toutes = grille.headerCt.items.getRange();
  const colonnes = toutes.filter((c) => !c.hidden).map((c) => ({
    texte: String(c.text || '').replace(/<[^>]+>/g, '').replace(/&#160;| /g, '').trim(), largeur: c.getWidth(), flex: c.flex || null }));
  const col = toutes.find((c) => c.itemId === 'colComptant');
  return { colonnes, textes: colonnes.map((c) => c.texte).join(','), colonneC: !!col, colonneCVisible: !!(col && !col.hidden),
    largeurC: col ? col.getWidth() : null };
}, GRILLE);

/* la ligne d'un article : coche, classe de ligne, pastille, promotion */
const ligne = (p, cipProduit) => p.evaluate(([g, c]) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  const r = grille && grille.getStore().findRecord('intCIP', c, 0, false, true, true);
  if (!r) { return null; }
  const noeud = grille.getView().getNode(r);
  return { comptant: !!r.get('comptant'), promotion: !!r.get('promotion'), fondJaune: /vp-ligne-comptant/.test(noeud.className),
    pastille: !!noeud.querySelector('.vp-cpt-pastille'), detailId: r.get('lgPREENREGISTREMENTDETAILID'), pu: r.get('intPRICEUNITAIR'),
    montant: r.get('intPRICE') };
}, [GRILLE, cipProduit]);

/* clic sur la case « C » d'un article ; renvoie la reponse du PUT (ou null si aucune requete n'est partie) */
async function cocher(p, cipProduit, attendreRequete) {
  const id = await p.evaluate(([g, c]) => {
    const grille = Ext.ComponentQuery.query(g)[0];
    const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
    const col = grille.headerCt.getGridColumns().filter((x) => x.itemId === 'colComptant')[0];
    if (!r || !col) { return null; }
    const cellule = grille.getView().getCell(r, col);
    cellule.dom.id = cellule.dom.id || ('e2e-cpt-' + Math.random().toString(36).slice(2));
    return cellule.dom.id;
  }, [GRILLE, cipProduit]);
  if (!id) { throw new Error('Case « C » introuvable : ' + cipProduit); }
  let rep = null;
  if (attendreRequete !== false) {
    rep = p.waitForResponse((r) => r.request().method() === 'PUT' && /\/vente\/item\/[^/]+\/comptant/.test(r.url()), { timeout: 30000 });
    rep.catch(() => {});
  }
  await p.locator('#' + id + ' .x-grid-checkcolumn').click();
  if (!rep) { await p.waitForTimeout(1200); return null; }
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  corps.http = r.status();
  /* le net est recalcule apres le PUT */
  await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  return corps;
}

/* rail de paiement : net, part tiers-payant, DONT COMPTANT, DONT PART CLIENT (visibles ?) */
const rail = (p) => p.evaluate(() => {
  const c = testextjs.app.getController('VenteCtr'); const n = c.getNetAmountToPay() || {};
  const lire = (x) => { const f = Ext.ComponentQuery.query('doventemanager #contenu #' + x)[0]; return f ? { visible: f.isVisible(true), valeur: Number(String(f.getValue()).replace(/\D/g, '')) } : null; };
  return { net: lire('montantNet'), tp: lire('montantTp'), comptant: lire('montantComptant'), partClient: lire('montantPartClient'),
    montantNet: n.montantNet, montantTp: n.montantTp, montantComptant: n.montantComptant, montantPartClient: n.montantPartClient, montant: n.montant, remise: n.remise };
});

/* dernier bandeau (toast) affiche, ou '' */
const toast = (p) => p.evaluate(() => { const t = Array.from(document.querySelectorAll('.vente-toast')); return t.length ? t[t.length - 1].textContent : ''; });

/* « TERMINER LA VENTE » : montant recu = net, clic, reponse de cloturer/assurance. La question du ticket est refusee,
   sauf imprimer = true : elle est acceptee et la reponse de ticket/vo est attendue (l'imprimante PDF du poste est lente). */
/* mode 'differe' : le mode de reglement « Differe » est choisi dans la liste, aucun montant recu n'est tape */
async function terminerVente(p, imprimer, mode) {
  /* AFFICHER NET A PAYER : meme chemin que la caissiere, le net est pose avant de saisir le montant recu */
  const net = p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 });
  net.catch(() => {});
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #netBtn');
  await net;
  await p.waitForTimeout(1200);
  if (await vues.texteMessage(p)) { await vues.repondre(p, 'ok').catch(() => {}); }
  const r = await rail(p);
  if (mode === 'differe') {
    await vues.choisir(p, 'doventemanager #contenu [xtype=fieldset] [xtype=container] #typeReglement', 'Differe');
    await p.waitForTimeout(800);
    if (await vues.texteMessage(p)) { await vues.repondre(p, 'ok').catch(() => {}); }
  } else {
    /* la premiere frappe peut etre avalee par le champ (montant a cinq chiffres) : on relit et on retape au besoin */
    for (let essai = 0; essai < 3; essai++) {
      await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(r.net.valeur), { delay: 40 });
      await p.waitForTimeout(300);
      const saisi = await p.evaluate(() => Number(String(Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].getValue()).replace(/\D/g, '')));
      if (saisi === r.net.valeur) { break; }
    }
    await p.keyboard.press('Tab');
  }
  await p.waitForTimeout(500);
  const rep = p.waitForResponse((x) => /\/vente\/cloturer\/assurance/.test(x.url()), { timeout: 120000 });
  rep.catch(() => {});
  const ticket = p.waitForResponse((x) => /\/vente\/ticket\/vo/.test(x.url()), { timeout: 240000 }).then((x) => ({ http: x.status() })).catch(() => null);
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
  const x = await Promise.race([rep, (async () => { for (let i = 0; i < 60; i++) { await p.waitForTimeout(2000); const m = await vues.texteMessage(p);
    if (m && !/patienter/i.test(m)) { throw new Error('Message à la clôture : ' + m); } } throw new Error('Pas de réponse de clôture'); })()]);
  const corps = await x.json().catch(() => ({}));
  corps.http = x.status();
  await p.waitForTimeout(800);
  corps.bandeau = await toast(p);
  await p.waitForTimeout(700);
  const message = await vues.texteMessage(p);
  if (/imprimer le ticket/i.test(message)) { await vues.repondre(p, imprimer ? 'yes' : 'no'); }
  corps.ticket = imprimer ? await Promise.race([ticket, new Promise((res) => setTimeout(() => res(null), 240000))]) : null;
  await p.waitForTimeout(1500);
  return corps;
}

/* ---- lectures en base ---- */
const vente = (id) => {
  const r = q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(b_IS_CANCEL, 0), int_PRICE, int_PRICE_REMISE, int_CUST_PART, IFNULL(lg_VENTE_LIEE_ID, 'NULL'), str_TYPE_VENTE,"
    + " lg_TYPE_VENTE_ID, IFNULL(str_REF, ''), IFNULL(lg_CLIENT_ID, 'NULL'), IFNULL(montantTva, 0), IFNULL(int_ACCOUNT, 0), IFNULL(str_STATUT_VENTE, ''))"
    + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
  return { statut: r[0], annulee: r[1] === '1', prix: Number(r[2]), remise: Number(r[3]), partClient: Number(r[4]), liee: r[5] === 'NULL' ? null : r[5],
    type: r[6], typeId: r[7], ref: r[8], client: r[9], tva: Number(r[10]), account: Number(r[11]), statutVente: r[12] };
};
const lignes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', lg_FAMILLE_ID, int_QUANTITY, int_PRICE, int_PRICE_REMISE, comptant + 0, str_STATUT) ORDER BY lg_FAMILLE_ID SEPARATOR ' ; '), 'aucune')"
  + " FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const mouvements = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', typeTransaction, montant, montantNet, montantCredit, montantVerse, montantRegle, montantPaye, montantRemise, montantRestant, IFNULL(typeReglementId, 'NULL'))"
  + " SEPARATOR ' ; '), 'aucun') FROM mvttransaction WHERE pkey = '" + id + "'");
const recettes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', CAST(int_AMOUNT AS SIGNED), str_DESCRIPTION) ORDER BY int_AMOUNT SEPARATOR ' ; '), 'aucune') FROM t_recettes WHERE str_REF_FACTURE = '" + id + "'");
const reglements = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', type_regelement, montant, montant_attentu, IFNULL(montant_verse, 'NULL')) ORDER BY montant SEPARATOR ' ; '), 'aucun') FROM vente_reglement WHERE vente_id = '" + id + "'");
const lignesTp = (id) => A.lignesTp(id);
const venteLieeDe = (id) => q("SELECT IFNULL(lg_VENTE_LIEE_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");


/* ---- lecture des tickets sans impression (apercu) ---- */
const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;
/* GET ticket/vo/{id}/apercu (ticket assurance de reimpression) ou apercu-combine (ticket client combine) */
const apercu = (p, venteId, combine) => p.evaluate(async ([v, c]) => (await fetch('../api/v1/vente/ticket/vo/' + v + (c ? '/apercu-combine' : '/apercu'))).json(), [venteId, !!combine]);
/* un ticket relu : articles (designation, quantite, prix, montant, mentions « Taux x % : part »), titres de section
   (TEXTE du corps hors mentions), paires libelle -> valeur, net encadre */
function lireTicket(t) {
  const articles = []; const paires = {}; const titres = []; const textes = []; let net = null;
  for (const b of t.blocs) {
    for (const e of b.elements) {
      if (e.genre === 'ARTICLE') {
        const m = String(e.b).match(/^(-?\d+)\s*×\s*([\d\s  ]+)$/);
        articles.push({ designation: e.a, quantite: m ? Number(m[1]) : null, pu: m ? chiffres(m[2]) : null, montant: chiffres(e.d), credits: [], section: titres.length });
      } else if (b.id === 'CORPS' && e.genre === 'TEXTE') {
        const m = e.a.match(/Taux\s+(\d+)\s*%\s*:\s*([\d\s  ]+)$/);
        if (m && articles.length) { articles[articles.length - 1].credits.push({ taux: Number(m[1]), part: chiffres(m[2]), texte: e.a }); }
        else if (/^VENTE /.test(e.a)) { titres.push(e.a); }
        else { textes.push(e.a); }
      } else if (e.genre === 'PAIRE' || e.genre === 'ENCADRE') {
        const cle = e.a.replace(/\s*:\s*$/, '').trim();
        paires[cle] = e.b;
        if (/net/i.test(cle) && /payer/i.test(cle)) { net = chiffres(e.b); }
        if (b.id === 'CORPS') { articles.push({ paire: cle, valeur: chiffres(e.b), section: titres.length }); }
      } else if (e.genre === 'TEXTE') { textes.push(e.a); }
    }
  }
  return { modele: t.modele, articles: articles.filter((a) => !a.paire), totaux: articles.filter((a) => a.paire), paires, titres, textes, net };
}

/* dettes (differe) portees par une vente : t_preenregistrement_compte_client */
const dettes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', int_PRICE, int_PRICE_RESTE, str_STATUT) ORDER BY int_PRICE SEPARATOR ' ; '), 'aucune') FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
/* mouvements de stock d'une vente (hmvtproduit) : produit/quantite/type */
const mouvementsStock = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', h.lg_FAMILLE_ID, h.qte, h.typeMvt) ORDER BY h.lg_FAMILLE_ID, h.typeMvt SEPARATOR ' ; '), 'aucun') FROM hmvtproduit h"
  + " WHERE h.lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "')");
/* detail d'une vente tel que l'ecran « Ventes terminees » le lit (find-one) */
const detailVente = (p, id) => p.evaluate(async (v) => (await fetch('../api/v1/ventestats/find-one/' + v)).json(), id);

/* annulation d'une vente par la liste des ventes terminees (recherche par sa reference, icone « Annuler.Vente », confirmation) */
async function annulerVente(p, ref) {
  await ouvrirEcran(p, 'ventemanager');
  await visible(p, 'ventemanager #query');
  await vues.cliquer(p, 'ventemanager #query');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(ref, { delay: 20 });
  await vues.cliquer(p, 'ventemanager #rechercher');
  await p.waitForTimeout(2500);
  const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: ref }).first();
  await rangee.waitFor({ timeout: 30000 });
  const rep = p.waitForResponse((x) => /\/vente\/annulation\//.test(x.url()), { timeout: 120000 });
  rep.catch(() => {});
  await rangee.locator('img[data-qtip="Annuler.Vente"]').first().click();
  await vues.attendreMessage(p, 'Annuler', 15000);
  await vues.repondre(p, 'yes');
  const r = await rep;
  await p.waitForTimeout(2000);
  if (/impression du ticket/i.test(await vues.texteMessage(p))) { await vues.repondre(p, 'no'); }
  await p.waitForTimeout(800);
  return r.status();
}

module.exports = { chiffres, apercu, lireTicket, dettes, mouvementsStock, detailVente, annulerVente, chromium, A, vues, ok, q, exec, MARQUE, CHAMP_PRODUIT, GRILLE, COLONNES_ORIGINE, produitSimple, cip, remiseEssai, ouvrirEcran, visible,
  connecterEtOuvrirVente, nouvelleVente, choisirType, passerEnAssurance, choisirClient, saisirBon, taperArticle, choisirRemise, venteCourante, noterVente,
  entete, ligne, cocher, rail, toast, terminerVente, vente, lignes, mouvements, recettes, reglements, lignesTp, venteLieeDe };
