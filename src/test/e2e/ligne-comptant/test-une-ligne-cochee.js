/* CAS 1 DU 03/11/2026, TEST D'ECRAN 2 : parametre a 1, vente assurance a un tiers-payant (70 %), deux articles,
 * remise produit de 5 %, le second article coche « C ».
 *
 *  1. la colonne « C » (40 px) est la, apres MONTANT ; le rail montre DONT COMPTANT (0) et DONT PART CLIENT ;
 *  2. clic sur « C » : PUT accepte, ligne sur fond jaune avec la pastille COMPTANT, net recalcule :
 *     DONT COMPTANT = prix - 5 % arrondi a 5, DONT PART CLIENT = net - comptant, part tiers-payant sur la ligne
 *     assurance seulement ;
 *  3. « TERMINER LA VENTE » : deux ventes closes et liees, la ligne cochee dans la vente comptant, un mouvement de
 *     caisse chacune, reglement impute comptant d'abord, recettes, stock sorti une fois par produit, bandeau « scindée »,
 *     ticket/vo appele ;
 *  4. annuler la vente comptant (Ventes terminees) ne touche pas la vente assurance.
 * Tout est retire a la fin (ventes, client, tiers-payant, remise, parametre, stock, caisse).
 * Lancement seul : node src/test/e2e/ligne-comptant/test-une-ligne-cochee.js
 */
const C = require('./commun');
const { ok, q, A } = C;

