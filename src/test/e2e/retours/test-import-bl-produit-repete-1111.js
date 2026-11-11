/* RETOUR DU 11/11 (BASE DE TIASSALE, BL R20285250) : BL IMPORTE OU UN PRODUIT REVIENT DEUX FOIS, ENTREE EN STOCK REFUSEE.
 *
 * Constat : le fichier du grossiste (modele DPCI, sans numero de lot ni date) portait deux fois DEPOFEM (2 + 2) et deux
 * fois EOSINE (1 + 1). L'import faisait bien une seule ligne par produit, mais DEUX lots identiques, sans numero ni
 * date. L'ecran du BL ne montre et ne complete qu'un lot par ligne : apres saisie, le second lot restait sans date,
 * invisible, et « ENTREE EN STOCK » repondait « Certaines dates de péremptions ne sont pas renseignées » sans dire
 * quel produit.
 *
 * Attendu :
 *  - import : un produit repete n'a qu'un lot, de la quantite totale (commande, BL et lots en base) ;
 *  - refus : le message nomme le ou les produits qui bloquent (CIP, libelle, detail), et eux seuls ; la reponse porte
 *    code PEREMPTION_MANQUANTE et la liste « produits » ;
 *  - bilan : un refus n'ecrit rien (BL ouvert, stock, lots et mouvements inchanges).
 *
 * Jeu d'essai : P1 repete 2 + 2 (suivi en peremption, sa date est saisie comme l'a fait l'utilisateur), P2 repete
 * 1 + 1 (non suivi), P3 seul, 3 boites (suivi, laisse sans date : c'est lui qui doit bloquer). Prix differents.
 * Parcours par les ecrans : « IMPORTER UNE COMMANDE » (modele DPCI, grossiste DPCI), « Créer le bon de livraisson »,
 * « Detail livraison », « ENTREE EN STOCK », Oui, Oui. La date du lot de P1 est posee en base (preparation).
 * Donnees retirees a la fin ; parametre de peremption et suivi des produits remis.
 * Lancement seul : node src/test/e2e/retours/test-import-bl-produit-repete-1111.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const REF_BL = 'E2EREP' + String(Date.now()).slice(-6);
const CLE = 'KEY_ACTIVATE_PEREMPTION_DATE';
const PARAM = q(`SELECT IFNULL(MAX(str_VALUE), '<absent>') FROM t_parameters WHERE str_KEY = '${CLE}'`);
const DPCI = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'DPCI' AND str_STATUT = 'enable' LIMIT 1");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
/* trois produits sans ambiguite a l'import : un seul code CIP, une seule fiche grossiste, un seul stock */
const PRODUITS = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, f.int_PAF, f.int_PRICE, IFNULL(f.bool_CHECKEXPIRATIONDATE, 'NULL')) FROM t_famille f"
  + " JOIN t_famille_grossiste g ON g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND f.int_PAF > 0 AND f.int_PRICE > 0 AND f.lg_ZONE_GEO_ID IS NOT NULL"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " AND (SELECT COUNT(*) FROM t_famille y WHERE y.int_CIP = f.int_CIP) = 1 AND LENGTH(f.int_CIP) = 7 AND f.str_NAME NOT LIKE '%;%'"
  + " GROUP BY f.lg_FAMILLE_ID HAVING COUNT(*) = 1 ORDER BY f.lg_FAMILLE_ID LIMIT 3").split(/\r?\n/).filter(Boolean)
  .map((l) => { const [id, cip, nom, paf, prix, suivi] = l.split('|'); return { id, cip, nom, paf: Number(paf), prix: Number(prix), suivi }; });
const [P1, P2, P3] = PRODUITS;
const IDS = PRODUITS.map((p) => "'" + p.id + "'").join(',');
let orderId = null;

/* fichier DPCI : rang;libelle;cip;paf;prix;tva;quantite;ug;reference du BL; */
const FICHIER = path.join(os.tmpdir(), 'e2e-import-repete-' + REF_BL + '.csv');
const LIGNES = [[P1, 2], [P3, 3], [P2, 1], [P1, 2], [P2, 1]];
fs.writeFileSync(FICHIER, LIGNES.map(([p, n], i) => [i + 1, p.nom, p.cip, p.paf.toFixed(1), p.prix.toFixed(1), '0.0', n, 0, REF_BL, ''].join(';')).join('\n') + '\n');

