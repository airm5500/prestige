/* PLAN DU 08/11, POINT 15.6 : ONGLET « ANOMALIES » SOUS UN DROIT DEDIE (P_ACTIVITE_ANOMALIES).
 *
 * Par les vues (admin, 1366 x 768), ANALYSE DE GESTION > Activité des équipes :
 *  - migration : le droit existe, donne aux seuls profils Pharmacien, Administrateur, Super Administrateur, SYSTEM_USER ;
 *  - avec le droit : onglet visible, clic -> panneau Anomalies, route anomalies 200 ; droits = API = base ;
 *  - sans le droit (ligne du role retiree le temps du test, puis remise a l'identique) : onglet cache, routes
 *    anomalies 403 « Droit manquant », les autres onglets marchent toujours (Données, Analyses) ;
 *  - bilan : t_role_privelege identique avant / apres ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const UID = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID WHERE ru.lg_USER_ID = '" + UID + "' AND r.str_STATUT = 'enable' LIMIT 1");
const empreinte = () => q("SELECT IFNULL(MD5(GROUP_CONCAT(CONCAT(lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID) ORDER BY lg_ROLE_PRIVILEGE)), '') FROM t_role_privelege");
const LIGNE = q("SELECT IFNULL((SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_PRIVILEGE_ID, '|', IFNULL(rp.dt_CREATED, ''), '|', IFNULL(rp.dt_UPDATED, '')) FROM t_role_privelege rp JOIN t_privilege p"
  + " ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_ACTIVITE_ANOMALIES' AND rp.lg_ROLE_ID = '" + ROLE + "'), '')");
const AVANT = empreinte();
const remettre = () => { if (LIGNE && q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + LIGNE.split('|')[0] + "'") === '0') {
  const [id, priv, c, u] = LIGNE.split('|');
  q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + id + "', '" + ROLE + "', '" + priv + "', " + (c ? "'" + c + "'" : 'NULL') + ', ' + (u ? "'" + u + "'" : 'NULL') + ')'); } };

async function ouvrir(b, err) {
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  p.on('pageerror', (e) => err.push(String(e.message)));
  await connexion(p, ENV_E2E.LOGIN, 'e2etest');
  await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
  await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0]; return a && a.down('#ae-analyses') && a.down('#ae-analyses').isVisible(true); }, null, { timeout: 60000 });
  await p.waitForResponse((r) => /activite-equipes\/droits/.test(r.url()), { timeout: 30000 }).catch(() => null);
  await p.waitForTimeout(800);
  return p;
}
const etat = (p) => p.evaluate(async () => { const a = Ext.ComponentQuery.query('activiteequipes')[0], bt = a.down('#ae-anomalies');
  const st = async (u) => (await fetch(u)).status;
  let droits = null; try { droits = await (await fetch('../api/v1/activite-equipes/droits')).json(); } catch (e) { droits = null; }
  return { visible: !!bt && bt.isVisible(true), droits, liste: await st('../api/v1/activite-equipes/anomalies'), detail: await st('../api/v1/activite-equipes/anomalies/1'),
    msg: await (await fetch('../api/v1/activite-equipes/anomalies')).text() }; });

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const roles = q("SELECT IFNULL(GROUP_CONCAT(r.str_NAME ORDER BY r.str_NAME SEPARATOR '|'), '') FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " JOIN t_role r ON r.lg_ROLE_ID = rp.lg_ROLE_ID WHERE p.str_NAME = 'P_ACTIVITE_ANOMALIES'").split('|').filter(Boolean);
    const attendus = q("SELECT IFNULL(GROUP_CONCAT(str_NAME ORDER BY str_NAME SEPARATOR '|'), '') FROM t_role WHERE str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')").split('|').filter(Boolean);
    ok('Migration : P_ACTIVITE_ANOMALIES donné aux seuls profils pharmacien et administrateur', roles.length > 0 && JSON.stringify(roles) === JSON.stringify(attendus), JSON.stringify({ roles, attendus }));
    ok('Le rôle du compte de test a le droit (base)', !!LIGNE, ROLE);

    /* avec le droit */
    let p = await ouvrir(b, err);
    let e = await etat(p);
    ok('Avec le droit : onglet « Anomalies » visible ; droits = API = base ; routes anomalies 200', e.visible && e.droits && e.droits.anomalies === true && e.liste === 200, JSON.stringify({ visible: e.visible, droits: e.droits, liste: e.liste }));
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #ae-anomalies')[0].getEl().dom.id));
    await p.waitForTimeout(1500);
    const actif = await p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0]; return a.getLayout().getActiveItem().itemId; });
    ok('Clic sur l\'onglet : panneau Anomalies affiché', actif === 'aeAnomalies', actif);
    await p.context().close();

    /* sans le droit */
    q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + LIGNE.split('|')[0] + "'");
    p = await ouvrir(b, err);
    e = await etat(p);
    ok('Sans le droit : onglet caché ; droits.anomalies = false = base', !e.visible && e.droits && e.droits.anomalies === false, JSON.stringify({ visible: e.visible, droits: e.droits }));
    ok('Sans le droit : routes anomalies refusées (403 « Droit manquant »)', e.liste === 403 && e.detail === 403 && /Droit manquant/.test(e.msg), JSON.stringify({ liste: e.liste, detail: e.detail, msg: e.msg.slice(0, 80) }));
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #ae-analyses')[0].getEl().dom.id));
    await p.waitForTimeout(1500);
    const autres = await p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0]; return { actif: a.getLayout().getActiveItem().itemId, donnees: a.down('#ae-donnees').isVisible(true) }; });
    ok('Sans le droit : les autres onglets marchent (Analyses, Données & recherches)', autres.actif === 'aeAnalyses' && autres.donnees, JSON.stringify(autres));
    await p.context().close();
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Bilan : t_role_privelege identique avant / après', empreinte() === AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
