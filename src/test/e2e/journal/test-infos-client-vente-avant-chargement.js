/* MODIFICATION DES INFOS CLIENT D'UNE VENTE TIERS PAYANT AVANT LA FIN DU CHARGEMENT (journal du 15/10).
 *
 * « TypeError: can't access property "strFIRSTNAME", client is null » (UpdateVenteClientTpForm.js, changeClientInfos) :
 * la fenetre s'ouvre tout de suite, la vente arrive ensuite ; un clic sur « Modifier infos client » pendant ce temps
 * lisait un client encore vide. Ce que le test etablit (vente VO cloturee du banc, lecture seule, chargement ralenti) :
 *  - pendant le chargement : « Modifier infos client » et « Modifier infos ayant droit » inactifs ; un clic ne fait
 *    rien, sans erreur ;
 *  - une fois la vente chargee : les deux boutons actifs ; « Modifier infos client » ouvre la saisie avec le nom du
 *    client de la vente.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const VENTE = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
  + " WHERE p.str_TYPE_VENTE = 'VO' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 ORDER BY p.dt_UPDATED DESC LIMIT 1");

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    ok('Jeu d\'essai : une vente VO avec client', !!VENTE, VENTE);
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* chargement de la vente ralenti de 4 s, comme un reseau charge */
    await p.route('**/vente/find/infosclienttpforupdating**', async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
    await p.evaluate(() => Ext.Loader.require('testextjs.view.vente.user.UpdateVenteClientTpForm'));
    await p.waitForFunction(() => !!Ext.ClassManager.get('testextjs.view.vente.user.UpdateVenteClientTpForm'), null, { timeout: 30000 });
    await p.evaluate((id) => { window.__fen = Ext.create('testextjs.view.vente.user.UpdateVenteClientTpForm', { venteId: id }); window.__fen.show(); }, VENTE);
    await p.waitForTimeout(500);
    const pendant = await p.evaluate(() => { const w = window.__fen, c = w.down('#btnModifierClient'), a = w.down('#btnModifierAyantDroit');
      const avant = Ext.ComponentQuery.query('window').filter((x) => x.isVisible()).length;
      return { client: c.isDisabled(), ayant: a.isDisabled(), avant, id: c.el.id }; });
    await p.click('#' + pendant.id, { force: true }).catch(() => {});
    await p.waitForTimeout(300);
    const apresClic = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible()).length);
    ok('Pendant le chargement : les deux boutons inactifs, un clic n\'ouvre rien', pendant.client && pendant.ayant && apresClic === pendant.avant && erreurs.length === 0,
      JSON.stringify(pendant) + ' fenêtres après clic : ' + apresClic + ' ' + erreurs.join(' | '));
    await p.waitForFunction(() => !window.__fen.down('#btnModifierClient').isDisabled(), null, { timeout: 15000 }).catch(() => {});
    const charge = await p.evaluate(() => ({ client: !window.__fen.down('#btnModifierClient').isDisabled(), ayant: !window.__fen.down('#btnModifierAyantDroit').isDisabled(),
      nom: window.__fen.getClient() && window.__fen.getClient().strFIRSTNAME, id: window.__fen.down('#btnModifierClient').el.id }));
    ok('Vente chargée : les deux boutons actifs', charge.client && charge.ayant, JSON.stringify(charge));
    await p.click('#' + charge.id);
    await p.waitForTimeout(800);
    const saisie = await p.evaluate(() => { const f = Ext.ComponentQuery.query('textfield[name=strFIRSTNAME]').filter((x) => x.isVisible())[0]; return f ? f.getValue() : null; });
    ok('« Modifier infos client » ouvre la saisie avec le nom du client de la vente', saisie !== null && saisie === charge.nom, saisie + ' / ' + charge.nom);
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
