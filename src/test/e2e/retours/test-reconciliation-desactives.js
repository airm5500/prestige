/* RECONCILIATION BL (besoins du 11/10, point 7) : case « Rechercher dans les désactivés » (non cochée par défaut) ;
 * cochee, effet immediat : le produit desactive apparait en rouge « (désactivé) » ; l'associer propose de l'activer
 * (sans quitter la commande). La recherche de la vente reste limitee aux produits actifs.
 * Un produit du banc est desactive le temps du test, puis remis dans son etat.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN;
const EMP = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const [ID, CIP, NOM] = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID
  AND s.lg_EMPLACEMENT_ID = '${EMP}' WHERE f.str_STATUT = 'enable' AND LENGTH(f.int_CIP) = 7 AND f.str_NAME REGEXP '^[A-Z]{3}'
  ORDER BY f.lg_FAMILLE_ID LIMIT 1`).split('\t');
const remettre = () => q(`UPDATE t_famille SET str_STATUT = 'enable' WHERE lg_FAMILLE_ID = '${ID}';
  UPDATE t_famille_grossiste SET str_STATUT = 'enable' WHERE lg_FAMILLE_ID = '${ID}';
  UPDATE t_famille_stock SET str_STATUT = 'enable' WHERE lg_FAMILLE_ID = '${ID}';`);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const lignes = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('#resultGrid')[0]; return g.getStore().getRange().map((r) => r.get('intCIP')); });
  try {
    ok('Précondition : produit actif du dépôt', !!ID, NOM);
    q(`UPDATE t_famille SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '${ID}'`);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* page stable apres la connexion (un rechargement peut suivre l'ouverture de session) */
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* la recherche de la vente reste sur les produits actifs */
    const vente = await p.evaluate(async (cip) => (await (await fetch('../api/v1/vente/search?query=' + cip + '&start=0&limit=10')).json()).data.length, CIP);
    ok('Recherche de la vente : produit désactivé absent (inchangée)', vente === 0, vente);
    await p.evaluate(() => {
      const w = Ext.create('testextjs.view.commandemanagement.bonlivraison.ReconciliationPanel', {
        orderId: 'E2E', grossisteId: null, nbTotal: 1, nbReconnus: 0,
        nonReconnus: [{ cip: '9999999', libelle: 'LIGNE BL E2E', quantite: 1, prixAchat: 100, prixVente: 150 }] });
      w.show();
      w.openAssocierDialog(w.getGrid().getStore().getAt(0), 0);
    });
    await p.waitForFunction(() => Ext.ComponentQuery.query('#chercherDesactives').length > 0, null, { timeout: 15000 });
    ok('Case « Rechercher dans les désactivés » non cochée par défaut', !(await p.evaluate(() => Ext.ComponentQuery.query('#chercherDesactives')[0].getValue())));
    await p.evaluate((cip) => { const f = Ext.ComponentQuery.query('#searchField')[0]; f.setValue(cip); f.fireEvent('keyup', f); }, CIP);
    await p.waitForTimeout(1500);
    ok('Sans la case : produit désactivé introuvable', !(await lignes()).includes(CIP), (await lignes()).join(','));
    await p.evaluate(() => Ext.ComponentQuery.query('#chercherDesactives')[0].setValue(true));
    await p.waitForFunction((cip) => Ext.ComponentQuery.query('#resultGrid')[0].getStore().getRange().some((r) => r.get('intCIP') === cip), CIP, { timeout: 10000 }).catch(() => {});
    ok('Case cochée : effet immédiat, produit trouvé', (await lignes()).includes(CIP), (await lignes()).join(','));
    const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('#resultGrid')[0]; return g.getView().getNode(0).innerHTML; });
    ok('Affiché en rouge avec « (désactivé) »', cellule.includes('(désactivé)') && cellule.includes('color:#c62828'));
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('#resultGrid')[0]; g.fireEvent('itemdblclick', g, g.getStore().getAt(0)); });
    await p.waitForFunction(() => { const m = Ext.MessageBox; return m.isVisible() && /désactivé/.test(m.msg.getEl().dom.innerHTML); }, null, { timeout: 5000 }).catch(() => {});
    ok('Associer : proposition d\'activer le produit', await p.evaluate(() => Ext.MessageBox.isVisible() && /activer/.test(Ext.MessageBox.msg.getEl().dom.innerHTML)));
    await p.evaluate(() => Ext.MessageBox.down('button[itemId=yes]').btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /code CIP/.test(Ext.MessageBox.msg.getEl().dom.innerHTML), null, { timeout: 10000 }).catch(() => {});
    ok('Produit activé en base', q(`SELECT str_STATUT FROM t_famille WHERE lg_FAMILLE_ID = '${ID}'`) === 'enable');
    ok('L\'association se poursuit (confirmation du code)', await p.evaluate(() => Ext.MessageBox.isVisible() && /code CIP/.test(Ext.MessageBox.msg.getEl().dom.innerHTML)));
    await p.evaluate(() => Ext.MessageBox.down('button[itemId=no]').btnEl.dom.click());
    ok('CIP du produit inchangé (association refusée)', q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${ID}'`) === CIP);
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    remettre();
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
