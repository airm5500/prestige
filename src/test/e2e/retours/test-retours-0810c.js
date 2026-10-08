/* RETOURS DU 08/10 (3e serie). Par les ecrans, admin ; le jeu d'essai est retire a la fin.
 *  - commandes : detail lu par l'ancien ecran (JSP « commandes du grossiste ») sans erreur quand la colonne lots vaut
 *    « [] » ; commande dont une ligne n'a pas de prix de vente : ouverture sans erreur ;
 *  - menus : libelles en MAJUSCULES ; « Liste des ruptures de stock » desactive ;
 *  - fenetres du nouveau theme : bouton Fermer visible (croix blanche) et fonctionnel ;
 *  - suggestions : statut en pastille a bords arrondis ; barre d'infos produit aux libelles abreges (complets en
 *    info-bulle) ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const CMD = 'E2E-0810C-CMD', SUGG = 'E2E-0810C-SUG';
let G, P;
function nettoyer() {
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';");
}

(async () => {
  G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'DPCI'");
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 2) x").split('|');
  nettoyer();
  /* ligne ecrite comme par les ecrans recents : lots = « [] » ; seconde ligne sans prix de vente */
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0);"
    + "INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_QTE_MANQUANT, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED, lots) VALUES"
    + " ('" + CMD + "-1', '" + CMD + "', '" + P[0] + "', '" + G + "', 2, 2, 2000, 1000, 1500, 'is_Process', NOW(), NOW(), '[]'),"
    + " ('" + CMD + "-2', '" + CMD + "', '" + P[1] + "', '" + G + "', 1, 1, 1000, 1000, NULL, 'is_Process', NOW(), NOW(), '[]')");
  exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + SUGG + "', '" + SUGG + "-REF', '" + G + "', 'is_Process', NOW(), NOW());"
    + "INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
    + " VALUES ('" + SUGG + "-L1', '" + SUGG + "', '" + G + "', '" + P[0] + "', 2, 200, 1500, 1000, NOW(), NOW(), 'is_Process', 0)");
  const debutLog = fs.statSync(LOG).size;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* 1) commandes */
    const jsp = await p.evaluate(async (g) => { const r = await fetch('../webservices/commandemanagement/order/ws_data_order_passed_grossiste.jsp?lg_GROSSISTE_ID=' + g);
      return { code: r.status, texte: (await r.text()).trim().slice(0, 200000) }; }, G);
    /* l'ancien ecran repond au format « ({...}) » apres des lignes vides */
    const lu = (() => { try { return JSON.parse(jsp.texte.slice(jsp.texte.indexOf('({') + 1, jsp.texte.lastIndexOf('})') + 1)); } catch (e) { return null; } })();
    const journal = fs.readFileSync(LOG, 'utf8').slice(debutLog);
    ok('Ancien écran « commandes du grossiste » : lu sans erreur avec lots = « [] » (plus d\'EclipseLink-3002)', jsp.code === 200 && lu && JSON.stringify(lu).includes(CMD)
      && !/EclipseLink-3002/.test(journal), jsp.code + ' ' + jsp.texte.slice(0, 200));
    const items = await p.evaluate(async (id) => { const r = await fetch('../api/v1/commande/commande-en-cours-items?orderId=' + id + '&start=0&limit=50');
      return { code: r.status, texte: await r.text() }; }, CMD);
    const it = (() => { try { return JSON.parse(items.texte); } catch (e) { return null; } })();
    const lignes = it ? (it.data || it.results || it) : [];
    ok('Commande avec une ligne sans prix de vente : ouverture sans erreur, 2 lignes', items.code === 200 && Array.isArray(lignes) && lignes.length === 2
      && !/CommandeEncourDetailDTO/.test(fs.readFileSync(LOG, 'utf8').slice(debutLog)), items.code + ' ' + items.texte.slice(0, 300));

    /* 2) menus */
    const minus = q("SELECT COUNT(*) FROM t_menu WHERE BINARY str_DESCRIPTION <> BINARY UPPER(str_DESCRIPTION) OR BINARY str_VALUE <> BINARY UPPER(str_VALUE)");
    const nav = await p.evaluate(() => { const out = []; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { out.push(n.get('text')); }); return out.join(' | '); });
    ok('Menus : tous les libellés en MAJUSCULES (RESSOURCES HUMAINES, CENTRE DE SUPPORT)', minus === '0' && /RESSOURCES HUMAINES/.test(nav) && /CENTRE DE SUPPORT/.test(nav), minus);
    ok('Menu « Liste des ruptures de stock » désactivé', q("SELECT str_Status FROM t_sous_menu WHERE lg_SOUS_MENU_ID = '57211545311829336645'") === 'disable');

    /* 3) bouton Fermer des fenetres du theme */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('grossistemanager', 'Grossistes', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; g.onEditClick(g, 0); });
    await p.waitForTimeout(1200);
    const outil = await p.evaluate(() => { const w = Ext.WindowManager.getActive(); const img = w.header.el.dom.querySelector('.x-tool-close'); const cs = getComputedStyle(img);
      const t = img.closest('.x-tool'); t.id = t.id || 'e2e-fermer'; const r = img.getBoundingClientRect();
      return { theme: /fen-theme/.test(w.el.dom.className), svg: /svg/.test(cs.backgroundImage), opacite: cs.opacity, l: r.width, id: t.id, titre: w.title }; });
    ok('Fenêtre du thème : bouton Fermer visible (croix blanche, opacité 1)', outil.theme && outil.svg && outil.opacite === '1' && outil.l >= 12, JSON.stringify(outil));
    await p.screenshot({ path: SORTIE + '/bouton-fermer.png', clip: { x: 700, y: 60, width: 666, height: 120 } });
    await p.click('#' + outil.id);
    await p.waitForTimeout(600);
    const ferme = await p.evaluate((t) => !Ext.ComponentQuery.query('window').some((w) => w.title === t && w.isVisible() && !w.isDestroyed), outil.titre);
    ok('Clic sur la croix : la fenêtre se ferme', ferme);

    /* 4) suggestions : statut en pastille, barre d'infos abregee */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); }, SUGG + '-REF');
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', ref) >= 0; }, SUGG + '-REF', { timeout: 30000 });
    const pastille = await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const n = g.getView().getNode(g.getStore().findExact('str_REF', ref));
      const s = n.querySelector('.statut-sugg'); const cs = s && getComputedStyle(s);
      return s ? { texte: s.textContent, rayon: parseFloat(cs.borderTopLeftRadius), fond: cs.backgroundColor, cellule: getComputedStyle(s.closest('td')).backgroundColor } : null; }, SUGG + '-REF');
    ok('Statut de la suggestion en pastille à bords arrondis (« MANUELLE »), cellule non colorée', pastille && pastille.texte === 'MANUELLE' && pastille.rayon >= 8 && pastille.fond !== 'rgba(0, 0, 0, 0)', JSON.stringify(pastille));
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', ref)); }, SUGG + '-REF');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); g.getSelectionModel().select(0); });
    await p.waitForFunction(() => /Date dern\. entrée/.test(Ext.getCmp('suggInfoBar').getEl().dom.textContent), null, { timeout: 20000 });
    const barre = await p.evaluate(() => { const d = Ext.getCmp('suggInfoBar').getEl().dom; return { t: d.textContent, bulles: [...d.querySelectorAll('[data-qtip]')].map((x) => x.getAttribute('data-qtip')) }; });
    ok('Barre d\'infos produit : libellés abrégés (Date dern. entrée, Fréq.achat, Qté entrée, Stock Res, VMH (MOY/4), Moy d\'achat 3mois)',
      /Date dern\. entrée/.test(barre.t) && /Fréq\.achat \(\w+\)/.test(barre.t) && /Qté entrée \(\w+\)/.test(barre.t) && /Stock Res :/.test(barre.t) && /VMH \(MOY\/4\)/.test(barre.t)
      && /Moy d'achat 3mois/.test(barre.t) && !/Fréquence achat|Vente hebdo|Stock Reserve/.test(barre.t), barre.t);
    ok('Libellés complets en info-bulle', barre.bulles.some((x) => /Date de la dernière entrée/.test(x)) && barre.bulles.some((x) => /Vente moyenne hebdomadaire/.test(x)), JSON.stringify(barre.bulles));
    await p.screenshot({ path: SORTIE + '/suggestion-infos-abregees.png' });
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0' && q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
