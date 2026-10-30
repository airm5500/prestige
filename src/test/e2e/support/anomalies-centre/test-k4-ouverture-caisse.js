/* K4 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 (§ 19) : montant illisible a l'ouverture de caisse.
 *
 * Officine, 29/10 : « JsonbException ... java.lang.Integer » sur POST caisse/ouvrir-caisse. Le champ « Montant » acceptait
 * les decimales et le vide, alors que le serveur attend un entier. Sur la version actuelle le serveur refuse proprement
 * (400 « Valeur saisie invalide pour « amount » »), mais l'ecran affichait « Le serveur n'a pas repondu (erreur 400) ».
 *
 * Parcours par le menu (compte e2e). La lecture de l'etat de la caisse (billetage/ouventure-data) est interceptee pour
 * presenter une caisse attribuee et non ouverte : le bouton « Ouvrir caisse » s'affiche quel que soit l'etat reel du
 * compte. Aucune caisse n'est ouverte :
 *  - montant decimal puis vide : avant, la demande part au serveur (le vide est coupe par l'essai, par prudence) ;
 *    apres, rien ne part et le champ dit pourquoi ;
 *  - refus du serveur (400 en JSON, intercepte) : le message du serveur est affiche, et non « n'a pas repondu ».
 * Les envois au centre de support sont interceptes.
 *
 * node support/anomalies-centre/test-k4-ouverture-caisse.js   (BASE=http://localhost:9080/prestige ; MENU="SERVICE CLIENT")
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const fenetres = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => (m.msg && m.msg.getEl() ? m.msg.getEl().dom.innerText : '?')));
const fermerFenetres = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  /* caisse attribuee, pas encore ouverte : etat lu par l'ecran, rien n'est ecrit */
  await p.route('**/api/v1/billetage/ouventure-data*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'E2E-K4', firstName: 'E2E', lastName: 'K4', amount: 0, inUse: false } }) }));
  /* ouverture : par prudence, seul un montant decimal (refuse a la lecture par le serveur) va jusqu'au serveur */
  const envois = [];
  let reponseServeur = null;
  await p.route('**/api/v1/caisse/ouvrir-caisse*', async (r) => {
    const corps = r.request().postData() || '';
    envois.push(corps);
    let montant = null; try { montant = JSON.parse(corps).amount; } catch (e) { /* illisible */ }
    if (reponseServeur) { return r.fulfill(reponseServeur); }
    if (/^\d+[.,]\d+$/.test(String(montant))) { return r.continue(); }
    return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'E2E : envoi coupe' }) });
  });
  const montant = '#coffreCaisseAmount input';
  const essayer = async (valeur) => {
    envois.length = 0; await fermerFenetres(p);
    await p.locator(montant).fill(valeur);
    await cliquer(p, '#btnValidate');
    await p.waitForTimeout(2500);
    const champ = await p.evaluate(() => { const c = Ext.getCmp('coffreCaisseAmount'); return { valide: c.isValid(), erreurs: c.getErrors(), saisi: c.getRawValue() }; });
    return { envois: envois.slice(), msgs: await fenetres(p), champ };
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, process.env.MENU || 'SERVICE CLIENT', 'Ouverture de Caisse');
    await p.waitForFunction(() => { const v = Ext.getCmp('btnValidate'); return v && v.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);

    for (const valeur of ['1500.5', '']) {
      const r = await essayer(valeur);
      ok('montant « ' + valeur + ' » : rien n\'est envoyé, le champ dit pourquoi', r.envois.length === 0 && !r.champ.valide && r.champ.erreurs.length === 1 && r.champ.saisi.replace(',', '.') === valeur, JSON.stringify(r));
    }

    /* refus du serveur : son message est lu */
    reponseServeur = { status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'Valeur saisie invalide pour « amount » : un nombre entier est attendu.' }) };
    const r = await essayer('1500');
    ok('refus du serveur (400) : son message est affiché', r.envois.length === 1 && r.msgs.some((m) => /nombre entier est attendu/.test(m)) && !r.msgs.some((m) => /n'a pas répondu/.test(m)), JSON.stringify(r));
    await fermerFenetres(p);
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
