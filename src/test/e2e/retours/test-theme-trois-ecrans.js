/* THEME DE TROIS ECRANS (retours du 10/10, point 8) et libelles du lot 2. Lecture seule.
 *  - Liste des lots (LotStockManager), Statistiques rupture stock (RuptureStockManager), Activite par operateur
 *    (statActiviteOperateurManager) : ouverts par leur menu, ils prennent le theme (mv-panneau theme-liste) ;
 *  - le menu « Statistiques rupture stock » ouvre bien l'ecran des ruptures : l'ecran des factures fournisseurs
 *    portait le meme nom (conflit), il a desormais le sien ;
 *  - Commandes en cours : onglets centres, « Ruptures de commande », « Fusionner les ruptures » ;
 *  - Etat de controle des achats : « Rechercher » juste apres le champ, « Excel », « Inventaire » ;
 *  - aucun « Sectionner » dans les ecrans.
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const consoleUnload = []; p.on('console', (m) => { if (/unload/i.test(m.text())) consoleUnload.push(m.type() + ': ' + m.text()); });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const ouvrir = async (xtype, titre) => {
      await p.evaluate((a) => testextjs.app.getController('App').onLoadNewComponent(a.x, a.t, ''), { x: xtype, t: titre });
      await p.waitForFunction((x) => Ext.ComponentQuery.query(x).length > 0 && Ext.ComponentQuery.query(x)[0].rendered, xtype, { timeout: 30000 });
      await p.waitForTimeout(800);
    };

    for (const [x, t, classe] of [['LotStockManager', 'Liste des Lots', 'testextjs.view.commandemanagement.lots.LotsManager'],
      ['RuptureStockManager', 'Statistiques rupture stock', 'testextjs.view.Report.RuptureStock.RuptureStockManager'],
      ['statActiviteOperateurManager', 'Activité opérateurs', 'testextjs.view.Report.statActiviteOperateur.statActiviteOperateurManager']]) {
      await ouvrir(x, t);
      const e = await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0]; return { classe: Ext.getClassName(c), theme: c.hasCls('mv-panneau') && c.hasCls('theme-liste') }; }, x);
      ok(t + ' : bon écran et thème appliqué', e.classe === classe && e.theme, JSON.stringify(e));
    }
    ok('Factures fournisseurs : nom propre, plus de conflit avec les ruptures', await p.evaluate(() => {
      Ext.syncRequire('testextjs.view.Report.facturefournisseurs.FactureFournisseurManager');
      return Ext.ClassManager.getNameByAlias('widget.RuptureStockManager') === 'testextjs.view.Report.RuptureStock.RuptureStockManager'
        && Ext.ClassManager.getNameByAlias('widget.facturefournisseurmanager') === 'testextjs.view.Report.facturefournisseurs.FactureFournisseurManager';
    }));

    await ouvrir('commandesencours', 'Commandes en cours');
    const cec = await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('commandesencours #ongletsCec')[0], bs = t.query('button').filter((x) => x.isVisible());
      const zone = t.getEl().getBox(), premier = bs[0].getEl().getBox(), dernier = bs[bs.length - 1].getEl().getBox();
      return { textes: bs.map((x) => x.getText()), gauche: premier.x - zone.x, droite: zone.right - dernier.right };
    });
    ok('Commandes en cours : « Ruptures de commande »', cec.textes.indexOf('Ruptures de commande') >= 0, JSON.stringify(cec.textes));
    ok('Commandes en cours : onglets centrés (marges gauche et droite égales à 4 px près)', Math.abs(cec.gauche - cec.droite) <= 4 && cec.gauche > 20, JSON.stringify(cec));
    ok('Ruptures : « Fusionner les ruptures »', await p.evaluate(async () => /text: 'Fusionner les ruptures'/.test(await (await fetch('app/view/pharmaml/Rupturepharma.js?_=' + Date.now())).text())));

    await ouvrir('etatscontrolemanager', 'Etat de controle des achats');
    const ec = await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('etatscontrolemanager toolbar[dock=top]')[0], items = t.items.items;
      const i = items.indexOf(Ext.getCmp('rechecher'));
      return { suivant: items[i + 1] && items[i + 1].text, textes: items.filter((x) => x.text).map((x) => x.text) };
    });
    ok('Contrôle des achats : « Rechercher » juste après le champ de recherche', ec.suivant === 'Rechercher', JSON.stringify(ec));
    ok('Contrôle des achats : « Excel » et « Inventaire »', ec.textes.indexOf('Excel') >= 0 && ec.textes.indexOf('Inventaire') >= 0 && ec.textes.indexOf('rechercher') < 0, JSON.stringify(ec.textes));
    ok('Combo grossiste : « Sélectionner grossiste... »', await p.evaluate(() => Ext.getCmp('lg_GROSSISTE_ID').emptyText === 'Sélectionner grossiste...'));
    /* message « unload is not allowed » : l'ecoute de unload passe sur pagehide (meme moment de sortie) */
    const u = await p.evaluate(() => { let appel = 0; const f = () => { appel++; }; window.addEventListener('unload', f); window.dispatchEvent(new Event('pagehide'));
      window.removeEventListener('unload', f); window.dispatchEvent(new Event('pagehide')); return { actif: window.__sansUnload === true, appel }; });
    ok('« unload » : écouté sur pagehide (appelé une fois, retiré ensuite), aucun message unload dans la console', u.actif && u.appel === 1 && consoleUnload.length === 0, JSON.stringify(u) + ' ' + consoleUnload.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
