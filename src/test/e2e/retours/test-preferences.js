/* PREFERENCES UTILISATEUR (socle du plan d'octobre, lot L1) : lecture / ecriture / suppression par l'API, valeur
 * conservee en base, propre a l'utilisateur connecte, cles et valeurs invalides refusees, hors session refuse. La cle
 * d'essai est retiree a la fin. */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const API = 'http://localhost:8080/prestige/api/v1/preferences/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  try {
    const anonyme = await (await p.request.get(API + 'e2e_test')).text();
    ok('Hors session : refusé (filtre d\'authentification)', !/"valeur"/.test(anonyme), anonyme.slice(0, 80));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const f = (m, c, corps) => p.evaluate(async (a) => { const r = await fetch(a.u, { method: a.m, headers: { 'Content-Type': 'application/json' }, body: a.corps }); return r.json(); }, { u: API + c, m, corps });
    ok('Clé absente : valeur nulle', (await f('GET', 'e2e_test')).valeur === null);
    const v = { ordre: ['ca', 'stock'], retires: ['tva'], periodes: { per: 6 } };
    ok('Écriture', (await f('PUT', 'e2e_test', JSON.stringify(v))).success === true);
    ok('Relecture identique', JSON.stringify((await f('GET', 'e2e_test')).valeur) === JSON.stringify(v));
    ok('Réécriture (remplace)', (await f('PUT', 'e2e_test', '[1,2]')).success && JSON.stringify((await f('GET', 'e2e_test')).valeur) === '[1,2]');
    ok('Valeur texte', (await f('PUT', 'e2e_test', '"bonjour"')).success && (await f('GET', 'e2e_test')).valeur === 'bonjour');
    ok('JSON invalide refusé', (await f('PUT', 'e2e_test', '{x')).success === false && (await f('PUT', 'e2e_test', '{} x')).success === false);
    ok('Clé invalide refusée', (await f('GET', 'a%20b')).success === false);
    ok('Suppression', (await f('DELETE', 'e2e_test')).success && (await f('GET', 'e2e_test')).valeur === null);
  } catch (e) { ok('Parcours sans exception', false, e.message); }
  finally {
    await b.close();
    require('child_process').execSync("mysql capitale -e \"DELETE FROM t_preference_utilisateur WHERE str_CLE='e2e_test'\"");
    const ko = res.filter((r) => !r.c).length; console.log('\n' + (res.length - ko) + '/' + res.length + ' OK'); process.exit(ko ? 1 : 0);
  }
})();
