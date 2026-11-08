/* MIGRATION V7.2.70 (demande 60) : DROIT P_RESERVE_SUGGESTION.
 *
 * Joue le fichier de migration lui-meme (src/main/resources/db/migration/V7.2.70__droit_voir_suggestions_reserve.sql)
 * sur la copie de travail, avec quatre roles d'essai (crees par le test, retires a la fin) :
 *  - menu « Gestion des reserves » seul (P_SM_RESERVE)            -> recoit le droit ;
 *  - droit de traiter la reserve seul (P_TRAITER_RESERVE)          -> recoit le droit (il ouvrait les suggestions sur le mobile) ;
 *  - les deux                                                     -> recoit le droit, une seule fois ;
 *  - ni l'un ni l'autre (menu GESTION DU STOCK seulement)          -> ne recoit rien.
 * Puis : tout role de la base qui a P_SM_RESERVE ou P_TRAITER_RESERVE a le droit ; le role du compte admin l'a ; le
 * privilege existe une fois, avec son libelle ; une seconde execution ne change rien (memes lignes, ligne a ligne).
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const FICHIER = path.join(__dirname, '..', '..', '..', 'main', 'resources', 'db', 'migration', 'V7.2.70__droit_voir_suggestions_reserve.sql');
const migrer = () => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE], { input: fs.readFileSync(FICHIER, 'utf8'), encoding: 'utf8' });
const ROLES = {
  'E2E-MIG60-MENU': ['P_SM_RESERVE'],
  'E2E-MIG60-TRAITER': ['P_TRAITER_RESERVE'],
  'E2E-MIG60-DEUX': ['P_SM_RESERVE', 'P_TRAITER_RESERVE'],
  'E2E-MIG60-AUCUN': ['P_M_GESTION_STOCK']
};
const ids = Object.keys(ROLES).map((r) => "'" + r + "'").join(',');
const nettoyer = () => q('DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN (' + ids + '); DELETE FROM t_role WHERE lg_ROLE_ID IN (' + ids + ');');
const nbDroit = (role) => Number(q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + role + "' AND p.str_NAME = 'P_RESERVE_SUGGESTION'"));
/* empreinte ligne a ligne des attributions du droit (role, privilege) et du privilege lui-meme */
const empreinte = () => q("SELECT CONCAT(COUNT(*), ':', IFNULL(MD5(GROUP_CONCAT(CONCAT(rp.lg_ROLE_PRIVILEGE, '/', rp.lg_ROLE_ID) ORDER BY rp.lg_ROLE_PRIVILEGE)), '-'))"
  + " FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_RESERVE_SUGGESTION'")
  + ' | ' + q("SELECT GROUP_CONCAT(CONCAT(lg_PRIVELEGE_ID, '/', str_DESCRIPTION)) FROM t_privilege WHERE str_NAME = 'P_RESERVE_SUGGESTION'")
  + ' | ' + q('SELECT COUNT(*) FROM t_role_privelege') + ' | ' + q('SELECT COUNT(*) FROM t_privilege');

try {
  nettoyer();
  Object.entries(ROLES).forEach(([role, droits]) => {
    q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + role + "', '" + role + "', '" + role + "', 'CUSTOMER', 'enable', NOW())");
    droits.forEach((d, i) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)"
      + " SELECT '" + role + '-' + i + "', '" + role + "', lg_PRIVELEGE_ID, NOW() FROM t_privilege WHERE str_NAME = '" + d + "'"));
  });
  ok('Rôles d\'essai sans le droit avant la migration', Object.keys(ROLES).every((r) => nbDroit(r) === 0));

  migrer();
  ok('Menu seul (P_SM_RESERVE) : reçoit le droit', nbDroit('E2E-MIG60-MENU') === 1);
  ok('Traiter seul (P_TRAITER_RESERVE) : reçoit le droit', nbDroit('E2E-MIG60-TRAITER') === 1);
  ok('Les deux : reçoit le droit une seule fois', nbDroit('E2E-MIG60-DEUX') === 1);
  ok('Ni l\'un ni l\'autre : ne reçoit rien', nbDroit('E2E-MIG60-AUCUN') === 0);
  const manquants = q("SELECT GROUP_CONCAT(DISTINCT r.str_NAME) FROM t_role_privelege rp JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID AND m.str_NAME IN ('P_SM_RESERVE', 'P_TRAITER_RESERVE')"
    + " JOIN t_role r ON r.lg_ROLE_ID = rp.lg_ROLE_ID WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d JOIN t_privilege c ON c.lg_PRIVELEGE_ID = d.lg_PRIVILEGE_ID AND c.str_NAME = 'P_RESERVE_SUGGESTION' WHERE d.lg_ROLE_ID = rp.lg_ROLE_ID)");
  ok('Tout rôle de la base qui a P_SM_RESERVE ou P_TRAITER_RESERVE a le droit', manquants === '' || manquants === 'NULL', manquants);
  const doublons = q("SELECT COUNT(*) FROM (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_RESERVE_SUGGESTION' GROUP BY rp.lg_ROLE_ID HAVING COUNT(*) > 1) x");
  ok('Aucun rôle n\'a le droit en double', doublons === '0', doublons);
  const admin = q("SELECT COUNT(*) FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID JOIN t_role_privelege rp ON rp.lg_ROLE_ID = ru.lg_ROLE_ID"
    + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID AND p.str_NAME = 'P_RESERVE_SUGGESTION' WHERE u.str_LOGIN = 'admin'");
  ok('Le rôle du compte admin a le droit', Number(admin) >= 1, admin);
  const priv = q("SELECT CONCAT_WS('|', COUNT(*), MAX(str_DESCRIPTION), MAX(str_STATUT), MAX(str_TYPE)) FROM t_privilege WHERE str_NAME = 'P_RESERVE_SUGGESTION'");
  ok('Le privilège existe une fois, avec son libellé', priv === '1|RÉSERVE - Voir et ouvrir les suggestions de réserve (onglet Suggestions, mobile)|enable|CUSTOMER', priv);

  const avant = empreinte();
  migrer();
  ok('Seconde exécution : rien ne change (attributions ligne à ligne, privilège, nombres de lignes)', empreinte() === avant, avant + ' => ' + empreinte());
  migrer();
  ok('Troisième exécution : toujours rien', empreinte() === avant);
} catch (x) {
  ok('Déroulé sans erreur', false, x.stack);
} finally {
  nettoyer();
  ok('Rôles d\'essai retirés', q("SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID LIKE 'E2E-MIG60-%'") + q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID LIKE 'E2E-MIG60-%'") === '00');
}
const ko = res.filter((x) => !x.c).length;
console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
process.exit(ko ? 1 : 0);
