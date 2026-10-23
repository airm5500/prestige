/* RETOUR CARNET DEPOT : CODE LU A LA DOUCHETTE ENVOYE ENCODE (retour du 23/10, meme defaut que vente/findone).
 *
 * La recherche du produit lu (carnet-depot/produits-one/<code>/<tiers-payant>) mettait le code tel quel dans
 * l'adresse : un code avec « / » ou « # » partait coupe ou mal route.
 * Parcours par les vues (admin) : GESTION DES TIERS-PAYANTS > Retour carnet dépôt > bouton de retour, tiers-payant
 * choisi dans la liste, « E2E/12#3 » tape dans « Produit », Entree :
 *  - l'appel part avec le code encode (produits-one/E2E%2F12%233/<tiers-payant>) et le serveur repond sans erreur ;
 *  - aucune erreur JavaScript. Lecture seule (rien n'est enregistre).
 */
const { chromium } = require('playwright-core');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const appels = []; p.on('response', (r) => { if (/carnet-depot\/produits-one\//.test(r.url())) { appels.push(r.status() + ' ' + r.url().replace(/\?.*/, '')); } });
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Retour carnet dépôt');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourcarnetdepot #btnRetour').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'retourcarnetdepot #btnRetour');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doRetourCarnet #produit').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await choisir(p, 'doRetourCarnet #tiersPayantsExclus', 0);
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
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
