/* « valheight is not defined » A L'OUVERTURE DU MENU PRINCIPAL ET DE LA RESERVE (journal de leana, 18/11 09:13).
 *
 * valheight / valwidth (hauteur et largeur des ecrans) n'etaient definis que par Navigation.js ; un ecran charge
 * avant lui (MainMenuManager.js, ReserveManager.js et 34 autres) levait une ReferenceError a la definition de sa
 * classe.
 * Parcours : page de l'application ouverte apres connexion, sans la table des scripts groupes, Navigation.js retarde de 8 s (poste lent, comme a
 * l'ouverture de DESKTOP-ODORH7G), puis chargement de MainMenuManager et ReserveManager pendant ce delai :
 *  - valheight et valwidth definis avant Navigation.js, et egaux au calcul de Navigation.js pour l'ecran du poste ;
 *  - xtypeload (ecran d'accueil, lu par ContentPanel.js a sa definition) defini, egal a celui de la connexion ;
 *  - les deux classes se chargent sans erreur, a la hauteur valheight ;
 *  - apres l'arrivee de Navigation.js, valeurs inchangees ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    erreurs.length = 0;
    /* rechargement avec Navigation.js retarde */
    let retarde = false;
    /* sans la table des scripts groupes (paquet non recu, ou version sans paquet comme a leana) : chaque ecran part
       par le reseau, dans l'ordre d'arrivee */
    await ctx.route(/\/api\/v1\/ecrans\/scripts\.js/, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* table absente */' }));
    await ctx.route(/\/app\/view\/Navigation\.js/, async (route) => { retarde = true; await new Promise((r) => setTimeout(r, 8000)); await route.continue(); });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && Ext.Loader && document.readyState !== 'loading', null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const pendant = await p.evaluate(async () => {
      const r = { navigation: !!Ext.ClassManager.get('testextjs.view.Navigation'), h: typeof window.valheight, w: typeof window.valwidth,
        vh: window.valheight, vw: window.valwidth, x: typeof window.xtypeload, xv: window.xtypeload, xs: localStorage.getItem('xtypeuser'), sh: screen.height, sw: screen.width, classes: [] };
      for (const c of ['testextjs.view.ContentPanel', 'testextjs.view.stockmanagement.reserve.ReserveManager']) {
        r.classes.push(await new Promise((ok2) => {
          try { Ext.require(c, () => { const k = Ext.ClassManager.get(c); ok2({ c, charge: !!k, hauteur: k && k.prototype.height }); }); } catch (e) { ok2({ c, erreur: String(e) }); }
          setTimeout(() => ok2({ c, delai: true }), 7000);
        }));
      }
      return r;
    });
    const attenduH = pendant.sh >= 900 ? 595 : (pendant.sh >= 768 ? 580 : pendant.sh);
    const attenduW = pendant.sw >= 1600 ? 1300 : (pendant.sw >= 1366 ? 1050 : pendant.sw);
    ok('Navigation.js retardé (pas encore chargé)', retarde && !pendant.navigation, JSON.stringify(pendant).slice(0, 200));
    ok('valheight et valwidth définis avant Navigation.js, égaux au calcul de Navigation.js', pendant.h === 'number' && pendant.vh === attenduH && pendant.w === 'number' && pendant.vw === attenduW,
      `${pendant.vh}/${attenduH} ${pendant.vw}/${attenduW}`);
    ok('xtypeload (écran d’accueil) défini avant Navigation.js, égal à celui de la connexion', pendant.x !== 'undefined' && pendant.xv === pendant.xs, pendant.xv + ' / ' + pendant.xs);
    ok('ContentPanel (lit xtypeload) et ReserveManager (lit valheight) chargés sans erreur', pendant.classes.every((x) => x.charge && (x.c.endsWith('ContentPanel') || x.hauteur === attenduH)), JSON.stringify(pendant.classes));
    await p.waitForFunction(() => !!Ext.ClassManager.get('testextjs.view.Navigation'), null, { timeout: 60000 });
    const apres = await p.evaluate(() => [window.valheight, window.valwidth]);
    ok('Après Navigation.js : valeurs inchangées', apres[0] === attenduH && apres[1] === attenduW, JSON.stringify(apres));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
