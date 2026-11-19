/* ECRANS RESPONSIVE, ETAPE 2 (demande du 13/11) : les 30 ecrans principaux, ouverts par le menu, a 1280, 1366 et
 * 1920 px. Pour chacun :
 *   - l'ecran remplit la largeur disponible (pas de bande vide a droite) ;
 *   - pas de barre de defilement horizontale sur l'ecran lui-meme ;
 *   - dates, heures et listes remplies lisibles en entier dans les barres ;
 *   - barre de filtres sans defilement a partir de 1366 px (a 1280, le defilement est tolere) ;
 *   - aucune erreur JavaScript.
 * « Journal Vente » et « Balance Vente/Caisse » sont hors de ce test : ils n'affichent rien dans le panneau central
 * (constat separe, signale dans le compte rendu).
 * Ecrans ouverts en lecture seule : aucune donnee ecrite. Usage : node ... [id,id,...] pour un sous-ensemble.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const TOUS = ['cloturerventemanager', 'ventemanager', 'venteannuler', 'devismanager', 'ventesrateesmanager', 'mvtcaissemanager',
  'gestcaissemanager', 'listecaissemanager', 'articlevendumanager', 'diffmanager',
  'delayed', 'facturemanager', 'reglementmanager', 'factureenattenteedition', 'tpventes', 'clientmanager', 'tierspayantmanager',
  'i_sugg_manager', 'i_order_manager', 'bonlivraisonmanager', 'retourfrsmanager', 'famillemanager', 'suivientreevente',
  'reservemanager', 'ticketzmanager', 'ugmanager', 'etatscontrolemanager', 'balanceagee'];
const ECRANS = process.argv[2] ? process.argv[2].split(',') : TOUS;

const controler = () => {
  const c = Ext.ComponentQuery.query('viewport')[0].down('[region=center]'), e = c.items.items.filter((x) => x.isVisible())[0];
  if (!e || !e.el) { return null; }
  const dispo = c.body.getWidth(true), larg = e.el.dom.getBoundingClientRect().width;
  const coupes = [], defile = [];
  e.query('toolbar').filter((t) => t.isVisible(true) && t.el && !t.isXType('pagingtoolbar')).forEach((t, n) => {
    if (t.el.dom.querySelector('.x-box-scroller') && Array.from(t.el.dom.querySelectorAll('.x-box-scroller')).some((s) => s.offsetWidth > 0)) { defile.push('barre ' + n); }
    t.query('datefield,timefield,combobox').filter((f) => f.isVisible(true) && f.inputEl).forEach((f) => {
      const i = f.inputEl.dom, st = getComputedStyle(i), place = i.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
      if (i.value && Ext.util.TextMetrics.measure(f.inputEl, i.value).width > place + 0.5) { coupes.push((f.fieldLabel || f.itemId || f.xtype) + '=' + i.value); }
    });
  });
  const corps = c.body.dom;
  return { xtype: e.xtype, rempli: larg >= dispo * 0.95, larg: Math.round(larg), dispo, horizontal: corps.scrollWidth > corps.clientWidth + 2, coupes, defile };
};

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    for (const largeur of [1280, 1366, 1920]) {
      const p = await (await b.newContext({ viewport: { width: largeur, height: 760 } })).newPage();
      p.on('pageerror', (e) => err.push(largeur + ' ' + e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      for (const id of ECRANS) {
        const menu = await p.evaluate((id) => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', id, true); return n ? [n.parentNode.get('text'), n.get('text')] : null; }, id);
        if (!menu) { console.log('SKIP  ' + id + ' : absent du menu'); continue; }
        /* nettoyage entre deux ecrans (pas un geste teste) : fenetres laissees ouvertes par l'ecran precedent */
        await p.evaluate(() => Ext.WindowManager.each((w) => { if (w.isVisible() && w.close) { w.close(); } }));
        try { await V.ouvrirMenu(p, menu[0], menu[1]); } catch (x) {
          ok(`${largeur} ${menu[1]} : ouverture`, false, x.message.split(String.fromCharCode(10))[0]);
          await p.reload(); await p.waitForFunction(() => window.Ext && Ext.ComponentQuery.query('navigation')[0], null, { timeout: 60000 }); await p.waitForTimeout(2000);
          continue;
        }
        await p.waitForTimeout(3000);
        const r = await p.evaluate(controler);
        if (!r) { ok(`${largeur} ${menu[1]} : écran affiché`, false); continue; }
        const nom = `${largeur} px, ${menu[1]} (${id}/${r.xtype})`;
        ok(`${nom} : remplit la largeur`, r.rempli, r.larg + '/' + r.dispo);
        ok(`${nom} : pas de défilement horizontal`, !r.horizontal);
        ok(`${nom} : champs lisibles en entier`, r.coupes.length === 0, r.coupes.join(' ; '));
        if (largeur >= 1366) { ok(`${nom} : barres sans défilement`, r.defile.length === 0, r.defile.join(' ; ')); }
      }
      await p.close();
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
