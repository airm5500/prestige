/* PLAN DU 12/11, POINT 4 : RECONCILIATION DE BL, « UTILISER LE CODE DU PRODUIT RETROUVE ».
 *
 * Constat : quand le code du BL (EAN13, 13 caracteres) n'est pas reconnu et que l'on retrouve le produit par son nom,
 * la fenetre « Type de code détecté » n'offre que deux choix qui modifient la fiche du produit : stocker le code comme
 * EAN13, ou remplacer le code CIP. Il manque le choix « garder le code du produit retrouve » : le produit garde son CIP
 * et son EAN13, et le code du BL est retenu comme code article de CE grossiste, pour que le prochain BL le reconnaisse.
 *
 * Vrai chemin (admin, vrais clics) : import d'un fichier Copharmed de 3 lignes inconnues (codes EAN13 d'essai 2999...,
 * quantites et prix differents, quantite > 1, UG), la reconciliation s'ouvre ; « Associer », recherche par le nom,
 * selection, « Associer le produit sélectionné », puis « Utiliser le code du produit retrouvé ».
 *  - ligne 1 -> produit A, qui a deja une ligne COPHARMED : son code article devient le code du BL ;
 *  - ligne 2 -> produit B, sans ligne COPHARMED : une ligne est creee (une seule), code article = code du BL ;
 *  - ligne 3 : son code est l'EAN13 d'un autre produit (C) : l'association est refusee, rien n'est ecrit ;
 * Controles :
 *  - le bouton existe, place en premier, porte le CIP du produit retrouve ; tous les boutons tiennent dans la fenetre ;
 *  - CIP et EAN13 de A et B inchanges ;
 *  - t_famille_grossiste : code article = code du BL, ligne creee pour B, aucune autre ligne touchee ;
 *  - rapprochement fichier = grille de reconciliation (statut « associe ») = ligne de commande (quantite livree,
 *    prix d'achat du BL, UG) ;
 *  - un second import du meme BL (autre facture) reconnait les lignes 1 et 2 (produits A et B), la ligne 3 reste
 *    inconnue ;
 *  - bilan : rien d'autre d'ecrit ; tout est retire a la fin (commandes, traces d'import, fichiers, numero de
 *    commande, lignes produit-grossiste, fiches) ;
 *  - aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ok, q, exec } = C;
const fs = require('fs');
const os = require('os');
const path = require('path');

const DOMAINE = process.env.PAYARA_DOMAINE || 'D:\\payara5\\payara5\\glassfish\\domains\\domain1';
const WEB_INF = path.join(DOMAINE, 'applications', 'prestige', 'WEB-INF');
const NOM_FICHIER = 'e2e-reconc-code-1311';
const SAUV_FG = 'zz_e2e_fg_1311';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'COPHARMED' AND str_STATUT = 'enable' LIMIT 1");
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '" + C.ADMIN + "'") || '1';

/* produit actif du depot, au nom unique (lettres seulement), avec ou sans ligne COPHARMED */
function produit(avecLigne, offset, exclus) {
  const l = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID
    AND s.lg_EMPLACEMENT_ID = '${EMP}' WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND f.str_NAME REGEXP '^[A-Z]{4}[A-Z ]{6,}$'
    AND f.int_CIP REGEXP '^[0-9]{6,7}$' AND f.lg_FAMILLE_ID NOT IN ('${exclus.join("','")}')
    AND ${avecLigne ? '' : 'NOT'} EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.lg_GROSSISTE_ID = '${G}'
      ${avecLigne ? "AND g.str_STATUT = 'enable'" : ''})
    AND (SELECT COUNT(*) FROM t_famille x WHERE x.str_NAME = f.str_NAME) = 1
    ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET ${offset}`).split('\t');
  return l.length === 3 ? { id: l[0], cip: l[1], nom: l[2] } : null;
}
const A = produit(true, 5, ['']);
const B = A && produit(false, 5, [A.id]);
/* C : produit sans aucune ligne produit-grossiste (l'import ne le reconnait pas), dont l'EAN13 prend le code de la ligne 3 */
const Cc = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', IFNULL(f.int_EAN13, '<null>')) FROM t_famille f WHERE NOT EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('|');

const L = [
  { code: '2999131100011', des: 'E2E CODEPROD UN', qte: 3, ug: 0, paf: 1250, pu: 1800 },
  { code: '2999131100028', des: 'E2E CODEPROD DEUX', qte: 1, ug: 2, paf: 8400, pu: 11500 },
  { code: '2999131100035', des: 'E2E CODEPROD TROIS', qte: 4, ug: 0, paf: 615, pu: 900 },
];
const ids = () => [A.id, B.id].map((x) => "'" + x + "'").join(',');
const etatFiches = () => q(`SELECT GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_ID, int_CIP, IFNULL(int_EAN13,'<null>'), str_STATUT) ORDER BY lg_FAMILLE_ID SEPARATOR ' ; ')
  FROM t_famille WHERE lg_FAMILLE_ID IN (${ids()})`);
const lignesFG = () => q(`SELECT lg_FAMILLE_GROSSISTE_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, IFNULL(str_CODE_ARTICLE,'<null>'), str_STATUT FROM t_famille_grossiste
  WHERE lg_FAMILLE_ID IN (${ids()}) ORDER BY lg_FAMILLE_GROSSISTE_ID`).replace(/\r/g, '').split('\n').filter(Boolean).map((l) => l.split('\t'));
const nbFG = () => Number(q('SELECT COUNT(*) FROM t_famille_grossiste'));
const empreinteFG = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_GROSSISTE_ID, lg_FAMILLE_ID, IFNULL(str_CODE_ARTICLE,''), str_STATUT, IFNULL(int_PAF,''), IFNULL(int_PRICE,''))
  ORDER BY lg_FAMILLE_GROSSISTE_ID)) FROM t_famille_grossiste WHERE lg_FAMILLE_ID NOT IN (${ids()})`);

