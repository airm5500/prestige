/* PLAN DU 08/11, POINTS 11.4 ET 11.5 : SUGGESTION DE REAPPRO OUVERTE, « ACTUALISER » ET NETTOYAGE A L'OUVERTURE.
 *
 * 11.4 Un bouton « Actualiser » recharge la page en cours (recherche gardee) : lignes ET couleurs. Une ligne en bleu
 *      (commande en cours) dont la commande disparait n'est plus bleue apres « Actualiser ».
 * 11.5 Parametre KEY_NETTOYER_SUGGESTION_OUVERTURE (migration, 0 par defaut, visible dans l'ecran des parametres) :
 *      a 0, ouvrir la suggestion ne retire rien ; a 1, l'ouverture nettoie (meme regle que le bouton), puis affiche la
 *      liste et un court message « n produits retires … ».
 * Jeu d'essai (retire a la fin) : une suggestion de 6 produits non geres en reserve :
 *   B  seuil tres haut, une commande en cours (bleu)   -> reste
 *   K1, K2, K3 seuil tres haut                       -> restent
 *   S1 seuil = rayon - 1, S2 seuil = rayon - 5         -> sortent au nettoyage (stock au-dessus du seuil)
 * Par les ecrans : liste des suggestions > recherche de la reference > « Modifier ».
 * Rapprochement : grille = base (lignes, total) ; bilan : seules S1 et S2 sortent, un retrait journalise chacune.
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const SUGG = 'E2E-ACT-SUGG', REF = 'E2E-ACT-REF', MARQUE = 'E2E-ACT-', ORD = 'E2E-ACT-ORD';
const PARAM = 'KEY_NETTOYER_SUGGESTION_OUVERTURE';
const PARAM_AVANT = q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${PARAM}'`);
const ORIGINE = {};
let B = null, K = [], S = [];

function produits(n, exclus) {
  return q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE, f.int_CIP, f.str_NAME) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 400 AND f.int_CIP REGEXP '^[0-9]{6,13}$'"
    + " AND (SELECT COUNT(*) FROM t_famille_stock y WHERE y.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND y.lg_EMPLACEMENT_ID = '1') = 1"
    + " AND COALESCE(f.bool_RESERVE, 0) = 0"
    /* seules les suggestions et commandes encore ouvertes colorent une ligne (etat du produit) */
    + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d JOIN t_suggestion_order so ON so.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND so.str_STATUT <> 'is_Closed')"
    + " AND NOT EXISTS (SELECT 1 FROM t_order_detail o JOIN t_order od ON od.lg_ORDER_ID = o.lg_ORDER_ID WHERE o.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND od.str_STATUT IN ('is_Process', 'passed', 'enable'))"
    + " AND NOT EXISTS (SELECT 1 FROM t_bon_livraison_detail o JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = o.lg_BON_LIVRAISON_ID WHERE o.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND b.str_STATUT = 'enable')"
    + (exclus.length ? ' AND f.lg_FAMILLE_ID NOT IN (' + exclus.map((x) => "'" + x + "'").join(',') + ')' : '')
    + " AND f.str_NAME LIKE 'C%' ORDER BY f.str_NAME LIMIT " + n).split(/\r?\n/).filter(Boolean).map((l) => { const [id, r, cip, nom] = l.split('|'); return { id, r: Number(r), cip, nom }; });
}

function parametre(v) {
  if (v === 'ABSENT') { C.exec(`DELETE FROM t_parameters WHERE str_KEY = '${PARAM}'`); } else { C.exec(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${PARAM}'`); }
}

function nettoyer() {
  C.exec(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`
    + `DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`);
  Object.keys(ORIGINE).forEach((id) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${ORIGINE[id]} WHERE lg_FAMILLE_ID = '${id}'`));
  if (PARAM_AVANT !== 'ABSENT') { parametre(PARAM_AVANT); }
}

function poser() {
  const l = produits(6, []);
  if (l.length !== 6) { return 'produits insuffisants'; }
  [B, ...K] = l.slice(0, 4);
  S = l.slice(4);
  l.forEach((x) => { ORIGINE[x.id] = q(`SELECT IFNULL(int_SEUIL_MIN, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`); });
  [B, ...K].forEach((x) => C.exec(`UPDATE t_famille SET int_SEUIL_MIN = 100000 WHERE lg_FAMILLE_ID = '${x.id}'`));
  C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${S[0].r - 1} WHERE lg_FAMILLE_ID = '${S[0].id}'`);
  C.exec(`UPDATE t_famille SET int_SEUIL_MIN = ${S[1].r - 5} WHERE lg_FAMILLE_ID = '${S[1].id}'`);
  const grossiste = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
  C.exec(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}', '${grossiste}', 'is_Process', NOW(), NOW())`);
  l.forEach((x, i) => C.exec('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,'
    + ` int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${MARQUE}L${i}', '${SUGG}', '${grossiste}', '${x.id}', ${i + 1}, 100, 150, 100, NOW(), NOW(), 'is_Process', 0)`));
  /* commande en cours pour B : ligne bleue */
  C.exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${ORD}', '${ORD}', '${grossiste}', 'is_Process', NOW(), NOW());`
    + `INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${MARQUE}OD', '${ORD}', '${B.id}', '${grossiste}', 3, 'is_Process', NOW(), NOW());`);
  return null;
}

