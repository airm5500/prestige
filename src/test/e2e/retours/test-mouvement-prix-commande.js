/* MOUVEMENTS DE PRIX DE LA COMMANDE EN COURS : date de creation renseignee.
 * Changer le prix de vente (PV IMPORT) ou le prix d'achat (PA.IMPORT) d'une ligne de commande en cours enregistre un
 * mouvement de prix (t_mouvementprice) ; sa date de creation (dt_CREATED) restait vide (OrderServiceImpl :
 * « setDtCREATED(getDtCREATED()) »), si bien que tout ce qui filtre ou trie l'historique des prix sur cette date ne le
 * voyait pas. Chemin de l'ecran : nouvelle commande, article ajoute, cellules de la grille modifiees.
 * Commande, mouvements de prix, journal et notifications d'essai retires a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const P = q("SELECT CONCAT_WS('|', lg_FAMILLE_ID, int_CIP) FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{7}$'"
  + " AND int_PRICE BETWEEN 1000 AND 5000 AND int_PAF BETWEEN 300 AND int_PRICE - 200 AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 1").split('|');
const pafGrossiste = () => q(`SELECT IFNULL(MAX(int_PAF), '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '${P[0]}' AND lg_GROSSISTE_ID = '${GROSSISTE}'`);
let pafOrigine = null;

function nettoyer() {
  const cdes = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ORDER_ID, '''')), '''-''') FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
  q(`DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${cdes}); DELETE FROM t_order WHERE lg_ORDER_ID IN (${cdes});`
    + `DELETE FROM t_mouvementprice WHERE dt_UPDATED >= '${DEBUT}' AND lg_FAMILLE_ID = '${P[0]}';`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE created_at >= '${DEBUT}' AND entity_ref = '${P[0]}');`
    + `DELETE FROM notification WHERE created_at >= '${DEBUT}' AND entity_ref = '${P[0]}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}' AND str_TYPE_LOG = '${P[1]}';`);
  if (pafOrigine !== null && pafOrigine !== '') {
    q(`UPDATE t_famille_grossiste SET int_PAF = ${pafOrigine} WHERE lg_FAMILLE_ID = '${P[0]}' AND lg_GROSSISTE_ID = '${GROSSISTE}'`);
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const mouvements = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('#', int_PRICE_OLD, int_PRICE_NEW, IFNULL(DATE_FORMAT(dt_CREATED, '%Y-%m-%d %H:%i'), 'VIDE'), IFNULL(DATE_FORMAT(dt_UPDATED, '%Y-%m-%d %H:%i'), 'VIDE')) ORDER BY dt_UPDATED SEPARATOR ' ; '), '')`
    + ` FROM t_mouvementprice WHERE lg_FAMILLE_ID = '${P[0]}' AND dt_UPDATED >= '${DEBUT}' AND str_ACTION = 'COMMANDE'`);
  /* modification d'une cellule de la grille (edition au clic, comme l'utilisateur) */
  const modifierCellule = async (colonne, valeur) => {
    const avant = mouvements();
    await p.evaluate(([col, fid]) => { const g = Ext.getCmp('gridpanelID'), i = g.getStore().findExact('lg_FAMILLE_ID', fid);
      const c = g.headerCt.getGridColumns().find((x) => x.dataIndex === col); g.getView().getCellByPosition({ row: i, column: c.getIndex() }).dom.setAttribute('data-e2e', 'cellule'); }, [colonne, P[0]]);
    await p.click('[data-e2e=cellule]');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('#gridpanelID numberfield, #gridpanelID textfield').find((f) => f.isVisible()); return !!e; }, null, { timeout: 10000 });
    await p.keyboard.press('Control+A'); await p.keyboard.type(String(valeur)); await p.keyboard.press('Enter');
    for (let i = 0; i < 40 && mouvements() === avant; i++) { await p.waitForTimeout(250); }
  };
  try {
    nettoyer();
    pafOrigine = pafGrossiste();
    ok('Préconditions : un grossiste, un produit au CIP unique', GROSSISTE && P[0], P.join(' / '));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* nouvelle commande : grossiste, article cherche par son CIP, quantite, Entree */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('ordermanagerlist', 'Ajouter les articles a une commande', '0', 'is_Process'));
    await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').rendered, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.evaluate((g) => { const c = Ext.getCmp('lgGROSSISTEID'); c.getStore().load({ callback: () => c.setValue(g) }); }, GROSSISTE);
    await p.waitForFunction((g) => Ext.getCmp('lgGROSSISTEID').getValue() === g, GROSSISTE, { timeout: 15000 });
    await p.click('#str_NAME-inputEl'); await p.keyboard.type(P[1]);
    await p.waitForFunction((fid) => { const c = Ext.getCmp('str_NAME'); return c.isExpanded && c.getStore().findExact('lg_FAMILLE_ID', fid) >= 0; }, P[0], { timeout: 20000 });
    await p.evaluate((fid) => { const c = Ext.getCmp('str_NAME'), r = c.getStore().getAt(c.getStore().findExact('lg_FAMILLE_ID', fid));
      c.picker.getNode(r).setAttribute('data-e2e', 'choix'); }, P[0]);
    await p.click('[data-e2e=choix]');
    await p.waitForFunction(() => document.activeElement && /int_QUANTITE/.test(document.activeElement.id), null, { timeout: 10000 });
    await p.keyboard.press('Control+A'); await p.keyboard.type('3'); await p.keyboard.press('Enter');
    await p.waitForFunction((fid) => { const st = Ext.getCmp('gridpanelID').getStore(); return !st.isLoading() && st.findExact('lg_FAMILLE_ID', fid) >= 0; }, P[0], { timeout: 20000 });
    ok('Commande en cours : article ajouté par l\'écran', q(`SELECT int_NUMBER FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID WHERE o.dt_CREATED >= '${DEBUT}' AND d.lg_FAMILLE_ID = '${P[0]}'`) === '3');

    /* prix de vente modifie dans la grille */
    const pv = Number(q(`SELECT d.int_PRICE_DETAIL FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID WHERE o.dt_CREATED >= '${DEBUT}' AND d.lg_FAMILLE_ID = '${P[0]}'`)) + 50;
    await modifierCellule('lg_FAMILLE_PRIX_VENTE', pv);
    const champs = (x) => x.split('#');
    let m = mouvements().split(' ; ').filter((x) => x);
    ok('Prix de vente changé (PV IMPORT) : un mouvement de prix enregistré', m.length === 1 && champs(m[0])[1] === String(pv), mouvements());
    ok('… avec sa date de création (dt_CREATED renseignée, égale à la date de mise à jour)', m.length === 1 && champs(m[0])[2] !== 'VIDE' && champs(m[0])[2] === champs(m[0])[3], mouvements());

    /* prix d'achat modifie dans la grille */
    const pa = Number(q(`SELECT d.int_PAF_DETAIL FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID WHERE o.dt_CREATED >= '${DEBUT}' AND d.lg_FAMILLE_ID = '${P[0]}'`)) + 10;
    await modifierCellule('int_PAF', pa);
    /* les deux mouvements peuvent tomber dans la meme seconde : on cherche celui du prix d'achat par sa valeur */
    m = mouvements().split(' ; ').filter((x) => x);
    ok('Prix d\'achat changé (PA.IMPORT) : un 2e mouvement de prix, daté lui aussi', m.length === 2 && m.some((x) => champs(x)[1] === String(pa)) && m.every((x) => champs(x)[2] !== 'VIDE'), mouvements());
    ok('Historique des prix : les deux mouvements sont trouvés par leur date de création', q(`SELECT COUNT(*) FROM t_mouvementprice WHERE lg_FAMILLE_ID = '${P[0]}' AND dt_CREATED >= '${DEBUT}' AND str_ACTION = 'COMMANDE'`) === '2');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' / '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : commande et mouvements de prix d\'essai retirés, prix d\'achat grossiste remis', q(`SELECT COUNT(*) FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_mouvementprice WHERE lg_FAMILLE_ID = '${P[0]}' AND dt_UPDATED >= '${DEBUT}'`) === '0' && pafGrossiste() === pafOrigine);
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
