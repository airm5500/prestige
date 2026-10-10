/* FICHE CLIENT EN FENETRE (retours du 10/10, point 14) et ANALYSE ARTICLE (point 11) — lecture seule.
 *  - Gestion des clients : action « Fiche client » -> la fiche des Ordonnances en fenetre modale, sur ce client ;
 *  - vente : bouton « FICHE CLIENT » masque sans client, visible des qu'un client est sur la vente (quel que soit le
 *    chemin qui le pose), qui ouvre la meme fiche ; masque quand le client est retire ;
 *  - Analyse article : periode et criteres sur la premiere ligne avant « Analyser » ; inventaire / Excel / Imprimer a
 *    droite sur la ligne des onglets.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [CID, PRENOM, NOM] = q("SELECT lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME FROM t_client WHERE str_STATUT = 'enable' AND str_FIRST_NAME <> '' ORDER BY str_FIRST_NAME LIMIT 1").split('\t');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const fiche = () => p.waitForFunction((n) => { const w = Ext.ComponentQuery.query('#fenFicheClient')[0]; if (!w) { return false; }
    const c = w.down('#fcIdentite'); return c && c.getEl() && c.getEl().dom.textContent.toUpperCase().indexOf(n.toUpperCase()) >= 0; }, PRENOM, { timeout: 30000 });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* gestion des clients */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('clientmanager', 'Clients', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0 && Ext.ComponentQuery.query('clientgestion')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    const action = await p.evaluate(() => { const g = Ext.ComponentQuery.query('clientgestion')[0];
      const col = g.headerCt.getGridColumns().filter((c) => c.isXType('actioncolumn') && c.items && c.items[0] && /Fiche client/.test(c.items[0].tooltip))[0];
      return !!col; });
    ok('Clients : action « Fiche client » sur chaque ligne', action);
    await p.evaluate((cid) => { const g = Ext.ComponentQuery.query('clientgestion')[0], s = g.getStore(); let i = s.findExact('lg_CLIENT_ID', cid);
      if (i < 0) { s.insert(0, { lg_CLIENT_ID: cid, str_FIRST_NAME: 'x', str_LAST_NAME: 'y' }); i = 0; } g.onFicheClientClick(g, i); }, CID);
    await fiche();
    const w1 = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenFicheClient')[0]; return { modal: w.modal, titre: w.title }; });
    ok('Fiche client ouverte en fenêtre modale, sur ' + PRENOM + ' ' + NOM, w1.modal === true && /^Fiche client/.test(w1.titre), JSON.stringify(w1));
    await p.evaluate(() => Ext.ComponentQuery.query('#fenFicheClient')[0].close());

    /* vente */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').length > 0 && Ext.ComponentQuery.query('doventemanager #btnFicheClient')[0], null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const etat = () => p.evaluate(() => Ext.ComponentQuery.query('doventemanager #btnFicheClient')[0].isVisible());
    ok('Vente sans client : « FICHE CLIENT » masqué', (await etat()) === false);
    await p.evaluate((a) => { const c = testextjs.app.getController('VenteCtr'); c.client = Ext.create('testextjs.model.caisse.ClientLambda', { lgCLIENTID: a[0], strFIRSTNAME: a[1], strLASTNAME: a[2] }); }, [CID, PRENOM, NOM]);
    ok('Client posé sur la vente : « FICHE CLIENT » visible', (await etat()) === true);
    await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #btnFicheClient')[0]; b.getEl().dom.setAttribute('data-e2e', 'fc'); });
    await p.click('[data-e2e=fc]');
    await fiche();
    ok('Clic : la fiche de ce client s\'ouvre en fenêtre', await p.evaluate(() => Ext.ComponentQuery.query('#fenFicheClient')[0].modal === true));
    await p.evaluate(() => Ext.ComponentQuery.query('#fenFicheClient')[0].close());
    await p.evaluate(() => { testextjs.app.getController('VenteCtr').resetClientLambdaInfos(); });
    ok('Client retiré : bouton de nouveau masqué', (await etat()) === false);

    /* analyse article : disposition */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysearticle', 'Analyse article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysearticle').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const aa = await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0], barres = e.query('toolbar[dock=top]').filter((t) => t.up('analysearticle') === e && !t.up('tabpanel'));
      const l1 = barres[0].items.items.map((x) => x.itemId || '').filter(Boolean), tb = e.down('#ongletsAnalyse').getTabBar();
      const bouton = (id) => { const c = e.down('#' + id); return c ? c.up('tabbar') === tb : false; };
      const box = e.down('#imprimer').getEl().getBox(), largeur = tb.getEl().getBox();
      return { barres: barres.length, l1, actions: ['creerInventaire', 'exporterExcel', 'imprimer'].every(bouton), aDroite: largeur.right - box.right < 30 };
    });
    ok('Analyse article : une ligne de critères, « Analyser » après la marge et la rotation', aa.barres === 1 && aa.l1.indexOf('seuilMarge') >= 0 && aa.l1.indexOf('seuilRotation') >= 0
      && aa.l1.indexOf('analyser') > aa.l1.indexOf('seuilRotation'), JSON.stringify(aa));
    ok('Analyse article : inventaire / Excel / Imprimer à droite sur la ligne des onglets', aa.actions && aa.aDroite, JSON.stringify(aa));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
