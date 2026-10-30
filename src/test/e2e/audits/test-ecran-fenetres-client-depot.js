/* VENTE EN DEPOT > fenetres du client : elles se ferment de nouveau (correction du 29/10, commit 50157c1c). Le
 * controleur du depot appelait les fenetres de l'officine (getAddaddclientwindow, getAddCarnetwindow) : « Annuler » et
 * « Enregistrer » levaient une erreur JavaScript et la fenetre restait ouverte.
 *
 * Preparation (hors parcours teste) : client assure (A 100 %) et client carnet (K 100 %). Parcours de l'utilisateur, a
 * la souris et au clavier : GESTION DES TIERS-PAYANTS > « Gestion depots extensions », onglet « Saisir vente dépôt » ;
 *  - type « ASSURANCE_MUTUELLE », client cherche au clavier, bouton de modification : « Annuler » ferme la fiche ;
 *  - type « CARNET », client cherche au clavier, bouton de modification : « Annuler » ferme la fiche, puis, rouverte,
 *    « Enregistrer » l'enregistre et la ferme.
 * Non couverts ici : la fenetre des ayants droit (aucun bouton ne l'ouvre sur l'ecran du depot) et celle des modes de
 * reglement (elle demande une vente avec produits ; parcours couvert par test-vente-en-depot.js).
 * Jeu d'essai retire a la fin. Lancement seul : node src/test/e2e/audits/test-ecran-fenetres-client-depot.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const C = require('./commun');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { ok, q, MARQUE } = C;

const ECRAN = 'depotextension doventeendepot';
const ouverte = (p, xtype) => p.evaluate((x) => Ext.ComponentQuery.query(x + '{isVisible()}').length > 0, xtype);

(async () => {
  const A = C.tiersPayant('WA', '1'), K = C.tiersPayant('WK', '2');
  const assure = await C.clientAssure(null, 'DEPOTW', [{ tp: A, taux: 100 }]);
  const carnet = await C.clientAssure(null, 'DEPOTK', [{ tp: K, taux: 100 }]);
  /* en vente CARNET, l'ecran ne cherche que les clients de type carnet (2) */
  C.exec("UPDATE t_client SET lg_TYPE_CLIENT_ID = '2' WHERE lg_CLIENT_ID = '" + carnet.clientId + "'");
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const fermerMessages = async () => {
    for (let i = 0; i < 4; i++) {
      const id = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (!m) { return null; }
        const btn = ['ok', 'no'].map((x) => m.down('button[itemId=' + x + ']')).find((x) => x && x.isVisible()); return btn ? btn.getId() : null; });
      if (!id) { return; }
      await p.click('#' + id); await p.waitForTimeout(400);
    }
  };
  /* bandeau d'alerte WhatsApp : il intercepte les clics, on le masque s'il est affiche */
  const masquerBandeau = async () => {
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }
  };
  const choisirClient = async (type, nom) => {
    await masquerBandeau();
    await cliquer(p, ECRAN + ' #typeVente');
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: type }).first().click();
    await p.waitForTimeout(1500);
    await cliquer(p, ECRAN + ' #contenu #clientSearchTextField');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(MARQUE + ' ' + nom, { delay: 20 });
    await p.keyboard.press('Enter');
    const matricule = MARQUE + '-' + nom;
    const ligne = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: matricule }).first();
    const choisi = p.locator('text=(' + matricule + ')').filter({ visible: true }).first();
    await Promise.race([ligne.waitFor({ timeout: 30000 }), choisi.waitFor({ timeout: 30000 })]);
    if (await ligne.isVisible().catch(() => false)) { await ligne.click(); }
    await p.waitForTimeout(2500);
    await fermerMessages();
  };
  const ouvrirFiche = async (xtype) => {
    await masquerBandeau();
    await cliquer(p, ECRAN + ' #contenu #btnModifierInfo');
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x + '{isVisible()}').length > 0, xtype, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await masquerBandeau();
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion depots extensions');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e + ' #typeVente').some((x) => x.isVisible(true)), ECRAN, { timeout: 60000 });
    await p.waitForTimeout(1500);

    /* 1. fiche du client assure : « Annuler » */
    await choisirClient('ASSURANCE', 'DEPOTW');
    await ouvrirFiche('addaddclientwindowdepot');
    await cliquer(p, 'addaddclientwindowdepot #btnCancelAssClient');
    await p.waitForTimeout(800);
    ok('Fiche du client assuré : « Annuler » la ferme', !(await ouverte(p, 'addaddclientwindowdepot')), erreurs.join(' | '));

    /* 2. fiche du client carnet : « Annuler », puis « Enregistrer » */
    await choisirClient('CARNET', 'DEPOTK');
    await ouvrirFiche('addCarnetwindowdepot');
    await cliquer(p, 'addCarnetwindowdepot #btnCancelAssClient');
    await p.waitForTimeout(800);
    ok('Fiche du client carnet : « Annuler » la ferme', !(await ouverte(p, 'addCarnetwindowdepot')), erreurs.join(' | '));

    await ouvrirFiche('addCarnetwindowdepot');
    const reponse = p.waitForResponse((r) => r.url().includes('client/add/carnet'), { timeout: 30000 });
    await cliquer(p, 'addCarnetwindowdepot #btnAddClientAssurance');
    const r = await (await reponse).json();
    await p.waitForTimeout(1500);
    await fermerMessages();
    ok('Fiche du client carnet : « Enregistrer » l\'enregistre et la ferme', r && r.success && !(await ouverte(p, 'addCarnetwindowdepot')),
      JSON.stringify(r).slice(0, 150) + ' ' + erreurs.join(' | '));
    ok('Client carnet : toujours rattaché à K', q("SELECT COUNT(*) FROM t_compte_client_tiers_payant l JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
      + " WHERE c.lg_CLIENT_ID = '" + carnet.clientId + "' AND l.lg_TIERS_PAYANT_ID = '" + K + "' AND l.str_STATUT = 'enable'") === '1');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    const v = await p.evaluate(() => { const c = testextjs.app.getController('VenteEnDepotCtr').current; return c && c.lgPREENREGISTREMENTID; }).catch(() => null);
    if (v) { C.etat.ventes.push(v); }
    await b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
