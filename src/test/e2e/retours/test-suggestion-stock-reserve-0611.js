/* PLAN DU 06/11, POINT 12 : TRAITEMENT DE LA SUGGESTION, COLONNE « RES » (STOCK RESERVE), LIBELLE PLUS LARGE, MOIS COURTS.
 *
 * Avant : le stock reserve n'apparaissait que dans la barre d'information (« Stock Res ») apres un clic sur la ligne ;
 * le libelle etait serre (flex 2,5) tandis que QTE, MOY et SEUIL prenaient chacun une part entiere ; les en-tetes de
 * mois etaient les noms complets.
 *
 * Jeu d'essai (retire a la fin) : trois produits sans stock reserve sur le poste ; R1 recoit 7 en reserve, R2 13, R3
 * rien (0) ; une suggestion d'essai les contient (quantites 4, 2, 1).
 * Par les ecrans (compte de test) : liste des suggestions > recherche de la reference (tapee, Entree) > « Modifier » :
 *  - colonne « RES » presente, a droite du stock, en vert et en gras (vert fonce sur la ligne selectionnee, comme
 *    « PROMOTION » en vente : le fond violet de la selection impose sinon un texte noir) ;
 *  - rapprochement ligne par ligne : RES de la grille = « Stock Res » de la barre d'information (clic sur la ligne) =
 *    base (t_type_stock_famille, type 2, emplacement du poste) : 7, 13, 0 ;
 *  - en-tetes de mois en trois lettres, tous differents, nom complet en info-bulle ;
 *  - LIBELLE au moins 4 fois plus large que QTE ; QTE, MOY et SEUIL <= 62 px ;
 *  - la saisie de QTE au clavier marche toujours (9 puis Entree -> 9 en base) ;
 *  - rien d'autre n'est ecrit (le stock reserve de la base est inchange) ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/retours/test-suggestion-stock-reserve-0611.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const SUGG = 'E2E-RES-SUGG', REF = 'E2E-RES-REF', MARQUE = 'E2E-RES-';
const RESERVES = [7, 13, null];
const QTES = [4, 2, 1];
let ids = [];

const reserveBase = (id) => q("SELECT IFNULL((SELECT int_NUMBER FROM t_type_stock_famille WHERE lg_TYPE_STOCK_ID = '2' AND lg_FAMILLE_ID = '" + id
  + "' AND lg_EMPLACEMENT_ID = '1' LIMIT 1), 0)");

function nettoyer() {
  C.exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';"
    + "DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '" + MARQUE + "%'");
}

function poser() {
  ids = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE 'B%'"
    + " AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1')"
    + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2')"
    + " ORDER BY f.str_NAME LIMIT 3").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (ids.length !== 3) { return 'moins de 3 produits sans stock reserve'; }
  const grossiste = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
  ids.forEach((id, i) => {
    if (RESERVES[i] !== null) {
      C.exec("INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
        + " VALUES ('" + MARQUE + i + "', '" + id + "', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', " + RESERVES[i] + ')');
    }
  });
  C.exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + SUGG + "', '" + REF + "', '" + grossiste + "', 'is_Process', NOW(), NOW())");
  ids.forEach((id, i) => C.exec('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,'
    + " int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('" + MARQUE + 'L' + i + "', '" + SUGG + "', '" + grossiste + "', '" + id + "', " + QTES[i]
    + ', ' + (QTES[i] * 100) + ", 150, 100, NOW(), NOW(), 'is_Process', 0)"));
  return null;
}

/* id DOM d'une cellule de la grille de la suggestion, pour un clic reel */
const cellule = (p, famille, dataIndex) => p.evaluate(([f, d]) => {
  const g = Ext.getCmp('gridpanelSuggestionID');
  const r = g.getStore().findRecord('lg_FAMILLE_ID', f, 0, false, true, true);
  const col = g.headerCt.getGridColumns().filter((c) => c.dataIndex === d)[0];
  if (!r || !col) { return null; }
  const cel = g.getView().getCell(r, col);
  cel.dom.id = cel.dom.id || ('e2e-' + d + '-' + f);
  return cel.dom.id;
}, [famille, dataIndex]);

