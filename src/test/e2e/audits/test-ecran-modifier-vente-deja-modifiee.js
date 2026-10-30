/* VENTES TERMINEES > « Modifier » sur une vente deja modifiee (signale le 29/10 sur domain3, vente 261029_00003) :
 * l'ecran de vente s'ouvrait vide. Le serveur refusait la modification : la copie cloturee d'une modification porte
 * lg_PREENGISTREMENT_ANNULE_ID (sa vente d'origine), et le garde-fou N2 la prenait pour une annulation. L'ecran ignorait
 * le refus et restait vide, sans message.
 *
 * Preparation (hors parcours teste) : vente comptant d'une boite encaissee, puis modifiee et la copie cloturee.
 * Parcours de l'utilisateur, a la souris et au clavier :
 *  - SERVICE CLIENT > « Vente terminées » : date du jour, reference de la vente modifiee, « rechercher » ;
 *  - icone « Modifier » de la ligne : l'ecran de vente s'ouvre avec la vente chargee (ligne du produit visible).
 * Jeu d'essai retire a la fin. Lancement seul : node src/test/e2e/audits/test-ecran-modifier-vente-deja-modifiee.js
 */
const C = require('./commun');
const { ouvrirMenu, cliquer, saisir, texteMessage } = require('../outils/vues');
const { ok, q } = C;

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(7, 50);
  const nomProduit = q("SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
  const sess = await C.connecter();
  const { p, api } = sess;
  const V = C.venteComptant(api);
  try {
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
    /* preparation : vente, modification ouverte puis copie cloturee = « vente issue d'une vente modifiee » */
    const v = await V.vendre(P, 1);
    await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
    const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' AND copy = 1 AND str_STATUT = 'is_Process' LIMIT 1");
    if (copie) { C.etat.ventes.push(copie); }
    const c = copie ? await V.cloturer(copie, { vendeur: C.AUTRE_VENDEUR }) : { success: false };
    const [ref, jour] = q("SELECT CONCAT_WS('|', str_REF, DATE_FORMAT(dt_UPDATED, '%d/%m/%Y')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + copie + "'").split('|');
    ok('Préparation : vente modifiée, copie clôturée', !!copie && c.success && !!ref, ref + ' ' + JSON.stringify({ s: c.success, m: c.msg }));

    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager #query').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'ventemanager #dtStart', jour);
    await saisir(p, 'ventemanager #dtEnd', jour);
    await saisir(p, 'ventemanager #query', ref);
    await cliquer(p, 'ventemanager #rechercher');
    /* la vente modifiee et sa contre-passation portent la meme reference : ligne de montant positif */
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: ref }).filter({ has: p.locator('img[data-qtip="Modifier"]:visible') }).first();
    await ligne.waitFor({ timeout: 60000 });
    const reponse = p.waitForResponse((r) => r.url().includes('vente/modifier-vente-terme/'), { timeout: 60000 });
    await ligne.locator('img[data-qtip="Modifier"]').click();
    const r = await (await reponse).json();
    ok('« Modifier » : le serveur ouvre la modification de la vente déjà modifiée', r && r.success, JSON.stringify(r).slice(0, 200));
    if (r && r.data) { C.etat.ventes.push(r.data.lgPREENREGISTREMENTID); }
    const charge = await p.locator('.x-grid-row').filter({ visible: true, hasText: nomProduit }).first()
      .waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
    const message = await texteMessage(p);
    ok('Écran de vente : la vente est chargée (ligne du produit visible)', charge, charge ? nomProduit : 'écran vide ; message « ' + message + ' »');
    const nouvelle = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + copie + "' AND copy = 1 AND str_STATUT = 'is_Process'");
    ok('Une copie de modification en cours est rattachée à la vente modifiée', nouvelle === '1', nouvelle);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID IN (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('"
      + C.etat.ventes.join("','") + "')) OR lg_PREENGISTREMENT_ANNULE_ID IN ('" + C.etat.ventes.join("','") + "')").split(/\r?\n/).filter(Boolean)
      .forEach((x) => { if (!C.etat.ventes.includes(x)) { C.etat.ventes.push(x); } });
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
