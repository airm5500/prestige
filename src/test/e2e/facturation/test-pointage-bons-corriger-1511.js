/* POINTAGE DES BONS : CORRIGER PENDANT LE CONTROLE (demande du 15/11).
 * « on rappelle le bouton modifier infos client » et « bouton modifier vente sera appele ici » ; la modification de la
 * vente s'ouvre dans une fenetre modale au-dessus du pointage (accord de l'utilisateur du 15/11).
 *
 * Jeu d'essai (retire a la fin) : organisme d'essai CRA, deux ventes assurance du jour : CR-1 (quantite 2, taux 80) et
 * CR-2 (quantite 1, taux 70), produits differents.
 * Parcours a la souris et au clavier : menu « Bons par organisme », onglet « Pointage », organisme choisi, « Tous » ;
 *  1. CR-1 tape + Entree, « Modifier infos client » : la fenetre de « Ventes terminées » s'ouvre ; n° de bon retape
 *     CR-1M, « Enregistrer », « Non » a l'impression ; la fiche du bon se rouvre avec le nouveau numero ;
 *  2. CR-2, « Modifier vente », motif « Erreur de saisie » : l'ecran de vente s'ouvre dans une fenetre modale, le
 *     pointage reste derriere (meme organisme, meme liste) ; quantite 1 -> 3 tapee dans la grille, montant recu,
 *     « Terminer », « Non » au ticket : la fenetre se ferme, la fiche de CR-2 se rouvre sur la nouvelle vente ;
 *  3. CR-1M, « Modifier vente », puis la croix de la fenetre : rien n'est modifie, la copie est supprimee ;
 *  4. sans le droit de modification de vente (reconnexion) : « Modifier vente » grise, avec le droit requis en bulle.
 * Controles :
 *  - rapprochement fiche / liste / base : n° de bon, part de l'organisme, apres chaque correction ;
 *  - bilan de la modification de vente : origine annulee, une seule nouvelle vente cloturee, bon CR-2 toujours unique,
 *    part = nouvelle base x 70 %, stock du produit = avant - 2, motif VALIDEE ; apres la croix : aucune vente
 *    nouvelle, aucune copie restante, origine intacte, motif retire ;
 *  - bilan de « Modifier infos client » : CR-1M en base, CR-1 n'existe plus, 2 bons pour l'organisme ;
 *  - le pointage n'est jamais recharge par navigation (meme composant) ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/facturation/test-pointage-bons-corriger-1511.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const privilegeEssai = require('../support/privilege-essai');

const P = 'pointagebons';
const DROIT_VENTE = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BT_MODIFICATION_DE_VENTE');

/* bons de l'organisme en base, meme regle que le pointage (vente terminee, non annulee, montant > 0 : la vente
   d'annulation d'une modification, negative, n'est pas un bon) */
const bonsEnBase = (tp) => q("SELECT CONCAT(t.str_REF_BON, '=', t.int_PRICE, '=', p.lg_PREENREGISTREMENT_ID)"
  + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
  + " WHERE l.lg_TIERS_PAYANT_ID = '" + tp + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 ORDER BY t.str_REF_BON").split(/\r?\n/).filter(Boolean)
  .map((x) => { const [bon, part, vente] = x.split('='); return { bon, part: Number(part), vente }; });
const stock = (id) => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + id + "' AND lg_EMPLACEMENT_ID = '1'"));
const motifs = (vente) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', type_operation, statut, motif_libelle) SEPARATOR ' ; '), '') FROM vente_motif WHERE vente_id = '" + vente + "'");

