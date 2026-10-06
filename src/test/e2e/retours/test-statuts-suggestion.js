/* STATUTS DE SUGGESTION ET COLISAGE (plan d'octobre, lot L3 : sections 1.3 et 1.6).
 *
 * Decisions du 06/10 : a l'ouverture « En cours » ; « Clôturée » quand la quantite du dernier produit est validee ; la
 * question « Voulez-vous générer le fichier CSV ? » -> Oui : fichier + « Commandée » (preuve : date, mode) ; action
 * « Marquer comme commandée » ; colisage rappele en colonne (informatif).
 *
 * Ce que le test etablit, sur le vrai ecran (jeu d'essai retire a la fin, colisage remis) :
 *  - liste : AUTO a la pose ; ouverture -> « EN COURS » ; filtre par statut ;
 *  - grille de traitement : colonne COLIS. (12 pour le produit qui en a un, « — » sinon) ;
 *  - validation (Entree) de la quantite du dernier produit -> statut cloturee + date ; question CSV ; « Non » -> reste
 *    clôturée, retour a la liste ;
 *  - rouvrir une suggestion clôturée la remet « En cours » (comme avant) ; dernier produit puis « Oui » -> commandee,
 *    mode CSV, date, utilisateur ; le fichier CSV est bien demande ;
 *  - rouvrir une suggestion commandée ne lui retire pas son statut ;
 *  - « Marquer comme commandée » sur une seconde suggestion -> commandee, mode MANUEL ; l'icone disparait ;
 *  - une suggestion commandée ne se fusionne pas ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAPT = process.env.CAPTURES || '/tmp';
const S1 = 'E2E-STA-S1', S2 = 'E2E-STA-S2', R1 = 'E2E-STA-REF1', R2 = 'E2E-STA-REF2';
let p1, p2, colisAvant;

function nettoyer() {
  exec("DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID IN ('" + S1 + "','" + S2 + "');"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN ('" + S1 + "','" + S2 + "');"
    + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + S1 + "','" + S2 + "');");
  if (p1) { exec("UPDATE t_famille SET int_COLISAGE = " + (colisAvant === 'NULL' || colisAvant === '' ? 'NULL' : colisAvant) + " WHERE lg_FAMILLE_ID = '" + p1 + "'"); }
}

function poser() {
  const arts = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT f.lg_FAMILLE_ID, f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_COLISAGE IS NULL AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.str_NAME LIMIT 2) x").split('|');
  [p1, p2] = arts;
  colisAvant = q("SELECT IFNULL(int_COLISAGE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + p1 + "'");
  exec("UPDATE t_famille SET int_COLISAGE = 12 WHERE lg_FAMILLE_ID = '" + p1 + "'");
  const g = q("SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1");
  exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES"
    + " ('" + S1 + "', '" + R1 + "', '" + g + "', 'auto', NOW(), NOW()), ('" + S2 + "', '" + R2 + "', '" + g + "', 'is_Process', NOW(), NOW())");
  [[S1, p1, 'A'], [S1, p2, 'B'], [S2, p1, 'C']].forEach(([s, f, k]) => exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID,"
    + " lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
    + " VALUES ('E2E-STA-L" + k + "', '" + s + "', '" + g + "', '" + f + "', 2, 200, 150, 100, NOW(), NOW(), 'is_Process', 0)"));
}

(async () => {
  try { nettoyer(); } catch (e) { /* rien */ }
  poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const csv = []; p.on('request', (r) => { if (/suggestion\/csv/.test(r.url())) { csv.push(r.url()); } });
  const statut = (s) => q("SELECT CONCAT(str_STATUT, '|', dt_CLOTURE IS NOT NULL, '|', dt_COMMANDEE IS NOT NULL, '|', IFNULL(str_MODE_COMMANDE, ''), '|', lg_USER_COMMANDE_ID IS NOT NULL) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + s + "'");
  const liste = async (ref, filtre) => {
    await p.evaluate((a) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.down('#filtreStatut').setValue(a.filtre || ''); Ext.getCmp('rechecher').setValue(a.ref); g.onRechClick(); }, { ref, filtre });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('i_sugg_manager')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    return p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const i = g.getStore().findExact('str_REF', ref); if (i < 0) { return null; }
      const n = g.getView().getNode(i); const col = g.query('gridcolumn[dataIndex=str_STATUT]')[0];
      const ic = n.querySelector('.x-grid-cell-marquerCommandee .x-action-col-icon');
      return { statut: n.querySelector('.x-grid-cell-' + col.getId()).textContent.trim(), icone: !!ic && !ic.classList.contains('x-hide-display') }; }, ref);
  };
  const ouvrirListe = async () => {
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0 && Ext.ComponentQuery.query('i_sugg_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  const ouvrir = async (ref, n) => {
    await liste(ref, '');
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', ref)); }, ref);
    await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === n; }, n, { timeout: 30000 });
    await p.waitForTimeout(1200);
  };
  /* Validation de la quantite du DERNIER produit, au clavier, comme l'utilisateur. */
  const validerDernier = async () => {
    await p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); const pl = g.getPlugin('cellplugin'); if (pl.activeEditor) { pl.completeEdit(); }
      const last = g.getStore().getCount() - 1; g.getSelectionModel().select(last); Me_Window.focusCell(g, last); });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); const pl = g.getPlugin('cellplugin'); return pl.activeEditor && pl.activeRecord === g.getStore().getAt(g.getStore().getCount() - 1); }, null, { timeout: 10000 });
    await p.keyboard.press('Control+A'); await p.keyboard.type('3'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /CSV/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 20000 });
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await ouvrirListe();
    const l0 = await liste(R1, '');
    ok('Liste : AUTO à la pose, action « Marquer comme commandée » visible', l0 && l0.statut === 'AUTO' && l0.icone, JSON.stringify(l0));
    ok('Filtre « Commandée » : la suggestion n\'y est pas', (await liste(R1, 'commandee')) === null);
    ok('Filtre « Auto » : elle y est', (await liste(R1, 'auto')) !== null);

    /* Ouverture -> En cours ; colisage */
    await ouvrir(R1, 2);
    ok('Ouverture : statut « pending » (En cours) comme avant', statut(S1).startsWith('pending|0|0'), statut(S1));
    const colis = await p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); const col = g.down('gridcolumn[dataIndex=int_COLISAGE]');
      return [0, 1].map((i) => g.getView().getNode(i).querySelector('.x-grid-cell-' + col.getId()).textContent.trim()); });
    ok('Colonne COLIS. : 12 pour le produit qui a un colisage, « — » sinon', colis[0] === '12' && colis[1] === '—', JSON.stringify(colis));
    await p.screenshot({ path: CAPT + '/suggestion-colisage.png' });

    /* Dernier produit -> cloturee, question CSV, Non */
    await validerDernier();
    ok('Dernier produit validé : statut « cloturee » avec sa date', statut(S1).startsWith('cloturee|1|0'), statut(S1));
    await p.screenshot({ path: CAPT + '/suggestion-question-csv.png' });
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.no.getId()));
    await p.waitForTimeout(1500);
    ok('« Non » : reste clôturée, aucun fichier', statut(S1).startsWith('cloturee|1|0') && csv.length === 0, statut(S1));
    await ouvrirListe();
    const l1 = await liste(R1, 'cloturee');
    ok('Liste : « CLÔTURÉE », trouvée par le filtre', l1 && l1.statut === 'CLÔTURÉE', JSON.stringify(l1));

    /* Rouvrir -> En cours ; dernier produit -> Oui -> commandee CSV */
    await ouvrir(R1, 2);
    ok('Rouvrir une suggestion clôturée : « En cours » (comme avant)', statut(S1).startsWith('pending'), statut(S1));
    await validerDernier();
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId()));
    await p.waitForFunction(() => true, null, { timeout: 1000 });
    await p.waitForTimeout(2500);
    ok('« Oui » : commandée, mode CSV, date et utilisateur ; fichier CSV demandé', statut(S1) === 'commandee|1|1|CSV|1' && csv.length === 1, statut(S1) + ' / ' + csv.length);
    await ouvrirListe();
    const l2 = await liste(R1, 'commandee');
    ok('Liste : « COMMANDÉE · CSV », icône « Marquer » masquée', l2 && l2.statut === 'COMMANDÉE · CSV' && !l2.icone, JSON.stringify(l2));
    await p.screenshot({ path: CAPT + '/suggestion-statuts.png' });

    /* Rouvrir une commandee ne la defait pas */
    await ouvrir(R1, 2);
    ok('Rouvrir une suggestion commandée : elle le reste', statut(S1) === 'commandee|1|1|CSV|1', statut(S1));
    await ouvrirListe();

    /* Marquer comme commandee (manuel) */
    await liste(R2, '');
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const i = g.getStore().findExact('str_REF', ref);
      g.getView().getNode(i).querySelector('.x-grid-cell-marquerCommandee .x-action-col-icon').setAttribute('data-e2e', 'marquer'); }, R2);
    await p.click('[data-e2e=marquer]');
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 10000 });
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId()));
    await p.waitForTimeout(2000);
    ok('« Marquer comme commandée » : commandee, mode MANUEL', statut(S2) === 'commandee|1|1|MANUEL|1', statut(S2));
    const l3 = await liste(R2, '');
    ok('Liste : « COMMANDÉE · MANUEL », icône masquée', l3 && l3.statut === 'COMMANDÉE · MANUEL' && !l3.icone, JSON.stringify(l3));

    /* Une commandee ne se fusionne pas */
    const fus = await p.evaluate(async (ids) => (await fetch('../api/v1/suggestion/merge-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestionId: ids }) })).json(), [S1, S2]);
    ok('Fusion d\'une suggestion commandée : refusée', fus.success === false && /commandée/.test(fus.msg), JSON.stringify(fus));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, colisage remis', q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + S1 + "','" + S2 + "')") === '0'
      && q("SELECT IFNULL(int_COLISAGE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + p1 + "'") === colisAvant);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
