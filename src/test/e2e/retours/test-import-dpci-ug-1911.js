/* PLAN DU 19/11, POINT 2 : IMPORT D'UN BL AU MODELE DPCI AVEC DES LIGNES D'UNITES GRATUITES.
 *
 * Constat (fichier de Pontmain, export_facture_20261118) : une ligne dont le prix d'achat et le prix de vente valent 0
 * est une ligne d'UG. L'import l'ajoutait a la quantite payee, et le montant de la ligne de commande tombait a 0 quand
 * la ligne d'UG venait en dernier (NEULORA 22 + 39, NEUTROCOLD 63 + 69). Les UG n'arrivaient pas dans la colonne UG
 * de la gestion des entrees.
 *
 * Attendu :
 *  - commande : quantite = somme des lignes payees ; ug = somme des lignes d'UG ; montant = somme quantite x PA ;
 *    PA = celui des lignes payees (jamais 0) ; lot : payees + gratuites ;
 *  - BL (base et ecran « Detail livraison ») : quantite commandee = payees, UG = gratuites, recu = payees + UG ;
 *    lot = payees + UG dont gratuites UG ;
 *  - entree en stock (test de bilan) : stock + (payees + UG), UG du stock + UG, un mouvement d'entree par produit de
 *    payees + UG, BL clos, PAF de la fiche = PA de la ligne payee.
 *
 * Jeu d'essai (4 produits, PA et prix differents) :
 *   P1 payee 4, UG 2, payee 6 (LITACOLD : UG au milieu)   -> 10 payees, 2 UG
 *   P2 payee 3, UG 1 (NEULORA : UG en dernier)            -> 3 payees, 1 UG
 *   P3 UG 2, payee 5 (UG en premier)                      -> 5 payees, 2 UG
 *   P4 payee 2 (temoin sans UG)                           -> 2 payees, 0 UG
 * Parcours par les ecrans : « IMPORTER UNE COMMANDE » (modele DPCI), « Créer le bon de livraisson », « Detail
 * livraison », « ENTREE EN STOCK », Oui, Oui. Peremption non obligatoire pendant le test (parametre remis).
 * Donnees retirees a la fin (commande, BL, lots, mouvements, stock remis).
 * Lancement seul : node src/test/e2e/retours/test-import-dpci-ug-1911.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const REF_BL = 'E2EUG' + String(Date.now()).slice(-6);
const CLE = 'KEY_ACTIVATE_PEREMPTION_DATE';
const PARAM = q(`SELECT IFNULL(MAX(str_VALUE), '<absent>') FROM t_parameters WHERE str_KEY = '${CLE}'`);
const DPCI = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'DPCI' AND str_STATUT = 'enable' LIMIT 1");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const PRODUITS = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, f.int_PAF, f.int_PRICE, IFNULL(f.dbl_PRIX_MOYEN_PONDERE, 'NULL'), IFNULL(f.int_PAT, 'NULL'), IFNULL(f.int_TAUX_MARQUE, 'NULL'), IFNULL(f.dt_DATE_LAST_ENTREE, 'NULL')) FROM t_famille f"
  + " JOIN t_famille_grossiste g ON g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND f.int_PAF > 0 AND f.int_PRICE > 0 AND f.lg_ZONE_GEO_ID IS NOT NULL"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " AND (SELECT COUNT(*) FROM t_famille y WHERE y.int_CIP = f.int_CIP) = 1 AND LENGTH(f.int_CIP) = 7 AND f.str_NAME NOT LIKE '%;%'"
  + " GROUP BY f.lg_FAMILLE_ID HAVING COUNT(*) = 1 ORDER BY f.lg_FAMILLE_ID LIMIT 4").split('\n').filter(Boolean)
  .map((l) => { const [id, cip, nom, paf, prix, pmp, pat, taux, der] = l.split('|'); return { id, cip, nom, paf: Number(paf), prix: Number(prix), pmp, pat, taux, der }; });
const [P1, P2, P3, P4] = PRODUITS;
const IDS = PRODUITS.map((p) => "'" + p.id + "'").join(',');
const GRP = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_GROSSISTE_ID, IFNULL(int_PAF, 'NULL'), IFNULL(int_PRICE, 'NULL')) SEPARATOR ';'), '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID IN (${IDS})`);
let orderId = null;

/* PA de la ligne payee : differents de la fiche et d'un produit a l'autre ; ligne d'UG : PA = PV = 0 */
const pa = (p, k) => p.paf + 7 * (k + 1);
const LIGNES = PRODUITS.length < 4 ? [] : [
  [P1, 4, pa(P1, 0), P1.prix], [P2, 3, pa(P2, 1), P2.prix], [P1, 2, 0, 0], [P3, 2, 0, 0], [P4, 2, pa(P4, 3), P4.prix],
  [P1, 6, pa(P1, 0), P1.prix], [P2, 1, 0, 0], [P3, 5, pa(P3, 2), P3.prix]];
