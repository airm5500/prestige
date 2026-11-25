/* RETOUR DU 25/11 (capture) : « je ne veux plus de bouton style ExtJS bleu » : vente assurance, carte « INFOS
 * ASSURANCE », boutons « Générer » et « Retirer » à côté du numéro de bon, encore au dégradé bleu d'ExtJS.
 * Attendu : nouveau style des écrans refondus (classe ordo-btn : fond clair uni, liseré gris-bleu, texte bleu nuit gras),
 * comme « Exporter CSV » de la commande.
 *
 * Vrai chemin : vente assurance, client à deux organismes (80 % et 20 %, le premier posé sur la vente), un article ;
 * écrans 1366 × 768 et 1920 × 1080.
 * Contrôles, pour chaque bouton de chaque organisme : fond uni (pas de dégradé), même fond, même liseré et même couleur
 * de texte qu'un bouton de référence au nouveau style dessiné dans la page ; icône gardée ; bouton entier dans la carte,
 * sur la ligne du numéro de bon ; au survol, le fond change (retour visuel gardé).
 * Fonction gardée : « Générer » remplit le numéro de bon du bon organisme (valeur du serveur), « Retirer » retire
 * l'organisme de la vente (un bloc de moins à l'écran).
 * Lancement seul : node src/test/e2e/vente/test-boutons-bon-style-2511.js
 */
const C = require('../ligne-comptant/commun');
const { ok, A } = C;

const lire = (p) => p.evaluate(() => {
  /* bouton de reference au nouveau style, pose hors ecran puis retire */
  const ref = Ext.create('Ext.button.Button', { text: 'Référence', cls: 'ordo-btn', renderTo: document.body, style: 'position:absolute;left:-2000px;top:0' });
  const sr = getComputedStyle(ref.getEl().dom), sri = getComputedStyle(ref.getEl().dom.querySelector('.x-btn-inner'));
  const attendu = { fond: sr.backgroundColor, bord: sr.borderTopColor, texte: sri.color };
  ref.destroy();
  return Ext.ComponentQuery.query('button').filter((b) => b.isVisible(true) && /^(Générer|Retirer)$/.test(b.getText())).map((b) => {
    const el = b.getEl().dom, s = getComputedStyle(el), si = getComputedStyle(el.querySelector('.x-btn-inner'));
    const ligne = b.up('fieldcontainer'), champ = ligne && ligne.down('textfield');
    const r = el.getBoundingClientRect(), rc = ligne.getEl().dom.getBoundingClientRect(), rf = champ ? champ.getEl().dom.getBoundingClientRect() : null;
    return { texte: b.getText(), id: b.getId(), fond: s.backgroundColor, degrade: s.backgroundImage, bord: s.borderTopColor, couleur: si.color,
      icone: !!el.querySelector('.x-btn-icon-el.ic7, .ic7'), entier: r.left >= rc.left - 1 && r.right <= rc.right + 1 && r.width > 40,
      memeLigne: !!rf && Math.abs((r.top + r.bottom) / 2 - (rf.top + rf.bottom) / 2) < 8, attendu };
  });
});

(async () => {
  const TP1 = A.tiersPayant('BS1', '1'), TP2 = A.tiersPayant('BS2', '1');
  const P1 = C.produitSimple(3);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    await A.clientAssure(sess.api, 'BS2511', [{ tp: TP1, taux: 80 }, { tp: TP2, taux: 20 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' BS2511');
    await C.taperArticle(p, C.cip(P1));
    C.noterVente(await C.venteCourante(p));
    for (const [lg, ht] of [[1366, 768], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht });
      await p.waitForTimeout(800);
      const bs = await lire(p);
      ok(`${lg}×${ht} : « Générer » et « Retirer » présents (organisme de la vente)`, bs.filter((b) => b.texte === 'Générer').length >= 1 && bs.filter((b) => b.texte === 'Retirer').length === bs.filter((b) => b.texte === 'Générer').length, JSON.stringify(bs.map((b) => b.texte)));
      for (const b of bs) {
        ok(`${lg}×${ht} : « ${b.texte} » au nouveau style (fond uni, fond, liseré et texte du bouton de référence)`, b.degrade === 'none'
          && b.fond === b.attendu.fond && b.bord === b.attendu.bord && b.couleur === b.attendu.texte, JSON.stringify(b));
        ok(`${lg}×${ht} : « ${b.texte} » garde son icône, entier, sur la ligne du numéro de bon`, b.icone && b.entier && b.memeLigne, JSON.stringify(b));
      }
    }
    const avant = (await lire(p))[0];
    await p.hover('#' + avant.id);
    await p.waitForTimeout(300);
    const survol = await p.evaluate((id) => getComputedStyle(document.getElementById(id)).backgroundColor, avant.id);
    ok('Survol de « Générer » : le fond change', survol !== avant.fond, avant.fond + ' -> ' + survol);
    /* fonction gardée : « Générer » remplit le numéro de bon du premier organisme */
    const champ = await p.evaluate((id) => { const b = Ext.getCmp(id); const f = b.up('fieldcontainer').down('textfield'); f.setValue(''); return f.getId(); }, avant.id);
    const rep = p.waitForResponse((r) => /\/vente\/numero-bon\//.test(r.url()), { timeout: 20000 });
    await p.click('#' + avant.id);
    const corps = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(600);
    const valeur = await p.evaluate((id) => Ext.getCmp(id).getValue(), champ);
    ok('« Générer » : le numéro de bon affiché = celui rendu par le serveur', !!corps.numBon && valeur === corps.numBon, JSON.stringify({ corps, valeur }));
    /* « Retirer » sur le dernier organisme : un bloc de moins */
    const blocs = () => p.evaluate(() => Ext.ComponentQuery.query('button').filter((b) => b.isVisible(true) && b.getText() === 'Retirer').length);
    const n0 = await blocs();
    const retirer = (await lire(p)).filter((b) => b.texte === 'Retirer').pop();
    await p.click('#' + retirer.id);
    await p.waitForTimeout(500);
    if (await blocs() === n0) { await p.click('#' + retirer.id).catch(() => {}); await p.waitForTimeout(800); }
    ok('« Retirer » : l\'organisme est retiré de la vente (un bloc de moins)', await blocs() === n0 - 1, n0 + ' -> ' + await blocs());
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
