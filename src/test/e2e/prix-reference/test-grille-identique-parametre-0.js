/* CAS 2 DU 03/11/2026, TEST D'ECRAN 3 : avec KEY_PRIX_REF_CAISSE a 0, la grille est strictement celle d'aujourd'hui.
 *
 *  1. parametre a 0 : vente assurance avec un article -> aucune colonne de reference, en-tete de reference
 *     (LG, C.CIP 140 px, DESIGNATION, QD, QS, P.U, MONTANT, action), aucun champ referencesTp dans la reponse
 *     « deatails », GET vente/{id} refuse (403) ; capture de l'en-tete et de la premiere ligne ;
 *  2. meme parametre a 0 : vente comptant -> meme en-tete, capture identique au pixel (meme largeurs) ;
 *  3. parametre a 1 : vente comptant -> toujours aucune colonne (vente de type 2 seulement), capture identique ;
 *     vente assurance -> les colonnes apparaissent ; « Mettre en attente » (l'ecran repasse au comptant, meme grille)
 *     -> elles disparaissent et C.CIP reprend sa largeur. (Une vente assurance ne peut pas etre repassee au comptant
 *     par le type de vente : l'application le refuse, comportement d'origine.)
 * Les captures sont comparees par comparer-png.py (Pillow) : memes dimensions et aucun pixel ecarte de plus de 1/255,
 * l'arrondi de couleur du rendu, qui change d'un rendu a l'autre sans rien changer a l'affichage.
 * Lancement seul : node src/test/e2e/prix-reference/test-grille-identique-parametre-0.js
 */
const C = require('./commun');
const { ok, q, A } = C;
const crypto = require('crypto');

