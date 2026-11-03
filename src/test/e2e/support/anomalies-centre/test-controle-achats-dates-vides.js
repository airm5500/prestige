/* Journal du support du 03/11 : GET etat-control-bon/list repondait 500 (« NullPointerException : text ») quand une
 * date manquait, et l'ecran restait vide avec « Une erreur interne est survenue ».
 *
 * Parcours par le menu (compte e2e) : GESTION DES COMMANDES > Etat de contrôle Achats ; on vide « Date debut » et
 * « Date fin », puis « Rechercher ».
 * Attendu : la liste repond (pas d'erreur 500, pas de message d'erreur) et prend la date du jour, comme a
 * l'ouverture ; aucune erreur JavaScript. Lecture seule.
 *
 * node support/anomalies-centre/test-controle-achats-dates-vides.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const vider = async (id) => {
    await cliquer(p, '#' + id);
    await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.press('Tab');
  };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const ouverture = p.waitForResponse((r) => /etat-control-bon\/list/.test(r.url()), { timeout: 60000 });
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    const r0 = await ouverture;
    ok('Ouverture : la liste répond', r0.status() === 200, r0.status());
    await p.waitForTimeout(1500);

    await vider('datedebut');
    await vider('datefin');
    const valeurs = await p.evaluate(() => [Ext.getCmp('datedebut').getRawValue(), Ext.getCmp('datefin').getRawValue()]);
    ok('Les deux dates sont vides à l\'écran', valeurs[0] === '' && valeurs[1] === '', JSON.stringify(valeurs));

    const recherche = p.waitForResponse((r) => /etat-control-bon\/list/.test(r.url()), { timeout: 60000 });
    await p.locator('text=/^\\s*Rechercher\\s*$/').filter({ visible: true }).first().click();
    const r1 = await recherche;
    const corps = await r1.json().catch(() => ({}));
    await p.waitForTimeout(1500);
    const message = await texteMessage(p);
    ok('Dates vides puis « Rechercher » : la liste répond sans erreur', r1.status() === 200 && corps.success !== false && !/erreur/i.test(message),
      JSON.stringify({ http: r1.status(), msg: corps.msg, message: message.slice(0, 160) }));
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
