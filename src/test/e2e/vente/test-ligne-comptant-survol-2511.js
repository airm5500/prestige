/* RETOUR DU 25/11 (capture) : vente assurance, ligne cochée « C » (au comptant) puis survolée : la ligne se lit en
 * blocs orange séparés par des bords jaunes (« traits discontinus, pas beau à voir »).
 * Cause : le jaune de la ligne au comptant est posé sur les cellules et l'emporte sur le survol, qui peint aussi
 * l'intérieur des cellules en orange. Même mélange sur une ligne cochée sélectionnée (violet dans du jaune).
 *
 * Vrai chemin : ligne comptant active (KEY_LIGNE_COMPTANT_VO à 1), vente assurance à un organisme (80 %), trois articles
 * de prix différents (quantité 2 sur l'un), le premier coché « C » ; souris réelle sur les lignes, clic sur une
 * désignation pour sélectionner. Écrans 1366 × 768 et 1920 × 1080.
 * Contrôles, pour chaque état : chaque case de la ligne a une seule couleur (cellule = intérieur), la même d'un bout à
 * l'autre de la ligne, liserés du haut et du bas identiques sur toutes les cases :
 *  - ligne cochée, ni survolée ni sélectionnée : jaune (marque de la ligne au comptant gardée) ;
 *  - ligne cochée survolée : orange du survol, comme toute ligne survolée ;
 *  - ligne cochée sélectionnée puis survolée, puis sélectionnée sans survol ;
 *  - ligne non cochée survolée (non-régression) : orange uniforme ; ligne non cochée au repos : pas de jaune.
 * La vente n'est pas terminée ; elle est retirée à la fin avec le jeu d'essai.
 * Lancement seul : node src/test/e2e/vente/test-ligne-comptant-survol-2511.js
 */
const C = require('../ligne-comptant/commun');
const { ok, A } = C;

const JAUNE = (c) => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c || ''); return !!m && Number(m[1]) > 240 && Number(m[2]) > 220 && Number(m[3]) < 210; };

/* couleurs de chaque case d'une ligne : fond de la cellule, fond de l'intérieur, liserés */
const lire = (p, cipProduit) => p.evaluate(([g, c]) => {
  const grille = Ext.ComponentQuery.query(g)[0], v = grille.getView();
  const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
  const tr = v.getNode(r);
  const transparent = (x) => x === 'rgba(0, 0, 0, 0)' || x === 'transparent';
  const cases = Array.from(tr.querySelectorAll(':scope > td.x-grid-cell')).filter((td) => td.offsetWidth > 0).map((td) => {
    const s = getComputedStyle(td), inner = td.querySelector('.x-grid-cell-inner'), si = inner ? getComputedStyle(inner) : null;
    const fi = si ? si.backgroundColor : 'rgba(0, 0, 0, 0)';
    return { fond: s.backgroundColor, interieur: transparent(fi) ? s.backgroundColor : fi, haut: s.borderTopColor + ' ' + s.borderTopWidth, bas: s.borderBottomColor + ' ' + s.borderBottomWidth };
  });
  const couleurs = new Set(cases.map((x) => x.fond).concat(cases.map((x) => x.interieur)));
  return { cases: cases.length, couleurs: Array.from(couleurs), unie: cases.every((x) => x.fond === x.interieur) && couleurs.size === 1,
    liseres: new Set(cases.map((x) => x.haut + '|' + x.bas)).size === 1, classes: tr.className };
}, [C.GRILLE, cipProduit]);

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  const TP = A.tiersPayant('SV2511', '1');
  const P1 = C.produitSimple(2), P2 = C.produitSimple(3), P3 = C.produitSimple(4);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    await A.clientAssure(sess.api, 'SV2511', [{ tp: TP, taux: 80 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' SV2511');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-SV2511');
    await C.taperArticle(p, C.cip(P1));
    await C.taperArticle(p, C.cip(P2));
    await C.taperArticle(p, C.cip(P3));
    await C.taperArticle(p, C.cip(P3));
    C.noterVente(await C.venteCourante(p));
    await C.cocher(p, C.cip(P1));
    await p.waitForTimeout(800);
    const cellule = async (cipProduit, colonne) => p.evaluate(([g, c, d]) => {
      const grille = Ext.ComponentQuery.query(g)[0];
      const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
      const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === d)[0];
      const n = grille.getView().getCell(r, col).dom; n.id = n.id || ('e2e-sv-' + Math.random().toString(36).slice(2)); return '#' + n.id;
    }, [C.GRILLE, cipProduit, colonne]);
    const ailleurs = async () => { await p.mouse.move(5, 5); await p.waitForTimeout(400); };

    for (const [lg, ht] of [[1366, 768], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht });
      await p.waitForTimeout(800);
      await ailleurs();
      const repos = await lire(p, C.cip(P1));
      ok(`${lg}×${ht} : ligne cochée au repos : jaune uni (marque du comptant)`, repos.unie && JAUNE(repos.couleurs[0]) && repos.liseres, JSON.stringify(repos));
      await p.hover(await cellule(C.cip(P1), 'strDESCRIPTION').catch(() => cellule(C.cip(P1), 'intCIP')));
      await p.waitForTimeout(400);
      const survol = await lire(p, C.cip(P1));
      ok(`${lg}×${ht} : ligne cochée survolée : une seule couleur d'un bout à l'autre, liserés continus`, survol.unie && !JAUNE(survol.couleurs[0]) && survol.liseres, JSON.stringify(survol));
      await p.hover(await cellule(C.cip(P2), 'intCIP'));
      await p.waitForTimeout(400);
      const survolNormal = await lire(p, C.cip(P2));
      ok(`${lg}×${ht} : ligne non cochée survolée : même couleur unie que la ligne cochée survolée`, survolNormal.unie && survolNormal.liseres
        && survolNormal.couleurs[0] === survol.couleurs[0], JSON.stringify(survolNormal));
      const reposP1 = await lire(p, C.cip(P1));
      ok(`${lg}×${ht} : la ligne cochée redevient jaune unie quand la souris la quitte`, reposP1.unie && JAUNE(reposP1.couleurs[0]), JSON.stringify(reposP1));
      await ailleurs();
      const reposNormal = await lire(p, C.cip(P3));
      ok(`${lg}×${ht} : ligne non cochée au repos : pas de jaune, une seule couleur`, reposNormal.unie && !JAUNE(reposNormal.couleurs[0]), JSON.stringify(reposNormal));
    }
    /* sélection de la ligne cochée (clic sur le code), survolée puis non survolée */
    await p.click(await cellule(C.cip(P1), 'intCIP'));
    await p.waitForTimeout(500);
    const selSurvol = await lire(p, C.cip(P1));
    ok('Ligne cochée sélectionnée et survolée : une seule couleur, liserés continus', selSurvol.unie && selSurvol.liseres, JSON.stringify(selSurvol));
    await ailleurs();
    const sel = await lire(p, C.cip(P1));
    ok('Ligne cochée sélectionnée, souris ailleurs : une seule couleur, liserés continus', sel.unie && sel.liseres, JSON.stringify(sel));
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
