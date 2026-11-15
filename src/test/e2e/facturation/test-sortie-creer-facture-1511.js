/* PLAN DU 14/11, POINT 1 : SORTIES DE LA FENETRE « CREER UNE FACTURE ».
 *
 * Defaut : apres « Generer facture », repondre « Non » a « Voulez-vous imprimer ? » laissait la fenetre ouverte ; le
 * bouton RETOUR ne la fermait pas non plus ; seule la croix marchait. Cause : la vue declare l'id « addeditfactureID »
 * mais initComponent le remplacait par « panelID » ; retourListeFactures ne retrouvait donc pas la fenetre et
 * rechargeait la liste DERRIERE elle (une seconde liste des factures).
 *
 * Parcours de l'ecran (1366 x 700, un ecran de portable) : menu Factures, « Creer », « Par tiers payant », organisme,
 * dates, « Rechercher », puis chacune des sorties :
 *   1. « Generer facture » puis « Non »  (organisme A, 2 bons : quantites 1 et 3) ;
 *   2. « Generer facture » puis « Oui »  (organisme B, 1 bon : quantite 2) -> l'impression s'ouvre dans un onglet ;
 *   3. RETOUR sans generer               (organisme C, 1 bon : quantite 4) ;
 *   4. la croix de la fenetre, sans generer (organisme C).
 * Apres chaque sortie : plus aucune fenetre ouverte, une seule liste des factures, visible ; pas de vue « Creer une
 * facture » restee en memoire. Pendant que la fenetre est ouverte : la vue porte bien son id, le bouton RETOUR est
 * visible et cliquable sans defiler.
 * Rapprochement : factures en base = liste des factures a l'ecran (code, montant, dossiers) = somme des bons.
 * Bilan : une facture pour A, une pour B, aucune pour C ; bons de C non factures ; aucune autre facture.
 * Jeu d'essai retire a la fin, compteur des numeros de facture remis.
 * Lancement seul : node src/test/e2e/facturation/test-sortie-creer-facture-1511.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { ok, q, MARQUE } = C;

const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

/* etat de l'ecran : fenetres visibles (hors boites de message), listes des factures, vue de creation restante */
const etatEcran = (p) => p.evaluate(() => ({
  fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox')).map((w) => w.title || w.getId()),
  listes: Ext.ComponentQuery.query('facturemanager').length,
  listeVisible: Ext.ComponentQuery.query('facturemanager').some((g) => g.isVisible(true)),
  vues: Ext.ComponentQuery.query('addeditfacture').length,
}));

