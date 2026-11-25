/* RETOUR DU 25/11 (capture) : depuis le bandeau « N produits sont repassés au-dessus du seuil … Nettoyer la
 * suggestion ? » (plan du 21/11, point 4.1), la suggestion ouverte ne défile plus et ne change plus de page.
 * Attendu : la question est posée dans une fenêtre modale, une fois la suggestion affichée ; après la réponse, la
 * grille défile jusqu'à sa dernière ligne et la pagination change de page.
 *
 * Jeu d'essai (retiré à la fin) : une suggestion de 25 produits (3 pages de 10), dont 3 au-dessus de leur seuil
 * (la question est donc posée) ; les 22 autres ont un seuil très haut. Paramètre KEY_NETTOYER_SUGGESTION_OUVERTURE à 0.
 * Vrai chemin : liste des suggestions > recherche de la référence > « Modifier » ; à 1280 × 600 (navigateur en plein
 * écran sur un écran 1280 × 720 avec la barre des tâches, cas de la capture), 1280 × 720 et 1366 × 768.
 * Contrôles :
 *  - une fenêtre modale « Nettoyer la suggestion ? » s'ouvre après l'affichage des lignes, nombre = règle en base ;
 *    aucun bandeau dans la grille ;
 *  - « Non, garder » ferme la fenêtre sans rien toucher (25 lignes, aucun retrait) ;
 *  - molette sur la grille : la dernière ligne de la page devient visible, entière, dans la grille et dans l'écran ;
 *  - bouton « page suivante » visible et non recouvert (c'est lui qui reçoit le clic) ; un clic donne la page 2, des
 *    lignes différentes, puis « page précédente » ramène la page 1 ;
 *  - rapprochement : total de la pagination = lignes en base ; lignes des 3 pages réunies = lignes en base, sans
 *    doublon.
 * Lancement seul : node src/test/e2e/reappro/test-suggestion-defilement-2511.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const SUGG = 'E2E-DF-SUGG', REF = 'E2E-DF-REF', MARQUE = 'E2E-DF-', N = 25;
const PARAM = 'KEY_NETTOYER_SUGGESTION_OUVERTURE';
const PARAM_AVANT = q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${PARAM}'`);
const ORIGINE = {};

function produits(n) {
  return q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 400 AND f.int_CIP REGEXP '^[0-9]{6,13}$'"
    + " AND (SELECT COUNT(*) FROM t_famille_stock y WHERE y.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND y.lg_EMPLACEMENT_ID = '1') = 1"
    + " AND COALESCE(f.bool_RESERVE, 0) = 0"
    + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2')"
    + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d JOIN t_suggestion_order so ON so.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND so.str_STATUT <> 'is_Closed')"
    + " ORDER BY f.str_NAME LIMIT " + n).split(/\r?\n/).filter(Boolean).map((l) => { const [id, r] = l.split('|'); return { id, r: Number(r) }; });
}
function parametre(v) {
  if (v === 'ABSENT') { C.exec(`DELETE FROM t_parameters WHERE str_KEY = '${PARAM}'`); } else { C.exec(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${PARAM}'`); }
}
function nettoyer() {
  C.exec(`DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`);
  Object.keys(ORIGINE).forEach((id) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${ORIGINE[id]} WHERE lg_FAMILLE_ID = '${id}'`));
  if (PARAM_AVANT !== 'ABSENT') { parametre(PARAM_AVANT); } else { parametre('ABSENT'); }
}
function poser() {
  const l = produits(N);
  if (l.length !== N) { return 'produits insuffisants (' + l.length + ')'; }
  l.forEach((x) => { ORIGINE[x.id] = q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`); });
  /* 3 produits au-dessus du seuil (écarts différents), répartis sur les pages ; les autres sous un seuil très haut */
  l.forEach((x, i) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${[2, 13, 24].includes(i) ? x.r - 1 - i % 4 : 100000} WHERE lg_FAMILLE_ID = '${x.id}'`));
  const grossiste = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
  C.exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}', '${grossiste}', 'is_Process', NOW(), NOW())`);
  l.forEach((x, i) => C.exec('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,'
    + ` int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${MARQUE}L${String(i).padStart(2, '0')}', '${SUGG}', '${grossiste}', '${x.id}', ${i % 5 + 1}, 100, 150, 100, NOW(), NOW(), 'is_Process', 0)`));
  return null;
}
const lignes = () => q(`SELECT lg_FAMILLE_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}' ORDER BY lg_FAMILLE_ID`).split(/\r?\n/).filter(Boolean);
const journal = () => q(`SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`);
const aSortirEnBase = () => Number(q(`SELECT COUNT(*) FROM t_suggestion_order_details d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
  JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE d.lg_SUGGESTION_ORDER_ID = '${SUGG}' AND f.int_SEUIL_MIN IS NOT NULL AND s.int_NUMBER_AVAILABLE > f.int_SEUIL_MIN`.replace(/\n\s*/g, ' ')));

