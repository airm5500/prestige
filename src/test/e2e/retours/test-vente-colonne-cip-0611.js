/* PLAN DU 06/11, POINT 4 : ECRAN DE VENTE, COLONNE C.CIP DE LA GRILLE REDUITE A 13 CARACTERES.
 *
 * Precision de l'utilisateur (07/11) : seul l'affichage de la colonne C.CIP des produits choisis est reduit, a 13
 * caracteres ; le champ de saisie du produit ne change pas.
 * Avant : C.CIP prenait une part de la largeur (flex 1), bien plus que 13 caracteres sur un grand ecran.
 * Par l'ecran de vente (compte de test ; la vente est retiree a la fin) :
 *  - deux produits, l'un a CIP de 13 chiffres, l'autre de 7 ;
 *  - C.CIP fait 140 px (largeur fixe) : 13 caracteres dans la police de la grille y tiennent, padding compris, et pas
 *    beaucoup plus (moins de 17) ;
 *  - rapprochement : le CIP affiche sur chaque ligne = CIP en base, lisible en entier (rien de coupe) ;
 *  - DESIGNATION prend la place : plus de 3 fois C.CIP ;
 *  - le champ de saisie du produit n'est pas limite : 30 caracteres tapes restent 30 ;
 *  - meme largeur apres un changement de taille de la fenetre ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/retours/test-vente-colonne-cip-0611.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const P13 = A.produit(0, 50, " AND f.int_PRICE BETWEEN 1000 AND 9000 AND f.int_CIP REGEXP '^[0-9]{13}$'"
  + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)'
  + ' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1');
const P7 = C.produitSansReference(25);

const mesure = (p) => p.evaluate((g) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  const cols = grille.headerCt.getGridColumns();
  const cip = cols.filter((c) => c.dataIndex === 'intCIP')[0], des = cols.filter((c) => c.dataIndex === 'strNAME')[0];
  const lignes = grille.getStore().getRange().map((r) => {
    const cel = grille.getView().getCell(r, cip).dom, inner = cel.querySelector('.x-grid-cell-inner') || cel;
    return { base: String(r.get('intCIP')), texte: inner.textContent.trim(), coupe: inner.scrollWidth > inner.clientWidth + 1 };
  });
  /* largeur de 13 et de 17 caracteres dans la police reelle de la cellule, padding compris */
  const td0 = grille.getStore().getCount() ? grille.getView().getCell(grille.getStore().getAt(0), cip).dom : null;
  const cel0 = td0 ? td0.querySelector('.x-grid-cell-inner') : null;
  let l13 = null, l17 = null;
  if (cel0) {
    const cs = getComputedStyle(cel0), ctx = document.createElement('canvas').getContext('2d');
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const ct = getComputedStyle(td0);
    /* retraits de la cellule (td) et de son contenu, bordures comprises */
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(ct.paddingLeft) + parseFloat(ct.paddingRight)
      + parseFloat(ct.borderLeftWidth) + parseFloat(ct.borderRightWidth);
    l13 = Math.ceil(ctx.measureText('0'.repeat(13)).width + pad);
    l17 = Math.ceil(ctx.measureText('0'.repeat(17)).width + pad);
  }
  return { cip: cip.getWidth(), flex: cip.flex || null, designation: des.getWidth(), lignes, l13, l17 };
}, C.GRILLE);

(async () => {
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    ok('Préparation : un produit à CIP de 13 chiffres, un de 7', P13 && /^\d{13}$/.test(C.cip(P13)) && /^\d{7}$/.test(C.cip(P7)), P13 && C.cip(P13));
    await C.nouvelleVente(p);
    await C.taperArticle(p, C.cip(P13));
    await C.taperArticle(p, C.cip(P7));
    C.noterVente(await C.venteCourante(p));
    await p.waitForTimeout(800);
    const m = await mesure(p);
    ok('C.CIP en largeur fixe de 140 px', m.cip === 140 && !m.flex, JSON.stringify(m));
    ok('13 caractères y tiennent, et pas 17 (la colonne est réduite à 13 caractères)', m.l13 <= m.cip && m.l17 > m.cip, JSON.stringify({ cip: m.cip, l13: m.l13, l17: m.l17 }));
    ok('Rapprochement : CIP affiché = CIP en base, lisible en entier, sur chaque ligne', m.lignes.length === 2
      && m.lignes.every((l) => l.texte === l.base && !l.coupe) && m.lignes.map((l) => l.base).sort().join() === [C.cip(P13), C.cip(P7)].sort().join(), JSON.stringify(m.lignes));
    ok('DESIGNATION prend la place : plus de 3 fois C.CIP', m.designation > 3 * m.cip, JSON.stringify({ cip: m.cip, designation: m.designation }));

    /* le champ de saisie n'est pas limite */
    await C.vues.cliquer(p, C.CHAMP_PRODUIT);
    await p.keyboard.press('Control+A');
    const long = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234';
    await p.keyboard.type(long, { delay: 10 });
    const saisi = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getRawValue(), C.CHAMP_PRODUIT);
    ok('Champ de saisie du produit non limité : 30 caractères tapés restent 30', saisi === long, saisi);
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Backspace');
    await p.keyboard.press('Escape');

    await p.setViewportSize({ width: 1280, height: 800 });
    await p.waitForTimeout(1200);
    const m2 = await mesure(p);
    ok('Fenêtre plus petite : C.CIP garde 140 px, CIP toujours entiers', m2.cip === 140 && m2.lignes.every((l) => !l.coupe), JSON.stringify(m2));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
