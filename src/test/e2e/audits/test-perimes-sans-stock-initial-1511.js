/* Exploitation du 14/11, S4 : ecran « Saisie des périmés » vide pour tout le monde.
 * Chez appaul, 99 lignes en cours (saisies en 2022, avant la colonne stock_initial) n'ont ni stock initial ni stock
 * final : la lecture de la saisie en cours echouait sur la premiere (NumberFormatException "null") et rendait une liste
 * vide, 9 fois du 13/11 22:21 au 14/11 12:24.
 *
 * Parcours (clics de l'utilisateur) : Saisie des périmés > une saisie a l'ecran > « Terminer ».
 * Jeu d'essai : produit au stock fixe a 10 ; deux lignes anciennes sans stock initial (lots E2ESI1 : 1, E2ESI2 : 2),
 * une ligne ancienne complete (E2ESI3 : 1, stock initial 10) ; puis 3 du lot E2ESI4 saisis a l'ecran.
 * Controles :
 *  - rapprochement ecran / base, ligne par ligne : lot, quantite, stock initial (vide si absent en base) ;
 *  - bilan de la cloture : stock 10 - (1 + 2 + 1 + 3) = 3, les 4 lignes retirees (plus en attente), aucune autre
 *    ligne touchee, un mouvement de stock par ligne.
 * Les saisies en cours deja presentes sont mises de cote puis rendues ; tout est retire a la fin.
 * Lancement seul : node src/test/e2e/audits/test-perimes-sans-stock-initial-1511.js
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
const M = 'E2E-SI-';
const PARK = 'e2e-si-attente';
const debut = q('SELECT NOW()');
const [P, CIP, NOM] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND LENGTH(f.str_NAME) >= 6"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0)"
  + " AND NOT EXISTS (SELECT 1 FROM t_warehouse w WHERE w.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND w.str_STATUT = 'pending')"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 17").split('|');
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const STOCK0 = q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`));
const ids = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_WAREHOUSE_ID, "'")), "''") FROM t_warehouse WHERE lg_FAMILLE_ID = '${P}' AND int_NUM_LOT LIKE 'E2ESI%'`);
/* base : lot:quantite:stock initial (vide si NULL), triees par lot */
const baseLignes = (statut) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(int_NUM_LOT, ':', int_NUMBER, ':', IFNULL(stock_initial, '')) ORDER BY int_NUM_LOT SEPARATOR ' '), '')`
  + ` FROM t_warehouse WHERE lg_FAMILLE_ID = '${P}' AND int_NUM_LOT LIKE 'E2ESI%'${statut ? ` AND str_STATUT = '${statut}'` : ''}`);
const PARQUES = Number(q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'pending'`));

