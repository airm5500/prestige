/* RETOURS DU 15/11, saisie des produits périmés :
 *  - « au clic sur Terminer j'ai un message d'erreur » (base capitale) : une des 47 lignes en cours porte sur un
 *    produit désactivé depuis la saisie (plus de stock actif dans l'emplacement) ; la lecture du stock rendait null,
 *    la clôture s'arrêtait sur cette ligne en gardant ce qui était déjà retiré avant elle, et l'écran ne disait rien
 *    d'utile. Attendu : cette ligne reste en attente, signalée avec sa raison ; les autres sont retirées ; une clôture
 *    en erreur est annulée en entier ;
 *  - « bouton Saisir des produits : je le veux en fenêtre modale » : la saisie s'ouvre au-dessus de la liste ; RETOUR
 *    la ferme et la liste est toujours là.
 *
 * Vrai chemin : menu GESTION DU STOCK › Saisie de produits périmés (onglet Liste), « Saisir des produits »,
 * « Terminer », « OK ».
 * Jeu d'essai (laborex_audit, retiré à la fin) : P1 au stock 10, P2 désactivé (produit et stock), P3 au stock 1.
 * Lignes en cours, dans l'ordre de saisie : P1 lot A ×2, P2 ×1 (au milieu), P1 lot B ×1, P3 ×2 (stock insuffisant).
 * Contrôles :
 *  - fenêtre modale au-dessus de la liste, entière dans l'écran ;
 *  - rapprochement écran / base : les 4 lignes en cours (produit, lot, quantité) ;
 *  - message : « 2 » produits retirés, P2 « produit désactivé », P3 « stock insuffisant » ;
 *  - bilan : P1 10 → 7, P2 et P3 inchangés ; les 2 lignes de P1 retirées, celles de P2 et P3 en attente ; un
 *    mouvement de stock par ligne retirée (2), aucun pour P2 et P3 ; les autres saisies en cours ne sont pas touchées ;
 *  - RETOUR ferme la fenêtre, la liste est rechargée ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/audits/test-perimes-terminer-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const M = 'E2E-PT15-';
const PARK = 'e2e-pt15-attente';
const debut = q('SELECT NOW()');
const PROD = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND l.current_stock > 0)"
  + " AND NOT EXISTS (SELECT 1 FROM t_warehouse w WHERE w.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 3 OFFSET 31").split('\n').map((l) => l.split('|'));
const [P1, P2, P3] = PROD.map((x) => x[0]);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const AVANT = Object.fromEntries(PROD.map(([id]) => [id, q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, s.str_STATUT, f.str_STATUT) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID`
  + ` WHERE s.lg_FAMILLE_ID = '${id}' AND s.lg_EMPLACEMENT_ID = '1'`)]));
const stock = (id) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1'`));
const lignes = (statut) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(int_NUM_LOT, ':', int_NUMBER) ORDER BY int_NUM_LOT SEPARATOR ' '), '') FROM t_warehouse`
  + ` WHERE lg_WAREHOUSE_ID LIKE '${M}%' AND str_STATUT = '${statut}'`);
const PARQUES = Number(q("SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'pending'"));

function retirer() {
  q(`DELETE FROM HMvtProduit WHERE pkey LIKE '${M}%'; DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_TYPE_LOG IN ('${PROD.map((x) => x[1]).join("','")}');`
    + `DELETE FROM notification WHERE created_at >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN ('${P1}','${P2}','${P3}') AND dt_CREATED >= '${debut}';`
    + PROD.map(([id]) => { const [a, n, ss, fs] = AVANT[id].split('|');
      return `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${a}, int_NUMBER = ${n}, str_STATUT = '${ss}' WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1';`
        + `UPDATE t_famille SET str_STATUT = '${fs}' WHERE lg_FAMILLE_ID = '${id}';`; }).join('')
    + `UPDATE t_warehouse SET str_STATUT = 'pending' WHERE str_STATUT = '${PARK}';`);
}
function poser() {
  q(`UPDATE t_warehouse SET str_STATUT = '${PARK}' WHERE str_STATUT = 'pending';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 10, int_NUMBER = 10 WHERE lg_FAMILLE_ID = '${P1}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 4, int_NUMBER = 4 WHERE lg_FAMILLE_ID = '${P2}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 1, int_NUMBER = 1 WHERE lg_FAMILLE_ID = '${P3}' AND lg_EMPLACEMENT_ID = '1';`
    + `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final) VALUES`
    + ` ('${M}W1', '${ADMIN}', '${P1}', 'E2EPT1A', 2, NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 4 HOUR, CURDATE() - INTERVAL 3 DAY, 'pending', 10, 8),`
    + ` ('${M}W2', '${ADMIN}', '${P2}', 'E2EPT2', 1, NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 3 HOUR, CURDATE() - INTERVAL 9 DAY, 'pending', 4, 3),`
    + ` ('${M}W3', '${ADMIN}', '${P1}', 'E2EPT1B', 1, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR, CURDATE() - INTERVAL 1 DAY, 'pending', 8, 7),`
    + ` ('${M}W4', '${ADMIN}', '${P3}', 'E2EPT3', 2, NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 1 HOUR, CURDATE() - INTERVAL 20 DAY, 'pending', 1, 0);`
    /* P2 desactive depuis la saisie (produit et stock), comme chez capitale */
    + `UPDATE t_famille SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '${P2}';`
    + `UPDATE t_famille_stock SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '${P2}' AND lg_EMPLACEMENT_ID = '1';`);
}

