/* VENTE EN DEPOT > FICHE DU CLIENT ASSURE : grille des complementaires modifiable, avec les memes controles que celle de
 * l'ecran de vente de l'officine (decision du 29/10 au cahier de recette). La fiche du depot est une copie de celle de
 * l'officine : la grille y etait restee en lecture seule, et « Associer une assurance » acceptait 0 % et une priorite
 * deja prise.
 *
 * Preparation (hors parcours teste) : client d'essai, assurance principale A (80 %, priorite 1) et complementaires C
 * (10 %, priorite 2) et F (10 %, priorite 3). Parcours de l'utilisateur, a la souris et au clavier :
 *  - GESTION DES TIERS-PAYANTS > « Gestion depots extensions », onglet « Saisir vente dépôt », type « Assurance »,
 *    client cherche au clavier ; bouton de modification du client ;
 *  - grille : taux et matricule de C modifies d'un clic dans la cellule, « Enregistrer » : enregistres ;
 *  - grille : priorite de l'autre assurance et taux de 150 refuses, avec un message ;
 *  - « Associer une assurance » : taux 0 puis priorite prise refuses, la fenetre reste ouverte.
 * Jeu d'essai retire a la fin. Lancement seul : node src/test/e2e/audits/test-ecran-assurances-client-depot.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const C = require('./commun');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const { ok, q, MARQUE } = C;

const NOM = 'DEPOTG';
const MATRICULE = MARQUE + '-' + NOM;
const FICHE = 'addaddclientwindowdepot';
const ECRAN = 'depotextension doventeendepot';

const liens = (clientId) => q("SELECT CONCAT_WS('/', l.lg_TIERS_PAYANT_ID, l.int_PRIORITY, l.b_IS_RO) FROM t_compte_client_tiers_payant l"
  + " JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.str_STATUT = 'enable'"
  + " ORDER BY l.int_PRIORITY, l.lg_TIERS_PAYANT_ID").split(/\r?\n/).filter(Boolean);
const doublons = (l) => { const p = l.map((x) => x.split('/')[1]); return p.filter((x, i) => p.indexOf(x) !== i); };

(async () => {
  const A = C.tiersPayant('GA', '1'), TC = C.tiersPayant('GC', '1'), F = C.tiersPayant('GF', '1'), E = C.tiersPayant('GE', '1');
  const cl = await C.clientAssure(null, NOM, [{ tp: A, taux: 80 }, { tp: TC, taux: 10 }, { tp: F, taux: 10 }]);
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
  const choisirParFrappe = async (requete, texte) => {
    await cliquer(p, requete);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 25 });
    const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: texte }).first();
    await item.waitFor({ timeout: 20000 });
    await item.click();
  };
  const ouvrirFiche = async () => {
    await masquerBandeau();
    await cliquer(p, ECRAN + ' #contenu #btnModifierInfo');
    await p.waitForFunction((f) => { const w = Ext.ComponentQuery.query(f + '{isVisible()}')[0];
      return w && !w.down('grid').getStore().isLoading(); }, FICHE, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const enregistrerFiche = async () => {
    const reponse = p.waitForResponse((r) => r.url().includes('client/add/assurance'), { timeout: 30000 });
    await cliquer(p, FICHE + ' #btnAddClientAssurance');
    const r = await (await reponse).json();
    await p.waitForTimeout(1500);
    await fermerMessages();
    return r;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await masquerBandeau();
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Gestion depots extensions');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e + ' #typeVente').some((x) => x.isVisible(true)), ECRAN, { timeout: 60000 });
    await p.waitForTimeout(1500);
    /* type de vente : liste deroulante de l'ecran du depot */
    await cliquer(p, ECRAN + ' #typeVente');
    await p.locator('.x-boundlist-item').filter({ visible: true, hasText: 'ASSURANCE' }).first().click();
    await p.waitForTimeout(1500);
    await cliquer(p, ECRAN + ' #contenu #clientSearchTextField');
    await p.keyboard.type(MARQUE + ' ' + NOM, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligne = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: MATRICULE }).first();
    const assure = p.locator('text=(' + MATRICULE + ')').filter({ visible: true }).first();
    await Promise.race([ligne.waitFor({ timeout: 30000 }), assure.waitFor({ timeout: 30000 })]);
    if (await ligne.isVisible().catch(() => false)) { await ligne.click(); }
    await p.waitForTimeout(2500);
    await fermerMessages();

    /* 1. grille : taux et matricule de C modifies d'un clic dans la cellule */
    await ouvrirFiche();
    const ligneC = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: TC }).first();
    const cellule = async (index, texte) => {
      await ligneC.locator('td').nth(index).click();
      await p.waitForTimeout(400);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(texte, { delay: 25 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(300);
    };
    /* colonnes visibles : Assurance, Taux.Couverture, Numéro/SS, RC, Retirer */
    await cellule(1, '15');
    await cellule(2, MARQUE + '-MATD');
    const r1 = await enregistrerFiche();
    const lienC = q("SELECT CONCAT_WS('/', l.int_POURCENTAGE, l.str_NUMERO_SECURITE_SOCIAL) FROM t_compte_client_tiers_payant l JOIN t_compte_client c"
      + " ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + cl.clientId + "' AND l.lg_TIERS_PAYANT_ID = '" + TC + "' AND l.str_STATUT = 'enable'");
    ok('Grille du dépôt : taux et matricule de C modifiés à l\'écran puis enregistrés', r1 && r1.success && lienC === '15/' + MARQUE + '-MATD',
      lienC + ' ' + JSON.stringify(r1).slice(0, 150));

    /* 2. grille : priorite deja prise et taux hors de 1 a 100 refuses, avec un message */
    await ouvrirFiche();
    const grille = () => p.evaluate((f) => Ext.ComponentQuery.query(f + '{isVisible()}')[0].down('grid').getStore()
      .getRange().map((r) => ({ tp: r.get('lgTIERSPAYANTID'), order: String(r.get('order')), taux: Number(r.get('taux')) })), FICHE);
    const message = () => p.evaluate((f) => { const m = Ext.ComponentQuery.query(f + '{isVisible()} #messageAssurances')[0];
      return m && m.isVisible() ? m.el.dom.textContent : ''; }, FICHE);
    const g0 = await grille();
    const prioAutre = g0.find((x) => x.tp !== TC).order, prioC = g0.find((x) => x.tp === TC).order;
    await cellule(3, prioAutre);
    const g1 = await grille(), m1 = await message();
    ok('Grille du dépôt : priorité déjà portée refusée, avec un message', g1.find((x) => x.tp === TC).order === prioC && /déjà/.test(m1),
      'saisi ' + prioAutre + ', C garde ' + g1.find((x) => x.tp === TC).order + ', message « ' + m1 + ' »');
    const tauxC = g1.find((x) => x.tp === TC).taux;
    await cellule(1, '150');
    const g2 = await grille(), m2 = await message();
    ok('Grille du dépôt : taux de 150 % refusé, avec un message', g2.find((x) => x.tp === TC).taux === tauxC && /1 à 100/.test(m2),
      'C garde ' + g2.find((x) => x.tp === TC).taux + ' %, message « ' + m2 + ' »');

    /* 3. « Associer une assurance » : taux 0, puis priorite prise */
    const ASSOC = 'window[title="Associer tiers-payant"]';
    await cliquer(p, FICHE + ' #associertps');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + '{isVisible()}').length > 0, ASSOC, { timeout: 15000 });
    await choisirParFrappe(ASSOC + ' combobox[name=lgTIERSPAYANTID]', E);
    await cliquer(p, ASSOC + ' numberfield[name=taux]');
    await p.keyboard.type('0', { delay: 25 });
    await p.locator('.x-window').filter({ visible: true, hasText: 'Associer tiers-payant' }).getByText('Enregistrer', { exact: true }).click();
    await p.waitForTimeout(800);
    const ouverte = await p.evaluate((s) => Ext.ComponentQuery.query(s + '{isVisible()}').length > 0, ASSOC);
    const tauxRouge = ouverte && await p.locator('.x-window').filter({ visible: true, hasText: 'Associer tiers-payant' }).locator('input[name=taux].x-form-invalid-field').isVisible();
    ok('« Associer une assurance » du dépôt : taux de 0 % refusé, la fenêtre reste ouverte, le champ marqué', ouverte && tauxRouge,
      ouverte ? 'fenêtre ouverte' : 'fenêtre fermée, ligne ajoutée');
    if (ouverte) {
      await cliquer(p, ASSOC + ' numberfield[name=taux]');
      await p.keyboard.press('Control+A');
      await p.keyboard.type('1', { delay: 25 });
      await cliquer(p, ASSOC + ' numberfield[name=order]');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(prioC, { delay: 25 });
      await p.locator('.x-window').filter({ visible: true, hasText: 'Associer tiers-payant' }).getByText('Enregistrer', { exact: true }).click();
      await p.waitForTimeout(800);
    }
    const encore = await p.evaluate((s) => Ext.ComponentQuery.query(s + '{isVisible()}').length > 0, ASSOC);
    ok('« Associer une assurance » du dépôt : priorité déjà prise refusée, la fenêtre reste ouverte', encore, encore ? '' : 'ligne ajoutée en priorité ' + prioC);
    if (encore) { await p.locator('.x-window').filter({ visible: true, hasText: 'Associer tiers-payant' }).getByText('Annuler', { exact: true }).click(); }
    await p.waitForTimeout(500);
    const r4 = await enregistrerFiche();
    const l4 = liens(cl.clientId);
    ok('Après « Enregistrer » : aucune priorité en double, E non rattachée', r4 && r4.success && doublons(l4).length === 0 && !l4.some((x) => x.startsWith(E + '/')), l4.join(' ; '));
    ok('Aucune erreur JavaScript, aucun message d\'erreur', erreurs.length === 0 && !/erreur/i.test(await texteMessage(p)), erreurs.join(' | '));
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
