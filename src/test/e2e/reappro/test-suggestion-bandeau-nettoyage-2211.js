/* PLAN DU 21/11, POINT 4.1 : BANDEAU « NETTOYER LA SUGGESTION ? » A L'OUVERTURE D'UNE SUGGESTION DE REAPPRO.
 *
 * Nettoyage automatique coupe (KEY_NETTOYER_SUGGESTION_OUVERTURE a 0, par defaut) et produits repasses au-dessus du
 * seuil : un bandeau en haut de la suggestion ouverte (pas de fenetre) dit combien, et propose « Oui, nettoyer » (meme
 * nettoyage que le bouton) ou « Non, garder ». Rien a nettoyer : pas de bandeau. Parametre a 1 : nettoyage automatique,
 * pas de bandeau.
 * Jeu d'essai (retire a la fin) : une suggestion de 7 produits :
 *   K1, K2, K3  seuil tres haut                                   -> restent
 *   S1          seuil = rayon - 1                                 -> sort
 *   S2          seuil = rayon - 5                                 -> sort
 *   R1          gere en reserve, seuil = rayon + 3, reserve 10    -> sort (rayon + reserve au-dessus du seuil)
 *   R2          gere en reserve, seuil = rayon + 3, reserve 2     -> reste (rayon + reserve sous le seuil)
 * Par les ecrans : liste des suggestions > recherche de la reference > « Modifier ».
 * Rapprochement : nombre du bandeau = regle appliquee aux stocks en base = lignes sorties = retraits journalises ;
 * grille = base. Bilan : seules S1, S2, R1 sortent, un retrait journalise chacune, stocks inchanges.
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const SUGG = 'E2E-BN-SUGG', REF = 'E2E-BN-REF', MARQUE = 'E2E-BN-';
const PARAM = 'KEY_NETTOYER_SUGGESTION_OUVERTURE';
const PARAM_AVANT = q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${PARAM}'`);
const ORIGINE = {};
let K = [], S = [], R = [];

function produits(n) {
  return q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE, f.int_CIP, f.str_NAME) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 400 AND f.int_CIP REGEXP '^[0-9]{6,13}$'"
    + " AND (SELECT COUNT(*) FROM t_famille_stock y WHERE y.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND y.lg_EMPLACEMENT_ID = '1') = 1"
    + " AND COALESCE(f.bool_RESERVE, 0) = 0"
    + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2')"
    + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d JOIN t_suggestion_order so ON so.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND so.str_STATUT <> 'is_Closed')"
    + " AND f.str_NAME LIKE 'D%' ORDER BY f.str_NAME LIMIT " + n).split(/\r?\n/).filter(Boolean).map((l) => { const [id, r, cip, nom] = l.split('|'); return { id, r: Number(r), cip, nom }; });
}
function parametre(v) {
  if (v === 'ABSENT') { C.exec(`DELETE FROM t_parameters WHERE str_KEY = '${PARAM}'`); } else { C.exec(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${PARAM}'`); }
}
function nettoyer() {
  C.exec(`DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${MARQUE}%';`);
  Object.keys(ORIGINE).forEach((id) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${ORIGINE[id].seuil}, bool_RESERVE = ${ORIGINE[id].reserve} WHERE lg_FAMILLE_ID = '${id}'`));
  if (PARAM_AVANT !== 'ABSENT') { parametre(PARAM_AVANT); }
}
const reserveDe = (id) => Number(q(`SELECT IFNULL(SUM(int_NUMBER), 0) FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '2' AND str_STATUT = 'enable'`));
function poser() {
  const l = produits(7);
  if (l.length !== 7) { return 'produits insuffisants'; }
  K = l.slice(0, 3); S = l.slice(3, 5); R = l.slice(5);
  l.forEach((x) => { ORIGINE[x.id] = { seuil: q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`), reserve: q(`SELECT IFNULL(bool_RESERVE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`) }; });
  K.forEach((x) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = 100000 WHERE lg_FAMILLE_ID = '${x.id}'`));
  C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${S[0].r - 1} WHERE lg_FAMILLE_ID = '${S[0].id}'`);
  C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${S[1].r - 5} WHERE lg_FAMILLE_ID = '${S[1].id}'`);
  R.forEach((x, i) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${x.r + 3}, bool_RESERVE = 1 WHERE lg_FAMILLE_ID = '${x.id}';`
    + ' INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)'
    + ` VALUES ('${MARQUE}T${i}', '${x.id}', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', ${i === 0 ? 10 : 2})`));
  const grossiste = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
  C.exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}', '${grossiste}', 'is_Process', NOW(), NOW())`);
  l.forEach((x, i) => C.exec('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,'
    + ` int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${MARQUE}L${i}', '${SUGG}', '${grossiste}', '${x.id}', ${i + 2}, 100, 150, 100, NOW(), NOW(), 'is_Process', 0)`));
  return null;
}
const lignes = () => q(`SELECT lg_FAMILLE_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}' ORDER BY lg_FAMILLE_ID`).split(/\r?\n/).filter(Boolean);
const journal = () => q(`SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`);
/* la regle, appliquee aux stocks lus en base : rayon (+ reserve si gere) au-dessus du seuil (option par defaut) */
const aSortirEnBase = () => q(`SELECT d.lg_FAMILLE_ID FROM t_suggestion_order_details d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
  JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE d.lg_SUGGESTION_ORDER_ID = '${SUGG}' AND f.int_SEUIL_MIN IS NOT NULL
  AND s.int_NUMBER_AVAILABLE + IF(COALESCE(f.bool_RESERVE, 0) = 1, (SELECT COALESCE(SUM(t.int_NUMBER), 0) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = '1' AND t.lg_TYPE_STOCK_ID = '2' AND t.str_STATUT = 'enable'), 0) > f.int_SEUIL_MIN
  ORDER BY d.lg_FAMILLE_ID`.replace(/\n\s*/g, ' ')).split(/\r?\n/).filter(Boolean);
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(s.lg_FAMILLE_ID, ':', s.int_NUMBER_AVAILABLE) ORDER BY s.lg_FAMILLE_ID) FROM t_famille_stock s WHERE s.lg_EMPLACEMENT_ID = '1' AND s.lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}' UNION SELECT lg_FAMILLE_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}')`)
  + '#' + q(`SELECT IFNULL(SUM(int_NUMBER), 0) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${MARQUE}%'`);

