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

module.exports = { ENV_E2E, vues, q, ok, bilan, articleSimple, remettreArticle, parametreOrdonnancier, remettreParametre, ouvrirCaisse,
  fermerCaisse, retirerVentes, ouvrirEcran, visible, ouvrirOnglet, chercherProduits, lignesOnglet, cliquerCase, texteBouton, texteCompteur,
  nouvelleVente, taperArticle, venteCourante, terminer, ligneVente };
