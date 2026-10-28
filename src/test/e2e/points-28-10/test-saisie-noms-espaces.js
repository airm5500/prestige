/* POINT 20 DU 28/10. Fenetre « client » de la vente (ClientLambda), compte e2e. Lecture seule (rien n'est enregistre).
 *  - un espace en debut de nom n'est pas pris ; un second espace consecutif non plus ;
 *  - un collage avec espaces multiples est nettoye ; les espaces de fin sont retires en quittant le champ ;
 *  - les autres champs (adresse) ne sont pas touches ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer: cliquerVue } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  const champ = (nom) => p.evaluate((n) => { const f = Ext.ComponentQuery.query('clientLambda [name=' + n + ']')[0]; return f ? f.getValue() : null; }, nom);
  const cliquer = async (nom) => { await p.click('.x-window input[name=' + nom + ']'); };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* l'ecran de vente charge la fenetre client ; on l'ouvre comme le bouton « client » */
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquerVue(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    /* « ASSOCIER UN CLIENT », puis « nouveau client » : le formulaire de la fenetre client */
    await p.evaluate(() => { testextjs.app.getController('VenteCtr').openClientLambdaSearchWindow(); return true; });
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientLambda #btnAddNewLambda').some((b) => b.isVisible(true)), null, { timeout: 30000 });
    await p.evaluate(() => { Ext.ComponentQuery.query('clientLambda #btnAddNewLambda')[0].btnEl.dom.click(); return true; });
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientLambda [name=strLASTNAME]').some((f) => f.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await cliquer('strLASTNAME');
    await p.keyboard.type('  KONAN    AYA  ', { delay: 20 });
    ok('Saisie au clavier : pas d\'espace en tête ni d\'espaces consécutifs', await champ('strLASTNAME') === 'KONAN AYA ', JSON.stringify(await champ('strLASTNAME')));
    await cliquer('strFIRSTNAME');
    ok('En quittant le champ : espace de fin retiré', await champ('strLASTNAME') === 'KONAN AYA', JSON.stringify(await champ('strLASTNAME')));
    await p.evaluate(() => navigator.clipboard ? null : null);
    await p.evaluate(() => { const i = document.querySelector('.x-window input[name=strFIRSTNAME]'); i.focus(); i.value = ' Marie   Claire  '; i.dispatchEvent(new Event('input', { bubbles: true })); });
    ok('Collage nettoyé (espaces multiples et espace de tête)', await champ('strFIRSTNAME') === 'Marie Claire ', JSON.stringify(await champ('strFIRSTNAME')));
    const adresse = await p.evaluate(() => { const i = document.querySelector('.x-window input[name=strADRESSE]'); if (!i) { return null; } i.focus(); i.value = '07  08  09'; i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; });
    ok('Champ adresse / téléphone non touché', adresse === null || adresse === '07  08  09', adresse);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
