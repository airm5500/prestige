/* ORDONNANCIER, CAS 3 DU 03/11/2026 : aide commune aux trois tests d'ecran (produit sensible a la vente, produit
 * ordonnancier sans code tableau, cochage en lot).
 *
 * Les tests passent par le vrai chemin de l'ecran : menu Ordonnancier, onglet clique, case cliquee, bouton de lot
 * clique deux fois ; vente saisie par le CIP et terminee par « Terminer la vente ». Tout ce qu'ils posent est retire :
 * ventes, medecin, client, parametre KEY_GERE_ORDONCIER, drapeaux des produits, stocks.
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();

const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : ''));
}
function bilan() {
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  return ko;
}

const CHAMP = (ecran) => ecran + ' #contenu [xtype=fieldcontainer] #produit';

/* un article simple : CIP unique a 7 chiffres, stock large, ni soumis a ordonnance, ni sensible, sans code tableau */
function articleSimple() {
  const l = q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER, IFNULL(f.is_scheduled, 0),"
    + " IFNULL(f.is_sensible, 0), IFNULL(f.int_T, '')) FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
    + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
    + " AND IFNULL(f.is_scheduled, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0 AND IFNULL(f.int_T, '') = ''"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 1").split('~');
  return { id: l[0], cip: l[1], stock: l[2], stockTotal: l[3], scheduled: l[4], sensible: l[5], intT: l[6] };
}

function remettreArticle(a) {
  q("UPDATE t_famille SET is_scheduled = " + a.scheduled + ", is_sensible = " + a.sensible + ", int_T = "
    + (a.intT === '' ? 'NULL' : "'" + a.intT + "'") + " WHERE lg_FAMILLE_ID = '" + a.id + "';"
    + " UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + a.stock + ", int_NUMBER = " + a.stockTotal
    + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + a.id + "'");
}

/* KEY_GERE_ORDONCIER : la valeur d'avant est rendue a la fin */
function parametreOrdonnancier(valeur) {
  const avant = q("SELECT IFNULL(str_VALUE, '') FROM t_parameters WHERE str_KEY = 'KEY_GERE_ORDONCIER'");
  q("UPDATE t_parameters SET str_VALUE = '" + valeur + "' WHERE str_KEY = 'KEY_GERE_ORDONCIER'");
  return avant;
}
function remettreParametre(avant) {
  q("UPDATE t_parameters SET str_VALUE = '" + avant + "' WHERE str_KEY = 'KEY_GERE_ORDONCIER'");
}

/* une caisse ouverte pour le compte des tests, si besoin */
function ouvrirCaisse(caisse) {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + user + "' AND str_STATUT = 'is_Using'") !== '0') { return false; }
  q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED,"
    + " lg_UPDATED_BY, str_STATUT) VALUES ('" + caisse + "', '" + user + "', 0, 0, CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using')");
  return true;
}
function fermerCaisse(caisse) {
  q("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + caisse + "'");
}

/* retire des ventes et tout ce qu'elles ont ecrit (meme chemin que test-numerotation-ventes.js) */
function retirerVentes(ventes) {
  if (!ventes.length) { return; }
  const liste = "('" + ventes.join("','") + "')";
  const filles = q("SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_PARENT_ID IN " + liste
    + " OR lg_PREENGISTREMENT_ANNULE_ID IN " + liste);
  filles.split(',').filter((x) => x && ventes.indexOf(x) < 0).forEach((x) => ventes.push(x));
  const tout = "('" + ventes.join("','") + "')";
  q("CREATE TEMPORARY TABLE e2e_ord_lignes AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " CREATE TEMPORARY TABLE e2e_ord_regl AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + tout + " AND lg_REGLEMENT_ID IS NOT NULL;"
    + " DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_ord_lignes);"
    + " DELETE FROM hmvtproduit WHERE pkey IN " + tout + " OR pkey IN (SELECT id FROM e2e_ord_lignes);"
    + " DELETE FROM vente_reglement WHERE vente_id IN " + tout + ";"
    + " DELETE FROM annulation_recette WHERE preenregistrement_id IN " + tout + ";"
    + " DELETE FROM vente_exclu WHERE preenregistrement_id IN " + tout + ";"
    + " DELETE FROM mvttransaction WHERE pkey IN " + tout + " OR vente_id IN " + tout + ";"
    + " DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_ord_regl);"
    + " DELETE FROM t_recettes WHERE str_REF_FACTURE IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_ord_regl) OR str_REF_RESSOURCE IN " + tout + ";"
    + " DROP TEMPORARY TABLE e2e_ord_lignes; DROP TEMPORARY TABLE e2e_ord_regl");
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

/* ouvre l'ecran Ordonnancier et clique l'onglet voulu (par son libelle) */
async function ouvrirOnglet(p, titre, itemId) {
  if (!(await p.evaluate(() => Ext.ComponentQuery.query('ordonnancier').some((x) => x.isVisible(true))))) {
    await ouvrirEcran(p, 'ordonnancier');
    await visible(p, 'ordonnancier #ongletsOrdonnancier');
    await p.waitForTimeout(1200);
  }
  const chargement = itemId === 'ongletSensibles' || itemId === 'ongletProduitsOrdonnancier'
    ? p.waitForResponse((r) => /fichearticle\/ordonnancier\?/.test(r.url()), { timeout: 60000 }).catch(() => null) : null;
  await p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('ordonnancier #ongletsOrdonnancier')[0].getId())
    + ' .x-tab').filter({ hasText: titre }).first().click();
  await p.waitForFunction((id) => { const t = Ext.ComponentQuery.query('ordonnancier #ongletsOrdonnancier')[0];
    return t && t.getActiveTab() && t.getActiveTab().getItemId() === id; }, itemId, { timeout: 15000 });
  if (chargement) { await chargement; }
  await p.waitForTimeout(600);
}

