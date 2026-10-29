/* RETOUR CARNET DEPOT : CODE LU A LA DOUCHETTE ENVOYE ENCODE (retour du 23/10, meme defaut que vente/findone).
 *
 * La recherche du produit lu (carnet-depot/produits-one/<code>/<tiers-payant>) mettait le code tel quel dans
 * l'adresse : un code avec « / » ou « # » partait coupe ou mal route.
 * Parcours par les vues (admin) : GESTION DES TIERS-PAYANTS > Retour carnet dépôt > bouton de retour, tiers-payant
 * choisi dans la liste, « E2E/12#3 » tape dans « Produit », Entree :
 *  - l'appel part avec le code encode (produits-one/E2E%2F12%233/<tiers-payant>) et le serveur repond sans erreur ;
 *  - aucune erreur JavaScript. Lecture seule (rien n'est enregistre).
 * La base de travail n'a pas toujours de carnet depot : le test en pose un (type carnet, depot) s'il n'y en a aucun, et
 * le retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../outils/vues');
const { execFileSync } = require('child_process');
const q = (x) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', x], { encoding: 'utf8' }).trim();
const DEPOT = 'E2E-RCC-DEPOT';
const retirer = () => q("DELETE FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + DEPOT + "'");
function poserDepot() {
  retirer();
  if (q("SELECT COUNT(*) FROM t_tiers_payant WHERE str_STATUT = 'enable' AND is_depot = 1 AND lg_TYPE_TIERS_PAYANT_ID = '2'") !== '0') { return; }
  const gabarit = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' AND lg_TYPE_TIERS_PAYANT_ID = '2' LIMIT 1")
    || q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' LIMIT 1");
  q("INSERT INTO t_tiers_payant (lg_TIERS_PAYANT_ID, lg_MODEL_FACTURE_ID, str_CODE_ORGANISME, str_NAME, str_FULLNAME, dt_CREATED, dt_UPDATED,"
    + " str_STATUT, account, is_depot, lg_VILLE_ID, lg_TYPE_TIERS_PAYANT_ID, lg_GROUPE_ID, lg_SEQUENCIER_ID, lg_TYPE_CONTRAT_ID, lg_REGIME_CAISSE_ID, lg_RISQUE_ID)"
    + " SELECT '" + DEPOT + "', t.lg_MODEL_FACTURE_ID, 'E2ERCC', 'E2E CARNET DEPOT', 'E2E CARNET DEPOT RETOUR', NOW(), NOW(), 'enable', 0, 1, t.lg_VILLE_ID, '2',"
    + " t.lg_GROUPE_ID, t.lg_SEQUENCIER_ID, t.lg_TYPE_CONTRAT_ID, t.lg_REGIME_CAISSE_ID, t.lg_RISQUE_ID FROM t_tiers_payant t WHERE t.lg_TIERS_PAYANT_ID = '" + gabarit + "'");
}
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  poserDepot();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const appels = []; p.on('response', (r) => { if (/carnet-depot\/produits-one\//.test(r.url())) { appels.push(r.status() + ' ' + r.url().replace(/\?.*/, '')); } });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Retour carnet dépôt');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourcarnetdepot #btnRetour').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'retourcarnetdepot #btnRetour');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doRetourCarnet #produit').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await choisir(p, 'doRetourCarnet #tiersPayantsExclus', 0);
    /* le choix du tiers-payant rend le focus au champ Produit (texte selectionne) apres un court delai : on lit le
       produit ensuite, comme au comptoir */
    await p.waitForTimeout(2000);
    const tp = await p.evaluate(() => Ext.ComponentQuery.query('doRetourCarnet #tiersPayantsExclus')[0].getValue());
    ok('Tiers-payant choisi dans la liste', !!tp, tp);
    await cliquer(p, 'doRetourCarnet #produit');
    await p.keyboard.type('E2E/12#3', { delay: 10 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    ok('Code « E2E/12#3 » envoyé encodé, réponse sans erreur', appels.some((a) => a.startsWith('200 ') && a.endsWith('/produits-one/E2E%2F12%233/' + encodeURIComponent(tp))), appels.join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Carnet dépôt d\'essai retiré', q("SELECT COUNT(*) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + DEPOT + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
