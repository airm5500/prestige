/* INFO-BULLE DU NOM DU PRODUIT AVEC SA CLASSE (retours du 22/11, lot 10, point 2).
 *
 * Les noms trop longs pour la colonne se lisent dans l'info-bulle ; elle porte aussi la classe ABC de la fiche :
 *  - suggestion ouverte (colonne LIBELLE) : « LIBELLE : <nom> (classe A) » ; sans classe : « LIBELLE : <nom> » ;
 *  - commande en cours (colonne DESIGNATION) : « DESIGNATION : <nom> (classe A) » ; sans classe : le nom seul.
 * Jeu d'essai (retire a la fin) : une suggestion de 6 produits (2 A, 1 B, 1 C, 2 sans classe, quantites differentes) et une
 * commande en cours de 4 produits (A, B, C, sans classe), chez le meme grossiste.
 * Vrai chemin : connexion, menus « Suggestion de reappro. » et « Commande en cours », recherche de la reference au clavier,
 * icone « Modifier », info-bulle lue AU SURVOL de chaque nom, a 1366x768 puis 1280x720.
 * Controles : rapprochement info-bulle = nom et classe de la fiche en base, ligne par ligne ; bilan : suggestion et commande
 * inchangees ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const sql = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--raw', '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const SUGG = 'E2E-IBC-SUGG', REF = 'E2E-IBC-REF', CMD = 'E2E-IBC-CMD', MARQUE = 'E2E-IBC-';

function nettoyer() {
  sql(`DELETE FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN ('${SUGG}', '${CMD}');
    DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';
    DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${CMD}';`);
}

/* produits : un stock en rayon, aucune suggestion ni commande ouverte, classe demandee (NULL = sans classe) */
function produits(classe, n, exclus) {
  return sql(`SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.str_DESCRIPTION, f.str_NAME, IFNULL(f.lg_CLASSE_ABC_ID, '')) FROM t_famille f
    JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
    WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0 AND f.int_CIP REGEXP '^[0-9]{6,13}$'
    AND f.lg_CLASSE_ABC_ID ${classe ? "= '" + classe + "'" : 'IS NULL'}
    AND (SELECT COUNT(*) FROM t_famille_stock y WHERE y.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND y.lg_EMPLACEMENT_ID = '1') = 1
    AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d JOIN t_suggestion_order so ON so.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND so.str_STATUT <> 'is_Closed')
    AND NOT EXISTS (SELECT 1 FROM t_order_detail od JOIN t_order o ON o.lg_ORDER_ID = od.lg_ORDER_ID WHERE od.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND o.str_STATUT <> 'is_Closed')
    ${exclus.length ? 'AND f.lg_FAMILLE_ID NOT IN (' + exclus.map((x) => "'" + x + "'").join(',') + ')' : ''}
    ORDER BY f.str_DESCRIPTION LIMIT ${n}`).split('\n').filter(Boolean).map((l) => { const [id, description, nom, classe] = l.split('|'); return { id, description, nom, classe }; });
}
const lettre = (c) => (c ? c.slice(c.lastIndexOf('_') + 1) : '');