/* recherche dans un onglet produits : texte tape, Entree, reponse attendue ; renvoie les lignes du store */
async function chercherProduits(p, onglet, texte, filtre) {
  if (filtre) {
    await vues.choisir(p, 'ordonnancier #' + onglet + ' #filtre', filtre);
    await p.waitForTimeout(600);
  }
  await vues.cliquer(p, 'ordonnancier #' + onglet + ' #recherche');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(texte, { delay: 15 });
  const rep = p.waitForResponse((r) => /fichearticle\/ordonnancier\?/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(600);
  return lignesOnglet(p, onglet);
}

const lignesOnglet = (p, onglet) => p.evaluate((o) => Ext.ComponentQuery.query('ordonnancier #' + o)[0].getStore().getRange()
  .map((r) => r.getData()), onglet);

/* clic de souris sur la case de la ligne de rang donne ; renvoie la reponse du serveur */
async function cliquerCase(p, onglet, rang) {
  const id = await p.evaluate((o) => Ext.ComponentQuery.query('ordonnancier #' + o)[0].getId(), onglet);
  const rep = p.waitForResponse((r) => r.request().method() === 'PUT' && /fichearticle\/ordonnancier\/[^/]+$/.test(r.url()), { timeout: 60000 });
  await p.locator('#' + id + ' .x-grid-row').nth(rang).locator('.x-grid-checkcolumn').first().click();
  const r = await rep;
  await p.waitForTimeout(500);
  return r.json().catch(() => ({}));
}

const texteBouton = (p, onglet, bouton) => p.evaluate((a) => { const b = Ext.ComponentQuery.query('ordonnancier #' + a[0] + ' #' + a[1])[0];
  return b ? String(b.getText()).replace(/<[^>]+>/g, '') : ''; }, [onglet, bouton]);

const texteCompteur = (p, onglet) => p.evaluate((o) => { const c = Ext.ComponentQuery.query('ordonnancier #' + o + ' #totalResultat')[0];
  return c ? c.el.dom.textContent : ''; }, onglet);

/* ouvre l'ecran de vente comptant et tape l'article par son CIP ; renvoie la ligne de grille de l'article */
async function nouvelleVente(p) {
  await ouvrirEcran(p, 'cloturerventemanager');
  await visible(p, 'cloturerventemanager #addBtn');
  await vues.cliquer(p, 'cloturerventemanager #addBtn');
  await visible(p, CHAMP('doventemanager'));
  await p.waitForTimeout(1500);
}
async function taperArticle(p, cip) {
  await vues.cliquer(p, CHAMP('doventemanager'));
  await p.keyboard.press('Control+A');
  await p.keyboard.type(cip, { delay: 15 });
  const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1000);
}
const venteCourante = (p) => p.evaluate(() => { const v = testextjs.app.getController('VenteCtr').current; return v ? v.lgPREENREGISTREMENTID : null; });

