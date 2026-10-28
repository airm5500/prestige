/* ECRAN DE VENTE > FICHE DU CLIENT ASSURE : une priorite n'est portee que par une assurance (retours de recette du
 * 28/10, M3 et point 21). Rejoue le parcours signale, a la souris et au clavier, sans appel direct au serveur :
 *  - client d'essai : assurance principale A (90 %, priorite 1) et complementaire C (10 %, priorite 2) ;
 *  - SERVICE CLIENT > Ventes > nouvelle vente, type « Assurance » ; client cherche au clavier, ligne cliquee ;
 *  - bouton de modification du client : assurance principale remplacee par B (tapee, choisie dans la liste),
 *    « Enregistrer » : A reste rattachee et active, a une priorite libre ;
 *  - de nouveau la fiche : « Associer une assurance », D a 10 % avec la priorite proposee, « Enregistrer » deux fois :
 *    la priorite proposee est libre, et aucune priorite n'est portee par deux assurances actives.
 * Jeu d'essai (tiers payants, client, vente ouverte) retire a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-assurances-client-priorites.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const C = require('./commun');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const { ok, q, MARQUE } = C;

const NOM = 'SCENP';
const MATRICULE = MARQUE + '-' + NOM;

/* liens actifs du client : tiers payant, priorite, RO */
const liens = (clientId) => q("SELECT CONCAT_WS('/', l.lg_TIERS_PAYANT_ID, l.int_PRIORITY, l.b_IS_RO) FROM t_compte_client_tiers_payant l"
  + " JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.str_STATUT = 'enable'"
  + " ORDER BY l.int_PRIORITY, l.lg_TIERS_PAYANT_ID").split(/\r?\n/).filter(Boolean);
const doublons = (l) => { const p = l.map((x) => x.split('/')[1]); return p.filter((x, i) => p.indexOf(x) !== i); };

(async () => {
  const A = C.tiersPayant('SA', '1'), B = C.tiersPayant('SB', '1'), TC = C.tiersPayant('SC', '1'), D = C.tiersPayant('SD', '1');
  const cl = await C.clientAssure(null, NOM, [{ tp: A, taux: 90 }, { tp: TC, taux: 10 }]);
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  /* boites de message d'information restees ouvertes (plafond, rappel) : « OK » ou « Non » */
  const fermerMessages = async () => {
    for (let i = 0; i < 4; i++) {
      const id = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (!m) { return null; }
        const btn = ['ok', 'no'].map((x) => m.down('button[itemId=' + x + ']')).find((x) => x && x.isVisible()); return btn ? btn.getId() : null; });
      if (!id) { return; }
      await p.click('#' + id); await p.waitForTimeout(400);
    }
  };
  /* liste deroulante a recherche distante : frappe du nom, clic sur l'element de ce nom */
  const choisirParFrappe = async (requete, texte) => {
    await cliquer(p, requete);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 25 });
    const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: texte }).first();
    await item.waitFor({ timeout: 20000 });
    await item.click();
  };
  const ouvrirFiche = async () => {
    await cliquer(p, 'doventemanager #contenu #btnModifierInfo');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('addaddclientwindow{isVisible()}')[0];
      return w && !w.down('grid').getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const enregistrerFiche = async () => {
    const reponse = p.waitForResponse((r) => r.url().includes('client/add/assurance'), { timeout: 30000 });
    await cliquer(p, 'addaddclientwindow #btnAddClientAssurance');
    const r = await (await reponse).json();
    await p.waitForTimeout(1500);
    await fermerMessages();
    return r;
  };
  try {
    ok('Jeu d\'essai : A priorité 1 (RO), C priorité 2', liens(cl.clientId).join(' ; ') === A + '/1/1 ; ' + TC + '/2/0', liens(cl.clientId).join(' ; '));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    /* client : nom tape, Entree, clic sur sa ligne (reperee par son matricule) */
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type(MARQUE + ' ' + NOM, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligne = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: MATRICULE }).first();
    await ligne.waitFor({ timeout: 30000 });
    await ligne.click();
    await p.waitForTimeout(2500);
    await fermerMessages();

    /* 1. assurance principale remplacee : A -> B */
    await ouvrirFiche();
    await choisirParFrappe('addaddclientwindow #tiersvo', B);
    const r1 = await enregistrerFiche();
    const l1 = liens(cl.clientId);
    ok('Principale remplacée par B : enregistrement accepté', r1 && r1.success, JSON.stringify(r1).slice(0, 200));
    ok('B devient la principale (priorité 1, RO)', l1.includes(B + '/1/1'), l1.join(' ; '));
    ok('L\'ancienne principale A reste rattachée et active, à une priorité libre (point 21)',
      l1.some((x) => x.startsWith(A + '/') && x.split('/')[1] !== '1' && x.split('/')[1] !== '-1'), l1.join(' ; '));
    ok('Aucune priorité portée par deux assurances (après le changement de principale)', doublons(l1).length === 0, l1.join(' ; '));

    /* 2. « Associer une assurance » : D a 10 %, priorite proposee */
    await ouvrirFiche();
    await cliquer(p, 'addaddclientwindow #associertps');
    const ASSOC = 'window[title="Associer tiers-payant"]';
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + '{isVisible()}').length > 0, ASSOC, { timeout: 15000 });
    const prises = await p.evaluate(() => Ext.ComponentQuery.query('addaddclientwindow{isVisible()}')[0].down('grid').getStore()
      .getRange().map((r) => String(r.get('order'))));
    const proposee = await p.evaluate((s) => String(Ext.ComponentQuery.query(s + '{isVisible()}')[0].down('[name=order]').getValue()), ASSOC);
    ok('« Associer une assurance » propose une priorité libre', prises.indexOf(proposee) < 0 && proposee !== '1',
      'proposée ' + proposee + ', déjà prises ' + prises.join(','));
    await choisirParFrappe(ASSOC + ' combobox[name=lgTIERSPAYANTID]', D);
    await cliquer(p, ASSOC + ' numberfield[name=taux]');
    await p.keyboard.type('10', { delay: 25 });
    await p.locator('.x-window').filter({ visible: true, hasText: 'Associer tiers-payant' }).getByText('Enregistrer', { exact: true }).click();
    await p.waitForTimeout(800);
    const r2 = await enregistrerFiche();
    const l2 = liens(cl.clientId);
    ok('D associée : enregistrement accepté, D active', r2 && r2.success && l2.some((x) => x.startsWith(D + '/')), JSON.stringify(r2).slice(0, 200) + ' / ' + l2.join(' ; '));
    ok('Aucune priorité portée par deux assurances (après l\'association)', doublons(l2).length === 0, l2.join(' ; '));
    ok('Une seule principale (RO)', l2.filter((x) => x.endsWith('/1')).length === 1, l2.join(' ; '));
    ok('Aucune erreur JavaScript, aucun message d\'erreur', erreurs.length === 0 && !/erreur/i.test(await texteMessage(p)), erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    const v = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; }).catch(() => null);
    if (v) { C.etat.ventes.push(v); }
    await b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
