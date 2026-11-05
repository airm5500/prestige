/* RETOUR DU 05/11, LOT B : grille de la vente assurance.
 *  - devant le nom du produit, un triangle avec « ! » : violet pour un produit sensible, rouge pour un produit soumis a
 *    ordonnance avec code tableau, les deux si les deux ; infobulle au survol ; il clignote a l'ajout de la ligne puis
 *    reste fixe ; le mot « SENSIBLE » / « ORDONNANCIER » n'apparait plus dans la ligne ;
 *  - LG sans titre (numeros gardes), QD et QS a la largeur d'une quantite de 3 chiffres, MONTANT plus etroit, P.U a 80 px ;
 *  - dans « Infos assurance », le taux colle au nom du tiers-payant ;
 *  - P.REF jamais coupe (aucun « … ») ; aucune cellule de nombre coupee.
 * Par le vrai chemin : prix de reference a la caisse actif (KEY_PRIX_REF_CAISSE a 1, ligne comptant a 0), vente
 * assurance a un tiers-payant, quatre articles tapes par leur CIP. Trois articles d'essai portent le temps du test les
 * drapeaux sensible / soumis a ordonnance + code tableau, remis a la fin ; vente, client, tiers-payant, parametres,
 * stock et caisse retires.
 * Lancement seul : node src/test/e2e/retours/test-grille-vente-triangles.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const drapeaux = (p) => q("SELECT CONCAT_WS('~', IFNULL(is_sensible, 0), IFNULL(is_scheduled, 0), IFNULL(int_T, '')) FROM t_famille WHERE lg_FAMILLE_ID = '" + p.id + "'").split('~');
const poser = (p, sensible, ordonnance) => q("UPDATE t_famille SET is_sensible = " + (sensible ? 1 : 0) + ", is_scheduled = " + (ordonnance ? 1 : 0)
  + ", int_T = " + (ordonnance ? "'A'" : 'NULL') + " WHERE lg_FAMILLE_ID = '" + p.id + "'");
const remettre = (p, d) => q("UPDATE t_famille SET is_sensible = " + d[0] + ", is_scheduled = " + d[1] + ", int_T = " + (d[2] === '' ? 'NULL' : "'" + d[2] + "'")
  + " WHERE lg_FAMILLE_ID = '" + p.id + "'");

/* la ligne d'un article : triangles (genre, info-bulle, animation, place avant le nom), texte de la cellule */
const ligne = (p, cipProduit) => p.evaluate(([g, c]) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  const r = grille.getStore().findRecord('intCIP', c);
  if (!r) { return null; }
  const noeud = grille.getView().getNode(r);
  const colDes = grille.headerCt.getGridColumns().find((x) => x.dataIndex === 'strNAME');
  const cellule = noeud.querySelector('.x-grid-cell-' + colDes.getId() + ' .x-grid-cell-inner');
  const triangles = Array.from(cellule.querySelectorAll('.vp-triangle')).map((t) => {
    const b = t.getBoundingClientRect(), bc = cellule.getBoundingClientRect();
    return { genre: /vp-triangle-sensible/.test(t.className) ? 'sensible' : (/vp-triangle-ordonnancier/.test(t.className) ? 'ordonnancier' : '?'),
      info: t.getAttribute('data-qtip') || '', animation: getComputedStyle(t).animationName, couleur: getComputedStyle(t.querySelector('path')).fill,
      dansLaCellule: b.left >= bc.left - 1 && b.right <= bc.right + 1 && b.width > 0 };
  });
  return { triangles, texte: cellule.textContent, debut: cellule.innerHTML.trim().slice(0, 30) };
}, [C.GRILLE, cipProduit]);

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_LIGNE_COMPTANT_VO', '0');
  const TP = A.tiersPayant('TRI', '1');
  const PS = C.produitSansReference(4), PO = C.produitSansReference(5), PD = C.produitSansReference(6);
  const PC = C.produitSansReference(7);
  const avant = [PS, PO, PD, PC].map(drapeaux);
  poser(PS, true, false); poser(PO, false, true); poser(PD, true, true); poser(PC, false, false);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    await A.clientAssure(api, 'TRI', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' TRI');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-TRI');
    for (const x of [PC, PS, PO, PD]) { await C.taperArticle(p, C.cip(x)); }
    C.noterVente(await C.venteCourante(p));
    await p.waitForTimeout(600);

    /* 1. triangles */
    const ls = await ligne(p, C.cip(PS)), lo = await ligne(p, C.cip(PO)), ld = await ligne(p, C.cip(PD)), lc = await ligne(p, C.cip(PC));
    const genres = (l) => l ? l.triangles.map((t) => t.genre).join('+') : 'ligne absente';
    ok('Produit sensible : un triangle violet', genres(ls) === 'sensible' && /142, 36, 170/.test(ls.triangles[0].couleur), JSON.stringify(ls));
    ok('Produit soumis à ordonnance (code tableau) : un triangle rouge', genres(lo) === 'ordonnancier' && /211, 47, 47/.test(lo.triangles[0].couleur), JSON.stringify(lo));
    ok('Produit sensible et soumis à ordonnance : les deux triangles', genres(ld) === 'sensible+ordonnancier', JSON.stringify(ld));
    ok('Produit ordinaire : aucun triangle', lc && lc.triangles.length === 0, JSON.stringify(lc));
    ok('Le triangle est placé avant le nom, visible dans la cellule', [ls, lo, ld].every((l) => l && l.debut.startsWith('<span class="vp-triangle') && l.triangles.every((t) => t.dansLaCellule)),
      [ls, lo, ld].map((l) => l && l.debut).join(' | '));
    ok('Plus de mot « SENSIBLE » / « ORDONNANCIER » dans la ligne', [ls, lo, ld].every((l) => l && !/SENSIBLE|ORDONNANCIER/.test(l.texte)), [ls, lo, ld].map((l) => l && l.texte).join(' | '));
    ok('Chaque triangle a son info-bulle', [ls, lo, ld].every((l) => l && l.triangles.length > 0 && l.triangles.every((t) => (t.genre === 'sensible' ? /sensible/i : /ordonnancier/i).test(t.info))),
      [ls, lo, ld].map((l) => l.triangles.map((t) => t.info).join(' / ')).join(' | '));
    ok('À l\'ajout de la ligne, le triangle clignote', ld && ld.triangles.length === 2 && ld.triangles.every((t) => t.animation === 'vp-triangle-clignote'), ld.triangles.map((t) => t.animation).join(','));

    /* survol : l'info-bulle s'affiche */
    const sel = '.x-grid-row:has-text("' + (await p.evaluate(([g, c]) => Ext.ComponentQuery.query(g)[0].getStore().findRecord('intCIP', c).get('strNAME'), [C.GRILLE, C.cip(PO)])).slice(0, 12) + '") .vp-triangle';
    await p.locator(sel).first().hover();
    await p.waitForTimeout(1200);
    const bulle = await p.evaluate(() => Array.from(document.querySelectorAll('.x-tip')).filter((t) => t.offsetParent).map((t) => t.textContent).join(' '));
    ok('Survol du triangle : l\'info-bulle dit ce que c\'est', /ordonnancier/i.test(bulle), bulle);

    /* puis fixe */
    await p.mouse.move(5, 5);
    await p.waitForTimeout(4500);
    await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getView().refresh(), C.GRILLE);
    await p.waitForTimeout(400);
    const ld2 = await ligne(p, C.cip(PD));
    ok('Quelques secondes après : le triangle reste, fixe', ld2 && ld2.triangles.length === 2 && ld2.triangles.every((t) => t.animation === 'none'), JSON.stringify(ld2 && ld2.triangles));

    /* 2. colonnes */
    const e = await C.entete(p);
    const col = (texte) => e.colonnes.find((c) => c.texte === texte);
    const numeros = await p.evaluate((g) => { const gr = Ext.ComponentQuery.query(g)[0];
      return gr.getStore().getRange().map((r) => { const td = gr.getView().getNode(r).querySelector('td[class*="numberer"]');
        return td ? td.textContent.trim() : '?'; }).join(','); }, C.GRILLE);
    ok('LG sans titre, numéros de ligne gardés', e.colonnes[0].texte === '' && numeros === '1,2,3,4',
      numeros + ' ; ' + e.colonnes.map((c) => c.texte + ':' + c.largeur).join(' '));
    ok('QD et QS à la largeur d\'une quantité de 3 chiffres (48 px)', col('QD').largeur === 48 && col('QS').largeur === 48, col('QD').largeur + ' / ' + col('QS').largeur);
    ok('MONTANT plus étroit (90 px)', col('MONTANT').largeur === 90, col('MONTANT').largeur);
    /* retour du 05/11 (suite) : P.U a la largeur d'un prix, plus etiree ; taux colle au nom de l'assurance */
    ok("P.U à la largeur d'un prix (80 px)", col('P.U').largeur === 80, col('P.U').largeur);
    const ecartTaux = await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('#taux1').find((x) => x.isVisible());
      if (!t) { return null; }
      const nom = t.previousSibling();
      const r = document.createRange(); r.selectNodeContents(nom.inputEl.dom);
      const finNom = r.getBoundingClientRect().right, debutTaux = t.labelEl.dom.getBoundingClientRect().left;
      return { ecart: Math.round(debutTaux - finNom), nom: nom.getValue(), taux: t.getValue() };
    });
    ok("Taux juste à côté du nom de l'assurance (écart ≤ 30 px)", ecartTaux && ecartTaux.ecart >= 0 && ecartTaux.ecart <= 30, JSON.stringify(ecartTaux));
    const coupes = await p.evaluate((g) => {
      const gr = Ext.ComponentQuery.query(g)[0], out = [];
      gr.headerCt.getGridColumns().filter((c) => c.tdCls === 'vp-ref-cellule' || ['intQUANTITY', 'intQUANTITYSERVED', 'intPRICEUNITAIR', 'intPRICE', 'intCIP'].includes(c.dataIndex))
        .forEach((c) => gr.getView().getEl().dom.querySelectorAll('.x-grid-cell-' + c.getId() + ' .x-grid-cell-inner').forEach((x) => {
          if (x.scrollWidth > x.clientWidth) { out.push((c.text || c.dataIndex) + ' « ' + x.textContent.trim() + ' »'); } }));
      return out;
    }, C.GRILLE);
    ok('Aucun nombre coupé (P.REF, TAUX, QD, QS, P.U, MONTANT, C.CIP), même un P.REF à 4 chiffres', coupes.length === 0, coupes.join(' | '));
    const pref = await p.evaluate(([g, c]) => { const gr = Ext.ComponentQuery.query(g)[0]; const r = gr.getStore().findRecord('intCIP', c);
      const col = gr.headerCt.getGridColumns().find((x) => x.tdCls === 'vp-ref-cellule');
      return gr.getView().getNode(r).querySelector('.x-grid-cell-' + col.getId() + ' .x-grid-cell-inner').textContent.trim(); }, [C.GRILLE, C.cip(PC)]);
    ok('P.REF à 4 chiffres affiché en entier (« 1.200 », jamais « 1.2… »)', /^\d{1,2}\.\d{3}$/.test(pref), pref);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    [PS, PO, PD, PC].forEach((x, i) => remettre(x, avant[i]));
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
