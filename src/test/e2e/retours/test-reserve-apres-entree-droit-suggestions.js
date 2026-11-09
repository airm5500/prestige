/* RESERVE APRES ENTREE ET DROIT « VOIR LES SUGGESTIONS DE RESERVE » (P_RESERVE_SUGGESTION, demande 60).
 * La fenetre « Seuil de réserve atteint », a la cloture d'un BL, montre les lignes des suggestions de reserve
 * automatiques. Un profil qui n'a pas le droit de voir les suggestions ne doit plus les voir ; la cloture du BL n'est pas
 * genee. Le droit est cree par la migration V7.2.70 d'une autre branche : ce test le pose et le retire lui-meme.
 * Par l'ecran « Bon de livraison » : detail du bon, « ENTREE EN STOCK », questions habituelles. Trois passages, un bon
 * d'essai de 2 unites chacun, sur un produit gere en reserve qui deborde du rayon :
 *  1. droit absent de la base : comme aujourd'hui, la fenetre montre le produit ;
 *  2. droit present, le profil ne l'a pas : bon cloture, stock + 2, aucune fenetre ni ligne de suggestion, retour a la
 *     liste des bons ; la suggestion automatique existe bien en base (seul l'affichage est retire) ;
 *  3. droit present, le profil l'a : la fenetre montre le produit, comme aujourd'hui.
 * Tout est retire : bons, commandes, lots, mouvements, journaux, notifications, suggestions ; produit remis a
 * l'identique ; droit cree retire, attribution remise.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const { connexion, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-RDS-', TSF = M + 'TSF', PRIV = 'P_RESERVE_SUGGESTION', PRIV_ID = 'E2E-RDS-PRIV';
const STAMP = String(Date.now()).slice(-6);
const PASSAGES = [1, 2, 3].map((i) => ({ bl: M + 'BL' + i, det: M + 'BLD' + i, ord: M + 'ORD' + i, ref: 'E2ERDS' + i + STAMP }));
const debut = q('SELECT NOW()');
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, PRIV);
const [P, G, STOCK] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail a WHERE a.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND a.b_IS_AVOIR = 1"
  + "   AND a.str_STATUT = 'is_Closed' AND a.int_QUANTITY <> a.int_QUANTITY_SERVED AND a.int_QUANTITY > 0)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 7").split('|');
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
const stock = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`));
/* etat d'origine du droit : ligne existante et son statut (une base migree l'a deja) */
const STATUT_DROIT0 = q(`SELECT IFNULL(MAX(str_STATUT), '') FROM t_privilege WHERE str_NAME = '${PRIV}'`);

function droitAbsent() { exec(`UPDATE t_privilege SET str_STATUT = 'disable' WHERE str_NAME = '${PRIV}';`); }
function droitPresent() {
  exec(`INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT)`
    + ` SELECT '${PRIV_ID}', '${PRIV}', 'CUSTOMER', 'Essai e2e', NOW(), NOW(), 'enable' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege WHERE str_NAME = '${PRIV}');`
    + `UPDATE t_privilege SET str_STATUT = 'enable' WHERE str_NAME = '${PRIV}';`);
}
function droitRemis() {
  droit.reprendre();
  droit.remettre();
  exec(`DELETE FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV_ID}'; DELETE FROM t_privilege WHERE lg_PRIVELEGE_ID = '${PRIV_ID}';`
    + (STATUT_DROIT0 ? `UPDATE t_privilege SET str_STATUT = '${STATUT_DROIT0}' WHERE str_NAME = '${PRIV}';` : ''));
}
function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_rds_${t}; CREATE TABLE e2e_rds_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${P}';`));
}
function remettre() {
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID <> '${P}')`);
  const bls = PASSAGES.map((x) => `'${x.bl}'`).join(','), refs = PASSAGES.map((x) => `'${x.ref}'`).join(','), dets = PASSAGES.map((x) => `'${x.det}'`).join(','), ords = PASSAGES.map((x) => `'${x.ord}'`).join(',');
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`
    + `DELETE FROM HMvtProduit WHERE pkey IN (${dets}); DELETE FROM MvtTransaction WHERE pkey IN (${bls});`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON IN (${refs}); DELETE FROM t_warehouse WHERE str_REF_LIVRAISON IN (${refs}); DELETE FROM notification WHERE entity_ref IN (${bls});`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (` + PASSAGES.map((x) => `str_DESCRIPTION LIKE '%${x.ref}%'`).join(' OR ') + ');'
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${bls}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${bls});`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${ords}); DELETE FROM t_order WHERE lg_ORDER_ID IN (${ords});`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_rds_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_rds_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_rds_${t};`);
    });
  }
}
/* un bon d'essai de 2 unites ; le seuil de reserve = stock actuel, donc l'entree fait deborder le rayon */
function poserBon(x) {
  const s = stock();
  exec(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = ${s}, int_SEUIL_MINI_RAYON = 1 WHERE lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${x.ord}', '${x.ref}', 1, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${x.bl}', '${x.ref}', NOW(), 2 * f.int_PAF, 0, 2 * f.int_PAF, '${x.ord}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID = '${P}' AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${x.det}', '${G}', f.lg_FAMILLE_ID, '${x.bl}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${s} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`);
  return s;
}

