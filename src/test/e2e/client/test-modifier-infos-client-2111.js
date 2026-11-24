/* PLAN DU 21/11, POINT 7 : VENTE A CREDIT, « MODIFIER INFOS CLIENT » (fiche du client assuré).
 *
 *  - mise en page : la Ville ne déborde plus (le Genre tient sur une ligne) ; le code postal laisse la place à
 *    l'Adresse ; l'ancienne place de l'adresse reçoit le nouveau champ Téléphone ; la grille des assurances
 *    complémentaires est agrandie, colonnes lisibles ; contrôlé à 1366×768, 1280×720 et 1920×1080 ;
 *  - Entrée : Nom → Prénom → Matricule → Téléphone → Adresse → Assurance → Pourcentage → Enregistrer ;
 *  - Téléphone contrôlé à la saisie (numéro ivoirien, comme le client standard) et par le serveur, enregistré au
 *    format local à dix chiffres ; vidé, il est effacé.
 * Jeu d'essai (retiré à la fin) : assurances A (principale, 80 %) et C (complémentaire, 20 %), un client assuré avec
 * une adresse et un code postal. Vrai chemin : SERVICE CLIENT > Ventes > nouvelle vente « Assurance », client tapé,
 * bouton de modification du client, saisie au clavier, « Enregistrer ».
 * Contrôles :
 *  - rapprochement : téléphone et adresse identiques dans la fenêtre rouverte, dans la réponse du serveur et en base ;
 *  - bilan : seul le téléphone de la fiche change ; adresse, code postal, matricule et assurances intacts ; aucun
 *    client créé ; un numéro refusé n'envoie rien ;
 *  - aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/client/test-modifier-infos-client-2111.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const C = require('../audits/commun');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { ok, q, exec, MARQUE } = C;

const NOM = 'MIC';
const MATRICULE = MARQUE + '-' + NOM;
const ADRESSE = 'RUE 12 COCODY', CODE_POSTAL = 'BP 2111';
const FENETRE = 'addaddclientwindow{isVisible()}';

(async () => {
  const A = C.tiersPayant('MA', '1'), TC = C.tiersPayant('MC', '1');
  const cl = await C.clientAssure(null, NOM, [{ tp: A, taux: 80 }, { tp: TC, taux: 20 }]);
  exec("UPDATE t_client SET str_ADRESSE = '" + ADRESSE + "', str_CODE_POSTAL = '" + CODE_POSTAL + "', str_TELEPHONE = NULL WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
  const fiche = () => q("SELECT CONCAT_WS('|', IFNULL(str_TELEPHONE, '∅'), IFNULL(str_ADRESSE, '∅'), IFNULL(str_CODE_POSTAL, '∅'), str_NUMERO_SECURITE_SOCIAL, str_FIRST_NAME, str_LAST_NAME)"
    + " FROM t_client WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
  const liens = () => q("SELECT GROUP_CONCAT(CONCAT_WS('/', l.lg_TIERS_PAYANT_ID, l.int_POURCENTAGE, l.int_PRIORITY, l.str_STATUT) ORDER BY l.int_PRIORITY) FROM t_compte_client_tiers_payant l"
    + " JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + cl.clientId + "'");
  const nbClients = () => q("SELECT COUNT(*) FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'");
  const fiche0 = fiche(), liens0 = liens(), clients0 = nbClients();

  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const envois = []; p.on('request', (r) => { if (r.url().includes('client/add/assurance')) { envois.push(r.postData() || ''); } });
  const fermerMessages = async () => {
    for (let i = 0; i < 4; i++) {
      const id = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (!m) { return null; }
        const btn = ['ok', 'no'].map((x) => m.down('button[itemId=' + x + ']')).find((x) => x && x.isVisible()); return btn ? btn.getId() : null; });
      if (!id) { return; }
      await p.click('#' + id); await p.waitForTimeout(400);
    }
  };
  const ouvrirFiche = async () => {
    await cliquer(p, 'doventemanager #contenu #btnModifierInfo');
    await p.waitForFunction((f) => { const w = Ext.ComponentQuery.query(f)[0]; return w && !w.down('grid').getStore().isLoading(); }, FENETRE, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const champ = (nom) => p.evaluate(([f, n]) => { const w = Ext.ComponentQuery.query(f)[0], c = w && w.down('[name=' + n + ']');
    return c ? { valeur: c.getValue(), visible: c.isVisible(true), valide: c.isValid() } : null; }, [FENETRE, nom]);
  /* mesure de la fenetre : champs dans leur cadre, libelles entiers, place des champs, grille */
  const mesure = () => p.evaluate((f) => {
    const w = Ext.ComponentQuery.query(f)[0], r = (c) => c.getEl().dom.getBoundingClientRect();
    const cadre = w.down('fieldset[title=Information sur le client]'), rc = r(cadre), defauts = [];
    Ext.ComponentQuery.query('field{isVisible(true)}', cadre).filter((c) => !c.isXType('hiddenfield') && !c.isXType('radiofield')).forEach((c) => {
      const x = r(c);
      if (x.bottom > rc.bottom + 1 || x.right > rc.right + 1) { defauts.push((c.name || c.itemId || c.fieldLabel) + ' déborde du cadre'); }
      if (c.labelEl && c.labelEl.dom.scrollWidth > c.labelEl.dom.clientWidth + 1) { defauts.push(c.fieldLabel + ' : libellé coupé'); }
    });
    const pos = (n) => { const c = w.down('[name=' + n + ']'); return c && c.isVisible(true) ? r(c) : null; };
    const tel = pos('strTELEPHONE'), adr = pos('strADRESSE'), mat = pos('strNUMEROSECURITESOCIAL');
    const cp = w.query('field[name=strCODEPOSTAL]').filter((c) => !c.isXType('hiddenfield') && c.isVisible(true)).length;
    const g = w.down('grid'), cols = {};
    g.columns.filter((c) => c.isVisible() && c.text).forEach((c) => { cols[c.text] = c.getWidth(); });
    const fenetre = r(w);
    return { defauts, telephoneSousMatricule: !!(tel && mat && Math.abs(tel.left - mat.left) < 3 && tel.top > mat.top),
      adresseADroite: !!(tel && adr && Math.abs(adr.top - tel.top) < 3 && adr.left > tel.right), codePostalVisible: cp,
      grille: Math.round(r(g).height), cols, dansEcran: fenetre.bottom <= window.innerHeight + 1 && fenetre.top >= 0,
      fenetre: [Math.round(fenetre.top), Math.round(fenetre.bottom), window.innerHeight] };
  }, FENETRE);
  /* champ ou bouton qui a le focus dans la fenetre */
  const focus = () => p.evaluate((f) => { const w = Ext.ComponentQuery.query(f)[0], a = document.activeElement;
    if (!w) { return 'fenêtre fermée'; }
    const c = w.query('field,button').find((x) => x.getEl() && x.getEl().dom.contains(a));
    return c ? (c.itemId && !/^ext-|^(combo|textfield|numberfield)-/.test(c.itemId) ? c.itemId : c.name || c.itemId) : (a && a.id); }, FENETRE);
  const taper = async (nom, texte) => {
    const id = await p.evaluate(([f, n]) => Ext.ComponentQuery.query(f)[0].down('[name=' + n + ']').inputEl.id, [FENETRE, nom]);
    await p.click('#' + id, { clickCount: 3 }); await p.keyboard.press('Control+A');
    if (texte) { await p.keyboard.type(texte, { delay: 20 }); } else { await p.keyboard.press('Delete'); }
  };
  const enregistrer = async () => {
    const reponse = p.waitForResponse((r) => r.url().includes('client/add/assurance'), { timeout: 30000 });
    await cliquer(p, 'addaddclientwindow #btnAddClientAssurance');
    const r = await (await reponse).json();
    await p.waitForTimeout(1500);
    await fermerMessages();
    return r;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type(MARQUE + ' ' + NOM, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligne = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: MATRICULE }).first();
    const assure = p.locator('text=(' + MATRICULE + ')').filter({ visible: true }).first();
    await Promise.race([ligne.waitFor({ timeout: 30000 }), assure.waitFor({ timeout: 30000 })]);
    if (await ligne.isVisible().catch(() => false)) { await ligne.click(); }
    await p.waitForTimeout(2500);
    await fermerMessages();

    /* ---------- mise en page, trois tailles d'écran ---------- */
    /* la fenetre est ouverte sur un ecran de chaque taille (un poste ne change pas d'ecran en pleine saisie) */
    const fermerFiche = async () => {
      await p.evaluate((f) => { const w = Ext.ComponentQuery.query(f)[0]; const btn = w.query('button').find((x) => /annuler/i.test(x.getText() || ''));
        btn.btnEl.dom.click(); }, FENETRE);
      await p.waitForFunction((f) => !Ext.ComponentQuery.query(f).some((w) => w.isVisible()), FENETRE, { timeout: 15000 });
      await fermerMessages();
    };
    for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(900);
      await ouvrirFiche();
      const m = await mesure();
      ok('Mise en page à ' + l + '×' + h + ' : aucun champ hors de son cadre (Ville comprise), libellés entiers', m.defauts.length === 0 && m.dansEcran, JSON.stringify(m.defauts) + ' ' + m.dansEcran + ' ' + JSON.stringify(m.fenetre));
      ok('Mise en page à ' + l + '×' + h + ' : Téléphone à l\'ancienne place de l\'adresse, Adresse à droite, plus de code postal', m.telephoneSousMatricule && m.adresseADroite && m.codePostalVisible === 0, JSON.stringify(m));
      ok('Mise en page à ' + l + '×' + h + ' : grille des complémentaires agrandie (> 200 px), colonnes lisibles', m.grille > 200 && m.cols['Assurance'] >= 200 && m.cols['Numéro/SS'] >= 150 && m.cols['Taux.Couverture'] >= 110,
        JSON.stringify({ grille: m.grille, cols: m.cols }));
      await fermerFiche();
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(900);
    await ouvrirFiche();
    const avant = { adresse: await champ('strADRESSE'), cp: await champ('strCODEPOSTAL') };
    ok('Fenêtre ouverte : adresse de la fiche dans « Adresse », code postal gardé en réserve', avant.adresse && avant.adresse.valeur === ADRESSE && avant.cp && avant.cp.valeur === CODE_POSTAL, JSON.stringify(avant));

    /* ---------- Entrée : ordre des champs ---------- */
    const idNom = await p.evaluate((f) => Ext.ComponentQuery.query(f)[0].down('#strFIRSTNAME').inputEl.id, FENETRE);
    await p.click('#' + idNom);
    const ordre = [await focus()];
    for (let i = 0; i < 7; i++) {
      await p.keyboard.press('Enter'); await p.waitForTimeout(500);
      ordre.push(await focus());
    }
    const attendu = ['strFIRSTNAME', 'strLASTNAME', 'strNUMEROSECURITESOCIAL', 'strTELEPHONE', 'strADRESSE', 'tiersvo', 'intPOURCENTAGE', 'btnAddClientAssurance'];
    ok('Entrée : Nom → Prénom → Matricule → Téléphone → Adresse → Assurance → Pourcentage → Enregistrer', JSON.stringify(ordre) === JSON.stringify(attendu), ordre.join(' → '));
    await fermerMessages();

    /* ---------- numéro refusé : rien n'est envoyé ---------- */
    await taper('strTELEPHONE', '02 12 34 56 78');
    await p.keyboard.press('Tab'); await p.waitForTimeout(300);
    const faux = await champ('strTELEPHONE');
    const n0 = envois.length;
    await cliquer(p, 'addaddclientwindow #btnAddClientAssurance');
    await p.waitForTimeout(1500);
    await fermerMessages();
    ok('Numéro non ivoirien (02…) : champ en erreur, rien n\'est envoyé, fiche inchangée', faux && !faux.valide && envois.length === n0 && fiche() === fiche0, JSON.stringify(faux) + ' envois ' + (envois.length - n0));

    /* ---------- numéro conforme, saisi avec indicatif et espaces ---------- */
    await taper('strTELEPHONE', '+225 07 08 47 37 50');
    const r1 = await enregistrer();
    const f1 = fiche().split('|');
    ok('Enregistrement accepté', r1 && r1.success, JSON.stringify(r1).slice(0, 200));
    ok('Rapprochement : téléphone normalisé 0708473750 en base = réponse du serveur', f1[0] === '0708473750' && r1.data && r1.data.strTELEPHONE === '0708473750', f1[0] + ' / ' + (r1.data && r1.data.strTELEPHONE));
    ok('Bilan : adresse, code postal, matricule et nom intacts ; assurances inchangées ; aucun client créé',
      f1.slice(1).join('|') === fiche0.split('|').slice(1).join('|') && liens() === liens0 && nbClients() === clients0, fiche() + ' | ' + liens());
    await fermerMessages();
    await ouvrirFiche();
    const rouvert = { tel: await champ('strTELEPHONE'), adr: await champ('strADRESSE') };
    ok('Rapprochement : fenêtre rouverte = base (téléphone, adresse)', rouvert.tel && rouvert.tel.valeur === '0708473750' && rouvert.adr.valeur === ADRESSE, JSON.stringify(rouvert));

    /* ---------- téléphone vidé ---------- */
    await taper('strTELEPHONE', '');
    const r2 = await enregistrer();
    const f2 = fiche().split('|');
    ok('Téléphone vidé : effacé en base, le reste de la fiche intact', r2 && r2.success && f2[0] === '∅' && f2.slice(1).join('|') === fiche0.split('|').slice(1).join('|') && liens() === liens0, fiche());

    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
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
