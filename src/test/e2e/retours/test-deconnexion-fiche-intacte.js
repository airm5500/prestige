/* DECONNEXION : SEUL L'INDICATEUR DE CONNEXION CHANGE (journal de capitale, 15/11 -> 19/11 : « Deadlock found » sur
 * user/logout, x4).
 *
 * La deconnexion recopiait en base toute la fiche de l'utilisateur gardee en session depuis la connexion (merge) :
 * verrou sur la ligne entiere de t_user, et une modification faite entre-temps (par un administrateur, sur un autre
 * poste) etait annulee.
 * Parcours reel : connexion (admin d'essai), courriel de sa fiche modifie en base pendant la session (comme par un
 * administrateur), deconnexion par le bouton rond de l'en-tete et « Se déconnecter » :
 *  - la deconnexion aboutit (retour a la page de connexion), une seule requete user/logout, aucune erreur ;
 *  - bilan : courriel modifie conserve (avant : remis a sa valeur de la connexion), indicateur de connexion a 0, les
 *    autres colonnes de la fiche identiques a l'instant d'avant la deconnexion, session close « DECONNEXION ».
 * Courriel d'origine remis a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN;
const MAIL0 = q(`SELECT IFNULL(str_MAIL, '(null)') FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const NOUVEAU = 'e2e' + String(Date.now()).slice(-6) + '@x.ci';
/* empreinte de la fiche hors courriel, indicateur de connexion et dates de mise a jour */
const empreinte = () => q(`SELECT MD5(CONCAT_WS('|', str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_STATUT, IFNULL(int_CONNEXION, ''), IFNULL(b_CHANGE_PASSWORD, ''), lg_EMPLACEMENT_ID)) FROM t_user WHERE str_LOGIN = '${LOGIN}'`);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [], logouts = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  p.on('request', (r) => { if (/user\/logout/.test(r.url())) { logouts.push(r.url()); } });
  try {
    await connexion(p, LOGIN, 'e2etest');
    const sesHttp = await p.evaluate(async () => { const r = await fetch('../api/v1/rh/session-courante').catch(() => null); return r && r.ok ? (await r.json()).session : null; }).catch(() => null);
    ok('Connecté : indicateur de connexion à 1', q(`SELECT b_is_connected FROM t_user WHERE str_LOGIN = '${LOGIN}'`) === '1');
    q(`UPDATE t_user SET str_MAIL = '${NOUVEAU}' WHERE str_LOGIN = '${LOGIN}'`);
    const avant = empreinte();
    await p.click('.hdr-logout');
    const oui = p.locator('.x-message-box').filter({ visible: true }).getByText('Se déconnecter', { exact: false }).last();
    await oui.waitFor({ timeout: 10000 });
    await Promise.all([p.waitForURL(/index\.(jsp|html)/, { timeout: 30000 }), oui.click()]);
    await p.waitForTimeout(1000);
    ok('Déconnexion aboutie : page de connexion, une seule requête user/logout', /index\.(jsp|html)/.test(p.url()) && logouts.length === 1, p.url() + ' ' + logouts.length);
    ok('Bilan : courriel modifié pendant la session conservé', q(`SELECT str_MAIL FROM t_user WHERE str_LOGIN = '${LOGIN}'`) === NOUVEAU,
      q(`SELECT IFNULL(str_MAIL, '(null)') FROM t_user WHERE str_LOGIN = '${LOGIN}'`));
    ok('Bilan : indicateur de connexion à 0', q(`SELECT b_is_connected FROM t_user WHERE str_LOGIN = '${LOGIN}'`) === '0');
    ok('Bilan : le reste de la fiche identique', empreinte() === avant);
    ok('Bilan : session close par « DECONNEXION »', q(`SELECT s.fin_par FROM t_session_utilisateur s JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID WHERE u.str_LOGIN = '${LOGIN}' ORDER BY s.debut DESC LIMIT 1`) === 'DECONNEXION',
      sesHttp);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    q(`UPDATE t_user SET str_MAIL = ${MAIL0 === '(null)' ? 'NULL' : "'" + MAIL0 + "'"} WHERE str_LOGIN = '${LOGIN}'`);
    ok('Courriel d\'origine remis', q(`SELECT IFNULL(str_MAIL, '(null)') FROM t_user WHERE str_LOGIN = '${LOGIN}'`) === MAIL0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
