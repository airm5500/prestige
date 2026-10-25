/* VISUALISATION / CONTROLE DES BL : FILTRE UTILISATEUR (demandes serveur des applications mobiles, point 26).
 *
 * GET /etat-control-bon/list recevait userId sans le lire : le pharmacien filtrait, la liste ne changeait pas.
 * Lecture seule sur les BL du banc (premier trimestre 2026), compares a un comptage direct en base :
 *  - avec userId : total = BL clos de cet utilisateur sur la periode, et chaque ligne rendue est bien la sienne ;
 *  - sans userId (ou ALL) : total inchange (tous les utilisateurs) ;
 *  - userId combine au groupe de grossistes : les deux filtres s'appliquent ;
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DU = '2026-01-01', AU = '2026-03-31';
const BL = "FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE b.str_STATUT = 'is_Closed'"
  + " AND b.dt_DATE_LIVRAISON >= '" + DU + "' AND b.dt_DATE_LIVRAISON < DATE_ADD('" + AU + "', INTERVAL 1 DAY)";

(async () => {
  const [U, nU] = q("SELECT b.lg_USER_ID, COUNT(*) " + BL + " GROUP BY b.lg_USER_ID ORDER BY COUNT(*) DESC LIMIT 1").split('\t');
  const tous = q("SELECT COUNT(*) " + BL);
  ok('Banc : des BL de plusieurs utilisateurs sur la période', Number(tous) > Number(nU) && Number(nU) > 0, U + ' ' + nU + '/' + tous);
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const lire = (url) => p.evaluate(async (url) => (await fetch(url)).json(), url);
  const base = '../api/v1/etat-control-bon/list?dtStart=' + DU + '&dtEnd=' + AU + '&dateType=LIVRAISON';
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });

    const filtre = await lire(base + '&start=0&limit=500&userId=' + U);
    ok('userId : total = BL de cet utilisateur', String(filtre.total) === nU, filtre.total + ' / ' + nU);
    const ids = (filtre.data || []).map((x) => x.lgBONLIVRAISONID);
    const siens = ids.length ? q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_USER_ID = '" + U + "' AND lg_BON_LIVRAISON_ID IN ('" + ids.join("','") + "')") : '0';
    ok('userId : chaque ligne rendue est un BL de cet utilisateur', ids.length === Number(nU) && siens === nU, ids.length + ' lignes, ' + siens + ' siennes');
    const page2 = await lire(base + '&start=10&limit=10&userId=' + U);
    ok('userId : pagination juste (page de 10, même total)', (page2.data || []).length === Math.min(10, Number(nU) - 10) && String(page2.total) === nU, (page2.data || []).length + ' / ' + page2.total);
    const sans = await lire(base + '&start=0&limit=5');
    const all = await lire(base + '&start=0&limit=5&userId=ALL');
    ok('Sans userId (ou ALL) : tous les utilisateurs, comme avant', String(sans.total) === tous && String(all.total) === tous, sans.total + ' / ' + all.total + ' / ' + tous);
    const g = q("SELECT o.lg_GROSSISTE_ID " + BL + " AND b.lg_USER_ID = '" + U + "' GROUP BY o.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1");
    const nUG = q("SELECT COUNT(*) " + BL + " AND b.lg_USER_ID = '" + U + "' AND o.lg_GROSSISTE_ID = '" + g + "'");
    const combine = await lire(base + '&start=0&limit=5&userId=' + U + '&grossisteId=' + g);
    ok('userId + grossiste : les deux filtres s\'appliquent', String(combine.total) === nUG, combine.total + ' / ' + nUG);
    const statut = await lire(base + '&start=0&limit=500&userId=' + U + '&statutControle=NON_CONTROLE');
    ok('userId + statut de contrôle : lignes toutes de l\'utilisateur', (statut.data || []).length === 0
      || q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_USER_ID <> '" + U + "' AND lg_BON_LIVRAISON_ID IN ('" + statut.data.map((x) => x.lgBONLIVRAISONID).join("','") + "')") === '0', (statut.data || []).length);

    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
