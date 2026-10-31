/* FAILLE DE DROITS (rapport du 31/10 : profils, utilisateurs, parametres). Les routes v1/roles, v1/utilisateurs et
 * v1/app-params ne verifiaient qu'une session, et le super administrateur etait reconnu au NOM de son profil.
 * Comptes d'essai crees puis retires, chacun connecte par l'ecran de connexion ; les appels sont ceux qu'un script
 * ferait avec le cookie de session (c'est la faille : le menu masque ne protegeait rien).
 *  - vendeur (profil d'essai CUSTOMER, sans menu de gestion) : renommer son profil « Super Administrateur… », s'accorder
 *    le menu Profils, reinitialiser le mot de passe d'un administrateur (REST et ancienne JSP), modifier un parametre
 *    reserve, lire un secret : tout refuse ;
 *  - gestionnaire des utilisateurs (menu Utilisateurs seul) : creer un compte administrateur, reinitialiser un mot de
 *    passe sans le droit : refuse ; creer un compte de son niveau : accepte (pas de regression) ;
 *  - administrateur : renommer un profil « Super Administrateur… » refuse ; creer un compte et reinitialiser un mot de
 *    passe vendeur, modifier un parametre : accepte ; acces de depannage : refuse ;
 *  - super administrateur : un profil renomme « Super Administrateur… » ne donne aucun droit ; acces de depannage
 *    modifiable et journalise ;
 *  - regressions : est-admin, cles ordinaires, reglage des ecrans de stock par l'ancienne JSP.
 */
const { chromium } = require('playwright-core');
const ENV = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV.MARIADB, '--default-character-set=utf8mb4', ENV.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MDP = 'e2etest';
const RV = 'E2E-FLT-RV', RG = 'E2E-FLT-RG'; // profils d'essai : vendeur, gestionnaire des utilisateurs
const UV = 'E2E-FLT-UV', UG = 'E2E-FLT-UG', UA = 'E2E-FLT-UA'; // comptes : vendeur, gestionnaire, administrateur
const LV = 'e2e-flt-v', LG = 'e2e-flt-g', LA = 'e2e-flt-a';
const P_SYS = 'E2E_FLT_SYS', P_CUS = 'E2E_FLT_CUS', P_SECRET = 'E2E_FLT_SECRET';
const ROLE_ADMIN = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV.LOGIN + "' LIMIT 1");
const ROLE_VENDEUR = q("SELECT IFNULL(MAX(lg_ROLE_ID), '') FROM t_role WHERE str_NAME = 'Vendeur'");
const DEPANNAGE = q("SELECT IFNULL(MAX(str_VALUE), '0') FROM t_parameters WHERE str_KEY = 'ACCES_DEPANNAGE_ACTIF'");
const STOCK = q("SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = 'KEY_DAY_STOCK'");
const DEBUT = q('SELECT NOW()');

function retirer() {
  q(`DELETE FROM t_role_user WHERE lg_USER_ID IN (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN LIKE 'e2e-flt-%');`
    + ` DELETE FROM t_event_log WHERE lg_USER_ID IN (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN LIKE 'e2e-flt-%');`
    + ` DELETE FROM t_user WHERE str_LOGIN LIKE 'e2e-flt-%';`
    + ` DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN ('${RV}', '${RG}') OR lg_ROLE_ID IN (SELECT lg_ROLE_ID FROM t_role WHERE str_NAME LIKE 'E2E FLT%');`
    + ` DELETE FROM t_role WHERE lg_ROLE_ID IN ('${RV}', '${RG}') OR str_NAME LIKE 'E2E FLT%';`
    + ` DELETE FROM t_parameters WHERE str_KEY IN ('${P_SYS}', '${P_CUS}', '${P_SECRET}')`);
}
const compte = (id, login, role) => q(`INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)`
  + ` VALUES ('${id}', '${login}', MD5('${MDP}'), 'E2E', 'FAILLE', 'Essai', 'enable', '1', NOW(), 0);`
  + ` INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${id}', '${role}', '${id}', NOW())`);
