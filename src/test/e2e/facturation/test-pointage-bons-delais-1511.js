/* POINTAGE DES BONS : DELAIS D'AFFICHAGE SUR UN VRAI VOLUME (demande du 15/11 : « chargement liste lente apres
 * recherche », « chargement detail lent au clic sur la vente a droite », « n'as tu pas integre les tests de delai »).
 *
 * Lecture seule : aucun ecrit, rien a retirer. Donnees : l'organisme qui a le plus de bons dans la base d'essai, sur le
 * mois ou il en a le plus (POINTAGE_TP / POINTAGE_DEBUT / POINTAGE_FIN pour en imposer un autre).
 * Parcours a l'ecran : menu « Bons par organisme », onglet « Pointage », dates tapees, organisme choisi dans la liste,
 * filtre « Tous », filtre « Alertes » puis n° de bon tape + Entree (bon hors de la liste : recherche au serveur), clic
 * sur trois lignes de la liste (fiche a droite), « Actualiser ».
 * Controles :
 *  - nombre de bons de la liste = base (meme regle : vente terminee, non annulee, part > 0) ; compteur « en base » = base ;
 *  - plafonds : liste 3 000 ms, recherche 2 000 ms, fiche 1 500 ms (la plus lente des trois), actualiser 3 000 ms ;
 *  - la fiche ouverte est celle du bon clique ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/facturation/test-pointage-bons-delais-1511.js
 */
const C = require('../audits/commun');
const { ok, q } = C;
const vues = require('../outils/vues');

const P = 'pointagebons';
const PLAFOND_LISTE_MS = 3000, PLAFOND_RECHERCHE_MS = 2000, PLAFOND_FICHE_MS = 1500, PLAFOND_ACTUALISER_MS = 3000;
const REGLE = " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
  + " JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID AND m.typeTransaction = 1 AND m.lg_EMPLACEMENT_ID = '1'"
  + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.imported = 0 AND p.lg_TYPE_VENTE_ID <> '5'";

