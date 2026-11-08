/* RESERVE : ARTICLE DECOCHE « RESERVE » ALORS QU'IL EST DANS UNE SUGGESTION OUVERTE (plan du 08/11, point 9d).
 *
 * Constat sur laborex_v1_db : 67 produits non coches « reserve » restaient dans des suggestions ouvertes (DIACOL,
 * CEFIM...) ; tous avaient ete geres en reserve, la case a ete decochee ensuite. Le decochage vidait la reserve vers
 * le rayon sans aucune trace et laissait les lignes ouvertes, qui tombaient ensuite en CONFIG_STOCK_INCOMPLETE.
 *
 * Parcours a l'ecran (admin) :
 *  1. Articles > Modifier > decocher « Cet article aura t-il un stock reserve ? » > Enregistrer :
 *     - comme avant : case decochee, reserve videe vers le rayon (+7), ligne de stock reserve retiree ;
 *     - NOUVEAU : la ligne ouverte du produit est retiree de la suggestion, avec son motif ;
 *     - NOUVEAU : le transfert reserve -> rayon est trace dans les mouvements de reserve (un seul, 7, 7 -> 0).
 *  2. Gestion des reserves > Suggestions > ouvrir la suggestion > Traiter :
 *     - la ligne d'un produit deja non gere en reserve (donnee anterieure) echoue avec un code clair
 *       PRODUIT_HORS_RESERVE (et non plus CONFIG_STOCK_INCOMPLETE) ; son stock ne bouge pas.
 *  3. Application mobile (ajout d'une ligne, seul chemin d'ajout unitaire) : produit non gere en reserve refuse,
 *     code NON_GERE_EN_RESERVE, rien d'ajoute.
 *  4. Bilan : un seul mouvement de reserve, celui du decochage ; rien pour l'autre produit.
 * Les donnees d'essai sont retirees et les produits remis a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droits = [privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_TRAITER_RESERVE'), privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_RESERVE')];

/* deux produits actifs, au CIP unique, avec stock rayon a l'emplacement 1 et sans ligne de stock reserve */
const candidats = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 500 AND f.int_CIP REGEXP '^[0-9]{6,13}$'"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2')"
  + " AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 3 OFFSET 7").split(/\r?\n/).map((l) => l.split('|'));
const [P, CIP_P] = candidats[0] || [];
const [Q, CIP_Q] = candidats[1] || [];
const [R] = candidats[2] || [];
const COLS = 'bool_RESERVE, int_SEUIL_RESERVE, int_SEUIL_MINI_RAYON';
const ligneFamille = (id) => q(`SELECT CONCAT_WS('|', ${COLS.split(', ').map((c) => `IFNULL(${c}, 'NULL')`).join(', ')}) FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`);
const stock = (id) => q(`SELECT CONCAT_WS('|', int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1'`);
const typeRayon = (id) => q(`SELECT int_NUMBER FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1' LIMIT 1`);
const ORIGINE = {}, STOCK = {}, RAYON = {};
[P, Q, R].forEach((id) => { if (id) { ORIGINE[id] = ligneFamille(id); STOCK[id] = stock(id); RAYON[id] = typeRayon(id); } });
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const M = 'E2E-RES-DEC-';
const debut = q('SELECT NOW()');

function remettre() {
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE '${M}%';`
    + ` DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '${M}%';`
    + ` DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '${M}%';`
    + ` DELETE FROM mobile_client_ref WHERE ref LIKE '${M}%';`);
  [P, Q, R].forEach((id) => {
    if (!id) { return; }
    const v = ORIGINE[id].split('|').map((x) => (x === 'NULL' ? 'NULL' : `'${x}'`));
    const [dispo, total] = STOCK[id].split('|');
    exec(`UPDATE t_famille SET ${COLS.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} WHERE lg_FAMILLE_ID = '${id}';`
      + ` UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${dispo}, int_NUMBER = ${total} WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1';`
      + ` UPDATE t_type_stock_famille SET int_NUMBER = ${RAYON[id]} WHERE lg_FAMILLE_ID = '${id}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';`
      + ` DELETE FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${id}' AND lg_TYPE_STOCK_ID = '2';`
      + ` DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '${id}' AND dt_CREATED >= '${debut}';`);
  });
}
function poserLigne(id, famille, qte) {
  exec(`INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,`
    + ` int_STOCK_RAYON, int_STOCK_RESERVE, int_SEUIL_DECLENCHEUR, int_CIBLE, int_DISPONIBLE, str_FORMULE, str_ETAT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${M}L-${famille}', '${M}${id}', '${famille}', ${qte}, ${qte}, 0, 2, 7, 10, 10, 7, 'E2E', 'PROPOSEE', NOW(), NOW())`);
}

