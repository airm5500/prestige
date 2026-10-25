/* SECURITE / MOBILE (13/10) : les trois applications mobiles lisent la licence AVANT la connexion.
 *  - v1/licence/find repond sans session (200), avec les dates et le type, mais la cle masquee (4 derniers caracteres) ;
 *  - connecte, la cle complete est rendue (ecran d'administration inchange) ;
 *  - v1/licence/save/... et les autres routes fermees par l'audit restent refusees sans session ;
 *  - en-tetes X-User-Info forges : toujours aucun acces a la cle complete.
 * Si le banc n'a pas de licence MOBILE, le test en cree une (cle d'essai) et la supprime a la fin ; une licence
 * existante n'est jamais modifiee (relue avant et apres).
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const API = 'http://localhost:8080/prestige/api/';
const LICENCE = () => q('SELECT CONCAT(id, \'|\', date_start, \'|\', date_end, \'|\', type_licence) FROM licence WHERE type_licence = 1 LIMIT 1');
const brut = async (url, h) => { const r = await fetch(API + url, { headers: h || {} }); const t = await r.text(); return { s: r.status, t }; };

(async () => {
  let creee = false;
  if (!LICENCE()) {
    q("INSERT INTO licence (id, date_start, date_end, type_licence) VALUES ('E2E-LICENCE-MOBILE-0123456789ABCD', '2026-01-01', '2027-02-23', 1)");
    creee = true;
  }
  const avant = LICENCE();
  const [cle, debut, fin] = avant.split('|');
  try {
    let r = await brut('v1/licence/find');
    let j = null;
    try { j = JSON.parse(r.t); } catch (e) { j = null; }
    ok('Sans session : licence/find répond 200 (écran de lancement des applications)', r.s === 200 && j, r.s + ' ' + r.t.slice(0, 80));
    ok('Sans session : dates de début et de fin rendues', j && JSON.stringify(j.dateStart).includes(debut.slice(0, 4)) && JSON.stringify(j.dateEnd).includes(fin.slice(0, 4)),
      j && JSON.stringify([j.dateStart, j.dateEnd]));
    ok('Sans session : type de licence rendu (MOBILE)', j && j.typeLicence === 'MOBILE', j && j.typeLicence);
    ok('Sans session : clé masquée (4 derniers caractères seulement)', j && j.id !== cle && String(j.id).endsWith(cle.slice(-4)) && !String(j.id).includes(cle.slice(0, 8)),
      j && String(j.id).length);

    r = await brut('v1/licence/find', { 'X-User-Info': JSON.stringify({ id: q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'") }),
      'X-Token-Exp': '2099-01-01T00:00:00Z', 'X-client': 'x' });
    ok('En-têtes forgés : clé toujours masquée', r.s === 200 && !r.t.includes(cle), r.s);

    for (const u of ['v1/licence/save/XYZ', 'v1/ws/inventaires', 'v1/info', 'v1/modereglement/all']) {
      r = await brut(u);
      ok('Sans session : ' + u + ' reste refusé (401)', r.s === 401, r.s);
    }

    const login = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'admin', password: 'e2etest' }) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    r = await brut('v1/licence/find', { Cookie: cookie });
    try { j = JSON.parse(r.t); } catch (e) { j = null; }
    ok('Connecté : clé complète rendue (administration inchangée)', r.s === 200 && j && j.id === cle, r.s);
    await fetch(API + 'v1/user/logout', { method: 'POST', headers: { Cookie: cookie } }).catch(() => {});
  } finally {
    ok('Licence en base inchangée', LICENCE() === avant);
    if (creee) { q("DELETE FROM licence WHERE id = 'E2E-LICENCE-MOBILE-0123456789ABCD'"); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
