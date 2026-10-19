/* DEMANDES 51 ET 52 DES APPLICATIONS MOBILES (16/10) : POINTAGE.
 *
 * 51 - pointer avec la session de l'application (cookie), sans P_SM_RH ni jeton v1/mobile :
 *  - GET v1/rh/moi : l'utilisateur DE LA SESSION et son employe (401 sans session) ;
 *  - POST v1/rh/moi/pointages : memes controles que v1/mobile (QR du moment, moins de 2 minutes refuse) ; le corps
 *    ne peut pas designer un autre employe (employeId / login ignores) ; meme X-Client-Ref = un seul pointage ;
 *  - GET v1/rh/moi/pointages : mes pointages des 16 dernieres heures.
 * 52 - droit P_RH_POINTER (terminal) :
 *  - avec seulement P_RH_POINTER : rh/droits {success, pointer:true, gerer:false}, rh/employes en lecture seule
 *    (id, matricule, nom, prenoms, badge, statut), rh/pointages accepte ; presence, tableau et suppression d'un
 *    pointage -> 403 interdit ;
 *  - sans aucun des deux droits : rh/droits -> success:false, comme avant.
 * Deux comptes, un role d'essai, un employe et ses pointages sont poses puis retires.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const U1 = 'E2E-P51-U', L1 = 'e2e-p51', M1 = 'E2e-P51-Mdp7', E1 = 'E2E-P51-EMP';
const U2 = 'E2E-P52-U', L2 = 'e2e-p52', M2 = 'E2e-P52-Mdp7', ROLE2 = 'E2E-P52-ROLE';
const AUTRE = q("SELECT id FROM t_employe WHERE statut = 'ACTIF' AND id NOT LIKE 'E2E%' LIMIT 1");
const ROLE_VENDEUR = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const retirer = () => q(`DELETE FROM mobile_client_ref WHERE ref LIKE 'e2e-p51-%'; DELETE FROM t_pointage WHERE employe_id = '${E1}' OR saisi_par IN ('${U1}', '${U2}');`
  + ` DELETE FROM t_employe WHERE id = '${E1}'; DELETE FROM t_role_user WHERE lg_USER_ID IN ('${U1}', '${U2}');`
  + ` DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE2}'; DELETE FROM t_role WHERE lg_ROLE_ID = '${ROLE2}';`
  + ` DELETE FROM t_event_log WHERE lg_USER_ID IN ('${U1}', '${U2}'); DELETE FROM t_user WHERE lg_USER_ID IN ('${U1}', '${U2}')`);

(async () => {
  retirer();
  for (const [u, l, m] of [[U1, L1, M1], [U2, L2, M2]]) {
    q(`INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)`
      + ` VALUES ('${u}', '${l}', MD5('${m}'), 'E2E', 'POINTAGE', 'Vendeur', 'enable', '1', NOW(), 0)`);
  }
  q(`INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${U1}', '${ROLE_VENDEUR}', '${U1}', NOW())`);
  q(`INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('${ROLE2}', 'E2E terminal', 'E2E terminal', 'CUSTOMER', 'enable', NOW())`);
  q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) SELECT '${ROLE2}', '${ROLE2}', lg_PRIVELEGE_ID, NOW(), NOW() FROM t_privilege WHERE str_NAME = 'P_RH_POINTER'`);
  q(`INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${U2}', '${ROLE2}', '${U2}', NOW())`);
  q(`INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, created_at) VALUES ('${E1}', 'E2E-P51', 'ZZPOINT', 'Session', 'ACTIF', '${U1}', NOW())`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const appel = (p, m, u, c, h) => p.evaluate(async ([m, u, c, h]) => { const r = await fetch(u, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: c === undefined ? undefined : JSON.stringify(c) });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c, h]);
  const nb = () => Number(q(`SELECT COUNT(*) FROM t_pointage WHERE employe_id = '${E1}'`));
  try {
    /* 51 */
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const a0 = await appel(anonyme, 'GET', '../api/v1/rh/moi');
    ok('51 : sans session, rh/moi → 401', a0.status === 401, a0.status);
    const adm = await (await b.newContext()).newPage();
    await connexion(adm, 'admin', 'e2etest');
    const code = (await appel(adm, 'GET', '../api/v1/rh/mobile/code')).j;
    const p1 = await (await b.newContext()).newPage();
    await connexion(p1, L1, M1);
    const moi = await appel(p1, 'GET', '../api/v1/rh/moi');
    ok('51 : rh/moi = l\'utilisateur de la session et son employé (sans P_SM_RH)', moi.status === 200 && moi.j && moi.j.success === true
      && moi.j.utilisateur && moi.j.utilisateur.login === L1 && moi.j.employe && moi.j.employe.id === E1, JSON.stringify(moi).slice(0, 200));
    const corps = { code: code && code.code, employeId: AUTRE, login: 'admin' };
    const r1 = await appel(p1, 'POST', '../api/v1/rh/moi/pointages', corps, { 'X-Client-Ref': 'e2e-p51-1' });
    const r1b = await appel(p1, 'POST', '../api/v1/rh/moi/pointages', corps, { 'X-Client-Ref': 'e2e-p51-1' });
    ok('51 : pointage enregistré au nom de la session (employeId et login du corps ignorés)', r1.j && r1.j.success === true && nb() === 1
      && q(`SELECT CONCAT(source, '|', saisi_par) FROM t_pointage WHERE employe_id = '${E1}'`) === 'MOBILE|' + U1
      && q(`SELECT COUNT(*) FROM t_pointage WHERE employe_id = '${AUTRE}' AND saisi_par = '${U1}'`) === '0', JSON.stringify(r1.j));
    ok('51 : même X-Client-Ref : même réponse, un seul pointage', r1b.j && r1b.j.success === true && nb() === 1, JSON.stringify(r1b.j));
    const r2 = await appel(p1, 'POST', '../api/v1/rh/moi/pointages', corps, { 'X-Client-Ref': 'e2e-p51-2' });
    ok('51 : second pointage en moins de 2 minutes : refusé', r2.j && r2.j.success === false && /deux minutes/.test(JSON.stringify(r2.j)) && nb() === 1, JSON.stringify(r2.j));
    const sansQr = await appel(p1, 'POST', '../api/v1/rh/moi/pointages', { code: 'FAUX' }, { 'X-Client-Ref': 'e2e-p51-3' });
    ok('51 : QR invalide refusé', sansQr.j && sansQr.j.success === false && /QR|code/i.test(JSON.stringify(sansQr.j)), JSON.stringify(sansQr.j));
    const mes = await appel(p1, 'GET', '../api/v1/rh/moi/pointages');
    ok('51 : rh/moi/pointages : mon pointage des 16 dernières heures', mes.j && mes.j.success === true && (mes.j.data || []).length === 1, JSON.stringify(mes.j));
    const d1 = await appel(p1, 'GET', '../api/v1/rh/droits');
    ok('52 : sans aucun des deux droits : rh/droits → success:false (comme avant)', d1.status === 200 && d1.j && d1.j.success === false, JSON.stringify(d1));

    /* 52 */
    /* le compte terminal n'ouvre aucun menu : il se connecte comme l'application, par v1/user/auth */
    const p2 = await (await b.newContext()).newPage();
    await p2.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const auth = await appel(p2, 'POST', '../api/v1/user/auth', { login: L2, password: M2 });
    ok('52 : compte terminal connecté par v1/user/auth', auth.j && auth.j.success === true, JSON.stringify(auth.j).slice(0, 120));
    const d2 = await appel(p2, 'GET', '../api/v1/rh/droits');
    ok('52 : P_RH_POINTER seul : rh/droits {success, pointer:true, gerer:false}', d2.j && d2.j.success === true && d2.j.pointer === true && d2.j.gerer === false, JSON.stringify(d2.j));
    const emp = await appel(p2, 'GET', '../api/v1/rh/employes');
    const cles = new Set(); ((emp.j && emp.j.data) || []).forEach((e) => Object.keys(e).forEach((k) => cles.add(k)));
    ok('52 : rh/employes en lecture seule (id, matricule, nom, prénoms, badge, statut, rien d\'autre)', emp.j && emp.j.success === true && cles.size > 0
      && [...cles].every((k) => ['id', 'matricule', 'nom', 'prenoms', 'badge', 'statut'].includes(k)), [...cles].join(','));
    const jour = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d')"), heure = q("SELECT DATE_FORMAT(NOW() - INTERVAL 1 HOUR, '%H:%i')");
    const sp = await appel(p2, 'POST', '../api/v1/rh/pointages', { employeId: E1, jour, heure, sens: 'ENTREE', motif: 'E2E terminal' });
    ok('52 : rh/pointages (terminal) accepté', sp.j && sp.j.success === true && nb() === 2, JSON.stringify(sp.j));
    const interdits = [];
    for (const [m, u] of [['GET', '../api/v1/rh/presence'], ['GET', '../api/v1/rh/tableau'], ['DELETE', '../api/v1/rh/pointages/' + (sp.j && sp.j.id)]]) {
      const r = await appel(p2, m, u); interdits.push(m + ' ' + u.replace('../api/v1/', '') + ' ' + r.status + (r.j && r.j.interdit ? ' interdit' : ''));
    }
    ok('52 : presence, tableau, suppression d\'un pointage → 403 interdit', interdits.every((x) => / 403 interdit$/.test(x)) && nb() === 2, interdits.join(' ; '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Comptes, rôle, employé et pointages d\'essai retirés', q(`SELECT COUNT(*) FROM t_user WHERE lg_USER_ID IN ('${U1}', '${U2}')`) === '0' && nb() === 0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
