/* AUDIT 06 (11/10), cas critiques de l'entree en stock, rejoues par les ecrans « Bon de livraison » et « Commandes ».
 *  EN-01 : a l'entree en stock, le reste de chaque lot (current_stock) recevait le cumul des lots precedents
 *          (lots 5, 3, 2 -> 5, 8, 10).
 *  EN-02 : le meme n° de BL chez deux grossistes melangeait leurs lots : supprimer le BL de B supprimait le lot du BL
 *          de A ; entrer le BL de B reecrivait le reste du lot de A.
 *  EN-03 : BL cree depuis un BLV PharmaML (8 livrees sur 10 commandees) : une ligne sans lot entrait 10.
 *  EN-04 : « Créer le bon de livraison » accepte deux fois sur la meme commande (deux postes) : stock en double.
 * Preparation (hors parcours) : commandes, BL et lots poses en base, comme les cree la saisie. Parcours : liste des
 * BL, icone « Detail livraison », « Entrée en stock » et ses questions ; icone « Supprimer » et sa confirmation ;
 * liste des commandes, icone « Créer le bon de livraisson », champs, « Enregistrer », sur deux pages.
 * Produit, stock et mouvements remis a l'identique a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-stock-entree-bl.js
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
const M = 'E2E-A06-';
const SUF = String(Date.now()).slice(-5);
const REF = 'E2EA06' + SUF, REF3 = 'E2EA06C' + SUF, REF4A = 'E2EA06D' + SUF, REF4B = 'E2EA06E' + SUF;
const debut = q('SELECT NOW()');
const [P, G1, STOCK] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND COALESCE(f.bool_CHECKEXPIRATIONDATE, 0) = 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 3").split('|');
const G2 = q(`SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID <> '${G1}' ORDER BY lg_GROSSISTE_ID LIMIT 1`);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
const BLS = ['A', 'B1', 'B2', 'C'].map((x) => M + 'BL' + x);
const ORDS = ['A', 'B1', 'B2', 'C', 'D'].map((x) => M + 'O' + x);
const liste = (a) => a.map((x) => `'${x}'`).join(',');

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_a06_${t}; CREATE TABLE e2e_a06_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${P}';`));
}
function remettre() {
  const refs = liste([REF, REF3, REF4A, REF4B]);
  const bls = `SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID IN (${liste(ORDS)})`;
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_ID, "'")), "''") FROM t_bon_livraison WHERE lg_ORDER_ID IN (${liste(ORDS)})`);
  const dets = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_BON_LIVRAISON_DETAIL, "'")), "''") FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${ids})`);
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID <> '${P}')`);
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`
    + `DELETE FROM HMvtProduit WHERE pkey IN (${dets}); DELETE FROM MvtTransaction WHERE pkey IN (${ids});`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_etiquette WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON IN (${refs}); DELETE FROM t_lot WHERE str_REF_LIVRAISON IN (${refs}) OR lg_LOT_ID LIKE '${M}%';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (str_DESCRIPTION LIKE '%E2EA06%');`
    + `UPDATE t_pharmaml_blv SET lg_BON_LIVRAISON_ID = NULL WHERE lg_ID = '${M}BLV';  DELETE FROM t_pharmaml_blv WHERE lg_ID = '${M}BLV';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${ids}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${ids});`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${liste(ORDS)}); DELETE FROM t_order WHERE lg_ORDER_ID IN (${liste(ORDS)});`);
  if (bls && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_a06_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_a06_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_a06_${t};`);
    });
  }
}
/* commande, BL et une ligne (commande qte, recue, manquant), comme « Créer le bon de livraison » les pose */
function bon(x, g, ref, statut, cmde, recue) {
  const o = M + 'O' + x, b = M + 'BL' + x;
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${o}', '${o}', 1, '${g}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${b}', '${ref}', NOW(), ${cmde} * f.int_PAF, 0, ${cmde} * f.int_PAF, '${o}', '${statut}', NOW(), NOW(), '${ADMIN}' FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${b}-D', '${g}', f.lg_FAMILLE_ID, '${b}', ${cmde}, 0, ${recue}, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), ${cmde - recue}, 0, ${STOCK} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`);
}
function lot(id, g, ref, n, reste) {
  exec(`INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT, str_REF_LIVRAISON, str_STATUT, dt_CREATED, dt_UPDATED,`
    + ` dt_PEREMPTION, int_QTY_VENDUE, current_stock) VALUES ('${M}${id}', '${ADMIN}', '${P}', '${g}', '${id}', ${n}, 0, '${ref}', 'enable', NOW(), NOW(), CURDATE() + INTERVAL 2 YEAR, 0, ${reste === undefined ? 'NULL' : reste})`);
}
const reste = (id) => q(`SELECT IFNULL(current_stock, 'NULL') FROM t_lot WHERE lg_LOT_ID = '${M}${id}'`);
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`));

