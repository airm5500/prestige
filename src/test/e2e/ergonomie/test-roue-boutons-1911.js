/* ROUE D'ATTENTE SUR LES BOUTONS (demande du 19/11 : « au clic, une roue qui tourne, pour qu'on ne puisse pas cliquer
 * plusieurs fois »).
 *
 * Par l'ecran (compte de test), reponses du serveur ralenties par le navigateur (rien n'est change cote serveur) :
 *  A. Ventes annulees, « rechercher » clique deux fois a 120 ms : UN appel ; pendant l'attente, roue dans le bouton et
 *     curseur d'attente ; a la reponse, plus de roue, et un nouveau clic relance bien la recherche ;
 *  B. meme bouton, reponse en erreur (connexion coupee) : le bouton est libere, un nouveau clic repart ;
 *  C. ecran de vente, « Terminer la vente » clique trois fois a 150 ms, cloture ralentie : UNE cloture, une seule vente
 *     terminee, un seul mouvement de caisse, stock - quantite une fois ;
 *  D. bouton a bascule (onglet « Analyse par motif ») et bouton sans appel au serveur : jamais de roue ;
 *  E. aucune erreur JavaScript.
 * Jeu d'essai retire a la fin (audits/commun.js). Lancement seul : node src/test/e2e/ergonomie/test-roue-boutons-1911.js
 */
const C = require('../audits/commun');
const L = require('../ligne-comptant/commun');
const vues = require('../outils/vues');
const { ok, q } = C;

const etatBouton = (p, requete) => p.evaluate((r) => {
  const b = Ext.ComponentQuery.query(r)[0];
  if (!b || !b.el) { return null; }
  return { attente: b.el.hasCls('pr-attente'), roue: !!b.el.dom.querySelector('.pr-roue-auto'), curseur: getComputedStyle(b.el.dom).cursor };
}, requete);