(async () => {
  ok('Préconditions : 3 produits sans lot ni saisie, un compte', PROD.length === 3 && !!ADMIN, PROD.map((x) => x[1]).join(', '));
  retirer();
  poser();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'saisieperime', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu saisieperime absent pour ce compte'); }
    await vues.ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperime').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const charge = () => p.waitForFunction(() => Ext.getCmp('gridpanelArticlePerimes') && Ext.getCmp('gridpanelArticlePerimes').isVisible(true) && !Ext.getCmp('gridpanelArticlePerimes').getStore().isLoading(), null, { timeout: 30000 });
    await vues.cliquer(p, 'saisieperime button[text=Saisir des produits]');
    await charge();
    await p.waitForTimeout(1200);
    const fen = await p.evaluate(() => { const a = Ext.ComponentQuery.query('addPerimer')[0], w = a && a.up('window'), liste = Ext.ComponentQuery.query('saisieperime')[0];
      const r = w ? w.getEl().dom.getBoundingClientRect() : null;
      return { fenetre: !!w, modale: !!w && w.modal === true && w.isVisible(), dedans: !!r && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
        liste: !!liste && !liste.isDestroyed && liste.isVisible(true) };
    });
    ok('« Saisir des produits » : fenêtre modale au-dessus de la liste, entière dans l\'écran', fen.fenetre && fen.modale && fen.dedans && fen.liste, JSON.stringify(fen));
    const ecran = await p.evaluate(() => Ext.getCmp('gridpanelArticlePerimes').getStore().getRange().map((r) => r.get('lot') + ':' + r.get('quantity'))
      .filter((s) => /^E2EPT/.test(s)).sort().join(' '));
    ok('Rapprochement écran / base : les 4 lignes en cours (lot, quantité)', ecran === lignes('pending') && ecran === 'E2EPT1A:2 E2EPT1B:1 E2EPT2:1 E2EPT3:2', 'écran « ' + ecran + ' » ; base « ' + lignes('pending') + ' »');

    await p.locator('#btn_create_perime').click();
    const vu = await p.waitForFunction(() => Ext.Msg.isVisible() && !/patienter/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 60000 }).then(() => true).catch(() => false);
    const msg = vu ? await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText.replace(/\s+/g, ' ')) : '(aucun message)';
    if (vu) { await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } }); }
    await p.waitForTimeout(800);
    ok('Message : 2 produits retirés ; P2 « produit désactivé », P3 « stock insuffisant »', /retiré\s*:\s*2\b/.test(msg) && msg.includes(PROD[1][1]) && /désactivé/.test(msg)
      && msg.includes(PROD[2][1]) && /stock insuffisant/.test(msg), msg);
    ok('Bilan : stocks P1 10 → 7, P2 4 et P3 1 inchangés', stock(P1) === 7 && stock(P2) === 4 && stock(P3) === 1, [stock(P1), stock(P2), stock(P3)].join(' / '));
    ok('Bilan : les 2 lignes de P1 retirées, celles de P2 et P3 restent en attente', lignes('delete') === 'E2EPT1A:2 E2EPT1B:1' && lignes('pending') === 'E2EPT2:1 E2EPT3:2',
      'retirées « ' + lignes('delete') + ' » ; en attente « ' + lignes('pending') + ' »');
    const mvt = q(`SELECT IFNULL(GROUP_CONCAT(pkey ORDER BY pkey), '') FROM HMvtProduit WHERE pkey LIKE '${M}%'`);
    ok('Bilan : un mouvement de stock par ligne retirée (W1, W3), aucun pour P2 et P3', mvt === `${M}W1,${M}W3`, mvt);
    ok('Bilan : les autres saisies en cours ne sont pas touchées', Number(q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = '${PARK}'`)) === PARQUES);
    await charge();
    const reste = await p.evaluate(() => Ext.getCmp('gridpanelArticlePerimes').getStore().getRange().map((r) => r.get('lot') + ':' + r.get('quantity')).filter((s) => /^E2EPT/.test(s)).sort().join(' '));
    ok('Après la clôture, l\'écran montre les 2 lignes restées en attente', reste === 'E2EPT2:1 E2EPT3:2', reste);

    await vues.cliquer(p, 'addPerimer button[text=RETOUR]');
    await p.waitForTimeout(1200);
    const apres = await p.evaluate(() => ({ fenetre: Ext.ComponentQuery.query('addPerimer').length, liste: Ext.ComponentQuery.query('saisieperime').some((x) => x.isVisible(true)) }));
    ok('RETOUR ferme la fenêtre ; la liste des périmés est toujours là', apres.fenetre === 0 && apres.liste, JSON.stringify(apres));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulement', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées, produits et stocks remis', q(`SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%'`) === '0'
      && PROD.every(([id]) => q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, s.str_STATUT, f.str_STATUT) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID`
        + ` WHERE s.lg_FAMILLE_ID = '${id}' AND s.lg_EMPLACEMENT_ID = '1'`) === AVANT[id])
      && Number(q("SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'pending'")) === PARQUES);
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