(async () => {
  try { nettoyer(); } catch (e) { /* rien a retirer */ }
  let erreur;
  try { erreur = poser(); } catch (e) { erreur = String(e.message).split('\n')[0]; }
  if (erreur) { console.log('FATAL : ' + erreur); nettoyer(); process.exit(1); }
  const reservesAvant = ids.map(reserveBase);
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    ok('Préparation : 3 produits, réserve 7 / 13 / 0 en base', reservesAvant.join('/') === '7/13/0', reservesAvant.join('/'));

    /* liste des suggestions > recherche > Modifier */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.click('#rechecher-inputEl');
    await p.keyboard.type(REF, { delay: 20 });
    await p.keyboard.press('Enter');
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: REF }).first();
    await rangee.waitFor({ timeout: 30000 });
    await rangee.locator('img[data-qtip="Modifier"], .x-action-col-icon[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 3; }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);

    const grille = await p.evaluate(() => {
      const g = Ext.getCmp('gridpanelSuggestionID');
      const cols = g.headerCt.getGridColumns().filter((c) => c.isVisible());
      const par = (d) => cols.filter((c) => c.dataIndex === d)[0];
      const res = par('int_STOCK_RESERVE');
      const lignes = g.getStore().getRange().map((r) => {
        const out = { id: r.get('lg_FAMILLE_ID'), valeur: r.get('int_STOCK_RESERVE') };
        if (res) { const cel = g.getView().getCell(r, res).dom.querySelector('.x-grid-cell-inner') || g.getView().getCell(r, res).dom;
          const cs = getComputedStyle(cel); out.texte = cel.textContent.trim(); out.couleur = cs.color; out.selectionnee = g.getSelectionModel().isSelected(r); out.gras = Number(cs.fontWeight) >= 600 || cs.fontWeight === 'bold'; }
        return out;
      });
      const mois = ['int_VALUE0', 'int_VALUE1', 'int_VALUE2', 'int_VALUE3'].map((d) => { const c = par(d); return c ? { texte: c.textEl.dom.textContent.trim(), bulle: c.tooltip || (c.el.dom.getAttribute('data-qtip') || '') } : null; });
      const l = (d) => (par(d) ? par(d).getWidth() : null);
      const ordre = cols.map((c) => c.dataIndex);
      return { res: !!res, lignes, mois, largeurs: { libelle: l('str_FAMILLE_NAME'), qte: l('int_NUMBER'), moy: cols.filter((c) => /^MOY$/.test(c.text))[0] ? cols.filter((c) => /^MOY$/.test(c.text))[0].getWidth() : null, seuil: l('int_SEUIL') },
        apresStock: ordre.indexOf('int_STOCK_RESERVE') === ordre.indexOf('int_STOCK') + 1 || ordre.indexOf('int_STOCK_RESERVE') > ordre.indexOf('int_STOCK') };
    });
    ok('Colonne « RES » présente, après le stock', grille.res && grille.apresStock, JSON.stringify(grille).slice(0, 300));
    ok('RES en vert et en gras sur chaque ligne (vert foncé #1B5E20 sur la ligne sélectionnée)', grille.lignes.length === 3
      && grille.lignes.every((l) => l.couleur === (l.selectionnee ? 'rgb(27, 94, 32)' : 'rgb(46, 125, 50)') && l.gras), JSON.stringify(grille.lignes));

    /* rapprochement : grille = barre d'information = base */
    const compare = [];
    for (let i = 0; i < 3; i++) {
      const idCel = await cellule(p, ids[i], 'str_FAMILLE_NAME');
      if (idCel) { await p.click('#' + idCel); }
      await p.waitForFunction(() => /Stock Res/.test((Ext.getCmp('suggInfoBar') && Ext.getCmp('suggInfoBar').getEl().dom.textContent) || ''), null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(700);
      const barre = await p.evaluate(() => { const t = Ext.getCmp('suggInfoBar').getEl().dom.textContent; const m = t.match(/Stock Res\s*:\s*(-?\d+)/); return m ? m[1] : null; });
      const ligne = grille.lignes.find((l) => l.id === ids[i]) || {};
      compare.push({ produit: i + 1, grille: ligne.texte, barre, base: reserveBase(ids[i]) });
    }
    ok('Rapprochement ligne par ligne : RES de la grille = « Stock Res » de la barre = base (7, 13, 0)',
      compare.every((c) => c.grille === c.barre && c.barre === c.base) && compare.map((c) => c.base).join('/') === '7/13/0', JSON.stringify(compare));

    ok('En-têtes de mois en 3 lettres, tous différents, nom complet en info-bulle',
      grille.mois.every((m) => m && /^[A-ZÉ][a-zéû]{2}$/.test(m.texte) && m.bulle.length > 3 && m.bulle.toLowerCase().indexOf(m.texte.toLowerCase().slice(0, 2)) >= 0)
      && new Set(grille.mois.map((m) => m && m.texte)).size === 4, JSON.stringify(grille.mois));
    const L = grille.largeurs;
    ok('LIBELLE au moins 4 fois plus large que QTE ; QTE, MOY et SEUIL <= 62 px', L.libelle >= 4 * L.qte && L.qte <= 62 && L.moy <= 62 && L.seuil <= 62, JSON.stringify(L));

    /* QTE au clavier */
    const idQte = await cellule(p, ids[0], 'int_NUMBER');
    await p.click('#' + idQte);
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('9', { delay: 30 });
    await p.keyboard.press('Enter');
    let qte = '';
    for (let k = 0; k < 20 && qte !== '9'; k++) { await p.waitForTimeout(500); qte = q("SELECT int_NUMBER FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID = '" + MARQUE + "L0'"); }
    ok('QTE au clavier : 9 puis Entrée -> 9 en base', qte === '9', qte);
    ok('Bilan : stock réserve de la base inchangé par l\'affichage', ids.map(reserveBase).join('/') === reservesAvant.join('/'), ids.map(reserveBase).join('/'));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close().catch(() => {});
    nettoyer();
    C.nettoyer();
    ok('Jeu d\'essai retiré (suggestion, stocks réserve)', q("SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'") === '0'
      && q("SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '" + MARQUE + "%'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