const accorder = (role, privilege) => q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)`
  + ` SELECT CONCAT('E2EFLT', LEFT(UUID(), 30)), '${role}', lg_PRIVELEGE_ID, NOW() FROM t_privilege WHERE str_NAME = '${privilege}'`);
const mdp = (id) => q(`SELECT str_PASSWORD = MD5('${MDP}') FROM t_user WHERE lg_USER_ID = '${id}'`) === '1';
const nomRole = (id) => q(`SELECT str_NAME FROM t_role WHERE lg_ROLE_ID = '${id}'`);
const param = (k) => q(`SELECT IFNULL(MAX(str_VALUE), 'ABSENT') FROM t_parameters WHERE str_KEY = '${k}'`);
const aDroit = (role, privilege) => q(`SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '${role}' AND p.str_NAME = '${privilege}'`) !== '0';

/* appel avec la session de la page : formulaire (POST) ou lecture (GET) ; {status, j} */
const appel = (p, url, form) => p.evaluate(async ([url, form]) => {
  const r = await fetch(url, form ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() } : {});
  const t = await r.text(); let j = null;
  try { j = JSON.parse(t); } catch (e) { try { j = (new Function('return ' + t.trim()))(); } catch (e2) { j = { brut: t.slice(0, 200) }; } }
  return { status: r.status, j };
}, [url, form || null]);
const accepte = (r) => r.status === 200 && r.j && String(r.j.success) === '1';
const refuse = (r) => !accepte(r);
const API = '../api/v1/';

(async () => {
  retirer();
  q(`INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('${RV}', 'E2E FLT vendeur', 'E2E FLT vendeur', 'CUSTOMER', 'enable', NOW()),`
    + ` ('${RG}', 'E2E FLT gestion', 'E2E FLT gestion', 'CUSTOMER', 'enable', NOW())`);
  if (ROLE_VENDEUR) {
    q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) SELECT CONCAT('E2EFLT', LEFT(UUID(), 30)), r.id, rp.lg_PRIVILEGE_ID, NOW()`
      + ` FROM t_role_privelege rp JOIN (SELECT '${RV}' id UNION SELECT '${RG}') r WHERE rp.lg_ROLE_ID = '${ROLE_VENDEUR}'`);
  }
  accorder(RG, 'P_SM_UTILISATEUR');
  compte(UV, LV, RV); compte(UG, LG, RG); compte(UA, LA, ROLE_ADMIN);
  q(`INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES ('${P_SYS}', '0', 'essai faille', 'SYSTEME', 'enable'),`
    + ` ('${P_CUS}', '0', 'essai faille', 'CUSTOMER', 'enable'), ('${P_SECRET}', 'valeur-secrete-e2e', 'essai faille', 'SYSTEME', 'enable')`);

  const b = await ENV.lancer(chromium);
  try {
    const page = async (login) => { const p = await (await b.newContext()).newPage(); await connexion(p, login, MDP); return p; };
    const vendeur = await page(LV);

    /* ---------- vendeur */
    let r = await appel(vendeur, API + 'roles/update', { lg_ROLE_ID: RV, str_NAME: 'Super Administrateur E2E', str_DESIGNATION: 'E2E FLT vendeur', str_TYPE: 'CUSTOMER' });
    ok('NR-01 vendeur : renommer son profil « Super Administrateur… » refusé (403), profil inchangé', r.status === 403 && nomRole(RV) === 'E2E FLT vendeur', r.status + ' ' + JSON.stringify(r.j) + ' / ' + nomRole(RV));
    q(`UPDATE t_role SET str_NAME = 'E2E FLT vendeur' WHERE lg_ROLE_ID = '${RV}'`);
    r = await appel(vendeur, API + 'roles/privileges/toggle', { lg_ROLE_ID: RV, lg_PRIVELEGE_ID: q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SM_ROLE'"), checked: 'true' });
    ok('NR-05 vendeur : s\'accorder le menu Profils refusé', refuse(r) && !aDroit(RV, 'P_SM_ROLE'), r.status + ' ' + JSON.stringify(r.j));
    q(`DELETE rp FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '${RV}' AND p.str_NAME = 'P_SM_ROLE'`);
    r = await appel(vendeur, API + 'roles/create', { str_NAME: 'E2E FLT cree', str_DESIGNATION: 'x', str_TYPE: '' });
    const r2 = await appel(vendeur, API + 'roles/duplicate', { lg_ROLE_ID: ROLE_ADMIN, str_NAME: 'E2E FLT copie', str_DESIGNATION: 'x' });
    ok('NR-05 vendeur : créer ou dupliquer un profil refusé', refuse(r) && refuse(r2) && q("SELECT COUNT(*) FROM t_role WHERE str_NAME LIKE 'E2E FLT c%'") === '0', JSON.stringify([r.status, r2.status]));
    r = await appel(vendeur, API + 'utilisateurs/update-password', { lg_USER_ID: UA, str_PASSWORD: 'Piratage1' });
    ok('NR-06 vendeur : réinitialiser le mot de passe d\'un administrateur refusé', refuse(r) && mdp(UA), r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_user SET str_PASSWORD = MD5('${MDP}') WHERE lg_USER_ID = '${UA}'`);
    r = await appel(vendeur, API + 'utilisateurs/create', { str_LOGIN: 'e2e-flt-x', str_PASSWORD: 'Piratage1', str_FIRST_NAME: 'X', str_LAST_NAME: 'X', lg_ROLE_ID: ROLE_ADMIN, str_LIEU_TRAVAIL: '1' });
    ok('NR-06 vendeur : créer un compte refusé', refuse(r) && q("SELECT COUNT(*) FROM t_user WHERE str_LOGIN = 'e2e-flt-x'") === '0', r.status + ' ' + JSON.stringify(r.j));
    q("DELETE FROM t_role_user WHERE lg_USER_ID IN (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'e2e-flt-x'); DELETE FROM t_user WHERE str_LOGIN = 'e2e-flt-x'");
    r = await appel(vendeur, '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=updatepassword', { lg_USER_ID: UA, str_PASSWORD: 'Piratage1' });
    ok('NR-15 vendeur : même chose par l\'ancienne JSP, refusé', refuse(r) && mdp(UA), r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_user SET str_PASSWORD = MD5('${MDP}') WHERE lg_USER_ID = '${UA}'`);
    r = await appel(vendeur, '../webservices/sm_user/role/ws_transaction.jsp?mode=update', { lg_ROLE_ID: RV, str_NAME: 'Super Administrateur E2E', str_DESIGNATION: 'x', str_TYPE: 'CUSTOMER' });
    ok('NR-15 vendeur : renommer son profil par l\'ancienne JSP, refusé', refuse(r) && nomRole(RV) === 'E2E FLT vendeur', r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_role SET str_NAME = 'E2E FLT vendeur', str_DESIGNATION = 'E2E FLT vendeur' WHERE lg_ROLE_ID = '${RV}'`);
    r = await appel(vendeur, API + 'app-params/toggle', { str_KEY: P_SYS, str_VALUE: '1' });
    const r3 = await appel(vendeur, API + 'app-params/toggle', { str_KEY: P_CUS, str_VALUE: '1' });
    ok('NR-09 vendeur : modifier un paramètre (réservé ou ordinaire) refusé', refuse(r) && refuse(r3) && param(P_SYS) === '0' && param(P_CUS) === '0', JSON.stringify([r.status, r3.status]));
    q(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY IN ('${P_SYS}', '${P_CUS}')`);
    r = await appel(vendeur, '../webservices/sm_user/parameter/ws_transaction.jsp?mode=update', { str_KEY: P_SYS, str_VALUE: '1', str_DESCRIPTION: 'essai faille' });
    ok('NR-15 vendeur : paramètre réservé par l\'ancienne JSP, refusé', refuse(r) && param(P_SYS) === '0', r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${P_SYS}'`);
    r = await appel(vendeur, '../webservices/sm_user/parameter/ws_transaction.jsp?mode=update', { str_KEY: 'KEY_DAY_STOCK', str_VALUE: STOCK, str_DESCRIPTION: q("SELECT str_DESCRIPTION FROM t_parameters WHERE str_KEY = 'KEY_DAY_STOCK'") });
    ok('Régression : le réglage des écrans de stock (jours de stock) reste enregistrable par l\'ancienne JSP', accepte(r) && param('KEY_DAY_STOCK') === STOCK, r.status + ' ' + JSON.stringify(r.j));
    r = await appel(vendeur, API + 'app-params/value/' + P_SECRET);
    const r4 = await appel(vendeur, API + 'app-params/detail?str_KEY=' + P_SECRET);
    ok('NR-12 vendeur : la valeur d\'un secret ne sort pas (value et detail)', !JSON.stringify(r.j).includes('valeur-secrete') && !JSON.stringify(r4.j).includes('valeur-secrete'), JSON.stringify([r.status, r4.status]));
    r = await appel(vendeur, API + 'app-params/value/KEY_DAY_STOCK');
    const r5 = await appel(vendeur, API + 'roles/est-admin');
    ok('NR-13 vendeur : clé ordinaire lisible, « est-admin » répond (non)', r.status === 200 && JSON.stringify(r.j).includes(STOCK) && r5.status === 200 && r5.j.authorize === false, JSON.stringify([r.j, r5.j]));
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto(ENV.BASE_URL || 'http://localhost:8080/prestige/security/index.html');
    r = await appel(anonyme, '/prestige/api/v1/app-params/value/' + P_SECRET);
    const r6 = await appel(anonyme, '/prestige/api/v1/roles/update', { lg_ROLE_ID: RV, str_NAME: 'x' });
    ok('NR-14 sans session : 401', r.status === 401 && r6.status === 401, JSON.stringify([r.status, r6.status]));

    /* ---------- gestionnaire des utilisateurs (menu Utilisateurs seul) */
    const gest = await page(LG);
    r = await appel(gest, API + 'utilisateurs/create', { str_LOGIN: 'e2e-flt-x', str_PASSWORD: 'Essai1234', str_FIRST_NAME: 'X', str_LAST_NAME: 'X', lg_ROLE_ID: ROLE_ADMIN, str_LIEU_TRAVAIL: '1' });
    ok('Gestionnaire : créer un compte au profil administrateur refusé', refuse(r) && q("SELECT COUNT(*) FROM t_user WHERE str_LOGIN = 'e2e-flt-x'") === '0', r.status + ' ' + JSON.stringify(r.j));
    q("DELETE FROM t_role_user WHERE lg_USER_ID IN (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'e2e-flt-x'); DELETE FROM t_user WHERE str_LOGIN = 'e2e-flt-x'");
    r = await appel(gest, API + 'utilisateurs/update', { lg_USER_ID: UG, str_LOGIN: LG, str_FIRST_NAME: 'E2E', str_LAST_NAME: 'FAILLE', lg_ROLE_ID: ROLE_ADMIN, str_LIEU_TRAVAIL: '1' });
    ok('Gestionnaire : se donner le profil administrateur refusé', refuse(r) && q(`SELECT lg_ROLE_ID FROM t_role_user WHERE lg_USER_ID = '${UG}'`) === RG, r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_role_user SET lg_ROLE_ID = '${RG}' WHERE lg_USER_ID = '${UG}'`);
    r = await appel(gest, API + 'utilisateurs/update-password', { lg_USER_ID: UV, str_PASSWORD: 'Essai1234' });
    ok('Gestionnaire : réinitialiser un mot de passe sans ce droit refusé', refuse(r) && mdp(UV), r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_user SET str_PASSWORD = MD5('${MDP}') WHERE lg_USER_ID = '${UV}'`);
    r = await appel(gest, API + 'utilisateurs/create', { str_LOGIN: 'e2e-flt-n', str_PASSWORD: 'Essai1234', str_FIRST_NAME: 'N', str_LAST_NAME: 'N', lg_ROLE_ID: RV, str_LIEU_TRAVAIL: '1' });
    ok('Régression : le gestionnaire crée toujours un compte de profil ordinaire', accepte(r) && q("SELECT COUNT(*) FROM t_user WHERE str_LOGIN = 'e2e-flt-n'") === '1', r.status + ' ' + JSON.stringify(r.j));

    /* ---------- administrateur */
    const adm = await page(LA);
    r = await appel(adm, API + 'roles/update', { lg_ROLE_ID: RV, str_NAME: 'Super Administrateur E2E', str_DESIGNATION: 'E2E FLT vendeur', str_TYPE: 'CUSTOMER' });
    ok('NR-03 administrateur : nom réservé « Super Administrateur… » refusé', refuse(r) && nomRole(RV) === 'E2E FLT vendeur', r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_role SET str_NAME = 'E2E FLT vendeur' WHERE lg_ROLE_ID = '${RV}'`);
    r = await appel(adm, API + 'roles/update', { lg_ROLE_ID: RV, str_NAME: 'E2E FLT vendeur', str_DESIGNATION: 'E2E FLT vendeur (modifié)', str_TYPE: 'CUSTOMER' });
    ok('NR-07 administrateur : modifier un profil ordinaire accepté', accepte(r) && q(`SELECT str_DESIGNATION FROM t_role WHERE lg_ROLE_ID = '${RV}'`) === 'E2E FLT vendeur (modifié)', r.status + ' ' + JSON.stringify(r.j));
    r = await appel(adm, API + 'utilisateurs/update-password', { lg_USER_ID: UV, str_PASSWORD: 'Essai1234' });
    ok('NR-07 administrateur : réinitialiser le mot de passe d\'un vendeur accepté', accepte(r) && !mdp(UV), r.status + ' ' + JSON.stringify(r.j));
    q(`UPDATE t_user SET str_PASSWORD = MD5('${MDP}') WHERE lg_USER_ID = '${UV}'`);
    r = await appel(adm, API + 'utilisateurs/update-password', { lg_USER_ID: q("SELECT u.lg_USER_ID FROM t_user u WHERE u.str_LOGIN = '" + ENV.LOGIN_SUPPORT + "'"), str_PASSWORD: 'Essai1234' });
    ok('NR-08 administrateur : mot de passe du super administrateur refusé (règle conservée)', refuse(r), r.status + ' ' + JSON.stringify(r.j));
    r = await appel(adm, API + 'app-params/toggle', { str_KEY: P_SYS, str_VALUE: '1' });
    ok('NR-10 administrateur : modifier un paramètre réservé accepté', accepte(r) && param(P_SYS) === '1', r.status + ' ' + JSON.stringify(r.j));
    r = await appel(adm, API + 'app-params/toggle', { str_KEY: 'ACCES_DEPANNAGE_ACTIF', str_VALUE: DEPANNAGE });
    ok('NR-11 administrateur : accès de dépannage refusé', refuse(r), r.status + ' ' + JSON.stringify(r.j));
    const liste = await appel(adm, API + 'app-params/liste?search_value=E2E_FLT&limit=50');
    const ligne = ((liste.j && liste.j.results) || []).find((x) => x.str_KEY === P_SECRET) || {};
    ok('Écran des paramètres : la valeur du secret est masquée', ligne.str_KEY === P_SECRET && !String(ligne.str_VALUE).includes('valeur-secrete'), JSON.stringify(ligne).slice(0, 200));
    r = await appel(adm, API + 'app-params/update', { str_KEY: P_SECRET, str_VALUE: ligne.str_VALUE || '', str_DESCRIPTION: 'essai faille (modifié)' });
    ok('Écran des paramètres : enregistrer la description sans retaper le secret le garde intact', accepte(r) && param(P_SECRET) === 'valeur-secrete-e2e', r.status + ' ' + JSON.stringify(r.j));
    r = await appel(adm, API + 'roles/est-admin');
    ok('NR-16 administrateur : toujours reconnu administrateur', r.j && r.j.authorize === true, JSON.stringify(r.j));

    /* ---------- super administrateur */
    const sa = await page(ENV.LOGIN_SUPPORT);
    r = await appel(sa, API + 'roles/update', { lg_ROLE_ID: RV, str_NAME: 'Super Administrateur E2E', str_DESIGNATION: 'E2E FLT vendeur', str_TYPE: 'CUSTOMER' });
    ok('NR-04 super administrateur : renommer un profil accepté', accepte(r) && nomRole(RV) === 'Super Administrateur E2E', r.status + ' ' + JSON.stringify(r.j));
    const vendeur2 = await page(LV);
    r = await appel(vendeur2, API + 'roles/est-admin');
    const r7 = await appel(vendeur2, API + 'roles/update', { lg_ROLE_ID: RV, str_NAME: 'E2E FLT vendeur', str_DESIGNATION: 'x', str_TYPE: 'CUSTOMER' });
    ok('NR-02/04 le vendeur reconnecté, profil renommé « Super Administrateur… », n\'a aucun droit de plus', r.j && r.j.authorize === false && refuse(r7), JSON.stringify([r.j, r7.status]));
    q(`UPDATE t_role SET str_NAME = 'E2E FLT vendeur' WHERE lg_ROLE_ID = '${RV}'`);
    r = await appel(sa, API + 'roles/privileges?lg_ROLE_ID=' + RV + '&search_value=P_PROFIL&limit=10');
    ok('NR-16 super administrateur : reconnu (il voit les droits de profil spécial)', r.j && r.j.total === 3, JSON.stringify(r.j).slice(0, 200));
    const journal = () => q(`SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = 'ACCES_DEPANNAGE_ACTIF' AND dt_CREATED >= '${DEBUT}'`);
    const nb = journal();
    const autre = DEPANNAGE === '1' ? '0' : '1';
    r = await appel(sa, API + 'app-params/toggle', { str_KEY: 'ACCES_DEPANNAGE_ACTIF', str_VALUE: autre });
    const ouvert = param('ACCES_DEPANNAGE_ACTIF');
    await appel(sa, API + 'app-params/toggle', { str_KEY: 'ACCES_DEPANNAGE_ACTIF', str_VALUE: DEPANNAGE });
    const nb2 = journal();
    ok('NR-11 super administrateur : accès de dépannage modifiable, chaque changement journalisé', accepte(r) && ouvert === autre && param('ACCES_DEPANNAGE_ACTIF') === DEPANNAGE && +nb2 >= +nb + 2, JSON.stringify({ ouvert, nb, nb2 }));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    q(`UPDATE t_parameters SET str_VALUE = '${DEPANNAGE}' WHERE str_KEY = 'ACCES_DEPANNAGE_ACTIF'`);
    retirer();
    q(`DELETE FROM t_event_log WHERE str_TYPE_LOG = 'ACCES_DEPANNAGE_ACTIF' AND dt_CREATED >= '${DEBUT}'`);
    ok('Données d\'essai retirées, accès de dépannage remis', q("SELECT COUNT(*) FROM t_user WHERE str_LOGIN LIKE 'e2e-flt-%'") === '0' && param('ACCES_DEPANNAGE_ACTIF') === DEPANNAGE);
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