(async () => {
  C.ouvrirCaisse();
  DROIT_VENTE.remettre();
  const TPA = C.tiersPayant('CRA', '1');
  const P1 = C.produit(12, 200), P2 = C.produit(13, 200);
  let sess = await C.connecter();
  let { p, api, erreurs } = sess;
  const pile = (x) => console.log('ERREUR JS  ' + String(x.stack).split(/\r?\n/).slice(0, 6).join(' / '));
  p.on('pageerror', pile);
  const VO = C.venteAssurance(api);
  try {
    const clA = await C.clientAssure(api, 'CRA', [{ tp: TPA, taux: 80 }]);
    const clB = await C.clientAssure(api, 'CRB', [{ tp: TPA, taux: 70 }]);
    const B1 = MARQUE + '-CR1', B1M = MARQUE + '-CR1M', B2 = MARQUE + '-CR2';
    await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 80, bon: B1 }], P1, 2);
    await VO.vendre(clB, [{ lien: clB.lien(TPA), taux: 70, bon: B2 }], P2, 1);
    let base = bonsEnBase(TPA);
    ok('Jeu d\'essai : 2 bons, parts différentes', base.length === 2 && base[0].part !== base[1].part, JSON.stringify(base));
    const venteB2 = base.find((b) => b.bon === B2).vente;

    const ouvrirPointage = async () => {
      await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
      await p.waitForFunction(() => Ext.ComponentQuery.query('bonsorganismeonglets').some((c) => c.isVisible(true)), null, { timeout: 60000 });
      await vues.cliquer(p, 'bonsorganismeonglets #bo-pointage');
      await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), P, { timeout: 30000 });
      await vues.choisir(p, P + ' #ptOrganisme', TPA);
      await p.waitForTimeout(300);
      await p.waitForFunction((x) => !Ext.ComponentQuery.query(x)[0].store.isLoading(), P, { timeout: 60000 });
      await vues.cliquer(p, P + ' #ptFiltre button[valeur=TOUS]');
      await p.waitForTimeout(300);
      await p.waitForFunction((x) => !Ext.ComponentQuery.query(x)[0].store.isLoading(), P, { timeout: 60000 });
      await p.evaluate((x) => { Ext.ComponentQuery.query(x)[0].marqueTest = 'meme-composant'; }, P);
    };
    const scanner = async (bon) => {
      await vues.cliquer(p, P + ' #ptScan');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(bon, { delay: 15 });
      await p.keyboard.press('Enter');
      await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return x.fiche && x.fiche.bon.bon === a[1]; }, [P, bon], { timeout: 30000 });
      await p.waitForTimeout(200);
    };
    const etatEcran = () => p.evaluate((x) => {
      const c = Ext.ComponentQuery.query(x)[0];
      return { marque: c.marqueTest, fiche: c.fiche && { bon: c.fiche.bon.bon, part: c.fiche.bon.part, vente: c.fiche.bon.vente },
        liste: c.store.getRange().map((r) => r.get('bon') + '=' + r.get('part')).sort(), message: c.down('#ptMessage').text,
        client: !c.down('#ptModifClient').isDisabled(), vente: !c.down('#ptModifVente').isDisabled() };
    }, P);
    const listeBase = () => bonsEnBase(TPA).map((b) => b.bon + '=' + b.part).sort();

    await ouvrirPointage();
    /* 1. Modifier infos client */
    await scanner(B1);
    let e = await etatEcran();
    ok('Fiche ouverte : « Modifier infos client » et « Modifier vente » actifs (droits du compte)', e.client && e.vente, JSON.stringify(e));
    await vues.cliquer(p, P + ' #ptModifClient');
    await p.waitForFunction((b) => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').some((f) => f.isVisible(true) && f.getValue() === b), B1, { timeout: 60000 });
    const champ = await p.evaluate((b) => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').filter((f) => f.getValue() === b)[0].inputEl.id, B1);
    await p.click('#' + champ, { clickCount: 3 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type(B1M, { delay: 20 });
    await vues.cliquer(p, 'window[title=Modification vente] #btnAddClientAssurance');
    if (await vues.attendreMessage(p, 'imprimer', 30000)) { await vues.repondre(p, 'no'); }
    await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return x.fiche && x.fiche.bon.bon === a[1] && !x.store.isLoading(); }, [P, B1M], { timeout: 30000 })
      .catch(() => {});
    e = await etatEcran();
    base = bonsEnBase(TPA);
    ok('Infos client : la fiche se rouvre sur le nouveau n° ' + B1M + ', même écran (pas de navigation)', e.fiche && e.fiche.bon === B1M && e.marque === 'meme-composant', JSON.stringify(e));
    ok('Bilan infos client : ' + B1M + ' en base, ' + B1 + ' n\'existe plus, toujours 2 bons', base.length === 2 && base.some((b) => b.bon === B1M) && !base.some((b) => b.bon === B1),
      JSON.stringify(base));
    ok('Rapprochement après infos client : liste = base ; part de la fiche = base', JSON.stringify(e.liste) === JSON.stringify(listeBase())
      && e.fiche.part === base.find((b) => b.bon === B1M).part, JSON.stringify(e.liste) + ' / ' + JSON.stringify(listeBase()));

    /* 2. Modifier vente, en fenetre modale */
    await scanner(B2);
    const stockAvant = stock(P2.id), partAvant = base.find((b) => b.bon === B2).part;
    await vues.cliquer(p, P + ' #ptModifVente');
    await vues.choisirMotif(p, 'Erreur de saisie');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window[cls~=prestige-fenetre-vente]')[0]; const c = testextjs.app.getController('VenteCtr');
      return w && w.isVisible() && c.current && c.current.lgPREENREGISTREMENTID && Ext.ComponentQuery.query('doventemanager #btnCloture').some((x) => x.isVisible(true)); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const fen = await p.evaluate((x) => {
      const w = Ext.ComponentQuery.query('window[cls~=prestige-fenetre-vente]')[0], c = Ext.ComponentQuery.query(x)[0];
      return { modal: w.modal, dansFenetre: !!w.down('doventemanager'), pointage: !!c && !c.isDestroyed && !c.destroyed && c.marqueTest, organisme: c.down('#ptOrganisme').getValue(),
        copie: testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID };
    }, P);
    ok('« Modifier vente » : l\'écran de vente s\'ouvre dans une fenêtre modale ; le pointage reste derrière (même organisme)',
      fen.modal && fen.dansFenetre && fen.pointage === 'meme-composant' && fen.organisme === TPA, JSON.stringify(fen));
    ok('Motif « Erreur de saisie » en cours sur la vente d\'origine', /MODIFICATION\|EN_COURS\|Erreur de saisie/.test(motifs(venteB2)), motifs(venteB2));
    /* quantite 1 -> 3, tapee dans la grille de l'ecran de vente */
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
      const montant = net ? Number(String(net.getValue()).replace(/\D/g, '')) : 0;
      c.getMontantRecu().setValue(montant);
    });
    await vues.cliquer(p, 'doventemanager #btnCloture');
    for (let i = 0; i < 3; i++) {
      const m = await vues.attendreMessage(p, '', 8000);
      if (!m) { break; }
      if (/imprimer/i.test(m)) { await vues.repondre(p, 'no'); } else if (/net à payer/i.test(m)) { await vues.repondre(p, 'ok'); await p.waitForTimeout(1500); await vues.cliquer(p, 'doventemanager #btnCloture'); } else { break; }
    }
    await p.waitForFunction(() => !Ext.ComponentQuery.query('window[cls~=prestige-fenetre-vente]').some((w) => w.isVisible()), null, { timeout: 60000 }).catch(() => {});
    await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return x.fiche && x.fiche.bon.bon === a[1] && x.fiche.bon.vente !== a[2] && !x.store.isLoading(); }, [P, B2, venteB2], { timeout: 30000 })
      .catch(() => {});
    e = await etatEcran();
    base = bonsEnBase(TPA);
    const nouveau = base.find((b) => b.bon === B2) || {};
    const nouvelles = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + venteB2 + "' AND str_STATUT = 'is_Closed' AND int_PRICE > 0");
    ok('Après « Terminer » : fenêtre fermée, retour sur la fiche de ' + B2 + ' (nouvelle vente), même écran', e.fiche && e.fiche.bon === B2 && e.fiche.vente === nouveau.vente
      && e.marque === 'meme-composant' && /vérifiez/.test(e.message || ''), JSON.stringify(e));
    ok('Bilan : origine annulée, une seule nouvelle vente clôturée, ' + B2 + ' toujours unique', q("SELECT b_IS_CANCEL FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteB2 + "'") === '1'
      && nouvelles === '1' && base.filter((b) => b.bon === B2).length === 1, nouvelles + ' ' + JSON.stringify(base));
    const brut3 = Number(q("SELECT SUM(int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + nouveau.vente + "'"));
    ok('Cohérence : part de l\'organisme = nouvelle base × 70 % (± 1) et ≠ part d\'avant ; fiche = liste = base', Math.abs(nouveau.part - Math.round(brut3 * 0.7)) <= 1 && nouveau.part !== partAvant
      && e.fiche.part === nouveau.part && JSON.stringify(e.liste) === JSON.stringify(listeBase()), partAvant + ' → ' + nouveau.part + ' (base ' + brut3 + ')');
    ok('Stock du produit : avant − 2 (1 rendu, 3 sortis)', stock(P2.id) === stockAvant - 2, stockAvant + ' → ' + stock(P2.id));
    ok('Motif validé avec la nouvelle vente', /MODIFICATION\|VALIDEE\|Erreur de saisie/.test(motifs(venteB2)), motifs(venteB2));

    /* 3. Modifier vente puis croix : rien ne change */
    await scanner(B1M);
    const venteB1 = base.find((b) => b.bon === B1M).vente, stockP1 = stock(P1.id);
    await vues.cliquer(p, P + ' #ptModifVente');
    await vues.choisirMotif(p, 'Erreur de saisie');
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr');
      return Ext.ComponentQuery.query('window[cls~=prestige-fenetre-vente]').some((w) => w.isVisible()) && c.current && c.current.lgPREENREGISTREMENTID; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const copie = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    await p.click('.prestige-fenetre-vente .x-tool-close');
    await p.waitForFunction(() => !Ext.ComponentQuery.query('window[cls~=prestige-fenetre-vente]').some((w) => w.isVisible()), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(2500);
    e = await etatEcran();
    ok('Croix de la fenêtre : fenêtre fermée, fiche de ' + B1M + ' de nouveau, même écran', e.fiche && e.fiche.bon === B1M && e.marque === 'meme-composant'
      && !(await p.evaluate(() => Ext.ComponentQuery.query('window[cls~=prestige-fenetre-vente]').some((w) => w.isVisible()))), JSON.stringify(e));
    ok('Bilan de la croix : copie supprimée, origine intacte, aucune nouvelle vente, stock inchangé, motif retiré',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + copie + "' AND str_STATUT = 'is_Process'") === '0'
      && q("SELECT CONCAT(b_IS_CANCEL, str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteB1 + "'") === '0is_Closed'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + venteB1 + "' AND str_STATUT = 'is_Closed'") === '0'
      && stock(P1.id) === stockP1 && !/EN_COURS/.test(motifs(venteB1)), copie + ' · ' + motifs(venteB1) + ' · stock ' + stockP1 + ' → ' + stock(P1.id));
    ok('Aucune erreur JavaScript (droits complets)', erreurs.length === 0, erreurs.join(' | '));

    /* 4. sans le droit de modification de vente */
    await sess.b.close();
    DROIT_VENTE.retirer();
    sess = await C.connecter();
    ({ p, api, erreurs } = sess);
    p.on('pageerror', pile);
    await ouvrirPointage();
    await scanner(B2);
    e = await etatEcran();
    /* ergonomie : la bulle s'affiche au survol du bouton grise et dit le droit qui manque */
    const bouton = await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #ptModifVente')[0].el.id, P);
    await p.hover('#' + bouton);
    const bulle = await p.waitForFunction(() => { const t = Array.from(document.querySelectorAll('.x-tip')).find((x) => x.offsetParent !== null);
      return t ? t.textContent : null; }, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => '');
    ok('Sans le droit de modification de vente : « Modifier vente » grisé, droit requis dans la bulle au survol ; « Modifier infos client » actif',
      !e.vente && /Droit requis : modification de vente/.test(bulle) && e.client, JSON.stringify(e) + ' bulle « ' + bulle + ' »');
    ok('Aucune erreur JavaScript (sans le droit)', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await sess.b.close().catch(() => {});
    DROIT_VENTE.remettre();
    exec(`DELETE FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID = '${TPA}'`);
    C.nettoyer();
    ok('Droit remis, pointages d\'essai retirés', q("SELECT COUNT(*) FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID = '" + TPA + "'") === '0');
    process.exit(C.bilan() ? 1 : 0);
  }
})();
