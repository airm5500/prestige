/* RESERVE : SUGGESTIONS LIMITEES A L'EMPLACEMENT, SUGGESTION ANNULEE CLOSE (demandes serveur des applications mobiles,
 * point 28).
 *
 * Jeu d'essai : trois suggestions posees en base (marque E2E-SRE), retirees a la fin :
 *  - A : emplacement de l'utilisateur, a traiter ;
 *  - B : un autre emplacement (depot), a traiter ;
 *  - C : emplacement de l'utilisateur, ANNULEE.
 * Ce que le test etablit, par l'ecran « Suggestions » de la reserve et ses routes :
 *  - la liste (ecran et route) rend A et C, jamais B ;
 *  - le detail et l'ouverture de B repondent « introuvable », sans prendre de verrou ;
 *  - ouvrir C rend la suggestion en lecture seule, sans verrou ;
 *  - ouvrir A prend le verrou comme avant (non-regression).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-SRE-';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const AUTRE = q("SELECT lg_EMPLACEMENT_ID FROM t_emplacement WHERE lg_EMPLACEMENT_ID <> '" + EMPL + "' ORDER BY lg_EMPLACEMENT_ID LIMIT 1");

function retirer() {
  exec("DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID LIKE '" + M + "%';"
    + " DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '" + M + "%';");
}
function poser(id, empl, statut) {
  exec("INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, lg_EMPLACEMENT_ID,"
    + " lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED, str_COMMENTAIRE) VALUES ('" + M + id + "', '" + M + id + "', 'RAYON', 'MANUELLE', '" + statut + "', '"
    + empl + "', '" + ADMIN + "', NOW(), NOW(), 'E2E')");
}
const verrou = (id) => q("SELECT IFNULL(lg_USER_VERROU_ID, 'NULL') FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '" + M + id + "'");

(async () => {
  retirer();
  poser('A', EMPL, 'A_TRAITER');
  poser('B', AUTRE, 'A_TRAITER');
  poser('C', EMPL, 'ANNULEE');
  ok('Jeu d\'essai : 3 suggestions, dont une d\'un autre emplacement', !!AUTRE && q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '" + M + "%'") === '3', AUTRE);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const appel = (m, url) => p.evaluate(async ([m, url]) => { const r = await fetch(url, { method: m, headers: { 'Content-Type': 'application/json' } }); return { s: r.status, j: await r.json().catch(() => null) }; }, [m, url]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const liste = await appel('GET', '../api/v1/suggestion-reserve/liste?search_value=&limit=500');
    const ids = (liste.j.results || []).map((r) => r.lg_SUGGESTION_RESERVE_ID || r.id).filter((x) => x && x.indexOf('E2E-SRE-') === 0).sort();
    ok('Route liste : A et C (emplacement de l\'utilisateur), jamais B', ids.join(',') === M + 'A,' + M + 'C', ids.join(','));
    const total = await appel('GET', '../api/v1/suggestion-reserve/liste?limit=1');
    const attendu = q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_EMPLACEMENT_ID IS NULL OR lg_EMPLACEMENT_ID = '" + EMPL + "'");
    ok('Total de la liste = suggestions de l\'emplacement', String(total.j.total) === attendu, total.j.total + ' / ' + attendu);

    /* ecran Suggestions de la reserve */
    const ecran = await p.evaluate(async () => {
      const g = Ext.create('testextjs.view.stockmanagement.reserve.SuggestionsGrid', { renderTo: Ext.getBody(), width: 1200, height: 500 });
      const st = g.getStore();
      await new Promise((r) => { st.on('load', r, null, { single: true }); st.load({ params: { limit: 500 } }); });
      const ids = []; st.each((r) => { const id = r.get('lg_SUGGESTION_RESERVE_ID'); if (id && id.indexOf('E2E-SRE-') === 0) ids.push(id); });
      g.destroy();
      return ids.sort().join(',');
    }).catch((e) => 'ERR ' + e.message);
    ok('Écran « Suggestions » : A et C, pas B', ecran === M + 'A,' + M + 'C', ecran);

    const detB = await appel('GET', '../api/v1/suggestion-reserve/' + M + 'B');
    ok('Détail d\'une suggestion d\'un autre emplacement : introuvable', detB.j && detB.j.success === false && /introuvable/i.test(detB.j.msg || detB.j.message || ''), JSON.stringify(detB.j));
    const ouvB = await appel('PUT', '../api/v1/suggestion-reserve/' + M + 'B/ouvrir');
    ok('Ouvrir une suggestion d\'un autre emplacement : refus, aucun verrou', ouvB.j && ouvB.j.success === false && verrou('B') === 'NULL', JSON.stringify(ouvB.j));
    const ouvC = await appel('PUT', '../api/v1/suggestion-reserve/' + M + 'C/ouvrir');
    ok('Ouvrir une suggestion ANNULEE : lecture seule, aucun verrou', ouvC.j && ouvC.j.success === true && ouvC.j.modifiable === false && verrou('C') === 'NULL', JSON.stringify(ouvC.j).slice(0, 200) + ' verrou=' + verrou('C'));
    const ouvA = await appel('PUT', '../api/v1/suggestion-reserve/' + M + 'A/ouvrir');
    ok('Ouvrir une suggestion de son emplacement : modifiable, verrou pris (inchangé)', ouvA.j && ouvA.j.modifiable === true && verrou('A') === ADMIN, verrou('A'));
    await appel('PUT', '../api/v1/suggestion-reserve/' + M + 'A/liberer');
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    retirer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID LIKE '" + M + "%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
