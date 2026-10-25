/* ENTREE EN STOCK (retours du 25/10, point 10). Par l'ecran « Bon de livraison », admin.
 * Jeu d'essai : un produit gere en reserve (capacite maxi rayon = son stock rayon), un bon d'essai de 2 unites, et une
 * suggestion de reserve automatique deja ouverte qui contient un autre produit. Detail du bon :
 *  - « Infos générales » : la colonne des etiquettes tient sur 3 lignes, comme les autres (libelles a gauche) ;
 *  - « Retour » et « ENTREE EN STOCK » au style des boutons de « Suivi dossier client » ;
 *  - apres l'entree : fenetre « Seuil de réserve atteint » avec « Imprimer » (impression sans onglet ni fenetre) ;
 *  - « Ouvrir la suggestion » : seuls les produits du bon s'affichent, avec « Tout afficher » pour le reste ;
 *    avant « Traiter », tout est de nouveau affiche ;
 *  - sans le droit « Gestion des réserves » : message clair, pas d'ouverture, « Imprimer » reste ;
 *  - fenetre des produits en avoir : « Veuillez mettre ces produits de côté » en rouge clignotant ;
 *  - aucune erreur JavaScript. Tout est retire : bon, commande, lots, mouvements, suggestions ; produit remis ; droit remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const BL = 'E2E-EST-BL', DET = 'E2E-EST-BLD', ORD = 'E2E-EST-ORD', TSF = 'E2E-EST-TSF', SUG = 'E2E-EST-SUG';
const REF = 'E2EEST' + String(Date.now()).slice(-6);
const debut = q('SELECT NOW()');
const droitReserve = privilegeEssai(q, exec, 'admin', 'P_SM_RESERVE');
const [P, G, STOCK] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 3").split('|');
const AUTRE = q(`SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND lg_FAMILLE_ID <> '${P}' ORDER BY lg_FAMILLE_ID LIMIT 1`);
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_est_${t}; CREATE TABLE e2e_est_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${P}';`));
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
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_est_t_famille'") === '1') {
    /* mise a jour depuis la copie (une suppression bute sur les cles etrangeres) */
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_est_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_est_${t};`);
    });
  }
}

(async () => {
  remettre();
  droitReserve.remettre();
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '${SUG}'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${SUG}';`);
  ok('Précondition : un produit en stock au rayon, avec grossiste', !!P && !!G && Number(STOCK) >= 3, P + ' stock ' + STOCK);
  sauver();
  exec(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = ${STOCK}, int_SEUIL_MINI_RAYON = 1 WHERE lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT, int_NUMBER)`
    + ` SELECT '${TSF}', '${P}', '2', '1', 'reserve', 'reserve', NOW(), 'enable', 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${P}' AND lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1');`
    + `INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', 1, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = 'admin';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 2 * f.int_PAF, 0, 2 * f.int_PAF, '${ORD}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID = '${P}' AND u.str_LOGIN = 'admin';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${DET}', '${G}', f.lg_FAMILLE_ID, '${BL}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${STOCK} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`
    /* suggestion automatique deja ouverte, avec un autre produit */
    + `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, dt_UPDATED, motif_id)`
    + ` SELECT '${SUG}', 'SR-E2E-EST', 'RESERVE', 'AUTOMATIQUE', 'A_TRAITER', '1', NOW() + INTERVAL 1 MINUTE, NOW(), (SELECT motif_id FROM t_suggestion_reserve WHERE motif_id IS NOT NULL LIMIT 1);`
    + `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE, str_ETAT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${SUG}-1', '${SUG}', '${AUTRE}', 3, 3, 0, 'PROPOSEE', NOW(), NOW());`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [];
  let pages = 0;
  const connexion = async (ctx) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    return p;
  };
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    ctx.on('page', () => { pages++; });
    const p = await connexion(ctx);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, BL);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible() && Ext.getCmp('int_NUMBER_ETIQUETTE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const ig = await p.evaluate(() => {
      const cols = Ext.getCmp('int_NUMBER_ETIQUETTE').up('fieldset').items.items.map((c) => Math.round(c.getHeight()));
      const r = Ext.getCmp('btn_cancel'), e = Ext.getCmp('btn_enterstock');
      return { cols, retour: r.hasCls('ordo-btn'), entree: e.hasCls('ordo-btn-primaire'), fondEntree: getComputedStyle(e.getEl().dom).backgroundColor };
    });
    ok('Infos générales : la colonne des étiquettes tient sur la hauteur des autres (3 lignes)', ig.cols[2] <= ig.cols[0] + 12, JSON.stringify(ig.cols));
    ok('Retour et ENTREE EN STOCK au style de « Suivi dossier client »', ig.retour && ig.entree && ig.fondEntree === 'rgb(23, 152, 126)', JSON.stringify(ig));

    const repondre = async (motif, bouton) => {
      await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await p.evaluate((x) => { Ext.Msg.down('button[itemId=' + x + ']').btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(300);
    };
    await p.evaluate(() => { Ext.getCmp('btn_enterstock').btnEl.dom.click(); });
    await repondre('UNITÉS GRATUITES', 'yes');
    await repondre("Confirmer l'entrée en stock", 'yes');
    await repondre('impression des entrées', 'no');
    await p.waitForFunction(() => Ext.ComponentQuery.query('reserveapresentree').some((w) => w.isVisible()), null, { timeout: 30000 });
    const f = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reserveapresentree')[0];
      return { imprimer: !!w.down('#btnImprimer') && w.down('#btnImprimer').isVisible(), ouvrir: w.down('#btnOuvrirSuggestion').isVisible(), sansDroit: !!w.getEl().dom.querySelector('.rae-sans-droit') }; });
    ok('Fenêtre « Seuil de réserve atteint » : Imprimer et Ouvrir la suggestion', f.imprimer && f.ouvrir && !f.sansDroit, JSON.stringify(f));
    const avant = pages;
    await p.evaluate(() => Ext.ComponentQuery.query('reserveapresentree #btnImprimer')[0].btnEl.dom.click());
    await p.waitForTimeout(1500);
    const imp = await p.evaluate(() => { const c = document.getElementById('rae-impression'); return c ? c.contentWindow.document.body.innerText : ''; });
    const nomP = q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
    ok('Imprimer : la liste (produit, à déplacer) part à l\'impression, sans onglet ni fenêtre', imp.includes(nomP) && /À déplacer/.test(imp) && pages === avant, imp.slice(0, 160));

    await p.evaluate(() => Ext.ComponentQuery.query('reserveapresentree #btnOuvrirSuggestion')[0].btnEl.dom.click());
    await p.waitForFunction(() => Ext.ComponentQuery.query('reservetraitementsuggestion').some((w) => w.win && w.win.isVisible() && !w.win.down('grid').getStore().isLoading()), null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    let s = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible()), g = w.win.down('grid'), st = g.getStore();
      const b = g.down('#filtreBon'); return { ids: st.collect('lg_FAMILLE_ID'), total: (st.snapshot || st.data).getCount(), bandeau: b && b.isVisible() ? b.getEl().dom.innerText : '' }; });
    ok('Suggestion ouverte : seulement le produit du bon, bandeau « Tout afficher »', s.ids.length === 1 && s.ids[0] === P && s.total === 2 && /1.*sur 2/.test(s.bandeau) && /Tout afficher/.test(s.bandeau), JSON.stringify(s));
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible()); w.win.down('#filtreBon').getEl().dom.querySelector('a').click(); });
    await p.waitForTimeout(500);
    s = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible()), g = w.win.down('grid');
      return { n: g.getStore().getCount(), bandeau: g.down('#filtreBon').isVisible() }; });
    ok('« Tout afficher » : les 2 produits de la suggestion', s.n === 2 && !s.bandeau, JSON.stringify(s));
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible()); if (w) { w.win.close(); } });

    /* avoirs : consigne en rouge clignotant (meme fenetre qu'apres l'entree en stock) */
    const av = await p.evaluate(() => { const w = Ext.create('testextjs.view.commandemanagement.AvoirsBonFenetre', { bonId: 'x', donnees: { success: true, total: 1, reference: 'E2E',
      data: [{ produit: 'PRODUIT E2E', cip: '1234567', client: 'CLIENT E2E', telephone: '', reference: 'V1', date: '25/10/2026', quantiteDue: 1, quantiteRecue: 1 }] } });
      w.show(); const e = w.getEl().dom.querySelector('.va-cote'); const r = e ? { texte: e.innerText, couleur: getComputedStyle(e).color, anim: getComputedStyle(e).animationName } : null; w.close(); return r; });
    ok('Produits en avoir : « Veuillez mettre ces produits de côté » en rouge clignotant', av && av.texte === 'Veuillez mettre ces produits de côté' && av.couleur === 'rgb(198, 40, 40)' && av.anim === 'vaClignote', JSON.stringify(av));

    /* sans le droit « Gestion des réserves » */
    droitReserve.retirer();
    const p2 = await connexion(await b.newContext({ viewport: { width: 1600, height: 950 } }));
    const lignes = [{ suggestionId: SUG, ref: 'SR-E2E-EST', categorie: 'RESERVE', cip: '1234567', nom: 'PRODUIT E2E', stockRayon: 5, stockReserve: 0, seuil: 3, quantite: 2, produitId: P }];
    const sd = await p2.evaluate((l) => { const w = testextjs.view.commandemanagement.ReserveApresEntreeFenetre.afficherPuis(l, null);
      const m = w.getEl().dom.querySelector('.rae-sans-droit'); return { message: m ? m.innerText : '', ouvrir: w.down('#btnOuvrirSuggestion').isVisible(), imprimer: w.down('#btnImprimer').isVisible(), fermer: w.down('#btnPlusTard').getText() }; }, lignes);
    ok('Sans le droit Réserve : message clair, pas d\'ouverture, Imprimer reste', /pas le droit de traiter la réserve.*imprimez-la/.test(sd.message) && !sd.ouvrir && sd.imprimer && sd.fermer === 'Fermer', JSON.stringify(sd));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    droitReserve.remettre();
    remettre();
    exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '${SUG}'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${SUG}';`);
    ok('Données d\'essai retirées, produit et droit remis', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q(`SELECT CONCAT_WS('|', bool_RESERVE, int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${P}'`) === '0|' + STOCK
      && q(`SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${SUG}'`) === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID = rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'admin' AND p.str_NAME = 'P_SM_RESERVE'") === '1');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
