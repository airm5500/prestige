/* RETOUR DU 25/11 : « Vente terminées ».
 *  - vente scindée (assurance + comptant) : en plus de l'icône « ⇄ », le numéro de référence de l'autre vente du
 *    couple est écrit à côté, et les montants des deux ventes sont en bleu ;
 *  - le nom du poste (colonne « P ») est en gras.
 *
 * Par le vrai chemin : ligne comptant active (KEY_LIGNE_COMPTANT_VO à 1), poste nommé sur le navigateur, vente
 * assurance à un tiers-payant (70 %), deux articles dont un coché « C », TERMINER LA VENTE ; puis une vente au comptant
 * assurance non scindée (aucun article coché, quantité 2 sur l'un) ; enfin « Vente terminées » ouvert par le menu.
 * Rapprochement écran / base, ligne par ligne : référence, référence liée, montant (= int_PRICE), poste
 * (= str_POSTE_SAISIE). La vente non scindée n'a ni icône, ni référence liée, ni montant en bleu ; son poste est en gras.
 * Tout est retiré à la fin (ventes, client, tiers-payant, paramètre, stock, caisse).
 * Lancement seul : node src/test/e2e/retours/test-ventes-terminees-scindee-2511.js
 */
const C = require('../ligne-comptant/commun');
const { ok, q, A } = C;

const POSTE = 'E2E POSTE SCINDEE 2511';
const menu = (composant) => q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
  + " WHERE s.str_COMPOSANT = '" + composant + "' AND s.str_Status = 'enable' ORDER BY s.int_PRIORITY LIMIT 1").split('|');
const BLEU = (c) => { const m = /rgb\((\d+), (\d+), (\d+)/.exec(c || ''); return !!m && Number(m[3]) >= 150 && Number(m[3]) > Number(m[1]) + 60; };

/* lignes de la grille de « Vente terminées » pour les ventes données : texte, couleur et graisse de chaque case lue */
const lire = (p, ids) => p.evaluate((a) => {
  const g = Ext.ComponentQuery.query('ventemanager gridpanel').find((x) => x.isVisible(true));
  if (!g) { return null; }
  const v = g.getView(), cols = g.headerCt.getGridColumns();
  const col = (d) => cols.find((c) => c.dataIndex === d);
  const cas = (r, d) => { const n = v.getCell(r, col(d)); if (!n) { return null; }
    const inner = n.dom.querySelector('.x-grid-cell-inner') || n.dom, el = inner.querySelector('.vf-montant-liee, .vf-poste-nom') || inner, s = getComputedStyle(el);
    return { texte: inner.innerText.trim(), couleur: s.color, graisse: Number(s.fontWeight) || (s.fontWeight === 'bold' ? 700 : 400),
      icone: !!inner.querySelector('.vente-liee') }; };
  const out = {};
  g.getStore().each((r) => { if (a.includes(r.get('lgPREENREGISTREMENTID'))) {
    out[r.get('lgPREENREGISTREMENTID')] = { ref: cas(r, 'strREF'), montant: cas(r, 'intPRICE'), poste: cas(r, 'posteSaisie') }; } });
  return out;
}, ids);

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  const TP = A.tiersPayant('VS2511', '1');
  const P1 = C.produitSimple(2), P2 = C.produitSimple(3), P3 = C.produitSimple(4);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    await p.evaluate((n) => window.localStorage.setItem('prestige.poste', n), POSTE);
    await A.clientAssure(api, 'VS2511', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' VS2511');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-VS2511');
    await C.taperArticle(p, C.cip(P1));
    await C.taperArticle(p, C.cip(P2));
    const voId = await C.venteCourante(p);
    C.noterVente(voId);
    await C.cocher(p, C.cip(P2));
    const clot = await C.terminerVente(p, false);
    const vnoId = clot.venteLiee;
    C.noterVente(vnoId);
    ok('Jeu d\'essai : vente assurance + comptant terminée (deux ventes liées)', clot.success === true && !!vnoId, JSON.stringify(clot).slice(0, 300));

    /* vente assurance non scindée (aucun article coché « C »), montants différents (quantité 2 sur un article) */
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' VS2511');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-VS2511B');
    await C.taperArticle(p, C.cip(P3));
    await C.taperArticle(p, C.cip(P3));
    await C.taperArticle(p, C.cip(P1));
    const seuleId = await C.venteCourante(p);
    C.noterVente(seuleId);
    const clot2 = await C.terminerVente(p, false);
    ok('Jeu d\'essai : vente assurance non scindée terminée', clot2.success === true && !clot2.venteLiee, JSON.stringify(clot2).slice(0, 300));

    const base = {};
    for (const id of [voId, vnoId, seuleId]) {
      const r = q("SELECT CONCAT_WS('|', str_REF, int_PRICE, IFNULL(str_POSTE_SAISIE, ''), IFNULL(lg_VENTE_LIEE_ID, '')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
      base[id] = { ref: r[0], prix: Number(r[1]), poste: r[2], liee: r[3] };
    }
    ok('Jeu d\'essai : poste de saisie en base sur les trois ventes, montants différents',
      [voId, vnoId, seuleId].every((id) => base[id].poste === POSTE) && new Set([voId, vnoId, seuleId].map((id) => base[id].prix)).size === 3, JSON.stringify(base));

    const m = menu('ventemanager');
    await C.vues.ouvrirMenu(p, m[0], m[1]);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel').find((y) => y.isVisible(true)); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const e = await lire(p, [voId, vnoId, seuleId]) || {};
    ok('Les trois ventes sont dans la liste', !!(e[voId] && e[vnoId] && e[seuleId]), Object.keys(e).join(', '));
    const chiffres = (t) => Number(String(t || '').replace(/\D/g, ''));
    for (const [id, autre, nom] of [[voId, vnoId, 'vente assurance'], [vnoId, voId, 'vente au comptant liée']]) {
      const l = e[id] || {};
      ok(nom + ' : icône « ⇄ » et numéro de l\'autre vente écrit à côté (' + base[autre].ref + ')',
        l.ref && l.ref.icone && l.ref.texte.indexOf(base[id].ref) === 0 && l.ref.texte.includes(base[autre].ref), JSON.stringify(l.ref));
      ok(nom + ' : montant en bleu, égal à la base (' + base[id].prix + ')',
        l.montant && BLEU(l.montant.couleur) && chiffres(l.montant.texte) === base[id].prix, JSON.stringify(l.montant));
    }
    const s = e[seuleId] || {};
    ok('Vente non scindée : ni icône ni autre référence, montant pas en bleu, égal à la base',
      s.ref && !s.ref.icone && s.ref.texte === base[seuleId].ref && s.montant && !BLEU(s.montant.couleur) && chiffres(s.montant.texte) === base[seuleId].prix,
      JSON.stringify(s));
    ok('Colonne « P » : nom du poste en gras sur les trois lignes, égal à la base',
      [voId, vnoId, seuleId].every((id) => e[id] && e[id].poste && e[id].poste.graisse >= 600 && POSTE.indexOf(e[id].poste.texte) === 0 && e[id].poste.texte.length > 0),
      JSON.stringify([voId, vnoId, seuleId].map((id) => e[id] && e[id].poste)));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await p.evaluate(() => window.localStorage.removeItem('prestige.poste')).catch(() => {});
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