(async () => {
  C.ouvrirCaisse();
  const P = C.produit(14, 500, "AND IFNULL(f.is_scheduled, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{6,8}$'"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1");
  P.cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
  const sess = await C.connecter();
  const { p, erreurs } = sess;
  const ctx = p.context();
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  let mode = 'lent';
  const appels = { annulations: 0, cloture: 0 };
  await ctx.route(/\/api\/v1\/ventestats\/annulations/, async (r) => {
    appels.annulations++;
    if (mode === 'coupe') { await new Promise((x) => setTimeout(x, 800)); return r.abort(); }
    await new Promise((x) => setTimeout(x, 2500));
    return r.continue();
  });
  await ctx.route(/\/api\/v1\/vente\/cloturer\/vno/, async (r) => {
    appels.cloture++;
    await new Promise((x) => setTimeout(x, 2500));
    return r.continue();
  });
  try {
    ok('Jeu d\'essai : un produit en stock', !!P.cip, P.cip);
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().childNodes.length > 0; }, null, { timeout: 120000 });

    /* A. double clic sur « rechercher » */
    await L.ouvrirEcran(p, 'venteannuler');
    await L.visible(p, 'venteannuler #rechercher');
    await p.waitForTimeout(3500);
    appels.annulations = 0;
    const id = await p.evaluate(() => '#' + Ext.ComponentQuery.query('venteannuler #rechercher')[0].getId());
    await p.click(id);
    await p.waitForTimeout(120);
    await p.click(id, { force: true });
    await p.waitForTimeout(600);
    const pendant = await etatBouton(p, 'venteannuler #rechercher');
    await p.waitForTimeout(3500);
    const apres = await etatBouton(p, 'venteannuler #rechercher');
    ok('A. « rechercher » cliqué deux fois : un seul appel au serveur', appels.annulations === 1, appels.annulations);
    ok('A. pendant l\'attente : roue dans le bouton, curseur d\'attente', !!pendant && pendant.attente && pendant.roue && pendant.curseur === 'progress', JSON.stringify(pendant));
    ok('A. à la réponse : plus de roue, bouton normal', !!apres && !apres.attente && !apres.roue, JSON.stringify(apres));
    await p.click(id);
    await p.waitForTimeout(3500);
    ok('A. un nouveau clic relance la recherche', appels.annulations === 2, appels.annulations);

    /* B. reponse en erreur */
    mode = 'coupe';
    await p.click(id);
    await p.waitForTimeout(2000);
    await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {});
    const libere = await etatBouton(p, 'venteannuler #rechercher');
    ok('B. connexion coupée : le bouton est libéré', !!libere && !libere.attente && !libere.roue, JSON.stringify(libere));
    mode = 'lent';
    const avantB = appels.annulations;
    await p.click(id);
    await p.waitForTimeout(3500);
    ok('B. un nouveau clic repart', appels.annulations === avantB + 1, appels.annulations - avantB);

    /* D. bouton a bascule : jamais de roue */
    await vues.cliquer(p, 'venteannuler #ongletAnalyse');
    await p.waitForTimeout(400);
    const bascule = await etatBouton(p, 'venteannuler #ongletAnalyse');
    ok('D. onglet « Analyse par motif » (bouton à bascule) : pas de roue', !!bascule && !bascule.attente && !bascule.roue, JSON.stringify(bascule));
    await vues.cliquer(p, 'venteannuler #ongletListe');
    await p.waitForTimeout(3000);

    /* C. « Terminer la vente » clique trois fois */
    await L.nouvelleVente(p);
    await vues.cliquer(p, L.CHAMP_PRODUIT);
    await p.keyboard.type(P.cip, { delay: 40 });
    await p.waitForSelector('.x-boundlist-item:visible', { timeout: 20000 });
    await p.locator('.x-boundlist-item:visible').filter({ hasText: P.cip }).first().click();
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0]; return f && document.activeElement === f.inputEl.dom; }, null, { timeout: 15000 }).catch(() => {});
    await vues.cliquer(p, 'doventemanager #contenu [xtype=fieldcontainer] #qtyField');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2', { delay: 30 });
    const ajout = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 60000 });
    await p.keyboard.press('Enter');
    await ajout;
    await p.waitForTimeout(1500);
    await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {});
    const venteId = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
    if (venteId) { C.etat.ventes.push(venteId); }
    const net = await p.evaluate(() => { const x = testextjs.app.getController('VenteCtr').getNetAmountToPay(); return x ? Number(x.montantNet) : 0; });
    /* la premiere frappe peut etre avalee par le champ : on relit et on retape au besoin */
    let saisi = 0;
    for (let essai = 0; essai < 3 && saisi !== net; essai++) {
      await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(net), { delay: 40 });
      await p.waitForTimeout(300);
      saisi = await p.evaluate(() => Number(String(Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].getValue()).replace(/\D/g, '')));
    }
    await p.keyboard.press('Tab');
    await p.waitForTimeout(500);
    ok('C. vente prête à terminer (net affiché et montant reçu saisi)', !!venteId && net > 0 && saisi === net, venteId + ' net ' + net + ' reçu ' + saisi);
    const stockAvant = C.stock(P);
    const bt = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=toolbar] #btnCloture')[0].getId());
    appels.cloture = 0;
    await p.click(bt);
    await p.waitForTimeout(150);
    await p.click(bt, { force: true }).catch(() => {});
    await p.waitForTimeout(150);
    await p.click(bt, { force: true }).catch(() => {});
    await p.waitForTimeout(4500);
    const message = await vues.texteMessage(p).catch(() => '');
    if (/imprimer le ticket/i.test(message)) { await vues.repondre(p, 'no'); }
    await p.waitForTimeout(1500);
    const closes = venteId ? q("SELECT COUNT(*) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND (lg_PREENREGISTREMENT_ID = '" + venteId + "' OR lg_PARENT_ID = '" + venteId + "')") : '?';
    ok('C. « Terminer la vente » cliqué trois fois : une seule clôture envoyée', appels.cloture === 1, appels.cloture + (message ? ' ; message : ' + message : ''));
    ok('C. bilan : une vente terminée, un mouvement de caisse, stock - 2 une fois', closes === '1'
      && q("SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + venteId + "'") === '1' && stockAvant - C.stock(P) === 2,
      closes + ' vente(s), ' + q("SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + venteId + "'") + ' mouvement(s), stock ' + stockAvant + ' -> ' + C.stock(P));

    /* D. bouton sans appel au serveur : pas de roue (bouton d'essai pose dans la page) */
    const sansAppel = await p.evaluate(async () => {
      const b = Ext.create('Ext.button.Button', { text: 'Essai', renderTo: document.body, handler: function () { } });
      b.el.dom.click();
      await new Promise((x) => setTimeout(x, 300));
      const r = { attente: b.el.hasCls('pr-attente'), roue: !!b.el.dom.querySelector('.pr-roue-auto') };
      b.destroy();
      return r;
    });
    ok('D. bouton sans appel au serveur : pas de roue, pas d\'attente', !sansAppel.attente && !sansAppel.roue, JSON.stringify(sansAppel));
    ok('E. aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await sess.b.close();
    C.nettoyer();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
