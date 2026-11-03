/* Audit 06 RF-05, par l'ecran « Retours fournisseurs » (clics de l'utilisateur) : la validation d'un retour fait sur
 * le web (aucun lot indique sur la ligne) sort aussi les boites des lots : d'abord les lots recus avec ce BL, puis,
 * pour le reste, selon la regle de la vente (peremption la plus proche d'abord).
 * Donnees : un BL (prefixe E2E-RL-) de 6 boites ; lots E2ERL1 (3, recu avec ce BL) et E2ERL2 (10, autre BL).
 * Retour de 4 valide : E2ERL1 3 -> 0, E2ERL2 10 -> 9, stock - 4. Base de test seulement ; tout est remis a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-retour-lots.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-RL-';
const REF = 'E2ERL' + String(Date.now()).slice(-5);
const RECU = 6;
const debut = q('SELECT NOW()');
const [P, CIP, G1] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.lg_GROSSISTE_ID) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PAF > 0 AND f.int_PRICE > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND LENGTH(f.int_CIP) >= 6"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 13").split('|');
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const STOCK0 = q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`));
const lots = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(int_NUM_LOT, ':', current_stock) ORDER BY int_NUM_LOT SEPARATOR ' '), '') FROM t_lot WHERE lg_LOT_ID LIKE '${M}%'`);
const BL = M + 'BL';
const retours = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE lg_BON_LIVRAISON_ID = '${BL}'`);

function retirer() {
  const rets = retours();
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${rets})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${rets}); DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${rets});`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order WHERE lg_ORDER_ID = '${M}O';`
    + `DELETE FROM t_lot WHERE lg_LOT_ID LIKE '${M}%';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_TYPE_LOG = '${CIP}';`
    + `DELETE FROM notification WHERE created_at >= '${debut}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`);
}
/* BL entre en stock (is_Closed), une ligne du produit ; lot recu avec ce BL et lot d'un autre BL */
function poser() {
  const [paf, prix, zone] = q(`SELECT CONCAT_WS('|', int_PAF, int_PRICE, IFNULL(lg_ZONE_GEO_ID, '')) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`).split('|');
  const o = M + 'O', quand = 'NOW() - INTERVAL 5 HOUR';
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${o}', '${o}', 1, '${G1}', '${ADMIN}', 'is_Closed', ${quand}, ${quand}, 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` VALUES ('${BL}', '${REF}', ${quand}, ${RECU * paf}, 0, ${RECU * paf}, '${o}', 'is_Closed', ${quand}, ${quand}, '${ADMIN}');`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT)`
    + ` VALUES ('${BL}-D', '${G1}', '${P}', '${BL}', ${RECU}, 0, ${RECU}, ${prix}, ${prix}, ${paf}, ${paf}, ${zone ? `'${zone}'` : 'NULL'}, 'is_Closed', ${quand}, ${quand}, 0);`
    + `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_STATUT, dt_CREATED, dt_UPDATED, dt_PEREMPTION, int_QTY_VENDUE, current_stock, str_REF_LIVRAISON, lg_GROSSISTE_ID) VALUES`
    + ` ('${M}L1', '${ADMIN}', '${P}', 'E2ERL1', 3, 0, 'enable', ${quand}, ${quand}, CURDATE() + INTERVAL 1 YEAR, 0, 3, '${REF}', '${G1}'),`
    + ` ('${M}L2', '${ADMIN}', '${P}', 'E2ERL2', 10, 0, 'enable', NOW() - INTERVAL 1 YEAR, NOW() - INTERVAL 1 YEAR, CURDATE() + INTERVAL 60 DAY, 0, 10, 'E2ERL-AUTRE', '${G1}');`);
}

(async () => {
  retirer();
  ok('Précondition : un produit en stock sans lot', !!P && !!G1 && STOCK0[0] >= 10, P + ' ' + CIP + ' stock ' + STOCK0[0]);
  try { poser(); } catch (e) { retirer(); throw e; }
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }
    const fleche = async (id) => {
      const t = await p.evaluate((x) => Ext.getCmp(x).getEl().down('.x-form-trigger').id, id);
      await p.locator('#' + t).click();
    };

    /* nouveau retour sur le BL */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('retourfrsmanager', 'Retours fournisseurs', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await p.getByText('NOUVEAU RETOUR', { exact: true }).first().click();
    await p.waitForFunction(() => Ext.getCmp('lg_BON_LIVRAISON_ID') && Ext.getCmp('lg_BON_LIVRAISON_ID').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.locator('#lg_BON_LIVRAISON_ID-inputEl').click();
    await p.keyboard.type(REF, { delay: 40 });
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: REF }).first().click({ timeout: 30000 });

    /* article, motif, 4, Entree */
    await p.waitForFunction(() => !Ext.getCmp('str_NAME').isDisabled(), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.locator('#str_NAME-inputEl').click();
    await p.keyboard.type(CIP, { delay: 40 });
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: CIP }).first().click({ timeout: 15000 });
    await fleche('lg_MOTIF_RETOUR');
    await p.locator('.x-boundlist-item').filter({ visible: true }).first().click();
    await p.locator('#int_QUANTITE-inputEl').fill('4');
    const rep = p.waitForResponse((r) => /retourfournisseur\/(new|add-item)/.test(r.url()), { timeout: 30000 });
    await p.locator('#int_QUANTITE-inputEl').press('Enter');
    const r1 = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(800);
    if (await p.evaluate(() => Ext.Msg.isVisible())) { await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } }); }
    ok('Retour de 4 créé, sans lot sur la ligne', r1.success === true
      && q(`SELECT COUNT(*) FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${retours()}) AND lg_LOT_ID IS NULL AND int_NUMBER_RETURN = 4`) === '1',
    JSON.stringify(r1).slice(0, 200));

    /* « Valider le retour », confirme dans le bouton */
    await p.locator('#btn_save').click();
    await p.waitForTimeout(400);
    const rep2 = p.waitForResponse((r) => r.url().includes('validerretourfour'), { timeout: 60000 });
    await p.locator('#btn_save').click();
    const r2 = await (await rep2).json().catch(() => ({}));
    await p.waitForTimeout(1500);
    ok('Retour validé', r2.success === true, JSON.stringify(r2).slice(0, 200));
    ok('Stock : 4 boîtes sorties', stock() === Number(STOCK0[0]) - 4, stock() + ' / ' + STOCK0[0]);
    ok('RF-05 : les lots perdent les 4 boîtes, d\'abord le lot reçu avec ce BL (E2ERL1 3 → 0), puis le suivant (E2ERL2 10 → 9)',
      lots() === 'E2ERL1:0 E2ERL2:9', lots());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, stock remis', lots() === '' && String(stock()) === STOCK0[0] && retours() === "''", stock() + ' / ' + STOCK0[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
