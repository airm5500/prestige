/* PLAN DU 19/11, POINT 7 : « MODIFIER INFOS CLIENT » ET « MODIFIER » DEPUIS « VENTES TERMINEES ».
 *
 * Constats du pharmacien :
 *  - « Enregistrer » sans rien changer refaisait quand meme la vente (annulation + copie + notification) ; il faut le
 *    signaler, comme la modification de vente, et ne rien ecrire ;
 *  - apres « Modifier infos client » ou « Modifier » (vente), revenir a la recherche telle qu'elle etait (periode).
 *
 * Jeu d'essai (retire a la fin) : organisme d'essai IC, deux ventes assurance du jour : IC-1 (quantite 2, taux 80) et
 * IC-2 (quantite 1, taux 70). Parcours a la souris et au clavier : menu SERVICE CLIENT > « Vente terminées », periode
 * J-3 a J tapee au clavier, « Rechercher » ;
 *  1. ligne IC-1, « Modifier info client », « Enregistrer » sans rien changer : message « Aucun changement », fenetre
 *     fermee, meme ecran, meme periode ; BILAN : aucune vente creee ni annulee, aucune notification, aucune trace de
 *     vente modifiee, bon et part inchanges ;
 *  2. ligne IC-1, « Modifier info client », n° de bon retape IC-1M, « Enregistrer », « Non » a l'impression : meme
 *     ecran (pas de navigation), meme periode, liste relue ; BILAN : IC-1M sur la meme vente (modifiee sur place),
 *     IC-1 n'existe plus, part inchangee, une notification et une trace de vente modifiee ; RAPPROCHEMENT : la liste affiche la nouvelle vente (reference, montant = base) ;
 *  3. ligne IC-2, « Modifier », motif « Erreur de saisie », quantite 1 -> 3 tapee, « Terminer », « Non » : retour a
 *     « Ventes terminées » avec la meme periode (avant : l'ecran de vente restait ouvert, vide) ; BILAN : origine
 *     annulee, une seule nouvelle vente cloturee ; RAPPROCHEMENT : montant de la ligne = base.
 * Lancement seul : node src/test/e2e/vente/test-infos-client-sans-changement-1911.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const privilegeEssai = require('../support/privilege-essai');

const DROIT_VENTE = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BT_MODIFICATION_DE_VENTE');
const DROIT_INFOS = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BTN_UPDATE_VENTE_CLIENT_TP');
const jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const AUJ = new Date(), DEB = new Date(Date.now() - 3 * 86400000);
const VM = 'ventemanager';
const traces = (v) => q("SELECT CONCAT_WS('/', (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' OR lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'),"
  + " (SELECT COUNT(*) FROM notification WHERE entity_ref = '" + v + "'), (SELECT COUNT(*) FROM vente_modifiee WHERE vente_id = '" + v + "' OR vente_origine_id = '" + v + "'),"
  + " (SELECT CONCAT(b_IS_CANCEL, str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'))");
const bon = (v) => q("SELECT CONCAT(str_REF_BON, '=', int_PRICE) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
const parBon = (b) => q("SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_REF, p.int_PRICE) FROM t_preenregistrement_compte_client_tiers_payent t"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID WHERE t.str_REF_BON = '" + b + "' AND p.str_STATUT = 'is_Closed'"
  + " AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0").split(/\r?\n/).filter(Boolean).map((x) => x.split('|'));

(async () => {
  C.ouvrirCaisse();
  DROIT_VENTE.remettre();
  DROIT_INFOS.accorder();
  const TPA = C.tiersPayant('IC', '1');
  const P1 = C.produit(14, 200), P2 = C.produit(15, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  p.on('pageerror', (x) => console.log('ERREUR JS  ' + String(x.stack).split(/\r?\n/).slice(0, 6).join(' / ')));
  const VO = C.venteAssurance(api);
  try {
    const clA = await C.clientAssure(api, 'ICA', [{ tp: TPA, taux: 80 }]);
    const clB = await C.clientAssure(api, 'ICB', [{ tp: TPA, taux: 70 }]);
    const B1 = MARQUE + '-IC1', B1M = MARQUE + '-IC1M', B2 = MARQUE + '-IC2';
    await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 80, bon: B1 }], P1, 2);
    await VO.vendre(clB, [{ lien: clB.lien(TPA), taux: 70, bon: B2 }], P2, 1);
    const [v1, ref1] = parBon(B1)[0] || [], [v2, ref2] = parBon(B2)[0] || [];
    ok('Jeu d\'essai : 2 ventes assurance du jour, parts différentes', !!v1 && !!v2 && bon(v1).split('=')[1] !== bon(v2).split('=')[1], bon(v1) + ' / ' + bon(v2));

    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x + ' #query').some((c) => c.isVisible(true)), VM, { timeout: 60000 });
    await vues.saisir(p, VM + ' #dtStart', jj(DEB));
    await vues.saisir(p, VM + ' #dtEnd', jj(AUJ));
    await vues.cliquer(p, VM + ' #rechercher');
    const chargee = () => p.waitForFunction((x) => { const g = Ext.ComponentQuery.query(x + ' grid')[0]; return g && !g.getStore().isLoading(); }, VM, { timeout: 60000 });
    await chargee();
    await p.evaluate((x) => { Ext.ComponentQuery.query(x)[0].marqueTest = 'meme-ecran'; }, VM);
    const etat = () => p.evaluate((x) => {
      const v = Ext.ComponentQuery.query(x).filter((c) => c.isVisible(true))[0];
      if (!v) { return { visible: false }; }
      const g = v.down('grid');
      return { visible: true, marque: v.marqueTest || null, debut: v.down('#dtStart').getRawValue(), fin: v.down('#dtEnd').getRawValue(),
        lignes: g.getStore().getRange().map((r) => r.get('strREF') + '=' + r.get('intPRICE')) };
    }, VM);
    const depart = await etat();
    ok('Recherche : période J-3 à J affichée', depart.debut === jj(DEB) && depart.fin === jj(AUJ) && depart.lignes.some((l) => l.startsWith(ref1 + '=')), JSON.stringify(depart).slice(0, 300));
    const ligne = (ref) => p.locator('.x-grid-row').filter({ visible: true, hasText: ref }).first();
    const fenetre = async (ref) => {
      await ligne(ref).locator('img[data-qtip="Modifier info client"]').click();
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
        return w && !w.down('#btnModifierClient').isDisabled() && w.down('#refBon'); }, null, { timeout: 30000 });
      await p.waitForTimeout(800);
    };

    /* 1. Enregistrer sans rien changer */
    const t1 = traces(v1), b1 = bon(v1);
    await fenetre(ref1);
    await vues.cliquer(p, 'updateClientTpform #btnAddClientAssurance');
    const message = await p.waitForFunction(() => { const t = document.body.innerText; return /Aucun changement/.test(t) ? t.match(/Aucun changement[^\n]*/)[0] : null; }, null, { timeout: 15000 })
      .then((h) => h.jsonValue()).catch(() => '');
    await p.waitForTimeout(800);
    const fen1 = await p.evaluate(() => Ext.ComponentQuery.query('updateClientTpform').some((w) => w.isVisible()));
    const boite = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()));
    let e = await etat();
    ok('1. « Enregistrer » sans changement : « Aucun changement » signalé, fenêtre fermée, aucune boîte à fermer', /Aucun changement/.test(message) && !fen1 && !boite, message + ' fenêtre ' + fen1 + ' boîte ' + boite);
    ok('1. Même écran, même période', e.visible && e.marque === 'meme-ecran' && e.debut === jj(DEB) && e.fin === jj(AUJ), JSON.stringify(e).slice(0, 200));
    ok('1. Bilan : aucune vente créée ni annulée, aucune notification, aucune trace de vente modifiée ; bon et part inchangés',
      traces(v1) === t1 && t1 === '0/0/0/0is_Closed' && bon(v1) === b1 && parBon(B1).length === 1, t1 + ' → ' + traces(v1) + ' ; ' + b1 + ' → ' + bon(v1));

    /* 2. Modifier le n° de bon */
    await fenetre(ref1);
    const champ = await p.evaluate((b) => Ext.ComponentQuery.query('updateClientTpform #refBon').filter((f) => f.isVisible(true) && f.getValue() === b)[0].inputEl.id, B1);
    await p.click('#' + champ, { clickCount: 3 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type(B1M, { delay: 20 });
    await vues.cliquer(p, 'updateClientTpform #btnAddClientAssurance');
    if (await vues.attendreMessage(p, 'imprimer', 30000)) { await vues.repondre(p, 'no'); }
    await p.waitForTimeout(1500);
    await chargee().catch(() => {});
    e = await etat();
    const n1 = parBon(B1M)[0] || [];
    ok('2. Après « Enregistrer » : même écran (pas de navigation), même période', e.visible && e.marque === 'meme-ecran' && e.debut === jj(DEB) && e.fin === jj(AUJ), JSON.stringify(e).slice(0, 200));
    ok('2. Bilan : ' + B1M + ' en base sur la même vente (modifiée sur place), ' + B1 + ' n\'existe plus, part inchangée ; une notification, une trace de vente modifiée',
      n1[0] === v1 && parBon(B1).length === 0 && bon(v1) === B1M + '=' + b1.split('=')[1] && traces(v1) === '0/1/1/0is_Closed', JSON.stringify(n1) + ' ' + bon(v1) + ' ' + traces(v1));
    ok('2. Rapprochement : la liste relue montre la nouvelle vente, montant = base', e.lignes.includes(n1[1] + '=' + n1[2]), n1[1] + '=' + n1[2] + ' dans ' + e.lignes.length + ' lignes');

    /* 3. Modifier la vente IC-2 */
    await ligne(ref2).locator('img[data-qtip="Modifier"]').click();
    await vues.choisirMotif(p, 'Erreur de saisie');
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr');
      return c.current && c.current.lgPREENREGISTREMENTID && Ext.ComponentQuery.query('doventemanager #btnCloture').some((x) => x.isVisible(true)); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager #venteGrid')[0]; const n = g.getView().getNode(0);
      return n ? '#' + n.id + ' td.vp-col-qd' : null; });
    await p.click(cellule);
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('3', { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('doventemanager #venteGrid')[0]; return g.getStore().getAt(0).get('intQUANTITY') === 3; }, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const c = testextjs.app.getController('VenteCtr'), net = Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0];
      c.getMontantRecu().setValue(net ? Number(String(net.getValue()).replace(/\D/g, '')) : 0);
    });
    await vues.cliquer(p, 'doventemanager #btnCloture');
    for (let i = 0; i < 3; i++) {
      const m = await vues.attendreMessage(p, '', 8000);
      if (!m) { break; }
      if (/imprimer/i.test(m)) { await vues.repondre(p, 'no'); } else if (/net à payer/i.test(m)) { await vues.repondre(p, 'ok'); await p.waitForTimeout(1500); await vues.cliquer(p, 'doventemanager #btnCloture'); } else { break; }
    }
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), VM, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await chargee().catch(() => {});
    e = await etat();
    const n2 = parBon(B2)[0] || [];
    const nouvelles = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v2 + "' AND str_STATUT = 'is_Closed' AND int_PRICE > 0");
    ok('3. Après « Terminer » : retour à « Ventes terminées », même période', e.visible && e.debut === jj(DEB) && e.fin === jj(AUJ), JSON.stringify(e).slice(0, 200));
    ok('3. Bilan : origine annulée, une seule nouvelle vente clôturée, ' + B2 + ' unique', q("SELECT b_IS_CANCEL FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v2 + "'") === '1'
      && nouvelles === '1' && parBon(B2).length === 1 && n2[0] !== v2, nouvelles + ' ' + JSON.stringify(n2));
    ok('3. Rapprochement : la liste montre la nouvelle vente, montant = base', e.lignes.includes(n2[1] + '=' + n2[2]), n2[1] + '=' + n2[2] + ' dans ' + e.lignes.length + ' lignes');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await sess.b.close().catch(() => {});
    DROIT_INFOS.reprendre();
    DROIT_VENTE.remettre();
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON LIKE '" + MARQUE + "-IC%'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