(async () => {
  droits.forEach((d) => d.remettre());
  ok('Jeu d\'essai : trois produits', !!P && !!Q && !!R, [P, Q, R].join(' / '));
  remettre();
  try {
    exec(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = 10, int_SEUIL_MINI_RAYON = 3 WHERE lg_FAMILLE_ID = '${P}';`
      + ` INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)`
      + ` VALUES ('${M}P', '${P}', '2', '1', 'reserve', 'reserve', NOW(), NOW(), 'enable', 7);`
      + ` UPDATE t_famille SET bool_RESERVE = 0 WHERE lg_FAMILLE_ID IN ('${Q}', '${R}');`
      + ` INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, lg_EMPLACEMENT_ID, lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED, str_COMMENTAIRE, motif_id)`
      + ` VALUES ('${M}A', '${M}A', 'RAYON', 'MANUELLE', 'A_TRAITER', '1', '${ADMIN}', NOW(), NOW(), 'E2E-RES-DEC', (SELECT id FROM motif_suggestion_reserve ORDER BY id LIMIT 1))`);
    poserLigne('A', P, 3);
    poserLigne('A', Q, 2);
  } catch (e) { remettre(); throw e; }
  const STOCK_P = Number(STOCK[P].split('|')[0]);
  const STOCK_Q = STOCK[Q];

  let b = null;
  const err = [];
  const connecter = async () => {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    return p;
  };
  try {
    b = await ENV_E2E.lancer(chromium);
    const p = await connecter();

    /* ----- 1. fiche article : decocher la reserve ----- */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.locator('#rechecher input, input#rechecher-inputEl').first().fill(CIP_P);
    await p.locator('#rechecher input, input#rechecher-inputEl').first().press('Enter');
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, P, { timeout: 60000 });
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onEditClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, P);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('checkbox[itemId=bool_RESERVE]').filter((x) => x.isVisible())[0]; return c && c.getValue() === true; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    /* clic sur la case, comme l'utilisateur */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('checkbox[itemId=bool_RESERVE]').filter((x) => x.isVisible())[0]; c.inputEl.dom.click(); });
    const decochee = await p.evaluate(() => Ext.ComponentQuery.query('checkbox[itemId=bool_RESERVE]').filter((x) => x.isVisible())[0].getValue());
    ok('Fiche : la case « réserve » se décoche', decochee === false);
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').find((x) => x.isVisible() && x.down('checkbox[itemId=bool_RESERVE]'));
      w.query('button').find((x) => x.text === 'Enregistrer').btnEl.dom.click(); });
    for (let i = 0; i < 40 && q(`SELECT IFNULL(bool_RESERVE, 0) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`) !== '0'; i++) { await p.waitForTimeout(500); }
    await p.waitForTimeout(1000);

    ok('Comme avant : case décochée en base, ligne de stock réserve retirée', q(`SELECT IFNULL(bool_RESERVE, 0) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${P}' AND lg_TYPE_STOCK_ID = '2'`) === '0');
    ok('Comme avant : la réserve (7) passe au rayon', Number(stock(P).split('|')[0]) === STOCK_P + 7, stock(P) + ' / avant ' + STOCK_P);
    const ligneP = q(`SELECT CONCAT_WS('|', str_ETAT, IFNULL(str_MOTIF_LIGNE, '')) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${M}L-${P}'`).split('|');
    ok('Nouveau : la ligne ouverte du produit est retirée de la suggestion, avec son motif', ligneP[0] === 'SUPPRIMEE' && /fiche/i.test(ligneP[1]), ligneP.join(' | '));
    const mvt = q(`SELECT CONCAT_WS('|', str_TYPE, int_QTE, int_STOCK_RESERVE_AVANT, int_STOCK_RESERVE_APRES, int_STOCK_RAYON_AVANT, int_STOCK_RAYON_APRES, lg_USER_ID)`
      + ` FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}'`).split(/\r?\n/).filter((x) => x);
    ok('Nouveau : le transfert réserve → rayon est tracé (un mouvement, 7, réserve 7 → 0, rayon avant → +7)', mvt.length === 1
      && mvt[0] === ['REASSORT', 7, 7, 0, STOCK_P, STOCK_P + 7, ADMIN].join('|'), JSON.stringify(mvt));

    /* ----- 2. gestion des reserves : traiter la suggestion ----- */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('reservemanager', 'Gestion des reserves', ''));
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    await p.evaluate(() => { const m = Ext.getCmp('reservemanagerID'); m.setActiveTab(m.down('#ongletSuggestions')); });
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g && g.filtreInitialise && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    const champ = p.locator('[id^="reservemanager"] input[placeholder="Produit ou CIP"]').first();
    await champ.fill(CIP_Q);
    await champ.press('Enter');
    await p.waitForFunction((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return !g.getStore().isLoading() && g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id) >= 0; }, M + 'A', { timeout: 30000 });
    /* icone « Ouvrir la suggestion » de la ligne */
    const noeud = await p.evaluate((id) => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions');
      const n = g.getView().getNode(g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', id)); return n ? n.id : null; }, M + 'A');
    /* la premiere icone de la ligne est « Ouvrir la suggestion » (colonne colOuvrir, avant inventaire, imprimer...) */
    await p.locator('[id="' + noeud + '"] .x-action-col-icon').first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('reservetraitementsuggestion').some((w) => w.win && w.win.isVisible() && !w.win.down('grid').getStore().isLoading()), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.locator('.x-window .x-btn').filter({ hasText: 'Traiter la suggestion' }).first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()), null, { timeout: 15000 });
    await p.locator('.x-message-box .x-btn').filter({ hasText: /^(Oui|Yes)$/ }).first().click();
    for (let i = 0; i < 40 && q(`SELECT str_ETAT FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${M}L-${Q}'`) === 'PROPOSEE'; i++) { await p.waitForTimeout(500); }
    const ligneQ = q(`SELECT CONCAT_WS('|', str_ETAT, IFNULL(str_CODE_ECHEC, ''), IFNULL(str_MOTIF_LIGNE, '')) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${M}L-${Q}'`).split('|');
    ok('Traitement : produit déjà non géré en réserve → échec PRODUIT_HORS_RESERVE, motif clair', ligneQ[0] === 'ECHEC' && ligneQ[1] === 'PRODUIT_HORS_RESERVE' && /r[ée]serve/i.test(ligneQ[2]), ligneQ.join(' | '));
    ok('Son stock ne bouge pas', stock(Q) === STOCK_Q, stock(Q) + ' / ' + STOCK_Q);
    ok('La ligne retirée au décochage reste retirée', q(`SELECT str_ETAT FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${M}L-${P}'`) === 'SUPPRIMEE');
    const compteRendu = await p.evaluate(() => Array.from(document.querySelectorAll('.x-window')).filter((x) => x.offsetParent).map((x) => x.innerText).join(' ').replace(/\s+/g, ' '));
    ok('Le compte rendu affiché le dit', /plus g[ée]r[ée] en r[ée]serve/i.test(compteRendu), compteRendu.slice(0, 300));
    await p.evaluate(() => { Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).forEach((w) => w.close()); });

    /* ----- 3. application mobile : ajout d'un produit non gere en reserve ----- */
    exec(`UPDATE t_suggestion_reserve SET str_STATUT = 'A_TRAITER', lg_USER_VERROU_ID = NULL, dt_VERROU = NULL WHERE lg_SUGGESTION_RESERVE_ID = '${M}A'`);
    const appel = (m, u, c, ref) => p.evaluate(async ([m, u, c, ref]) => { const h = { 'Content-Type': 'application/json' }; if (ref) { h['X-Client-Ref'] = ref; }
      const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : JSON.stringify(c) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 100) }; } j.http = r.status; return j; }, [m, u, c, ref]);
    await appel('PUT', '../api/v1/suggestion-reserve/' + M + 'A/ouvrir');
    const ajout = await appel('POST', '../api/v1/suggestion-reserve/' + M + 'A/lignes', { produitId: R, quantite: 2 }, M + 'R');
    ok('Mobile : produit non géré en réserve refusé (NON_GERE_EN_RESERVE), rien d\'ajouté', ajout.success === false && ajout.code === 'NON_GERE_EN_RESERVE'
      && q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '${M}A' AND lg_FAMILLE_ID = '${R}'`) === '0', JSON.stringify(ajout).slice(0, 200));
    await appel('PUT', '../api/v1/suggestion-reserve/' + M + 'A/liberer');

    /* ----- 4. bilan ----- */
    ok('Bilan : un seul mouvement de réserve (celui du décochage), aucun pour les autres produits',
      q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE dt_CREATED >= '${debut}' AND lg_FAMILLE_ID IN ('${P}', '${Q}', '${R}')`) === '1');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    remettre();
    droits.forEach((d) => d.remettre());
    ok('Données d\'essai retirées, produits remis', q(`SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '${M}%'`) === '0'
      && [P, Q, R].every((id) => ligneFamille(id) === ORIGINE[id] && stock(id) === STOCK[id] && typeRayon(id) === RAYON[id]));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
