/* RETOUR DU 25/11, POINT 1 : « Modifier infos client » (Gestion courante > Bons par organisme).
 *  a. en modifiant la fiche du client, « Enregistrer » refusait : « le matricule est deja utilise ». Le controle
 *     comptait les comptes du client lui-meme (sa propre carte) et les comptes desactives ;
 *  b. apres toute modification, la liste doit etre relue (dernieres mises a jour).
 *
 * Jeu d'essai (retire a la fin) : organisme d'essai FM, quatre ventes assurance du jour (quantites 2, 1, 3, 1 ; taux
 * 80, 70, 90, 60) :
 *  - A : la fiche porte un matricule errone, sa carte (compte de l'organisme) le bon ; on recopie le bon matricule
 *    de la carte dans la fiche et on corrige le nom ;
 *  - B : on lui donne le matricule d'un compte DESACTIVE d'un autre client ;
 *  - C : on lui donne le matricule du compte ACTIF d'un autre client chez le meme organisme : doit rester refuse ;
 *  - D : matricule enregistre en minuscules ; on ne change que le telephone.
 * Parcours a la souris et au clavier : menu GESTION COURANTE > « Bons par organisme », organisme FM choisi, icone
 * « Modifier info client », « Modifier infos client », champs tapes, « Enregistrer » de la fiche, puis « Annuler » ou
 * « Enregistrer » de la fenetre.
 * Controles :
 *  - A : fiche enregistree ; BILAN : matricule identique sur la fiche, la carte et l'ayant droit principal, nom
 *    corrige ; aucun autre ayant droit touche (un autre client a un ayant droit qui porte l'ancien matricule de A) ;
 *    « Annuler » : la liste est relue, la ligne de A montre le nouveau nom = base (RAPPROCHEMENT) ;
 *  - B : fiche enregistree, matricule en base ; « Enregistrer » : la liste relue montre le matricule = base ;
 *  - C : refus « deja utilise », rien d'ecrit (fiche et carte inchangees) ;
 *  - D : fiche enregistree (telephone en base) ;
 *  - aucune vente refaite par les seules fiches (aucune copie, notification ni trace).
 * Lancement seul : node src/test/e2e/vente/test-fiche-client-matricule-2511.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const privilegeEssai = require('../support/privilege-essai');

const DROIT_INFOS = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BTN_UPDATE_VENTE_CLIENT_TP');
const ECRAN = 'facturesubrogatoireother';
const FEN = 'window[title=Modification vente]';
const FICHE = 'MODIFICATION DES INFORMATIONS GENERALES';
const traces = (v) => q("SELECT CONCAT_WS('/', (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' OR lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'),"
  + " (SELECT COUNT(*) FROM notification WHERE entity_ref = '" + v + "'), (SELECT COUNT(*) FROM vente_modifiee WHERE vente_id = '" + v + "' OR vente_origine_id = '" + v + "'))");
const venteDuBon = (b) => q("SELECT t.lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
  + " WHERE t.str_REF_BON = '" + b + "' AND p.b_IS_CANCEL = 0 AND p.str_STATUT = 'is_Closed' LIMIT 1");
const fiche = (id) => q("SELECT CONCAT_WS('|', c.str_NUMERO_SECURITE_SOCIAL, c.str_FIRST_NAME, IFNULL(c.str_ADRESSE, ''),"
  + " (SELECT l.str_NUMERO_SECURITE_SOCIAL FROM t_compte_client_tiers_payant l JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
  + "   WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND l.str_STATUT = 'enable' AND l.int_PRIORITY = 1 LIMIT 1),"
  + " IFNULL((SELECT CONCAT(a.str_NUMERO_SECURITE_SOCIAL, '/', a.str_FIRST_NAME) FROM t_ayant_droit a WHERE a.lg_AYANTS_DROITS_ID = c.lg_CLIENT_ID), ''))"
  + " FROM t_client c WHERE c.lg_CLIENT_ID = '" + id + "'");

(async () => {
  C.ouvrirCaisse();
  DROIT_INFOS.accorder();
  const TP = C.tiersPayant('FM', '1');
  const P1 = C.produit(19, 200), P2 = C.produit(20, 200), P3 = C.produit(21, 200), P4 = C.produit(22, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  p.on('pageerror', (x) => console.log('ERREUR JS  ' + String(x.stack).split(/\r?\n/).slice(0, 6).join(' / ')));
  /* impression du ticket interceptee : rien ne sort sur l'imprimante du poste */
  await p.route(/\/api\/v1\/vente\/ticket\/vo\/[^/?]+$/, (r) => (r.request().method() === 'POST'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }) : r.continue()));
  const VO = C.venteAssurance(api);
  try {
    const clA = await C.clientAssure(api, 'FMA', [{ tp: TP, taux: 80 }]);
    const clB = await C.clientAssure(api, 'FMB', [{ tp: TP, taux: 70 }]);
    const clC = await C.clientAssure(api, 'FMC', [{ tp: TP, taux: 90 }]);
    const clD = await C.clientAssure(api, 'FMD', [{ tp: TP, taux: 60 }]);
    const clX = await C.clientAssure(api, 'FMX', [{ tp: TP, taux: 50 }]);
    const clY = await C.clientAssure(api, 'FMY', [{ tp: TP, taux: 50 }]);
    const MA = MARQUE + '-FMA-CARTE', MA_ERR = MARQUE + '-FMA-ERRONE', MB = MARQUE + '-FMY-ANCIEN', MC = MARQUE + '-FMX-ACTIF';
    const MD = (MARQUE + '-fmd-min').toLowerCase();
    /* A : fiche et ayant droit principal au matricule errone, carte au bon matricule */
    exec("UPDATE t_client SET str_NUMERO_SECURITE_SOCIAL = '" + MA_ERR + "' WHERE lg_CLIENT_ID = '" + clA.clientId + "';"
      + " UPDATE t_ayant_droit SET str_NUMERO_SECURITE_SOCIAL = '" + MA_ERR + "' WHERE lg_AYANTS_DROITS_ID = '" + clA.clientId + "';"
      + " UPDATE t_compte_client_tiers_payant SET str_NUMERO_SECURITE_SOCIAL = '" + MA + "' WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clA.lien(TP) + "'");
    /* un autre client (X) a un ayant droit qui porte l'ancien matricule de A : il ne doit pas etre touche */
    exec("INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " VALUES ('" + clX.clientId + "-AD', '" + clX.clientId + "', 'AUTRE', '" + MARQUE + " FMX2', '" + MA_ERR + "', 'F', 'enable', NOW() - INTERVAL 1 DAY, NOW())");
    /* Y : compte desactive au matricule MB ; X : compte actif au matricule MC */
    exec("UPDATE t_compte_client_tiers_payant SET str_STATUT = 'disable', str_NUMERO_SECURITE_SOCIAL = '" + MB + "' WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clY.lien(TP) + "';"
      + " UPDATE t_compte_client_tiers_payant SET str_NUMERO_SECURITE_SOCIAL = '" + MC + "' WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clX.lien(TP) + "'");
    /* D : matricule en minuscules partout */
    exec("UPDATE t_client SET str_NUMERO_SECURITE_SOCIAL = '" + MD + "' WHERE lg_CLIENT_ID = '" + clD.clientId + "';"
      + " UPDATE t_ayant_droit SET str_NUMERO_SECURITE_SOCIAL = '" + MD + "' WHERE lg_AYANTS_DROITS_ID = '" + clD.clientId + "';"
      + " UPDATE t_compte_client_tiers_payant SET str_NUMERO_SECURITE_SOCIAL = '" + MD + "' WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clD.lien(TP) + "'");
    const BA = MARQUE + '-FMA', BB = MARQUE + '-FMB', BC = MARQUE + '-FMC', BD = MARQUE + '-FMD';
    await VO.vendre(clA, [{ lien: clA.lien(TP), taux: 80, bon: BA }], P1, 2);
    await VO.vendre(clB, [{ lien: clB.lien(TP), taux: 70, bon: BB }], P2, 1);
    await VO.vendre(clC, [{ lien: clC.lien(TP), taux: 90, bon: BC }], P3, 3);
    await VO.vendre(clD, [{ lien: clD.lien(TP), taux: 60, bon: BD }], P4, 1);
    const vA = venteDuBon(BA), vB = venteDuBon(BB), vC = venteDuBon(BC), vD = venteDuBon(BD);
    ok('Jeu d\'essai : 4 ventes assurance du jour', !!vA && !!vB && !!vC && !!vD, [vA, vB, vC, vD].join(' '));
    const xAvant = q("SELECT CONCAT(str_NUMERO_SECURITE_SOCIAL, '/', str_FIRST_NAME) FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = '" + clX.clientId + "-AD'");

    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN, { timeout: 60000 });
    const chargee = async () => {
      await p.waitForTimeout(400);
      await p.waitForFunction((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g && !g.getStore().isLoading(); }, ECRAN, { timeout: 60000 });
      await p.waitForTimeout(400);
    };
    await chargee();
    await vues.choisir(p, ECRAN + ' #tiersPayantId', TP);
    await chargee();
    const ligneListe = (bon) => p.evaluate(([e, b]) => { const g = Ext.ComponentQuery.query(e + ' gridpanel').filter((x) => x.isVisible(true))[0];
      const r = g && g.getStore().getRange().filter((x) => x.get('strREFBON') === b)[0];
      return r ? { client: r.get('clientFullName'), matricule: r.get('strNUMEROSECURITESOCIAL') } : null; }, [ECRAN, bon]);
    let chargements = 0;
    p.on('request', (r) => { if (r.url().indexOf('facture-subro/list') >= 0) { chargements++; } });

    const ouvrir = async (bon) => {
      const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: bon }).first();
      await ligne.waitFor({ timeout: 30000 });
      await ligne.locator('img[data-qtip="Modifier info client"]').click();
      await p.waitForFunction((f) => { const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0];
        return w && !w.down('#btnModifierClient').isDisabled() && w.down('#refBon'); }, FEN, { timeout: 60000 });
      await p.waitForTimeout(800);
      await vues.cliquer(p, FEN + ' #btnModifierClient');
      await p.waitForFunction((t) => Ext.ComponentQuery.query('window').some((x) => x.isVisible() && x.title === t), FICHE, { timeout: 30000 });
    };
    const taper = async (nom, texte) => {
      const id = await p.evaluate(([t, n]) => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.title === t)[0];
        return w.down('[name=' + n + ']').inputEl.id; }, [FICHE, nom]);
      await p.click('#' + id, { clickCount: 3 });
      await p.keyboard.press('Control+A');
      await p.keyboard.type(texte, { delay: 15 });
    };
    /* « Enregistrer » de la fiche : rend le message d'erreur, ou '' si la fiche s'est fermee */
    const enregistrerFiche = async () => {
      const id = await p.evaluate((t) => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.title === t)[0];
        return w.query('button').filter((x) => x.getText() === 'Enregistrer' && x.isVisible(true))[0].getEl().dom.id; }, FICHE);
      await p.click('#' + id);
      const fin = Date.now() + 20000;
      while (Date.now() < fin) {
        const m = await vues.texteMessage(p);
        if (/utilis|Erreur/i.test(m)) { await vues.repondre(p, 'ok').catch(() => {}); return m; }
        if (!(await p.evaluate((t) => Ext.ComponentQuery.query('window').some((x) => x.isVisible() && x.title === t), FICHE))) { return ''; }
        await p.waitForTimeout(200);
      }
      return 'fiche toujours ouverte';
    };
    const fermerFiche = async () => {
      const id = await p.evaluate((t) => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.title === t)[0];
        const b = w && w.query('button').filter((x) => x.getText() === 'Annuler' && x.isVisible(true))[0]; return b ? b.getEl().dom.id : null; }, FICHE);
      if (id) { await p.click('#' + id); await p.waitForTimeout(500); }
    };

    /* A : matricule de la carte recopie dans la fiche, nom corrige, puis « Annuler » */
    const NOM_A = MARQUE + ' FMA CORRIGE';
    const avantA = fiche(clA.clientId);
    await ouvrir(BA);
    await taper('strNUMEROSECURITESOCIAL', MA);
    await taper('strFIRSTNAME', NOM_A);
    const mA = await enregistrerFiche();
    ok('A. matricule de sa propre carte recopié dans la fiche : enregistré (plus de « déjà utilisé »)', mA === '', mA);
    if (mA) { await fermerFiche(); }
    const apresA = fiche(clA.clientId);
    ok('A. Bilan : même matricule sur la fiche, la carte et l\'ayant droit principal, nom corrigé',
      apresA === [MA, NOM_A, '', MA, MA + '/' + NOM_A].join('|'), avantA + ' → ' + apresA);
    ok('A. Bilan : l\'ayant droit d\'un autre client qui portait l\'ancien matricule n\'est pas touché',
      q("SELECT CONCAT(str_NUMERO_SECURITE_SOCIAL, '/', str_FIRST_NAME) FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = '" + clX.clientId + "-AD'") === xAvant, xAvant);
    const avantRelecture = chargements;
    await vues.cliquer(p, FEN + ' #btnCancelAssClient');
    await p.waitForTimeout(800);
    await chargee().catch(() => {});
    const lA = await ligneListe(BA);
    const nomBase = q("SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID = '" + clA.clientId + "'");
    ok('A. « Annuler » après la fiche : la liste est relue ; rapprochement : nom de la ligne = base (' + nomBase + ')',
      chargements > avantRelecture && lA && lA.client === nomBase, JSON.stringify({ relectures: chargements - avantRelecture, lA }));

    /* B : matricule d'un compte desactive d'un autre client, puis « Enregistrer » */
    await ouvrir(BB);
    await taper('strNUMEROSECURITESOCIAL', MB);
    const mB = await enregistrerFiche();
    ok('B. matricule d\'un compte désactivé d\'un autre client : enregistré', mB === '', mB);
    if (mB) { await fermerFiche(); }
    ok('B. Bilan : matricule sur la fiche et la carte', fiche(clB.clientId).split('|')[0] === MB && fiche(clB.clientId).split('|')[3] === MB, fiche(clB.clientId));
    const avantB = chargements;
    await vues.cliquer(p, FEN + ' #btnAddClientAssurance');
    if (await vues.attendreMessage(p, 'imprimer', 8000)) { await vues.repondre(p, 'no'); }
    await p.waitForTimeout(1000);
    await chargee().catch(() => {});
    const lB = await ligneListe(BB);
    const matBase = q("SELECT str_NUMERO_SECURITE_SOCIAL FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + clB.lien(TP) + "'");
    ok('B. « Enregistrer » : la liste est relue ; rapprochement : matricule de la ligne = base (' + matBase + ')',
      chargements > avantB && lB && lB.matricule === matBase, JSON.stringify({ relectures: chargements - avantB, lB }));

    /* C : matricule du compte actif d'un autre client : refuse */
    const avantC = fiche(clC.clientId);
    await ouvrir(BC);
    await taper('strNUMEROSECURITESOCIAL', MC);
    const mC = await enregistrerFiche();
    ok('C. matricule du compte actif d\'un autre client chez le même organisme : refusé « déjà utilisé »', /utilis/i.test(mC), mC || 'enregistré');
    await fermerFiche();
    ok('C. Bilan : rien d\'écrit (fiche et carte inchangées)', fiche(clC.clientId) === avantC, avantC + ' → ' + fiche(clC.clientId));
    await vues.cliquer(p, FEN + ' #btnCancelAssClient');
    await p.waitForTimeout(800);

    /* D : matricule en minuscules, seul le telephone change */
    const TEL = '05' + String(Date.now()).slice(-8);
    await ouvrir(BD);
    await taper('strADRESSE', TEL);
    const mD = await enregistrerFiche();
    ok('D. matricule enregistré en minuscules, téléphone seul changé : enregistré', mD === '', mD);
    if (mD) { await fermerFiche(); }
    ok('D. Bilan : téléphone en base', fiche(clD.clientId).split('|')[2] === TEL, fiche(clD.clientId));
    await vues.cliquer(p, FEN + ' #btnCancelAssClient');
    await p.waitForTimeout(800);

    ok('Bilan : aucune vente refaite par les seules fiches (A, C, D : aucune copie, notification ni trace)',
      [vA, vC, vD].every((v) => traces(v) === '0/0/0'), [vA, vC, vD].map(traces).join(' '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await Promise.race([sess.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    DROIT_INFOS.reprendre();
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'") === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON LIKE '" + MARQUE + "-FM%'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