function retirer() {
  const l = ids();
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${l}); DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID IN (${l});`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_TYPE_LOG = '${CIP}';`
    + `DELETE FROM notification WHERE created_at >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_warehouse SET str_STATUT = 'pending' WHERE str_STATUT = '${PARK}';`);
}
function poser() {
  /* les saisies en attente deja presentes sont mises de cote : « Terminer » les retirerait du stock */
  exec(`UPDATE t_warehouse SET str_STATUT = '${PARK}' WHERE str_STATUT = 'pending';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 10, int_NUMBER = 10 WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    /* deux lignes de 2022 sans stock initial ni final (comme chez appaul), une ligne complete */
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final) VALUES`
    + ` ('${M}W1', '${ADMIN}', '${P}', 'E2ESI1', 1, '2022-07-13 16:02:29', '2022-07-13 16:02:29', '2022-06-30', 'pending', NULL, NULL),`
    + ` ('${M}W2', '${ADMIN}', '${P}', 'E2ESI2', 2, '2022-07-14 09:10:00', '2022-07-14 09:10:00', '2022-07-31', 'pending', NULL, NULL),`
    + ` ('${M}W3', '${ADMIN}', '${P}', 'E2ESI3', 1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, CURDATE() - INTERVAL 5 DAY, 'pending', 10, 9);`);
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

    /* ecran : lot:quantite:stock initial, triees par lot */
    const grille = () => p.evaluate(() => Ext.getCmp('gridpanelArticlePerimes').getStore().getRange()
      .map((r) => r.get('lot') + ':' + r.get('quantity') + ':' + (r.get('stockInitial') === null || r.get('stockInitial') === undefined || r.get('stockInitial') === '' ? '' : r.get('stockInitial')))
      .filter((s) => /^E2ESI/.test(s)).sort().join(' '));
    const charge = () => p.waitForFunction(() => Ext.getCmp('gridpanelArticlePerimes') && Ext.getCmp('gridpanelArticlePerimes').isVisible(true) && !Ext.getCmp('gridpanelArticlePerimes').getStore().isLoading(), null, { timeout: 30000 });
    const fermerMsg = async () => {
      const t = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.innerText : ''));
      if (t) { await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } }); await p.waitForTimeout(400); }
      return t;
    };
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

    const premiere = p.waitForResponse((r) => r.url().includes('gestionperime/saisie-encours'), { timeout: 30000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('addPerimer', 'Saisie des périmés', ''));
    const rep0 = await (await premiere).json().catch(() => ({}));
    await charge();
    await p.waitForTimeout(800);
    const g0 = await grille();
    const b0 = baseLignes('pending');
    ok('À l\'ouverture, le serveur rend les 3 lignes en cours (dont 2 sans stock initial)', rep0.total === 3 && Array.isArray(rep0.data) && rep0.data.length === 3,
      'total ' + rep0.total + ', lignes ' + (rep0.data || []).length);
    ok('Rapprochement écran / base, ligne par ligne (lot, quantité, stock initial vide si absent)', g0 === b0 && g0 === 'E2ESI1:1: E2ESI2:2: E2ESI3:1:10', 'écran « ' + g0 + ' » ; base « ' + b0 + ' »');

    const r1 = await saisir('E2ESI4', 3);
    const g1 = await grille();
    const b1 = baseLignes('pending');
    ok('Une saisie à l\'écran (3 du lot E2ESI4) est acceptée et s\'ajoute aux lignes anciennes', r1.success && g1 === b1 && g1 === 'E2ESI1:1: E2ESI2:2: E2ESI3:1:10 E2ESI4:3:10',
      JSON.stringify(r1).slice(0, 120) + ' ; écran « ' + g1 + ' » ; base « ' + b1 + ' »');

    const mvt0 = Number(q(`SELECT COUNT(*) FROM HMvtProduit WHERE pkey IN (${ids()})`));
    await p.locator('#btn_create_perime').click(); await p.waitForTimeout(600); /* lot 11 : confirmation dans le bouton */ await p.locator('#btn_create_perime').click();
    await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 60000 });
    const msg = await fermerMsg();
    await charge();
    const s1 = stock();
    ok('Bilan : après « Terminer », stock = 10 - (1 + 2 + 1 + 3) = 3', s1 === 3, 'stock ' + s1 + ' ; ' + msg.replace(/\s+/g, ' '));
    ok('Bilan : plus aucune des 4 lignes en attente', baseLignes('pending') === '', baseLignes('pending'));
    const mvt = Number(q(`SELECT COUNT(*) FROM HMvtProduit WHERE pkey IN (${ids()})`));
    ok('Bilan : un mouvement de stock par ligne retirée (4), aucun avant', mvt0 === 0 && mvt === 4, mvt0 + ' → ' + mvt);
    ok('Bilan : les saisies en cours des autres produits ne sont pas touchées', Number(q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = '${PARK}'`)) === PARQUES,
      q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = '${PARK}'`) + ' / ' + PARQUES);
    ok('Après la clôture, la saisie en cours est vide à l\'écran', (await grille()) === '', await grille());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, stock remis', baseLignes() === '' && String(stock()) === STOCK0[0]
      && Number(q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'pending'`)) === PARQUES, stock() + ' / ' + STOCK0[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