const stock = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID), '') FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${IDS})`);
const lotsBl = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(f.int_CIP, ':', l.int_NUMBER, ':', IFNULL(l.dt_PEREMPTION, '-')) ORDER BY f.int_CIP, l.int_NUMBER), '') FROM t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID WHERE l.str_REF_LIVRAISON = '${REF_BL}'`);
const mouvements = () => q(`SELECT (SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID IN (${IDS}) AND mvtdate >= '${DEBUT}')`
  + ` + (SELECT COUNT(*) FROM MvtTransaction WHERE pkey IN (SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE str_REF_LIVRAISON = '${REF_BL}'))`);

function retirer() {
  if (orderId) {
    const bls = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_ID, "'")), "''") FROM t_bon_livraison WHERE lg_ORDER_ID = '${orderId}'`);
    exec(`DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}'; DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF_BL}';`
      + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${bls}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${bls});`
      + `DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${orderId}';`
      + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${orderId}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${orderId}';`);
  }
  if (PRODUITS.length === 3) {
    exec(`DELETE FROM t_etiquette WHERE lg_FAMILLE_ID IN (${IDS}) AND dt_CREATED >= '${DEBUT}';`
      + PRODUITS.map((p) => `UPDATE t_famille SET bool_CHECKEXPIRATIONDATE = ${p.suivi === 'NULL' ? 'NULL' : p.suivi} WHERE lg_FAMILLE_ID = '${p.id}';`).join(''));
  }
  if (PARAM !== '<absent>') { exec(`UPDATE t_parameters SET str_VALUE = '${PARAM}' WHERE str_KEY = '${CLE}'`); }
  try { fs.unlinkSync(FICHIER); } catch (e) { /* deja retire */ }
}

