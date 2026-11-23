/* BASCULEMENT D'EMPLACEMENT : CASES A COCHER DE LA LISTE DES PRODUITS (journal de leana, 19/11 20:47).
 *
 * « Uncaught TypeError: this.majCompteCoches is not a function » (basculement.js) : l'ecouteur checkChange de la
 * colonne a cocher etait declare sans portee ; « this » y designait la colonne, pas la fenetre. Chaque case cochee a la
 * souris levait l'erreur et le compteur « n produits coches » ne bougeait pas. Le test du 12/09 (lot U) cochait par
 * le magasin de donnees, sans clic : il ne passait pas par l'ecouteur.
 *
 * Parcours reel : GESTION DU STOCK > Emplacement, icone « Gestion des articles de l'emplacement » d'une ligne qui a
 * des produits, puis clics de souris sur les cases :
 *  - deux cases cochees : « 2 produits cochés », deux lignes cochees dans la liste ;
 *  - la premiere decochee : « 1 produit coché », seule la seconde reste cochee (rapprochement compteur / liste) ;
 *  - aucune erreur JavaScript ;
 *  - bilan : fenetre fermee sans basculer, aucun produit n'a change d'emplacement (repartition identique en base).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const repartition = () => q("SELECT MD5(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', IFNULL(lg_ZONE_GEO_ID, '')) ORDER BY lg_FAMILLE_ID)) FROM t_famille");

(async () => {
  const avant = repartition();
  const pleines = q("SELECT GROUP_CONCAT(z) FROM (SELECT lg_ZONE_GEO_ID z FROM t_famille WHERE str_STATUT = 'enable' AND lg_ZONE_GEO_ID IS NOT NULL GROUP BY lg_ZONE_GEO_ID HAVING COUNT(*) >= 3) x").split(',');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    ok('Jeu d\'essai : au moins un emplacement avec 3 produits actifs', pleines.length > 0 && pleines[0] !== '', pleines.length);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Emplacement');
    await p.waitForFunction(() => { const g = Ext.getCmp('zonegeographiquegridID'); return g && g.isVisible(true) && g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    const ligne = await p.evaluate((z) => {
      const g = Ext.getCmp('zonegeographiquegridID');
      const i = g.getStore().findBy((r) => z.indexOf(r.get('lg_ZONE_GEO_ID')) >= 0);
      if (i < 0) { return null; }
      const n = g.getView().getNode(i);
      return { id: n.id, lib: g.getStore().getAt(i).get('str_LIBELLEE') };
    }, pleines);
    ok('Liste des emplacements : une ligne avec des produits sur la première page', !!ligne, JSON.stringify(ligne));
    await p.click('#' + ligne.id + ' .pillsv');
    await p.waitForFunction(() => { const g = Ext.getCmp('basculID'); return g && g.isVisible(true) && g.getStore().getCount() >= 2 && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const compte = () => p.evaluate(() => Ext.getCmp('compteCoches').text);
    const coches = () => p.evaluate(() => Ext.getCmp('basculID').getStore().getRange().filter((r) => r.get('isChecked')).map((r) => r.get('lg_FAMILLE_ID')));
    const produit = (i) => p.evaluate((k) => Ext.getCmp('basculID').getStore().getAt(k).get('lg_FAMILLE_ID'), i);
    const caseDe = async (i) => {
      const id = await p.evaluate((k) => Ext.getCmp('basculID').getView().getNode(k).id, i);
      return p.locator('#' + id + ' .x-grid-checkcolumn');
    };
    ok('Ouverture : « 0 produit coché »', /^0 produit coché$/.test(await compte()), await compte());
    const p0 = await produit(0), p1 = await produit(1);
    await (await caseDe(0)).click();
    await p.waitForTimeout(300);
    await (await caseDe(1)).click();
    await p.waitForTimeout(300);
    const c2 = await coches();
    ok('Deux cases cochées à la souris : « 2 produits cochés »', /^2 produits cochés$/.test(await compte()), await compte());
    ok('Rapprochement : les deux lignes cliquées sont cochées dans la liste', c2.length === 2 && c2.includes(p0) && c2.includes(p1), JSON.stringify(c2));
    await (await caseDe(0)).click();
    await p.waitForTimeout(300);
    const c1 = await coches();
    ok('Première case décochée : « 1 produit coché »', /^1 produit coché$/.test(await compte()), await compte());
    ok('Rapprochement : seule la seconde ligne reste cochée', c1.length === 1 && c1[0] === p1, JSON.stringify(c1));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await p.evaluate(() => Ext.getCmp('basculID').up('window').close());
    await p.waitForTimeout(500);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  ok('Bilan : fenêtre fermée sans basculer, aucun produit n\'a changé d\'emplacement', repartition() === avant);
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