(async () => {
  C.ouvrirCaisse();
  const compteur = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CODE_FACTURE'");
  C.etat.restaurations.push("UPDATE t_parameters SET str_VALUE = '" + compteur + "' WHERE str_KEY = 'KEY_CODE_FACTURE'");
  const facturesAvant = Number(q('SELECT COUNT(*) FROM t_facture'));
  const P = C.produit(8, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0) AND MOD(f.int_PRICE, 5) = 0");
  const sess = await C.connecter();
  const { p, api } = sess;
  await p.setViewportSize({ width: 1366, height: 700 });
  const VO = C.venteAssurance(api);
  const bonDe = (v) => q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  const montantBon = (b) => Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'"));
  const statutBon = (b) => q("SELECT IFNULL(str_STATUT_FACTURE, '') FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'");
  const ORG = [
    { nom: 'SFA', qtes: [1, 3], factures: 1 },
    { nom: 'SFB', qtes: [2], factures: 1 },
    { nom: 'SFC', qtes: [4], factures: 0 },
  ];
  const onglets = [];
  p.context().on('page', (o) => onglets.push(o));

  try {
    for (const o of ORG) {
      o.tp = C.tiersPayant(o.nom, '1', 'int_NBREBONS = 0, int_MONTANTFAC = 0');
      o.libelle = MARQUE + '-TP-' + o.nom;
      o.bons = [];
      for (let i = 0; i < o.qtes.length; i++) {
        const cl = await C.clientAssure(api, o.nom + String(i + 1).padStart(2, '0'), [{ tp: o.tp, taux: 80 }]);
        const { v } = await VO.vendre(cl, [{ lien: cl.lien(o.tp), taux: 80, bon: MARQUE + '-' + o.nom + '-' + i }], P, o.qtes[i]);
        o.bons.push(bonDe(v));
      }
      o.montants = o.bons.map(montantBon);
    }
    ok('Précondition : bons créés, montants différents (quantités 1, 3, 2, 4)', ORG.every((o) => o.montants.every((m) => m > 0))
      && new Set([].concat(...ORG.map((o) => o.montants))).size === 4, ORG.map((o) => o.nom + ' ' + o.montants.join('+')).join(' ; '));

    const hier = new Date(Date.now() - 86400000);
    const demain = new Date(Date.now() + 86400000);
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((g) => g.isVisible(true)), null, { timeout: 30000 });

    /* ouvre « Creer », choisit l'organisme et les dates, « Rechercher » ; renvoie les controles de la fenetre ouverte */
    const ouvrir = async (o) => {
      await V.cliquer(p, 'facturemanager button[iconCls=addicon]');
      await p.waitForFunction(() => { const c = Ext.getCmp('MODE_SELECTION'); return c && c.isVisible(true); }, null, { timeout: 30000 });
      await V.choisir(p, '#MODE_SELECTION', 'Par tiers payant');
      await V.cliquer(p, '#cmb_fact_TIERS_PAYANT');
      await p.keyboard.type(o.libelle, { delay: 20 });
      const picker = await p.evaluate(() => Ext.getCmp('cmb_fact_TIERS_PAYANT').getPicker().getId());
      const prop = p.locator('#' + picker + ' .x-boundlist-item').filter({ hasText: o.libelle }).first();
      await prop.waitFor({ timeout: 20000 });
      await prop.click();
      await V.saisir(p, '#dt_debut', fmt(hier));
      await V.saisir(p, '#dt_fin', fmt(demain));
      await V.cliquer(p, '#btn_add');
      await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 })
        .catch(() => {});
      return p.evaluate(() => {
        const w = Ext.ComponentQuery.query('window[itemId=fenetreCreerFacture]').filter((x) => x.isVisible())[0];
        const vue = Ext.getCmp('addeditfactureID');
        const bt = Ext.getCmp('btn_cancel');
        let retourVisible = false;
        if (w && bt && bt.isVisible(true)) {
          const r = bt.getEl().dom.getBoundingClientRect(), f = w.getEl().dom.getBoundingClientRect();
          const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          retourVisible = r.width > 0 && r.top >= f.top && r.bottom <= f.bottom && r.bottom <= window.innerHeight && !!dessus && bt.getEl().dom.contains(dessus);
        }
        return { fenetre: !!w, idVue: !!vue && vue.isXType('addeditfacture') && !!w && vue.up('window') === w, retourVisible };
      });
    };
    const verifierSortie = async (titre) => {
      await p.waitForTimeout(1500);
      const e = await etatEcran(p);
      ok(titre + ' : plus aucune fenêtre ouverte', e.fenetres.length === 0, JSON.stringify(e));
      ok(titre + ' : une seule liste des factures, visible', e.listes === 1 && e.listeVisible, JSON.stringify(e));
      ok(titre + ' : la vue « Créer une facture » est détruite', e.vues === 0, JSON.stringify(e));
    };
    const repondre = async (texte) => {
      const bt = p.locator('.x-message-box .x-btn').filter({ hasText: texte }).filter({ visible: true }).first();
      await bt.waitFor({ timeout: 120000 });
      await bt.click();
    };

    /* 1. « Non » */
    let f = await ouvrir(ORG[0]);
    ok('Fenêtre ouverte : la vue porte son id « addeditfactureID », dans la fenêtre', f.fenetre && f.idVue, JSON.stringify(f));
    ok('Fenêtre ouverte : RETOUR visible et cliquable sans défiler (1366 x 700)', f.retourVisible, JSON.stringify(f));
    await V.cliquer(p, '#btn_create_facture');
    await repondre(/^\s*(Non|No)\s*$/);
    await verifierSortie('« Non » à l\'impression');

    /* 2. « Oui » : l'impression s'ouvre dans un onglet */
    f = await ouvrir(ORG[1]);
    await V.cliquer(p, '#btn_create_facture');
    await repondre(/^\s*(Oui|Yes)\s*$/);
    await verifierSortie('« Oui » à l\'impression');
    /* l'onglet de l'impression peut s'ouvrir un peu apres la fermeture de la fenetre */
    for (let i = 0; i < 20 && onglets.length === 0; i++) { await p.waitForTimeout(500); }
    ok('« Oui » : l\'impression s\'ouvre dans un onglet', onglets.length === 1, onglets.length + ' onglet(s)');
    for (const o of onglets) { await o.close().catch(() => {}); }

    /* 3. RETOUR sans generer */
    f = await ouvrir(ORG[2]);
    await V.cliquer(p, '#btn_cancel');
    await verifierSortie('RETOUR');

    /* 4. la croix, sans generer */
    f = await ouvrir(ORG[2]);
    const croix = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[itemId=fenetreCreerFacture]').filter((x) => x.isVisible())[0];
      return w.down('tool[type=close]').getId(); });
    await p.click('#' + croix);
    await verifierSortie('Croix');

    /* rapprochement base / liste des factures a l'ecran */
    await p.waitForTimeout(1500);
    const ecran = await p.evaluate(() => Ext.ComponentQuery.query('facturemanager')[0].getStore().getRange().map((r) => r.getData()));
    for (const o of ORG) {
      o.base = q("SELECT f.str_CODE_FACTURE, f.dbl_MONTANT_CMDE, f.int_NB_DOSSIER FROM t_facture f WHERE f.tiersPayant = '" + o.tp + "' ORDER BY f.str_CODE_FACTURE")
        .split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const c = l.split('\t'); return { code: c[0], montant: Math.round(Number(c[1])), dossiers: Number(c[2]) }; });
      const somme = o.montants.reduce((t, m) => t + m, 0);
      ok(o.nom + ' : ' + o.factures + ' facture(s) en base', o.base.length === o.factures, JSON.stringify(o.base));
      if (o.factures) {
        ok(o.nom + ' : montant et dossiers de la facture = ses bons (' + somme + ', ' + o.bons.length + ')',
          o.base[0].montant === somme && o.base[0].dossiers === o.bons.length, JSON.stringify(o.base));
        const r = ecran.find((x) => Object.values(x).includes(o.base[0].code));
        ok(o.nom + ' : facture visible dans la liste à l\'écran, mêmes montant et dossiers', !!r
          && Object.values(r).some((v) => Math.round(Number(v)) === o.base[0].montant) && Object.values(r).some((v) => Number(v) === o.base[0].dossiers),
          JSON.stringify(r || {}).slice(0, 300));
        ok(o.nom + ' : bons marqués facturés', o.bons.every((b) => statutBon(b) === 'charged'), o.bons.map(statutBon).join(','));
      } else {
        ok(o.nom + ' : bons non facturés après RETOUR et croix', o.bons.every((b) => statutBon(b) !== 'charged'), o.bons.map(statutBon).join(','));
      }
    }
    const nb = Number(q('SELECT COUNT(*) FROM t_facture')) - facturesAvant;
    ok('Bilan : exactement 2 factures créées, aucune autre', nb === 2, nb + ' créée(s)');
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
