/* EXPORT DU CATALOGUE VERS L'ERP (GET v1/stock) - audit des exports apres le journal du 15/10.
 *
 * Un article detail cree par l'ecran de deconditionnement n'a pas bool_DECONDITIONNE_EXIST (NULL) : l'export tombait
 * en erreur 500 des qu'un tel article existait (72 sur le banc). Ce que le test etablit (lecture seule) :
 *  - reponse 200 en moins de 30 s, un produit par article parent non supprime ;
 *  - un article deconditionnable porte son article detail (prix et stock du detail) ;
 *  - echantillon : stock officine et nombre de fournisseurs conformes a la base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const r = await p.evaluate(async () => { const t = performance.now(); const x = await fetch('../api/v1/stock'); return { s: x.status, ms: Math.round(performance.now() - t), j: await x.json() }; });
    const attendu = Number(q("SELECT COUNT(*) FROM t_famille WHERE str_STATUT <> 'delete' AND lg_FAMILLE_PARENT_ID = ''"));
    const produits = Array.isArray(r.j) ? r.j : [];
    const detailsNull = q("SELECT COUNT(*) FROM t_famille WHERE str_STATUT <> 'delete' AND lg_FAMILLE_PARENT_ID <> '' AND bool_DECONDITIONNE_EXIST IS NULL");
    ok('Réponse 200 en moins de 30 s, un produit par article (' + detailsNull + ' articles détail sans indicateur)', r.s === 200 && r.ms < 30000 && produits.length === attendu && attendu > 0,
      r.s + ', ' + r.ms + ' ms, ' + produits.length + ' / ' + attendu);
    const decond = produits.filter((x) => x.deconditionnable && x.produits && x.produits.length === 1);
    const attenduDecond = Number(q("SELECT COUNT(DISTINCT f.lg_FAMILLE_ID) FROM t_famille f JOIN t_famille d ON d.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID AND d.str_STATUT <> 'delete'"
      + " WHERE f.str_STATUT <> 'delete' AND f.lg_FAMILLE_PARENT_ID = '' AND f.bool_DECONDITIONNE_EXIST = 1"));
    ok('Articles déconditionnables : article détail joint', decond.length === attenduDecond && attenduDecond > 0, decond.length + ' / ' + attenduDecond);
    let vus = 0; const faux = [];
    for (const x of produits.filter((v, i) => i % Math.max(1, Math.floor(produits.length / 30)) === 0)) {
      const ids = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT <> 'delete' AND lg_FAMILLE_PARENT_ID = '' AND str_NAME = '" + String(x.libelle).replace(/'/g, "''") + "'").split('\n').filter(Boolean);
      if (ids.length !== 1) { continue; }
      const stock = q("SELECT IFNULL((SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + ids[0] + "' AND lg_EMPLACEMENT_ID = '1' LIMIT 1), 'null')");
      const four = Number(q("SELECT COUNT(*) FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + ids[0] + "'"));
      vus++;
      if (String(x.totalQuantity === undefined ? 'null' : x.totalQuantity) !== stock || x.fournisseurProduits.length !== four) { faux.push(x.libelle + ' : ' + x.totalQuantity + '/' + x.fournisseurProduits.length + ' ≠ ' + stock + '/' + four); }
    }
    ok('Échantillon : stock officine et fournisseurs conformes à la base', vus >= 10 && faux.length === 0, vus + ' articles ; ' + faux.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