(async () => {
  try { nettoyer(); } catch (e) { /* rien */ }
  let erreur;
  try { erreur = poser(); } catch (e) { erreur = String(e.message).split('\n')[0]; }
  if (erreur) { console.log('FATAL : ' + erreur); nettoyer(); process.exit(1); }
  parametre('0');
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  const ouvrir = async () => {
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.click('#rechecher-inputEl');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(REF, { delay: 20 });
    await p.keyboard.press('Enter');
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: REF }).first();
    await rangee.waitFor({ timeout: 30000 });
    const ouverture = p.waitForResponse((r) => /suggestion\/ouverture/.test(r.url()), { timeout: 30000 });
    await rangee.locator('img[data-qtip="Modifier"], .x-action-col-icon[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await ouverture;
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
  };
  const bandeau = () => p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'), b = g && g.down('#bandeauNettoyageSugg');
    if (!b || !b.isVisible(true)) { return null; }
    const r = (c) => { const e = b.down(c).getEl().dom.getBoundingClientRect(); return { g: Math.round(e.left), d: Math.round(e.right), h: Math.round(e.height) }; };
    const gr = g.getEl().dom.getBoundingClientRect();
    return { texte: b.down('#texteBandeauNettoyage').getEl().dom.textContent, oui: r('#btnBandeauNettoyerOui'), non: r('#btnBandeauNettoyerNon'),
      grille: { g: Math.round(gr.left), d: Math.round(gr.right) }, au: b.getEl().dom.getBoundingClientRect().top < g.getView().getEl().dom.getBoundingClientRect().top }; });
  const grille = () => p.evaluate(() => { const s = Ext.getCmp('gridpanelSuggestionID').getStore(); return { ids: s.getRange().map((r) => r.get('lg_FAMILLE_ID')).sort(), total: s.getTotalCount() }; });
  const boites = () => p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible()).length);
  const sortants = [S[0].id, S[1].id, R[0].id].sort();
  try {
    const stocks0 = stocks();
    const regle = aSortirEnBase();
    ok('Jeu d\'essai : 7 lignes ; la règle appliquée aux stocks en base retire S1, S2 et R1 (R1 par sa réserve), garde R2', lignes().length === 7
      && JSON.stringify(regle) === JSON.stringify(sortants), regle.length + ' à sortir');

    /* ----- ouverture, parametre a 0 : bandeau avec le bon nombre, rien ne bouge ----- */
    await ouvrir();
    const b1 = await bandeau();
    ok('Ouverture : bandeau « 3 produits sont repassés au-dessus du seuil … Nettoyer la suggestion ? », au-dessus des lignes', !!b1 && /3 produits sont repassés au-dessus du seuil/.test(b1.texte)
      && /Nettoyer la suggestion \?/.test(b1.texte) && b1.au, JSON.stringify(b1));
    ok('Rapprochement : nombre du bandeau = règle appliquée aux stocks en base', !!b1 && Number((b1.texte.match(/(\d+) produits?/) || [])[1]) === regle.length, b1 && b1.texte);
    ok('L\'ouverture ne retire rien tant qu\'on n\'a pas répondu (7 lignes, aucun retrait journalisé)', lignes().length === 7 && journal() === '0');
    ok('Aucune fenêtre : la question est dans l\'écran', await boites() === 0);
    for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: h });
      await p.waitForTimeout(900);
      const b = await bandeau();
      ok(`${l}×${h} : bandeau et ses deux boutons entiers dans la suggestion`, !!b && b.oui.g >= b.grille.g && b.non.d <= b.grille.d && b.oui.h > 0 && b.non.h > 0 && b.non.g > b.oui.g, JSON.stringify(b));
    }
    await p.setViewportSize({ width: 1366, height: 768 });
    await p.waitForTimeout(600);

    /* ----- « Non, garder » ----- */
    await p.click('#' + await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').down('#btnBandeauNettoyerNon').getId()));
    await p.waitForTimeout(800);
    ok('« Non, garder » : bandeau fermé, suggestion intacte (7 lignes, aucun retrait)', await bandeau() === null && lignes().length === 7 && journal() === '0');

    /* ----- réouverture : la question revient ; « Oui, nettoyer » ----- */
    await ouvrir();
    ok('Réouverture : le bandeau revient (la suggestion n\'a pas été nettoyée)', !!(await bandeau()));
    const nettoyage = p.waitForResponse((r) => /suggestion\/clean/.test(r.url()), { timeout: 30000 });
    await p.click('#' + await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').down('#btnBandeauNettoyerOui').getId()));
    await nettoyage;
    await p.waitForFunction(() => !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const apres = lignes(), g2 = await grille();
    ok('« Oui, nettoyer » : S1, S2 et R1 sortent ; K1, K2, K3 et R2 restent', apres.length === 4 && sortants.every((x) => !apres.includes(x))
      && [...K, R[1]].every((x) => apres.includes(x.id)), apres.length + ' lignes');
    ok('Rapprochement : grille = base après le nettoyage (4 lignes)', g2.total === 4 && JSON.stringify(g2.ids) === JSON.stringify(apres), JSON.stringify(g2));
    const j = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', IFNULL(lg_USER_ID, '-'), ':', DATE(dt_RETRAIT) = CURDATE()) ORDER BY lg_FAMILLE_ID) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`);
    ok('Bilan : un retrait journalisé par produit sorti (3), quantité, utilisateur et date du jour (visible dans « Produits retirés »)', journal() === '3'
      && sortants.every((x) => j.indexOf(x + ':') >= 0) && !/:-:/.test(j) && !/:0(,|$)/.test(j), j);
    ok('Bilan : le nettoyage ne touche à aucun stock (rayon et réserve inchangés)', stocks() === stocks0, stocks0 + ' => ' + stocks());
    ok('« Oui, nettoyer » : bandeau fermé, aucune fenêtre', await bandeau() === null && await boites() === 0);

    /* ----- réouverture : plus rien à nettoyer, pas de bandeau ----- */
    await ouvrir();
    ok('Réouverture sans produit au-dessus du seuil : pas de bandeau, rien ne change', await bandeau() === null && lignes().length === 4 && journal() === '3');

    /* ----- paramètre à 1 : nettoyage automatique, pas de bandeau ----- */
    C.exec(`UPDATE t_type_stock_famille SET int_NUMBER = 9 WHERE lg_TYPE_STOCK_FAMILLE_ID = '${MARQUE}T1'`);
    parametre('1');
    await ouvrir();
    const apres1 = lignes();
    ok('Paramètre à 1 : R2 (réserve passée à 9) sort automatiquement à l\'ouverture, sans bandeau', await bandeau() === null && apres1.length === 3 && !apres1.includes(R[1].id) && journal() === '4', apres1.length);
    parametre('0');

    /* ----- le bouton du bas ferme aussi le bandeau ----- */
    C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${K[0].r - 1} WHERE lg_FAMILLE_ID = '${K[0].id}'`);
    await ouvrir();
    const b3 = await bandeau();
    ok('Un seul produit : « 1 produit est repassé au-dessus du seuil »', !!b3 && /1 produit est repassé au-dessus du seuil/.test(b3.texte), b3 && b3.texte);
    await p.click('#btn_clean_sugg'); await p.waitForTimeout(400);
    const net2 = p.waitForResponse((r) => /suggestion\/clean/.test(r.url()), { timeout: 30000 });
    await p.click('#btn_clean_sugg');
    await net2;
    await p.waitForTimeout(1500);
    ok('« Nettoyer la suggestion » (bouton du bas, confirmé dans le bouton) : K1 sort, le bandeau disparaît', await bandeau() === null && !lignes().includes(K[0].id) && journal() === '5');
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: (process.env.TEMP || '.') + '/bandeau-nettoyage-echec.png' }).catch(() => {});
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close().catch(() => {});
    nettoyer();
    C.nettoyer();
    ok('Jeu d\'essai retiré, seuils, réserves et paramètre remis', q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${MARQUE}%'`) === '0'
      && q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${PARAM}'`) === PARAM_AVANT
      && Object.keys(ORIGINE).every((id) => q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`) === ORIGINE[id].seuil));
    process.exit(A.bilan() ? 1 : 0);
  }
})();