const ATTENDU = ',C.CIP,DESIGNATION,QD,QS,P.U,MONTANT,';

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  /* grille de reference : sans la colonne « C » de la ligne comptant (cas 1), quel que soit le reglage du poste */
  A.parametre('KEY_LIGNE_COMPTANT_VO', '0');
  const TP = A.tiersPayant('R3', '1');
  const P = C.produitSansReference(5);
  const CIP = C.cip(P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  /* capture de l'en-tete de la grille, souris ecartee et focus retire pour ne pas photographier un survol */
  const DOSSIER = C.A.ENV_E2E.CAPTURES ? require('path').join(C.A.ENV_E2E.CAPTURES, 'grille-parametre-0') : null;
  if (DOSSIER) { require('fs').mkdirSync(DOSSIER, { recursive: true }); }
  let nCapture = 0;
  const capture = async (nom) => {
    const id = await p.evaluate((g) => { const x = Ext.ComponentQuery.query(g)[0]; return x.headerCt.getId(); }, C.GRILLE);
    await p.mouse.move(5, 5);
    await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); } });
    await p.waitForTimeout(600);
    const chemin = DOSSIER ? require('path').join(DOSSIER, (++nCapture) + '-' + nom + '.png') : undefined;
    const png = await p.locator('#' + id).screenshot({ path: chemin });
    return { empreinte: crypto.createHash('sha1').update(png).digest('hex').slice(0, 12), largeurs: (await C.entete(p)).colonnes.map((c) => c.texte + ':' + c.largeur).join(' '), chemin };
  };
  /* comparaison pixel a pixel par Pillow ; sans dossier de captures, on compare les empreintes */
  const identiques = (c1, c2) => {
    if (!c1.chemin || !c2.chemin) { return { ok: c1.empreinte === c2.empreinte, detail: c1.empreinte + ' / ' + c2.empreinte }; }
    const r = require('child_process').spawnSync('python', ['-I', require('path').join(__dirname, 'comparer-png.py'), c1.chemin, c2.chemin, '1'], { encoding: 'utf8' });
    return { ok: r.status === 0, detail: (r.stdout || r.stderr || '').trim() };
  };
  const lire = (url) => p.evaluate(async (u) => { const r = await fetch(u); return { http: r.status, corps: await r.text() }; }, url);
  try {
    const cl = await A.clientAssure(api, 'REF3', [{ tp: TP, taux: 70 }]);
    /* 1. assurance, parametre a 0 */
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF3');
    await C.taperArticle(p, CIP);
    const v1 = await C.venteCourante(p);
    C.noterVente(v1);
    const e1 = await C.entete(p);
    ok('Paramètre à 0, vente assurance : aucune colonne de référence, en-tête d\'aujourd\'hui', e1 && e1.groupes.length === 0 && !e1.rappel
      && e1.colonnes.map((c) => c.texte).join(',') === ATTENDU && e1.colonnes.find((c) => c.texte === 'C.CIP').largeur === 140 /* point 4 du 06/11 : largeur fixe, plus de flex */, JSON.stringify(e1 && e1.colonnes));
    const det = await lire('../api/v1/vente/deatails?start=0&limit=10&venteId=' + v1);
    ok('Paramètre à 0 : la réponse « deatails » ne porte pas referencesTp', det.http === 200 && !/referencesTp/.test(det.corps), det.corps.slice(0, 200));
    const refus = await lire('../api/v1/prix-reference/vente/' + v1);
    ok('Paramètre à 0 : GET v1/prix-reference/vente/{id} refusé (403)', refus.http === 403, refus.http + ' ' + refus.corps.slice(0, 120));
    const put = await p.evaluate(async (u) => { const r = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"tiersPayantId":"x","valeur":10,"taux":10}' }); return r.status; },
      '../api/v1/prix-reference/vente/' + v1 + '/ligne/x');
    ok('Paramètre à 0 : PUT …/ligne/{id} refusé (403)', put === 403, put);
    const c1 = await capture('assurance-param-0');

    /* 2. comptant, parametre a 0 : nouvelle vente */
    await C.nouvelleVente(p);
    await C.taperArticle(p, CIP);
    const v2 = await C.venteCourante(p);
    C.noterVente(v2);
    const c2 = await capture('comptant-param-0');
    const i12 = identiques(c1, c2);
    ok('Paramètre à 0, vente comptant : même en-tête, capture identique au pixel à la vente assurance', c2.largeurs === c1.largeurs && i12.ok, c1.largeurs + ' / ' + c2.largeurs + ' ; ' + i12.detail);

    /* 3. parametre a 1 : comptant inchange, assurance avec colonnes, retour au comptant sans colonnes */
    A.parametre('KEY_PRIX_REF_CAISSE', '1');
    await C.nouvelleVente(p);
    await C.taperArticle(p, CIP);
    C.noterVente(await C.venteCourante(p));
    const c3 = await capture('comptant-param-1');
    const i13 = identiques(c1, c3);
    ok('Paramètre à 1, vente comptant : aucune colonne, capture identique au pixel', c3.largeurs === c1.largeurs && i13.ok, c3.largeurs + ' ; ' + i13.detail);
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF3');
    await C.taperArticle(p, CIP);
    const v4 = await C.venteCourante(p);
    C.noterVente(v4);
    const e4 = await C.entete(p);
    ok('Paramètre à 1, vente assurance : le groupe de colonnes apparaît, C.CIP à 140 px', e4 && e4.groupes.length === 1 && e4.colonnes.find((c) => c.texte === 'C.CIP').largeur === 140, JSON.stringify(e4 && e4.colonnes));
    const det4 = await lire('../api/v1/vente/deatails?start=0&limit=10&venteId=' + v4);
    ok('Paramètre à 1 : la réponse « deatails » porte referencesTp', /referencesTp/.test(det4.corps), det4.corps.slice(0, 200));
    /* « Mettre en attente » : l'ecran se remet au comptant sur la MEME grille ; les colonnes doivent disparaitre */
    const idGrille = await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getId(), C.GRILLE);
    await C.vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await p.waitForTimeout(1500);
    if (await C.vues.texteMessage(p)) { await C.vues.repondre(p, 'yes').catch(() => C.vues.repondre(p, 'ok').catch(() => {})); }
    await p.waitForTimeout(2500);
    const memeGrille = await p.evaluate((g) => { const x = Ext.ComponentQuery.query(g)[0]; return x ? x.getId() : null; }, C.GRILLE) === idGrille;
    const e5 = await C.entete(p);
    ok('Après « Mettre en attente » (même grille : ' + memeGrille + ') : colonnes retirées, C.CIP reprend sa largeur (140 px depuis le point 4 du 06/11), libellé masqué',
      e5 && e5.groupes.length === 0 && !e5.rappel && e5.colonnes.map((c) => c.texte).join(',') === ATTENDU
      && e5.colonnes.find((c) => c.texte === 'C.CIP').largeur === 140, JSON.stringify(e5 && e5.colonnes));
    const c5 = await capture('comptant-apres-attente');
    const i15 = identiques(c1, c5);
    ok('Même grille après retrait des colonnes : capture identique au pixel à la grille d\'origine', c5.largeurs === c1.largeurs && i15.ok, c5.largeurs + ' ; ' + i15.detail);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
