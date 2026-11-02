/* Audit 06 AJ-02, par l'ecran « Ajustement » (clics de l'utilisateur) : un ajustement negatif sort aussi des lots :
 * le lot choisi sur la ligne d'abord, puis la regle de la vente (peremption la plus proche d'abord parmi les lots
 * valables, puis les lots perimes).
 * Decision du 02/11 : le lot choisi sur la ligne est diminue en premier ; sans lot, ou pour le reste, la regle de la
 * vente.
 * Donnees : produit au stock fixe a 10 ; lots E2EAJ1 (2, deja perime), E2EAJ2 (3, perime dans 30 jours),
 * E2EAJ3 (5, dans un an). Lignes -4 avec le lot E2EAJ1 choisi et -1 sans lot : E2EAJ1 2 -> 0, puis 3 boites par la
 * regle de la vente : E2EAJ2 3 -> 0 ; E2EAJ3 inchange.
 * Base de test seulement ; tout est remis a l'identique a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-ajustement-lots.js
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
const M = 'E2E-AJ-';
const COMMENTAIRE = 'E2E-AJ-LOTS';
const debut = q('SELECT NOW()');
const [P, CIP, NOM] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND LENGTH(f.str_NAME) >= 6"
  + " AND f.int_CIP REGEXP '^[0-9]{7,13}$'"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND (SELECT COUNT(*) FROM t_famille y WHERE y.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 23").split('|');
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const STOCK0 = q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`));
const lots = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(int_NUM_LOT, ':', current_stock) ORDER BY int_NUM_LOT SEPARATOR ' '), '') FROM t_lot WHERE lg_LOT_ID LIKE '${M}%'`);

function retirer() {
  const aj = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_AJUSTEMENT_ID, "'")), "''") FROM t_ajustement WHERE str_COMMENTAIRE = '${COMMENTAIRE}'`
    + ` OR lg_AJUSTEMENT_ID IN (SELECT lg_AJUSTEMENT_ID FROM t_ajustement_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}')`);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_AJUSTEMENTDETAIL_ID, "'")), "''") FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (${aj})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det}); DELETE FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (${aj});`
    + `DELETE FROM t_ajustement WHERE lg_AJUSTEMENT_ID IN (${aj});`
    + `DELETE FROM t_lot WHERE lg_LOT_ID LIKE '${M}%';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_TYPE_LOG = '${CIP}';`
    + `DELETE FROM notification WHERE created_at >= '${debut}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`);
}
function poser() {
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 10, int_NUMBER = 10 WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    + `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_STATUT, dt_CREATED, dt_UPDATED, dt_PEREMPTION, int_QTY_VENDUE, current_stock) VALUES`
    + ` ('${M}L1', '${ADMIN}', '${P}', 'E2EAJ1', 2, 0, 'enable', NOW() - INTERVAL 1 YEAR, NOW(), CURDATE() - INTERVAL 10 DAY, 0, 2),`
    + ` ('${M}L2', '${ADMIN}', '${P}', 'E2EAJ2', 3, 0, 'enable', NOW() - INTERVAL 1 YEAR, NOW(), CURDATE() + INTERVAL 30 DAY, 0, 3),`
    + ` ('${M}L3', '${ADMIN}', '${P}', 'E2EAJ3', 5, 0, 'enable', NOW() - INTERVAL 1 YEAR, NOW(), CURDATE() + INTERVAL 1 YEAR, 0, 5);`);
}

(async () => {
  retirer();
  ok('Précondition : un produit sans lot en stock', !!P && !!CIP, P + ' ' + CIP + ' ' + NOM);
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
    const id = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s).filter((x) => x.isVisible(true))[0]; return c ? c.id : null; }, sel);
    const sansAttente = () => p.waitForFunction(() => !(Ext.Msg.isVisible() && /patienter/i.test(Ext.Msg.msg.getEl().dom.innerText)), null, { timeout: 60000 });

    /* liste des ajustements, bouton d'ajustement du rayon */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('ajustementmanager', '', '', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ajustementgestion #addBtnRayon').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.locator('#' + await id('ajustementgestion #addBtnRayon')).click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('doajustementmanager #produit').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);

    /* motif : le premier de la liste */
    const motif = await id('doajustementmanager #typeAjustement');
    if (motif) {
      await p.locator('#' + motif + ' .x-form-trigger').first().click();
      await p.locator('.x-boundlist:visible .x-boundlist-item').first().click();
      await p.waitForTimeout(300);
    }
    const commentaire = await id('doajustementmanager #commentaire');
    if (commentaire) { await p.locator('#' + commentaire + '-inputEl').fill(COMMENTAIRE); }

    const produit = await id('doajustementmanager #produit');
    const qty = await id('doajustementmanager #qtyField');
    const lotCmp = await id('doajustementmanager #lotField');
    /* produit par son code, choisi dans la liste ; lot facultatif ; quantite, Entree */
    const ligne = async (qte, lot) => {
      await p.locator('#' + produit + '-inputEl').click();
      await p.locator('#' + produit + '-inputEl').pressSequentially(CIP, { delay: 30 });
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: CIP }).first().click({ timeout: 30000 });
      await p.waitForFunction((c) => Ext.getCmp(c).getStore().getCount() === 3, lotCmp, { timeout: 15000 });
      let liste = '';
      if (lot) {
        await p.locator('#' + lotCmp + ' .x-form-trigger').first().click();
        liste = (await p.locator('.x-boundlist:visible').first().innerText()).replace(/\s+/g, ' ');
        await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: lot }).first().click();
      }
      await p.waitForTimeout(500);
      await p.locator('#' + qty + '-inputEl').fill(String(qte));
      const rep = p.waitForResponse((r) => /ajustement\/(creeation|add\/item)/.test(r.url()), { timeout: 30000 });
      await p.locator('#' + qty + '-inputEl').press('Enter');
      const r = await (await rep).json().catch(() => ({}));
      await sansAttente();
      await p.waitForTimeout(800);
      return { r, liste };
    };
    const l1 = await ligne(-4, 'E2EAJ1');
    ok('AJ-02 : la liste « Lot » montre les lots du produit en stock, péremption et quantité, le lot périmé signalé',
      /E2EAJ1.*p[ée]rim[ée].*E2EAJ2.*E2EAJ3/.test(l1.liste) && /\(\s*5\s*\)/.test(l1.liste), l1.liste);
    const l2 = await ligne(-1, null);
    ok('Lignes -4 (lot E2EAJ1 choisi) et -1 (sans lot) ajoutées', l1.r.success === true && l2.r.success === true,
      JSON.stringify(l1.r).slice(0, 120) + ' ' + JSON.stringify(l2.r).slice(0, 120));
    const grille = await p.evaluate(() => Ext.ComponentQuery.query('doajustementmanager #venteGrid')[0].getStore().getRange()
      .map((r) => r.get('intNUMBER') + ':' + (r.get('numLot') || '-')).sort().join(' '));
    ok('Le tableau de l’ajustement montre le lot de chaque ligne', grille === '-1:- -4:E2EAJ1', grille);
    ok('Avant la clôture, ni le stock ni les lots ne bougent', stock() === 10 && lots() === 'E2EAJ1:2 E2EAJ2:3 E2EAJ3:5', stock() + ' ; ' + lots());

    /* cloture, puis « Non » a l'impression */
    const rep2 = p.waitForResponse((r) => r.request().method() === 'PUT' && /api\/v1\/ajustement\/[^/]+$/.test(r.url()), { timeout: 60000 });
    await p.locator('#' + await id('doajustementmanager #btnCloture')).click();
    const r2 = await (await rep2).json().catch(() => ({}));
    await p.waitForFunction(() => Ext.Msg.isVisible() && /imprimer/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 });
    await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=no]'); if (x) { x.btnEl.dom.click(); } });
    await p.waitForTimeout(800);
    ok('Clôture acceptée', r2.success === true, JSON.stringify(r2).slice(0, 200));
    ok('Stock : 10 - 5 = 5', stock() === 5, 'stock ' + stock());
    ok('AJ-02 : le lot choisi sort en premier (E2EAJ1 2 → 0), le reste suit la règle de la vente (E2EAJ2 3 → 0), E2EAJ3 intact',
      lots() === 'E2EAJ1:0 E2EAJ2:0 E2EAJ3:5', lots());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, stock remis', lots() === '' && String(stock()) === STOCK0[0]
      && q(`SELECT COUNT(*) FROM t_ajustement WHERE str_COMMENTAIRE = '${COMMENTAIRE}'`) === '0', stock() + ' / ' + STOCK0[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
