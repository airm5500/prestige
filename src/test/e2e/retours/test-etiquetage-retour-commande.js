/* ETIQUETTAGE PRO APRES UNE ENTREE EN STOCK : « Retour à commande en cours » (retour du 31/10, point 5) — lecture seule.
 * L'infobulle du bouton se posait sur le bouton (bas droit de l'ecran) et prenait le clic. Comme l'utilisateur : la
 * souris s'arrete sur le bouton le temps que l'infobulle apparaisse, puis clique au meme endroit. Attendu : l'ecran
 * « Commande en cours » s'ouvre.
 * L'ecran est ouvert comme apres « imprimer les étiquettes » d'une entree (Passerelle, apresEntree), sur un bon clos.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const BL = q("SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed'"
  + " AND EXISTS (SELECT 1 FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID) ORDER BY b.dt_UPDATED DESC LIMIT 1");

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    for (const [l, h] of [[1366, 700], [1600, 900]]) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => erreurs.push(e.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.evaluate((id) => testextjs.view.stockmanagement.etiquetagepro.Passerelle.ouvrirApercu({ source: 'BL', id, apresEntree: true }), BL);
      await p.waitForFunction(() => { const b = Ext.ComponentQuery.query('etiquetagepro #retourCommande')[0]; return b && b.isVisible(true); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      const c = await p.evaluate(() => { const r = Ext.ComponentQuery.query('etiquetagepro #retourCommande')[0].getEl().dom.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.move(c.x - 5, c.y);
      await p.mouse.move(c.x, c.y, { steps: 3 });
      await p.waitForTimeout(1500);
      const dessus = await p.evaluate((c) => { const e = document.elementFromPoint(c.x, c.y);
        return { bouton: Ext.ComponentQuery.query('etiquetagepro #retourCommande')[0].getEl().dom.contains(e), classe: e ? String(e.className).slice(0, 60) : null }; }, c);
      ok(l + ' x ' + h + ' : souris arrêtée sur le bouton, rien ne le recouvre', dessus.bouton, JSON.stringify(dessus));
      await p.mouse.click(c.x, c.y);
      const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager, [xtype=i_order_manager]').some((x) => x.isVisible(true))
        || Ext.ComponentQuery.query('*').some((x) => x.xtype === 'i_order_manager' && x.isVisible(true)), null, { timeout: 20000 }).then(() => true).catch(() => false);
      ok(l + ' x ' + h + ' : le clic ouvre « Commande en cours »', ouvert);
      await p.close();
    }
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
