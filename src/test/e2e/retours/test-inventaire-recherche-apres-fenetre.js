/* TRAVAUX D'INVENTAIRE : RECHERCHE APRES UNE FENETRE DE CREATION (journal de leana, 16/11).
 *
 * « Me.rechargerAvecFiltres is not a function » (InventaireManager.js) : Me est une variable globale ; la fenetre
 * « Créer inventaire » (comme les autres fenetres des inventaires) la reecrit a son ouverture. Une fois la fenetre
 * fermee, la recherche, l'effacement et les filtres de la liste appelaient la fenetre detruite.
 *
 * Parcours reel : GESTION DU STOCK > Travaux d'Inventaire, bouton « Créer inventaire », fenetre fermee sans rien
 * creer, puis recherche tapee au clavier + Entree, puis « Effacer » :
 *  - aucune erreur JavaScript ;
 *  - la recherche part (search_value = terme tape) et la liste affiche la reponse (rapprochement : lignes affichees =
 *    lignes renvoyees, chacune contient le terme, total >= lignes affichees) ;
 *  - « Effacer » recharge la liste sans filtre ;
 *  - bilan : aucun inventaire cree.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const nbInventaires = () => q('SELECT COUNT(*) FROM t_inventaire');

(async () => {
  const avant = nbInventaires();
  /* terme : debut du nom d'un inventaire existant (3 lettres), pour une liste filtree non vide */
  const terme = q("SELECT LEFT(TRIM(str_NAME), 3) FROM t_inventaire WHERE str_STATUT <> 'delete' AND TRIM(str_NAME) REGEXP '^[A-Za-z]{3}' ORDER BY dt_CREATED DESC LIMIT 1");
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [], requetes = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  p.on('request', (r) => { if (/search_value=/.test(r.url())) { requetes.push(r.url()); } });
  try {
    ok('Jeu d\'essai : un nom d\'inventaire pour la recherche', terme.length === 3, terme);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Travaux d\'Inventaire');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('inventaire')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await cliquer(p, 'inventaire button[text=Cr&eacute;er inventaire]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible() && /inventaire/i.test(w.title || '')), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const outil = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && /inventaire/i.test(x.title || ''))[0];
      const t = w.down('tool[type=close]'); return t ? t.getId() : null; });
    await p.click('#' + outil);
    await p.waitForTimeout(800);
    ok('Fenêtre « Créer inventaire » ouverte puis fermée', await p.evaluate(() => !Ext.ComponentQuery.query('window').some((w) => w.isVisible() && /inventaire/i.test(w.title || ''))));

    await cliquer(p, 'inventaire #rechercheInventaire');
    await p.keyboard.type(terme, { delay: 30 });
    const [rep] = await Promise.all([p.waitForResponse((r) => /search_value=/.test(r.url()), { timeout: 30000 }), p.keyboard.press('Enter')]);
    const corps = await rep.json().catch(() => null);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('inventaire')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const affiche = await p.evaluate(() => Ext.ComponentQuery.query('inventaire')[0].getStore().getRange().map((r) => Object.values(r.data).join(' ')));
    const renvoyes = corps && (corps.results || corps.data || []);
    const total = corps ? Number(corps.total) : -1;
    ok('Recherche envoyée avec le terme tapé', requetes.some((u) => decodeURIComponent(u).includes('search_value=' + terme)), requetes.slice(-1)[0]);
    ok('Rapprochement : lignes affichées = lignes renvoyées, chacune contient le terme', affiche.length > 0 && Array.isArray(renvoyes) && affiche.length === renvoyes.length
      && affiche.every((x) => x.toLowerCase().includes(terme.toLowerCase())), affiche.length + ' / ' + (renvoyes && renvoyes.length) + ' ' + affiche.slice(0, 3).join(' | '));
    ok('Rapprochement : total renvoyé couvre les lignes affichées (pagination)', total >= affiche.length, total + ' / ' + affiche.length);
    const nReq = requetes.length;
    await cliquer(p, 'inventaire button[text=Effacer]');
    await p.waitForTimeout(1500);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('inventaire')[0].getStore().isLoading(), null, { timeout: 30000 });
    const url = await p.evaluate(() => Ext.ComponentQuery.query('inventaire')[0].getStore().getProxy().url);
    ok('« Effacer » : liste rechargée sans filtre', !/search_value=/.test(url) && requetes.length === nReq, url);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  ok('Bilan : aucun inventaire créé', nbInventaires() === avant);
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
