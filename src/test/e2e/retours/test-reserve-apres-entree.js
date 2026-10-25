/* SEUIL DE RESERVE ATTEINT APRES UNE ENTREE EN STOCK (retours du 13/10, point 6). Par l'ecran « Bon de livraison », admin.
 * Jeu d'essai : un produit gere en reserve (capacite maxi rayon = son stock rayon), un bon de livraison d'essai de
 * 2 unites de ce produit (commande d'essai). Par l'ecran : detail du bon, « ENTREE EN STOCK », questions habituelles
 * (unites gratuites : oui, confirmer : oui, impression : non). Ensuite :
 *  - la fenetre « Seuil de réserve atteint » montre le produit (rayon -> reserve, quantite a deplacer = 2) et la
 *    reference de la suggestion de reserve automatique ;
 *  - « Ouvrir la suggestion de réserve » ouvre « Gestion des réserves », onglet Suggestions, sur cette suggestion ;
 *  - sans produit concerne, aucune fenetre : la suite habituelle (liste des bons) reprend.
 * Tout est retire : bon, commande, lots, mouvements, journaux, notifications, suggestion ; produit, stock et
 * grossiste du produit remis a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const BL = 'E2E-RAE-BL', DET = 'E2E-RAE-BLD', ORD = 'E2E-RAE-ORD', TSF = 'E2E-RAE-TSF';
const REF = 'E2ERAE' + String(Date.now()).slice(-6);
const debut = q('SELECT NOW()');
/* produit actif, stock rayon positif, sans reserve deja, avec un grossiste */
const [P, G, STOCK] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('|');
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_rae_${t}; CREATE TABLE e2e_rae_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${P}';`));
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
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_rae_t_famille'") === '1') {
    /* mise a jour depuis la copie (une suppression bute sur les cles etrangeres) */
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_rae_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_rae_${t};`);
    });
  }
}

(async () => {
  remettre();
  ok('Précondition : un produit en stock au rayon, avec grossiste', !!P && !!G && Number(STOCK) >= 3, P + ' stock ' + STOCK);
  sauver();
  /* produit gere en reserve, capacite maxi rayon = stock actuel : 2 unites de plus le font deborder */
  exec(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = ${STOCK}, int_SEUIL_MINI_RAYON = 1 WHERE lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT, int_NUMBER)`
    + ` SELECT '${TSF}', '${P}', '2', '1', 'reserve', 'reserve', NOW(), 'enable', 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${P}' AND lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1');`
    + `INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', 1, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = 'admin';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 2 * f.int_PAF, 0, 2 * f.int_PAF, '${ORD}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID = '${P}' AND u.str_LOGIN = 'admin';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${DET}', '${G}', f.lg_FAMILLE_ID, '${BL}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${STOCK} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 4).join(' | ')));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* liste des bons -> detail du bon d'essai */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, BL);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('int_NUMBER_ETIQUETTE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const repondre = async (motif, bouton) => {
      await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await p.evaluate((b) => { Ext.Msg.down('button[itemId=' + b + ']').btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(300);
    };
    await p.evaluate(() => { if (!Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) { Ext.getCmp('int_NUMBER_ETIQUETTE').setValue(1); } Ext.getCmp('btn_enterstock').btnEl.dom.click(); });
    await repondre('UNITÉS GRATUITES', 'yes');
    await repondre("Confirmer l'entrée en stock", 'yes');
    await repondre('impression des entrées', 'no');
    await p.waitForFunction(() => Ext.ComponentQuery.query('reserveapresentree').some((w) => w.isVisible()), null, { timeout: 30000 });
    const f = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reserveapresentree')[0];
      return { titre: w.title, texte: w.getEl().dom.innerText.replace(/\s+/g, ' '), lignes: w.down('grid').getStore().getRange().map((r) => r.data), suggestion: w.suggestionId }; });
    const auto = q(`SELECT CONCAT_WS('|', s.lg_SUGGESTION_RESERVE_ID, s.str_REF, s.str_CATEGORIE, d.int_QTE_PROPOSEE) FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID`
      + ` WHERE d.lg_FAMILLE_ID = '${P}' AND s.str_ORIGINE = 'AUTOMATIQUE' AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS') ORDER BY d.dt_CREATED DESC LIMIT 1`).split('|');
    ok('Entrée en stock faite (bon clôturé, +2 au rayon)', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === 'is_Closed'
      && Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`)) === Number(STOCK) + 2);
    const l = f.lignes.find((x) => x.produitId === P || x.cip === q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`));
    ok('Fenêtre « Seuil de réserve atteint » : le produit, rayon → réserve, 2 à déplacer', /Seuil de réserve atteint/.test(f.titre) && l && l.categorie === 'RESERVE' && l.quantite === 2,
      JSON.stringify(f.lignes));
    ok('Elle nomme la suggestion de réserve automatique où le produit est rangé', auto[2] === 'RESERVE' && f.texte.includes(auto[1]) && f.suggestion === auto[0], f.texte + ' / ' + auto.join('|'));
    await p.evaluate(() => Ext.ComponentQuery.query('reserveapresentree #btnOuvrirSuggestion')[0].btnEl.dom.click());
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); return m && m.getActiveTab() && m.getActiveTab().itemId === 'ongletSuggestions'; }, null, { timeout: 30000 }).catch(() => {});
    /* la fenetre de traitement affiche sa propre fenetre interne (win) */
    await p.waitForFunction(() => Ext.ComponentQuery.query('reservetraitementsuggestion').some((w) => w.win && w.win.isVisible()), null, { timeout: 30000 }).catch(() => {});
    const ouvert = await p.evaluate(() => { const m = Ext.getCmp('reservemanagerID'), w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible());
      return { onglet: m && m.getActiveTab() && m.getActiveTab().itemId, suggestion: w ? w.getSuggestionid() : null }; });
    ok('« Ouvrir la suggestion de réserve » : Gestion des réserves, onglet Suggestions, la suggestion ouverte', ouvert.onglet === 'ongletSuggestions' && ouvert.suggestion === auto[0], JSON.stringify(ouvert));
    /* fermeture comme l'utilisateur, une fois la suggestion chargee */
    await p.waitForTimeout(2500);
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible()); if (w) { w.win.close(); } });

    /* sans produit concerne : aucune fenetre, la suite part tout de suite */
    const sans = await p.evaluate(() => new Promise((ok) => { let suite = 0; testextjs.view.commandemanagement.ReserveApresEntreeFenetre.afficherPuis([], () => { suite++; });
      setTimeout(() => ok({ suite, fenetres: Ext.ComponentQuery.query('reserveapresentree').length }), 300); }));
    ok('Sans produit concerné : aucune fenêtre, la suite habituelle reprend', sans.suite === 1 && sans.fenetres === 0, JSON.stringify(sans));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produit remis à l\'identique', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q(`SELECT CONCAT_WS('|', bool_RESERVE, int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${P}'`) === '0|' + STOCK
      && q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}'`) === '0' && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_NAME LIKE 'e2e_rae%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
