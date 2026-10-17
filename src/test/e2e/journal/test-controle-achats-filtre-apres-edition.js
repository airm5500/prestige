/* CONTROLE DES ACHATS (LISTE DES BL) : FILTRES APRES LA FENETRE « MISE A JOUR DU BL » (journal du 12/10).
 *
 * « Uncaught TypeError: Me.onRechClick is not a function » (EtatControleManager.js) : l'ecran gardait son instance dans
 * la variable globale Me, que la fenetre de mise a jour d'un BL (cmde_passees/action/edit.js) reprend pour elle
 * (Me = this) ; une fois cette fenetre fermee, chaque filtre appelait onRechClick sur la fenetre. Ce que le test etablit
 * (par l'ecran, admin) :
 *  - liste des BL ouverte ; fenetre de mise a jour d'un BL ouverte puis fermee ;
 *  - choix d'un grossiste puis du type de date : aucune erreur JavaScript, la liste se recharge a chaque fois.
 */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatscontrolemanager', 'Contrôle des achats', ''));
    await p.waitForFunction(() => Ext.getCmp('datedebut') && Ext.ComponentQuery.query('etatscontrolemanager')[0], null, { timeout: 60000 });
    /* periode avec des bons sur le banc (l'ecran s'ouvre sur la date du jour) */
    await p.evaluate(() => { Ext.getCmp('datedebut').setValue(new Date(2026, 8, 1)); Ext.getCmp('datefin').setValue(new Date(2026, 8, 30));
      Ext.ComponentQuery.query('etatscontrolemanager')[0].onRechClick(); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0]; return g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    ok('Liste des BL ouverte avec des bons', true);

    /* fenetre « mise a jour des informations du BL » ouverte puis fermee, par le bouton de la ligne */
    const fen = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('etatscontrolemanager')[0];
      if (window.btnUpdate) {
        g.updateInfoBonlivraison(g, 0);
      } else {
        /* sans le droit P_BTN_UPDATEBL, le bouton ne fait rien : la meme fenetre, avec les memes parametres */
        const rec = g.getStore().getAt(0);
        new testextjs.view.commandemanagement.cmde_passees.action.edit({ gridToLoad: 'etatscontrolemanagerID', odatasource: rec.data,
          parentview: g, mode: 'update', titre: 'Mise &agrave; jour des informations du Bon de livraison N&deg;' + rec.get('strREFLIVRAISON') });
      }
      const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && /Bon de livraison/i.test(x.title || ''))[0];
      if (w) { w.close(); }
      return !!w;
    });
    ok('Fenêtre de mise à jour du BL ouverte puis fermée', fen);

    const recharge = async (action) => p.evaluate(async (action) => {
      const g = Ext.ComponentQuery.query('etatscontrolemanager')[0], st = g.getStore();
      let charges = 0; const f = () => { charges++; }; st.on('load', f);
      try {
        if (action === 'grossiste') {
          const c = Ext.getCmp('lg_GROSSISTE_ID');
          await new Promise((r) => { c.getStore().load({ callback: r }); });
          const rec = c.getStore().getAt(0); c.setValue(rec.get('lg_GROSSISTE_ID')); c.fireEvent('select', c, [rec]);
        } else {
          const c = Ext.ComponentQuery.query('etatscontrolemanager combobox[displayField=label]')[0];
          const rec = c.getStore().getAt(1); c.setValue(rec.get('value')); c.fireEvent('select', c, [rec]);
        }
      } catch (e) { return { erreur: String(e.message) }; }
      await new Promise((r) => setTimeout(r, 4000)); st.un('load', f);
      return { charges };
    }, action);
    const r1 = await recharge('grossiste');
    ok('Après la fenêtre : choix d\'un grossiste → la liste se recharge, sans erreur', !r1.erreur && r1.charges >= 1, JSON.stringify(r1));
    const r2 = await recharge('date');
    ok('Après la fenêtre : choix du type de date → la liste se recharge, sans erreur', !r2.erreur && r2.charges >= 1, JSON.stringify(r2));
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
