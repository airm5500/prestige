/* RETOUR DU 25/11 : « Modifier info client » (Gestion courante > Bons par organisme) : la proposition d'impression du
 * ticket a la fin semblait aleatoire.
 * Cause : la fiche du client (« Modifier infos client ») et celle de l'ayant droit (« Modifier infos ayant droit ») sont
 * enregistrees a part ; au clic sur « Enregistrer », la vente elle-meme n'a pas change (meme client, meme ayant droit,
 * memes bons) : le serveur repond « aucun changement » (plan du 19/11, point 7) et la fenetre se fermait sans proposer
 * le ticket.
 * Regle voulue : si rien n'a change, on le dit (pas de ticket) ; tout changement, y compris la fiche du client ou de
 * l'ayant droit, propose l'impression du ticket.
 *
 * Jeu d'essai (retire a la fin) : organisme d'essai TF, trois ventes assurance du jour, parts differentes :
 *  - A : client TFA, quantite 2, taux 80 ;
 *  - B : client TFB servi a un ayant droit distinct (autre matricule), quantite 1, taux 70 ;
 *  - C : client TFC, quantite 3, taux 100.
 * Parcours a la souris et au clavier : menu GESTION COURANTE > « Bons par organisme », organisme TF choisi, icone
 * « Modifier info client » de la ligne ;
 *  1. A, « Enregistrer » sans rien changer : « Aucun changement » signale, aucune question d'impression ; BILAN : rien
 *     d'ecrit (aucune vente creee ni annulee, aucune notification, aucune trace de vente modifiee) ;
 *  2. A, « Modifier infos client », telephone tape, « Enregistrer » (fiche), puis « Enregistrer » : la question
 *     d'impression est posee ; « Oui » -> impression demandee pour la vente A (appel intercepte, rien ne sort sur
 *     l'imprimante) ; BILAN : telephone en base, vente intacte ; l'ecran reste sur la liste ;
 *  3. B, « Modifier infos ayant droit », prenom tape, « Enregistrer » (fiche), puis « Enregistrer » : la question est
 *     posee, « Non » -> aucune impression ; RAPPROCHEMENT : prenom affiche dans la fenetre = base = beneficiaire de
 *     l'apercu du ticket de la vente B ; BILAN : vente intacte ;
 *  4. C, numero de bon retape, « Enregistrer » : la question est posee (non-regression) ; BILAN : nouveau numero en
 *     base, ancien disparu.
 * Lancement seul : node src/test/e2e/vente/test-ticket-fiche-client-2511.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const privilegeEssai = require('../support/privilege-essai');

const DROIT_INFOS = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BTN_UPDATE_VENTE_CLIENT_TP');
const ECRAN = 'facturesubrogatoireother';
const FEN = 'window[title=Modification vente]';
const traces = (v) => q("SELECT CONCAT_WS('/', (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' OR lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'),"
  + " (SELECT COUNT(*) FROM notification WHERE entity_ref = '" + v + "'), (SELECT COUNT(*) FROM vente_modifiee WHERE vente_id = '" + v + "' OR vente_origine_id = '" + v + "'),"
  + " (SELECT CONCAT(b_IS_CANCEL, str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'))");
const parBon = (b) => q("SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_REF, t.int_PRICE) FROM t_preenregistrement_compte_client_tiers_payent t"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID WHERE t.str_REF_BON = '" + b + "' AND p.str_STATUT = 'is_Closed'"
  + " AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0").split(/\r?\n/).filter(Boolean).map((x) => x.split('|'));

(async () => {
  C.ouvrirCaisse();
  DROIT_INFOS.accorder();
  const TP = C.tiersPayant('TF', '1');
  const P1 = C.produit(16, 200), P2 = C.produit(17, 200), P3 = C.produit(18, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  p.on('pageerror', (x) => console.log('ERREUR JS  ' + String(x.stack).split(/\r?\n/).slice(0, 6).join(' / ')));
  /* impression du ticket : l'appel de l'ecran est garde et intercepte (rien ne sort sur l'imprimante du poste) */
  const impressions = [];
  await p.route(/\/api\/v1\/vente\/ticket\/vo\/[^/?]+$/, (route) => {
    if (route.request().method() === 'POST') {
      impressions.push(route.request().url().replace(/^.*\/ticket\/vo\//, ''));
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    }
    return route.continue();
  });
  const VO = C.venteAssurance(api);
  try {
    const clA = await C.clientAssure(api, 'TFA', [{ tp: TP, taux: 80 }]);
    const clB = await C.clientAssure(api, 'TFB', [{ tp: TP, taux: 70 }]);
    const clC = await C.clientAssure(api, 'TFC', [{ tp: TP, taux: 100 }]);
    const AD = clB.clientId + '-AD2';
    exec("INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " VALUES ('" + AD + "', '" + clB.clientId + "', 'ENFANT', '" + MARQUE + " TFB2', '" + MARQUE + "-TFB2', 'F', 'enable', NOW(), NOW())");
    const BA = MARQUE + '-TFA', BB = MARQUE + '-TFB', BC = MARQUE + '-TFC', BCM = MARQUE + '-TFCM';
    await VO.vendre(clA, [{ lien: clA.lien(TP), taux: 80, bon: BA }], P1, 2);
    await VO.vendre(Object.assign({}, clB, { ayantDroitId: AD }), [{ lien: clB.lien(TP), taux: 70, bon: BB }], P2, 1);
    await VO.vendre(clC, [{ lien: clC.lien(TP), taux: 100, bon: BC }], P3, 3);
    const [vA] = parBon(BA)[0] || [], [vB] = parBon(BB)[0] || [], [vC] = parBon(BC)[0] || [];
    const parts = [BA, BB, BC].map((b) => (parBon(b)[0] || [])[2]);
    ok('Jeu d\'essai : 3 ventes assurance du jour, parts différentes, B servie à un ayant droit distinct',
      !!vA && !!vB && !!vC && new Set(parts).size === 3 && q("SELECT lg_AYANTS_DROITS_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vB + "'") === AD, parts.join(' / '));

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
    await p.evaluate((e) => { Ext.ComponentQuery.query(e)[0].marqueTest = 'meme-ecran'; }, ECRAN);
    const surListe = () => p.evaluate((e) => { const v = Ext.ComponentQuery.query(e).filter((c) => c.isVisible(true))[0]; return !!v && v.marqueTest === 'meme-ecran'; }, ECRAN);

    const ouvrir = async (bon) => {
      const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: bon }).first();
      await ligne.waitFor({ timeout: 30000 });
      await ligne.locator('img[data-qtip="Modifier info client"]').click();
      await p.waitForFunction((f) => { const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0];
        return w && !w.down('#btnModifierClient').isDisabled() && w.down('#refBon'); }, FEN, { timeout: 60000 });
      await p.waitForTimeout(800);
    };
    /* champ d'une fenetre (titre exact) choisi par son nom ; texte tape au clavier */
    const taper = async (titre, nom, texte) => {
      const id = await p.evaluate(([t, n]) => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.title === t)[0];
        const f = w && w.down('[name=' + n + ']'); return f ? f.inputEl.id : null; }, [titre, nom]);
      await p.click('#' + id, { clickCount: 3 });
      await p.keyboard.press('Control+A');
      await p.keyboard.type(texte, { delay: 20 });
    };
    const enregistrerFiche = async (titre) => {
      const id = await p.evaluate((t) => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.title === t)[0];
        const b = w && w.query('button').filter((x) => x.getText() === 'Enregistrer' && x.isVisible(true))[0]; return b ? b.getEl().dom.id : null; }, titre);
      await p.click('#' + id);
      await p.waitForFunction((t) => !Ext.ComponentQuery.query('window').some((x) => x.isVisible() && x.title === t), titre, { timeout: 30000 });
      await p.waitForTimeout(600);
    };
    const question = () => vues.attendreMessage(p, 'imprimer', 8000);

    /* 1. rien change */
    const tA = traces(vA);
    await ouvrir(BA);
    await vues.cliquer(p, FEN + ' #btnAddClientAssurance');
    const message = await p.waitForFunction(() => { const t = document.body.innerText; return /Aucun changement/.test(t) ? t.match(/Aucun changement[^\n]*/)[0] : null; }, null, { timeout: 15000 })
      .then((h) => h.jsonValue()).catch(() => '');
    const q1 = await question();
    ok('1. Rien changé : « Aucun changement » signalé, aucune question d\'impression', /Aucun changement/.test(message) && !q1, message + ' / question : ' + q1);
    ok('1. Bilan : rien d\'écrit (aucune vente créée ni annulée, aucune notification, aucune trace)', traces(vA) === tA && tA === '0/0/0/0is_Closed', tA + ' → ' + traces(vA));

    /* 2. fiche du client modifiee */
    const TEL = '07' + String(Date.now()).slice(-8);
    const telAvant = q("SELECT IFNULL(str_ADRESSE, '') FROM t_client WHERE lg_CLIENT_ID = '" + clA.clientId + "'");
    await ouvrir(BA);
    await vues.cliquer(p, FEN + ' #btnModifierClient');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((x) => x.isVisible() && x.title === 'MODIFICATION DES INFORMATIONS GENERALES'), null, { timeout: 30000 });
    await taper('MODIFICATION DES INFORMATIONS GENERALES', 'strADRESSE', TEL);
    await enregistrerFiche('MODIFICATION DES INFORMATIONS GENERALES');
    await vues.cliquer(p, FEN + ' #btnAddClientAssurance');
    const q2 = await question();
    ok('2. Fiche du client modifiée : la question d\'impression du ticket est posée', !!q2, q2 || 'aucune question (ancien code : « Aucun changement »)');
    if (q2) {
      const avant = impressions.length;
      await vues.repondre(p, 'yes');
      await p.waitForTimeout(1500);
      ok('2. « Oui » : impression demandée pour la vente A, une seule fois', impressions.length === avant + 1 && impressions[impressions.length - 1] === vA, JSON.stringify(impressions));
    }
    await chargee().catch(() => {});
    ok('2. Bilan : téléphone en base (' + telAvant + ' → ' + TEL + '), vente intacte (aucune copie, notification ni trace)',
      q("SELECT str_ADRESSE FROM t_client WHERE lg_CLIENT_ID = '" + clA.clientId + "'") === TEL && traces(vA) === '0/0/0/0is_Closed', traces(vA));
    ok('2. L\'écran reste sur la liste des bons', await surListe());

    /* 3. fiche de l'ayant droit modifiee */
    const TITRE_AD = 'MODIFICATION DES INFORMATIONS GENERALES DE L\'AYANT DROIT';
    const PRENOM = MARQUE + ' TFB2 BIS';
    await ouvrir(BB);
    await p.waitForFunction((f) => { const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0]; return !w.down('#btnModifierAyantDroit').isDisabled(); }, FEN, { timeout: 30000 });
    await vues.cliquer(p, FEN + ' #btnModifierAyantDroit');
    await p.waitForFunction((t) => Ext.ComponentQuery.query('window').some((x) => x.isVisible() && x.title === t), TITRE_AD, { timeout: 30000 });
    await taper(TITRE_AD, 'strLASTNAME', PRENOM);
    await enregistrerFiche(TITRE_AD);
    const affiche = await p.evaluate((f) => Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0].down('#prenomAyantDroit').getValue(), FEN);
    await vues.cliquer(p, FEN + ' #btnAddClientAssurance');
    const q3 = await question();
    ok('3. Fiche de l\'ayant droit modifiée : la question d\'impression du ticket est posée', !!q3, q3 || 'aucune question (ancien code : « Aucun changement »)');
    const avant3 = impressions.length;
    if (q3) { await vues.repondre(p, 'no'); await p.waitForTimeout(1500); }
    ok('3. « Non » : aucune impression demandée', impressions.length === avant3, JSON.stringify(impressions));
    await chargee().catch(() => {});
    const enBase = q("SELECT str_LAST_NAME FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = '" + AD + "'");
    const apercu = await api('GET', '../api/v1/vente/ticket/vo/' + vB + '/apercu');
    const texteTicket = JSON.stringify(apercu);
    ok('3. Rapprochement : prénom de l\'ayant droit = fenêtre = base = apercu du ticket de la vente B (' + PRENOM + ')',
      affiche === PRENOM && enBase === PRENOM && texteTicket.indexOf(PRENOM) >= 0, JSON.stringify({ affiche, enBase, ticket: texteTicket.indexOf(PRENOM) >= 0 ? 'présent' : texteTicket.slice(0, 400) }));
    ok('3. Bilan : vente B intacte (aucune copie, notification ni trace), toujours servie au même ayant droit',
      traces(vB) === '0/0/0/0is_Closed' && q("SELECT lg_AYANTS_DROITS_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vB + "'") === AD, traces(vB));
    ok('3. L\'écran reste sur la liste des bons', await surListe());

    /* 4. numero de bon modifie (non-regression) */
    await ouvrir(BC);
    const champ = await p.evaluate(([f, b]) => Ext.ComponentQuery.query(f + ' #refBon').filter((x) => x.isVisible(true) && x.getValue() === b)[0].inputEl.id, [FEN, BC]);
    await p.click('#' + champ, { clickCount: 3 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type(BCM, { delay: 20 });
    await vues.cliquer(p, FEN + ' #btnAddClientAssurance');
    const q4 = await question();
    ok('4. Numéro de bon modifié : la question d\'impression est posée', !!q4, q4);
    if (q4) { await vues.repondre(p, 'no'); await p.waitForTimeout(1500); }
    await chargee().catch(() => {});
    ok('4. Bilan : ' + BCM + ' en base, ' + BC + ' disparu, part inchangée', (parBon(BCM)[0] || [])[2] === parts[2] && parBon(BC).length === 0, JSON.stringify(parBon(BCM)));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await Promise.race([sess.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    DROIT_INFOS.reprendre();
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON LIKE '" + MARQUE + "-TF%'") === '0'
      && q("SELECT COUNT(*) FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = '" + MARQUE + "-CL-TFB-AD2'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
