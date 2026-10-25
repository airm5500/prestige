/* SUPER ADMINISTRATEUR ET CENTRE DE SUPPORT (retours du 25/10, points 5 et 7).
 *  - Administrateur (compte e2e) : dans le Centre de support, seul « Me contacter » est visible ; l'audit, la
 *    stabilite du serveur et la maintenance lui sont refuses par le serveur ;
 *  - le super administrateur est invisible pour l'administrateur : ni dans la liste des profils (REST et ecran
 *    historique), ni dans la liste des utilisateurs ; l'administrateur ne peut ni creer un super administrateur, ni
 *    modifier le mot de passe d'un super administrateur ;
 *  - seul le super administrateur accorde les droits du Centre de support : ils sont absents du catalogue de
 *    l'administrateur, et leur attribution directe par l'API est refusee ;
 *  - Super administrateur (compte e2e-sa) : tout le Centre de support, l'audit, et le profil Super Administrateur dans
 *    la liste des profils.
 * Comptes d'essai : outils/poste-local/compte-essai.sql. Tout ce qui est tente puis cree par erreur est retire.
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const http = require('http');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 260) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN_ESSAI = 'e2e-sa-cree';
const SA = ENV_E2E.LOGIN_SUPPORT;
const ROLE_SA = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME LIKE 'Super Administrateur%' AND str_STATUT = 'enable' LIMIT 1");
const ROLE_CAISSIERE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caissiere' LIMIT 1");
const ID_SA = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + SA + "'");
const PRIV_TICKETS = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SM_SUPPORT_TICKETS'");
const RESERVES = ['supporttickets', 'supportdiagnostic', 'supportsante', 'supportserveur', 'supporthistorique', 'supportmaintenance', 'auditrapprochements'];

function appel(methode, chemin, cookie, corps, forme) {
  return new Promise((ok_, ko) => {
    const donnees = corps === undefined ? '' : (forme ? new URLSearchParams(corps).toString() : JSON.stringify(corps));
    const r = http.request({ host: 'localhost', port: 8080, path: '/prestige/' + chemin, method: methode,
      headers: Object.assign({ 'Content-Type': forme ? 'application/x-www-form-urlencoded' : 'application/json', 'Content-Length': Buffer.byteLength(donnees) },
        cookie ? { Cookie: cookie } : {}) },
    (rep) => { let t = ''; rep.setEncoding('latin1'); rep.on('data', (c) => { t += c; }); rep.on('end', () => ok_({ statut: rep.statusCode, corps: t,
      cookie: (rep.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ') })); });
    r.on('error', ko); r.end(donnees);
  });
}
const json = (t) => { try { return JSON.parse(t); } catch (e) { try { return JSON.parse(t.trim().replace(/^\(/, '').replace(/\)$/, '')); } catch (x) { return null; } } };
async function connexion(login) { const r = await appel('POST', 'api/v1/user/auth', null, { login, password: 'e2etest' }); return r.cookie; }
/* sous-menus du Centre de support, tels que l'arbre du menu les sert */
async function sousMenusSupport(cookie) {
  const t = (await appel('GET', 'webservices/menumanagement/ws_tree_menu.jsp', cookie)).corps;
  return ['supportcontact'].concat(RESERVES).filter((id) => t.indexOf('"id":"' + id + '"') >= 0);
}
const refuse = (r) => { const o = json(r.corps); return r.statut === 403 || r.statut === 401 || (o && (o.success === false || o.interdit === true || o.success === '0')); };

