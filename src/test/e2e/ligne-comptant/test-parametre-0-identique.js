/* CAS 1 DU 03/11/2026, TEST D'ECRAN 1 : avec KEY_LIGNE_COMPTANT_VO a 0, l'ecran de vente assurance est celui
 * d'aujourd'hui, au pixel, et la cloture est inchangee.
 *
 *  1. parametre a 0 : vente assurance avec un article -> aucune colonne « C » (en-tete d'origine), rail sans
 *     « DONT COMPTANT », PUT item/{id}/comptant refuse (403) ; capture de l'en-tete et du rail ;
 *  2. « TERMINER LA VENTE » : une seule vente, close, sans vente liee, un seul mouvement de caisse ;
 *  3. parametre a 1, vente comptant : aucune colonne visible, capture identique au pixel a la capture 1.
 * Les captures sont comparees par comparer-png.py (Pillow) : memes dimensions, aucun pixel ecarte de plus de 1/255.
 * Lancement seul : node src/test/e2e/ligne-comptant/test-parametre-0-identique.js
 */
const C = require('./commun');
const { ok, q, A } = C;
const crypto = require('crypto');

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '0');
  /* grille de reference du cas 1 : sans les colonnes du prix de reference (cas 2), quel que soit le reglage du poste */
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const TP = A.tiersPayant('C1', '1');
  const P = C.produitSimple(1);
  const CIP = C.cip(P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const DOSSIER = A.ENV_E2E.CAPTURES ? require('path').join(A.ENV_E2E.CAPTURES, 'ligne-comptant-param-0') : null;
  if (DOSSIER) { require('fs').mkdirSync(DOSSIER, { recursive: true }); }
  let nCapture = 0;
  const capture = async (nom) => {
    const ids = await p.evaluate((g) => { const x = Ext.ComponentQuery.query(g)[0]; const r = Ext.ComponentQuery.query('doventemanager #contenu #reglement')[0];
      return { entete: x.headerCt.getId(), rail: r ? r.getId() : null }; }, C.GRILLE);
    await p.mouse.move(5, 5);
    await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); } });
    await p.waitForTimeout(600);
    const res = {};
    for (const [nomZone, id] of Object.entries(ids)) {
      if (!id) { continue; }
      const chemin = DOSSIER ? require('path').join(DOSSIER, (++nCapture) + '-' + nom + '-' + nomZone + '.png') : undefined;
      const png = await p.locator('#' + id).screenshot({ path: chemin });
      res[nomZone] = { empreinte: crypto.createHash('sha1').update(png).digest('hex').slice(0, 12), chemin };
    }
    res.largeurs = (await C.entete(p)).colonnes.map((c) => c.texte + ':' + c.largeur).join(' ');
    return res;
  };
  const identiques = (c1, c2) => {
    if (!c1.chemin || !c2.chemin) { return { ok: c1.empreinte === c2.empreinte, detail: c1.empreinte + ' / ' + c2.empreinte }; }
    const r = require('child_process').spawnSync('python', ['-I', require('path').join(__dirname, 'comparer-png.py'), c1.chemin, c2.chemin, '1'], { encoding: 'utf8' });
    if (r.error || r.status === null) { return { ok: c1.empreinte === c2.empreinte, detail: 'sans Pillow : ' + c1.empreinte + ' / ' + c2.empreinte }; }
    return { ok: r.status === 0, detail: (r.stdout || r.stderr || '').trim() };
  };
  try {
    const cl = await A.clientAssure(api, 'CPT1', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' CPT1');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-C1');
    await C.taperArticle(p, CIP);
    const v1 = await C.venteCourante(p);
    C.noterVente(v1);
    ok('Préparation : vente assurance ouverte avec le client et un article', !!v1 && C.vente(v1).typeId === '2', v1);

    /* 1. ecran d'aujourd'hui */
    const e1 = await C.entete(p);
    ok('Paramètre à 0 : aucune colonne « C » (ni créée ni visible), en-tête d\'origine', e1 && !e1.colonneC && e1.textes === C.COLONNES_ORIGINE, JSON.stringify(e1));
    const r1 = await C.rail(p);
    ok('Paramètre à 0 : le rail ne montre ni DONT COMPTANT ni DONT PART CLIENT', r1.comptant && !r1.comptant.visible && !r1.partClient.visible, JSON.stringify(r1));
    const l1 = await C.ligne(p, CIP);
    const put = await p.evaluate(async (u) => { const r = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"comptant":true}' }); return { http: r.status, corps: await r.text() }; },
      '../api/v1/vente/item/' + l1.detailId + '/comptant');
    ok('Paramètre à 0 : PUT item/{id}/comptant refusé (403), la ligne reste non cochée', put.http === 403 && q("SELECT comptant FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + l1.detailId + "'") === '0', put.http + ' ' + put.corps.slice(0, 120));
    const c1 = await capture('assurance-param-0');

    /* 2. cloture inchangee */
    const clot = await C.terminerVente(p);
    ok('TERMINER LA VENTE : succès, sans vente liée dans la réponse', clot.http === 200 && clot.success === true && !clot.venteLiee, JSON.stringify(clot).slice(0, 200));
    const v = C.vente(v1);
    ok('Une seule vente, close, sans lien, un seul mouvement de caisse', v.statut === 'is_Closed' && v.liee === null && C.mouvements(v1).split(' ; ').length === 1
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_VENTE_LIEE_ID = '" + v1 + "'") === '0' && C.lignes(v1).split(' ; ').length === 1, JSON.stringify(v) + ' ' + C.mouvements(v1));
    ok('Aucun bandeau « scindée »', !/scind/i.test(await C.toast(p)), await C.toast(p));

    /* 3. parametre a 1, vente comptant : rien de visible, meme ecran */
    A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
    await C.nouvelleVente(p);
    await C.taperArticle(p, CIP);
    C.noterVente(await C.venteCourante(p));
    const e3 = await C.entete(p);
    ok('Paramètre à 1, vente comptant : colonne « C » absente de l\'affichage, en-tête d\'origine', e3 && !e3.colonneCVisible && e3.textes === C.COLONNES_ORIGINE, JSON.stringify(e3));
    const c3 = await capture('comptant-param-1');
    const ie = identiques(c1.entete, c3.entete);
    ok('En-tête de la grille identique au pixel (paramètre 0 assurance / paramètre 1 comptant)', c3.largeurs === c1.largeurs && ie.ok, c1.largeurs + ' / ' + c3.largeurs + ' ; ' + ie.detail);
    const r3 = await C.rail(p);
    ok('Paramètre à 1, vente comptant : rail sans DONT COMPTANT', r3.comptant && !r3.comptant.visible && !r3.partClient.visible, JSON.stringify(r3));
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
