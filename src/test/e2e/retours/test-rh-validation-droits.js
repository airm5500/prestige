/* RH : VALIDATION DES CONGES ET DEMANDES PAR UTILISATEUR (retours du 25/10, point 12).
 *
 * Constat : le droit « valider les congés » (P_RH_VALIDER_CONGE) accordé au rôle, le bouton Valider n'apparaissait
 * pas ; et tout utilisateur de l'écran voyait les demandes de tout le monde.
 *
 * Par les vues, jeu d'essai retire a la fin (role, utilisateur, employes, absences) :
 *  - utilisateur d'essai, role avec le menu RH sans le droit de valider, rattache a un employe ;
 *  - Congés et absences : il ne voit que ses demandes (celles de son employe ou saisies par lui), sans Valider ;
 *    la route refuse sa decision ;
 *  - le droit de valider est accorde au role PENDANT sa session : en revenant sur l'onglet, sans se deconnecter,
 *    il voit toutes les demandes et le bouton Valider, et la validation passe ;
 *  - droit retire pendant la session : plus de Valider, la route refuse, retour a ses seules demandes ;
 *  - l'edition PDF de l'onglet suit la meme regle (pas d'erreur) ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-RHV', LOGIN = 'e2e-rh-valid', MDP = 'E2e-Rhv-7', ROLE = 'E2E-RHV-ROLE';
const EMP_MOI = 'E2E-RHV-E1', EMP_AUTRE = 'E2E-RHV-E2';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const priv = (n) => q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = '" + n + "'");
const VALIDER = priv('P_RH_VALIDER_CONGE');

function nettoyer() {
  q("DELETE FROM t_absence WHERE employe_id IN ('" + EMP_MOI + "', '" + EMP_AUTRE + "') OR demande_par = '" + ID + "';"
    + " DELETE FROM t_employe WHERE id IN ('" + EMP_MOI + "', '" + EMP_AUTRE + "') OR lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "'; DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_role WHERE lg_ROLE_ID = '" + ROLE + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");
}

(async () => {
  nettoyer();
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + ROLE + "', 'E2E RH', 'E2E RH', 'CUSTOMER', 'enable', NOW())");
  ['P_M_RH', 'P_SM_RH'].forEach((n, i) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + ROLE + "-" + i + "', '" + ROLE + "', '" + priv(n) + "', NOW())"));
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'RHVALID', 'Vendeur', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
  q("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, created_at) VALUES ('" + EMP_MOI + "', 'E2E-RHV-1', 'E2E MOI', 'Test', 'ACTIF', '" + ID + "', NOW()),"
    + " ('" + EMP_AUTRE + "', 'E2E-RHV-2', 'E2E AUTRE', 'Test', 'ACTIF', NULL, NOW())");
  q("INSERT INTO t_absence (id, employe_id, type, debut, fin, motif, statut, demande_par, created_at) VALUES"
    + " ('E2E-RHV-A1', '" + EMP_MOI + "', 'CONGE', '2026-12-07', '2026-12-08', 'Moi', 'DEMANDE', '" + ADMIN + "', NOW()),"
    + " ('E2E-RHV-A2', '" + EMP_AUTRE + "', 'CONGE', '2026-12-14', '2026-12-15', 'Autre', 'DEMANDE', '" + ADMIN + "', NOW()),"
    + " ('E2E-RHV-A3', '" + EMP_AUTRE + "', 'AUTRE', '2026-12-21', '2026-12-21', 'Saisie par moi', 'DEMANDE', '" + ID + "', NOW())");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* revenir sur l'onglet Congés et absences (decembre 2026), comme l'utilisateur, puis lire la grille */
  const onglet = async () => {
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.mois = new Date(2026, 11, 1); r.setActiveTab(r.down('#ongletPlanning')); });
    await p.waitForTimeout(800);
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletAbsences')); });
    await p.waitForTimeout(2500);
    return p.evaluate(() => { const g = Ext.ComponentQuery.query('rhmanager #grilleAbsences')[0], l = [];
      g.getStore().each((r, i) => { if (/^E2E-RHV/.test(r.get('id'))) { const n = g.getView().getNode(i), v = n && n.querySelector('.rh-act-valider');
        l.push(r.get('id') + (v && v.getBoundingClientRect().width > 0 ? '+V' : '')); } });
      return l.sort().join(','); });
  };
  const decision = (id) => p.evaluate((i) => fetch('../api/v1/rh/absences/' + i + '/decision?statut=VALIDE', { method: 'POST' }).then((r) => r.json()), id);
  try {
    await connexion(p, LOGIN, MDP);
    await p.waitForFunction(() => window.Ext && Ext.ComponentQuery.query('navigation').length, null, { timeout: 60000 });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rhmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(2500);
    let l = await onglet();
    ok('Sans le droit de valider : seulement ses demandes (son employé, saisies par lui), sans Valider', l === 'E2E-RHV-A1,E2E-RHV-A3', l);
    let d = await decision('E2E-RHV-A2');
    ok('Sans le droit : la route refuse la décision, rien n\'est écrit', d.success === false && q("SELECT statut FROM t_absence WHERE id = 'E2E-RHV-A2'") === 'DEMANDE', d.msg);

    q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + ROLE + "-V', '" + ROLE + "', '" + VALIDER + "', NOW())");
    l = await onglet();
    ok('Droit accordé pendant la session : toutes les demandes et Valider, sans se déconnecter', l === 'E2E-RHV-A1+V,E2E-RHV-A2+V,E2E-RHV-A3+V', l);
    const clic = await p.evaluate(() => { const g = Ext.ComponentQuery.query('rhmanager #grilleAbsences')[0]; const i = g.getStore().findExact('id', 'E2E-RHV-A2');
      const v = g.getView().getNode(i).querySelector('.rh-act-valider'); if (v) { v.click(); return true; } return false; });
    await p.waitForTimeout(2000);
    ok('Valider depuis la liste : statut VALIDE, validé par l\'utilisateur', clic && q("SELECT CONCAT(statut, '|', valide_par) FROM t_absence WHERE id = 'E2E-RHV-A2'") === 'VALIDE|' + ID);

    q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + ROLE + "-V'");
    l = await onglet();
    ok('Droit retiré pendant la session : plus de Valider, retour à ses seules demandes', l === 'E2E-RHV-A1,E2E-RHV-A3', l);
    d = await decision('E2E-RHV-A1');
    ok('Droit retiré : la route refuse la décision', d.success === false && q("SELECT statut FROM t_absence WHERE id = 'E2E-RHV-A1'") === 'DEMANDE', d.msg);
    const pdf = await p.evaluate(() => fetch('../api/v1/rh/edition/absences/pdf?du=2026-12-01&au=2026-12-31').then((r) => r.status + ' ' + r.headers.get('content-type')));
    ok('Édition PDF de l\'onglet : produite sans erreur', /^200 .*pdf/.test(pdf), pdf);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID + "') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = '" + ROLE + "')"
      + " + (SELECT COUNT(*) FROM t_employe WHERE id LIKE 'E2E-RHV%') + (SELECT COUNT(*) FROM t_absence WHERE id LIKE 'E2E-RHV%')") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
