/* PLAN « CLIENTS ASSURES ET TIERS-PAYANTS » (02/11), ETAPE 6 : compter, en lecture seule, les donnees anciennes.
 *
 * Deux controles de coherence en observation (aucun ticket, aucune correction) :
 *  - « Client assure actif sans tiers-payant actif » ;
 *  - « Tiers-payant de client actif sur un organisme absent ou inactif ».
 *
 * Parcours par les vues (compte e2e-sa) : CENTRE DE SUPPORT > Santé application, « Lancer les contrôles de
 * cohérence », « Oui ». Attendu : la fenetre de resultat porte les deux controles, avec un nombre de cas (pas
 * d'erreur), en mode « observation ». Le test affiche les deux nombres, rien d'autre. Apres la reprise
 * (V7.2.30.41), les deux nombres sont nuls.
 *
 * node client/test-comptage-clients-assures.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, repondre, attendreMessage } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const CONTROLES = ['Client assure actif sans tiers-payant actif', 'Tiers-payant de client actif sur un organisme absent ou inactif'];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());

  try {
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Santé application');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportsante button#btnCoherence').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'supportsante button#btnCoherence');
    ok('Le bouton demande de lancer les contrôles', !!(await attendreMessage(p, 'contrôles de cohérence')));
    const reponse = p.waitForResponse((r) => /support\/coherence\/run/.test(r.url()) && r.request().method() === 'POST', { timeout: 300000 });
    await repondre(p, 'yes');
    await reponse;
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[title=Résultat des contrôles de cohérence]').some((w) => w.isVisible()), null, { timeout: 60000 });

    /* lignes de la fenetre de resultat : libelle, cas detectes, mode */
    const lignes = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window[title=Résultat des contrôles de cohérence]').filter((x) => x.isVisible())[0];
      return Array.from(w.el.dom.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim()));
    });
    for (const libelle of CONTROLES) {
      const l = lignes.find((x) => x[0] === libelle);
      ok('Contrôle « ' + libelle + ' » compté en observation', !!l && /^\d+$/.test(l[1]) && l[2] === 'observation', JSON.stringify(l || null));
      if (l) { console.log('      comptage : ' + l[1]); }
      /* reprise V7.2.30.41 (accord du 03/11) : les donnees anciennes sont reprises, aucun cas ne reste */
      ok('Reprise faite : aucun cas « ' + libelle + ' »', !!l && l[1] === '0', JSON.stringify(l || null));
    }
    await p.evaluate(() => Ext.ComponentQuery.query('window[title=Résultat des contrôles de cohérence]').forEach((w) => w.close()));
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