(async () => {
  try {
    q(`DELETE FROM t_role_user WHERE lg_USER_ID IN (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${LOGIN_ESSAI}'); DELETE FROM t_user WHERE str_LOGIN = '${LOGIN_ESSAI}'`);
    ok('Précondition : comptes d\'essai e2e (Administrateur) et ' + SA + ' (Super Administrateur)', !!ID_SA && !!ROLE_SA
      && q("SELECT r.str_NAME FROM t_role_user ru JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "'") === 'Administrateur');

    /* administrateur */
    const ad = await connexion(ENV_E2E.LOGIN);
    const menuAd = await sousMenusSupport(ad);
    ok('Administrateur : Centre de support réduit à « Me contacter »', menuAd.join(',') === 'supportcontact', menuAd.join(','));
    ok('Administrateur : audit refusé par le serveur', refuse(await appel('GET', 'api/v1/audit/analyse', ad)));
    ok('Administrateur : stabilité du serveur refusée', refuse(await appel('GET', 'api/v1/support/serveur/etat', ad)));
    ok('Administrateur : maintenance refusée', refuse(await appel('GET', 'api/v1/support/maintenance/counts', ad)));

    const rolesRest = json((await appel('GET', 'api/v1/roles?limit=100', ad)).corps);
    const rolesJsp = (await appel('GET', 'webservices/sm_user/role/ws_data.jsp?page=1&start=0&limit=100', ad)).corps;
    ok('Administrateur : profil Super Administrateur absent des listes de profils (REST et écran historique)',
      rolesRest && Array.isArray(rolesRest.results) && rolesRest.results.length > 0 && !rolesRest.results.some((r) => r.lg_ROLE_ID === ROLE_SA)
      && rolesJsp.indexOf(ROLE_SA) < 0 && rolesJsp.indexOf('Administrateur') >= 0, rolesRest ? rolesRest.results.map((r) => r.str_NAME).join(',') : '');
    const users = json((await appel('GET', 'api/v1/utilisateurs?limit=500&search_value=', ad)).corps);
    ok('Administrateur : comptes super administrateur absents de la liste des utilisateurs',
      users && users.results && users.results.length > 0 && !users.results.some((u) => u.lg_USER_ID === ID_SA), users ? users.total : '');

    const cree = json((await appel('POST', 'api/v1/utilisateurs/create', ad, { str_LOGIN: LOGIN_ESSAI, str_PASSWORD: 'E2e-Sa-Cree-7', str_FIRST_NAME: 'ZZ',
      str_LAST_NAME: 'Essai', lg_ROLE_ID: ROLE_SA, str_LIEU_TRAVAIL: '1' }, true)).corps);
    ok('Administrateur : création d\'un super administrateur refusée, rien de créé', cree && cree.success !== 1 && cree.success !== '1'
      && q(`SELECT COUNT(*) FROM t_user WHERE str_LOGIN = '${LOGIN_ESSAI}'`) === '0', JSON.stringify(cree));
    const mdp = json((await appel('POST', 'api/v1/utilisateurs/update-password', ad, { lg_USER_ID: ID_SA, str_PASSWORD: 'Change-Par-Admin-9' }, true)).corps);
    ok('Administrateur : mot de passe d\'un super administrateur non modifiable', mdp && mdp.success !== 1 && mdp.success !== '1'
      && !!(await connexion(SA)) && q(`SELECT str_PASSWORD = MD5('e2etest') FROM t_user WHERE lg_USER_ID = '${ID_SA}'`) === '1', JSON.stringify(mdp));

    const jsp = (await appel('POST', 'webservices/sm_user/utilisateur/ws_transaction.jsp?mode=updatepassword', ad,
      { lg_USER_ID: ID_SA, str_PASSWORD: 'Change-Par-Jsp-9' }, true)).corps;
    ok('Administrateur : ancienne page (JSP) — mot de passe d\'un super administrateur non modifiable',
      q(`SELECT str_PASSWORD = MD5('e2etest') FROM t_user WHERE lg_USER_ID = '${ID_SA}'`) === '1' && !/Exception|HTTP Status 500/.test(jsp), jsp.trim().slice(0, 120));

    const cat = json((await appel('GET', 'api/v1/roles/privileges?lg_ROLE_ID=' + ROLE_CAISSIERE + '&search_value=' + encodeURIComponent('CENTRE DE SUPPORT') + '&limit=100', ad)).corps);
    const noms = cat && cat.results ? cat.results.map((p) => p.str_DESCRIPTION) : [];
    ok('Administrateur : seuls « Centre de support » et « Me contacter » au catalogue des droits du Centre de support',
      noms.length === 2 && noms.every((d) => /CENTRE DE SUPPORT$|ME CONTACTER/i.test(d)), noms.join(' | '));
    const accorde = json((await appel('POST', 'api/v1/roles/privileges/toggle', ad, { lg_ROLE_ID: ROLE_CAISSIERE, lg_PRIVELEGE_ID: PRIV_TICKETS, checked: 'true' }, true)).corps);
    const lien = q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE_CAISSIERE}' AND lg_PRIVILEGE_ID = '${PRIV_TICKETS}'`);
    ok('Administrateur : attribution directe d\'un droit du Centre de support refusée', accorde && accorde.success !== 1 && accorde.success !== '1' && lien === '0', JSON.stringify(accorde) + ' / ' + lien);
    if (lien !== '0') { q(`DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE_CAISSIERE}' AND lg_PRIVILEGE_ID = '${PRIV_TICKETS}'`); }

    /* super administrateur */
    const sa = await connexion(SA);
    const menuSa = await sousMenusSupport(sa);
    ok('Super administrateur : tout le Centre de support, audit compris', menuSa.length === RESERVES.length + 1, menuSa.join(','));
    const audit = json((await appel('GET', 'api/v1/audit/analyse', sa)).corps);
    ok('Super administrateur : audit accessible', audit && audit.success !== false && !!audit.sections, audit ? Object.keys(audit).join(',') : '');
    const rolesSa = json((await appel('GET', 'api/v1/roles?limit=100', sa)).corps);
    ok('Super administrateur : profil Super Administrateur dans la liste des profils', rolesSa && rolesSa.results.some((r) => r.lg_ROLE_ID === ROLE_SA));
    const catSa = json((await appel('GET', 'api/v1/roles/privileges?lg_ROLE_ID=' + ROLE_CAISSIERE + '&search_value=' + encodeURIComponent('CENTRE DE SUPPORT') + '&limit=100', sa)).corps);
    ok('Super administrateur : tous les droits du Centre de support au catalogue', catSa && catSa.results.length >= 8, catSa ? catSa.results.length : '');
  } catch (e) { ok('Parcours sans exception', false, e.stack); } finally {
    q(`DELETE FROM t_role_user WHERE lg_USER_ID IN (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${LOGIN_ESSAI}'); DELETE FROM t_user WHERE str_LOGIN = '${LOGIN_ESSAI}'`);
    q(`UPDATE t_user SET str_PASSWORD = MD5('e2etest') WHERE lg_USER_ID = '${ID_SA}'`);
    ok('Essais retirés', q(`SELECT COUNT(*) FROM t_user WHERE str_LOGIN = '${LOGIN_ESSAI}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
