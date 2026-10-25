/* ETIQUETTAGE PRO APRES UNE ENTREE EN STOCK (retours du 25/10, point 6). Par l'ecran « Bon de livraison », admin.
 * Jeu d'essai : un bon de livraison d'essai de 2 unites d'un produit (commande d'essai). Detail du bon, « ENTREE EN
 * STOCK », unites gratuites : oui, confirmer : oui, impression des entrees : oui, etiquettes : oui. Ensuite :
 *  - Etiquettage Pro s'ouvre sur « Impression Prestige », titre « Étiquettage Pro » (plus « Étiquetage ») ;
 *  - Source, Zones, Produits, Impression et Types d'etiquette sont caches ; « Impression Prestige » est en vert ;
 *  - « Retour à commande en cours » en bas a droite ; il ouvre « Commande en cours » ;
 *  - ouvert depuis le menu, Etiquettage Pro reste comme avant (etapes visibles, pas de bouton de retour) ;
 *  - aucune erreur JavaScript. Tout est retire : bon, commande, lots, mouvements ; produit et stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const BL = 'E2E-EAE-BL', DET = 'E2E-EAE-BLD', ORD = 'E2E-EAE-ORD', TSF = 'E2E-EAE-TSF';
const REF = 'E2EEAE' + String(Date.now()).slice(-6);
const debut = q('SELECT NOW()');
const [P, G, STOCK] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND f.int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('|');
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_eae_${t}; CREATE TABLE e2e_eae_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${P}';`));
}
function remettre() {
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID <> '${P}')`);
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`
    + `DELETE FROM HMvtProduit WHERE pkey = '${DET}'; DELETE FROM MvtTransaction WHERE pkey = '${BL}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'; DELETE FROM notification WHERE entity_ref = '${BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_eae_t_famille'") === '1') {
    /* mise a jour depuis la copie (une suppression bute sur les cles etrangeres) */
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_eae_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_eae_${t};`);
    });
  }
}

(async () => {
  remettre();
  ok('Précondition : un produit en stock au rayon, avec grossiste', !!P && !!G && Number(STOCK) >= 3, P + ' stock ' + STOCK);
  sauver();
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', 1, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 2 * f.int_PAF, 0, 2 * f.int_PAF, '${ORD}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID = '${P}' AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${DET}', '${G}', f.lg_FAMILLE_ID, '${BL}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${STOCK} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`);
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    /* les PDF d'impression s'ouvrent dans un nouvel onglet : refermes */
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, BL);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('int_NUMBER_ETIQUETTE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const repondre = async (motif, bouton) => {
      await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await p.evaluate((x) => { Ext.Msg.down('button[itemId=' + x + ']').btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(300);
    };
    await p.evaluate(() => { if (!Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) { Ext.getCmp('int_NUMBER_ETIQUETTE').setValue(1); } Ext.getCmp('btn_enterstock').btnEl.dom.click(); });
    await repondre('UNITÉS GRATUITES', 'yes');
    await repondre("Confirmer l'entrée en stock", 'yes');
    await repondre('impression des entrées', 'yes');
    await repondre('imprimer les étiquettes', 'yes');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('etiquetagepro')[0]; return e && e.isVisible(true) && e.down('#cartes').getLayout().getActiveItem().itemId === 'impressionPrestige'; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    ok('Entrée en stock faite (bon clôturé)', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === 'is_Closed');
    const e = await p.evaluate(() => {
      const ec = Ext.ComponentQuery.query('etiquetagepro')[0], v = (s) => { const c = ec.down(s); return !!c && c.isVisible(true); };
      const imp = ec.down('#outilImpression'), r = ec.down('#retourCommande'), boite = ec.getEl().dom.getBoundingClientRect();
      const rr = r && r.isVisible(true) ? r.getEl().dom.getBoundingClientRect() : null;
      return { titre: ec.title, etapes: ['#etape0', '#etape1', '#etape2', '#etape3', '#outilTypes'].filter(v), autres: ['#outilPerso', '#outilImpression', '#outilLecture'].filter(v),
        vert: getComputedStyle(imp.getEl().dom).backgroundColor, retour: r && r.isVisible(true) ? r.getText() : null,
        basDroite: rr ? { droite: Math.round(boite.right - rr.right), bas: Math.round(boite.bottom - rr.bottom) } : null,
        ancienTitre: document.body.innerText.includes('Étiquetage Pro'), nouveauTitre: document.body.innerText.includes('Étiquettage Pro') };
    });
    ok('Aperçu « Impression Prestige », titre « Étiquettage Pro » partout', e.nouveauTitre && !e.ancienTitre, JSON.stringify(e));
    ok('Source, Zones, Produits, Impression et Types d\'étiquette cachés', e.etapes.length === 0 && e.autres.length === 3, JSON.stringify(e.etapes));
    ok('« Impression Prestige » en vert', /rgb\(30, 132, 73\)/.test(e.vert), e.vert);
    ok('« Retour à commande en cours » en bas à droite', e.retour === 'Retour à commande en cours' && e.basDroite && e.basDroite.droite < 40 && e.basDroite.bas < 40, JSON.stringify(e.basDroite));
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('etiquetagepro #retourCommande')[0]; r.btnEl.dom.setAttribute('data-e2e', 'retour'); });
    await p.click('[data-e2e=retour]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 }).catch(() => {});
    ok('Le bouton ouvre « Commande en cours »', await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true))));

    await ouvrirMenu(p, 'GESTION DU STOCK', 'Étiquettage Pro');
    await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('etiquetagepro')[0]; return x && x.isVisible(true); }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    const m = await p.evaluate(() => { const ec = Ext.ComponentQuery.query('etiquetagepro')[0], v = (s) => { const c = ec.down(s); return !!c && c.isVisible(true); };
      return { etapes: ['#etape0', '#etape1', '#etape2', '#etape3', '#outilTypes'].filter(v).length, retour: v('#retourCommande'), vert: getComputedStyle(ec.down('#outilImpression').getEl().dom).backgroundColor }; });
    ok('Depuis le menu : comme avant (étapes visibles, pas de retour, bouton non vert)', m.etapes === 5 && !m.retour && !/rgb\(30, 132, 73\)/.test(m.vert), JSON.stringify(m));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produit remis à l\'identique', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`) === STOCK);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
