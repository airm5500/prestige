/* CAS 1 DU 03/11/2026, TEST D'ECRAN 3 : une ligne en promotion ne se coche pas (Q1.2) ; en Carnet la colonne « C »
 * est cachee (Q1.7).
 *
 *  1. parametre a 1, vente assurance avec un article ; la ligne est marquee en promotion en base (une vente assurance
 *     n'en prend jamais par l'ecran : c'est le garde-fou que l'on verifie), lignes rechargees -> PROMOTION affichee ;
 *  2. clic sur « C » : refus visible (bandeau), aucune requete PUT, ligne non cochee ; PUT direct : refus du serveur ;
 *  3. marque retiree : le clic coche bien la ligne ;
 *  4. nouvelle vente en Carnet : colonne cachee ; Assurance : colonne visible ; Au comptant : cachee.
 * Lancement seul : node src/test/e2e/ligne-comptant/test-promotion-et-carnet.js
 */
const C = require('./commun');
const { ok, q, exec, A } = C;

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  /* grille de reference du cas 1 : sans les colonnes du prix de reference (cas 2), quel que soit le reglage du poste */
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const TP = A.tiersPayant('C3', '1');
  const P = C.produitSimple(4);
  const CIP = C.cip(P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const requetesPut = [];
  p.on('request', (r) => { if (r.method() === 'PUT' && /\/item\/[^/]+\/comptant/.test(r.url())) { requetesPut.push(r.url()); } });
  const recharger = async () => {
    const rep = p.waitForResponse((x) => /\/vente\/deatails/.test(x.url()), { timeout: 30000 });
    await p.evaluate(() => testextjs.app.getController('VenteCtr').refresh());
    await rep;
    await p.waitForTimeout(1000);
  };
  try {
    await A.clientAssure(api, 'CPT3', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' CPT3');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-C3');
    await C.taperArticle(p, CIP);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const l0 = await C.ligne(p, CIP);
    ok('Préparation : vente assurance avec un article, colonne « C » visible', !!venteId && l0 && (await C.entete(p)).colonneCVisible, venteId);

    /* 1. ligne marquee en promotion */
    exec("UPDATE t_preenregistrement_detail SET promotion_produit_id = 999999 WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + l0.detailId + "'");
    await recharger();
    const l1 = await C.ligne(p, CIP);
    ok('Ligne rechargée : PROMOTION portée par la ligne, non cochée', l1 && l1.promotion && !l1.comptant, JSON.stringify(l1));

    /* 2. refus */
    await C.cocher(p, CIP, false);
    const l2 = await C.ligne(p, CIP);
    const bandeau = await C.toast(p);
    ok('Clic sur « C » d\'une ligne en promotion : refus visible (bandeau), aucune requête, ligne non cochée', requetesPut.length === 0 && /promotion/i.test(bandeau) && l2 && !l2.comptant && !l2.fondJaune, bandeau + ' | ' + JSON.stringify(l2) + ' | ' + requetesPut.join(' '));
    const put = await p.evaluate(async (u) => { const r = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"comptant":true}' }); return { http: r.status, corps: await r.json().catch(() => ({})) }; },
      '../api/v1/vente/item/' + l0.detailId + '/comptant');
    ok('PUT direct sur la ligne en promotion : refusé par le serveur', put.http === 200 && put.corps.success === false && /promotion/i.test(put.corps.msg || '')
      && q("SELECT comptant FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + l0.detailId + "'") === '0', JSON.stringify(put));

    /* 3. marque retiree */
    exec("UPDATE t_preenregistrement_detail SET promotion_produit_id = NULL WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + l0.detailId + "'");
    await recharger();
    const put3 = await C.cocher(p, CIP);
    const l3 = await C.ligne(p, CIP);
    ok('Sans promotion : le clic coche la ligne (PUT accepté, fond jaune, pastille)', put3 && put3.success === true && l3 && l3.comptant && l3.fondJaune && l3.pastille, JSON.stringify(put3) + ' ' + JSON.stringify(l3));

    /* 4. carnet / assurance / comptant sur une nouvelle vente */
    await C.nouvelleVente(p);
    await C.choisirType(p, 'Carnet', '3');
    const e3 = await C.entete(p);
    ok('Type Carnet : colonne « C » cachée, en-tête d\'origine', e3 && !e3.colonneCVisible && e3.textes === C.COLONNES_ORIGINE, JSON.stringify(e3));
    await C.choisirType(p, 'Assurance', '2');
    const e2 = await C.entete(p);
    ok('Type Assurance : colonne « C » visible', e2 && e2.colonneCVisible, JSON.stringify(e2));
    await C.choisirType(p, 'Au comptant', '1');
    const e1 = await C.entete(p);
    ok('Type Au comptant : colonne « C » cachée', e1 && !e1.colonneCVisible && e1.textes === C.COLONNES_ORIGINE, JSON.stringify(e1));
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
