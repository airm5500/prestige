/* LECTURE D'INVENTAIRE EN ECHEC : JAMAIS UNE LISTE VIDE (demandes serveur des applications mobiles, 21).
 * Les lectures des terminaux d'inventaire (ws/inventaires*) rendaient [] en cas d'erreur : le terminal ne pouvait pas
 * distinguer « aucun produit » d'une panne, et un rayon pouvait sembler termine. Erreur provoquee par un parametre
 * impossible (maxResult negatif) : la reponse doit etre une erreur 500, pas [] ; une lecture normale reste inchangee.
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const INV = q("SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_STATUT = 'enable' ORDER BY dt_CREATED DESC LIMIT 1");

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext()).newPage();
  const get = (u) => p.evaluate(async (u) => { const r = await fetch(u); const t = await r.text(); return { http: r.status, corps: t.slice(0, 200) }; }, u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const normale = await get('../api/v1/ws/inventaires?maxResult=5');
    ok('Lecture normale : 200 et une liste', normale.http === 200 && normale.corps.startsWith('['), JSON.stringify(normale));
    const liste = await get('../api/v1/ws/inventaires?maxResult=-5');
    ok('Liste des inventaires en échec : 500 avec message, pas []', liste.http === 500 && !/^\[\]/.test(liste.corps) && /success/.test(liste.corps), JSON.stringify(liste));
    const details = await get('../api/v1/ws/inventaires/detailsAll?idInventaire=' + INV + '&page=0&maxResult=-5');
    ok('Détails d\'un inventaire en échec : 500, pas []', details.http === 500 && !/^\[\]/.test(details.corps), JSON.stringify(details));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
