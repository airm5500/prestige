/* RECHERCHE CLIENT : les espaces parasites sont ignores (demande de l'officine du 30/09).
 *
 * Une fiche dont le nom a ete saisi avec une espace de trop en tete (« ␣MIENHESSIMANI ») doit se retrouver en tapant
 * « MIENHE », dans la recherche des ordonnances clients comme dans celles de la caisse (client standard, assure,
 * liste des clients). Deux clients de test, retires a la fin ; aucune fiche existante n'est modifiee.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

(async () => {
  /* standard (type 6) et assure (type 1), noms avec espaces parasites en tete et en fin */
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, lg_TYPE_CLIENT_ID, dt_CREATED) VALUES"
    + " ('e2e-esp-std', '  ZZESPSTD', ' QWYXPREN ', 'enable', '6', NOW()), ('e2e-esp-ass', ' ZZESPASS', 'QWYXASS  ', 'enable', '1', NOW())");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const lire = (url) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), url);
    const ids = (r) => (r.data || []).map((x) => x.lgCLIENTID || x.id);
    const ordoStd = await lire('../api/v1/ordonnance-client/clients?query=ZZESPS&start=0&limit=20');
    const ordoNom = await lire('../api/v1/ordonnance-client/clients?query=' + encodeURIComponent('ZZESPSTD QWYX') + '&start=0&limit=20');
    ok('Ordonnances : « ZZESPS » retrouve la fiche saisie « ␣␣ZZESPSTD »', ids(ordoStd).indexOf('e2e-esp-std') >= 0, JSON.stringify(ids(ordoStd)));
    ok('Ordonnances : « ZZESPSTD QWYX » (nom + prénom) la retrouve aussi', ids(ordoNom).indexOf('e2e-esp-std') >= 0, JSON.stringify(ids(ordoNom)));
    const lambda = await lire('../api/v1/client/lambda?query=' + encodeURIComponent(' ZZESPS'));
    ok('Caisse, client standard : « ␣ZZESPS » (espace tapée en trop) retrouve la fiche', ids(lambda).indexOf('e2e-esp-std') >= 0, JSON.stringify(ids(lambda)));
    const prenom = await lire('../api/v1/client/lambda?query=QWYXPR');
    ok('Caisse, client standard : par le prénom « QWYXPR » (saisi « ␣QWYXPREN␣ »)', ids(prenom).indexOf('e2e-esp-std') >= 0, JSON.stringify(ids(prenom)));
    const assure = await lire('../api/v1/client/bytype/1?query=ZZESPA&typeClientId=1');
    ok('Caisse, client assuré : « ZZESPA » retrouve « ␣ZZESPASS »', ids(assure).indexOf('e2e-esp-ass') >= 0, JSON.stringify(ids(assure)).slice(0, 200));
    const liste = await lire('../api/v1/client/list?query=ZZESP&start=0&limit=20');
    ok('Liste des clients : « ZZESP » retrouve les deux fiches', ['e2e-esp-std', 'e2e-esp-ass'].every((i) => ids(liste).indexOf(i) >= 0), JSON.stringify(ids(liste)));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    exec("DELETE FROM t_client WHERE lg_CLIENT_ID IN ('e2e-esp-std', 'e2e-esp-ass')");
    ok('Clients de test retirés', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ('e2e-esp-std', 'e2e-esp-ass')") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
