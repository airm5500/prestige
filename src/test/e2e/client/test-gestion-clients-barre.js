/* GESTION DES CLIENTS : BARRE D'OUTILS (retours du 13/10, point 15). Par l'ecran « Clients », admin.
 *  - le filtre « Type client » ne se confond plus avec le champ de recherche : largeur propre, ecart visible, le
 *    champ de recherche dit ce qu'il cherche ;
 *  - un seul bouton « Importer », avec un selecteur des deux imports (colonnes au choix / fichier modele) ;
 *  - chaque entree ouvre son import ; la recherche et le filtre fonctionnent toujours.
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('clientmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(4000);

    const barre = await p.evaluate(() => {
      const ecran = Ext.ComponentQuery.query('clientgestion')[0];
      const type = ecran.down('combobox[name=lg_TYPE_CLIENT_FILTER_ID]'), rech = Ext.getCmp('rechecher');
      const bt = type.getEl().getBox(), br = rech.getEl().getBox();
      const imports = ecran.query('button').filter((x) => /import/i.test(x.text || '') && !x.isHidden());
      return { ecart: Math.round(br.x - (bt.x + bt.width)), largeurType: Math.round(bt.width), largeurRech: Math.round(br.width),
        aide: rech.emptyText, boutonsImport: imports.map((x) => x.text), menu: imports[0] && imports[0].menu ? imports[0].menu.items.getRange().map((i) => i.text) : null };
    });
    ok('Filtre « Type client » et recherche bien séparés (écart visible)', barre.ecart >= 12, JSON.stringify(barre));
    ok('Le champ de recherche dit ce qu\'il cherche', /nom|numéro|client/i.test(barre.aide || ''), barre.aide);
    ok('Un seul bouton « Importer »', barre.boutonsImport.length === 1, JSON.stringify(barre.boutonsImport));
    ok('Son sélecteur propose les deux imports', Array.isArray(barre.menu) && barre.menu.length === 2
      && barre.menu.some((t) => /colonnes/i.test(t)) && barre.menu.some((t) => /mod[eè]le|historique/i.test(t)), JSON.stringify(barre.menu));

    /* chaque entree ouvre son import */
    const ouvre = async (motif) => p.evaluate((motif) => {
      const ecran = Ext.ComponentQuery.query('clientgestion')[0];
      const bouton = ecran.query('button').find((x) => /import/i.test(x.text || '') && !x.isHidden());
      bouton.showMenu();
      const item = bouton.menu.items.getRange().find((i) => new RegExp(motif, 'i').test(i.text));
      item.handler.call(item.scope || item, item);
      return true;
    }, motif);
    await ouvre('colonnes');
    const fen1 = await p.waitForFunction(() => Ext.ComponentQuery.query('importclientstandard').some((w) => w.isVisible()), null, { timeout: 15000 }).then(() => true).catch(() => false);
    ok('« Colonnes au choix » ouvre l\'assistant d\'import', fen1);
    await p.evaluate(() => Ext.ComponentQuery.query('importclientstandard').forEach((w) => w.close()));
    await ouvre('mod[eè]le|historique');
    await p.waitForTimeout(1500);
    const fen2 = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !/importclientstandard/.test(w.xtype)).map((w) => w.title));
    ok('« Fichier modèle » ouvre l\'import historique', fen2.length >= 1, JSON.stringify(fen2));
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).forEach((w) => w.close()));

    /* recherche et filtre toujours operants */
    const trouve = await p.evaluate(() => new Promise((ok) => {
      const ecran = Ext.ComponentQuery.query('clientgestion')[0];
      Ext.getCmp('rechecher').setValue('A');
      ecran.getStore().on('load', (s) => ok(s.getCount()), null, { single: true });
      ecran.onRechClick();
    }));
    ok('La recherche fonctionne toujours', trouve > 0, trouve);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
