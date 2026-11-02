/* § 2 et § 22 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : J5, « record is undefined » sur numBon.
 *
 * L'ecran de vente rattache un client assure par son premier tiers-payant (tierspayants[0]) sans verifier qu'il en a
 * un : un client assure sans tiers-payant faisait lever « numBon of undefined » dans addTpCmp, et la vente restait
 * sans bloc tiers-payant ni message.
 *
 * Parcours par les vues (compte e2e) : SERVICE CLIENT > Ventes, « Nouvelle vente », type « Assurance », nom du client
 * tape puis Entree. La recherche est SIMULEE et renvoie un client assure sans tiers-payant ; rien n'est ecrit en base.
 *
 * node support/anomalies-centre/test-j5-client-sans-tiers-payant.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const CLIENT = { lgCLIENTID: 'E2E-J5-CLIENT', strFIRSTNAME: 'ESSAI', strLASTNAME: 'J5 SANS TP', fullName: 'ESSAI J5 SANS TP',
  strNUMEROSECURITESOCIAL: 'E2EJ5', strADRESSE: '', strCODEINTERNE: '', remiseId: null, tiersPayants: [], ayantDroits: [] };

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  /* premiere recherche : client sans tiers-payant ; seconde : le meme avec un tiers-payant (non-regression) */
  const AVEC_TP = Object.assign({}, CLIENT, { lgCLIENTID: 'E2E-J5-CLIENT-TP', strLASTNAME: 'J5 AVEC TP',
    tiersPayants: [{ lgCOMPTECLIENTTIERSPAYANTID: 'E2E-J5-CPT', lgTIERSPAYANTID: 'E2E-J5-TP', tpFullName: 'TP ESSAI J5', taux: 80, order: 1, dblPLAFOND: 0, numBon: '' }] });
  let recherches = 0;
  await p.route('**/api/v1/client/all*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, total: 1, data: [recherches++ === 0 ? CLIENT : AVEC_TP] }) }));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.locator('text=/^\s*Assurance\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    erreurs.length = 0;
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type('ESSAI J5', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const etat = await p.evaluate(() => {
      const visibles = Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible());
      const texte = document.body.innerText;
      return { messages: visibles.map((m) => (m.msg && m.msg.getEl() ? m.msg.getEl().dom.innerText : '')),
        signale: /aucun tiers-payant/i.test(texte) };
    });
    ok('J5 client assuré sans tiers-payant : aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
    ok('J5 la caissière est prévenue que le client n\'a aucun tiers-payant', etat.signale, JSON.stringify(etat));
    await p.evaluate(() => Ext.ComponentQuery.query('messagebox').forEach((m) => m.isVisible() && m.close()));
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type('ESSAI J5', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const bloc = await p.evaluate(() => {
      const c = testextjs.app.getController('VenteCtr');
      const f = c.getTpContainerForm();
      return { client: c.getClient() && c.getClient().get('lgCLIENTID'), bon: f.query('[name=refBon1]').length };
    });
    ok('Non-régression : un client avec tiers-payant est pris, son bloc tiers-payant s\'affiche',
      bloc.client === 'E2E-J5-CLIENT-TP' && bloc.bon > 0 && erreurs.length === 0, JSON.stringify({ bloc, erreurs }));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