(async () => {
  droitRemis();
  remettre();
  ok('Précondition : un produit en stock au rayon, avec grossiste, sans avoir en attente', !!P && !!G && Number(STOCK) >= 3, P + ' stock ' + STOCK);
  sauver();
  exec(`INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT, int_NUMBER)`
    + ` SELECT '${TSF}', '${P}', '2', '1', 'reserve', 'reserve', NOW(), 'enable', 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${P}' AND lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1');`);
  const cip = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  /* un passage : connexion (droits lus a la connexion), detail du bon, ENTREE EN STOCK, questions, puis ce qui s'affiche */
  const entrer = async (x) => {
    const avant = poserBon(x);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, x.bl, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, x.bl);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible() && Ext.getCmp('int_NUMBER_ETIQUETTE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const reponse = p.waitForResponse((r) => /validerbl/.test(r.url()), { timeout: 120000 }).then((r) => r.json()).catch(() => null);
    await p.evaluate(() => { if (!Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) { Ext.getCmp('int_NUMBER_ETIQUETTE').setValue(1); } });
    await cliquer(p, '#btn_enterstock');
    const repondre = async (motif, bouton) => {
      await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await cliquer(p, 'messagebox{isVisible()} button[itemId=' + bouton + ']');
      await p.waitForTimeout(300);
    };
    await repondre('UNITÉS GRATUITES', 'yes');
    await repondre("Confirmer l'entrée en stock", 'yes');
    await repondre('impression des entrées', 'no');
    await repondre('imprimer les étiquettes', 'no');
    const r = await reponse;
    const fenetre = await p.waitForFunction(() => Ext.ComponentQuery.query('reserveapresentree').some((w) => w.isVisible()), null, { timeout: 8000 }).then(() => true).catch(() => false);
    const vu = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reserveapresentree').find((x) => x.isVisible());
      const l = Ext.ComponentQuery.query('bonlivraisonmanager').find((g) => g.isVisible(true));
      return { lignes: w ? w.down('grid').getStore().getRange().map((x) => x.data.cip) : [], texte: w ? w.getEl().dom.innerText.replace(/\s+/g, ' ') : '', liste: !!l }; });
    await p.context().close();
    return { avant, apres: stock(), clos: q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${x.bl}'`), reserve: r && r.reserve, fenetre, ...vu,
      suggestionEnBase: q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID`
        + ` WHERE d.lg_FAMILLE_ID = '${P}' AND s.str_ORIGINE = 'AUTOMATIQUE' AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS') AND d.str_ETAT <> 'SUPPRIMEE'`) };
  };
  try {
    /* 1. droit absent de la base : comme aujourd'hui */
    droitAbsent();
    let e = await entrer(PASSAGES[0]);
    ok('Droit absent de la base : bon clôturé, +2, la fenêtre montre le produit (comme avant)', e.clos === 'is_Closed' && e.apres === e.avant + 2 && e.fenetre && e.lignes.includes(cip), JSON.stringify(e));

    /* 2. droit present, le profil ne l'a pas */
    droitPresent();
    droit.retirer();
    e = await entrer(PASSAGES[1]);
    ok('Sans le droit : bon clôturé, +2 (la clôture n\'est pas gênée)', e.clos === 'is_Closed' && e.apres === e.avant + 2, JSON.stringify(e));
    ok('Sans le droit : aucune fenêtre, aucune ligne de suggestion, retour à la liste des bons', !e.fenetre && e.lignes.length === 0 && e.liste, JSON.stringify(e));
    ok('Sans le droit : la réponse de la clôture ne porte aucune ligne de suggestion', Array.isArray(e.reserve) && e.reserve.length === 0, JSON.stringify(e.reserve));
    ok('Sans le droit : la suggestion automatique existe bien en base (seul l\'affichage est retiré)', Number(e.suggestionEnBase) >= 1, e.suggestionEnBase);
    droit.remettre();

    /* 3. droit present, le profil l'a */
    droit.accorder();
    e = await entrer(PASSAGES[2]);
    ok('Avec le droit : bon clôturé, +2, la fenêtre montre le produit (aucun changement)', e.clos === 'is_Closed' && e.apres === e.avant + 2 && e.fenetre && e.lignes.includes(cip)
      && Array.isArray(e.reserve) && e.reserve.length >= 1, JSON.stringify(e));
    droit.reprendre();
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    droitRemis();
    remettre();
    ok('Données d\'essai retirées, produit et droit remis', PASSAGES.every((x) => q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${x.bl}'`) === '0')
      && q(`SELECT CONCAT_WS('|', bool_RESERVE, int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${P}'`) === '0|' + STOCK
      && q(`SELECT IFNULL(MAX(str_STATUT), '') FROM t_privilege WHERE str_NAME = '${PRIV}'`) === STATUT_DROIT0
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e_rds%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
