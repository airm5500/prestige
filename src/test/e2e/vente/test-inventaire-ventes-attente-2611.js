/* Manque relevé le 26/11 : menu « Ventes », onglet « Ventes en attente » : « Créer un inventaire » (confirmation dans
 * le bouton, retour du 25/11) n'était testé que sans vente (« Aucun produit »). Ce test le joue jusqu'au bout.
 *
 * Jeu d'essai fait par l'écran de vente (administrateur) :
 *  - W : P1 tapé deux fois (P1 x2) et P2 x1, « METTRE EN ATTENTE » ;
 *  - Z : P3 x1, « METTRE EN ATTENTE » (ne doit pas entrer dans l'inventaire de la recherche de W).
 * Contrôles (onglet « Ventes en attente », recherche = référence de W) :
 *  1. la liste montre W seule (= base) ;
 *  2. 1er clic : le bouton annonce 2 produits et demande confirmation (rouge), sans fenêtre, aucun inventaire ;
 *  3. 2e clic : un seul inventaire « INVENTAIRE PRODUITS EN ATTENTE DU ... », avec P1 et P2 une fois chacun (= produits
 *     de W en base), sans P3 ; le bouton le dit, puis revient à « Créer un inventaire » ;
 *  4. bilan : W et Z inchangées (statut, montant, lignes), stock de P1, P2, P3 inchangé, aucune autre trace
 *     (un seul inventaire, ni plus ni moins) ;
 *  5. ergonomie : à 1280 × 600 le bouton armé reste entier et visible ;
 * aucune erreur JavaScript ; jeu d'essai retiré (ventes, inventaire).
 * Lancement seul : node src/test/e2e/vente/test-inventaire-ventes-attente-2611.js
 */
const L = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q } = L;
const C = require('../audits/commun');
const ENV_E2E = A.ENV_E2E;

const P1 = L.produitSimple(7), P2 = L.produitSimple(8), P3 = L.produitSimple(9);
const INV0 = q("SELECT IFNULL(MAX(dt_CREATED), '2000-01-01') FROM t_inventaire");
const ventes = [];
const attendre = async (f, delai) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await new Promise((r) => setTimeout(r, 500)); } return f(); };
const inventaires = () => q("SELECT IFNULL(GROUP_CONCAT(lg_INVENTAIRE_ID), '') FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE PRODUITS EN ATTENTE DU%' AND dt_CREATED > '" + INV0 + "'");
const tousInventaires = () => q("SELECT COUNT(*) FROM t_inventaire WHERE dt_CREATED > '" + INV0 + "'");
const empreinte = (id) => q("SELECT CONCAT_WS('|', p.str_STATUT, p.int_PRICE, IFNULL(p.etat_saisie, '-'), (SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, 'x', d.int_QUANTITY) ORDER BY d.lg_FAMILLE_ID)"
  + " FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)) FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = '" + id + "'");
const stocks = () => [P1, P2, P3].map((x) => C.stock(x)).join('|');

function nettoyer() {
  const inv = inventaires();
  if (inv) {
    const l = inv.split(',').map((x) => "'" + x + "'").join(',');
    q('DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (' + l + '); DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN (' + l + ')');
  }
  const v = A.liste(ventes);
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE vente_id IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ")");
}

