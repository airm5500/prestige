/* § 21 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : J27, fenetre « client » de la vente en depot.
 *
 * VenteEnDepotCtr, copie de VenteCtr, appelait des accesseurs qui n'existent pas (getClientLambda au lieu de
 * getClientLambdadepot, getAssuranceClient, getMedecin) : « Annuler » de la fenetre client ne la fermait pas, et le
 * choix d'un client ne rattachait pas la vente.
 *
 * Parcours par les vues (compte e2e) : GESTION DES TIERS-PAYANTS > « Gestion depots extensions », premier depot de la
 * liste (simule), code produit saisi puis Entree, « ASSOCIER UN CLIENT », puis « Annuler ». La vente est SIMULEE (creation,
 * detail, etat de caisse et net interceptes, ajout et cloture coupes) : aucune donnee n'est ecrite.
 *
 * node support/anomalies-centre/test-j27-depot-client.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const visible = (p, r, t) => p.waitForFunction((q) => Ext.ComponentQuery.query(q).some((x) => x.isVisible(true)), r, { timeout: t || 60000 });
const json = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
const VENTE = 'E2E-J27-VENTE';
const PRODUIT = { lgFAMILLEID: 'E2E-J27-PRODUIT', lgFAMILLEPARENTID: 'E2E-J27-PRODUIT', intCIP: 'E2EJ27A1', strNAME: 'PRODUIT ESSAI J27',
  strDESCRIPTION: 'PRODUIT ESSAI J27', intPRICE: 1500, intNUMBERAVAILABLE: 50, intNUMBER: 50, boolDECONDITIONNE: 0, strLIBELLEE: '' };
const ECRAN = 'depotextension doventeendepot';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  /* depot simule aussi : la copie de banc n'a pas forcement de depot d'extension */
  await p.route('**/api/v1/depot-extension/depots*', (r) => json(r, { success: true, total: 1, data: [{ id: 'E2E-J27-DEPOT', nom: 'DEPOT ESSAI J27', localite: '' }] }));
  await p.route('**/api/v1/vente/findone/E2EJ27A1*', (r) => json(r, { success: true, data: PRODUIT }));
  await p.route('**/api/v1/vente/add/vno', (r) => json(r, { success: true, data: { lgPREENREGISTREMENTID: VENTE, strREF: 'E2E', intPRICE: 1500, intCUSTPART: 1500, lgTYPEVENTEID: '1' } }));
  await p.route('**/api/v1/vente/add/item', (r) => json(r, { success: false, msg: 'E2E : ajout coupé' }));
  await p.route('**/api/v1/vente/deatails*', (r) => json(r, { success: true, total: 1, data: [{ lgPREENREGISTREMENTDETAILID: 'E2E-J27-LIGNE', lgPREENREGISTREMENTID: VENTE,
    lgFAMILLEID: PRODUIT.lgFAMILLEID, intCIP: PRODUIT.intCIP, strNAME: PRODUIT.strNAME, intQUANTITY: 1, intQUANTITYSERVED: 1, intPRICEUNITAIR: 1500, intPRICE: 1500 }] }));
  await p.route('**/api/v1/vente/cheick-caisse*', (r) => json(r, { success: true, data: true }));
  await p.route('**/api/v1/vente/cloturer/**', (r) => json(r, { success: false, msg: 'E2E : clôture coupée' }));
  await p.route('**/api/v1/vente/client/**', (r) => json(r, { success: false, msg: 'E2E : rattachement coupé' }));
  await p.route('**/api/v1/vente/net/vno', (r) => json(r, { success: true, data: { montant: 1500, montantNet: 1500, remise: 0, montantTp: 0, cmuAmount: 0 } }));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion depots extensions');
    await visible(p, 'depotextension #depotEcran');
    const depot = await choisir(p, 'depotextension #depotEcran', 0);
    const CHAMP = ECRAN + ' #contenu [xtype=fieldcontainer] #produit';
    await visible(p, CHAMP);
    await p.waitForTimeout(1500);
    await cliquer(p, CHAMP);
    await p.keyboard.type(PRODUIT.intCIP, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction((v) => { const c = testextjs.app.getController('VenteEnDepotCtr').getCurrent(); return c && c.lgPREENREGISTREMENTID === v; }, VENTE, { timeout: 20000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
    ok('vente en dépôt simulée en place (dépôt ' + depot + ')', true);

    erreurs.length = 0;
    await cliquer(p, ECRAN + ' #contenu #btnClientComptant');
    await visible(p, 'clientLambdadepot #btnCancelLambda', 20000);
    await p.waitForTimeout(800);
    await cliquer(p, 'clientLambdadepot #btnCancelLambda');
    await p.waitForTimeout(1200);
    const ouverte = await p.evaluate(() => Ext.ComponentQuery.query('clientLambdadepot').some((w) => w.isVisible()));
    ok('J27 « Annuler » ferme la fenêtre client de la vente en dépôt, sans erreur', !ouverte && erreurs.length === 0, JSON.stringify({ ouverte, erreurs }));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
