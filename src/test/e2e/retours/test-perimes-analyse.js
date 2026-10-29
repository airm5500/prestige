/* SAISIE DES PERIMES — ONGLET ANALYSE (besoins du 11/10, point 2). Jeu d'essai en septembre 2026 (mois de ventes du
 * banc) : 4 saisies sur 3 produits de 2 emplacements, retirees a la fin.
 *  - le menu ouvre Liste / Analyse ; la liste existante est inchangee (elle montre les saisies) ;
 *  - tuiles : valeur perimee, CA, ratio perimes / CA (= valeur / CA calcules en SQL) ; emplacements les plus touches
 *    (part), produits qui se periment le plus (fois, quantite), evolution par mois ;
 *  - periode a l'envers refusee.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN;
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
/* 2 produits d'un meme emplacement + 1 d'un autre, prix connus */
const Z = q(`SELECT f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND f.lg_ZONE_GEO_ID IS NOT NULL
  GROUP BY f.lg_ZONE_GEO_ID HAVING COUNT(*) > 3 ORDER BY f.lg_ZONE_GEO_ID LIMIT 2`).split(/\r?\n/);
const P = q(`(SELECT lg_FAMILLE_ID, int_PRICE, lg_ZONE_GEO_ID FROM t_famille WHERE lg_ZONE_GEO_ID = '${Z[0]}' AND str_STATUT = 'enable' AND int_PRICE > 0 ORDER BY lg_FAMILLE_ID LIMIT 2)
  UNION ALL (SELECT lg_FAMILLE_ID, int_PRICE, lg_ZONE_GEO_ID FROM t_famille WHERE lg_ZONE_GEO_ID = '${Z[1]}' AND str_STATUT = 'enable' AND int_PRICE > 0 ORDER BY lg_FAMILLE_ID LIMIT 1)`)
  .split(/\r?\n/).map((l) => l.split('\t'));
const SAISIES = [[P[0], 3, '2026-09-05'], [P[0], 2, '2026-09-20'], [P[1], 1, '2026-09-10'], [P[2], 4, '2026-09-15']];
const CA = Number(q(`SELECT SUM(int_PRICE) FROM t_preenregistrement WHERE dt_CREATED >= '2026-09-01' AND dt_CREATED < '2026-10-01'
  AND int_PRICE > 0 AND b_IS_CANCEL = 0 AND str_STATUT = 'is_Closed'`));
