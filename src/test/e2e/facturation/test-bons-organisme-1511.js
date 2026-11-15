/* PLAN DU 14/11, POINT 3 : LISTE DES BONS PAR ORGANISME.
 *  a. apres « Modifier info client » sur un bon, l'ecran reste sur la liste (plus de renvoi vers « Ventes terminées »),
 *     avec ses filtres et sa page, et la ligne montre le nouveau numero de bon ;
 *  b. une croix de vidage sur le tiers payant, le type et le groupe : la recherche repart sans ce filtre ;
 *  c. un onglet « Bordereaux / suivi » (ecran « Suivi des bons » de la Facturation) dans le meme ecran.
 *
 * Jeu d'essai (retire a la fin) : deux organismes d'essai TPA (dans un groupe d'essai) et TPB, trois ventes assurance
 * du jour : deux pour TPA (quantites 2 et 1, produits differents, taux 70 et 80), une pour TPB (quantite 3).
 * Parcours a la souris : menu « Bons par organisme » (Gestion courante), groupe choisi dans sa liste, croix, tiers payant choisi,
 * icone « Modifier info client », numero de bon retape, « Enregistrer », « Non » a l'impression du ticket.
 * Controles :
 *  - rapprochement : lignes de la liste (numero de bon, montant) = base, ligne par ligne ; montant et nombre de bons
 *    affiches = base ; dans l'onglet de suivi, la ligne de TPA (montant, nombre de dossiers) = base ;
 *  - bilan de la modification : le bon modifie porte le nouveau numero en base, l'ancien n'existe plus, le nombre de
 *    bons de TPA est inchange ;
 *  - recherche par numero de bon (filtre TPA) = base ; recherche avec une apostrophe sans erreur ;
 *  - non-regression : depuis « Ventes terminées », la meme modification renvoie toujours a la liste des ventes.
 * Lancement seul : node src/test/e2e/facturation/test-bons-organisme-1511.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');

const GROUPE = MARQUE + '-G1411';
const ECRAN = 'facturesubrogatoireother';
/* bons de l'organisme en base (vente du jour, terminee, non annulee) : numero -> montant */
const bonsEnBase = (tp) => q("SELECT CONCAT(t.str_REF_BON, '=', t.int_PRICE) FROM t_preenregistrement_compte_client_tiers_payent t"
  + " JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
  + " WHERE l.lg_TIERS_PAYANT_ID = '" + tp + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND t.str_STATUT = 'is_Closed' ORDER BY t.str_REF_BON")
  .split(/\r?\n/).filter(Boolean).sort();

const lignesListe = (p) => p.evaluate((e) => {
  const g = Ext.ComponentQuery.query(e + ' gridpanel').filter((x) => x.isVisible(true))[0];
  return g ? g.getStore().getRange().map((r) => r.get('strREFBON') + '=' + r.get('intPRICE')).sort() : null;
}, ECRAN);
const filtres = (p) => p.evaluate((e) => ['tiersPayantId', 'typeTiersPayantId', 'groupeId'].map((i) => {
  const c = Ext.ComponentQuery.query(e + ' #' + i)[0]; return c ? c.getValue() : 'absent';
}), ECRAN);
async function attendreChargement(p) {
  await p.waitForTimeout(400);
  await p.waitForFunction((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g && !g.getStore().isLoading(); }, ECRAN, { timeout: 60000 });
  await p.waitForTimeout(400);
}
async function croix(p, itemId) {
  const id = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0];
    return c && c.triggerEl && c.triggerEl.getCount() > 1 ? c.triggerEl.item(1).dom.id : null; }, ECRAN + ' #' + itemId);
  if (!id) { return false; }
  await p.click('#' + id);
  await attendreChargement(p);
  return true;
}
const montantAffiche = (p) => p.evaluate((e) => {
  const m = Ext.ComponentQuery.query(e + ' #montant')[0], n = Ext.ComponentQuery.query(e + ' #nbreBonSug')[0];
  return { montant: String(m.getValue()).replace(/\D/g, ''), nbre: String(n.getValue()).replace(/\D/g, '') };
}, ECRAN);

