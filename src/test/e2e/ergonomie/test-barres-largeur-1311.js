/* ECRANS RESPONSIVE (demande du 13/11, inventaire docs/notices/INVENTAIRE_ECRANS_RESPONSIVE_2026-11-13.md).
 *
 * Barres de filtres en parts relatives (flex) sans largeur minimale : dates, heures et listes coupees des que la place
 * manque (« 13/11/2C » sur « Ventes terminées »). Correction generale dans correctifs-affichage.js.
 *
 * Six ecrans a barre de filtres, ouverts par le menu, a 1100 (ecran etroit ou rabattu), 1280, 1366 et 1920 px :
 *   - chaque date, heure ou liste remplie d'une barre se lit en entier (rien de coupe dans la zone de saisie) ;
 *   - aucun element de barre ne depasse a droite, sauf si la barre propose le defilement (fleches) ;
 *   - aucune erreur JavaScript.
 * Ecrans en lecture seule : aucune donnee ecrite.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const ECRANS = ['ventemanager', 'venteannuler', 'articlevendumanager', 'mvtcaissemanager', 'reglementmanager', 'facturemanager'];

const controler = () => {
  const c = Ext.ComponentQuery.query('viewport')[0].down('[region=center]'), e = c.items.items.filter((x) => x.isVisible())[0];
  const coupes = [], debords = [];
  e.query('toolbar').filter((t) => t.isVisible(true) && t.el && !t.isXType('pagingtoolbar')).forEach((t) => {
    const droite = t.el.dom.getBoundingClientRect().right, defile = !!t.el.dom.querySelector('.x-box-scroller');
    t.query('datefield,timefield,combobox').filter((f) => f.isVisible(true) && f.inputEl).forEach((f) => {
      const i = f.inputEl.dom;
      /* un champ de saisie ne deborde jamais au sens de scrollWidth : on mesure le texte affiche */
      const st = getComputedStyle(i), place = i.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
      if (i.value && Ext.util.TextMetrics.measure(f.inputEl, i.value).width > place + 0.5) { coupes.push((f.fieldLabel || f.itemId || f.xtype) + '=' + i.value); }
    });
    if (!defile) {
      t.items.items.filter((x) => x.isVisible() && x.el).forEach((x) => {
        if (x.el.dom.getBoundingClientRect().right > droite + 1) { debords.push(x.fieldLabel || x.text || x.itemId || x.xtype); }
      });
    }
  });
  return { ecran: e.xtype, coupes, debords };
};

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    for (const largeur of [1100, 1280, 1366, 1920]) {
      const p = await (await b.newContext({ viewport: { width: largeur, height: 760 } })).newPage();
      p.on('pageerror', (e) => err.push(largeur + ' ' + e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      for (const id of ECRANS) {
        const menu = await p.evaluate((id) => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', id, true); return n ? [n.parentNode.get('text'), n.get('text')] : null; }, id);
        if (!menu) { ok(`${largeur} px, ${id} : menu accessible`, false); continue; }
        await V.ouvrirMenu(p, menu[0], menu[1]);
        await p.waitForTimeout(3500);
        const r = await p.evaluate(controler);
        ok(`${largeur} px, ${menu[1]} : dates, heures et listes lisibles en entier`, r.coupes.length === 0, r.coupes.join(' ; '));
        ok(`${largeur} px, ${menu[1]} : rien ne dépasse à droite des barres`, r.debords.length === 0, r.debords.join(' ; '));
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
