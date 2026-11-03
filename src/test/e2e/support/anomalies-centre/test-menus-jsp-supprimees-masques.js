/* Journal du support du 03/11 (choix de l'utilisateur : « les masquer ») : cinq ecrans du menu appelaient des JSP
 * supprimees (404) et restaient vides :
 *  - Transaction Commande (warehouseorder), Gerer Type Societe (typesocietemanager), Menu (menumanager),
 *    Proposition Commande (familleorder), Gestion des devises (devisemanager).
 * Ils sont masques a l'affichage du menu (MENUS_MASQUES de correctifs-affichage.js), sans toucher a la base.
 *
 * Par les vues (compte e2e) : arbre du menu charge apres connexion.
 * Attendu : aucune des cinq entrees ; les modules qui les portaient gardent leurs autres entrees ; aucun appel a une
 * de ces JSP ; aucune erreur JavaScript. Lecture seule.
 *
 * node support/anomalies-centre/test-menus-jsp-supprimees-masques.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const MASQUES = ['warehouseorder', 'typesocietemanager', 'menumanager', 'familleorder', 'devisemanager'];
const JSP = /webservices\/(sm_user\/warehouseorder|configmanagement\/typesociete|sm_user\/menu|sm_user\/familleorder|configmanagement\/devise)\/ws_data\.jsp/;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const appelsJsp = []; p.on('request', (r) => { if (JSP.test(r.url())) { appelsJsp.push(r.url()); } });
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0; }, null, { timeout: 60000 });
    const arbre = await p.evaluate(() => { const feuilles = [], parQuiPorte = {};
      Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
        if (n.isLeaf()) { feuilles.push(n.get('id')); const t = n.parentNode.get('text'); parQuiPorte[t] = (parQuiPorte[t] || 0) + 1; }
      });
      return { feuilles, parQuiPorte, liste: window.PrestigeAffichage.MENUS_MASQUES };
    });
    const restes = MASQUES.filter((x) => arbre.feuilles.includes(x));
    ok('Arbre du menu : aucune des cinq entrées aux JSP supprimées', restes.length === 0, restes.join(', '));
    ok('Les cinq sont déclarées dans MENUS_MASQUES', MASQUES.every((x) => arbre.liste.includes(x)), JSON.stringify(arbre.liste));
    ok('Le menu garde ses autres entrées', arbre.feuilles.length >= 50 && Object.keys(arbre.parQuiPorte).length >= 5,
      arbre.feuilles.length + ' entrées, ' + Object.keys(arbre.parQuiPorte).length + ' modules');
    await p.waitForTimeout(2000);
    ok('Aucun appel aux JSP supprimées', appelsJsp.length === 0, appelsJsp.join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
