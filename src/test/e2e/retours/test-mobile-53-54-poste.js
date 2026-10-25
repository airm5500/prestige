/* DEMANDES MOBILES 53 ET 54 : LE NOM DE L'APPAREIL (X-Poste) PARTOUT (transmission du 25/10).
 *
 * 53 - Connexion par la route de l'application (v1/user/auth) avec l'en-tete X-Poste « E2E Caisse mobile 53 » :
 *      la ligne « Authentification … nom poste … » du fichier journal et le journal RH des connexions
 *      (t_session_utilisateur) portent ce nom, et non le nom reseau ; sans X-Poste, le nom reseau reste.
 *      Deconnexion avec X-Poste : la ligne de deconnexion porte aussi ce nom.
 * Lignes de journal et sessions d'essai retirees a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const POSTE = 'E2E Caisse mobile 53';
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');

function nettoyer() {
  q(`DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND remote_host LIKE 'E2E Caisse mobile%';`
    + ` DELETE FROM t_session_utilisateur WHERE debut >= '${DEBUT}' AND poste LIKE 'E2E Caisse mobile%';`);
}

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  try {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const auth = await p.evaluate(async (poste) => (await fetch('../api/v1/user/auth', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Poste': encodeURIComponent(poste) }, body: JSON.stringify({ login: 'admin', password: 'e2etest' }) })).json(), POSTE);
    ok('Précondition : connexion acceptée', auth.success === true, JSON.stringify(auth).slice(0, 120));
    await p.waitForTimeout(1500);
    const ligne = q(`SELECT CONCAT_WS('|', remote_host, str_DESCRIPTION LIKE '%nom poste ${POSTE}%') FROM t_event_log WHERE dt_CREATED >= '${DEBUT}'`
      + " AND str_DESCRIPTION LIKE 'Authentification%' ORDER BY dt_CREATED DESC LIMIT 1");
    ok('53 · Journal : la ligne « Authentification … nom poste » porte le nom de l\'appareil', ligne === POSTE + '|1', ligne);
    const rh = q(`SELECT poste FROM t_session_utilisateur WHERE debut >= '${DEBUT}' ORDER BY debut DESC LIMIT 1`);
    ok('53 · Journal RH des connexions : le poste est le nom de l\'appareil', rh === POSTE, rh);
    const deco = await p.evaluate(async (poste) => (await fetch('../api/v1/user/logout', { method: 'POST', headers: { 'X-Poste': encodeURIComponent(poste) } })).status, POSTE);
    await p.waitForTimeout(1500);
    const ligneDeco = q(`SELECT remote_host FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND str_DESCRIPTION LIKE '%Déconnection de%' ORDER BY dt_CREATED DESC LIMIT 1`);
    ok('53 · Déconnexion : la ligne porte le nom de l\'appareil', ligneDeco === POSTE, deco + ' ' + ligneDeco);

    const p2 = await (await b.newContext()).newPage();
    await p2.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const avant = q('SELECT NOW()');
    await p2.evaluate(async () => (await fetch('../api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'admin', password: 'e2etest' }) })).json());
    await p2.waitForTimeout(1500);
    const sans = q(`SELECT remote_host FROM t_event_log WHERE dt_CREATED >= '${avant}' AND str_DESCRIPTION LIKE 'Authentification%' ORDER BY dt_CREATED DESC LIMIT 1`);
    ok('53 · Sans X-Poste : le nom réseau reste (comme avant)', sans !== '' && !/^E2E/.test(sans), sans);
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Lignes d\'essai retirées', q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND remote_host LIKE 'E2E Caisse mobile%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