/* montant recu = net a payer, puis « Terminer la vente » ; renvoie la reponse du serveur */
async function terminer(p) {
  const net = await p.evaluate(() => { const x = testextjs.app.getController('VenteCtr').getNetAmountToPay(); return x ? x.montantNet : 0; });
  await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
  await p.waitForTimeout(300);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(net), { delay: 15 });
  await p.waitForTimeout(300);
  const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: 120000 });
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  await p.waitForTimeout(1000);
  const ecranTexte = await vues.texteMessage(p).catch(() => '');
  if (/imprimer le ticket/i.test(ecranTexte)) { await vues.repondre(p, 'no'); }
  else if (ecranTexte && !/patienter/i.test(ecranTexte)) { await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {}); }
  await p.waitForTimeout(600);
  return { ok: r.status() < 400 && corps.success !== false, codeError: corps.codeError, msg: corps.msg || ecranTexte };
}

/* la ligne de la grille de vente qui porte l'article : texte de la cellule Designation et pastille eventuelle */
const ligneVente = (p, cip) => p.evaluate((c) => {
  const g = Ext.ComponentQuery.query('doventemanager grid')[0];
  const r = g && g.getStore().findRecord('intCIP', c);
  if (!r) { return null; }
  const ligne = g.getView().getNode(r);
  const pastille = ligne.querySelector('.vp-pastille');
  return { motif: r.get('motif'), sensible: r.get('sensible'), scheduled: r.get('scheduled'), texte: ligne.textContent,
    pastille: pastille ? pastille.textContent : '', classes: pastille ? pastille.className : '',
    animation: pastille ? getComputedStyle(pastille).animationName : '' };
}, cip);

/* ---- Aides de la regle de tests du 05/11/2026 (rapprochement, bilan avant / apres) ---- */
const fs = require('fs');
const path = require('path');

/* n articles simples (meme critere qu'articleSimple), CIP distincts */
function articlesSimples(n) {
  return q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER, IFNULL(f.is_scheduled, 0),"
    + " IFNULL(f.is_sensible, 0), IFNULL(f.int_T, ''), f.int_PRICE, f.str_NAME) FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
    + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
    + " AND IFNULL(f.is_scheduled, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0 AND IFNULL(f.int_T, '') = ''"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT " + n)
    .split(/\n/).filter(Boolean).map((x) => { const l = x.split('~');
      return { id: l[0], cip: l[1], stock: l[2], stockTotal: l[3], scheduled: l[4], sensible: l[5], intT: l[6], prix: Number(l[7]), nom: l[8] }; });
}

/* pose directement les drapeaux d'un produit (jeu d'essai ; le cochage par l'ecran est couvert par les autres tests) */
function poserDrapeaux(a, scheduled, sensible, intT) {
  q("UPDATE t_famille SET is_scheduled = " + (scheduled ? 1 : 0) + ", is_sensible = " + (sensible ? 1 : 0) + ", int_T = "
    + (intT ? "'" + intT + "'" : 'NULL') + " WHERE lg_FAMILLE_ID = '" + a.id + "'");
}

