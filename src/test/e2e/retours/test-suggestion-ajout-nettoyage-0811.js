/* PLAN DU 08/11, POINTS 11.1 ET 11.2 : SUGGESTION DE REAPPRO OUVERTE.
 *
 * 11.1 « quand j'ajoute un produit a une suggestion existante il ne s'affiche pas, il faut sortir et rouvrir ».
 *      Cause : la liste est triee par nom, par pages de 10, et l'ajout rechargeait la page 1.
 * 11.2 « Nettoyer la suggestion » doit compter la reserve : rayon 26, seuil 50, reserve 502 -> le produit sort.
 *      La regle est celle de l'entree en suggestion (RegleSeuilSuggestion, option KEY_OPTION_SUGGESTION).
 *
 * Jeu d'essai (retire a la fin) : une suggestion de 12 produits « bouche-trou » (seuil tres haut : ils restent) et
 * 5 produits de cas, rayon r de chacun lu en base :
 *   N1 gere en reserve, seuil r + 24, reserve 502   -> sort (rayon + reserve au-dessus du seuil)
 *   N2 gere en reserve, seuil r + 10, reserve 5     -> reste
 *   N3 non gere,        seuil r + 10, reserve 50    -> reste (une reserve non geree ne compte pas)
 *   N4 non gere,        seuil r - 1                 -> sort (comme avant)
 *   N5 non gere,        seuil r                     -> option « < » : sort (au seuil, il n'entrerait pas) ; « <= » : reste
 * Par les ecrans : liste des suggestions > recherche de la reference > « Modifier » ;
 *  - 11.1 : saisie d'un produit de fin d'alphabet (CIP tape, Entree, quantite 2, Entree) : il s'affiche aussitot,
 *    selectionne, sans rouvrir ; une seule ligne en base, quantite 2 ;
 *  - 11.2 : « Nettoyer la suggestion », Oui : les lignes attendues sortent, les autres restent ; la grille suit la
 *    base ; chaque retrait est journalise (t_suggestion_ligne_retiree), rien d'autre.
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const SUGG = 'E2E-NET-SUGG', REF = 'E2E-NET-REF', MARQUE = 'E2E-NET-';
const OPTION = q("SELECT TRIM(str_VALUE) FROM t_parameters WHERE str_KEY = 'KEY_OPTION_SUGGESTION'") || '<=';
let bouche = [], cas = [], Z = null;
const ORIGINE = {};

function produits(cond, n, exclus) {
  return q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE, f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 2 AND 400 AND f.int_CIP REGEXP '^[0-9]{6,13}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
    + " AND (SELECT COUNT(*) FROM t_famille_stock y WHERE y.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND y.lg_EMPLACEMENT_ID = '1') = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2')"
    + (exclus.length ? " AND f.lg_FAMILLE_ID NOT IN (" + exclus.map((x) => "'" + x + "'").join(',') + ')' : '')
    + ' AND ' + cond + ' ORDER BY f.str_NAME LIMIT ' + n).split(/\r?\n/).filter(Boolean).map((l) => { const [id, r, cip] = l.split('|'); return { id, r: Number(r), cip }; });
}

function nettoyer() {
  C.exec("DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';"
    + "DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '" + MARQUE + "%'");
  Object.keys(ORIGINE).forEach((id) => { const [res, seuil] = ORIGINE[id];
    C.exec(`UPDATE t_famille SET bool_RESERVE = ${res}, int_SEUIL_MIN = ${seuil} WHERE lg_FAMILLE_ID = '${id}'`); });
}

function sauver(id) {
  ORIGINE[id] = q(`SELECT CONCAT_WS('|', IFNULL(bool_RESERVE, 'NULL'), IFNULL(int_SEUIL_MIN, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`).split('|');
}

function poser() {
  bouche = produits("f.str_NAME LIKE 'A%'", 12, []);
  cas = produits("f.str_NAME LIKE 'B%'", 5, []);
  Z = produits("f.str_NAME >= 'V'", 1, [])[0];
  if (bouche.length !== 12 || cas.length !== 5 || !Z) { return 'produits insuffisants'; }
  [...bouche, ...cas, Z].forEach((x) => sauver(x.id));
  bouche.forEach((x) => C.exec(`UPDATE t_famille SET bool_RESERVE = 0, int_SEUIL_MIN = 100000 WHERE lg_FAMILLE_ID = '${x.id}'`));
  C.exec(`UPDATE t_famille SET bool_RESERVE = 0, int_SEUIL_MIN = 100000 WHERE lg_FAMILLE_ID = '${Z.id}'`);
  const regles = [[1, 24, 502], [1, 10, 5], [0, 10, 50], [0, -1, null], [0, 0, null]];
  cas.forEach((x, i) => { const [gere, delta, reserve] = regles[i];
    C.exec(`UPDATE t_famille SET bool_RESERVE = ${gere}, int_SEUIL_MIN = ${x.r + delta} WHERE lg_FAMILLE_ID = '${x.id}'`);
    if (reserve !== null) {
      C.exec("INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
        + ` VALUES ('${MARQUE}${i}', '${x.id}', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', ${reserve})`);
    } });
  const grossiste = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
  C.exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}', '${grossiste}', 'is_Process', NOW(), NOW())`);
  [...bouche, ...cas].forEach((x, i) => C.exec('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,'
    + ` int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${MARQUE}L${String(i).padStart(2, '0')}', '${SUGG}', '${grossiste}', '${x.id}', 1, 100, 150, 100, NOW(), NOW(), 'is_Process', 0)`));
  return null;
}

const lignes = () => q(`SELECT lg_FAMILLE_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`).split(/\r?\n/).filter(Boolean);

(async () => {
  try { nettoyer(); } catch (e) { /* rien */ }
  let erreur;
  try { erreur = poser(); } catch (e) { erreur = String(e.message).split('\n')[0]; }
  if (erreur) { console.log('FATAL : ' + erreur); nettoyer(); process.exit(1); }
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    ok('Préparation : 17 lignes, option ' + OPTION, lignes().length === 17);
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.click('#rechecher-inputEl');
    await p.keyboard.type(REF, { delay: 20 });
    await p.keyboard.press('Enter');
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: REF }).first();
    await rangee.waitFor({ timeout: 30000 });
    await rangee.locator('img[data-qtip="Modifier"], .x-action-col-icon[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);

    /* ----- 11.1 : ajout d'un produit de fin d'alphabet ----- */
    /* la grille prend le focus de sa premiere ligne a l'ouverture : on saisit une fois l'ecran pose, et on verifie */
    await p.waitForTimeout(2500);
    for (let essai = 0; essai < 3; essai++) {
      await p.click('#str_NAME-inputEl');
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Backspace');
      await p.keyboard.type(Z.cip, { delay: 60 });
      if (await p.evaluate((cip) => Ext.getCmp('str_NAME').getRawValue() === cip, Z.cip)) { break; }
      await p.waitForTimeout(1000);
    }
    await p.waitForFunction((cip) => { const c = Ext.getCmp('str_NAME'); const l = c.getPicker(); return l && l.isVisible() && c.getStore().findExact('CIP', cip) >= 0; }, Z.cip, { timeout: 30000 })
      .catch(async (e) => { console.log('DEBUG ' + JSON.stringify(await p.evaluate(() => { const c = Ext.getCmp('str_NAME'); const s = c.getStore();
        return { brut: c.getRawValue(), n: s.getCount(), charge: s.isLoading(), un: s.getCount() ? s.getAt(0).data : null, picker: !!c.picker && c.picker.isVisible() }; }))); throw e; });
    await p.waitForTimeout(400);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.getCmp('int_QUANTITE').hasFocus, null, { timeout: 15000 }).catch(() => {});
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2', { delay: 30 });
    await p.keyboard.press('Enter');
    let enBase = '';
    for (let k = 0; k < 30 && !enBase; k++) { await p.waitForTimeout(500); enBase = q(`SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}' AND lg_FAMILLE_ID = '${Z.id}'`); }
    await p.waitForFunction(() => !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const vu = await p.evaluate((id) => { const g = Ext.getCmp('gridpanelSuggestionID'), s = g.getStore();
      const r = s.findRecord('lg_FAMILLE_ID', id, 0, false, true, true);
      return { affiche: !!r, selectionne: !!r && g.getSelectionModel().isSelected(r), page: s.currentPage, qte: r ? Number(r.get('int_NUMBER')) : null }; }, Z.id);
    ok('11.1 : en base, une seule ligne, quantité 2', enBase === '2' && q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}' AND lg_FAMILLE_ID = '${Z.id}'`) === '1', enBase);
    ok('11.1 : le produit ajouté s\'affiche aussitôt (sans rouvrir), sur sa page, sélectionné', vu.affiche && vu.selectionne && vu.qte === 2, JSON.stringify(vu));

    /* ----- 11.2 : Nettoyer la suggestion ----- */
    const avant = lignes();
    /* plan du 08/11, point 11.3 : confirmation dans le bouton (premier clic), plus de fenetre */
    await p.click('#btn_clean_sugg');
    await p.waitForFunction(() => /Confirmer/.test(Ext.getCmp('btn_clean_sugg').getText()), null, { timeout: 15000 });
    await p.waitForTimeout(600);
    await p.click('#btn_clean_sugg');
    for (let k = 0; k < 30 && lignes().length === avant.length; k++) { await p.waitForTimeout(500); }
    await p.waitForTimeout(1500);
    const apres = lignes();
    const attendu = [true, false, false, true, OPTION === '<'];
    const constat = cas.map((x, i) => ({ cas: 'N' + (i + 1), retire: !apres.includes(x.id), attendu: attendu[i] }));
    ok('11.2 : N1 (26/50/502) sort, N2 et N3 restent, N4 sort, N5 selon l\'option', constat.every((c) => c.retire === c.attendu), JSON.stringify(constat));
    ok('11.2 : les bouche-trou et le produit ajouté restent', [...bouche, Z].every((x) => apres.includes(x.id)), apres.length + ' lignes');
    const retirees = q(`SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`);
    ok('Bilan : un retrait journalisé par ligne sortie, rien d\'autre', Number(retirees) === avant.length - apres.length && Number(retirees) === attendu.filter(Boolean).length, retirees);
    await p.waitForFunction(() => !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
    const total = await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').getStore().getTotalCount());
    ok('Rapprochement : le total de la grille = lignes en base', total === apres.length, total + ' / ' + apres.length);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close().catch(() => {});
    nettoyer();
    C.nettoyer();
    ok('Jeu d\'essai retiré, fiches remises', q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${MARQUE}%'`) === '0'
      && Object.keys(ORIGINE).every((id) => q(`SELECT CONCAT_WS('|', IFNULL(bool_RESERVE, 'NULL'), IFNULL(int_SEUIL_MIN, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`) === ORIGINE[id].join('|')));
    process.exit(A.bilan() ? 1 : 0);
  }
})();