(async () => {
  remettre();
  ok('Précondition : un produit sans contrôle de péremption, deux grossistes', !!P && !!G1 && !!G2 && Number(STOCK) >= 3, P + ' ' + G1 + ' ' + G2);
  sauver();
  /* EN-06 : un PMP different du prix d'achat de la fiche, sinon l'ancien calcul et le nouveau se confondent */
  exec(`UPDATE t_famille SET dbl_PRIX_MOYEN_PONDERE = 2 * int_PAF WHERE lg_FAMILLE_ID = '${P}'`);
  /* EN-01 : BL A (grossiste 1), 10 commandees, lots 5, 3, 2 */
  bon('A', G1, REF, 'enable', 10, 0);
  lot('LA1', G1, REF, 5); lot('LA2', G1, REF, 3); lot('LA3', G1, REF, 2);
  /* EN-02 : BL B1 (grossiste 2, meme n°, a supprimer) et B2 (grossiste 2, meme n°, a entrer sans lot) */
  bon('B1', G2, REF, 'enable', 5, 0);
  /* EN-03 : BL C cree depuis un BLV : 10 commandees, 8 livrees, aucun lot */
  bon('C', G1, REF3, 'enable', 10, 8);
  exec(`INSERT INTO t_pharmaml_blv (lg_ID, lg_GROSSISTE_ID, lg_ORDER_ID, lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_RECU, dt_UTILISE)`
    + ` VALUES ('${M}BLV', '${G1}', '${M}OC', '${M}BLC', '${REF3}', NOW(), NOW())`);
  /* EN-04 : commande en cours (celles que liste « Commandes »), une ligne */
  /* prix lus d'abord : le declencheur de t_order_detail modifie t_famille, qui ne peut pas etre lue dans la meme instruction */
  const [paf, prix] = q(`SELECT int_PAF, int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`).split('\t').map(Number);
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${M}OD', '${M}OD${SUF}', 1, '${G1}', '${ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0);`
    + `INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${M}OD-L', '${M}OD', '${P}', '${G1}', 2, ${2 * paf}, ${paf}, ${prix}, ${paf}, ${prix}, 'is_Process', NOW(), NOW())`);

  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const page = async () => {
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
    return p;
  };
  const repondre = async (p, motif, bouton) => {
    await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
    await p.evaluate((x) => { Ext.Msg.down('button[itemId=' + x + ']').btnEl.dom.click(); }, bouton);
    await p.waitForTimeout(300);
  };
  const listeBons = async (p) => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
  };
  const ligneBon = async (p, bl) => {
    await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g.getStore().findExact('lg_BON_LIVRAISON_ID', x) >= 0; }, bl, { timeout: 30000 });
    const i = await p.evaluate((x) => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().findExact('lg_BON_LIVRAISON_ID', x), bl);
    return p.locator('.x-grid-row').filter({ visible: true }).nth(i);
  };
  /* « Entrée en stock » d'un BL depuis la liste ; rend le message final s'il y en a un d'echec */
  const entrer = async (p, bl) => {
    await listeBons(p);
    await (await ligneBon(p, bl)).locator('img[data-qtip="Detail livraison"]').click();
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('int_NUMBER_ETIQUETTE') && Ext.getCmp('btn_enterstock').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.locator('#int_NUMBER_ETIQUETTE input, input#int_NUMBER_ETIQUETTE-inputEl').first().fill('1').catch(() => {});
    await p.click('#btn_enterstock');
    await repondre(p, 'UNITÉS GRATUITES', 'yes');
    await repondre(p, "Confirmer l'entrée en stock", 'yes');
    /* « Veuillez patienter » pendant le traitement, puis le message de fin */
    const suite = await p.waitForFunction(() => { const t = Ext.Msg.isVisible() && Ext.Msg.msg.getEl().dom.innerText; return t && !/patienter/i.test(t) ? t : false; }, null, { timeout: 180000 }).then((h) => h.jsonValue());
    if (/impression des entrées/.test(suite)) {
      await repondre(p, 'impression des entrées', 'no');
      await repondre(p, 'imprimer les étiquettes', 'no');
      return '';
    }
    await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
    return suite;
  };
  try {
    const p = await page();

    /* EN-01 (et EN-06 : PMP apres l'entree, ancien stock a l'ancien PMP) */
    const [pmp0, paf] = q(`SELECT CONCAT_WS('|', IFNULL(dbl_PRIX_MOYEN_PONDERE, 0), int_PAF) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`).split('|').map(Number);
    const s0 = stock();
    const m1 = await entrer(p, M + 'BLA');
    const attendu = Math.round((s0 * (pmp0 > 0 ? pmp0 : paf) + 10 * paf) / (s0 + 10));
    const pmp1 = Number(q(`SELECT dbl_PRIX_MOYEN_PONDERE FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`));
    ok('EN-06 : PMP après réception = ancien stock à l\'ancien PMP + 10 au prix d\'achat', pmp1 === attendu, 'avant ' + pmp0 + ', stock ' + s0 + ', obtenu ' + pmp1 + ', attendu ' + attendu);
    const r1 = ['LA1', 'LA2', 'LA3'].map(reste).join('/');
    ok('EN-01 : BL entré en stock', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}BLA'`) === 'is_Closed', m1);
    ok('EN-01 : chaque lot garde sa propre quantité (5/3/2, et non le cumul 5/8/10)', r1 === '5/3/2', r1);
    /* le lot LA1 a vendu 4 boites : reste 1 (il en reste 1 de 5) */
    exec(`UPDATE t_lot SET current_stock = 1, int_QTY_VENDUE = 4 WHERE lg_LOT_ID = '${M}LA1'`);

    /* EN-02 b : suppression du BL B1 (grossiste 2, meme n°) depuis la liste */
    await listeBons(p);
    await (await ligneBon(p, M + 'BLB1')).locator('img[data-qtip="Supprimer"]').click();
    const confirmer = p.locator('.prestige-confirmer-icone').first();
    await confirmer.waitFor({ timeout: 10000 });
    await p.waitForTimeout(600);
    await confirmer.click();
    await p.waitForFunction((x) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', x) < 0; }, M + 'BLB1', { timeout: 30000 }).catch(() => {});
    ok('EN-02 : BL du grossiste 2 supprimé', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}BLB1'`) === '0');
    ok('EN-02 : les lots du BL du grossiste 1 (même n°) restent', q(`SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID IN ('${M}LA1','${M}LA2','${M}LA3')`) === '3',
      q(`SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID IN ('${M}LA1','${M}LA2','${M}LA3')`) + ' lot(s) sur 3');

    /* EN-02 a : BL B2 (grossiste 2, meme n°), aucun lot saisi, entre en stock */
    bon('B2', G2, REF, 'enable', 5, 0);
    const avantB2 = stock();
    const m2 = await entrer(p, M + 'BLB2');
    const r2 = ['LA1', 'LA2', 'LA3'].map(reste).join('/');
    ok('EN-02 : entrer le BL du grossiste 2 ne réécrit pas les lots du grossiste 1 (restes 1/3/2)', r2 === '1/3/2', r2 + ' ' + m2);
    ok('EN-02 : le BL du grossiste 2 entre ses propres 5 boîtes', stock() === avantB2 + 5, avantB2 + ' -> ' + stock());

    /* EN-03 : BL C (BLV : 8 livrees sur 10), aucun lot saisi */
    const avantC = stock();
    const m3 = await entrer(p, M + 'BLC');
    const ligneC = q(`SELECT CONCAT(int_QTE_RECUE, '/', int_QTE_MANQUANT) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${M}BLC-D'`);
    ok('EN-03 : BL créé depuis un BLV : la ligne sans lot entre les 8 livrées, pas les 10 commandées', stock() === avantC + 8, avantC + ' -> ' + stock() + ' ' + m3);
    ok('EN-03 : quantité reçue et reliquat du BLV gardés (8/2)', ligneC === '8/2', ligneC);

    /* EN-04 : deux postes ouvrent « Créer le bon de livraison » sur la meme commande */
    const p2 = await page();
    const ouvrirCreation = async (pg) => {
      await pg.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commandes', ''));
      await pg.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
      await pg.click('#rechecher input, input#rechecher-inputEl');
      await pg.keyboard.type(M + 'OD' + SUF, { delay: 20 });
      await pg.keyboard.press('Enter');
      const l = pg.locator('.x-grid-row').filter({ visible: true, hasText: M + 'OD' + SUF }).first();
      await l.waitFor({ timeout: 30000 });
      await l.locator('img[data-qtip="Créer le bon de livraisson"]').click();
      await pg.waitForFunction(() => Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true), null, { timeout: 30000 });
      await pg.waitForTimeout(800);
    };
    const enregistrer = async (pg, ref) => {
      /* n° de BL, date, montant HT et TVA (le formulaire refuse un champ vide) */
      const saisir = async (id, v) => { const c = pg.locator('#' + id + '-inputEl'); await c.click(); await c.fill(''); await pg.keyboard.type(v, { delay: 20 }); };
      const j = new Date();
      await saisir('str_REF_LIVRAISON', ref);
      await saisir('dt_DATE_LIVRAISON', String(j.getDate()).padStart(2, '0') + '/' + String(j.getMonth() + 1).padStart(2, '0') + '/' + j.getFullYear());
      await saisir('int_MHT', '1000');
      await saisir('int_TVA', '0');
      const rep = pg.waitForResponse((r) => r.url().includes('commande/creerbl'), { timeout: 30000 });
      await pg.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).click();
      if (await pg.waitForFunction(() => Ext.Msg.isVisible() && /diff[ée]rent/.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 4000 }).then(() => true, () => false)) {
        await repondre(pg, 'diff[ée]rent', 'yes');
      }
      return (await rep).json();
    };
    await ouvrirCreation(p);
    await ouvrirCreation(p2);
    const c1 = await enregistrer(p, REF4A);
    const c2 = await enregistrer(p2, REF4B);
    const nb = q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${M}OD'`);
    ok('EN-04 : premier poste : BL créé', c1 && c1.success !== false, JSON.stringify(c1).slice(0, 150));
    ok('EN-04 : second poste, même commande : refusé, un seul BL pour la commande', c2 && c2.success === false && nb === '1', nb + ' BL ; ' + JSON.stringify(c2).slice(0, 150));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produit remis à l\'identique', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID IN (${liste(ORDS)})`) === '0'
      && q(`SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID LIKE '${M}%'`) === '0' && String(stock()) === STOCK, stock() + ' / ' + STOCK);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