(async () => {
  try { nettoyer(); } catch (e) { /* rien */ }
  let erreur;
  try { erreur = poser(); } catch (e) { erreur = String(e.message).split('\n')[0]; }
  if (erreur) { console.log('FATAL : ' + erreur); nettoyer(); process.exit(1); }
  parametre('0');
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  /* fenêtre de la question : visible, modale, texte ; et la grille déjà remplie quand elle s'est ouverte */
  const fenetre = () => p.evaluate(() => {
    const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && /Nettoyer la suggestion/.test(x.title || ''))[0];
    const bouton = (t) => w && w.query('button').find((b) => b.getText() === t);
    return w ? { texte: w.getEl().dom.innerText, modale: !!w.modal, oui: !!bouton('Oui, nettoyer'), non: bouton('Non, garder') ? bouton('Non, garder').getId() : null,
      lignesALOuverture: window.__lignesALOuverture } : null;
  });
  const bandeau = () => p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return !!(g && (g.down('#bandeauNettoyageSugg') || g.getEl().dom.querySelector('.sugg-bandeau-nettoyage'))); });
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
    /* note le nombre de lignes affichées au moment où une fenêtre s'ouvre */
    await p.evaluate(() => { window.__lignesALOuverture = null; if (!window.__guetFenetre) { window.__guetFenetre = true;
      Ext.util.Observable.observe(Ext.window.Window, { show: (w) => { if (/Nettoyer la suggestion/.test(w.title || '')) { const g = Ext.getCmp('gridpanelSuggestionID');
        window.__lignesALOuverture = g ? g.getView().getNodes().length : -1; } } }); } });
    const ouverture = p.waitForResponse((r) => /suggestion\/ouverture/.test(r.url()), { timeout: 30000 });
    await rangee.locator('img[data-qtip="Modifier"], .x-action-col-icon[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await ouverture;
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  /* état de la grille et de la pagination, vu de l'écran */
  const etat = () => p.evaluate(() => {
    const g = Ext.getCmp('gridpanelSuggestionID'), v = g.getView(), s = g.getStore(), pt = g.down('pagingtoolbar');
    const nodes = v.getNodes(), dern = nodes[nodes.length - 1], rv = v.getEl().dom.getBoundingClientRect();
    const rd = dern ? dern.getBoundingClientRect() : null;
    const bouton = (id) => { const b = pt.down('#' + id), r = b.getEl().dom.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const cible = document.elementFromPoint(cx, cy);
      return { id: b.getId(), visible: r.width > 0 && r.height > 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
        atteint: !!cible && b.getEl().dom.contains(cible), actif: !b.disabled }; };
    return { page: s.currentPage, total: s.getTotalCount(), ids: s.getRange().map((r) => r.get('lg_FAMILLE_ID')), lignes: nodes.length,
      derniereVisible: !!rd && rd.height > 0 && rd.top >= rv.top - 1 && rd.bottom <= rv.bottom + 1 && rd.bottom <= window.innerHeight,
      scroll: Math.round(v.getEl().dom.scrollTop), vue: { haut: Math.round(rv.top), bas: Math.round(rv.bottom), h: Math.round(rv.height) },
      suivant: bouton('next'), precedent: bouton('prev') };
  });
  const attendreChargement = () => p.waitForFunction(() => !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
  try {
    const regle = aSortirEnBase();
    ok('Jeu d\'essai : 25 lignes (3 pages), 3 au-dessus du seuil selon la base', lignes().length === N && regle === 3, String(regle));
    for (const [l, h] of [[1280, 600], [1280, 720], [1366, 768]]) {
      await p.setViewportSize({ width: l, height: h });
      await p.waitForTimeout(600);
      await ouvrir();
      const f = await fenetre();
      ok(`${l}×${h} : question posée dans une fenêtre modale après l'affichage des lignes, nombre = règle en base (${regle})`,
        !!f && f.modale && f.oui && !!f.non && f.lignesALOuverture > 0 && Number((f.texte.match(/(\d+) produits?/) || [])[1]) === regle, JSON.stringify(f));
      ok(`${l}×${h} : aucun bandeau dans la grille`, !(await bandeau()));
      if (f && f.non) {
        await p.click('#' + f.non);
        await p.waitForTimeout(700);
      }
      ok(`${l}×${h} : après la réponse « Non, garder » : fenêtre fermée, suggestion intacte (25 lignes, aucun retrait)`,
        !(await fenetre()) && lignes().length === N && journal() === '0');

      const e0 = await etat();
      ok(`${l}×${h} : page 1, 10 lignes, total de la pagination = lignes en base (${N})`, e0.page === 1 && e0.lignes === 10 && e0.total === N, JSON.stringify(e0));
      const vue = e0.vue;
      await p.mouse.move(Math.round(l / 2), Math.round((vue.haut + Math.min(vue.bas, h)) / 2));
      for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(200); }
      await p.waitForTimeout(400);
      const e1 = await etat();
      ok(`${l}×${h} : molette sur la grille : la dernière ligne de la page est visible, entière, dans l'écran`, e1.derniereVisible && e1.vue.h > 60, JSON.stringify({ avant: e0.scroll, apres: e1.scroll, vue: e1.vue }));
      ok(`${l}×${h} : « page suivante » visible et non recouvert`, e1.suivant.visible && e1.suivant.atteint && e1.suivant.actif, JSON.stringify(e1.suivant));
      const pages = [e1.ids];
      if (e1.suivant.visible && e1.suivant.atteint) {
        await p.click('#' + e1.suivant.id);
        await p.waitForTimeout(300); await attendreChargement(); await p.waitForTimeout(600);
      }
      const e2 = await etat();
      ok(`${l}×${h} : clic sur « page suivante » : page 2, lignes différentes`, e2.page === 2 && e2.lignes === 10 && e2.ids.every((x) => !e1.ids.includes(x)), JSON.stringify({ page: e2.page, lignes: e2.lignes }));
      pages.push(e2.ids);
      if (e2.page === 2 && e2.suivant.atteint) {
        await p.click('#' + e2.suivant.id);
        await p.waitForTimeout(300); await attendreChargement(); await p.waitForTimeout(600);
        pages.push((await etat()).ids);
      }
      const tout = pages.flat();
      ok(`${l}×${h} : rapprochement : lignes des 3 pages réunies = lignes en base, sans doublon`, tout.length === N && new Set(tout).size === N
        && JSON.stringify([...tout].sort()) === JSON.stringify(lignes()), tout.length + ' lignes vues');
      const e3 = await etat();
      if (e3.precedent.atteint) {
        await p.click('#' + e3.precedent.id);
        await p.waitForTimeout(300); await attendreChargement(); await p.waitForTimeout(600);
      }
      const e4 = await etat();
      ok(`${l}×${h} : « page précédente » visible, non recouvert, revient d'une page`, e3.precedent.visible && e3.precedent.atteint && e4.page === e3.page - 1, JSON.stringify({ avant: e3.page, apres: e4.page, bouton: e3.precedent }));
    }
    ok('Bilan : rien n\'a été retiré de la suggestion (25 lignes, aucun retrait journalisé)', lignes().length === N && journal() === '0');
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close().catch(() => {});
    nettoyer();
    C.nettoyer();
    ok('Jeu d\'essai retiré, seuils et paramètre remis', q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '0'
      && q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${PARAM}'`) === PARAM_AVANT
      && Object.keys(ORIGINE).every((id) => q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`) === ORIGINE[id]));
    process.exit(A.bilan() ? 1 : 0);
  }
})();
