/* RECHERCHE PERIMES : quantite du lot et stock restant (retours de recette du 28/10, VC-11).
 * Un lot d'essai de 10 boites dont 4 restent : l'ecran « Recherche perimes » doit montrer « Qte lot » 10 et « Qte
 * restante » 4, et l'export CSV porte les deux colonnes. Lot et stock d'essai retires a la fin.
 * Lancement seul : node src/test/e2e/audits/test-perimes-qte-restante.js
 */
const C = require('./commun');
const { ok, q, exec, ADMIN, MARQUE } = C;

(async () => {
  const P = C.produit(7, 50, "AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID)");
  const lot = MARQUE + '-LOT-PER';
  exec("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, int_QTY_VENDUE, current_stock)"
    + " VALUES ('" + lot + "', '" + ADMIN + "', '" + P.id + "', '" + lot + "', 10, NOW(), NOW(), CURDATE() + INTERVAL 10 DAY, 'enable', 6, 4)");
  C.etat.restaurations.push("DELETE FROM t_lot WHERE lg_LOT_ID = '" + lot + "'");
  const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
  const sess = await C.connecter();
  const { p, api } = sess;
  try {
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('peremptionquery', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('peremptionquery gridpanel')[0], null, { timeout: 30000 });
    const entetes = await p.evaluate(() => Ext.ComponentQuery.query('peremptionquery gridpanel')[0].columns.map((c) => c.text).filter(Boolean));
    ok('En-têtes : « Qté lot » puis « Qté restante » (plus de « Qunatité »)',
      entetes.indexOf('Qté lot') >= 0 && entetes.indexOf('Qté restante') === entetes.indexOf('Qté lot') + 1 && entetes.indexOf('Qunatité') < 0, entetes.join(' | '));

    /* le chargement a l'ouverture se termine d'abord (sinon sa reponse, plus tardive, remplace celle de la recherche) */
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('peremptionquery gridpanel')[0].getStore(); return !!s.lastOptions && !s.isLoading(); },
      null, { timeout: 60000 });
    /* parcours de l'ecran : nombre de mois, recherche par CIP, bouton « rechercher » */
    await p.evaluate(([c]) => {
      Ext.ComponentQuery.query('peremptionquery #nbreMois')[0].setValue(1);
      Ext.ComponentQuery.query('peremptionquery #query')[0].setValue(c);
      Ext.ComponentQuery.query('peremptionquery #rechercher')[0].fireEvent('click');
    }, [cip]);
    await p.waitForFunction(([l]) => {
      const s = Ext.ComponentQuery.query('peremptionquery gridpanel')[0].getStore();
      return !s.isLoading() && s.getRange().some((r) => r.get('numLot') === l);
    }, [lot], { timeout: 30000 }).catch(() => null);
    const ligne = await p.evaluate(([l]) => {
      const g = Ext.ComponentQuery.query('peremptionquery gridpanel')[0];
      const r = g.getStore().getRange().find((x) => x.get('numLot') === l);
      if (!r) { const s = g.getStore(); return { introuvable: true, lignes: s.getCount(), parametres: s.lastOptions && s.lastOptions.params }; }
      const cellules = Array.from(g.getView().getNode(r).querySelectorAll('td')).map((td) => td.textContent.trim());
      return { lot: r.get('quantiteLot'), restante: r.get('quantiteRestante'), cellules };
    }, [lot]);
    ok('Ligne du lot d\'essai : Qté lot 10, Qté restante 4, affichées dans la grille',
      !!ligne && ligne.lot === 10 && ligne.restante === 4 && ligne.cellules.join('|').includes('10|4'),
      JSON.stringify(ligne));

    /* exports : memes colonnes */
    const csv = await p.evaluate(async ([c]) => {
      const r = await fetch('../api/v1/fichearticle/perimes/csv?nbreMois=1&query=' + encodeURIComponent(c));
      return r.ok ? (await r.text()) : 'HTTP ' + r.status;
    }, [cip]);
    const lignesCsv = csv.split(/\r?\n/);
    const enteteCsv = lignesCsv.find((x) => /Qt/.test(x)) || '';
    const ligneCsv = lignesCsv.find((x) => x.includes(lot)) || '';
    ok('Export CSV : colonnes « Qté lot » et « Qté restante », valeurs 10 et 4',
      /Qté lot.Qté restante/.test(enteteCsv) && /\b10.4\b/.test(ligneCsv), enteteCsv.slice(0, 160) + ' / ' + ligneCsv.slice(0, 160));

    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
    void api;
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