/* icone « Modifier info client » de la ligne du bon, nouveau numero tape, Enregistrer, « Non » a l'impression */
async function modifierBon(p, ecran, bon, nouveau) {
  const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: bon }).first();
  await ligne.waitFor({ timeout: 30000 });
  await ligne.locator('img[data-qtip="Modifier info client"]').click();
  await p.waitForFunction((b) => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').some((f) => f.isVisible(true) && f.getValue() === b), bon, { timeout: 60000 });
  const champ = await p.evaluate((b) => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').filter((f) => f.getValue() === b)[0].inputEl.id, bon);
  await p.click('#' + champ, { clickCount: 3 });
  await p.keyboard.press('Control+A');
  await p.keyboard.type(nouveau, { delay: 20 });
  await vues.cliquer(p, 'window[title=Modification vente] #btnAddClientAssurance');
  const msg = await vues.attendreMessage(p, 'imprimer', 30000);
  if (msg) { await vues.repondre(p, 'no'); }
  await p.waitForTimeout(1500);
  return msg;
}

(async () => {
  C.ouvrirCaisse();
  exec("DELETE FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'; INSERT INTO t_groupe_tierspayant (str_LIBELLE) VALUES ('" + GROUPE + "')");
  const groupeId = q("SELECT lg_GROUPE_ID FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'");
  const TPA = C.tiersPayant('BOA', '1', "lg_GROUPE_ID = " + groupeId), TPB = C.tiersPayant('BOB', '1');
  const P1 = C.produit(3, 200), P2 = C.produit(4, 200), P3 = C.produit(5, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  const requetes = []; p.on('request', (r) => { if (r.url().indexOf('facture-subro/list') >= 0) { requetes.push(decodeURIComponent(r.url()).replace(/^.*\?/, '')); } });
  try {
    const clA = await C.clientAssure(api, 'BOA', [{ tp: TPA, taux: 70 }]);
    const clA2 = await C.clientAssure(api, 'BOA2', [{ tp: TPA, taux: 80 }]);
    const clB = await C.clientAssure(api, 'BOB', [{ tp: TPB, taux: 90 }]);
    const BON1 = MARQUE + '-B1', BON2 = MARQUE + '-B2', BON3 = MARQUE + '-B3', NOUVEAU = MARQUE + '-B1M';
    await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 70, bon: BON1 }], P1, 2);
    await VO.vendre(clA2, [{ lien: clA2.lien(TPA), taux: 80, bon: BON2 }], P2, 1);
    await VO.vendre(clB, [{ lien: clB.lien(TPB), taux: 90, bon: BON3 }], P3, 3);
    const baseA = bonsEnBase(TPA), baseB = bonsEnBase(TPB);
    ok('Jeu d\'essai : 2 bons pour TPA (montants différents), 1 pour TPB', baseA.length === 2 && baseB.length === 1 && baseA[0].split('=')[1] !== baseA[1].split('=')[1],
      baseA.join(', ') + ' | ' + baseB.join(', '));

    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN, { timeout: 60000 });
    await p.mouse.move(1000, 600); await p.mouse.click(1000, 33);
    await attendreChargement(p);
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('bonsorganismeonglets').filter((x) => x.isVisible(true)).map((x) =>
      Ext.ComponentQuery.query('button[cls=cec-onglet]', x).filter((b) => b.isVisible(true)).map((b) => b.getText())));
    ok('c. l\'écran s\'ouvre avec deux onglets « Bons » et « Bordereaux / suivi »', onglets.length === 1 && onglets[0].join('|') === 'Bons|Bordereaux / suivi', JSON.stringify(onglets));

    /* b. groupe choisi dans sa liste, puis croix */
    await vues.choisir(p, ECRAN + ' #groupeId', GROUPE);
    await attendreChargement(p);
    let l = await lignesListe(p);
    ok('Groupe d\'essai : la liste montre les 2 bons de TPA, = base ligne par ligne', JSON.stringify(l) === JSON.stringify(baseA), JSON.stringify(l));
    const tot = await montantAffiche(p);
    const totBase = baseA.reduce((s, x) => s + Number(x.split('=')[1]), 0);
    ok('Montant et nombre de bons affichés = base (' + totBase + ', 2)', tot.montant === String(totBase) && tot.nbre === '2', JSON.stringify(tot));
    const vide = await croix(p, 'groupeId');
    l = await lignesListe(p);
    const f0 = await filtres(p);
    ok('b. croix du groupe : champ vidé, la recherche n\'est plus filtrée (les bons de TPB reviennent)', vide && !f0[2] && l.indexOf(baseB[0]) >= 0 && l.indexOf(baseA[0]) >= 0,
      JSON.stringify({ vide, f0, n: l && l.length }));

    /* tiers payant choisi, croix, type choisi, croix */
    await vues.choisir(p, ECRAN + ' #tiersPayantId', TPB);
    await attendreChargement(p);
    l = await lignesListe(p);
    ok('Tiers payant TPB choisi : seul son bon', JSON.stringify(l) === JSON.stringify(baseB), JSON.stringify(l) + ' ; filtres ' + JSON.stringify(await filtres(p)) + ' ; requête ' + requetes[requetes.length - 1]);
    await croix(p, 'tiersPayantId');
    l = await lignesListe(p);
    ok('b. croix du tiers payant : champ vidé, liste non filtrée', !(await filtres(p))[0] && l.indexOf(baseA[0]) >= 0 && l.indexOf(baseB[0]) >= 0, l && l.length);
    await vues.choisir(p, ECRAN + ' #typeTiersPayantId', 0);
    await attendreChargement(p);
    const t1 = (await filtres(p))[1];
    await croix(p, 'typeTiersPayantId');
    ok('b. croix du type : champ vidé', !!t1 && !(await filtres(p))[1], JSON.stringify(t1));

    /* a. modification d'un bon depuis la liste filtree sur TPA */
    await vues.choisir(p, ECRAN + ' #tiersPayantId', TPA);
    await attendreChargement(p);
    const msg = await modifierBon(p, ECRAN, BON1, NOUVEAU);
    ok('a. la question d\'impression du ticket est posée', !!msg, msg);
    await attendreChargement(p).catch(() => {});
    const encore = await p.evaluate((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN);
    const ventes = await p.evaluate(() => Ext.ComponentQuery.query('ventemanager').some((c) => c.isVisible(true)));
    ok('a. après la modification, l\'écran reste sur la liste des bons (pas de renvoi vers « Ventes terminées »)', encore && !ventes, JSON.stringify({ encore, ventes }));
    const f1 = await filtres(p);
    ok('a. le filtre sur TPA est conservé', f1[0] === TPA, JSON.stringify(f1));
    const apresA = bonsEnBase(TPA);
    l = await lignesListe(p);
    ok('a. bilan : le bon porte le nouveau numéro en base, l\'ancien n\'existe plus, toujours 2 bons pour TPA',
      apresA.length === 2 && apresA.some((x) => x.indexOf(NOUVEAU + '=') === 0) && !apresA.some((x) => x.indexOf(BON1 + '=') === 0), apresA.join(', '));
    ok('a. rapprochement : la liste relue montre le nouveau numéro, = base ligne par ligne', JSON.stringify(l) === JSON.stringify(apresA), JSON.stringify(l));

    /* c. onglet de suivi */
    if (onglets.length) {
      await vues.cliquer(p, 'bonsorganismeonglets button[itemId=bo-suivi]');
      await p.waitForFunction(() => Ext.ComponentQuery.query('tpventes').some((c) => c.isVisible(true)), null, { timeout: 30000 });
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('tpventes #uggid')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 })
        .catch(() => {});
      const suivi = await p.evaluate((tp) => {
        const g = Ext.ComponentQuery.query('tpventes #uggid')[0];
        const r = g.getStore().getRange().filter((x) => JSON.stringify(x.raw).indexOf(tp) >= 0)[0];
        return r ? { montant: r.get('montant'), dossiers: r.get('nbreDossier') } : null;
      }, TPA);
      const montantA = apresA.reduce((s, x) => s + Number(x.split('=')[1]), 0);
      ok('c. onglet « Bordereaux / suivi » : ligne de TPA = base (montant ' + montantA + ', 2 dossiers)', suivi && Number(suivi.montant) === montantA && Number(suivi.dossiers) === 2,
        JSON.stringify(suivi));
      await vues.cliquer(p, 'bonsorganismeonglets button[itemId=bo-bons]');
      await p.waitForTimeout(500);
      ok('c. retour à l\'onglet « Bons » : la liste et son filtre sont toujours là', (await filtres(p))[0] === TPA && (await p.evaluate((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN)));
    }

    /* recherche au clavier (numero de bon), avec le filtre TPA : passe desormais en parametre lie */
    await vues.cliquer(p, ECRAN + ' #query');
    await p.keyboard.type(BON2, { delay: 20 });
    await p.keyboard.press('Enter');
    await attendreChargement(p);
    l = await lignesListe(p);
    ok('Recherche « ' + BON2 + ' » (filtre TPA) : son seul bon, = base', JSON.stringify(l) === JSON.stringify(apresA.filter((x) => x.indexOf(BON2 + '=') === 0)), JSON.stringify(l));
    await vues.cliquer(p, ECRAN + ' #query');
    await p.keyboard.press('Control+A');
    await p.keyboard.type("D'ESSAI", { delay: 20 });
    await p.keyboard.press('Enter');
    await attendreChargement(p);
    ok('Recherche avec une apostrophe : aucune ligne, aucune erreur', JSON.stringify(await lignesListe(p)) === '[]' && erreurs.length === 0, erreurs.join(' | '));

    /* non-regression : depuis « Ventes terminées », la modification renvoie toujours a la liste des ventes */
    const v3 = q("SELECT t.lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.str_REF_BON = '" + BON3 + "' AND t.str_STATUT = 'is_Closed' LIMIT 1");
    await p.evaluate((v) => { Ext.create('testextjs.view.vente.user.UpdateVenteClientTpForm', { venteId: v }).show(); }, v3);
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').some((f) => f.isVisible(true) && f.getValue()), null, { timeout: 60000 });
    await vues.cliquer(p, 'window[title=Modification vente] #btnAddClientAssurance');
    if (await vues.attendreMessage(p, 'imprimer', 30000)) { await vues.repondre(p, 'no'); }
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager').some((c) => c.isVisible(true)), null, { timeout: 30000 }).catch(() => {});
    ok('Non-régression : sans rappel (appel de « Ventes terminées »), retour à la liste des ventes comme avant',
      await p.evaluate(() => Ext.ComponentQuery.query('ventemanager').some((c) => c.isVisible(true))));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    ok('Nettoyage : groupe d\'essai retiré', q("SELECT COUNT(*) FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'") === '0');
    process.exit(C.bilan() ? 1 : 0);
  }
})();