async function enAttente(p, produits) {
  await L.nouvelleVente(p);
  for (const pr of produits) { await L.taperArticle(p, L.cip(pr)); }
  const v = await L.venteCourante(p); ventes.push(v);
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
  await attendre(() => q("SELECT IFNULL(etat_saisie, '-') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === 'EN_ATTENTE', 10000);
  return v;
}
async function chercher(p, texte) {
  await vues.cliquer(p, 'cloturerventemanager #query');
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Backspace');
  if (texte) { await p.keyboard.type(texte, { delay: 15 }); }
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1500);
}
const boutonInv = (p) => p.evaluate(() => { const b = Ext.ComponentQuery.query('cloturerventemanager #createInventaire')[0];
  const r = b.getEl().dom.getBoundingClientRect(), x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { id: b.getId(), texte: b.getText(), arme: b.hasCls('psv-arme'), fenetre: Ext.ComponentQuery.query('messagebox{isVisible()}').length,
    entier: r.width > 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight && !!x && b.getEl().dom.contains(x) }; });
const texteInv = (p, re) => p.waitForFunction((r) => new RegExp(r).test(Ext.ComponentQuery.query('cloturerventemanager #createInventaire')[0].getText()), re.source, { timeout: 20000 }).catch(() => {});

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 600 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    A.ouvrirCaisse();
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await require('../support/fenetre-vente-en-cours').mettreEnAttente(p);
    const stocks0 = stocks();
    const w = await enAttente(p, [P1, P1, P2]);
    const z = await enAttente(p, [P3]);
    const refW = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + w + "'");
    const eW = empreinte(w), eZ = empreinte(z);
    ok('0. Jeu d\'essai par l\'écran de vente : W (P1 x2, P2 x1) et Z (P3 x1) en attente',
      /EN_ATTENTE/.test(eW) && eW.endsWith([P1.id + 'x2', P2.id + 'x1'].sort().join(',')) && /EN_ATTENTE/.test(eZ) && eZ.endsWith(P3.id + 'x1'), eW + ' / ' + eZ);

    /* 1. onglet « Ventes en attente » (onglet par defaut du menu), recherche = reference de W */
    await L.ouvrirEcran(p, 'cloturerventemanager');
    await L.visible(p, 'cloturerventemanager #addBtn');
    await p.locator('.x-tab', { hasText: 'Ventes en attente' }).first().click();
    await p.waitForTimeout(800);
    await chercher(p, refW);
    const liste = await p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0].getStore().getRange().map((r) => r.get('lgPREENREGISTREMENTID')));
    ok('1. Recherche par la référence de W : la liste montre W seule', liste.length === 1 && liste[0] === w, JSON.stringify(liste));

    /* 2. 1er clic */
    const inv0 = inventaires(), tous0 = tousInventaires();
    await p.click('#' + (await boutonInv(p)).id);
    await texteInv(p, /Confirmer/);
    const i1 = await boutonInv(p);
    ok('2. 1er clic : « Confirmer : inventaire de 2 produit(s) », bouton armé, entier à 1280 × 600, sans fenêtre ; aucun inventaire',
      /Confirmer : inventaire de 2 produit/.test(i1.texte) && i1.arme && i1.entier && i1.fenetre === 0 && inventaires() === inv0, JSON.stringify(i1));

    /* 3. 2e clic */
    await p.click('#' + i1.id);
    await attendre(() => inventaires() !== inv0, 20000);
    await texteInv(p, /Inventaire créé/);
    const i3 = await boutonInv(p);
    const invs = inventaires().split(',').filter(Boolean);
    const produitsInv = invs.length === 1 ? q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY lg_FAMILLE_ID) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + invs[0] + "'") : '';
    ok('3. 2e clic : un seul inventaire « INVENTAIRE PRODUITS EN ATTENTE DU ... », P1 et P2 une fois chacun (= produits de W), sans P3 ; le bouton le dit, sans fenêtre',
      invs.length === 1 && produitsInv === [P1.id, P2.id].sort().join(',') && /Inventaire créé : 2 produit/.test(i3.texte) && i3.fenetre === 0,
      invs.join(',') + ' : ' + produitsInv + ' ' + JSON.stringify(i3));
    await p.waitForTimeout(4500);
    const i4 = await boutonInv(p);
    ok('3. Le message s\'efface : « Créer un inventaire » de nouveau', i4.texte === 'Créer un inventaire' && !i4.arme, JSON.stringify(i4));

    /* 4. bilan avant / apres */
    ok('4. Bilan : W et Z inchangées (statut, montant, état, lignes), stock de P1, P2, P3 inchangé, un seul inventaire créé',
      empreinte(w) === eW && empreinte(z) === eZ && stocks() === stocks0 && Number(tousInventaires()) === Number(tous0) + 1,
      JSON.stringify({ w: empreinte(w), eW, z: empreinte(z), eZ, stocks: stocks(), stocks0, tous: tousInventaires(), tous0 }));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await Promise.race([b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    nettoyer();
    ok('Jeu d\'essai retiré (ventes, inventaire)', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && inventaires() === '');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
