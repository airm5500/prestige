/* VENTE EN DEPOT TERMINEE PAR UN PROFIL AUTORISE (non-regression du controle serveur du 19/10 : les routes
 * clotureVenteDepot et clotureVenteDepotAgree exigent desormais le menu « Vente dépôt », « Gestion depots extensions »
 * ou « Ventes »).
 *
 * Par les vues, admin : SERVICE CLIENT > Vente dépôt > Nouvelle vente, depot choisi, un article, montant recu,
 * « Terminer la vente » : la vente est terminee, caissier = admin. Vente, reglement, recette retires, stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [PRODUIT, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND LENGTH(f.int_CIP) = 7 LIMIT 1").split('\t');
const STOCKS = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_STOCK_ID, '=', int_NUMBER_AVAILABLE, '/', int_NUMBER)) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + PRODUIT + "'");
const ventes = [];
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    const regl = q("SELECT IFNULL(lg_REGLEMENT_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM mvttransaction WHERE vente_id = '" + v + "';"
      + " DELETE FROM vente_reglement WHERE vente_id = '" + v + "'; DELETE FROM t_recettes WHERE str_REF_FACTURE = '" + v + "';"
      + " DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID = '" + regl + "';"
      + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID = '" + regl + "'");
  }
  /* la vente en depot fait entrer l'article dans le stock du depot : mouvement et ligne de stock crees par l'essai */
  q("DELETE FROM hmvtproduit WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_EMPLACEMENT_ID <> '1' AND createdAt >= '" + DEBUT + "'");
  const avant = STOCKS.split(',').map((e) => "'" + e.split('=')[0] + "'").join(',');
  q("DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + PRODUIT + "' AND lg_FAMILLE_STOCK_ID NOT IN (" + avant + ") AND dt_CREATED >= '" + DEBUT + "'");
  for (const e of STOCKS.split(',').filter(Boolean)) {
    const [id, v] = e.split('='); const [a, n] = v.split('/');
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + a + ", int_NUMBER = " + n + " WHERE lg_FAMILLE_STOCK_ID = '" + id + "'");
  }
}

/* une copie sans aucun depot recoit un depot d'essai (retire a la fin) : sinon la liste des depots est vide */
const DEPOT = 'E2E-DEPOT-CLOT';
const retirerDepot = () => q("DELETE FROM hmvtproduit WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'; DELETE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "';"
  + " DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'");
retirerDepot();
const depotEssai = q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID <> '1' AND str_STATUT = 'enable'") === '0';
if (depotEssai) {
  q("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME,"
    + " str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION)"
    + " SELECT '" + DEPOT + "', lg_COMPTE_CLIENT_ID, 'DEPOT E2E CLOTURE', 'E2E', 'ABOBO', 'KOFFI', 'Jean', '0708473750', NOW(), NOW(), 'enable', '2', 0"
    + " FROM t_compte_client WHERE lg_CLIENT_ID IS NOT NULL AND str_STATUT = 'enable' ORDER BY lg_COMPTE_CLIENT_ID LIMIT 1");  /* l ecran exige le client du compte */
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (x) => erreurs.push(x.message));
  const refus = []; p.on('response', (r) => { if (/clotureVenteDepot/.test(r.url())) { refus.push(r.status()); } });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente dépôt');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventedepot #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await cliquer(p, 'ventedepot #addBtn');
    const produit = 'addventedepotbis #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), produit, { timeout: 60000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    const depot = await choisir(p, 'addventedepotbis #typeVente', 0);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(800);
    const typeDepot = await p.evaluate(() => testextjs.app.getController('DepotCtr').getTypeDepot());
    ok('Dépôt choisi', !!depot, depot + ' (type ' + typeDepot + ')');
    await cliquer(p, produit);
    await p.keyboard.type(CIP, { delay: 40 });
    await p.locator('.x-boundlist-item').filter({ visible: true }).first().waitFor({ timeout: 15000 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
    await cliquer(p, 'addventedepotbis #contenu [xtype=fieldcontainer] #qtyField');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('1');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const c = testextjs.app.getController('DepotCtr').getCurrent(); return c && c.lgPREENREGISTREMENTID && parseInt(c.intPRICE, 10) > 0; }, null, { timeout: 20000 });
    const vente = await p.evaluate(() => testextjs.app.getController('DepotCtr').getCurrent().lgPREENREGISTREMENTID);
    ventes.push(vente);
    ok('Article ajouté à la vente en dépôt', !!vente, vente);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1200);
    const recu = await p.evaluate(() => Ext.ComponentQuery.query('addventedepotbis #montantRecu').filter((x) => x.isVisible(true)).length);
    if (recu) {
      const net = await p.evaluate(() => testextjs.app.getController('DepotCtr').getCurrent().intPRICE);
      await cliquer(p, 'addventedepotbis #montantRecu');
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(800);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(net), { delay: 20 });
    }
    await cliquer(p, 'addventedepotbis [xtype=toolbar] #btnCloture');
    const fin = Date.now() + 30000;
    let etat = '';
    while (Date.now() < fin) {
      etat = q("SELECT CONCAT(p.str_STATUT, '|', IFNULL(c.str_LOGIN, '')) FROM t_preenregistrement p LEFT JOIN t_user c ON c.lg_USER_ID = p.lg_USER_CAISSIER_ID WHERE p.lg_PREENREGISTREMENT_ID = '" + vente + "'");
      if (/^is_Closed/.test(etat)) { break; }
      await p.waitForTimeout(500);
    }
    ok('« Terminer la vente » : vente en dépôt terminée par l\'utilisateur connecté, aucun refus du serveur', etat === 'is_Closed|' + ENV_E2E.LOGIN && refus.every((s) => s === 200),
      etat + ' | réponses ' + refus.join(',') + ' | ' + (await texteMessage(p)).slice(0, 150));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    if (depotEssai) { retirerDepot(); }
    ok('Vente retirée, stock remis', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_STOCK_ID, '=', int_NUMBER_AVAILABLE, '/', int_NUMBER)) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCKS);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