const commandes = [];
let parametre = null;

function retirer() {
  for (const c of commandes) {
    exec(`DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${c}'; DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${c}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${c}';`);
  }
  if (parametre !== null) {
    exec("UPDATE t_parameters SET str_VALUE = '" + parametre.replace(/'/g, "''") + "' WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  }
  if (q(`SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${SAUV_FG}'`) === '1') {
    exec(`DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID IN (${ids()}) AND lg_FAMILLE_GROSSISTE_ID NOT IN (SELECT lg_FAMILLE_GROSSISTE_ID FROM ${SAUV_FG});`
      + ` UPDATE t_famille_grossiste g JOIN ${SAUV_FG} s ON s.lg_FAMILLE_GROSSISTE_ID = g.lg_FAMILLE_GROSSISTE_ID SET g.str_CODE_ARTICLE = s.str_CODE_ARTICLE,`
      + ` g.str_STATUT = s.str_STATUT, g.int_PAF = s.int_PAF, g.int_PRICE = s.int_PRICE, g.dt_UPDATED = s.dt_UPDATED; DROP TABLE ${SAUV_FG};`);
  }
  if (Cc.length === 2) {
    exec(`UPDATE t_famille SET int_EAN13 = ${Cc[1] === '<null>' ? 'NULL' : "'" + Cc[1] + "'"} WHERE lg_FAMILLE_ID = '${Cc[0]}'`);
  }
  try {
    for (const f of fs.readdirSync(WEB_INF).filter((x) => x.startsWith(NOM_FICHIER))) { fs.unlinkSync(path.join(WEB_INF, f)); }
  } catch (e) { /* dossier absent : rien a retirer */ }
}

(async () => {
  ok('Précondition : produits A (ligne COPHARMED), B (sans), C et grossiste COPHARMED', !!A && !!B && Cc.length === 2 && !!G, JSON.stringify({ A, B, Cc }));
  if (!A || !B || Cc.length !== 2 || !G) { process.exit(C.bilan() ? 1 : 0); }
  ok('Précondition : codes d\'essai inconnus', q(`SELECT COUNT(*) FROM t_famille_grossiste WHERE str_CODE_ARTICLE LIKE '2999131100%'`) === '0'
    && q("SELECT COUNT(*) FROM t_famille WHERE int_CIP LIKE '2999131100%' OR int_EAN13 LIKE '2999131100%'") === '0');
  parametre = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  exec(`DROP TABLE IF EXISTS ${SAUV_FG}; CREATE TABLE ${SAUV_FG} AS SELECT * FROM t_famille_grossiste WHERE lg_FAMILLE_ID IN (${ids()});`);
  exec(`UPDATE t_famille SET int_EAN13 = '${L[2].code}' WHERE lg_FAMILLE_ID = '${Cc[0]}'`);
  const fichesAvant = etatFiches();
  const fgAvant = lignesFG();
  const nbAvant = nbFG();
  const autresAvant = empreinteFG();
  const ligneA = fgAvant.find((l) => l[1] === A.id && l[2] === G && l[4] === 'enable');

  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-rcp-'));
  const fichier = (facture) => {
    const f = path.join(dossier, NOM_FICHIER + '-' + facture + '.csv');
    fs.writeFileSync(f, ['Date;Facture;Ligne;Rubrique;Code;Ref;Designation;Lot;Commandee;Livree;UG;PrixHT;Taxe;PrixPublic']
      .concat(L.map((l, i) => ['13/11/2026', facture, i + 1, '', l.code, '', l.des, '', l.qte, l.qte, l.ug, l.paf + '.0', '0', l.pu].join(';'))).join('\r\n') + '\r\n');
    return f;
  };

  const { b, p, erreurs } = await C.connecter();
  try {
    await p.setViewportSize({ width: 1366, height: 768 });
    const importer = async (facture) => {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('i_order_manager', '', '', ''));
      await p.locator('text=IMPORTER UNE COMMANDE').first().click({ timeout: 30000 });
      await p.waitForFunction(() => Ext.getCmp('xlsxdialog') && Ext.getCmp('formImport') && Ext.getCmp('formImport').rendered, null, { timeout: 15000 });
      await p.setInputFiles('#xlsxdialog input[type=file]', fichier(facture));
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
      if (corps.orderId) { commandes.push(corps.orderId); }
      await p.locator('.x-message-box .x-btn').filter({ visible: true, hasText: 'OK' }).first().click({ timeout: 20000 });
      await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => /Réconciliation/.test(w.title || '') && w.isVisible()), null, { timeout: 20000 });
      await p.waitForTimeout(800);
      return corps;
    };
    const corps1 = await importer('E2E-P1');
    ok('Import 1 : 3 lignes non reconnues', !!corps1.orderId && (corps1.nonReconnus || []).length === 3, JSON.stringify(corps1).slice(0, 300));
    const commande = corps1.orderId;

    const grille = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => /Réconciliation/.test(x.title || '') && x.isVisible())[0];
      return w.getGrid().getStore().getRange().map((r) => ({ cip: r.get('cip'), statut: r.get('statut'), pa: r.get('prixAchat'), qte: r.get('cmdeL'), ug: r.get('ug') })); });
    const choisir = async (l, P) => {
      await p.locator('.x-grid-row').filter({ visible: true, hasText: l.des }).first().locator('text=Associer').first().click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('#searchField').some((x) => x.isVisible(true)), null, { timeout: 10000 });
      const id = await p.evaluate(() => Ext.ComponentQuery.query('#searchField')[0].inputEl.dom.id);
      await p.click('#' + id);
      await p.keyboard.type(P.nom, { delay: 15 });
      await p.waitForFunction((fid) => Ext.ComponentQuery.query('#resultGrid')[0].getStore().findExact('lgFAMILLEID', fid) >= 0, P.id, { timeout: 20000 });
      const rang = await p.evaluate((fid) => Ext.ComponentQuery.query('#resultGrid')[0].getStore().findExact('lgFAMILLEID', fid), P.id);
      const grilleId = await p.evaluate(() => Ext.ComponentQuery.query('#resultGrid')[0].id);
      await p.locator('#' + grilleId + ' .x-grid-row').nth(rang).locator('.x-grid-cell').nth(1).click();
      await p.locator('.x-window .x-btn').filter({ visible: true, hasText: 'Associer le produit sélectionné' }).first().click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('window[title=Type de code détecté]').some((w) => w.isVisible()), null, { timeout: 10000 });
      await p.waitForTimeout(300);
      return p.evaluate(() => {
        const w = Ext.ComponentQuery.query('window[title=Type de code détecté]').filter((x) => x.isVisible())[0], r = w.getEl().dom.getBoundingClientRect();
        return w.query('button').filter((x) => x.isVisible()).map((x) => { const e = x.getEl().dom.getBoundingClientRect();
          return { texte: x.getText(), dedans: e.left >= r.left && e.right <= r.right && e.top >= r.top && e.bottom <= r.bottom, gauche: e.left, haut: e.top, larg: e.width,
            entier: x.getEl().dom.querySelector('.x-btn-inner').scrollWidth <= x.getEl().dom.querySelector('.x-btn-inner').clientWidth + 1 }; });
      });
    };
    const utiliserCodeProduit = async () => {
      const bouton = p.locator('.x-window .x-btn').filter({ visible: true, hasText: /Utiliser le code du produit retrouvé/ }).first();
      await bouton.click({ timeout: 5000 });
    };

    /* --- ligne 1 -> produit A (ligne COPHARMED existante), ligne 2 -> produit B (sans ligne COPHARMED) */
    for (const [l, P] of [[L[0], A], [L[1], B]]) {
      const boutons = await choisir(l, P);
      const nom = `${l.code} -> ${P.nom}`;
      ok(`${nom} : bouton « Utiliser le code du produit retrouvé (CIP ${P.cip}) » en premier`, boutons.length > 0
        && /^Utiliser le code du produit retrouvé/.test(boutons[0].texte) && boutons[0].texte.indexOf(P.cip) >= 0, JSON.stringify(boutons.map((x) => x.texte)));
      ok(`${nom} : tous les boutons tiennent dans la fenêtre, libellés entiers, sans chevauchement`, boutons.every((x) => x.dedans && x.entier)
        && boutons.every((x, i) => boutons.every((y, j) => i === j || x.haut !== y.haut || x.gauche + x.larg <= y.gauche || y.gauche + y.larg <= x.gauche)),
        JSON.stringify(boutons));
      try {
        await utiliserCodeProduit();
        await p.waitForFunction((c) => { const w = Ext.ComponentQuery.query('window').filter((x) => /Réconciliation/.test(x.title || '') && x.isVisible())[0];
          const r = w.getGrid().getStore().findRecord('cip', c); return r && r.get('statut') === 'associe'; }, l.code, { timeout: 20000 });
      } catch (e) {
        ok(`${nom} : association par le code du produit`, false, e.message.split('\n')[0]);
        await p.keyboard.press('Escape');
        await p.locator('.x-window .x-btn').filter({ visible: true, hasText: /^\s*Annuler\s*$/ }).last().click().catch(() => {});
        await p.locator('.x-window .x-btn').filter({ visible: true, hasText: /^\s*Annuler\s*$/ }).last().click().catch(() => {});
        continue;
      }
      await p.waitForTimeout(500);
      const g = (await grille()).find((x) => x.cip === l.code) || {};
      ok(`${nom} : grille, statut « associe »`, g.statut === 'associe', JSON.stringify(g));
      const det = q(`SELECT CONCAT_WS('|', int_NUMBER, int_PAF_DETAIL, prixAchat, IFNULL(ug,0), int_PRICE) FROM t_order_detail WHERE lg_ORDER_ID = '${commande}' AND lg_FAMILLE_ID = '${P.id}'`);
      ok(`${nom} : rapprochement fichier = grille = ligne de commande (quantité ${l.qte}, prix d'achat ${l.paf}, UG ${l.ug})`,
        det === [l.qte, l.paf, l.paf, l.ug, l.qte * l.paf].join('|') && Number(g.pa) === l.paf && Number(g.qte) === l.qte && Number(g.ug) === l.ug,
        det + ' / grille ' + JSON.stringify(g));
      const lignes = lignesFG().filter((x) => x[1] === P.id && x[2] === G);
      ok(`${nom} : une seule ligne COPHARMED, code article = code du BL`, lignes.length === 1 && lignes[0][3] === l.code && lignes[0][4] === 'enable', JSON.stringify(lignes));
    }
    ok('Produit A : sa ligne COPHARMED existante est reprise (pas de seconde ligne)', !!ligneA && lignesFG().some((x) => x[0] === ligneA[0] && x[3] === L[0].code), JSON.stringify(ligneA));
    ok('CIP et EAN13 de A et B inchangés', etatFiches() === fichesAvant, etatFiches() + ' / ' + fichesAvant);
    ok('Bilan : une seule ligne produit-grossiste créée (B), aucune autre touchée', nbFG() === nbAvant + 1 && empreinteFG() === autresAvant
      && fgAvant.every((x) => lignesFG().some((y) => y[0] === x[0] && (x === ligneA || (y[3] === x[3] && y[4] === x[4])))), nbFG() + ' / ' + (nbAvant + 1));

    /* --- ligne 3 : code deja EAN13 du produit C -> refus, rien n'est ecrit */
    const avant3 = [etatFiches(), JSON.stringify(lignesFG()), nbFG(), q(`SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '${commande}'`)].join(' / ');
    await choisir(L[2], A);
    let refus = '';
    try {
      await utiliserCodeProduit();
      await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 10000 });
      refus = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.innerText);
      await p.locator('.x-message-box .x-btn').filter({ visible: true, hasText: 'OK' }).first().click();
    } catch (e) { refus = 'aucun message : ' + e.message.split('\n')[0]; }
    ok('Ligne 3 (code = EAN13 d\'un autre produit) : refus expliqué', /déjà utilisé/.test(refus), refus);
    const apres3 = [etatFiches(), JSON.stringify(lignesFG()), nbFG(), q(`SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '${commande}'`)].join(' / ');
    ok('Ligne 3 refusée : rien n\'est écrit (fiches, lignes produit-grossiste, commande)', apres3 === avant3, apres3 + ' // ' + avant3);
    ok('Ligne 3 : toujours non associée dans la grille', ((await grille()).find((x) => x.cip === L[2].code) || {}).statut !== 'associe');
    await p.locator('.x-window .x-btn').filter({ visible: true, hasText: /^\s*Annuler\s*$/ }).last().click().catch(() => {});
    await p.waitForTimeout(500);
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible()).forEach((w) => w.close()));

    /* --- second import du meme BL : les codes retenus sont reconnus */
    const corps2 = await importer('E2E-P2');
    const nr = (corps2.nonReconnus || []).map((x) => x.cip || x.code || x.codeCip || JSON.stringify(x));
    ok('Import 2 : seule la ligne 3 reste inconnue', !!corps2.orderId && nr.length === 1 && String(nr[0]).indexOf(L[2].code) >= 0, JSON.stringify(nr));
    const det2 = q(`SELECT GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_ID, int_NUMBER) ORDER BY int_NUMBER) FROM t_order_detail WHERE lg_ORDER_ID = '${corps2.orderId}'`);
    ok('Import 2 : lignes 1 et 2 rattachées aux produits A et B, bonnes quantités', det2 === [B.id + '|' + L[1].qte, A.id + '|' + L[0].qte].join(','), det2);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Remise en état : commandes, traces d\'import, numéro, lignes produit-grossiste, fiches',
      commandes.every((c) => q(`SELECT (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${c}') + (SELECT COUNT(*) FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${c}')`) === '0')
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'") === parametre
      && JSON.stringify(lignesFG()) === JSON.stringify(fgAvant) && nbFG() === nbAvant && etatFiches() === fichesAvant
      && q(`SELECT IFNULL(int_EAN13,'<null>') FROM t_famille WHERE lg_FAMILLE_ID = '${Cc[0]}'`) === Cc[1], nbFG() + ' / ' + nbAvant);
  }
  process.exit(C.bilan() ? 1 : 0);
})();