const FICHIER = path.join(os.tmpdir(), 'e2e-import-ug-' + REF_BL + '.csv');
fs.writeFileSync(FICHIER, LIGNES.map(([p, n, a, v], i) => [10 + i, p.nom, p.cip, a.toFixed(1), v.toFixed(1), '0.0', n, 0, REF_BL].join(';')).join('\n') + '\n');
const att = {};
PRODUITS.forEach((p) => { att[p.cip] = { payees: 0, ug: 0, montant: 0, pa: null }; });
LIGNES.forEach(([p, n, a, v]) => {
  const x = att[p.cip];
  if (a === 0 && v === 0) { x.ug += n; } else { x.payees += n; x.montant += n * a; if (x.pa === null) { x.pa = a; } }
});

const stock = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', int_NUMBER_AVAILABLE, '/', IFNULL(int_UG, 0)) ORDER BY lg_FAMILLE_ID), '') FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${IDS})`);
const stockDe = (s, id) => { const m = s.split(',').find((x) => x.startsWith(id + '=')); const [n, u] = m.split('=')[1].split('/'); return { n: Number(n), ug: Number(u) }; };

function retirer(stockAvant) {
  if (orderId) {
    const bls = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_ID, "'")), "''") FROM t_bon_livraison WHERE lg_ORDER_ID = '${orderId}'`);
    const details = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_DETAIL, "'")), "''") FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${bls})`);
    exec(`DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}'; DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF_BL}';`
      + `DELETE FROM HMvtProduit WHERE lg_FAMILLE_ID IN (${IDS}) AND createdAt >= '${DEBUT}' AND pkey IN (${details});`
      + `DELETE FROM MvtTransaction WHERE pkey IN (${bls});`
      + `DELETE FROM notification WHERE created_at >= '${DEBUT}' AND (message LIKE '%${REF_BL}%' OR donnees LIKE '%${REF_BL}%' OR entity_ref IN (${bls}) OR (type_notification = 'ENTREE_EN_STOCK_UG' OR message LIKE '%UG%') AND donnees LIKE '%${P1 ? P1.cip : '-'}%');`
      + `DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND str_DESCRIPTION LIKE '%${REF_BL}%';`
      + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${bls}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${bls});`
      + `DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${orderId}';`
      + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${orderId}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${orderId}';`);
  }
  if (PRODUITS.length === 4) {
    exec(`DELETE FROM t_etiquette WHERE lg_FAMILLE_ID IN (${IDS}) AND dt_CREATED >= '${DEBUT}';`
      + PRODUITS.map((p) => `UPDATE t_famille SET int_PAF = ${p.paf}, int_PRICE = ${p.prix}, dbl_PRIX_MOYEN_PONDERE = ${p.pmp}, int_PAT = ${p.pat}, int_TAUX_MARQUE = ${p.taux}, dt_DATE_LAST_ENTREE = ${p.der === 'NULL' ? 'NULL' : "'" + p.der + "'"} WHERE lg_FAMILLE_ID = '${p.id}';`).join('')
      + GRP.split(';').filter(Boolean).map((g) => { const [id, a, v] = g.split('|'); return `UPDATE t_famille_grossiste SET int_PAF = ${a}, int_PRICE = ${v} WHERE lg_FAMILLE_GROSSISTE_ID = '${id}';`; }).join(''));
    if (stockAvant) {
      exec(stockAvant.split(',').map((x) => { const [id, v] = x.split('='); const [n, u] = v.split('/'); return `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${n}, int_NUMBER = ${n}, int_UG = ${u} WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '${id}';`; }).join(''));
    }
  }
  if (PARAM !== '<absent>') { exec(`UPDATE t_parameters SET str_VALUE = '${PARAM}' WHERE str_KEY = '${CLE}'`); }
  try { fs.unlinkSync(FICHIER); } catch (e) { /* deja retire */ }
}

