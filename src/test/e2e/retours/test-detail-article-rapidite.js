/* DETAIL ARTICLE : ouverture lente « selon le poste » (retour du 31/10, point 4) — lecture seule.
 * Les appels au serveur sont rapides (une centaine de ms a eux tous) ; le temps part dans le navigateur : la fiche
 * remplit ses champs un par un et ExtJS recalcule toute la fenetre a chaque champ. Sur un poste peu puissant, ces
 * recalculs se paient plusieurs fois plus cher.
 * Comme l'utilisateur : liste des articles, recherche par CIP, clic sur « Detail ». Le processeur est ralenti 4 fois
 * (poste modeste). Attendu : un seul recalcul pour remplir la fiche, un seul pour les boutons des annees de vente.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* article tres vendu : fiche complete, statistiques sur plusieurs annees */
const [P, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " WHERE f.str_STATUT = 'enable' AND d.dt_CREATED > NOW() - INTERVAL 60 DAY GROUP BY f.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 1").split('\t');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    ok('Précondition : un article vendu ces 60 derniers jours', P, CIP);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    await p.evaluate((cip) => { Ext.getCmp('rechecher').setValue(cip); Ext.ComponentQuery.query('famillemanager')[0].onRechClick(); }, CIP);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, P, { timeout: 60000 });

    /* compteur des recalculs de mise en page, par fonction de la fiche */
    await p.evaluate(() => {
      const D = testextjs.view.configmanagement.famille.action.detailArticle.prototype;
      window.__cycles = { total: 0, updateCmp: 0, boutons: 0 };
      let dans = null;
      const run = Ext.layout.Context.prototype.run;
      Ext.layout.Context.prototype.run = function () { window.__cycles.total++; if (dans) { window.__cycles[dans]++; } return run.apply(this, arguments); };
      const u = D.updateCmp;
      D.updateCmp = function () { dans = 'updateCmp'; try { return u.apply(this, arguments); } finally { dans = null; } };
      const bt = window.construireBoutonsVentesDetail;
      window.construireBoutonsVentesDetail = function () { dans = 'boutons'; try { return bt.apply(this, arguments); } finally { dans = null; } };
    });
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now();
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, P);
    await p.waitForFunction(() => { const c = Ext.getCmp('str_DESCRIPTION'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
    const fiche = Date.now() - t0;
    await p.waitForFunction(() => ['gridpanelDetailID'].every((id) => { const g = Ext.getCmp(id); return g && !g.getStore().isLoading(); }), null, { timeout: 60000 });
    await p.waitForTimeout(3000);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const c = await p.evaluate(() => window.__cycles);
    console.log('INFO  poste ralenti x4 : fiche remplie en ' + fiche + ' ms ; recalculs ' + JSON.stringify(c));
    /* le calcul unique peut en declencher un ou deux en cascade (ecouteurs d'ExtJS apres mise en page) */
    ok('Remplir la fiche : au plus 3 calculs de la fenêtre (43 avant)', c.updateCmp <= 3, JSON.stringify(c));
    ok('Les boutons des années de vente : un seul calcul (5 avant)', c.boutons <= 1, JSON.stringify(c));
    ok('Ouverture complète : moins de 60 calculs (84 avant)', c.total < 60, JSON.stringify(c));
    ok('Fiche affichée avec ses valeurs', await p.evaluate((cip) => Ext.getCmp('int_CIP').getValue() === cip, CIP));
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
