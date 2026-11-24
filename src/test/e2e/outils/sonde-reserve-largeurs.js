/* Sonde (outil, pas un test) : largeur des grilles de la gestion des reserves a une taille d'ecran donnee.
 * Usage : node outils/sonde-reserve-largeurs.js 1366 768
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('./poste');
const { connexion, ouvrirMenu } = require('./vues');
const L = Number(process.argv[2] || 1366), H = Number(process.argv[3] || 768);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: L, height: H } })).newPage();
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const libelles = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
      if (n.get('id') === 'reservemanager') { r = [n.parentNode.get('text'), n.get('text')]; return false; } }); return r; });
    const texte = (h) => String(h).replace(/<[^>]*>/g, '').trim();
    await ouvrirMenu(p, texte(libelles[0]), texte(libelles[1]));
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); const g = m && m.down('reservegrid'); return g && g.rendered && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const titres = await p.evaluate(() => Ext.getCmp('reservemanagerID').items.items.map((t) => t.title));
    for (const t of titres) {
      await p.locator('.x-tab').filter({ visible: true, hasText: t.replace(/<[^>]*>/g, '') }).first().click().catch(() => {});
      await p.waitForTimeout(2500);
      const m = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').getActiveTab(); if (!g.getView) { return { titre: g.title, grille: false }; }
        const v = g.getView().getEl().dom;
        return { titre: g.title, xtype: g.xtype, vue: v.clientWidth, contenu: v.scrollWidth, grille: Math.round(g.getEl().dom.getBoundingClientRect().width),
          colonnes: g.headerCt.getGridColumns().filter((c) => !c.hidden).map((c) => (c.text || c.header || c.xtype).replace(/<[^>]*>/g, '').slice(0, 18) + ':' + c.getWidth()) }; });
      console.log(JSON.stringify(m));
    }
  } finally {
    await b.close();
  }
})();