const VALEUR = SAISIES.reduce((s, x) => s + x[1] * Number(x[0][1]), 0);
const nettoyer = () => q("DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE 'E2E-PER-%'");

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : septembre 2026 sans autre saisie de périmés, avec des ventes', q("SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'delete' AND dt_CREATED >= '2026-09-01' AND dt_CREATED < '2026-10-01' AND lg_WAREHOUSE_ID NOT LIKE 'E2E-PER-%'") === '0' && CA > 0, CA);
    nettoyer();
    q(SAISIES.map((s, i) => `INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final)
      VALUES ('E2E-PER-${i}', '${USER}', '${s[0][0]}', 'LOT${i}', ${s[1]}, '${s[2]} 10:00:00', '${s[2]} 10:00:00', '${s[2]}', 'delete', 10, ${10 - s[1]});`).join(''));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('saisieperime', 'Saisie des périmés', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperimeonglets saisieperime').length > 0, null, { timeout: 30000 });
    ok('Le menu ouvre Liste / Analyse, la liste existante dedans', await p.evaluate(() => !!Ext.ComponentQuery.query('saisieperimeonglets #sp-analyse')[0]));
    /* liste : periode de septembre, les 4 saisies */
    await p.evaluate(() => { Ext.getCmp('dt_start').setValue(new Date(2026, 8, 1)); Ext.getCmp('dt_end').setValue(new Date(2026, 8, 30));
      const s = Ext.ComponentQuery.query('saisieperime')[0].getStore(); s.getProxy().extraParams = { dtStart: '2026-09-01', dtEnd: '2026-09-30' }; s.loadPage(1); });
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('saisieperime')[0].getStore(); return !s.isLoading() && s.getTotalCount() >= 4; }, null, { timeout: 15000 }).catch(() => {});
    ok('Liste inchangée : les 4 saisies de septembre', await p.evaluate(() => Ext.ComponentQuery.query('saisieperime')[0].getStore().getTotalCount()) === 4);

    const api = await p.evaluate(async () => (await fetch('../api/v1/gestionperime/analyse?dtStart=2026-09-01&dtEnd=2026-09-30')).json());
    ok('Analyse : valeur périmée = quantités × prix de vente', api.success && api.total.valeur === VALEUR, api.total && api.total.valeur + ' / ' + VALEUR);
    ok('Analyse : CA de la période = calcul SQL', api.total.ca === CA, api.total.ca);
    const ratio = Math.round(VALEUR * 10000 / CA) / 100;
    ok('Ratio périmés / CA', api.total.ratio === ratio, api.total.ratio + ' / ' + ratio);
    ok('3 produits, 4 saisies, 10 unités', api.total.produits === 3 && api.total.saisies === 4 && api.total.quantite === 10);
    const z0 = 3 * Number(P[0][1]) + 2 * Number(P[0][1]) + Number(P[1][1]);
    ok('Emplacements les plus touchés : 2, triés par valeur, parts = 100 %', api.zones.length === 2 && api.zones[0].valeur >= api.zones[1].valeur
      && Math.abs(api.zones[0].part + api.zones[1].part - 100) < 0.1 && api.zones.some((z) => z.valeur === z0));
    const prod0 = api.produits.find((x) => x.fois === 2);
    ok('Produit périmé 2 fois : 5 unités', prod0 && prod0.quantite === 5, JSON.stringify(prod0));
    ok('Par mois : septembre 2026, valeur et CA', api.mois.some((m) => m.mois === '2026-09' && m.valeur === VALEUR && m.ca === CA));
    const inv = await p.evaluate(async () => (await fetch('../api/v1/gestionperime/analyse?dtStart=2026-09-30&dtEnd=2026-09-01')).json());
    ok('Période à l\'envers : refus clair', !inv.success && /précéder/.test(inv.msg), inv.msg);

    await p.evaluate(() => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0]; o.analyse.down('#spDebut').setValue(new Date(2026, 8, 1));
      o.analyse.down('#spFin').setValue(new Date(2026, 8, 30)); o.afficher('analyse'); });
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('saisieperimeonglets')[0].donnees, null, { timeout: 30000 });
    const html = await p.evaluate(() => Ext.ComponentQuery.query('saisieperimeonglets #spContenu')[0].getEl().dom.innerText);
    ok('Écran Analyse : tuiles valeur périmée, CA, ratio', /Valeur périmée/i.test(html) && /Taux de péremption \(périmés \/ CA\)/i.test(html), html.slice(0, 200));
    ok('Écran Analyse : emplacements, produits, mois', /Emplacements les plus touchés/i.test(html) && /se périment le plus/i.test(html) && /sept\. 2026/i.test(html));
    ok('Conteneur ajouté à correctifs-affichage.js', await p.evaluate(() => window.PrestigeAffichage.ECRANS_COLLES.includes('saisieperimeonglets')));
    /* raccourci de periode : l'analyse doit etre recalculee (le bouton Actualiser n'avait qu'un handler) */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('saisieperimeonglets #spFinRaccourcis')[0].getId()));
    await p.waitForSelector('.periode-menu .x-menu-item', { timeout: 5000 });
    await p.locator('.periode-menu .x-menu-item-text', { hasText: 'Année N-1' }).click();
    const recalcul = await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0]; return o.donnees && !/sept\. 2026/i.test(o.analyse.down('#spContenu').getEl().dom.innerText); }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    ok('Raccourci « Année N-1 » : analyse recalculée sur la nouvelle période', recalcul);
    const doublons = await p.evaluate(() => { const vus = {}; let n = 0; document.querySelectorAll('[id]:not([id=""])').forEach((e) => { if (vus[e.id]) { n++; } vus[e.id] = 1; }); return n; });
    ok('Aucun élément en double dans la page (bouton fantôme de la barre)', doublons === 0, doublons);
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    nettoyer();
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
