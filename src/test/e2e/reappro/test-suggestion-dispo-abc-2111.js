/* PLAN DU 21/11, POINTS 4.2 ET 4.5 : SUGGESTION OUVERTE ET COMMANDE EN COURS.
 *
 * 4.2 « Actualiser » et le filtre de disponibilité passent dans la barre de pagination, juste après son propre bouton
 *     actualiser ; la barre du haut garde la recherche et la bande d'informations du produit.
 * 4.5 Les boutons de vérification de disponibilité sont toujours affichés. Disponibilité coupée dans la fiche du
 *     grossiste : « Vérifier la disponibilité » et le ⟳ de chaque ligne restent visibles, grisés, sans effet au clic,
 *     et l'info-bulle dit pourquoi et comment l'activer. La classe ABC de la fiche s'affiche après le nom, ex.
 *     « DOLIPRANE 500 (A) », dans la suggestion et dans la commande en cours ; un produit sans classe n'affiche rien.
 *
 * Jeu d'essai (retiré à la fin) : une suggestion de 6 produits (2 de classe A, 1 B, 1 C, 2 sans classe, quantités
 * différentes) et une commande en cours de 4 produits (A, B, C, sans classe) chez le même grossiste.
 * Vrai chemin : connexion, menus « Suggestion de reappro. » et « Commande en cours », recherche de la référence au
 * clavier, icône « Modifier », boutons cliqués, info-bulle lue au survol.
 * Contrôles :
 *  - rapprochement : pour chaque ligne, nom affiché + classe affichée = fiche en base (nom, lettre de la classe) ;
 *  - 4.2 : position des deux éléments dans la pagination ; « Actualiser » recharge la liste ; le filtre marche ;
 *  - 4.5 : boutons et ⟳ grisés et inactifs quand la disponibilité est coupée (aucune requête au grossiste),
 *          normaux quand elle est active ;
 *  - bilan : la suggestion et la commande sont inchangées (lignes, quantités), aucun résultat de disponibilité écrit,
 *    la fiche du grossiste est remise ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/reappro/test-suggestion-dispo-abc-2111.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const sql = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--raw', '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const SUGG = 'E2E-SDA-SUGG', REF = 'E2E-SDA-REF', CMD = 'E2E-SDA-CMD', MARQUE = 'E2E-SDA-';

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
  const empreinte0 = empreinte();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const requetes = []; p.on('request', (r) => { const u = r.url(); if (/disponibilite\/(produits|verifier)|suggestion\/list\/items/.test(u)) { requetes.push(u.replace(/^.*\/api\/v1\//, '')); } });

  /* lignes affichees : nom de la cellule et lettre de classe affichee */
  const lignesAffichees = (grille, champ) => p.evaluate(([g, d]) => {
    const grid = Ext.getCmp(g), col = grid.columns.find((c) => c.dataIndex === d);
    return grid.getStore().getRange().map((r, i) => { const n = grid.getView().getNode(i), td = n && n.querySelector('.x-grid-cell-' + col.id);
      const abc = td && td.querySelector('.classe-abc');
      return { id: r.get('lg_FAMILLE_ID'), texte: td ? td.textContent.replace(/\s+/g, ' ').trim() : null, classe: abc ? abc.getAttribute('data-classe-abc') : '' }; });
  }, [grille, champ]);
  const rapprocher = (titre, affiche, attendus, champNom) => {
    const ecarts = attendus.map((x) => { const a = affiche.find((l) => l.id === x.id); const l = lettre(x.classe);
      const texte = x[champNom] + (l ? ' (' + l + ')' : '');
      return !a ? x.id + ' absent' : (a.classe !== l || a.texte.indexOf(texte) !== 0) ? x.id + ' affiché « ' + a.texte + ' » / attendu « ' + texte + ' »' : null; }).filter(Boolean);
    ok(titre + ' : nom et classe ABC = fiche, ligne par ligne (A, A, B, C, sans classe)', affiche.length === attendus.length && ecarts.length === 0, ecarts.join(' ; ') || affiche.length);
  };
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
  const etatBouton = (id) => p.evaluate((i) => { const b = Ext.getCmp(i); return b ? { visible: b.isVisible(true), grise: b.hasCls('dispo-coupee'),
    opacite: b.getEl() ? getComputedStyle(b.getEl().dom).opacity : null, tooltip: String(b.tooltip || '') } : null; }, id);
  /* info-bulle lue au survol, comme l'utilisateur la voit */
  const survol = async (selecteur) => {
    await p.mouse.move(5, 5); await p.waitForTimeout(300);
    if (await p.hover(selecteur, { timeout: 5000 }).then(() => true, () => false) === false) { return '(élément absent ou masqué)'; }
    await p.waitForFunction(() => Array.from(document.querySelectorAll('.x-tip')).some((t) => t.offsetParent !== null && t.textContent.trim()), null, { timeout: 5000 }).catch(() => {});
    return p.evaluate(() => Array.from(document.querySelectorAll('.x-tip')).filter((t) => t.offsetParent !== null).map((t) => t.textContent.trim()).join(' | '));
  };
  const verifs = (cellule) => p.evaluate(([g]) => { const d = Ext.getCmp(g).getEl().dom;
    return { actifs: d.querySelectorAll('[data-verif-dispo]').length, grises: d.querySelectorAll('[data-verif-coupee]').length }; }, [cellule]);

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---------- suggestion, disponibilité active ---------- */
    await ouvrirSuggestion();
    const pos = await p.evaluate(() => {
      const g = Ext.getCmp('gridpanelSuggestionID'), pt = g.down('pagingtoolbar'), items = pt.items.items;
      const act = Ext.getCmp('btn_sugg_actualiser'), filtre = g.down('#filtreDispo');
      const iRefresh = items.indexOf(pt.down('#refresh')), iAct = items.indexOf(act), iFiltre = items.indexOf(filtre);
      const haut = g.getDockedItems('toolbar[dock="top"]')[0];
      return { iRefresh, iAct, iFiltre, dansPagination: !!(act && filtre && act.up('pagingtoolbar') && filtre.up('pagingtoolbar')),
        hautActualiser: !!(haut && haut.down('#btn_sugg_actualiser')), hautInfo: !!(haut && haut.down('#suggInfoBar')), visibles: !!(act && filtre && act.isVisible(true) && filtre.isVisible(true)) };
    });
    ok('4.2 : « Actualiser » et le filtre de disponibilité dans la pagination, juste après son bouton actualiser', pos.dansPagination && pos.visibles && pos.iRefresh >= 0
      && pos.iAct > pos.iRefresh && pos.iAct - pos.iRefresh <= 2 && pos.iFiltre > pos.iAct && pos.iFiltre - pos.iAct <= 2, JSON.stringify(pos));
    ok('4.2 : la barre du haut garde la recherche et la bande d\'informations, sans « Actualiser »', !pos.hautActualiser && pos.hautInfo, JSON.stringify(pos));
    const avant = requetes.filter((r) => /list\/items/.test(r)).length;
    await p.click('#btn_sugg_actualiser');
    await p.waitForFunction(() => !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    ok('4.2 : « Actualiser » (nouvelle place) recharge la liste', requetes.filter((r) => /list\/items/.test(r)).length === avant + 1, requetes.slice(-3).join(' , '));
    const sug = await lignesAffichees('gridpanelSuggestionID', 'str_FAMILLE_NAME');
    rapprocher('4.5 suggestion', sug, P, 'description');
    const bA = await etatBouton('btn_dispo_verifier'), vA = await verifs('gridpanelSuggestionID');
    ok('4.5 : disponibilité active, « Vérifier la disponibilité » normal, un ⟳ actif par ligne', bA && bA.visible && !bA.grise && Number(bA.opacite) === 1
      && /Interroger le grossiste/.test(bA.tooltip) && vA.actifs === P.length && vA.grises === 0, JSON.stringify({ bA, vA }));

    /* ---------- suggestion, disponibilité coupée dans la fiche ---------- */
    disponibilite(0);
    await ouvrirSuggestion();
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_dispo_verifier'); return b && b.isVisible(true) && b.hasCls('dispo-coupee'); }, null, { timeout: 15000 }).catch(() => {});
    const bC = await etatBouton('btn_dispo_verifier'), vC = await verifs('gridpanelSuggestionID');
    ok('4.5 : disponibilité coupée, « Vérifier la disponibilité » affiché mais grisé', bC && bC.visible && bC.grise && Number(bC.opacite) < 0.6, JSON.stringify(bC));
    const bulle = await survol('#btn_dispo_verifier');
    ok('4.5 : au survol, l\'info-bulle dit pourquoi et comment l\'activer', /non interrogée/.test(bulle) && /Interroger la disponibilité/.test(bulle) && /fiche du grossiste/.test(bulle), bulle);
    const nReq = requetes.filter((r) => /disponibilite/.test(r)).length;
    await p.click('#btn_dispo_verifier', { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const boite = await p.evaluate(() => Ext.MessageBox.isVisible());
    ok('4.5 : clic sur le bouton grisé : aucune requête au grossiste, aucune fenêtre', requetes.filter((r) => /disponibilite/.test(r)).length === nReq && !boite, requetes.slice(-2).join(' , '));
    ok('4.5 : le ⟳ reste affiché sur chaque ligne, grisé', vC.grises === P.length && vC.actifs === 0, JSON.stringify(vC));
    const bulleLigne = await survol('#gridpanelSuggestionID [data-verif-coupee]');
    await p.click('#gridpanelSuggestionID [data-verif-coupee]', { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(1200);
    ok('4.5 : ⟳ grisé : raison au survol, clic sans requête', /Interroger la disponibilité/.test(bulleLigne) && requetes.filter((r) => /disponibilite/.test(r)).length === nReq, bulleLigne);
    /* filtre de disponibilite a sa nouvelle place : « Tous » garde toutes les lignes */
    const filtre = await p.evaluate(() => { const c = Ext.getCmp('gridpanelSuggestionID').down('#filtreDispo'); return { valeur: c && c.getValue(), place: !!(c && c.up('pagingtoolbar')), lignes: Ext.getCmp('gridpanelSuggestionID').getStore().getCount() }; });
    ok('4.2 : filtre de disponibilité à sa nouvelle place, la liste complète affichée', filtre.place && filtre.lignes === P.length, JSON.stringify(filtre));

    /* ---------- commande en cours ---------- */
    await ouvrirCommande();
    const cmd = await lignesAffichees('gridpanelID', 'lg_FAMILLE_NAME');
    rapprocher('4.5 commande en cours', cmd, PC, 'nom');
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_cmd_dispo_verifier'); return b && b.isVisible(true) && b.hasCls('dispo-coupee'); }, null, { timeout: 15000 }).catch(() => {});
    const cC = await etatBouton('btn_cmd_dispo_verifier');
    /* l'info-bulle est lue au survol (setTooltip d'Ext ne met pas a jour la propriete tooltip du bouton) */
    const bulleCmd = await survol('#btn_cmd_dispo_verifier');
    ok('4.5 commande : disponibilité coupée, bouton affiché et grisé, raison en info-bulle', cC && cC.visible && cC.grise && /Interroger la disponibilité/.test(bulleCmd), JSON.stringify(cC) + ' ' + bulleCmd);
    const nReq2 = requetes.filter((r) => /disponibilite/.test(r)).length;
    await p.click('#btn_cmd_dispo_verifier', { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(1500);
    ok('4.5 commande : clic sur le bouton grisé sans requête ni fenêtre', requetes.filter((r) => /disponibilite/.test(r)).length === nReq2 && !(await p.evaluate(() => Ext.MessageBox.isVisible())));
    disponibilite(1);
    await ouvrirCommande();
    await p.waitForTimeout(1000);
    const cA = await etatBouton('btn_cmd_dispo_verifier'), vCA = await verifs('gridpanelID');
    ok('4.5 commande : disponibilité réactivée, bouton normal et ⟳ actifs', cA && cA.visible && !cA.grise && /Interroger le grossiste/.test(cA.tooltip) && vCA.actifs === PC.length, JSON.stringify({ cA, vCA }));

    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
    const empreinte1 = empreinte();
    ok('Bilan : suggestion et commande inchangées (produits, quantités), aucun résultat de disponibilité écrit', empreinte0 === empreinte1 && /\|0$/.test(empreinte1), empreinte0 + ' / ' + empreinte1);
    const fiche = FICHE0.split('|');
    sql(`UPDATE t_grossiste SET str_URL_PHARMAML = ${fiche[0] === 'NULL' ? 'NULL' : "'" + fiche[0] + "'"}, int_PHARMAML_DISPO = ${fiche[1]} WHERE lg_GROSSISTE_ID = '${G}'`);
    nettoyer();
    ok('Jeu d\'essai retiré, fiche du grossiste remise', sql(`SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'`) === '0'
      && sql(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${CMD}'`) === '0'
      && sql(`SELECT CONCAT_WS('|', IFNULL(str_URL_PHARMAML, 'NULL'), int_PHARMAML_DISPO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`) === FICHE0);
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