/* client et medecin d'essai, pour une cloture avec medecin */
function poserClientEtMedecin(j) {
  purgerClientEtMedecin(j);
  q("INSERT INTO medecin (id, num_ordre, nom, commentaire, created_at) VALUES ('" + j.medecin + "', '" + j.numOrdre + "', '" + j.nomMedecin + "', 'recette e2e', NOW());"
    + " INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + j.client + "', '" + j.client + "', '" + j.nomClient + "', 'E2E', '6', NOW(), NOW(), 'enable');"
    + " INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, str_CODE_COMPTE_CLIENT, str_TYPE, P_KEY, dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dec_Balance,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, lg_CLIENT_ID, dbl_PLAFOND) VALUES ('" + j.client + "', '" + j.client + "', 'CLIENT', '" + j.client + "', 0, 0, 0,"
    + " NOW(), NOW(), 'enable', '" + j.client + "', 0)");
}
function purgerClientEtMedecin(j) {
  q("DELETE FROM medecin WHERE id = '" + j.medecin + "'; DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + j.client + "';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID = '" + j.client + "'");
}

/* apres le refus de « Terminer la vente » : le parcours « client puis medecin », suivi a l'ecran */
async function rattacherClientEtMedecin(p, j, venteId) {
  await visible(p, 'ordonnanceparcours');
  await vues.cliquer(p, 'ordonnanceparcours #rechercheClient');
  const repClients = p.waitForResponse((r) => /client\/lambda/.test(r.url()), { timeout: 60000 });
  await p.keyboard.type(j.nomClient, { delay: 20 });
  await repClients;
  await p.waitForTimeout(800);
  const ligneClient = p.locator('.x-window:visible .x-grid-row').filter({ hasText: j.nomClient }).first();
  await ligneClient.waitFor({ timeout: 15000 });
  await ligneClient.locator('.x-action-col-icon').first().click();
  await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('ordonnanceparcours')[0];
    const v = f && f.down('#volets'); return v && v.getLayout().getActiveItem().getItemId() === 'voletMedecin'; }, null, { timeout: 30000 });
  await p.waitForTimeout(800);
  const clientOk = q("SELECT IFNULL(lg_CLIENT_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === j.client;
  await vues.cliquer(p, 'ordonnanceparcours #rechercheMedecin');
  const repMed = p.waitForResponse((r) => /medecin\/medecins/.test(r.url()), { timeout: 60000 });
  await p.keyboard.type(j.nomMedecin.slice(0, 18), { delay: 20 });
  await repMed;
  await p.waitForTimeout(800);
  const ligneMed = p.locator('.x-window:visible .x-grid-row').filter({ hasText: j.nomMedecin }).first();
  await ligneMed.waitFor({ timeout: 15000 });
  const repUpd = p.waitForResponse((r) => /vente\/update\/medecin/.test(r.url()), { timeout: 60000 });
  await ligneMed.locator('.x-action-col-icon').first().click();
  await repUpd;
  await p.waitForTimeout(1200);
  await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {});
  const medecinOk = q("SELECT IFNULL(medecin_id, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === j.medecin;
  return { clientOk, medecinOk };
}

/* quantite d'une ligne de vente : vrai clic sur la cellule QD, frappe, Entree */
async function saisirQuantite(p, cip, n) {
  const id = await p.evaluate((c) => { const g = Ext.ComponentQuery.query('doventemanager grid')[0]; const r = g.getStore().findRecord('intCIP', c);
    const col = g.columns.filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cell = g.getView().getCell(r, col);
    cell.dom.id = cell.dom.id || 'e2e-qd-' + c; return cell.dom.id; }, cip);
  const rep = p.waitForResponse((r) => /vente\/update\/item/.test(r.url()), { timeout: 60000 });
  await p.click('#' + id);
  await p.waitForTimeout(400);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(n), { delay: 40 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1000);
}

/* un fichier servi par Prestige (PDF, export), rapatrie par la page puis ecrit dans TMP */
async function telecharger(p, url, nom) {
  const r = await p.evaluate(async (u) => {
    const x = await fetch(u, { credentials: 'same-origin' });
    const o = new Uint8Array(await x.arrayBuffer()); let s = '';
    for (let i = 0; i < o.length; i += 8192) { s += String.fromCharCode.apply(null, o.subarray(i, i + 8192)); }
    return { statut: x.status, b64: btoa(s), disposition: x.headers.get('content-disposition') || '' };
  }, url);
  const chemin = path.join(ENV_E2E.TMP, nom);
  fs.writeFileSync(chemin, Buffer.from(r.b64, 'base64'));
  return { statut: r.statut, chemin, taille: fs.statSync(chemin).size, disposition: r.disposition };
}

/* texte d'un PDF, mis en page (pdftotext -layout), en lignes */
function lignesPdf(chemin) {
  return execFileSync('pdftotext', ['-layout', chemin, '-'], { encoding: 'utf8' }).replace(/\r/g, '').split('\n');
}

/* lignes d'un export .xls (premiere feuille), par xlrd */
function lignesXls(chemin) {
  const feuilles = JSON.parse(execFileSync('python', ['-X', 'utf8', path.resolve(__dirname, '../outils/lire_xls.py'), chemin], { encoding: 'utf8' }));
  return feuilles.length ? feuilles[0].lignes : [];
}

/* ---- traces en base, pour les bilans avant / apres ---- */
const stock = (id) => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + id + "'"));
const mvtStock = (venteId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(h.lg_FAMILLE_ID, ':', h.qteDebut, '-', h.qteMvt, '=', h.qteFinale, '@', h.lg_EMPLACEMENT_ID) ORDER BY h.lg_FAMILLE_ID SEPARATOR ';'), 'aucun')"
  + " FROM hmvtproduit h JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = h.lg_PREENREGISTREMENT_DETAIL_ID WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");