(async () => {
  /* le plus gros organisme, puis son mois le plus charge */
  const TP = process.env.POINTAGE_TP || q("SELECT l.lg_TIERS_PAYANT_ID" + REGLE + " GROUP BY l.lg_TIERS_PAYANT_ID ORDER BY COUNT(*) DESC LIMIT 1");
  const mois = process.env.POINTAGE_DEBUT ? null : q("SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m-01')" + REGLE + " AND l.lg_TIERS_PAYANT_ID = '" + TP
    + "' GROUP BY DATE_FORMAT(p.dt_UPDATED, '%Y-%m-01') ORDER BY COUNT(*) DESC LIMIT 1");
  const DEBUT = process.env.POINTAGE_DEBUT || mois;
  const FIN = process.env.POINTAGE_FIN || q("SELECT LAST_DAY('" + DEBUT + "')");
  const NOM = q("SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + TP + "'");
  const PERIODE = " AND l.lg_TIERS_PAYANT_ID = '" + TP + "' AND DATE(p.dt_UPDATED) BETWEEN '" + DEBUT + "' AND '" + FIN + "'";
  const enBase = Number(q("SELECT COUNT(*)" + REGLE + PERIODE));
  const totalOrganisme = Number(q("SELECT COUNT(*)" + REGLE + " AND l.lg_TIERS_PAYANT_ID = '" + TP + "'"));
  ok('Jeu de mesure : au moins 100 bons sur la période, organisme d\'au moins 1 000 bons', enBase >= 100 && totalOrganisme >= 1000,
    TP + ' · ' + DEBUT + ' → ' + FIN + ' · ' + enBase + ' bons (organisme : ' + totalOrganisme + ')');
  const fr = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
  const sess = await C.connecter();
  const { p, erreurs } = sess;
  try {
    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction(() => Ext.ComponentQuery.query('bonsorganismeonglets').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await vues.cliquer(p, 'bonsorganismeonglets #bo-pointage');
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), P, { timeout: 30000 });
    /* duree du geste jusqu'a la fin du chargement de la liste qu'il declenche */
    const mesurerChargement = async (geste) => {
      await p.evaluate((x) => {
        const c = Ext.ComponentQuery.query(x)[0];
        c.nbChargements = 0;
        c.store.on('load', () => { c.nbChargements++; }, null, { single: true });
      }, P);
      const t0 = Date.now();
      await geste();
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c.nbChargements > 0 && !c.store.isLoading(); }, P, { timeout: 120000 });
      return Date.now() - t0;
    };
    await vues.saisir(p, P + ' #ptDebut', fr(DEBUT));
    await vues.saisir(p, P + ' #ptFin', fr(FIN));
    const dListe = await mesurerChargement(() => vues.choisir(p, P + ' #ptOrganisme', NOM));
    ok('Délai : liste « à pointer » affichée en moins de ' + PLAFOND_LISTE_MS + ' ms (' + enBase + ' bons)', dListe < PLAFOND_LISTE_MS, dListe + ' ms');
    const dTous = await mesurerChargement(() => vues.cliquer(p, P + ' #ptFiltre button[valeur=TOUS]'));
    ok('Délai : filtre « Tous » en moins de ' + PLAFOND_LISTE_MS + ' ms', dTous < PLAFOND_LISTE_MS, dTous + ' ms');
    const L = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].store.getRange().map((r) => ({ id: r.get('id'), bon: r.get('bon'), alerte: r.get('alerte') })), P);
    const c = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].dernierCompteurs, P);
    ok('Rapprochement : nombre de bons de la liste = base = compteur « en base »', L.length === enBase && c && c.enBase === enBase, L.length + ' / ' + enBase + ' / ' + (c && c.enBase));

    /* recherche d'un bon hors du filtre en cours (filtre « Alertes ») : demande au serveur */
    const dAlertes = await mesurerChargement(() => vues.cliquer(p, P + ' #ptFiltre button[valeur=ALERTES]'));
    const alertes = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].store.getRange().map((r) => r.get('id')), P);
    const cible = L.find((l) => l.bon && !alertes.includes(l.id) && L.filter((m) => m.bon === l.bon).length === 1);
    ok('Délai : filtre « Alertes » en moins de ' + PLAFOND_LISTE_MS + ' ms ; un bon hors de ce filtre existe', dAlertes < PLAFOND_LISTE_MS && !!cible, dAlertes + ' ms · ' + (cible && cible.bon));
    if (cible) {
      await vues.cliquer(p, P + ' #ptScan');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(cible.bon, { delay: 10 });
      const t0 = Date.now();
      await p.keyboard.press('Enter');
      await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return x.fiche && x.fiche.bon.id === a[1]; }, [P, cible.id], { timeout: 120000 });
      const dRecherche = Date.now() - t0;
      ok('Délai : bon tapé hors de la liste, fiche affichée en moins de ' + PLAFOND_RECHERCHE_MS + ' ms', dRecherche < PLAFOND_RECHERCHE_MS, dRecherche + ' ms · ' + cible.bon);
    }

    /* clic sur trois lignes differentes de la liste « Tous » : fiche a droite */
    await mesurerChargement(() => vues.cliquer(p, P + ' #ptFiltre button[valeur=TOUS]'));
    const rangs = [0, Math.floor(enBase / 2), enBase - 1];
    const fiches = [];
    for (const i of rangs) {
      const id = await p.evaluate((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; x.grille.getView().focusRow(a[1]); return x.store.getAt(a[1]).get('id'); }, [P, i]);
      const sel = await p.evaluate((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return '#' + x.grille.getView().getNode(a[1]).id; }, [P, i]);
      await p.waitForTimeout(150);
      const t0 = Date.now();
      await p.click(sel + ' td:nth-child(2)');
      await p.waitForFunction((a) => { const x = Ext.ComponentQuery.query(a[0])[0]; return x.fiche && x.fiche.bon.id === a[1] && /pt-bloc/.test(x.panneau.body.dom.innerHTML); }, [P, id], { timeout: 120000 });
      fiches.push(Date.now() - t0);
    }
    const pire = Math.max(...fiches);
    ok('Délai : clic sur une ligne, fiche du bon cliqué affichée en moins de ' + PLAFOND_FICHE_MS + ' ms (la plus lente de 3)', pire < PLAFOND_FICHE_MS, fiches.join(' / ') + ' ms');
    const dActualiser = await mesurerChargement(() => vues.cliquer(p, P + ' #ptActualiser'));
    ok('Délai : « Actualiser » en moins de ' + PLAFOND_ACTUALISER_MS + ' ms', dActualiser < PLAFOND_ACTUALISER_MS, dActualiser + ' ms');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans erreur', false, e.message);
  } finally {
    await sess.b.close();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