const arrondi5 = (v) => (v <= 0 ? 0 : (v % 5 === 0 ? v : v + (5 - (v % 5))));

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  /* grille de reference du cas 1 : sans les colonnes du prix de reference (cas 2), quel que soit le reglage du poste */
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const TP = A.tiersPayant('C2', '1');
  const P1 = C.produitSimple(2);
  const P2 = C.produitSimple(3);
  const CIP1 = C.cip(P1);
  const CIP2 = C.cip(P2);
  C.remiseEssai(5, [P1, P2]);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  p.on('pageerror', (e) => console.log('  (erreur JS) ' + String(e.stack || e.message).slice(0, 600)));
  try {
    const cl = await A.clientAssure(api, 'CPT2', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' CPT2');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-C2');
    await C.taperArticle(p, CIP1);
    await C.taperArticle(p, CIP2);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    await C.choisirRemise(p, C.MARQUE + ' 5');
    await p.evaluate(() => testextjs.app.getController('VenteCtr').autoComputeNetAssurance());
    await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    ok('Préparation : vente assurance, deux articles, remise 5 %', !!venteId && C.lignes(venteId).split(' ; ').length === 2, venteId + ' ' + C.lignes(venteId));

    /* 1. colonne et rail */
    const e1 = await C.entete(p);
    ok('Colonne « C » visible, 40 px, après MONTANT', e1 && e1.colonneCVisible && e1.largeurC === 40 && e1.textes === ',C.CIP,DESIGNATION,QD,QS,P.U,MONTANT,C,', JSON.stringify(e1));
    const r0 = await C.rail(p);
    ok('Rail : DONT COMPTANT (0) et DONT PART CLIENT (= net) visibles avant toute coche', r0.comptant && r0.comptant.visible && r0.comptant.valeur === 0 && r0.partClient.visible
      && r0.partClient.valeur === r0.net.valeur, JSON.stringify(r0));

    /* 2. cochage */
    const put = await C.cocher(p, CIP2);
    ok('Clic sur « C » : PUT item/{id}/comptant accepté', put && put.http === 200 && put.success === true && put.comptant === true, JSON.stringify(put));
    const l2 = await C.ligne(p, CIP2);
    ok('Ligne cochée sur fond jaune pâle avec la pastille COMPTANT', l2 && l2.comptant && l2.fondJaune && l2.pastille, JSON.stringify(l2));
    ok('En base : la ligne porte comptant = 1', q("SELECT comptant FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + l2.detailId + "'") === '1');
    const r1 = await C.rail(p);
    /* la part de l'organisme vient du moteur (arrondi du moteur) : on verifie qu'elle vaut 70 % de la ligne assurance a 1 F pres */
    const partTp = r1.montantTp;
    ok('Part tiers-payant = 70 % de la ligne assurance seulement (à 1 F près)', Math.abs(partTp - P1.pu * 0.7) <= 1, partTp + ' / ' + P1.pu * 0.7);
    const remise1 = Math.floor((P1.pu - partTp) * 5 / 100);
    const remise2 = Math.floor(P2.pu * 5 / 100);
    const custPart = P1.pu + P2.pu - partTp - remise1 - remise2;
    const net = arrondi5(custPart);
    const comptant = arrondi5(P2.pu - remise2);
    ok('Net recalculé : net = part client + comptant, remise des deux lignes',
      r1.net.valeur === net && r1.remise === remise1 + remise2, JSON.stringify(r1) + ' attendu tp ' + partTp + ' net ' + net);
    ok('Rail : DONT COMPTANT = prix - remise 5 % (arrondi à 5), DONT PART CLIENT = net - comptant', r1.comptant.visible && r1.comptant.valeur === comptant
      && r1.partClient.valeur === net - comptant, JSON.stringify(r1) + ' attendu ' + comptant + ' / ' + (net - comptant));

    /* 3. cloture */
    const journal = A.ENV_E2E.JOURNAL_SERVEUR;
    const tailleJournal = require('fs').existsSync(journal) ? require('fs').statSync(journal).size : 0;
    const clot = await C.terminerVente(p, true);
    ok('TERMINER LA VENTE : succès, la réponse porte la vente liée et les deux références', clot.http === 200 && clot.success === true && !!clot.venteLiee && !!clot.refVente && !!clot.refVenteLiee
      && clot.montantComptant === comptant && clot.partClient === net - comptant, JSON.stringify(clot).slice(0, 300));
    const vnoId = clot.venteLiee;
    C.noterVente(vnoId);
    const vo = C.vente(venteId);
    const vno = vnoId ? C.vente(vnoId) : null;
    ok('Vente assurance close : une ligne (assurance), total et remise de cette ligne, part client, lien vers la vente comptant',
      vo.statut === 'is_Closed' && vo.liee === vnoId && vo.prix === P1.pu && vo.remise === remise1 && vo.partClient === P1.pu - partTp - remise1 && vo.type === 'VO'
      && C.lignes(venteId) === P1.id + '/1/' + P1.pu + '/' + remise1 + '/0/is_Closed', JSON.stringify(vo) + ' ' + C.lignes(venteId));
    ok('Vente comptant close : type comptant, même client, la ligne cochée (comptant = 1), remise 5 %, lien réciproque',
      vno && vno.statut === 'is_Closed' && vno.type === 'VNO' && vno.typeId === '1' && vno.liee === venteId && vno.client === cl.clientId && vno.prix === P2.pu && vno.remise === remise2
      && C.lignes(vnoId) === P2.id + '/1/' + P2.pu + '/' + remise2 + '/1/is_Closed', JSON.stringify(vno) + ' ' + C.lignes(vnoId));
    ok('Les deux ventes ont chacune leur référence et leur numéro de ticket', vo.ref && vno.ref && vo.ref !== vno.ref
      && q("SELECT COUNT(DISTINCT str_REF_TICKET) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + venteId + "','" + vnoId + "')") === '2', vo.ref + ' / ' + vno.ref);
    const mvtVo = C.mouvements(venteId), mvtVno = C.mouvements(vnoId);
    ok('Un mouvement de caisse par vente ; comptant d\'abord : montant payé ' + comptant + ' sur le comptant, ' + (net - comptant) + ' sur l\'assurance',
      mvtVo.split(' ; ').length === 1 && mvtVno.split(' ; ').length === 1
      && mvtVno.split('/')[6] === String(comptant) && mvtVo.split('/')[6] === String(net - comptant), mvtVo + ' || ' + mvtVno);
    ok('Recettes : ' + (net - comptant) + ' (assurance) et ' + comptant + ' (comptant)', C.recettes(venteId).startsWith(String(net - comptant) + '/') && C.recettes(vnoId).startsWith(String(comptant) + '/'),
      C.recettes(venteId) + ' || ' + C.recettes(vnoId));
    ok('Règlements : une ligne espèces par vente, aux mêmes montants', /^1\/\d+/.test(C.reglements(venteId)) && C.reglements(venteId).split('/')[1] === String(net - comptant)
      && C.reglements(vnoId).split('/')[1] === String(comptant), C.reglements(venteId) + ' || ' + C.reglements(vnoId));
    ok('Ligne tiers-payant de la vente assurance : 70 %, part sur la ligne assurance seulement', C.lignesTp(venteId) === TP + '/70/' + partTp + '/is_Closed/' + C.lignesTp(venteId).split('/')[4]
      && C.lignesTp(vnoId) === 'aucune', C.lignesTp(venteId) + ' || ' + C.lignesTp(vnoId));
    ok('Stock : chaque produit sorti une seule fois', A.stock(P1) === 49 && A.stock(P2) === 49, A.stock(P1) + ' / ' + A.stock(P2));
    const bandeau = clot.bandeau || '';
    ok('Bandeau « Vente terminée et scindée » avec les deux références, sans fenêtre', /scindée/.test(bandeau) && bandeau.includes(vo.ref) && bandeau.includes(vno.ref), bandeau);
    /* l'imprimante PDF du poste peut mettre plusieurs minutes a repondre : la reponse HTTP est un renseignement, la
       preuve de l'impression est la mesure du journal du serveur ci-dessous */
    console.log('      (ticket/vo : ' + (clot.ticket ? 'réponse ' + clot.ticket.http : 'pas de réponse dans les 4 minutes') + ')');
    /* journal du serveur : la mesure d'impression dit combien d'exemplaires sont partis : tiers-payant puis ticket combine (retour du 03/11 : plus de recu caisse en plus) */
    let exemplaires = null;
    if (require('fs').existsSync(journal)) {
      const fd = require('fs').openSync(journal, 'r'); const taille = require('fs').statSync(journal).size;
      const tampon = Buffer.alloc(Math.max(0, taille - tailleJournal)); require('fs').readSync(fd, tampon, 0, tampon.length, tailleJournal); require('fs').closeSync(fd);
      const m = tampon.toString('utf8').match(/vente\/ticket\/vo[^\n]*?\((\d+) fois\)/g);
      if (m) { exemplaires = Number(m[m.length - 1].match(/\((\d+) fois\)/)[1]); }
    }
    ok('Deux tickets imprimés : assurance (un tiers-payant) et client combiné, sans reçu caisse (journal du serveur)', exemplaires === 2, exemplaires === null ? 'mesure absente du journal (impression rapide)' : exemplaires);

    /* 4. annulation de la vente comptant, par la liste des ventes terminees */
    await C.ouvrirEcran(p, 'ventemanager');
    await C.visible(p, 'ventemanager #query');
    await C.vues.cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(vno.ref, { delay: 20 });
    await C.vues.cliquer(p, 'ventemanager #rechercher');
    await p.waitForTimeout(2500);
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: vno.ref }).first();
    await rangee.waitFor({ timeout: 30000 });
    const repAnnul = p.waitForResponse((x) => /\/vente\/annulation\//.test(x.url()), { timeout: 120000 });
    repAnnul.catch(() => {});
    await rangee.locator('img[data-qtip="Annuler.Vente"]').first().click();
    await C.vues.attendreMessage(p, 'Annuler', 15000);
    await C.vues.repondre(p, 'yes');
    const ra = await repAnnul;
    await p.waitForTimeout(2000);
    if (/impression du ticket/i.test(await C.vues.texteMessage(p))) { await C.vues.repondre(p, 'no'); }
    const voApres = C.vente(venteId), vnoApres = C.vente(vnoId);
    const annulee = vnoApres.annulee || q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + vnoId + "'") !== '0';
    ok('Annulation de la vente comptant acceptée (' + ra.status() + ')', ra.status() === 200 && annulee, JSON.stringify(vnoApres));
    ok('La vente assurance n\'est pas touchée : toujours close, non annulée, même part client, lien conservé', voApres.statut === 'is_Closed' && !voApres.annulee
      && voApres.partClient === vo.partClient && voApres.liee === vnoId && C.mouvements(venteId) === mvtVo, JSON.stringify(voApres));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