const mouvements = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', typeTransaction, montant, montantNet, montantVerse, montantPaye, montantRestant) SEPARATOR ' ; '), 'aucun')"
  + " FROM mvttransaction WHERE pkey = '" + id + "'");
const recettes = (id) => q("SELECT IFNULL(GROUP_CONCAT(CAST(int_AMOUNT AS SIGNED) SEPARATOR ' ; '), 'aucune') FROM t_recettes WHERE str_REF_FACTURE = '" + id + "'");
const reglements = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', type_regelement, montant, montant_attentu) SEPARATOR ' ; '), 'aucun') FROM vente_reglement WHERE vente_id = '" + id + "'");
/* lignes du journal d'audit du cochage (type ORDONNANCIER_PRODUIT) depuis un instant : qui, reference, quoi */
const journalCochage = (depuis) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', str_CREATED_BY, IFNULL(lg_USER_ID, ''), str_TYPE_LOG, str_DESCRIPTION) ORDER BY dt_CREATED, str_DESCRIPTION SEPARATOR '\n'), '')"
  + " FROM t_event_log WHERE str_TABLE_CONCERN = 'dal.TFamille' AND (str_DESCRIPTION LIKE '%sensible%' OR str_DESCRIPTION LIKE '%ordonnancier%') AND dt_CREATED >= '" + depuis + "'")
  .split('\n').filter(Boolean);
/* empreinte d'une table : nombre de lignes et somme de controle de toutes les colonnes sauf celles exclues */
function empreinte(table, exclues, ou) {
  const colonnes = q("SELECT GROUP_CONCAT(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '" + table + "'")
    .split(',').filter((c) => exclues.indexOf(c) < 0);
  return q("SELECT CONCAT(COUNT(*), ':', IFNULL(SUM(CRC32(CONCAT_WS('|', " + colonnes.map((c) => "IFNULL(`" + c + "`, 'NULL')").join(', ') + "))), 0)) FROM `" + table + "`"
    + (ou ? ' WHERE ' + ou : ''));
}
const drapeaux = (ids) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', IFNULL(is_scheduled, 0), IFNULL(is_sensible, 0)) ORDER BY lg_FAMILLE_ID SEPARATOR ';'), '')"
  + " FROM t_famille WHERE lg_FAMILLE_ID IN ('" + ids.join("','") + "')");
/* l'ensemble des traces que le cochage ne doit pas toucher */
const photo = () => ({
  familles: empreinte('t_famille', ['is_scheduled', 'is_sensible']),
  stocks: empreinte('t_famille_stock', []),
  ventes: q('SELECT COUNT(*) FROM t_preenregistrement'),
  lignes: q('SELECT COUNT(*) FROM t_preenregistrement_detail'),
  mvtStock: q('SELECT COUNT(*) FROM hmvtproduit'),
  caisse: q('SELECT COUNT(*) FROM mvttransaction'),
  recettes: q('SELECT COUNT(*) FROM t_recettes'),
  reglements: q('SELECT COUNT(*) FROM vente_reglement'),
  journal: q('SELECT COUNT(*) FROM t_event_log')
});
const memePhoto = (a, b, sauf) => Object.keys(a).filter((k) => (sauf || []).indexOf(k) < 0).every((k) => a[k] === b[k]);
const ecartPhoto = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]).map((k) => k + ' ' + a[k] + ' -> ' + b[k]).join(', ') || 'aucun';

module.exports = { ENV_E2E, vues, q, ok, bilan, articleSimple, remettreArticle, parametreOrdonnancier, remettreParametre, ouvrirCaisse,
  fermerCaisse, retirerVentes, ouvrirEcran, visible, ouvrirOnglet, chercherProduits, lignesOnglet, cliquerCase, texteBouton, texteCompteur,
  nouvelleVente, taperArticle, venteCourante, terminer, ligneVente,
  /* regle du 05/11 */ articlesSimples, poserDrapeaux, poserClientEtMedecin, purgerClientEtMedecin, rattacherClientEtMedecin, saisirQuantite,
  telecharger, lignesPdf, lignesXls, stock, mvtStock, mouvements, recettes, reglements, journalCochage, empreinte, drapeaux, photo, memePhoto, ecartPhoto };
