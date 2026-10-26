/* SET VALORISATION RESERVE AU SUPER ADMINISTRATEUR (demande du 26/10).
 * Comme le Centre de support (V7.2.20) : le droit P_SET_VALORISATION passe en type SYSTEME.
 *  - Administrateur (compte e2e), meme si le droit a ete accorde a son profil (cas d'une officine ou il l'a ete) :
 *    menu « Set valorisation » absent, API refusee, droit absent de son catalogue, attribution directe refusee ;
 *  - Super administrateur (compte e2e-sa) : menu present, API accessible, droit au catalogue.
 * Le droit accorde le temps du test a l'Administrateur est retire a la fin.
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const http = require('http');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 260) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const SA = ENV_E2E.LOGIN_SUPPORT;
const PRIV = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SET_VALORISATION'");
const ROLE_ADMIN = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' LIMIT 1");
const ROLE_CAISSIERE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caissiere' LIMIT 1");
const LIEN = 'E2E-SETVALO-SA';

function appel(methode, chemin, cookie, corps, forme) {
  return new Promise((ok_, ko) => {
    const donnees = corps === undefined ? '' : (forme ? new URLSearchParams(corps).toString() : JSON.stringify(corps));
    const r = http.request({ host: 'localhost', port: 8080, path: '/prestige/' + chemin, method: methode,
      headers: Object.assign({ 'Content-Type': forme ? 'application/x-www-form-urlencoded' : 'application/json', 'Content-Length': Buffer.byteLength(donnees) },
        cookie ? { Cookie: cookie } : {}) },
    (rep) => { let t = ''; rep.setEncoding('utf8'); rep.on('data', (c) => { t += c; }); rep.on('end', () => ok_({ statut: rep.statusCode, corps: t,
      cookie: (rep.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ') })); });
    r.on('error', ko); r.end(donnees);
  });
}
const json = (t) => { try { return JSON.parse(t); } catch (e) { return null; } };
async function connexion(login) { return (await appel('POST', 'api/v1/user/auth', null, { login, password: 'e2etest' })).cookie; }
const menuPresent = async (cookie) => (await appel('GET', 'webservices/menumanagement/ws_tree_menu.jsp', cookie)).corps.indexOf('"id":"setvalorisation"') >= 0;
const catalogue = async (cookie) => { const c = json((await appel('GET', 'api/v1/roles/privileges?lg_ROLE_ID=' + ROLE_CAISSIERE + '&search_value=' + encodeURIComponent('SET VALORISATION') + '&limit=100', cookie)).corps);
  return c && c.results ? c.results.map((p) => p.str_NAME || p.str_DESCRIPTION) : null; };
const retirer = () => q(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${LIEN}' OR (lg_ROLE_ID = '${ROLE_CAISSIERE}' AND lg_PRIVILEGE_ID = '${PRIV}')`);

(async () => {
  retirer();
  try {
    ok('Précondition : droit P_SET_VALORISATION, profils Administrateur et Caissière', !!PRIV && !!ROLE_ADMIN && !!ROLE_CAISSIERE);
    /* cas d'une officine ou le droit a ete accorde a l'administrateur */
    q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) SELECT '${LIEN}', '${ROLE_ADMIN}', '${PRIV}', NOW(), NOW()`
      + ` FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE_ADMIN}' AND lg_PRIVILEGE_ID = '${PRIV}')`);

    const ad = await connexion(ENV_E2E.LOGIN);
    ok('Administrateur (droit accordé à son profil) : menu « Set valorisation » absent', !(await menuPresent(ad)));
    const depart = json((await appel('GET', 'api/v1/set-valorisation/depart', ad)).corps);
    ok('Administrateur : API Set valorisation refusée', depart && depart.success === false, JSON.stringify(depart));
    const catAd = await catalogue(ad);
    ok('Administrateur : droit absent de son catalogue', Array.isArray(catAd) && catAd.length === 0, JSON.stringify(catAd));
    const accorde = json((await appel('POST', 'api/v1/roles/privileges/toggle', ad, { lg_ROLE_ID: ROLE_CAISSIERE, lg_PRIVELEGE_ID: PRIV, checked: 'true' }, true)).corps);
    const lien = q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE_CAISSIERE}' AND lg_PRIVILEGE_ID = '${PRIV}'`);
    ok('Administrateur : attribution directe du droit refusée', accorde && accorde.success !== 1 && accorde.success !== '1' && accorde.success !== true && lien === '0',
      JSON.stringify(accorde) + ' / ' + lien);

    const sa = await connexion(SA);
    ok('Super administrateur : menu « Set valorisation » présent', await menuPresent(sa));
    const departSa = json((await appel('GET', 'api/v1/set-valorisation/depart', sa)).corps);
    ok('Super administrateur : API Set valorisation accessible', departSa && departSa.success !== false, JSON.stringify(departSa).slice(0, 200));
    const catSa = await catalogue(sa);
    ok('Super administrateur : droit à son catalogue', Array.isArray(catSa) && catSa.length >= 1, JSON.stringify(catSa));
  } catch (e) { ok('Parcours sans exception', false, e.stack); } finally {
    retirer();
    ok('Droits d\'essai retirés', q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${LIEN}' OR (lg_ROLE_ID = '${ROLE_CAISSIERE}' AND lg_PRIVILEGE_ID = '${PRIV}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
