/* Signalement du 02/11 (bl_import.md) : « BL importé : un même produit sur deux lignes, entrée en stock refusée ».
 * Question : un fichier de facture du grossiste qui porte deux fois le meme produit donne-t-il deux lignes dans la
 * commande, puis dans le BL ?
 * Parcours de l'utilisateur, par les ecrans : « Commandes », « IMPORTER UNE COMMANDE », fichier du grossiste
 * (FACTURE-YOP-157519.csv, modele LABOREX/UBIPHARM, grossiste LABOREX-CI YOP), « Importer » ; puis icone « Créer le bon
 * de livraisson » de la commande importee, reference, montant, « Enregistrer ». Lecture en base des lignes de la
 * commande et du BL. Commande, BL et lots retires a la fin (le compteur des references de commande avance d'un cran,
 * comme pour un vrai import).
 * Lancement seul : FICHIER=<chemin du csv> node src/test/e2e/audits/test-ecran-import-bl-meme-produit.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const FICHIER = process.env.FICHIER;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const REF_BL = 'E2EIMP' + String(Date.now()).slice(-6);
const GROSSISTE = 'LABOREX-CI YOP';
let orderId = null;

function retirer() {
  if (!orderId) { return; }
  const bls = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_ID, "'")), "''") FROM t_bon_livraison WHERE lg_ORDER_ID = '${orderId}'`);
  exec(`DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}'; DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF_BL}';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${bls}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${bls});`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${orderId}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${orderId}';`);
}

(async () => {
  ok('Précondition : fichier fourni', !!FICHIER, FICHIER);
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
        const vu = await p.evaluate(() => Ext.Msg.isVisible());
        if (!vu) { return; }
        await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
        await p.waitForTimeout(500);
      }
    };

    /* import du fichier */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commandes', ''));
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await p.getByText('IMPORTER UNE COMMANDE', { exact: true }).first().click();
    await p.waitForFunction(() => Ext.getCmp('xlsxdialog') && Ext.getCmp('xlsxdialog').isVisible(true), null, { timeout: 20000 });
    await p.locator('#xlsxdialog input[type=file]').setInputFiles(FICHIER);
    /* fleche des listes (le champ seul n'ouvre pas la liste) */
    const fleche = async (nom) => {
      const id = await p.evaluate((n) => Ext.getCmp('formImport').down('[name=' + n + ']').getEl().down('.x-form-trigger').id, nom);
      await p.locator('#' + id).click();
    };
    await fleche('modeBL');
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: 'UBIPHARM' }).first().click();
    await fleche('lg_GROSSISTE_ID');
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: GROSSISTE }).first().click();
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

    const lignesCmd = q(`SELECT CONCAT_WS(' x', f.int_CIP, d.int_NUMBER) FROM t_order_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID`
      + ` WHERE d.lg_ORDER_ID = '${orderId}' ORDER BY f.int_CIP`).split(/\r?\n/).filter(Boolean);
    const doublonCmd = q(`SELECT COUNT(*) FROM (SELECT lg_FAMILLE_ID FROM t_order_detail WHERE lg_ORDER_ID = '${orderId}' GROUP BY lg_FAMILLE_ID HAVING COUNT(*) > 1) x`);
    ok('Commande importée : un produit présent deux fois dans le fichier n\'a qu\'une ligne (quantités additionnées)', doublonCmd === '0', lignesCmd.join(' ; '));

    /* creation du BL depuis la commande */
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
    await saisir('str_REF_LIVRAISON', REF_BL);
    await saisir('dt_DATE_LIVRAISON', String(j.getDate()).padStart(2, '0') + '/' + String(j.getMonth() + 1).padStart(2, '0') + '/' + j.getFullYear());
    await saisir('int_MHT', '43822');
    await saisir('int_TVA', '0');
    const repBl = p.waitForResponse((r) => r.url().includes('commande/creerbl'), { timeout: 60000 });
    await p.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).click();
    if (await p.waitForFunction(() => Ext.Msg.isVisible() && /diff[ée]rent/.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 4000 }).then(() => true, () => false)) {
      await p.evaluate(() => Ext.Msg.down('button[itemId=yes]').btnEl.dom.click());
    }
    const rb = await (await repBl.catch(async (e) => {
      const ecran = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).map((w) => w.title + ' : ' + w.getEl().dom.innerText.replace(/\s+/g, ' ').slice(0, 200)).join(' | '));
      throw new Error('pas de creerbl ; fenetres : ' + ecran);
    })).json();
    ok('BL créé depuis la commande importée', rb && rb.success !== false, JSON.stringify(rb).slice(0, 200));
    const lignesBl = q(`SELECT CONCAT_WS(' x', f.int_CIP, d.int_QTE_CMDE) FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID`
      + ` JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE b.lg_ORDER_ID = '${orderId}' ORDER BY f.int_CIP`).split(/\r?\n/).filter(Boolean);
    const doublonBl = q(`SELECT COUNT(*) FROM (SELECT d.lg_FAMILLE_ID FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID`
      + ` WHERE b.lg_ORDER_ID = '${orderId}' GROUP BY d.lg_FAMILLE_ID HAVING COUNT(*) > 1) x`);
    ok('BL : un seul ligne par produit (le cas « même produit sur deux lignes » ne se produit pas par cet import)', doublonBl === '0' && lignesBl.length > 0, lignesBl.join(' ; '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Commande et BL d\'essai retirés', !orderId || q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${orderId}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
