/* RETOUR DU 25/11, POINT 3 : ecran de vente, assurance et carnet. Le bouton « Fiche client » ne doit pas etre dans la
 * barre du reglement mais au niveau du client, a cote du « Suivi de consommation ».
 *
 * Jeu d'essai (retire a la fin) : un organisme assurance (FCA) et un organisme carnet (FCK), un client assure et un
 * client carnet. Vrai chemin : menu Ventes, nouvelle vente, segment « Assurance » (puis « Carnet »), nom du client tape
 * puis Entree ; a 1366×768 et 1920×1080.
 * Controles, pour l'assurance et le carnet :
 *  - sans client : aucun bouton « Fiche client » (ni dans la carte ni dans la barre) ;
 *  - client choisi : bouton dans la carte du client, juste a droite du suivi de consommation (meme ligne, colles),
 *    dans la carte ; plus de « FICHE CLIENT » dans la barre du reglement ;
 *  - clic : la fiche de CE client s'ouvre en fenetre (titre = nom du client en base : rapprochement) ;
 *  - non-regression : au comptant avec un client, « FICHE CLIENT » reste dans la barre (test
 *    retours/test-fiche-client-fenetre.js) ; ici : retour au comptant sans client -> rien d'affiche.
 * Lancement seul : node src/test/e2e/vente/test-fiche-client-carte-2511.js
 */
const L = require('../ligne-comptant/commun');
const { ok, q, exec, MARQUE, vues } = L;
const C = require('../audits/commun');

(async () => {
  const TA = C.tiersPayant('FCA', '1'), TK = C.tiersPayant('FCK', '2');
  const assure = await C.clientAssure(null, 'FCASS', [{ tp: TA, taux: 80 }]);
  const carnet = await C.clientAssure(null, 'FCCAR', [{ tp: TK, taux: 100 }]);
  /* en vente carnet, l'ecran ne cherche que les clients de type carnet (2) */
  exec("UPDATE t_client SET lg_TYPE_CLIENT_ID = '2' WHERE lg_CLIENT_ID = '" + carnet.clientId + "'");
  const sess = await L.connecterEtOuvrirVente();
  const { p, erreurs } = sess;
  const etat = () => p.evaluate(() => {
    const v = (s) => { const c = Ext.ComponentQuery.query('doventemanager ' + s)[0]; return !!(c && c.isVisible(true)); };
    const r = (s) => { const c = Ext.ComponentQuery.query('doventemanager ' + s)[0]; return c && c.isVisible(true) ? c.getEl().dom.getBoundingClientRect() : null; };
    const carte = r('#assureCmp'), suivi = r('#suiviConsoAssure'), fiche = r('#ficheClientAssure');
    return { carteVisible: v('#ficheClientAssure'), barreVisible: v('#btnFicheClient'),
      aCote: !!(suivi && fiche && Math.abs(fiche.top - suivi.top) < 3 && fiche.left >= suivi.right - 1 && fiche.left - suivi.right <= 8),
      dansCarte: !!(carte && fiche && fiche.right <= carte.right + 1 && fiche.bottom <= carte.bottom + 1 && fiche.left >= carte.left) };
  });
  const fermerMessages = async () => {
    for (let i = 0; i < 4; i++) {
      const id = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (!m) { return null; }
        const b = ['ok', 'no'].map((x) => m.down('button[itemId=' + x + ']')).find((x) => x && x.isVisible()); return b ? b.getId() : null; });
      if (!id) { return; }
      await p.click('#' + id); await p.waitForTimeout(400);
    }
  };
  const choisirClient = async (nom, matricule) => {
    await vues.cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(MARQUE + ' ' + nom, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligne = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: matricule }).first();
    const pose = p.locator('text=(' + matricule + ')').filter({ visible: true }).first();
    await Promise.race([ligne.waitFor({ timeout: 30000 }), pose.waitFor({ timeout: 30000 })]);
    if (await ligne.isVisible().catch(() => false)) { await ligne.click(); }
    await p.waitForTimeout(2000);
    await fermerMessages();
  };
  try {
    for (const [type, libelle, valeur, cl, nom] of [['assurance', 'Assurance', '2', assure, 'FCASS'], ['carnet', 'Carnet', '3', carnet, 'FCCAR']]) {
      await L.choisirType(p, libelle, valeur);
      let e = await etat();
      ok(type + ' sans client : aucun bouton « Fiche client »', !e.carteVisible && !e.barreVisible, JSON.stringify(e));
      await choisirClient(nom, MARQUE + '-' + nom);
      for (const [l, h] of [[1366, 768], [1920, 1080]]) {
        await p.setViewportSize({ width: l, height: h });
        await p.waitForTimeout(700);
        e = await etat();
        ok(type + ' ' + l + '×' + h + ' : « Fiche client » dans la carte du client, collé à droite du suivi de consommation ; plus dans la barre du règlement',
          e.carteVisible && e.aCote && e.dansCarte && !e.barreVisible, JSON.stringify(e));
      }
      const id = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #ficheClientAssure')[0]; return b && b.isVisible(true) ? b.getEl().dom.id : null; });
      if (id) {
        await p.click('#' + id);
        await p.waitForFunction(() => Ext.ComponentQuery.query('#fenFicheClient').some((w) => w.isVisible()), null, { timeout: 30000 }).catch(() => {});
        const titre = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenFicheClient').filter((x) => x.isVisible())[0]; return w ? w.title : null; });
        const nomBase = q("SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
        ok(type + ' : clic -> la fiche de ce client s\'ouvre (titre = nom en base : ' + nomBase + ')', !!titre && titre.indexOf(nomBase) >= 0, titre);
        await p.evaluate(() => Ext.ComponentQuery.query('#fenFicheClient').forEach((w) => w.close()));
        await p.waitForTimeout(500);
      } else {
        ok(type + ' : clic -> la fiche de ce client s\'ouvre', false, 'pas de bouton « Fiche client » dans la carte (ancien code)');
      }
    }
    await L.choisirType(p, 'Au comptant', '1');
    const e = await etat();
    ok('Retour au comptant sans client : aucun bouton « Fiche client »', !e.carteVisible && !e.barreVisible, JSON.stringify(e));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await Promise.race([sess.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
