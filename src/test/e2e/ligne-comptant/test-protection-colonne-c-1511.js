/* DEMANDE DU 15/11 : VENTE ASSURANCE, COLONNE « C » (AU COMPTANT) PROTEGEE.
 *
 * On ne doit pas pouvoir mettre toute la vente au comptant par la colonne « C » : ni sur une vente d'un seul produit,
 * ni en cochant la derniere ligne restee a l'assurance. Decocher reste possible. Ventes assurance seulement : la
 * colonne n'existe pas en carnet ni au comptant.
 *
 * Parcours de l'ecran (parametre KEY_LIGNE_COMPTANT_VO a 1 le temps du test), vente assurance a 70 % :
 *  1. un seul article : clic sur « C » -> refus visible (bandeau), aucune requete, ligne non cochee, base inchangee ;
 *     garde du serveur (ecran ancien reste en memoire d'un poste) : PUT sur cette ligne refuse ;
 *  2. deux autres articles (prix differents) : clic sur « C » de A puis de B -> acceptes ; clic sur C -> refus
 *     « toutes les lignes », aucune requete ; garde du serveur : PUT sur C refuse ; base : A et B cochees, C non ;
 *  3. A decochee (acceptee), puis C cochee (acceptee) : il reste A a l'assurance ;
 *  4. TERMINER LA VENTE : vente assurance avec A seule, vente comptant liee avec B et C (bilan des lignes) ;
 *  5. nouvelle vente de type Carnet : colonne « C » absente.
 * Tout est retire a la fin (ventes, client, tiers-payant, parametre, stock, caisse).
 * Lancement seul : node src/test/e2e/ligne-comptant/test-protection-colonne-c-1511.js
 */
const C = require('./commun');
const { ok, q, A } = C;

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const TP = A.tiersPayant('PCC', '1');
  const PA = C.produitSimple(4), PB = C.produitSimple(5), PC = C.produitSimple(6);
  const [CA, CB, CC] = [C.cip(PA), C.cip(PB), C.cip(PC)];
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const puts = [];
  p.on('request', (r) => { if (r.method() === 'PUT' && /\/vente\/item\/[^/]+\/comptant/.test(r.url())) { puts.push(r.url()); } });
  const enBase = (id) => q("SELECT comptant FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + id + "'");
  const putDirect = (id, valeur) => p.evaluate(async ([u, v]) => { const r = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comptant: v }) });
    return { http: r.status, corps: await r.json().catch(() => ({})) }; }, ['../api/v1/vente/item/' + id + '/comptant', valeur]);
  const viderBandeau = () => p.evaluate(() => document.querySelectorAll('.vente-toast').forEach((e) => e.remove()));
  try {
    await A.clientAssure(api, 'PCC', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' PCC');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-PCC');
    await C.taperArticle(p, CA);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const la = await C.ligne(p, CA);
    ok('Préparation : vente assurance, un seul article, colonne « C » visible', !!venteId && !!la && (await C.entete(p)).colonneCVisible, venteId);

    /* 1. vente d'un seul produit */
    let n = puts.length;
    await viderBandeau();
    await C.cocher(p, CA, false);
    let b = await C.toast(p);
    let l = await C.ligne(p, CA);
    ok('Un seul article : clic sur « C » refusé (bandeau « un seul produit »), aucune requête, ligne non cochée', puts.length === n && /seul produit/.test(b) && l && !l.comptant && !l.fondJaune
      && enBase(la.detailId) === '0', b + ' | ' + JSON.stringify(l));
    let put = await putDirect(la.detailId, true);
    ok('Garde du serveur : PUT sur la seule ligne refusé, base inchangée', put.http === 200 && put.corps.success === false && /seul produit/.test(put.corps.msg || '') && enBase(la.detailId) === '0',
      JSON.stringify(put));

    /* 2. trois articles : la derniere ligne a l'assurance ne se coche pas */
    await C.taperArticle(p, CB);
    await C.taperArticle(p, CC);
    const lb = await C.ligne(p, CB), lc = await C.ligne(p, CC);
    ok('Trois articles aux prix différents', !!lb && !!lc && new Set([la.pu, lb.pu, lc.pu]).size === 3, [la.pu, lb.pu, lc.pu].join(' / '));
    const pa = await C.cocher(p, CA);
    const pb = await C.cocher(p, CB);
    ok('A puis B cochées : PUT acceptés, lignes cochées en base', pa && pa.success && pb && pb.success && enBase(la.detailId) === '1' && enBase(lb.detailId) === '1', JSON.stringify([pa, pb]));
    n = puts.length;
    await viderBandeau();
    await C.cocher(p, CC, false);
    b = await C.toast(p);
    l = await C.ligne(p, CC);
    ok('C (dernière ligne à l\'assurance) : clic refusé (bandeau « toutes les lignes »), aucune requête, non cochée', puts.length === n && /Toutes les lignes seraient au comptant/.test(b)
      && l && !l.comptant && enBase(lc.detailId) === '0', b + ' | ' + JSON.stringify(l));
    put = await putDirect(lc.detailId, true);
    ok('Garde du serveur : PUT sur C refusé, base inchangée (A et B cochées, C non)', put.http === 200 && put.corps.success === false && /Toutes les lignes/.test(put.corps.msg || '')
      && enBase(la.detailId) + enBase(lb.detailId) + enBase(lc.detailId) === '110', JSON.stringify(put));

    /* 3. decocher reste possible ; une fois A decochee, C se coche */
    const pa2 = await C.cocher(p, CA);
    const pc = await C.cocher(p, CC);
    ok('A décochée puis C cochée : acceptés ; il reste A à l\'assurance', pa2 && pa2.success && pa2.comptant === false && pc && pc.success
      && enBase(la.detailId) + enBase(lb.detailId) + enBase(lc.detailId) === '011', JSON.stringify([pa2, pc]));

    /* 4. cloture : deux ventes */
    const clot = await C.terminerVente(p, false);
    const vnoId = clot.venteLiee;
    C.noterVente(vnoId);
    const lignesDe = (v) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '/', comptant) ORDER BY lg_FAMILLE_ID), '') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    ok('TERMINER LA VENTE : assurance avec A seule, vente comptant liée avec B et C', clot.success === true && !!vnoId && lignesDe(venteId) === PA.id + '/0'
      && lignesDe(vnoId) === [PB.id + '/1', PC.id + '/1'].sort().join(','), JSON.stringify(clot).slice(0, 200) + ' | ' + lignesDe(venteId) + ' | ' + lignesDe(vnoId));

    /* 5. carnet : pas de colonne */
    await C.nouvelleVente(p);
    await C.choisirType(p, 'Carnet', '3');
    const e = await C.entete(p);
    ok('Vente carnet : colonne « C » absente', e && !e.colonneCVisible, JSON.stringify(e));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
