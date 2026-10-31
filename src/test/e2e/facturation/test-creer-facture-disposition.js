/* FENETRE « CREER UNE FACTURE » (retour du 31/10, point 8) — rien n'est enregistre.
 * La fenetre etait desorganisee : grands vides entre les sections et bouton « Générer facture » hors de vue.
 * Attendu, sur un ecran de portable (1366 x 700) comme sur un grand ecran (1600 x 900) :
 *  - les sections « Infos générales » et periode se suivent sans grand vide ;
 *  - « Gestion des bons » prend le reste de la hauteur ;
 *  - le bouton « Générer facture » est visible dans la fenetre, sans defilement.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    for (const [l, h] of [[1366, 700], [1600, 900]]) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => erreurs.push(e.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('facturemanager', 'Factures', ''));
      await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
      /* bouton « Créer », comme l'utilisateur */
      await p.evaluate(() => { const bt = Ext.ComponentQuery.query('facturemanager button').find((x) => /^Cr(&eacute;|é)er$/.test(x.text || '') && x.isVisible(true));
        bt.getEl().dom.setAttribute('data-e2e', 'creer'); });
      await p.click('[data-e2e=creer]');
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenetreCreerFacture')[0]; return w && w.isVisible() && Ext.getCmp('btn_create_facture'); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      const m = await p.evaluate(() => {
        const w = Ext.ComponentQuery.query('#fenetreCreerFacture')[0].getEl().dom.getBoundingClientRect();
        const r = (c) => c.getEl().dom.getBoundingClientRect();
        const panel = Ext.getCmp('panelID');
        /* contenu visible de chaque section (le cadre), et non la part de hauteur qu'elle recoit */
        const items = panel.items.getRange().map((c) => { const d = c.getEl().dom; return (d.tagName === 'FIELDSET' ? d : d.querySelector('fieldset')).getBoundingClientRect(); });
        const bt = r(Ext.getCmp('btn_create_facture'));
        const dessus = document.elementFromPoint(bt.left + bt.width / 2, bt.top + bt.height / 2);
        return { vide12: Math.round(items[1].top - items[0].bottom), vide23: Math.round(items[2].top - items[1].bottom),
          bons: Math.round(items[2].height), fenetre: Math.round(w.height),
          bouton: bt.width > 0 && bt.top >= w.top && bt.bottom <= w.bottom && !!dessus && Ext.getCmp('btn_create_facture').getEl().dom.contains(dessus) };
      });
      const t = l + ' x ' + h;
      ok(t + ' : pas de grand vide entre les sections du haut', m.vide12 < 40 && m.vide23 < 40, JSON.stringify(m));
      ok(t + ' : « Gestion des bons » occupe l\'essentiel de la fenêtre', m.bons > m.fenetre * 0.55, m.bons + ' / ' + m.fenetre);
      ok(t + ' : bouton « Générer facture » visible et cliquable sans défiler', m.bouton, JSON.stringify(m));
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
