/* PLAN DU 09/11, POINT 2 : RECONCILIATION DE BL, FENETRE « ASSOCIER ».
 *
 * Par le vrai chemin (admin, vrais clics) : import d'un fichier Copharmed de 3 lignes inconnues (prix differents d'une
 * ligne a l'autre, quantite > 1, UG), la reconciliation s'ouvre d'elle-meme apres l'import.
 *  - en-tete de « Associer » : prix d'achat et prix de vente de la ligne du BL, apres le nom du produit ; rapproche
 *    pour chaque ligne avec la grille de reconciliation et le fichier importe ;
 *  - case « Rechercher dans les désactivés » decochee par defaut ;
 *  - recherche « contient » : un morceau pris au milieu du nom trouve le produit ; un code grossiste aussi ;
 *  - case cochee : le produit desactive apparait ; « Associer le produit sélectionné » ne passe plus par une fenetre :
 *    le bouton s'arme en rouge (« activer et associer ? »), rien n'est ecrit ; sans second clic il revient ;
 *  - second clic : produit reactive en base (fiche, stock, grossiste), l'association se poursuit (confirmation du
 *    code), refusee ici : le code du produit reste inchange ;
 *  - bilan : seule la reactivation est ecrite ; tout est retire a la fin (commande, traces d'import, fichier de
 *    verification, numero de commande, etat du produit) ;
 *  - aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ok, q, exec } = C;
const fs = require('fs');
const os = require('os');
const path = require('path');

const DOMAINE = process.env.PAYARA_DOMAINE || 'D:\\payara5\\payara5\\glassfish\\domains\\domain1';
const WEB_INF = path.join(DOMAINE, 'applications', 'prestige', 'WEB-INF');
const NOM_FICHIER = 'e2e-reconciliation-0911';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'COPHARMED' AND str_STATUT = 'enable' LIMIT 1");
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '" + C.ADMIN + "'") || '1';

/* produit actif du depot dont un morceau du milieu du nom (6 lettres, pas en debut de nom) designe peu de produits */
function choisirProduit() {
  const cand = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID
    AND s.lg_EMPLACEMENT_ID = '${EMP}' WHERE f.str_STATUT = 'enable' AND f.str_NAME REGEXP '^[A-Z]{3}[A-Z ]{3}[A-Z]{6}'
    ORDER BY f.lg_FAMILLE_ID LIMIT 60 OFFSET 200`).split(/\r?\n/).map((l) => l.split('\t'));
  for (const [id, cip, nom] of cand) {
    const morceau = nom.substr(6, 6);
    const n = Number(q(`SELECT COUNT(*) FROM t_famille WHERE str_NAME LIKE '%${morceau}%'`));
    const debut = Number(q(`SELECT COUNT(*) FROM t_famille WHERE str_NAME LIKE '${morceau}%'`));
    if (n >= 1 && n <= 15 && !nom.startsWith(morceau) && debut === 0) { return { id, cip, nom, morceau }; }
  }
  return null;
}

const P = choisirProduit();
const etatProduit = () => q(`SELECT CONCAT_WS('|', f.str_STATUT, f.int_CIP, IFNULL(f.int_EAN13,''), (SELECT GROUP_CONCAT(str_STATUT) FROM t_famille_stock WHERE lg_FAMILLE_ID = f.lg_FAMILLE_ID),
  (SELECT IFNULL(GROUP_CONCAT(str_STATUT ORDER BY lg_FAMILLE_GROSSISTE_ID), '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = f.lg_FAMILLE_ID)) FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P.id}'`);
let commande = '';
let parametre = null;
let etatInitial = '';
let statutsGrossiste = [];

function retirer() {
  if (commande) {
    exec(`DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}'; DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${commande}';`
      + ` DELETE FROM t_order WHERE lg_ORDER_ID = '${commande}';`);
  }
  if (parametre !== null) {
    exec("UPDATE t_parameters SET str_VALUE = '" + parametre.replace(/'/g, "''") + "' WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  }
  if (P) {
    exec(`UPDATE t_famille SET str_STATUT = 'enable' WHERE lg_FAMILLE_ID = '${P.id}'; UPDATE t_famille_stock SET str_STATUT = 'enable' WHERE lg_FAMILLE_ID = '${P.id}';`);
    for (const [id, st] of statutsGrossiste) { exec(`UPDATE t_famille_grossiste SET str_STATUT = '${st}' WHERE lg_FAMILLE_GROSSISTE_ID = '${id}'`); }
  }
  try {
    for (const f of fs.readdirSync(WEB_INF).filter((x) => x.startsWith(NOM_FICHIER))) { fs.unlinkSync(path.join(WEB_INF, f)); }
  } catch (e) { /* dossier absent : rien a retirer */ }
}

const separer = (v) => String(Math.round(Number(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

(async () => {
  ok('Précondition : produit d\'essai et grossiste COPHARMED', !!P && !!G, JSON.stringify(P));
  if (!P || !G) { process.exit(C.bilan() ? 1 : 0); }
  parametre = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  etatInitial = etatProduit();
  statutsGrossiste = q(`SELECT lg_FAMILLE_GROSSISTE_ID, str_STATUT FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '${P.id}'`).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
  /* le produit est desactive le temps de l'essai, comme le fait l'ecran (fiche, stock, grossiste) */
  exec(`UPDATE t_famille SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '${P.id}'; UPDATE t_famille_stock SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '${P.id}';`
    + ` UPDATE t_famille_grossiste SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '${P.id}';`);

  /* fichier Copharmed : [0] date, [1] facture, [2] ligne, [4] code, [6] designation, [8] commandee, [9] livree,
     [10] UG, [11] prix de cession HT, [13] prix public */
  const L = [
    { code: 'E2ER091', des: 'E2E RECONC UN', qte: 2, ug: 0, paf: 1037, pu: 1550 },
    { code: 'E2ER092', des: 'E2E RECONC DEUX', qte: 1, ug: 1, paf: 12990, pu: 17800 },
    { code: 'E2ER093', des: 'E2E RECONC TROIS', qte: 5, ug: 0, paf: 505, pu: 700 },
  ];
  const csv = ['Date;Facture;Ligne;Rubrique;Code;Ref;Designation;Lot;Commandee;Livree;UG;PrixHT;Taxe;PrixPublic']
    .concat(L.map((l, i) => ['09/11/2026', 'E2E-R1', i + 1, '', l.code, '', l.des, '', l.qte, l.qte, l.ug, l.paf + '.0', '0', l.pu].join(';'))).join('\r\n') + '\r\n';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-rec-'));
  const fichier = path.join(dossier, NOM_FICHIER + '.csv');
  fs.writeFileSync(fichier, csv);

  const { b, p, erreurs } = await C.connecter();
  try {
    await p.setViewportSize({ width: 1366, height: 768 });
    /* commandes en cours > IMPORTER UNE COMMANDE */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('i_order_manager', '', '', ''));
    await p.locator('text=IMPORTER UNE COMMANDE').first().click({ timeout: 30000 });
    await p.waitForFunction(() => Ext.getCmp('xlsxdialog') && Ext.getCmp('formImport') && Ext.getCmp('formImport').rendered, null, { timeout: 15000 });
    await p.setInputFiles('#xlsxdialog input[type=file]', fichier);
    const champ = (nom) => p.evaluate((n) => Ext.getCmp('formImport').down('[name=' + n + ']').inputEl.id, nom);
    await p.click('#' + await champ('modeBL'));
    await p.keyboard.type('COPH');
    await p.locator('.x-boundlist-item:visible', { hasText: /^COPHARMED$/ }).first().click();
    await p.click('#' + await champ('lg_GROSSISTE_ID'));
    await p.keyboard.type('COPHARMED');
    await p.locator('.x-boundlist-item:visible', { hasText: /^COPHARMED$/ }).first().click({ timeout: 20000 });
    const bouton = await p.evaluate(() => Ext.getCmp('formImport').down('button[text=Importer]').id);
    const [reponse] = await Promise.all([
      p.waitForResponse((r) => r.url().includes('/commande?action=import'), { timeout: 120000 }),
      p.click('#' + bouton),
    ]);
    const corps = JSON.parse(await reponse.text());
    commande = corps.orderId || '';
    ok('Import : 3 lignes non reconnues', !!commande && (corps.nonReconnus || []).length === 3, JSON.stringify(corps).slice(0, 300));
    /* message d'information de l'import, puis la reconciliation s'ouvre */
    await p.locator('.x-message-box .x-btn').filter({ visible: true, hasText: 'OK' }).first().click({ timeout: 20000 });
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => /Réconciliation/.test(w.title || '') && w.isVisible()), null, { timeout: 20000 });
    await p.waitForTimeout(800);

    /* en-tete de « Associer », ligne par ligne */
    const ouvrirAssocier = async (libelle) => {
      await p.locator('.x-grid-row').filter({ visible: true, hasText: libelle }).first().locator('text=Associer').first().click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('#searchField').some((x) => x.isVisible(true)), null, { timeout: 10000 });
      await p.waitForTimeout(400);
      return true;
    };
    const titre = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('#searchField')[0].up('window'); return w.getEl().down('.x-window-header-text').dom.innerText; });
    const fermerAssocier = async () => {
      await p.locator('.x-window .x-btn').filter({ visible: true, hasText: /^\s*Annuler\s*$/ }).last().click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('#searchField').length === 0, null, { timeout: 10000 });
    };
    const grille = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => /Réconciliation/.test(x.title || ''))[0];
      return w.getGrid().getStore().getRange().map((r) => ({ cip: r.get('cip'), libelle: r.get('libelle'), pa: r.get('prixAchat'), pv: r.get('prixUn') })); });
    for (const l of L) {
      await ouvrirAssocier(l.des);
      const t = await titre();
      const g = grille.find((x) => x.cip === l.code) || {};
      const iNom = t.indexOf(l.des), iPa = t.indexOf('Prix d\'achat : ' + separer(l.paf)), iPv = t.indexOf('Prix de vente : ' + separer(l.pu));
      ok(`En-tête « Associer » ${l.code} : prix d'achat ${separer(l.paf)} et de vente ${separer(l.pu)} après le nom`,
        iNom >= 0 && iPa > iNom && iPv > iPa, t);
      ok(`Rapprochement ${l.code} : fichier = grille de réconciliation = en-tête`, Number(g.pa) === l.paf && Number(g.pv) === l.pu, JSON.stringify(g));
      await fermerAssocier();
    }

    /* recherche dans la fenetre de la premiere ligne */
    await ouvrirAssocier(L[0].des);
    ok('Case « Rechercher dans les désactivés » décochée par défaut', await p.evaluate(() => Ext.ComponentQuery.query('#chercherDesactives')[0].getValue() === false));
    const resultats = () => p.evaluate(() => Ext.ComponentQuery.query('#resultGrid')[0].getStore().getRange().map((r) => r.get('lgFAMILLEID')));
    const chercher = async (texte) => {
      const id = await p.evaluate(() => Ext.ComponentQuery.query('#searchField')[0].inputEl.dom.id);
      await p.click('#' + id, { clickCount: 3 });
      await p.keyboard.press('Control+A');
      await p.keyboard.type(texte, { delay: 20 });
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(1200);
    };
    /* un produit actif trouve par un morceau du milieu de son nom */
    const actif = q(`SELECT f.lg_FAMILLE_ID, f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '${EMP}'
      WHERE f.str_STATUT = 'enable' AND f.str_NAME REGEXP '^[A-Z]{4}[A-Z ]{2}[A-Z]{5}' AND f.lg_FAMILLE_ID <> '${P.id}' ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 500`).trim().split('\t');
    const morceauActif = actif[1].substr(6, 5);
    const nActif = Number(q(`SELECT COUNT(*) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '${EMP}' WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE '%${morceauActif}%'`));
    await chercher(morceauActif);
    const rActif = await resultats();
    ok(`Recherche « contient » : « ${morceauActif} » trouve ${actif[1]}` + (nActif > 50 ? ' (ou 50 résultats)' : ''),
      rActif.includes(actif[0]) || (nActif > 50 && rActif.length === 50), rActif.length + ' résultats');
    /* produit desactive : introuvable sans la case */
    await chercher(P.morceau);
    ok(`Sans la case : le produit désactivé (« ${P.morceau} ») n'apparaît pas`, !(await resultats()).includes(P.id));
    await p.locator('.x-window').filter({ visible: true, hasText: 'Rechercher dans les désactivés' }).locator('text=Rechercher dans les désactivés').click();
    await p.waitForFunction((id) => Ext.ComponentQuery.query('#resultGrid')[0].getStore().getRange().some((r) => r.get('lgFAMILLEID') === id), P.id, { timeout: 10000 }).catch(() => {});
    ok(`Case cochée : « ${P.morceau} » (milieu du nom) trouve ${P.nom}, marqué désactivé`, await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('#resultGrid')[0], i = g.getStore().findExact('lgFAMILLEID', id);
      return i >= 0 && /désactivé/.test(g.getView().getNode(i).innerText); }, P.id));
    /* selection du produit desactive puis « Associer le produit sélectionné » */
    await p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('#resultGrid')[0].id) + ' .x-grid-row').filter({ hasText: P.nom }).first().locator('.x-grid-cell').nth(1).click();
    const avantArme = etatProduit();
    const etatBouton = () => p.evaluate(() => { const x = Ext.ComponentQuery.query('#btnAssocier')[0] || Ext.ComponentQuery.query('button').filter((y) => /Associer le produit/.test(y.getText() || ''))[0];
      if (!x) { return null; } const el = x.getEl().dom, inner = el.querySelector('.x-btn-inner');
      return { texte: x.getText(), fond: getComputedStyle(el).backgroundColor, encre: inner ? getComputedStyle(inner).color : '', boite: Ext.MessageBox.isVisible() }; });
    const repos = await etatBouton();
    await p.locator('.x-window .x-btn').filter({ visible: true, hasText: 'Associer le produit sélectionné' }).first().click();
    await p.waitForTimeout(600);
    const arme = await etatBouton();
    ok('Produit désactivé : pas de fenêtre, le bouton s\'arme en rouge (activer et associer)', !!arme && !arme.boite && /activer/i.test(arme.texte)
      && arme.fond === 'rgb(192, 57, 43)' && arme.encre === 'rgb(255, 255, 255)', JSON.stringify({ repos, arme }));
    ok('Bouton armé : rien n\'est écrit', etatProduit() === avantArme, etatProduit());
    await p.mouse.move(5, 5);
    await p.waitForTimeout(5600);
    const revenu = await etatBouton();
    ok('Sans second clic : le bouton revient à son texte et à sa couleur', !!revenu && revenu.texte === repos.texte && revenu.fond === repos.fond, JSON.stringify(revenu));
    /* premier clic puis second clic */
    await p.locator('.x-window .x-btn').filter({ visible: true, hasText: 'Associer le produit sélectionné' }).first().click();
    await p.waitForTimeout(700);
    await p.locator('.x-window .x-btn').filter({ visible: true, hasText: /activer/i }).first().click();
    await p.waitForFunction((id) => true, P.id);
    await p.waitForTimeout(2000);
    const apres = etatProduit().split('|');
    ok('Second clic : produit réactivé en base (fiche, stock, grossiste)', apres[0] === 'enable' && !/disable/.test(apres[3]) && !/disable/.test(apres[4]), apres.join('|'));
    const suite = await p.evaluate(() => ({ boite: Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.innerText : '',
      icone: Array.from(document.querySelectorAll('*')).some((e) => e.offsetWidth > 0 && /^Confirmer \?$/.test((e.innerText || '').trim())) }));
    ok('L\'association se poursuit : confirmation du code demandée', /code CIP/.test(suite.boite) || suite.icone, JSON.stringify(suite));
    /* l'association n'est pas confirmee : attente du retour du bouton, ou « Non » */
    if (suite.boite) {
      await p.locator('.x-message-box .x-btn').filter({ visible: true, hasText: /^\s*Non\s*$|^\s*No\s*$/ }).first().click();
    } else {
      await p.mouse.move(5, 5);
      await p.waitForTimeout(5600);
    }
    await p.waitForTimeout(800);
    const fin = etatProduit().split('|'), debut = etatInitial.split('|');
    ok('Code du produit inchangé (association non confirmée)', fin[1] === debut[1] && fin[2] === debut[2], fin.join('|'));
    ok('Aucun produit ne porte un code d\'essai', q("SELECT COUNT(*) FROM t_famille WHERE int_CIP LIKE 'E2ER09%' OR int_EAN13 LIKE 'E2ER09%'") === '0');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Remise en état : commande, traces d\'import, numéro de commande, produit',
      (!commande || q(`SELECT (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${commande}') + (SELECT COUNT(*) FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}')`) === '0')
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'") === parametre && etatProduit() === etatInitial,
      etatProduit() + ' / ' + etatInitial);
  }
  process.exit(C.bilan() ? 1 : 0);
})();
