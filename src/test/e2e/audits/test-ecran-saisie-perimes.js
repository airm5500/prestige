/* Audit 06, saisie des perimes, par l'ecran « Saisie des périmés » (clics de l'utilisateur) :
 *  - PE-02 : une ligne saisie la veille et non cloturee reste dans la saisie en cours et se cloture ;
 *  - PE-01 : le controle de quantite compte toutes les lignes du produit (tous lots) : on ne peut pas saisir plus que
 *    le stock, et la cloture ne rend pas le stock negatif ;
 *  - PE-03 : la cloture diminue le reste des lots saisis ;
 *  - PE-04 : une ligne saisie par un utilisateur du depot n'est pas retiree du stock de l'officine.
 * Donnees : produit au stock fixe a 10, lots E2EPE1 (5) et E2EPE2 (5), un depot et un utilisateur du depot temporaires
 * (base de test seulement). Tout est remis a l'identique a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-saisie-perimes.js
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
const M = 'E2E-PE-';
const PARK = 'e2e-pe-attente';
const debut = q('SELECT NOW()');
const [P, CIP, NOM] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND LENGTH(f.str_NAME) >= 6"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0)"
  + " AND NOT EXISTS (SELECT 1 FROM t_warehouse w WHERE w.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND w.str_STATUT = 'pending')"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 11").split('|');
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const STOCK0 = q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`));
const reste = (n) => q(`SELECT IFNULL(current_stock, 'NULL') FROM t_lot WHERE lg_LOT_ID = '${M}${n}'`);
const lignes = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(int_NUM_LOT, ':', int_NUMBER, ':', str_STATUT) ORDER BY int_NUM_LOT, str_STATUT SEPARATOR ' '), '') FROM t_warehouse WHERE lg_FAMILLE_ID = '${P}' AND int_NUM_LOT LIKE 'E2EPE%'`);

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_WAREHOUSE_ID, "'")), "''") FROM t_warehouse WHERE lg_FAMILLE_ID = '${P}' AND int_NUM_LOT LIKE 'E2EPE%'`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${ids}); DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID IN (${ids});`
    + `DELETE FROM t_lot WHERE lg_LOT_ID LIKE '${M}%';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_TYPE_LOG = '${CIP}';`
    + `DELETE FROM notification WHERE created_at >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    + `DELETE FROM t_user WHERE lg_USER_ID = '${M}U'; DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '${M}EMP';`
    + `UPDATE t_warehouse SET str_STATUT = 'pending' WHERE str_STATUT = '${PARK}';`);
}
function poser() {
  /* les saisies en attente deja presentes dans la base sont mises de cote : « Terminer » les retirerait du stock */
  exec(`UPDATE t_warehouse SET str_STATUT = '${PARK}' WHERE str_STATUT = 'pending';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 10, int_NUMBER = 10 WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    /* lots : E2EPE1 perime, E2EPE2 encore bon */
    + `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_STATUT, dt_CREATED, dt_UPDATED, dt_PEREMPTION, int_QTY_VENDUE, current_stock) VALUES`
    + ` ('${M}L1', '${ADMIN}', '${P}', 'E2EPE1', 5, 0, 'enable', NOW() - INTERVAL 1 YEAR, NOW(), CURDATE() - INTERVAL 10 DAY, 0, 5),`
    + ` ('${M}L2', '${ADMIN}', '${P}', 'E2EPE2', 5, 0, 'enable', NOW() - INTERVAL 1 YEAR, NOW(), CURDATE() + INTERVAL 1 YEAR, 0, 5);`
    /* PE-04 : un depot et un utilisateur de ce depot (copies de l'officine et de l'administrateur) */
    + `CREATE TEMPORARY TABLE e2e_pe_emp AS SELECT * FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '1';`
    + `UPDATE e2e_pe_emp SET lg_EMPLACEMENT_ID = '${M}EMP', str_NAME = 'E2E DEPOT';`
    + `INSERT INTO t_emplacement SELECT * FROM e2e_pe_emp;`
    + `CREATE TEMPORARY TABLE e2e_pe_u AS SELECT * FROM t_user WHERE lg_USER_ID = '${ADMIN}';`
    + `UPDATE e2e_pe_u SET lg_USER_ID = '${M}U', str_LOGIN = 'e2e-pe-depot', lg_EMPLACEMENT_ID = '${M}EMP';`
    + `INSERT INTO t_user SELECT * FROM e2e_pe_u;`
    /* PE-04 : 2 perimes saisis aujourd'hui par l'utilisateur du depot */
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final)`
    + ` VALUES ('${M}WD', '${M}U', '${P}', 'E2EPE9', 2, NOW(), NOW(), CURDATE() - INTERVAL 10 DAY, 'pending', 10, 8);`
    /* PE-02 : 1 perime du lot E2EPE1 saisi hier par l'administrateur, non cloture */
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final)`
    + ` VALUES ('${M}WH', '${ADMIN}', '${P}', 'E2EPE1', 1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, CURDATE() - INTERVAL 10 DAY, 'pending', 10, 9);`);
}

(async () => {
  retirer();
  ok('Précondition : un produit sans lot en stock ni saisie en cours', !!P && !!ADMIN, P + ' ' + CIP + ' ' + NOM);
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

    const grille = () => p.evaluate(() => Ext.getCmp('gridpanelArticlePerimes').getStore().getRange().map((r) => r.get('lot') + ':' + r.get('quantity')).sort().join(' '));
    const charge = () => p.waitForFunction(() => Ext.getCmp('gridpanelArticlePerimes') && Ext.getCmp('gridpanelArticlePerimes').isVisible(true) && !Ext.getCmp('gridpanelArticlePerimes').getStore().isLoading(), null, { timeout: 30000 });
    const fermerMsg = async () => {
      const t = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.innerText : ''));
      if (t) { await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } }); await p.waitForTimeout(400); }
      return t;
    };
    /* article, lot, quantite, date de peremption, Entree ; rend la reponse du serveur */
    const saisir = async (lot, qte) => {
      await p.locator('#cmb_Article-inputEl').click();
      await p.keyboard.type(NOM.slice(0, 6), { delay: 60 });
      await p.locator('.x-boundlist-item').filter({ visible: true, hasText: NOM.trim() }).first().click({ timeout: 20000 });
      await p.locator('#str_CODE_LOT-inputEl').fill(lot);
      await p.locator('#perimeQTY-inputEl').fill(String(qte));
      const j = new Date(Date.now() - 10 * 86400000);
      await p.locator('#str_DATEPERMTION-inputEl').fill(String(j.getDate()).padStart(2, '0') + '/' + String(j.getMonth() + 1).padStart(2, '0') + '/' + j.getFullYear());
      const rep = p.waitForResponse((r) => r.url().includes('gestionperime/add'), { timeout: 30000 });
      await p.locator('#str_DATEPERMTION-inputEl').press('Enter');
      const r = await (await rep).json().catch(() => ({}));
      await p.waitForTimeout(800);
      await fermerMsg();
      await charge();
      return r;
    };

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('addPerimer', 'Saisie des périmés', ''));
    await charge();
    await p.waitForTimeout(800);
    /* PE-02 */
    const g0 = await grille();
    ok('PE-02 : la ligne saisie hier (lot E2EPE1, 1) est dans la saisie en cours', /E2EPE1:1/.test(g0), g0);
    ok('PE-04 : la ligne saisie par l\'utilisateur du dépôt n\'est pas dans la saisie de l\'officine', !/E2EPE9/.test(g0), g0);

    /* PE-01 : stock 10 ; 1 (hier) + 4 + 4 = 9 ; encore 3 du lot E2EPE1 : 12 > 10, refus */
    const r1 = await saisir('E2EPE1', 4);
    const r2 = await saisir('E2EPE2', 4);
    ok('PE-01 : 4 du lot E2EPE1 puis 4 du lot E2EPE2 acceptés', r1.success && r2.success, JSON.stringify(r1) + ' ' + JSON.stringify(r2));
    const r3 = await saisir('E2EPE1', 3);
    ok('PE-01 : 3 de plus du lot E2EPE1 (total 12 pour 10 en stock) : refusé', r3.success === false, JSON.stringify(r3).slice(0, 200) + ' ; ' + lignes());

    /* cloture : bouton « Terminer » */
    await p.locator('#btn_create_perime').click();
    await p.waitForFunction(() => Ext.Msg.isVisible() && /retir/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 60000 });
    const msg = await fermerMsg();
    const s1 = stock();
    ok('PE-01 / PE-04 : après la clôture, le stock de l\'officine = 10 - 9 = 1 (jamais négatif, rien du dépôt)', s1 === 1, 'stock ' + s1 + ' ; ' + msg.replace(/\s+/g, ' '));
    ok('PE-03 : les lots saisis perdent les boîtes retirées (E2EPE1 5 → 0, E2EPE2 5 → 1)', reste('L1') === '0' && reste('L2') === '1', reste('L1') + '/' + reste('L2'));
    ok('PE-04 : la ligne du dépôt reste en attente', q(`SELECT str_STATUT FROM t_warehouse WHERE lg_WAREHOUSE_ID = '${M}WD'`) === 'pending', lignes());

    /* PE-01 a la cloture : une ligne de 3 alors qu'il ne reste qu'1 en stock (stock baisse entre la saisie et la cloture) */
    exec(`INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final)`
      + ` VALUES ('${M}WX', '${ADMIN}', '${P}', 'E2EPE2', 3, NOW(), NOW(), CURDATE() + INTERVAL 1 YEAR, 'pending', 1, 0);`);
    await p.evaluate(() => { Ext.getCmp('gridpanelArticlePerimes').getStore().load(); });
    await charge();
    await p.waitForTimeout(500);
    await p.locator('#btn_create_perime').click();
    await p.waitForFunction(() => Ext.Msg.isVisible() && /retir/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 60000 });
    const msg2 = await fermerMsg();
    ok('PE-01 : stock insuffisant à la clôture : la ligne n\'est pas retirée, l\'écran le dit (produit, lot, quantités)',
      stock() === 1 && q(`SELECT str_STATUT FROM t_warehouse WHERE lg_WAREHOUSE_ID = '${M}WX'`) === 'pending' && reste('L2') === '1'
      && /non retir/i.test(msg2) && msg2.includes(CIP) && /E2EPE2/.test(msg2) && /3 à retirer, 1 en stock/.test(msg2),
      'stock ' + stock() + ' ; ' + msg2.replace(/\s+/g, ' '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, stock remis', lignes() === '' && String(stock()) === STOCK0[0] && q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${M}U'`) === '0', stock() + ' / ' + STOCK0[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
