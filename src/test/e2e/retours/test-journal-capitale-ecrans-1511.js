/* JOURNAL DU SUPPORT DE CAPITALE (31/10 -> 15/11) : QUATRE ERREURS D'ECRAN NON TRAITEES.
 *
 *  n° 27  « rec is undefined » (FactureSubrogatoireBisManager.js:512) : liste des bons par organisme, regroupee par
 *         organisme ; un groupe replie, l'icone « Modifier info client » d'une ligne plus bas ouvrait la vente d'une
 *         autre ligne (ou aucune). Controle : la fenetre ouverte porte le numero de bon de la ligne cliquee, pour
 *         plusieurs lignes, groupe replie puis deplie.
 *  n° 25  « strFIRSTNAME de undefined » (UpdateVenteClientTpForm.js:813/1060) : « Changer le client » vers un assure
 *         dont aucun ayant droit ne porte son numero (numero d'assure change, ayants droit de la famille seule).
 *         Controles : aucune erreur ; l'ayant droit affiche est un ayant droit de ce client (base) ; pour un assure dont
 *         un ayant droit porte son numero, c'est celui-la ; « Annuler » ne change rien en base.
 *  n° 18  « Ext.getCmp(...) is undefined » (detailArticle.js:1553) : ecran de commande, « Voir infos produit », fenetre
 *         fermee avant l'arrivee de la fiche (reponse retenue). Controles : aucune erreur ; puis article A ouvert et
 *         ferme, article B ouvert, la fiche de B arrive puis celle de A : la fenetre montre toujours B (base).
 *  n° 61  Ext.JSON.decode d'une chaine vide (Header.js:297/314) : deconnexion. Controles : serveur injoignable = message
 *         lisible, aucune erreur, on reste connecte ; double clic sur « Se déconnecter » = une seule demande ; session
 *         deja fermee (401) = retour a l'ecran de connexion.
 * Jeu d'essai retire a la fin (ventes, clients, ayants droit, organismes, commande).
 * Lancement seul : node src/test/e2e/retours/test-journal-capitale-ecrans-1511.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const { ok, q, exec, MARQUE } = C;

const ECRAN = 'facturesubrogatoireother';
/* SECTIONS=18,61 : ne lancer que ces parties (27 et 25 vont ensemble) */
const faire = (n) => !process.env.SECTIONS || process.env.SECTIONS.split(',').indexOf(n) >= 0 || (n === '27' && process.env.SECTIONS.split(',').indexOf('25') >= 0);
const CMD = MARQUE + '-CMD1511';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");

async function attendreListe(p) {
  await p.waitForTimeout(400);
  await p.waitForFunction((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g && !g.getStore().isLoading(); }, ECRAN, { timeout: 60000 });
  await p.waitForTimeout(600);
}
const fenetreVente = 'window[title=Modification vente]';
async function fermerFenetreVente(p) {
  const id = await p.evaluate((f) => { const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0]; const b = w && w.down('#btnCancelAssClient'); return b ? b.getId() : null; }, fenetreVente);
  if (id) { await p.click('#' + id); }
  await p.waitForFunction((f) => !Ext.ComponentQuery.query(f).some((x) => x.isVisible()), fenetreVente, { timeout: 15000 }).catch(() => {});
}
/* icone « Modifier info client » de la ligne visible qui porte ce bon ; numero de bon de la fenetre ouverte */
async function ouvrirBon(p, bon) {
  const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: bon }).first();
  await ligne.waitFor({ timeout: 30000 });
  await ligne.locator('img[data-qtip="Modifier info client"]').click();
  await p.waitForFunction((f) => Ext.ComponentQuery.query(f + ' #refBon').some((c) => c.isVisible(true) && c.getValue()), fenetreVente, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  return p.evaluate((f) => Ext.ComponentQuery.query(f + ' #refBon').filter((c) => c.isVisible(true)).map((c) => c.getValue()), fenetreVente);
}
const ayantAffiche = (p) => p.evaluate((f) => { const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0];
  return w ? { num: w.down('#numAyantDroit').getValue(), nom: w.down('#nomAyantDroit').getValue(), id: w.ayantDroitId || null } : null; }, fenetreVente);

