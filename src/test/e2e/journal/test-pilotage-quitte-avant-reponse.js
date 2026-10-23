/* PILOTAGE QUITTE AVANT LA REPONSE DU SERVEUR (parcours test-saisie-ecrans du 23/10).
 *
 * « TypeError : Cannot read properties of undefined (reading 'down') » dans PilotageCtr.afficherAxe : l'utilisateur
 * ouvre le Pilotage puis passe a un autre ecran avant que les chiffres n'arrivent ; la reponse, arrivee ensuite,
 * etait appliquee a un ecran ferme.
 * Parcours par les vues (admin) : ANALYSE DE GESTION > Pilotage de l'officine, puis tout de suite GESTION DES
 * COMMANDES > Pointer BL et avoirs ; on attend que la reponse du pilotage soit arrivee :
 *  - aucune erreur JavaScript ;
 *  - l'ecran Pointer BL est toujours affiche, sans message d'erreur.
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const { connexion, ouvrirMenu, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    /* la reponse du pilotage est retenue 3 s : l'utilisateur a le temps de changer d'ecran, comme sur une grosse base */
    await p.route('**/api/v1/pilotage/onglet/**', async (route) => { const r = await route.fetch(); await new Promise((x) => setTimeout(x, 3000)); await route.fulfill({ response: r }); });
    const reponse = p.waitForResponse((r) => /pilotage\/onglet\//.test(r.url()), { timeout: 120000 });
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Pilotage de l\'officine');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Pointer BL et avoirs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pointagebl').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await reponse;
    await p.waitForTimeout(1500);
    ok('Pilotage quitté avant sa réponse : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    const message = await texteMessage(p);
    const affiche = await p.evaluate(() => Ext.ComponentQuery.query('pointagebl').some((x) => x.isVisible(true)));
    ok('L\'écran Pointer BL reste affiché, sans message d\'erreur', affiche && !/erreur|pas pu/i.test(message || ''), message);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
