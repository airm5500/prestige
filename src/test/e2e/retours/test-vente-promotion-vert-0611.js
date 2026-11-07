/* PLAN DU 06/11, POINT 3.1 : « PROMOTION » EN VERT SUR LA LIGNE DE VENTE, COMME LE « OUI » DE LA LISTE DES PROMOTIONS.
 *
 * Avant : le mot etait en rouge fonce (#c0392b).
 * Par l'ecran de vente (compte de test, promotions d'essai posees puis retirees) :
 *  - P en PRIX SPECIAL, U en UNITES GRATUITES (1 offerte a partir de 2, quantite 3), N sans promotion ;
 *  - P et U : « PROMOTION » en vert #2E7D32 (= couleur du « Oui » de l'ecran Promotions, lue a l'ecran), en gras ;
 *    U garde « : dont 1 offerte(s) » ; N n'a pas la mention ;
 *  - ligne non selectionnee : contraste du vert sur le fond >= 4,5 ;
 *  - ligne selectionnee (clic sur la ligne) : la mention reste lisible, contraste >= 3 (texte gras) ;
 *  - rien n'est ecrit par l'affichage (la vente est retiree a la fin).
 * Lancement seul : node src/test/e2e/retours/test-vente-promotion-vert-0611.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

const P = C.produitSansReference(18), U = C.produitSansReference(19), N = C.produitSansReference(20);
const drapeaux = [P, U, N].map((f) => q("SELECT IFNULL(bl_PROMOTED + 0, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + f.id + "'"));
const promotions = [];
const promo = (type, f, prix, seuil, offertes) => {
  const id = Number(q("INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE) VALUES ('" + type + "', CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY); SELECT LAST_INSERT_ID();"));
  promotions.push(id);
  C.exec('INSERT INTO t_promotion_product (int_DISCOUNT, bl_MODE, int_PACK_NUMBER, db_PRICE, int_ACTIVE_AT, dt_PROMOTED_DATE, lg_FAMILLE_ID, lg_CODE_PROMOTION_ID)'
    + ' VALUES (0, 0, ' + offertes + ', ' + prix + ', ' + seuil + ", NOW(), '" + f.id + "', " + id + "); UPDATE t_famille SET bl_PROMOTED = 1 WHERE lg_FAMILLE_ID = '" + f.id + "'");
};

/* mention de la ligne : texte, couleur, graisse, contraste avec le fond reel de la cellule */
const mention = (p, cip) => p.evaluate(([g, c]) => {
  const grille = Ext.ComponentQuery.query(g)[0];
  const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
  if (!r) { return null; }
  const ligne = grille.getView().getNode(r);
  const span = Array.from(ligne.querySelectorAll('span')).find((s) => /PROMOTION/.test(s.textContent));
  if (!span) { return { texte: null }; }
  const rgb = (s) => (s.match(/\d+/g) || []).slice(0, 4).map(Number);
  const lum = (c) => { const v = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  let el = span.parentElement, fond = null;
  while (el) { const b = rgb(getComputedStyle(el).backgroundColor); if (b.length >= 3 && (b.length < 4 || b[3] > 0)) { fond = b; break; } el = el.parentElement; }
  fond = fond || [255, 255, 255];
  const cs = getComputedStyle(span), coul = rgb(cs.color);
  const l1 = lum(coul), l2 = lum(fond);
  return { texte: span.textContent, couleur: coul.slice(0, 3).join(','), gras: Number(cs.fontWeight) >= 600 || cs.fontWeight === 'bold',
    fond: fond.slice(0, 3).join(','), contraste: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100 };
}, [C.GRILLE, cip]);

/* id DOM de la cellule CIP d'une ligne, pour un clic reel */
const idCip = (p, cip) => p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
  const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intCIP')[0]; const cel = grille.getView().getCell(r, col);
  cel.dom.id = cel.dom.id || ('e2e-cip-' + c); return cel.dom.id; }, [C.GRILLE, cip]);

(async () => {
  promo('PRIX SPECIAL', P, P.pu - 135, 0, 0);
  promo('UNITES GRATUITES', U, U.pu, 2, 1);
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    /* couleur du « Oui » de la liste des promotions, lue a l'ecran */
    await C.ouvrirEcran(p, 'promotionmanager').catch(() => null);
    await p.waitForTimeout(2500);
    const oui = await p.evaluate(() => { const s = Array.from(document.querySelectorAll('.x-grid-cell-inner span')).find((x) => x.textContent === 'Oui' && x.offsetParent);
      return s ? getComputedStyle(s).color.match(/\d+/g).slice(0, 3).join(',') : null; });
    ok('Écran Promotions : le « Oui » est vert (46,125,50)', oui === '46,125,50', oui);

    await C.nouvelleVente(p);
    for (const f of [P, U, N]) { await C.taperArticle(p, C.cip(f)); }
    await C.saisirQuantite(p, C.cip(U), 3);
    const v = await C.venteCourante(p);
    C.noterVente(v);
    /* la ligne N est selectionnee (clic sur son CIP) : P et U sont mesurees non selectionnees */
    await p.click('#' + await idCip(p, C.cip(N)));
    await p.waitForTimeout(500);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(800);
    const mP = await mention(p, C.cip(P)), mU = await mention(p, C.cip(U)), mN = await mention(p, C.cip(N));
    ok('P (prix spécial) : « PROMOTION » en vert #2E7D32, en gras, comme le « Oui » des promotions', mP && mP.texte === 'PROMOTION' && mP.couleur === '46,125,50' && mP.couleur === oui && mP.gras, JSON.stringify(mP));
    ok('U (unités gratuites, quantité 3) : « PROMOTION : dont 1 offerte(s) » en vert', mU && /^PROMOTION : dont 1 offerte\(s\)$/.test(mU.texte) && mU.couleur === '46,125,50', JSON.stringify(mU));
    ok('N (sans promotion) : pas de mention', mN && mN.texte === null, JSON.stringify(mN));
    const nonSel = await p.evaluate(([g, cs]) => { const grille = Ext.ComponentQuery.query(g)[0];
      return cs.every((c) => !grille.getSelectionModel().isSelected(grille.getStore().findRecord('intCIP', c, 0, false, true, true))); }, [C.GRILLE, [C.cip(P), C.cip(U)]]);
    ok('Ligne non sélectionnée : contraste du vert sur le fond >= 4,5', nonSel && [mP, mU].every((m) => m && m.contraste >= 4.5), JSON.stringify({ nonSel, mP, mU }));

    /* ligne selectionnee : clic sur la cellule CIP de P */
    await p.click('#' + await idCip(p, C.cip(P)));
    await p.waitForTimeout(600);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(400);
    const sel = await mention(p, C.cip(P));
    const selectionnee = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
      return grille.getSelectionModel().isSelected(r); }, [C.GRILLE, C.cip(P)]);
    ok('Ligne sélectionnée : « PROMOTION » reste lisible (vert foncé, contraste >= 3 en gras)', selectionnee && sel && sel.texte === 'PROMOTION' && sel.gras && sel.contraste >= 3,
      JSON.stringify({ selectionnee, sel }));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close().catch(() => {});
    const l = promotions.join(',') || '0';
    C.exec('DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (' + l + '); DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (' + l + ')');
    [P, U, N].forEach((f, i) => C.exec('UPDATE t_famille SET bl_PROMOTED = ' + drapeaux[i] + " WHERE lg_FAMILLE_ID = '" + f.id + "'"));
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