const lignes = () => q(`SELECT lg_FAMILLE_ID FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`).split(/\r?\n/).filter(Boolean);

(async () => {
  try { nettoyer(); } catch (e) { /* rien */ }
  let erreur;
  try { erreur = poser(); } catch (e) { erreur = String(e.message).split('\n')[0]; }
  if (erreur) { console.log('FATAL : ' + erreur); nettoyer(); process.exit(1); }
  ok('11.5 : paramètre ' + PARAM + ' créé par la migration, 0 par défaut', PARAM_AVANT === '0', PARAM_AVANT);
  ok('11.5 : paramètre rangé dans la rubrique « Commandes » de l\'écran des paramètres', /KEY_NETTOYER_SUGGESTION/.test(require('fs').readFileSync(require('path').join(__dirname, '../../../main/java/util/RubriqueParametre.java'), 'utf8')));
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
    await rangee.locator('img[data-qtip="Modifier"], .x-action-col-icon[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  const grille = () => p.evaluate((b) => { const g = Ext.getCmp('gridpanelSuggestionID'), s = g.getStore();
    const i = s.findExact('lg_FAMILLE_ID', b), n = i >= 0 ? g.getView().getNode(i) : null;
    /* couleur d'etat posee sur les cellules (style en ligne) : la ligne selectionnee est violette par-dessus */
    /* ExtJS pose le style du renderer (meta.style) sur le div interieur de la cellule, pas sur le td */
    const td = n && (Array.from(n.querySelectorAll('td, .x-grid-cell-inner')).find((t) => t.style.backgroundColor) || n.querySelector('td'));
    return { ids: s.getRange().map((r) => r.get('lg_FAMILLE_ID')), total: s.getTotalCount(), page: s.currentPage,
      etatB: i >= 0 ? JSON.stringify(s.getAt(i).get('produitState')) : null,
      fondB: td ? (td.style.backgroundColor || 'aucune') : null, recherche: Ext.getCmp('rechercherDetail').getValue() }; }, B.id);
  const BLEU = 'rgb(95, 162, 221)';
  try {
    ok('Préparation : 6 lignes, une commande en cours pour B', lignes().length === 6);
    /* ----- 11.5 a 0 : rien n'est retire a l'ouverture ----- */
    await ouvrir();
    const g0 = await grille();
    ok('11.5 à 0 : l\'ouverture ne retire rien (grille = base = 6 lignes)', lignes().length === 6 && g0.total === 6, JSON.stringify(g0));
    ok('11.4 : B (commande en cours) en bleu à l\'ouverture', g0.fondB === BLEU, g0.fondB + ' ' + g0.etatB);

    /* ----- 11.4 : la commande disparait, « Actualiser » ----- */
    C.exec(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`);
    const bouton = p.locator('#btn_sugg_actualiser');
    ok('11.4 : bouton « Actualiser » dans la barre de la suggestion', await bouton.count() === 1 && await bouton.isVisible(), await bouton.count());
    await p.fill('#rechercherDetail-inputEl', B.cip);
    await p.waitForFunction((c) => Ext.getCmp('rechercherDetail').getValue() === c, B.cip, { timeout: 5000 });
    await p.press('#rechercherDetail-inputEl', 'Enter');
    await p.waitForTimeout(800);
    await p.waitForFunction(() => !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
    const charge = p.waitForResponse((r) => /suggestion\/list\/items/.test(r.url()), { timeout: 30000 });
    await bouton.click();
    await charge;
    await p.waitForTimeout(800);
    const g1 = await grille();
    ok('11.4 : après « Actualiser », B n\'est plus en bleu ; recherche gardée, une seule ligne (B)', g1.fondB !== BLEU && g1.fondB !== null && g1.recherche === B.cip
      && g1.total === 1 && g1.ids[0] === B.id, JSON.stringify(g1));
    ok('11.4 : « Actualiser » ne modifie pas la suggestion', lignes().length === 6);

    /* ----- 11.5 a 1 : l'ouverture nettoie ----- */
    parametre('1');
    await ouvrir();
    const g2 = await grille();
    const apres = lignes();
    ok('11.5 à 1 : S1 et S2 (stock au-dessus du seuil) sortent à l\'ouverture, B, K1..K3 restent', apres.length === 4 && S.every((x) => !apres.includes(x.id))
      && [B, ...K].every((x) => apres.includes(x.id)), apres.length + ' lignes');
    ok('Rapprochement : grille = base après le nettoyage (4 lignes)', g2.total === 4 && g2.ids.every((id) => apres.includes(id)), JSON.stringify(g2));
    const message = await p.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((e) => e.children.length === 0 && /produits? retir/.test(e.textContent || '')).map((e) => e.textContent.trim()).join(' | '));
    ok('11.5 à 1 : court message « 2 produits retirés … »', /2 produits retirés/.test(message), message.slice(0, 200));
    const journal = q(`SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`);
    ok('Bilan : un retrait journalisé par ligne sortie (2), rien d\'autre', journal === '2', journal);
    /* reouverture : plus rien a retirer, aucun message */
    await ouvrir();
    ok('11.5 à 1 : réouverture sans produit à retirer, rien ne change', lignes().length === 4 && q(`SELECT COUNT(*) FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '2');
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
