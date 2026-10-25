/* FIDELITE CLIENTS : UN DROIT PAR ONGLET « PARAMETRES » ET « ANALYSE » (retours du 25/10, point 2).
 *
 * Par les vues, SERVICE CLIENT > Points fidélité, avec un utilisateur d'essai (role cree pour le test, retire a la fin) :
 *  - role avec le menu seul : onglet Clients visible, onglets Parametres et Analyse absents ; leurs routes refusent ;
 *  - droit « onglet Parametres » ajoute : l'onglet Parametres apparait (lecture seule, sans « Enregistrer ») ;
 *  - droit « onglet Analyse » ajoute : l'onglet Analyse apparait et se charge ;
 *  - admin : les trois onglets, comme avant (migration : droits donnes aux roles qui avaient le menu) ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-FIDO', LOGIN = 'e2e-fid-onglets', MDP = 'E2e-Fido-7', ROLE = 'E2E-FIDO-ROLE';
const priv = (n) => q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = '" + n + "'");
let rang = 0;
const donner = (n) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + ROLE + "-" + (rang++) + "', '" + ROLE + "', '" + priv(n) + "', NOW())");

function nettoyer() {
  q("DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "'; DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_role WHERE lg_ROLE_ID = '" + ROLE + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_employe WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");
}

(async () => {
  nettoyer();
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + ROLE + "', 'E2E FIDO', 'E2E FIDO', 'CUSTOMER', 'enable', NOW())");
  ['P_M_PRE_ENREGISTREMENT', 'P_SM_FIDELITE'].forEach(donner);
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'FIDONGLETS', 'Vendeur', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const erreurs = [], dialogues = [];
  /* une session neuve a chaque fois : les droits sont lus a la connexion */
  const ouvrir = async (login, mdp) => {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, login, mdp);
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Points fidélité');
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('fideliteclients')[0]; return f && f.droits; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    return p;
  };
  const onglets = (p) => p.evaluate(() => Ext.ComponentQuery.query('fideliteclients #onglets')[0].items.items.filter((t) => t.tab.isVisible()).map((t) => t.title).join(','));
  const route = (p, u) => p.evaluate((x) => fetch('../api/v1/fidelite/' + x).then((r) => r.json()).then((o) => !!o.success), u);
  try {
    let p = await ouvrir(LOGIN, MDP);
    ok('Menu seul : onglet Clients, sans Paramètres ni Analyse', await onglets(p) === 'Clients', await onglets(p));
    ok('Menu seul : les routes Paramètres et Analyse refusent', !(await route(p, 'parametres')) && !(await route(p, 'analyse')));
    await p.context().close();

    donner('P_FIDELITE_ONGLET_PARAMETRES');
    p = await ouvrir(LOGIN, MDP);
    ok('Droit « onglet Paramètres » : l\'onglet apparaît', await onglets(p) === 'Clients,Paramètres', await onglets(p));
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('fideliteclients #onglets')[0]; t.setActiveTab(t.down('#ongletParametres')); });
    await p.waitForTimeout(1000);
    const lecture = await p.evaluate(() => { const f = Ext.ComponentQuery.query('fideliteclients')[0]; return f.down('#montantPoint').readOnly && !f.down('#enregistrerParametres').isVisible(); });
    ok('Sans le droit de paramétrer : Paramètres en lecture seule, sans « Enregistrer »', lecture && await route(p, 'parametres'));
    await p.context().close();

    donner('P_FIDELITE_ONGLET_ANALYSE');
    p = await ouvrir(LOGIN, MDP);
    ok('Droit « onglet Analyse » ajouté : les trois onglets', await onglets(p) === 'Clients,Paramètres,Analyse', await onglets(p));
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('fideliteclients #onglets')[0]; t.setActiveTab(t.down('#ongletAnalyse')); });
    await p.waitForTimeout(4000);
    const analyse = await p.evaluate(() => Ext.ComponentQuery.query('fideliteclients #anContenu')[0].getEl().dom.textContent);
    ok('L\'onglet Analyse se charge', analyse.length > 20 && !/Chargement…$/.test(analyse) && !/droit/i.test(analyse), analyse.slice(0, 80));
    await p.context().close();

    p = await ouvrir('admin', 'e2etest');
    ok('Admin : les trois onglets, comme avant', await onglets(p) === 'Clients,Paramètres,Analyse', await onglets(p));
    await p.context().close();
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID + "') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = '" + ROLE + "')") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