let G, FICHE0, P = [], PC = [];
function poser() {
  G = sql("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
  FICHE0 = sql(`SELECT CONCAT_WS('|', IFNULL(str_URL_PHARMAML, 'NULL'), int_PHARMAML_DISPO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`);
  const pris = [];
  for (const [c, n] of [['ABC_CLASSE_A', 2], ['ABC_CLASSE_B', 1], ['ABC_CLASSE_C', 1], [null, 2]]) {
    const l = produits(c, n, pris); l.forEach((x) => pris.push(x.id)); P.push(...l);
  }
  if (P.length !== 6) { throw new Error('jeu d\'essai incomplet : ' + P.length + ' produits'); }
  /* URL factice : rien n'est envoye (aucun clic n'interroge le grossiste quand la disponibilite est coupee) */
  sql(`UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:9/e2e', int_PHARMAML_DISPO = 1 WHERE lg_GROSSISTE_ID = '${G}';
    INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}', '${G}', 'is_Process', NOW(), NOW());
    INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES `
    + P.map((x, i) => `('${MARQUE}L${i}', '${SUGG}', '${G}', '${x.id}', ${[1, 3, 0, 7, 2, 12][i]}, 100, 150, 100, NOW(), NOW(), 'is_Process', 0)`).join(',') + ';');
  PC = [P[0], P[2], P[3], P[4]];
  sql(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
    VALUES ('${CMD}', '${CMD}', ${PC.length}, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0);
    INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES `
    + PC.map((x, i) => `('${MARQUE}O${i}', '${CMD}', '${x.id}', '${G}', ${[2, 1, 5, 4][i]}, 0, 'is_Process', NOW(), NOW())`).join(',') + ';');
}
const empreinte = () => sql(`SELECT CONCAT_WS('|', (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY lg_FAMILLE_ID) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'),
  (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY lg_FAMILLE_ID) FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'),
  (SELECT COUNT(*) FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN ('${SUGG}', '${CMD}')))`);
const disponibilite = (v) => sql(`UPDATE t_grossiste SET int_PHARMAML_DISPO = ${v} WHERE lg_GROSSISTE_ID = '${G}'`);


(async () => {
  try { nettoyer(); poser(); } catch (e) { console.log('FATAL ' + e.message); try { nettoyer(); } catch (x) { /* rien */ } process.exit(1); }
  disponibilite(0);
  const empreinte0 = empreinte();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  /* retour du 25/11 : la question « Nettoyer la suggestion ? » (fenetre a l'ouverture) recoit « Non, garder » */
  await require('../support/question-nettoyage-suggestion').garder(p);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const ouvrirSuggestion = async () => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Suggestion de reappro.');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await cliquer(p, '#rechecher'); await p.keyboard.press('Control+A'); await p.keyboard.type(REF, { delay: 20 }); await p.keyboard.press('Enter');
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: REF }).first();
    await rangee.waitFor({ timeout: 30000 });
    await rangee.locator('[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const ouvrirCommande = async () => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Ext.getCmp('OderGrid') && Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await cliquer(p, '#rechecher'); await p.keyboard.press('Control+A'); await p.keyboard.type(CMD, { delay: 20 }); await p.keyboard.press('Enter');
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: CMD }).first();
    await rangee.waitFor({ timeout: 30000 });
    await rangee.locator('[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await p.waitForFunction((n) => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === n; }, PC.length, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  /* info-bulle lue au survol, comme l'utilisateur la voit */
  const survol = async (selecteur) => {
    await p.mouse.move(5, 5); await p.waitForTimeout(300);
    if (await p.hover(selecteur, { timeout: 5000 }).then(() => true, () => false) === false) { return '(élément absent ou masqué)'; }
    await p.waitForFunction(() => Array.from(document.querySelectorAll('.x-tip')).some((t) => t.offsetParent !== null && t.textContent.trim()), null, { timeout: 5000 }).catch(() => {});
    return p.evaluate(() => Array.from(document.querySelectorAll('.x-tip')).filter((t) => t.offsetParent !== null).map((t) => t.textContent.trim()).join(' | '));
  };

  /* survol du nom de chaque ligne de la grille : info-bulle affichee */
  const bulles = async (grille, champ) => {
    const ids = await p.evaluate(([g, d]) => { const grid = Ext.getCmp(g), col = grid.columns.find((c) => c.dataIndex === d);
      return grid.getStore().getRange().map((r, i) => { const n = grid.getView().getNode(i), td = n && n.querySelector('.x-grid-cell-' + col.id);
        if (td) { td.setAttribute('data-e2e-nom', 'n' + i); } return { id: r.get('lg_FAMILLE_ID'), sel: '[data-e2e-nom="n' + i + '"]' }; }); }, [grille, champ]);
    const o = {};
    for (const x of ids) { o[x.id] = await survol(x.sel); }
    return o;
  };
  const rapprocher = (titre, vu, attendus, champNom, entete, nomSansClasse) => {
    const ecarts = attendus.map((x) => {
      const l = lettre(x.classe);
      const voulu = l ? entete + ' : ' + x[champNom] + ' (classe ' + l + ')' : (nomSansClasse ? entete + ' : ' + x[champNom] : entete + ' : ' + x[champNom]);
      return vu[x.id] === voulu ? null : x.id + ' « ' + vu[x.id] + ' » / « ' + voulu + ' »';
    }).filter(Boolean);
    ok(titre, ecarts.length === 0 && Object.keys(vu).length === attendus.length, ecarts.join(' ; '));
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    for (const [lg, ht] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: lg, height: ht });
      await ouvrirSuggestion();
      const vs = await bulles('gridpanelSuggestionID', 'str_FAMILLE_NAME');
      rapprocher(`${lg}×${ht} suggestion : info-bulle du nom = « LIBELLE : nom (classe X) » de la fiche, ligne par ligne (A, A, B, C, sans classe ×2)`, vs, P, 'description', 'LIBELLE', true);
      await ouvrirCommande();
      const vc = await bulles('gridpanelID', 'lg_FAMILLE_NAME');
      const champ = await p.evaluate(() => { const r = Ext.getCmp('gridpanelID').getStore().getAt(0); return r.get('lg_FAMILLE_NAME') === undefined ? '' : 'lg_FAMILLE_NAME'; });
      /* le nom affiche dans la commande est celui de la ligne (lg_FAMILLE_NAME, la designation de la fiche) */
      const noms = await p.evaluate(() => Ext.getCmp('gridpanelID').getStore().getRange().map((r) => [r.get('lg_FAMILLE_ID'), r.get('lg_FAMILLE_NAME')]));
      const attendusC = PC.map((x) => Object.assign({}, x, { affiche: (noms.find((n) => n[0] === x.id) || [])[1] }));
      ok(`${lg}×${ht} commande : nom de la ligne = fiche (désignation ou nom)`, champ === 'lg_FAMILLE_NAME' && attendusC.every((x) => x.affiche === x.description || x.affiche === x.nom), JSON.stringify(noms));
      rapprocher(`${lg}×${ht} commande en cours : info-bulle du nom = « DESIGNATION : nom (classe X) », ligne par ligne (A, B, C, sans classe)`, vc, attendusC, 'affiche', 'DESIGNATION', true);
    }
    ok('Bilan : suggestion et commande inchangées', empreinte() === empreinte0);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    if (FICHE0) { const [u, d] = FICHE0.split('|'); sql(`UPDATE t_grossiste SET str_URL_PHARMAML = ${u === 'NULL' ? 'NULL' : "'" + u + "'"}, int_PHARMAML_DISPO = ${d} WHERE lg_GROSSISTE_ID = '${G}'`); }
    ok('Nettoyage : suggestion et commande d\'essai retirées, fiche du grossiste remise', sql(`SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '0'
      && sql(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${CMD}'`) === '0'
      && sql(`SELECT CONCAT_WS('|', IFNULL(str_URL_PHARMAML, 'NULL'), int_PHARMAML_DISPO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`) === FICHE0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