(async () => {
  ok('Précondition : grossiste DPCI, trois produits, paramètre de péremption présent', !!DPCI && PRODUITS.length === 3 && PARAM !== '<absent>',
    DPCI + ' ' + PRODUITS.map((p) => p.cip).join(',') + ' ' + PARAM);
  const stockAvant = stock();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }
    const fermerMsg = async () => {
      for (let i = 0; i < 3; i++) {
        if (!(await p.evaluate(() => Ext.Msg.isVisible()))) { return; }
        await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
        await p.waitForTimeout(500);
      }
    };

    /* 1. import du fichier, modele DPCI, grossiste DPCI */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commandes', ''));
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await p.getByText('IMPORTER UNE COMMANDE', { exact: true }).first().click();
    await p.waitForFunction(() => Ext.getCmp('xlsxdialog') && Ext.getCmp('xlsxdialog').isVisible(true), null, { timeout: 20000 });
    await p.locator('#xlsxdialog input[type=file]').setInputFiles(FICHIER);
    const fleche = async (nom) => {
      const id = await p.evaluate((n) => Ext.getCmp('formImport').down('[name=' + n + ']').getEl().down('.x-form-trigger').id, nom);
      await p.locator('#' + id).click();
    };
    await fleche('modeBL');
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: /^DPCI$/ }).first().click();
    await fleche('lg_GROSSISTE_ID');
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: /^DPCI$/ }).first().click();
    const rep = p.waitForResponse((r) => r.url().includes('commande?action=import'), { timeout: 120000 });
    rep.catch(() => {});
    await p.locator('#xlsxdialog .x-btn').filter({ hasText: 'Importer' }).click();
    const corps = await (await rep).text();
    orderId = (corps.match(/"orderId":"([^"]+)"/) || [])[1];
    ok('Import accepté, commande créée', !!orderId, corps);
    await p.waitForTimeout(1500);
    await fermerMsg();
    const panneau = p.locator('.x-window').filter({ visible: true }).filter({ hasText: 'Fermer' });
    if (await panneau.count()) { await panneau.first().getByText('Fermer', { exact: true }).first().click().catch(() => {}); }

    /* commande : une ligne et UN lot par produit, quantites additionnees (rapprochement fichier = commande) */
    const cmd = {};
    q(`SELECT CONCAT_WS('|', f.int_CIP, d.int_NUMBER, d.lots) FROM t_order_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_ORDER_ID = '${orderId}'`)
      .split(/\r?\n/).filter(Boolean).forEach((l) => { const [cip, n, lots] = l.split('|'); cmd[cip] = { n: Number(n), lots: JSON.parse(lots || '[]') }; });
    const attendu = {}; LIGNES.forEach(([x, n]) => { attendu[x.cip] = (attendu[x.cip] || 0) + n; });
    ok('Commande : une ligne par produit, quantité = somme du fichier (P1 4, P2 2, P3 3)',
      Object.keys(cmd).length === 3 && PRODUITS.every((x) => cmd[x.cip] && cmd[x.cip].n === attendu[x.cip]), JSON.stringify(cmd));
    ok('Commande : un produit répété n\'a qu\'un lot, de la quantité totale (P1 : 1 lot de 4 ; P2 : 1 lot de 2)',
      [P1, P2, P3].every((x) => cmd[x.cip] && cmd[x.cip].lots.length === 1 && cmd[x.cip].lots[0].quantity === attendu[x.cip]),
      PRODUITS.map((x) => x.cip + '=' + JSON.stringify(cmd[x.cip] && cmd[x.cip].lots)).join(' ; '));

    /* 2. creation du BL depuis la commande */
    const refCmd = q(`SELECT str_REF_ORDER FROM t_order WHERE lg_ORDER_ID = '${orderId}'`);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commandes', ''));
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await p.click('#rechecher input, input#rechecher-inputEl');
    await p.keyboard.type(refCmd, { delay: 20 });
    await p.keyboard.press('Enter');
    const l = p.locator('.x-grid-row').filter({ visible: true, hasText: refCmd }).first();
    await l.waitFor({ timeout: 30000 });
    await l.locator('img[data-qtip="Créer le bon de livraisson"]').click();
    await p.waitForFunction(() => Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const saisir = async (id, v) => { await p.locator('#' + id + '-inputEl').click(); await p.locator('#' + id + '-inputEl').fill(''); await p.keyboard.type(v, { delay: 20 }); };
    const j = new Date();
    const ht = LIGNES.reduce((s, [x, n]) => s + n * x.paf, 0);
    await saisir('str_REF_LIVRAISON', REF_BL);
    await saisir('dt_DATE_LIVRAISON', String(j.getDate()).padStart(2, '0') + '/' + String(j.getMonth() + 1).padStart(2, '0') + '/' + j.getFullYear());
    await saisir('int_MHT', String(ht));
    await saisir('int_TVA', '0');
    const repBl = p.waitForResponse((r) => r.url().includes('commande/creerbl'), { timeout: 60000 });
    await p.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).click();
    if (await p.waitForFunction(() => Ext.Msg.isVisible() && /diff[ée]rent/.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 4000 }).then(() => true, () => false)) {
      await p.evaluate(() => Ext.Msg.down('button[itemId=yes]').btnEl.dom.click());
    }
    const rb = await (await repBl).json();
    ok('BL créé depuis la commande importée', rb && rb.success !== false, JSON.stringify(rb).slice(0, 200));
    await p.waitForTimeout(1500);
    await fermerMsg();
    const blId = q(`SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID = '${orderId}'`);
    const lignesBl = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(f.int_CIP, 'x', d.int_QTE_CMDE) ORDER BY f.int_CIP), '') FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_BON_LIVRAISON_ID = '${blId}'`);
    const attenduBl = PRODUITS.slice().sort((a, c) => (a.cip < c.cip ? -1 : 1)).map((x) => x.cip + 'x' + attendu[x.cip]).join(',');
    ok('BL : une ligne par produit, quantités = commande = fichier', lignesBl === attenduBl, lignesBl + ' / ' + attenduBl);
    const attenduLots = PRODUITS.slice().sort((a, c) => (a.cip < c.cip ? -1 : 1)).map((x) => x.cip + ':' + attendu[x.cip] + ':-').join(',');
    ok('Lots du BL en base : un seul lot par produit, de la quantité totale, sans date (fichier sans lot)', lotsBl() === attenduLots, lotsBl() + ' / ' + attenduLots);

    /* 3. comme l'utilisateur : la date du lot de P1 est saisie ; P3 reste sans date ; peremption obligatoire */
    exec(`UPDATE t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID SET l.dt_PEREMPTION = '2028-10-01', l.int_NUM_LOT = '987586522'`
      + ` WHERE l.str_REF_LIVRAISON = '${REF_BL}' AND f.lg_FAMILLE_ID = '${P1.id}' ORDER BY l.lg_LOT_ID LIMIT 1;`
      + `UPDATE t_famille SET bool_CHECKEXPIRATIONDATE = 1 WHERE lg_FAMILLE_ID IN ('${P1.id}', '${P3.id}'); UPDATE t_famille SET bool_CHECKEXPIRATIONDATE = 0 WHERE lg_FAMILLE_ID = '${P2.id}';`
      + `UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '${CLE}';`);
    const lotsAvant = lotsBl();

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', x) >= 0; }, blId, { timeout: 60000 });
    await p.waitForTimeout(800);
    const i = await p.evaluate((x) => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().findExact('lg_BON_LIVRAISON_ID', x), blId);
    await p.locator('.x-grid-row').filter({ visible: true }).nth(i).locator('img[data-qtip="Detail livraison"]').click();
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const repondre = async (motif, bouton) => {
      await p.waitForFunction((x) => Ext.Msg.isVisible() && new RegExp(x).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await p.evaluate((x) => { Ext.Msg.down('button[itemId=' + x + ']').btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(300);
    };
    await p.locator('#btn_enterstock').click();
    await repondre('UNITÉS GRATUITES', 'yes');
    const repV = p.waitForResponse((r) => r.url().includes('commande/validerbl/'), { timeout: 120000 });
    await repondre("Confirmer l'entrée en stock", 'yes');
    const rv = await (await repV).json();
    await p.waitForFunction(() => Ext.Msg.isVisible() && /p[ée]remption/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 });
    const msg = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText);
    const n3 = P3.cip + ' ' + P3.nom;
    ok('Refus : le message commence comme avant', /^Certaines dates de péremptions ne sont pas renseignées/.test(msg), msg);
    ok('Refus : le message nomme le produit qui bloque (P3 : CIP et libellé, « 1 lot sans date sur 1 »)', msg.includes(n3 + ' (1 lot sans date sur 1)'), msg);
    ok('Refus : ni P1 (date saisie) ni P2 (non suivi) ne sont cités', !msg.includes(P1.cip) && !msg.includes(P2.cip), msg);
    ok('Réponse du serveur : code PEREMPTION_MANQUANTE et liste « produits » = le message',
      rv.success === false && rv.code === 'PEREMPTION_MANQUANTE' && Array.isArray(rv.produits) && rv.produits.length === 1 && rv.produits[0] === n3 + ' (1 lot sans date sur 1)',
      JSON.stringify(rv));
    await fermerMsg();

    /* 4. bilan : le refus n'a rien ecrit */
    ok('Bilan : le BL reste ouvert', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${blId}'`) === 'enable');
    ok('Bilan : stock des trois produits inchangé', stock() === stockAvant, stock() + ' / ' + stockAvant);
    ok('Bilan : lots inchangés', lotsBl() === lotsAvant, lotsBl() + ' / ' + lotsAvant);
    ok('Bilan : aucun mouvement', mouvements() === '0', mouvements());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, paramètre et suivi des produits remis', (!orderId || q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${orderId}'`) === '0')
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_etiquette WHERE lg_FAMILLE_ID IN (${IDS}) AND dt_CREATED >= '${DEBUT}'`) === '0'
      && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE}'`) === PARAM
      && PRODUITS.every((x) => q(`SELECT IFNULL(bool_CHECKEXPIRATIONDATE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`) === x.suivi)
      && stock() === stockAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
