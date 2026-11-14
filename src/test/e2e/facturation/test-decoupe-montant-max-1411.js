/* FACTURATION AVEC UN « MONTANT MAXIMAL PAR FACTURE » (fiche du tiers payant), 14/11/2026.
 *
 * Defaut : la decoupe des bons en factures (factureManagement.createInvoices, cas 1, et ses copies de
 * GroupeTierspayantController) creait une facture VIDE quand le premier bon depassait a lui seul le plafond, OUBLIAIT
 * les deux derniers bons quand le depassement tombait sur le dernier, et fermait des factures trop tot.
 *
 * Parcours de l'ecran : menu Factures, bouton « Creer », « Filtrer par : Par tiers payant », choix du tiers payant,
 * dates, « Rechercher », « Generer facture », « Non » a l'impression. Puis rapprochement ligne par ligne :
 * bons a l'ecran avant generation = bons en base ; factures en base = factures attendues ; montant et nombre de
 * dossiers de chaque facture = somme de ses bons = liste des factures a l'ecran. Bilan : chaque bon facture une fois
 * et une seule, aucune facture vide, aucune autre facture creee.
 *
 * Trois organismes, un client par bon (l'ordre des bons suit le nom du client) :
 *   A : plafond = premier bon - 1 -> premier bon seul au-dessus du plafond, dernier bon seul au-dessus aussi ;
 *   B : plafond = deux bons exactement (egalite au plafond) ;
 *   C : plafond au-dessus du total (une seule facture, comme avant).
 * Quantites de 1 a 4. Jeu d'essai retire a la fin, compteur des numeros de facture remis.
 * Lancement seul : node src/test/e2e/facturation/test-decoupe-montant-max-1411.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { ok, q, exec, MARQUE } = C;

const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

(async () => {
  C.ouvrirCaisse();
  const compteur = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CODE_FACTURE'");
  C.etat.restaurations.push("UPDATE t_parameters SET str_VALUE = '" + compteur + "' WHERE str_KEY = 'KEY_CODE_FACTURE'");
  const facturesAvant = Number(q('SELECT COUNT(*) FROM t_facture'));
  /* prix multiple de 5 : la part a 80 % d'un article vaut exactement u = prix x 4 / 5 */
  const P = C.produit(8, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0) AND MOD(f.int_PRICE, 5) = 0");
  const u = P.pu * 4 / 5;
  const sess = await C.connecter();
  const { p, api } = sess;
  const VO = C.venteAssurance(api);

  /* plafond fixe sur la fiche AVANT les ventes (la fiche est gardee en cache par le serveur des la premiere vente) */
  const SCEN = [
    { nom: 'DMA', qtes: [3, 1, 1, 2, 4], max: Math.floor(2.5 * u), attendu: [[0], [1, 2], [3], [4]] },
    { nom: 'DMB', qtes: [1, 1, 1, 1, 2], max: 2 * u, attendu: [[0, 1], [2, 3], [4]] },
    { nom: 'DMC', qtes: [2, 1], max: 3 * u + 1000, attendu: [[0, 1]] },
  ];
  const bonDe = (v) => q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  const montantBon = (b) => Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'"));
  const statutBon = (b) => q("SELECT str_STATUT_FACTURE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'");

  try {
    /* ---- existant : tiers payants, un client et une vente par bon ---- */
    for (const s of SCEN) {
      s.tp = C.tiersPayant(s.nom, '1', 'int_NBREBONS = 0, int_MONTANTFAC = ' + s.max);
      s.libelle = MARQUE + '-TP-' + s.nom;
      s.bons = [];
      for (let i = 0; i < s.qtes.length; i++) {
        const cl = await C.clientAssure(api, s.nom + String(i + 1).padStart(2, '0'), [{ tp: s.tp, taux: 80 }]);
        const { v } = await VO.vendre(cl, [{ lien: cl.lien(s.tp), taux: 80, bon: MARQUE + '-' + s.nom + '-' + i }], P, s.qtes[i]);
        s.bons.push(bonDe(v));
      }
      s.montants = s.bons.map(montantBon);
      ok('Précondition ' + s.nom + ' : part de chaque bon = quantité x ' + u + ' (plafond ' + s.max + ')',
        s.montants.every((m, i) => m === s.qtes[i] * u), 'bons ' + s.montants.join(', '));
    }

    /* ---- parcours de l'ecran, un organisme apres l'autre ---- */
    const hier = new Date(Date.now() - 86400000);
    const demain = new Date(Date.now() + 86400000);
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((g) => g.isVisible(true)), null, { timeout: 30000 });
    for (const s of SCEN) {
      await V.cliquer(p, 'facturemanager button[iconCls=addicon]');
      await p.waitForFunction(() => { const c = Ext.getCmp('MODE_SELECTION'); return c && c.isVisible(true); }, null, { timeout: 30000 });
      await V.choisir(p, '#MODE_SELECTION', 'Par tiers payant');
      /* tiers payant : frappe du nom dans la liste deroulante, puis clic sur la proposition */
      await V.cliquer(p, '#cmb_fact_TIERS_PAYANT');
      await p.keyboard.type(s.libelle, { delay: 20 });
      const picker = await p.evaluate(() => Ext.getCmp('cmb_fact_TIERS_PAYANT').getPicker().getId());
      const prop = p.locator('#' + picker + ' .x-boundlist-item').filter({ hasText: s.libelle }).first();
      await prop.waitFor({ timeout: 20000 });
      await prop.click();
      await V.saisir(p, '#dt_debut', fmt(hier));
      await V.saisir(p, '#dt_fin', fmt(demain));
      await V.cliquer(p, '#btn_add');
      await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 })
        .catch(() => {});
      /* l'ecran montre une ligne par organisme : nombre de dossiers et montant a facturer */
      const aLEcran = await p.evaluate(() => Ext.getCmp('gridpanelID').getStore().getRange().map((r) => r.getData()));
      const somme = s.montants.reduce((t, m) => t + m, 0);
      const ligneTp = aLEcran.find((r) => Object.values(r).some((v) => String(v).indexOf(s.libelle) !== -1)) || aLEcran[0];
      ok(s.nom + ' : écran avant génération = base (' + s.bons.length + ' dossiers, ' + somme + ')', aLEcran.length === 1 && ligneTp
        && Object.values(ligneTp).some((v) => Number(v) === s.bons.length) && Object.values(ligneTp).some((v) => Math.round(Number(v)) === somme),
        JSON.stringify(aLEcran).slice(0, 400));

      await V.cliquer(p, '#btn_create_facture');
      const non = p.locator('.x-message-box .x-btn').filter({ hasText: /^\s*(Non|No)\s*$/ }).filter({ visible: true }).first();
      await non.waitFor({ timeout: 120000 });
      await non.click();
      await p.waitForTimeout(500);
      /* fermeture de la fenetre « Creer une facture » par sa croix */
      const croix = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[itemId=fenetreCreerFacture]').filter((x) => x.isVisible())[0];
        return w && w.tools && w.tools.close ? w.tools.close.getId() : (w ? w.down('tool[type=close]').getId() : null); });
      if (croix) { await p.click('#' + croix); }
      await p.waitForTimeout(800);

      /* ---- base : factures de l'organisme et leurs bons ---- */
      const lignes = q("SELECT f.lg_FACTURE_ID, f.str_CODE_FACTURE, f.dbl_MONTANT_CMDE, f.int_NB_DOSSIER, IFNULL(GROUP_CONCAT(d.str_REF ORDER BY d.str_REF), '')"
        + " FROM t_facture f LEFT JOIN t_facture_detail d ON d.lg_FACTURE_ID = f.lg_FACTURE_ID WHERE f.tiersPayant = '" + s.tp + "' GROUP BY f.lg_FACTURE_ID ORDER BY f.str_CODE_FACTURE")
        .split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const c = l.split('\t');
          return { id: c[0], code: c[1], montant: Number(c[2]), dossiers: Number(c[3]), bons: c[4] ? c[4].split(',') : [] }; });
      s.factures = lignes;
      const attendu = s.attendu.map((idx) => idx.map((i) => s.bons[i]).sort());
      const obtenu = lignes.map((f) => f.bons.slice().sort());
      const desc = (l) => l.map((f) => '[' + f.map((b) => s.montants[s.bons.indexOf(b)]).join('+') + ']').join(' ');
      ok(s.nom + ' : aucune facture vide', lignes.every((f) => f.bons.length > 0), lignes.map((f) => f.code + ':' + f.bons.length + ' bon(s)').join(', '));
      const tous = [].concat(...obtenu);
      ok(s.nom + ' : chaque bon facturé une fois et une seule', s.bons.every((b) => tous.filter((x) => x === b).length === 1) && tous.length === s.bons.length,
        'bons ' + s.bons.length + ', lignes de facture ' + tous.length + ', oubliés ' + s.bons.filter((b) => !tous.includes(b)).length);
      ok(s.nom + ' : découpe attendue (plafond ' + s.max + ')', JSON.stringify(obtenu.map((x) => x.join(',')).sort()) === JSON.stringify(attendu.map((x) => x.join(',')).sort()),
        'attendu ' + desc(attendu) + ' ; obtenu ' + desc(obtenu));
      ok(s.nom + ' : montant et nombre de dossiers de chaque facture = ses bons', lignes.every((f) =>
        f.dossiers === f.bons.length && Math.round(f.montant) === f.bons.reduce((t, b) => t + s.montants[s.bons.indexOf(b)], 0)),
        lignes.map((f) => f.code + ' ' + f.montant + '/' + f.dossiers).join(', '));
      ok(s.nom + ' : chaque facture sous le plafond, sauf un bon seul qui le dépasse', lignes.every((f) => f.montant <= s.max || f.bons.length === 1),
        lignes.map((f) => f.montant).join(', '));
      ok(s.nom + ' : tous les bons marqués facturés', s.bons.every((b) => statutBon(b) === 'charged'), s.bons.map(statutBon).join(','));
    }

    /* ---- rapprochement avec la liste des factures a l'ecran ---- */
    await V.cliquer(p, 'facturemanager button[text=rechercher]').catch(() => {});
    await p.waitForTimeout(1500);
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('facturemanager')[0];
      return g.getStore().getRange().map((r) => r.getData()); });
    for (const s of SCEN) {
      const vues = s.factures.map((f) => ecran.find((r) => Object.values(r).includes(f.code) || Object.values(r).includes(f.id)));
      ok(s.nom + ' : liste des factures à l\'écran = base (code, montant, dossiers)', vues.every((r, i) => r
        && Object.values(r).some((v) => Math.round(Number(v)) === Math.round(s.factures[i].montant))
        && Object.values(r).some((v) => Number(v) === s.factures[i].dossiers)),
        s.factures.map((f, i) => f.code + (vues[i] ? ' vue' : ' ABSENTE')).join(', '));
    }

    /* ---- bilan : aucune autre facture ---- */
    const nb = SCEN.reduce((t, s) => t + s.attendu.length, 0);
    ok('Bilan : exactement ' + nb + ' factures créées, aucune autre', Number(q('SELECT COUNT(*) FROM t_facture')) - facturesAvant === nb,
      'créées ' + (Number(q('SELECT COUNT(*) FROM t_facture')) - facturesAvant));
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