(async () => {
  C.ouvrirCaisse();
  const TPA = C.tiersPayant('J1A', '1'), TPB = C.tiersPayant('J1B', '1');
  const P1 = C.produit(6, 200), P2 = C.produit(7, 200), P3 = C.produit(8, 200), P4 = C.produit(9, 200);
  exec(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${CMD}';`
    + ` INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${CMD}', '${CMD}', 1, '${G}', '${C.ADMIN}', 'is_Process', NOW(), NOW(), 0, 0, 0);`
    + ` INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${CMD}-0', '${CMD}', '${P1.id}', '${G}', 2, 0, 1000, 2000, 1000, 2000, 'is_Process', NOW(), NOW())`);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  try {
    /* ---- jeu d'essai : 4 bons, 2 organismes ; un assure sans ayant droit a son numero ---- */
    const clA = await C.clientAssure(api, 'J1A', [{ tp: TPA, taux: 70 }]);
    const clA2 = await C.clientAssure(api, 'J1A2', [{ tp: TPA, taux: 80 }]);
    const clB = await C.clientAssure(api, 'J1B', [{ tp: TPB, taux: 90 }]);
    const clC = await C.clientAssure(api, 'J1C', [{ tp: TPA, taux: 60 }]);
    exec(`UPDATE t_ayant_droit SET str_NUMERO_SECURITE_SOCIAL = '${MARQUE}-J1C-ANCIEN', str_FIRST_NAME = 'CONJOINT' WHERE lg_AYANTS_DROITS_ID = '${clC.clientId}';`
      + ` INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, str_STATUT, dt_CREATED, dt_UPDATED)`
      + ` VALUES ('${clC.clientId}-E', '${clC.clientId}', 'ENFANT', '${MARQUE} J1C', '${MARQUE}-J1C-ENFANT', 'F', 'enable', NOW(), NOW())`);
    const B = [MARQUE + '-J1', MARQUE + '-J2', MARQUE + '-J3', MARQUE + '-J4'];
    await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 70, bon: B[0] }], P1, 2);
    await VO.vendre(clA2, [{ lien: clA2.lien(TPA), taux: 80, bon: B[1] }], P2, 1);
    await VO.vendre(clB, [{ lien: clB.lien(TPB), taux: 90, bon: B[2] }], P3, 3);
    await VO.vendre(clB, [{ lien: clB.lien(TPB), taux: 90, bon: B[3] }], P4, 1);
    const enBase = Number(q(`SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON IN ('${B.join("','")}')`));
    const adC = q(`SELECT str_NUMERO_SECURITE_SOCIAL FROM t_ayant_droit WHERE lg_CLIENT_ID = '${clC.clientId}' AND str_STATUT = 'enable'`).split(/\r?\n/).filter(Boolean);
    ok('Jeu d\'essai : 4 bons (2 par organisme) ; assuré C : 2 ayants droit, aucun à son numéro', enBase === 4 && adC.length === 2 && adC.indexOf(MARQUE + '-J1C') < 0,
      enBase + ' | ' + adC.join(','));

    if (faire('27')) {
    /* ---- n° 27 : liste regroupee, groupe replie ---- */
    await V.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN, { timeout: 60000 });
    await p.mouse.move(1000, 600);
    await attendreListe(p);
    const groupes = await p.evaluate((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0];
      return g.getStore().getGroups().map((x) => x.name + ':' + x.children.map((r) => r.get('strREFBON')).sort().join(',')); }, ECRAN);
    ok('n° 27 : la liste montre les 4 bons d\'essai en 2 groupes', groupes.length >= 2 && B.every((b) => groupes.join(' ').indexOf(b) >= 0), JSON.stringify(groupes));
    let r = await ouvrirBon(p, B[3]);
    ok('n° 27 : groupes dépliés, « Modifier info client » ouvre le bon de la ligne cliquée (' + B[3] + ')', r.length === 1 && r[0] === B[3], JSON.stringify(r));
    await fermerFenetreVente(p);
    /* replier le premier groupe affiche (clic sur son en-tete) */
    await p.locator('.x-grid-group-hd').filter({ visible: true }).first().click();
    await p.waitForTimeout(800);
    const premierGroupe = await p.evaluate((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g.getStore().getGroups()[0].children.map((x) => x.get('strREFBON')); }, ECRAN);
    const apres = B.filter((b) => premierGroupe.indexOf(b) < 0);
    for (const bon of apres) {
      r = await ouvrirBon(p, bon);
      ok('n° 27 : premier groupe replié, « Modifier info client » ouvre le bon de la ligne cliquée (' + bon + ')', r.length === 1 && r[0] === bon, JSON.stringify(r));
      await fermerFenetreVente(p);
    }
    ok('n° 27 : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await p.locator('.x-grid-group-hd').filter({ visible: true }).first().click();
    await p.waitForTimeout(600);

    /* ---- n° 25 : Changer le client ---- */
    const changer = async (nomClient) => {
      await V.cliquer(p, fenetreVente + ' #btnModifierInfo');
      await p.waitForFunction(() => Ext.ComponentQuery.query('window[title=CHOISIR UN ASSURE] #lgCLIENTID').some((c) => c.isVisible(true)), null, { timeout: 15000 });
      await V.cliquer(p, 'window[title=CHOISIR UN ASSURE] #lgCLIENTID');
      await p.keyboard.type(nomClient, { delay: 30 });
      const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: nomClient }).first();
      await item.waitFor({ timeout: 20000 });
      await item.click();
      await p.waitForTimeout(300);
      await V.cliquer(p, 'window[title=CHOISIR UN ASSURE] button[text=Valider]');
      await p.waitForTimeout(1000);
    };
    const avant = q(`SELECT CONCAT_WS('|', lg_CLIENT_ID, lg_AYANTS_DROITS_ID) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON = '${B[0]}')`);
    await ouvrirBon(p, B[0]);
    const nErr = erreurs.length;
    await changer(MARQUE + ' J1C');
    let a = await ayantAffiche(p);
    ok('n° 25 : assuré sans ayant droit à son numéro : aucune erreur', erreurs.length === nErr, erreurs.slice(nErr).join(' | '));
    ok('n° 25 : l\'ayant droit affiché est un ayant droit de cet assuré (base)', a && adC.indexOf(a.num) >= 0 && !!a.id, JSON.stringify(a));
    await changer(MARQUE + ' J1A2');
    a = await ayantAffiche(p);
    ok('n° 25 : assuré dont un ayant droit porte son numéro : c\'est celui-là', a && a.num === MARQUE + '-J1A2' && a.id === clA2.clientId, JSON.stringify(a));
    await fermerFenetreVente(p);
    const apresAnnuler = q(`SELECT CONCAT_WS('|', lg_CLIENT_ID, lg_AYANTS_DROITS_ID) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON = '${B[0]}')`);
    ok('n° 25 : « Annuler » ne change ni le client ni l\'ayant droit de la vente en base', avant === apresAnnuler, avant + ' / ' + apresAnnuler);

    }
    if (faire('18')) {
    /* ---- n° 18 : fiche article, reponse apres la fermeture ---- */
    const retenues = [];
    await p.route('**/api/v1/produit-search/fiche?*', (route) => {
      /* la vraie reponse est demandee tout de suite ; seule sa remise a l'ecran est retenue */
      if (/produitId=/.test(route.request().url())) { route.reponse = route.fetch({ timeout: 120000 }); retenues.push(route); } else { route.continue(); }
    });
    await V.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.evaluate((c) => { Ext.getCmp('rechecher').setValue(c); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, CMD);
    await p.waitForFunction((c) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', c) >= 0; }, CMD, { timeout: 30000 });
    await p.evaluate((c) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', c)); }, CMD);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const choisirProduit = async (P) => {
      const cip = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P.id}'`);
      await p.click('#' + await p.evaluate(() => Ext.getCmp('str_NAME').inputEl.dom.id), { clickCount: 3 });
      await p.keyboard.press('Control+A');
      await p.keyboard.type(cip, { delay: 30 });
      const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: cip }).first();
      await item.waitFor({ timeout: 20000 });
      await item.click();
      await p.waitForFunction((id) => Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue() === id && !Ext.getCmp('btn_detail').isDisabled(), P.id, { timeout: 15000 });
    };
    const ouvrirFiche = async () => {
      await V.cliquer(p, '#btn_detail');
      await p.waitForFunction(() => window.winDetailArticleOuverte && winDetailArticleOuverte.isVisible(), null, { timeout: 20000 });
      await p.waitForTimeout(600);
    };
    const fermerFiche = async () => {
      /* pendant le chargement un masque couvre la fenetre : on la ferme par sa croix, sinon par Echap, comme a la main */
      const croix = await p.evaluate(() => { const t = winDetailArticleOuverte.down('tool[type=close]'); return t ? t.getId() : null; });
      const parCroix = croix ? await p.click('#' + croix, { timeout: 3000 }).then(() => true).catch(() => false) : false;
      if (!parCroix) { await p.keyboard.press('Escape'); }
      await p.waitForFunction(() => !window.winDetailArticleOuverte, null, { timeout: 15000 });
    };
    const lacher = async (route) => {
      const reponse = await route.reponse;
      await route.fulfill({ response: reponse });
      await p.waitForTimeout(1500);
    };
    await choisirProduit(P1);
    const e18 = erreurs.length;
    await ouvrirFiche();
    await fermerFiche();
    ok('n° 18 : la fiche est demandée puis la fenêtre fermée avant la réponse', retenues.length === 1);
    await lacher(retenues.shift());
    ok('n° 18 : fiche arrivée après la fermeture : aucune erreur', erreurs.length === e18, erreurs.slice(e18).join(' | '));
    /* A ouvert puis ferme, B ouvert : B arrive, puis A */
    await ouvrirFiche();
    await fermerFiche();
    await choisirProduit(P2);
    await ouvrirFiche();
    ok('n° 18 : deux fiches demandées (A puis B)', retenues.length === 2);
    const [rA, rB] = [retenues.shift(), retenues.shift()];
    await lacher(rB);
    const nomB = q(`SELECT str_DESCRIPTION FROM t_famille WHERE lg_FAMILLE_ID = '${P2.id}'`);
    const vuB = await p.evaluate(() => Ext.getCmp('str_DESCRIPTION').getValue());
    ok('n° 18 : la fiche de B s\'affiche (désignation = base)', vuB === nomB, vuB + ' / ' + nomB);
    await lacher(rA);
    const vuApres = await p.evaluate(() => ({ nom: Ext.getCmp('str_DESCRIPTION').getValue(), ouverte: !!window.winDetailArticleOuverte }));
    ok('n° 18 : la fiche de A arrivée ensuite ne remplace pas celle de B', vuApres.ouverte && vuApres.nom === nomB, JSON.stringify(vuApres) + ' / ' + nomB);
    ok('n° 18 : aucune erreur JavaScript', erreurs.length === e18, erreurs.slice(e18).join(' | '));
    await fermerFiche();
    await p.unroute('**/api/v1/produit-search/fiche?*');

    }
    if (faire('61')) {
    /* ---- n° 61 : deconnexion ---- */
    const e61 = erreurs.length;
    const appels = [];
    let mode = 'coupe';
    await p.route('**/api/v1/user/logout', async (route) => {
      appels.push(mode);
      if (mode === 'coupe') { return route.abort('connectionrefused'); }
      if (mode === '401') { return route.fulfill({ status: 401, body: '' }); }
      await new Promise((res) => setTimeout(res, 800));
      return route.abort('connectionrefused');
    });
    const deconnecter = async (double) => {
      await p.click('.hdr-logout');
      const bouton = p.locator('.x-message-box a.x-btn, .x-message-box .x-btn').filter({ visible: true, hasText: 'Se déconnecter' }).first();
      await bouton.waitFor({ timeout: 10000 });
      if (double) { await bouton.dblclick({ force: true }).catch(() => {}); } else { await bouton.click(); }
      await p.waitForTimeout(1500);
    };
    await deconnecter(false);
    const msg = await V.texteMessage(p).catch(() => '');
    ok('n° 61 : serveur injoignable : message lisible, aucune erreur, on reste connecté', /ne répond pas/.test(msg) && erreurs.length === e61 && /\/general\//.test(p.url()),
      JSON.stringify({ msg, err: erreurs.slice(e61), url: p.url() }));
    await V.repondre(p, 'ok').catch(() => {});
    await p.waitForTimeout(500);
    mode = 'lent'; appels.length = 0;
    await deconnecter(true);
    await p.click('.hdr-logout').catch(() => {});
    await p.waitForTimeout(400);
    ok('n° 61 : double clic sur « Se déconnecter » : une seule demande de déconnexion', appels.length === 1, appels.join(','));
    await p.waitForTimeout(1200);
    await V.repondre(p, 'ok').catch(() => {});
    await p.keyboard.press('Escape').catch(() => {});
    ok('n° 61 : aucune erreur JavaScript', erreurs.length === e61, erreurs.slice(e61).join(' | '));
    mode = '401'; appels.length = 0;
    const pages = []; p.on('request', (r) => { if (r.isNavigationRequest()) { pages.push(r.url()); } });
    await deconnecter(false);
    /* la session du test est encore ouverte cote serveur (401 simule) : on controle la demande de l'ecran de connexion */
    await p.waitForTimeout(3000);
    ok('n° 61 : session déjà fermée (401) : l\'écran part vers l\'écran de connexion (action=logout), sans erreur',
      pages.some((u) => /index\.jsp\?content=panelInfos\.jsp&lng=fr&action=logout/.test(u)) && erreurs.length === e61, pages.join(' , ') + ' | ' + erreurs.slice(e61).join(' | '));
    }
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    exec(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${CMD}';`);
    C.nettoyer();
    ok('Nettoyage : commande d\'essai retirée', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${CMD}'`) === '0');
    process.exit(C.bilan() ? 1 : 0);
  }
})();
