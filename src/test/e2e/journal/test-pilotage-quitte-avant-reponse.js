/* PILOTAGE QUITTE AVANT LA REPONSE DU SERVEUR (parcours test-saisie-ecrans du 23/10).
 *
 * « TypeError : Cannot read properties of undefined (reading 'down') » dans PilotageCtr.afficherAxe : l'utilisateur
 * ouvre le Pilotage puis passe a un autre ecran avant que les chiffres n'arrivent ; la reponse, arrivee ensuite,
 * etait appliquee a un ecran ferme.
 * Parcours par les vues (admin) : ANALYSE DE GESTION > Pilotage de l'officine, puis tout de suite l'icone « Accueil »
 * de l'en-tete (tableau de bord) ; on attend que la reponse du pilotage soit arrivee :
 *  - aucune erreur JavaScript ;
 *  - le tableau de bord est toujours affiche, sans message d'erreur.
 * (Quitter par le menu ne declenchait pas l'erreur : l'ecran garde alors sa reference.)
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* la reponse du pilotage est retenue 10 s : l'utilisateur a le temps de changer d'ecran, comme sur une grosse base */
    let rendue = null;
    const reponse = new Promise((fin) => { rendue = fin; });
    await p.route('**/api/v1/pilotage/onglet/**', async (route) => {
      try {
        const r = await route.fetch(); await new Promise((x) => setTimeout(x, 10000));
        await route.fulfill({ response: r });
      } catch (e) { console.log('reponse non rendue : ' + e.message.split('\n')[0]); }
      rendue();
    });
    const demande = p.waitForRequest((r) => /pilotage\/onglet\//.test(r.url()), { timeout: 60000 });
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Pilotage de l\'officine');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await demande;
    /* chiffres en cours de chargement : on quitte par l'icone « Accueil » de l'en-tete (tableau de bord pour l'administrateur) */
    await p.click('.hdr-metro');
    await p.waitForFunction(() => Ext.ComponentQuery.query('dashboard').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    const avantReponse = await p.evaluate(() => ({ pilotage: Ext.ComponentQuery.query('pilotage').filter((x) => !x.isDestroyed).length }));
    ok('Précondition : le Pilotage est fermé avant que sa réponse n\'arrive', avantReponse.pilotage === 0, JSON.stringify(avantReponse));
    const arrivee = await Promise.race([reponse.then(() => true), new Promise((x) => setTimeout(() => x(false), 60000))]);
    ok('La réponse du pilotage arrive après le changement d\'écran', arrivee);
    await p.waitForTimeout(1500);
    ok('Pilotage quitté avant sa réponse : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    const message = await texteMessage(p);
    const affiche = await p.evaluate(() => Ext.ComponentQuery.query('dashboard').some((x) => x.isVisible(true)));
    ok('Le tableau de bord reste affiché, sans message d\'erreur', affiche && !/erreur|pas pu/i.test(message || ''), message);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
