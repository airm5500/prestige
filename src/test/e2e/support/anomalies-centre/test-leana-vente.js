/* § 20 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 (journal de leana) : J23 et J24, ecran de vente comptant.
 *
 *  - J23 (48 occ.) : Entree dans la fenetre « client » de la vente ordinaire declenchait aussi le controleur de la vente
 *    en depot (« form is undefined » dans VenteEnDepotCtr.registerNewClient) ;
 *  - J24 (5 occ.) : Entree sur « Montant recu » avant la reponse du calcul du net (net/vno) levait « data is null »
 *    dans onbtncloturerVnoComptant, et la cloture ne partait pas.
 *
 * Parcours par les vues (compte e2e) : SERVICE CLIENT > Ventes > nouvelle vente, un code saisi dans Produit puis Entree.
 * La vente est SIMULEE : les reponses de creation (add/vno), de detail, d'etat de caisse et de calcul du net sont
 * interceptees, et toute cloture est coupee. Aucune donnee n'est ecrite. Les envois au centre de support sont
 * interceptes.
 *
 * node support/anomalies-centre/test-leana-vente.js   (BASE=http://localhost:9080/prestige ; VOLETS=J23,J24)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, repondre } = require('../../outils/vues');

const joue = (v) => !process.env.VOLETS || process.env.VOLETS.split(',').includes(v);
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const visible = (p, r) => p.waitForFunction((q) => Ext.ComponentQuery.query(q).some((x) => x.isVisible(true)), r, { timeout: 60000 });

const VENTE = 'E2E-LEANA-VENTE';
const PRODUIT = { lgFAMILLEID: 'E2E-LEANA-PRODUIT', lgFAMILLEPARENTID: 'E2E-LEANA-PRODUIT', intCIP: 'E2ELEANA1', strNAME: 'PRODUIT ESSAI LEANA',
  strDESCRIPTION: 'PRODUIT ESSAI LEANA', intPRICE: 1500, intNUMBERAVAILABLE: 50, intNUMBER: 50, boolDECONDITIONNE: 0, strLIBELLEE: '' };
const json = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const appels = []; p.on('request', (r) => { if (/\/api\/v1\/vente\/(net\/vno|cloturer|add\/vno)/.test(r.url())) { appels.push(r.method() + ' ' + r.url().replace(/.*\/api\/v1\//, '')); } });
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  /* vente simulee : aucune ecriture */
  await p.route('**/api/v1/vente/findone/E2ELEANA1*', (r) => json(r, { success: true, data: PRODUIT }));
  await p.route('**/api/v1/vente/add/vno', (r) => json(r, { success: true, data: { lgPREENREGISTREMENTID: VENTE, strREF: 'E2E', intPRICE: 1500, intCUSTPART: 1500, lgTYPEVENTEID: '1' } }));
  await p.route('**/api/v1/vente/add/item', (r) => json(r, { success: false, msg: 'E2E : ajout coupe' }));
  await p.route('**/api/v1/vente/deatails*', (r) => json(r, { success: true, total: 1, data: [{ lgPREENREGISTREMENTDETAILID: 'E2E-LIGNE', lgPREENREGISTREMENTID: VENTE,
    lgFAMILLEID: PRODUIT.lgFAMILLEID, intCIP: PRODUIT.intCIP, strNAME: PRODUIT.strNAME, intQUANTITY: 1, intQUANTITYSERVED: 1, intPRICEUNITAIR: 1500, intPRICE: 1500 }] }));
  await p.route('**/api/v1/vente/cheick-caisse*', (r) => json(r, { success: true, data: true }));
  await p.route('**/api/v1/vente/cloturer/**', (r) => json(r, { success: false, msg: 'E2E : clôture coupée' }));
  await p.route('**/api/v1/vente/peremption-proche/**', (r) => json(r, { success: true, data: null }));
  await p.route('**/api/v1/vente/quantites-vente/**', (r) => json(r, { success: true, data: [] }));
  /* calcul du net : retenu tant que NET_LIBRE est faux */
  let netLibre = true; const netEnAttente = [];
  const net = { success: true, data: { montant: 1500, montantNet: 1500, remise: 0, montantTp: 0, cmuAmount: 0 } };
  await p.route('**/api/v1/vente/net/vno', (r) => { if (netLibre) { return json(r, net); } netEnAttente.push(r); return undefined; });
  const libererNet = async () => { netLibre = true; while (netEnAttente.length) { await json(netEnAttente.shift(), net).catch(() => {}); } };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await visible(p, 'cloturerventemanager #addBtn');
    await cliquer(p, 'cloturerventemanager #addBtn');
    const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await visible(p, CHAMP);
    await p.waitForTimeout(1500);
    await cliquer(p, CHAMP);
    await p.keyboard.type(PRODUIT.intCIP, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction((v) => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID === v; }, VENTE, { timeout: 20000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1500);
    ok('vente simulée en place (aucune écriture)', appels.some((a) => /add\/vno/.test(a)), JSON.stringify(appels));

    /* ---- J24 ---- */
    if (joue('J24')) try {
      /* le curseur est deja dans « Montant recu » (net connu) quand le net est remis a zero, comme apres un ajout fait
         sans quitter le champ ; sa nouvelle reponse est retenue */
      const recu = await p.evaluate(() => { const f = testextjs.app.getController('VenteCtr').getMontantRecu(); f.inputEl.dom.setAttribute('data-e2e', 'recu'); return f.isVisible(true); });
      await p.click('[data-e2e=recu]');
      await p.waitForTimeout(1500);
      await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
      /* comme loadVenteData (reprise d'une vente en attente) : net vide, sans drapeau de recalcul */
      await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); c.netAmountToPay = null; c.toRecalculate = false; });
      netLibre = false; appels.length = 0; erreurs.length = 0;
      await p.keyboard.press('Control+A');
      await p.keyboard.type('2000', { delay: 30 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      const nul = erreurs.filter((m) => /null|undefined|montantNet/.test(m));
      ok('J24 Entrée sur « Montant reçu » avant le net : aucune erreur JavaScript', recu && nul.length === 0, JSON.stringify({ recu, erreurs }));
      const msgs = await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => (m.msg && m.msg.getEl() ? m.msg.getEl().dom.innerText : '?')));
      ok('J24 : la caissière est prévenue que le net va être recalculé, aucune clôture ne part', msgs.some((m) => /net à payer/i.test(m)) && !appels.some((a) => /cloturer/.test(a)), JSON.stringify({ msgs, appels }));
      await repondre(p, 'ok').catch(() => {});
      await p.waitForTimeout(1000);
      ok('J24 : après OK, le net est demandé au serveur', appels.some((a) => /net\/vno/.test(a)), JSON.stringify(appels));
      await libererNet();
      await p.waitForTimeout(1500);
      const net_ = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); return { net: c.netAmountToPay && c.netAmountToPay.montantNet, champ: c.getMontantNet().getValue() }; });
      ok('J24 : le net reçu s\'affiche, la caissière peut valider de nouveau', net_.net === 1500, JSON.stringify(net_));
      await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
    } catch (x) { ok('J24 parcours sans exception', false, x.message); }

    /* ---- J23 ---- */
    if (joue('J23')) try {
      await libererNet();
      erreurs.length = 0;
      await cliquer(p, 'doventemanager #contenu #btnClientComptant');
      await visible(p, 'clientLambda #btnAddNewLambda');
      await p.waitForTimeout(800);
      /* le formulaire est masque tant que « nouveau client » n'est pas clique */
      await cliquer(p, 'clientLambda #btnAddNewLambda');
      await visible(p, 'clientLambda form textfield');
      await p.waitForTimeout(1000);
      /* champ vide : le formulaire de la vente ordinaire est invalide, rien n'est cree */
      const id = await p.evaluate(() => { const f = Ext.ComponentQuery.query('clientLambda form textfield').filter((x) => x.isVisible(true))[0]; f.inputEl.dom.setAttribute('data-e2e', 'lambda'); return f.name; });
      await p.click('[data-e2e=lambda]');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      const depot = erreurs.filter((m) => /form|isValid/.test(m));
      ok('J23 Entrée dans la fenêtre « client » de la vente ordinaire : aucune erreur du contrôleur de dépôt', depot.length === 0, JSON.stringify({ champ: id, erreurs }));
    } catch (x) { ok('J23 parcours sans exception', false, x.message); }
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