(async () => {
  ok('Précondition : grossiste DPCI, quatre produits, paramètre de péremption présent', !!DPCI && PRODUITS.length === 4 && PARAM !== '<absent>',
    DPCI + ' ' + PRODUITS.map((p) => p.cip).join(',') + ' ' + PARAM);
  const stockAvant = stock();
  exec(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${CLE}'`);
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

    /* commande (rapprochement fichier = commande) */
    const cmd = {};
    q(`SELECT CONCAT_WS('|', f.int_CIP, d.int_NUMBER, d.ug, d.int_PRICE, d.int_PAF_DETAIL, d.lots) FROM t_order_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_ORDER_ID = '${orderId}'`)
      .split('\n').filter(Boolean).forEach((l) => { const [cip, n, ug, mt, paf, lots] = l.split('|'); cmd[cip] = { n: Number(n), ug: Number(ug), mt: Number(mt), paf: Number(paf), lots: JSON.parse(lots || '[]') }; });
    const detail = PRODUITS.map((x) => x.cip + ' ' + JSON.stringify(cmd[x.cip]) + ' attendu ' + JSON.stringify(att[x.cip])).join(' ; ');
    ok('Commande : une ligne par produit', Object.keys(cmd).length === 4, detail);
    ok('Commande : quantité = somme des lignes payées (P1 10, P2 3, P3 5, P4 2)', PRODUITS.every((x) => cmd[x.cip] && cmd[x.cip].n === att[x.cip].payees), detail);
    ok('Commande : UG = somme des lignes d\'UG (P1 2, P2 1, P3 2, P4 0)', PRODUITS.every((x) => cmd[x.cip] && cmd[x.cip].ug === att[x.cip].ug), detail);
    ok('Commande : montant = Σ payées × PA, jamais 0 (P2 : UG en dernier)', PRODUITS.every((x) => cmd[x.cip] && cmd[x.cip].mt === att[x.cip].montant && cmd[x.cip].mt > 0), detail);
    ok('Commande : PA = celui de la ligne payée (P3 : UG en premier)', PRODUITS.every((x) => cmd[x.cip] && cmd[x.cip].paf === att[x.cip].pa), detail);
    ok('Commande : un lot par produit, payées + gratuites', PRODUITS.every((x) => cmd[x.cip] && cmd[x.cip].lots.length === 1
      && cmd[x.cip].lots[0].quantity === att[x.cip].payees && cmd[x.cip].lots[0].quantityGratuit === att[x.cip].ug), detail);

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
    const ht = PRODUITS.reduce((s, x) => s + att[x.cip].montant, 0);
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
    const bl = {};
    q(`SELECT CONCAT_WS('|', f.int_CIP, d.int_QTE_CMDE, IFNULL(d.int_QTE_UG, 'NULL'), d.int_QTE_RECUE, d.int_PAF, d.lg_BON_LIVRAISON_DETAIL) FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_BON_LIVRAISON_ID = '${blId}'`)
      .split('\n').filter(Boolean).forEach((x) => { const [cip, c, u, r, paf, id] = x.split('|'); bl[cip] = { cmde: Number(c), ug: Number(u), recu: Number(r), paf: Number(paf), id }; });
    const dBl = JSON.stringify(bl);
    ok('BL en base : quantité commandée = payées', PRODUITS.every((x) => bl[x.cip] && bl[x.cip].cmde === att[x.cip].payees), dBl);
    ok('BL en base : UG = gratuites du fichier (colonne UG de la gestion des entrées)', PRODUITS.every((x) => bl[x.cip] && bl[x.cip].ug === att[x.cip].ug), dBl);
    ok('BL en base : reçu = payées + UG', PRODUITS.every((x) => bl[x.cip] && bl[x.cip].recu === att[x.cip].payees + att[x.cip].ug), dBl);
    ok('BL en base : PA = PA de la ligne payée', PRODUITS.every((x) => bl[x.cip] && bl[x.cip].paf === att[x.cip].pa), dBl);
    const lots = {};
    q(`SELECT CONCAT_WS('|', f.int_CIP, l.int_NUMBER, IFNULL(l.int_NUMBER_GRATUIT, 0)) FROM t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID WHERE l.str_REF_LIVRAISON = '${REF_BL}'`)
      .split('\n').filter(Boolean).forEach((x) => { const [cip, n, g] = x.split('|'); (lots[cip] = lots[cip] || []).push({ n: Number(n), g: Number(g) }); });
    ok('Lots du BL : un lot par produit, payées + UG dont UG gratuites', PRODUITS.every((x) => lots[x.cip] && lots[x.cip].length === 1
      && lots[x.cip][0].n === att[x.cip].payees + att[x.cip].ug && lots[x.cip][0].g === att[x.cip].ug), JSON.stringify(lots));

    /* 3. ecran « Detail livraison » : colonne UG et quantite = base */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', x) >= 0; }, blId, { timeout: 60000 });
    await p.waitForTimeout(800);
    const i = await p.evaluate((x) => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().findExact('lg_BON_LIVRAISON_ID', x), blId);
    await p.locator('.x-grid-row').filter({ visible: true }).nth(i).locator('img[data-qtip="Detail livraison"]').click();
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const ecran = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('grid').filter((x) => x.isVisible() && x.getStore().getCount() && x.getStore().getAt(0).get('lg_FAMILLE_PRIX_ACHAT') !== undefined)[0];
      const o = {};
      g.getStore().each((r) => { o[r.get('lg_BON_LIVRAISON_DETAIL')] = { ug: Number(r.get('lg_FAMILLE_PRIX_ACHAT')), free: Number(r.get('freeQty')) }; });
      const col = g.columns.filter((c) => c.dataIndex === 'lg_FAMILLE_PRIX_ACHAT')[0];
      return { o, entete: col ? col.text : null };
    });
    ok('Écran : la colonne s\'intitule « UG »', ecran.entete === 'UG', ecran.entete);
    ok('Rapprochement écran = base : UG de chaque ligne', PRODUITS.every((x) => ecran.o[bl[x.cip].id] && ecran.o[bl[x.cip].id].ug === att[x.cip].ug && ecran.o[bl[x.cip].id].free === att[x.cip].ug),
      JSON.stringify(ecran.o));

    /* 4. entree en stock par l'ecran */
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
    ok('Entrée en stock acceptée', rv.success === true, JSON.stringify(rv).slice(0, 300));
    await p.waitForTimeout(2000);

    /* 5. bilan avant / apres */
    const apres = stock();
    const bilan = PRODUITS.map((x) => {
      const a = stockDe(stockAvant, x.id), z = stockDe(apres, x.id), t = att[x.cip];
      return { cip: x.cip, avant: a.n, apres: z.n, attendu: a.n + t.payees + t.ug, ugAvant: a.ug, ugApres: z.ug, ugAttendu: a.ug + t.ug };
    });
    ok('Bilan : stock = avant + (payées + UG) pour chaque produit', bilan.every((x) => x.apres === x.attendu), JSON.stringify(bilan));
    ok('Bilan : UG du stock = avant + UG', bilan.every((x) => x.ugApres === x.ugAttendu), JSON.stringify(bilan));
    const mvts = {};
    q(`SELECT CONCAT_WS('|', f.int_CIP, h.qteMvt) FROM HMvtProduit h JOIN t_famille f ON f.lg_FAMILLE_ID = h.lg_FAMILLE_ID WHERE h.lg_FAMILLE_ID IN (${IDS}) AND h.createdAt >= '${DEBUT}'`)
      .split('\n').filter(Boolean).forEach((x) => { const [cip, n] = x.split('|'); (mvts[cip] = mvts[cip] || []).push(Number(n)); });
    ok('Bilan : un seul mouvement par produit, de payées + UG', PRODUITS.every((x) => mvts[x.cip] && mvts[x.cip].length === 1 && mvts[x.cip][0] === att[x.cip].payees + att[x.cip].ug), JSON.stringify(mvts));
    ok('Bilan : BL clos', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${blId}'`) === 'is_Closed');
    const pafFiche = q(`SELECT GROUP_CONCAT(CONCAT(int_CIP, '=', int_PAF) ORDER BY int_CIP) FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})`);
    ok('Bilan : PAF de la fiche = PA de la ligne payée (jamais 0)', PRODUITS.every((x) => pafFiche.includes(x.cip + '=' + att[x.cip].pa)), pafFiche);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer(stockAvant);
    ok('Données d\'essai retirées, stock, fiches et paramètre remis', (!orderId || q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${orderId}'`) === '0')
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}'`) === '0'
      && q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID IN (${IDS}) AND createdAt >= '${DEBUT}'`) === '0'
      && q(`SELECT COUNT(*) FROM notification WHERE created_at >= '${DEBUT}' AND (message LIKE '%${REF_BL}%' OR donnees LIKE '%${REF_BL}%')`) === '0'
      && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE}'`) === PARAM
      && stock() === stockAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
