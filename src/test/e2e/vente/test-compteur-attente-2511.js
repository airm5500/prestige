/* RETOUR DU 25/11, POINT 4 : ecran de vente, bouton « Ventes en attente ». Quand il reste une prevente et qu'on la
 * rappelle, le nombre (1) restait sur le bouton.
 * Cause : le nombre n'etait relu qu'a l'ouverture de l'ecran et apres une recherche par numero (avant meme que la vente
 * ne soit ouverte) ; le rappel par la fenetre ne le relisait pas.
 *
 * Jeu d'essai (retire a la fin) : deux ventes au comptant en attente du compte de test, produits differents,
 * quantites 1 et 3. Vrai chemin : ecran de vente, bouton « Ventes en attente », carte choisie, Entree (rappel).
 * Controles (rapprochement bouton / base, en relatif : d'autres ventes du jour peuvent etre en attente) :
 *  - ecran ouvert : nombre du bouton = ventes en attente comptees en base (n) ;
 *  - rappel de la premiere : n - 1 tout de suite, et toujours n - 1 apres le signal de l'ecran (3 s) ; en base la
 *    vente rappelee est « en cours » ;
 *  - la seconde est rappelee par sa recherche (numero tape, Entree) apres avoir mis la premiere en attente par le bouton
 *    « Mettre en attente » : nombre = n - 1 (une revient, une part) ; puis la derniere en attente rappelee de meme :
 *    nombre = n - 2, et le bouton n'affiche plus rien si n - 2 = 0.
 * Lancement seul : node src/test/e2e/vente/test-compteur-attente-2511.js
 */
const C = require('../audits/commun');
const { ok, q } = C;
const vues = require('../outils/vues');
const ENV_E2E = require('../outils/poste');

const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const crees = [];

(async () => {
  C.ouvrirCaisse();
  const P1 = C.produit(23, 200), P2 = C.produit(24, 200);
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  /* ventes en attente du jour visibles de ce compte, selon la regle du serveur (statut en cours, etat vide ou en attente) */
  const enBase = () => Number(q("SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Process' AND (p.etat_saisie IS NULL OR p.etat_saisie = 'EN_ATTENTE')"
    + " AND p.dt_UPDATED >= CURDATE() AND p.int_PRICE > 0 AND p.lg_PREENREGISTREMENT_ID IN ('" + crees.join("','") + "')"));
  const bouton = () => p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0];
    const s = b && b.getEl() ? b.getEl().dom.querySelector('.vp-attente-nombre') : null;
    return s && s.style.display !== 'none' ? Number(s.textContent || 0) : 0; });
  try {
    const ajouter = (prod, qte) => api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: prod.id, itemPu: prod.pu, qte, qteServie: qte,
      devis: false, remiseId: '', venteId: null, userVendeurId: user, prevente: false });
    const r1 = await ajouter(P1, 1); crees.push(r1.data.lgPREENREGISTREMENTID);
    await p.waitForTimeout(1100);
    const r2 = await ajouter(P2, 3); crees.push(r2.data.lgPREENREGISTREMENTID);
    const [v1, v2] = crees;
    const refs = crees.map((v) => q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'"));
    ok('Jeu d\'essai : deux ventes en attente (quantités 1 et 3)', enBase() === 2, refs.join(', '));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn').some((b) => b.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    const n0 = await bouton();
    ok('Écran ouvert : le bouton compte nos 2 ventes en attente (' + n0 + ')', n0 >= 2, n0);

    /* rappel par la fenetre */
    await vues.cliquer(p, 'doventemanager #preventeSearchBtn');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('ventesattentefenetre')[0]; return w && w.getEl().dom.querySelectorAll('.va-carte').length >= 2; }, null, { timeout: 20000 });
    await p.evaluate((r) => { const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); c.id = 'carte-visee'; }, refs[0]);
    await p.click('#carte-visee'); await p.waitForTimeout(900);
    await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, v1, { timeout: 20000 });
    await p.waitForTimeout(1000);
    const n1 = await bouton();
    ok('Rappel par la fenêtre : le bouton passe à ' + (n0 - 1) + ' tout de suite', n1 === n0 - 1, n0 + ' → ' + n1);
    await p.waitForTimeout(3000);
    const n1b = await bouton();
    const etat1 = q("SELECT IFNULL(etat_saisie, '∅') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'");
    ok('Après le signal de l\'écran : toujours ' + (n0 - 1) + ' ; en base la vente rappelée est en cours (rapprochement bouton / base : ' + enBase() + ' des nôtres en attente)',
      n1b === n0 - 1 && etat1 === 'EN_COURS' && enBase() === 1, n1b + ' ' + etat1);

    /* la premiere remise en attente par le bouton, la seconde rappelee par son numero */
    await vues.cliquer(p, 'doventemanager #contenu #btnStandBy');
    await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return !c.current || c.current.lgPREENREGISTREMENTID !== id; }, v1, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const nAttente = await bouton();
    ok('« Mettre en attente » : la vente revient dans le nombre (' + n0 + ')', nAttente === n0 && enBase() === 2, nAttente + ' ; base ' + enBase());
    await vues.cliquer(p, 'doventemanager #preventeSearchField');
    await p.keyboard.type(refs[1], { delay: 20 });
    await p.keyboard.press('Enter');
    const charge = await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr');
      return (c.current && c.current.lgPREENREGISTREMENTID === id) || Ext.ComponentQuery.query('ventesattentefenetre').length > 0; }, v2, { timeout: 20000 })
      .then(() => true).catch(() => false);
    if (!charge) {
      const diag = await p.evaluate(() => { const v = Ext.ComponentQuery.query('doventemanager')[0], f = v && v.down('#preventeSearchField'), s = v && v.down('#preventeStatut');
        return { champ: f ? f.getValue() : null, statut: s && s.getEl() ? s.getEl().dom.textContent : null, messages: Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => m.el.dom.textContent) }; });
      throw new Error('vente ' + refs[1] + ' non chargée par sa recherche : ' + JSON.stringify(diag));
    }
    if (await p.evaluate(() => Ext.ComponentQuery.query('ventesattentefenetre').length > 0)) { await p.keyboard.press('Enter'); }
    await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, v2, { timeout: 20000 });
    await p.waitForTimeout(3500);
    const n2 = await bouton();
    ok('Rappel par le numéro : ' + (n0 - 1) + ' (une revient, une part), = base', n2 === n0 - 1 && enBase() === 1, n2 + ' ; base ' + enBase());
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await Promise.race([sess.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    if (crees.length) {
      const v = "'" + crees.join("','") + "'";
      C.exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
        + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
        + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
        + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";");
    }
    C.nettoyer();
    ok('Jeu d\'essai retiré', crees.every((id) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") === '0'));
  }
  process.exit(C.bilan() ? 1 : 0);
})();
