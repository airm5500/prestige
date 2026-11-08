/* PLAN DU 08/11, POINT 11.3 : BOUTONS DU BAS DE LA SUGGESTION DE REAPPRO OUVERTE (ECRAN D'UNE CAISSE, 1366 x 768).
 *
 * Avant : dix boutons a la suite, icones qui se chevauchent, « Nettoyer » confirme par une fenetre surgissante.
 * Attendu :
 *  - boutons regroupes par usage, separes : Retour | disponibilite (verifier, reverifier, imprimer) | sorties
 *    (imprimer, exporter CSV) | produits (equivalents DCI, produits retires) | Nettoyer, Commander par PharmaML ;
 *  - aucune icone dans la barre ; aucun bouton ne chevauche son voisin ; textes entiers ; barre dans l'ecran ;
 *  - « Nettoyer » et « Commander » d'un style distinct des autres ;
 *  - « Nettoyer » : premier clic, le bouton demande confirmation (aucune fenetre, rien n'est retire) ; sans second
 *    clic il revient ; second clic : seule la ligne au-dessus du seuil sort, un retrait journalise.
 * Jeu d'essai (retire a la fin) : une suggestion de 3 produits, dont un (S) au stock au-dessus de son seuil.
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const SUGG = 'E2E-BAR-SUGG', REF = 'E2E-BAR-REF', MARQUE = 'E2E-BAR-';
const ORIGINE = {};
let L = [];

function poser() {
  L = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 400 AND COALESCE(f.bool_RESERVE, 0) = 0"
    + " AND (SELECT COUNT(*) FROM t_famille_stock y WHERE y.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND y.lg_EMPLACEMENT_ID = '1') = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
    + " AND f.str_NAME LIKE 'D%' ORDER BY f.str_NAME LIMIT 3").split(/\r?\n/).filter(Boolean).map((l) => { const [id, r] = l.split('|'); return { id, r: Number(r) }; });
  if (L.length !== 3) { return 'produits insuffisants'; }
  L.forEach((x) => { ORIGINE[x.id] = q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`); });
  C.exec(`UPDATE t_famille SET int_SEUIL_MIN = 100000 WHERE lg_FAMILLE_ID IN ('${L[0].id}', '${L[1].id}')`);
  C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${L[2].r - 3} WHERE lg_FAMILLE_ID = '${L[2].id}'`);
  const grossiste = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
  C.exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}', '${grossiste}', 'is_Process', NOW(), NOW())`);
  L.forEach((x, i) => C.exec('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,'
    + ` int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${MARQUE}L${i}', '${SUGG}', '${grossiste}', '${x.id}', ${i + 2}, 100, 150, 100, NOW(), NOW(), 'is_Process', 0)`));
  return null;
}

function nettoyer() {
  C.exec(`DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`);
  Object.keys(ORIGINE).forEach((id) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${ORIGINE[id]} WHERE lg_FAMILLE_ID = '${id}'`));
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
    await p.setViewportSize({ width: 1366, height: 768 });
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
    await p.waitForTimeout(1500);

    const barre = await p.evaluate(() => {
      const tb = Ext.getCmp('btn_clean_sugg').up('toolbar');
      const items = tb.items.getRange().filter((x) => !x.hidden && (x.isXType('button') || x.isXType('tbseparator')));
      const suite = items.map((x) => (x.isXType('tbseparator') ? '|' : x.getText())).join(' ; ');
      const boutons = items.filter((x) => x.isXType('button')).map((x) => { const r = x.getEl().dom.getBoundingClientRect(), t = x.getEl().dom.querySelector('.x-btn-inner');
        const ic = x.getEl().dom.querySelector('.x-btn-icon-el'), icone = !!ic && ic.offsetWidth > 0 && getComputedStyle(ic).backgroundImage !== 'none';
        return { id: x.getId(), g: r.left, d: r.right, b: r.bottom, entier: t.scrollWidth <= t.clientWidth + 1, icone, fond: getComputedStyle(x.getEl().dom).backgroundColor }; });
      return { suite, boutons, largeur: window.innerWidth, hauteur: window.innerHeight };
    });
    const attendu = 'Retour ; | ; Vérifier la disponibilité ; Revérifier les indisponibles ; Imprimer la disponibilité ; | ; ' + (barre.boutons.some((x) => x.id === 'btn_print') ? 'Imprimer ; ' : '') + 'Exporter CSV ; | ; Équivalents DCI ; Produits retirés ; | ; Nettoyer la suggestion ; Commander par PharmaML';
    ok('Boutons regroupés par usage, séparés : Retour | disponibilité | sorties | produits | Nettoyer, Commander', barre.suite === attendu, barre.suite);
    const b = barre.boutons;
    ok('Aucune icône dans la barre du bas', b.every((x) => !x.icone), JSON.stringify(b.filter((x) => x.icone).map((x) => x.id)));
    ok('Aucun bouton ne chevauche son voisin ; textes entiers', b.every((x, i) => x.entier && (i === 0 || b[i - 1].d <= x.g + 0.5)), JSON.stringify(b.map((x) => [x.id, Math.round(x.g), Math.round(x.d), x.entier])));
    ok('Barre entière dans l\'écran de caisse (1366 × 768)', b.every((x) => x.g >= 0 && x.d <= barre.largeur && x.b <= barre.hauteur), JSON.stringify({ l: barre.largeur, max: Math.round(Math.max(...b.map((x) => x.d))) }));
    const fond = (id) => (b.find((x) => x.id === id) || {}).fond;
    ok('« Nettoyer » et « Commander par PharmaML » d\'un style distinct des autres boutons', fond('btn_clean_sugg') !== fond('btn_cancel') && fond('btn_sugg_commander_pml') !== fond('btn_cancel')
      && fond('btn_clean_sugg') !== fond('btn_sugg_commander_pml'), JSON.stringify([fond('btn_cancel'), fond('btn_clean_sugg'), fond('btn_sugg_commander_pml')]));

    /* Nettoyer : confirmation dans le bouton */
    const avant = lignes();
    await p.click('#btn_clean_sugg');
    await p.waitForTimeout(500);
    const c1 = await p.evaluate(() => ({ texte: Ext.getCmp('btn_clean_sugg').getText(), fenetre: Ext.ComponentQuery.query('window').some((w) => w.isVisible()) || Ext.Msg.isVisible() }));
    ok('« Nettoyer », premier clic : le bouton demande confirmation, aucune fenêtre, rien n\'est retiré', /Confirmer/.test(c1.texte) && !c1.fenetre && lignes().length === avant.length, JSON.stringify(c1));
    /* la souris reste sur le bouton : son infobulle ne doit pas le recouvrir (elle prenait le second clic) */
    await p.waitForTimeout(1500);
    const dessus = await p.evaluate(() => { const e = Ext.getCmp('btn_clean_sugg').getEl().dom, r = e.getBoundingClientRect(), x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { libre: !!(x && e.contains(x)), element: x ? String(x.id || x.className).slice(0, 60) : null }; });
    ok('Pendant la confirmation, rien ne recouvre le bouton (pas d\'infobulle sous la souris)', dessus.libre, JSON.stringify(dessus));
    await p.waitForTimeout(4100);
    const c2 = await p.evaluate(() => Ext.getCmp('btn_clean_sugg').getText());
    ok('Sans second clic, le bouton revient (« Nettoyer la suggestion »), rien n\'est retiré', c2 === 'Nettoyer la suggestion' && lignes().length === avant.length, c2);
    await p.click('#btn_clean_sugg');
    await p.waitForTimeout(600);
    await p.click('#btn_clean_sugg');
    for (let k = 0; k < 30 && lignes().length === avant.length; k++) { await p.waitForTimeout(500); }
    await p.waitForTimeout(1200);
    const apres = lignes();
    ok('Second clic : seul S (stock au-dessus du seuil) sort, les 2 autres restent', apres.length === 2 && !apres.includes(L[2].id) && apres.includes(L[0].id) && apres.includes(L[1].id), apres.length);
    const total = await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').getStore().getTotalCount());
    ok('Rapprochement : grille = base (2 lignes) ; bilan : un retrait journalisé', total === 2 && q(`SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '1', total);
    ok('Aucune fenêtre surgissante pendant le nettoyage', !(await p.evaluate(() => Ext.Msg.isVisible())));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close().catch(() => {});
    nettoyer();
    C.nettoyer();
    ok('Jeu d\'essai retiré, seuils remis', q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '0'
      && Object.keys(ORIGINE).every((id) => q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`) === ORIGINE[id]));
    process.exit(A.bilan() ? 1 : 0);
  }
})();
