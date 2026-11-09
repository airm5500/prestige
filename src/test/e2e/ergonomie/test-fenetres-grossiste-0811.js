/* PLAN DU 08/11, POINT 2b ET 2c : FENETRES « MODIFIER » ET « DETAIL » D'UN GROSSISTE SANS BARRE DE DEFILEMENT.
 *
 * Retour : « modifier grossiste : la vue est tronquee par le bas » ; « je ne veux pas de scroll horizontal ni vertical
 * en modification ou visualisation ».
 *
 * Par l'ecran (menu, liste des grossistes, icones « Modifier » et « Detail Grossiste »), a 1366 x 768 et 1920 x 1080 :
 *  - aucune zone de la fenetre ne defile, ni en hauteur ni en largeur (la liste des BL de la fiche peut defiler en
 *    hauteur quand elle a plus de lignes que de place : c'est une grille de donnees, pas la fiche) ;
 *  - la fenetre tient entiere dans l'ecran ; ses boutons du bas sont visibles ;
 *  - le dernier champ de la fiche (« Interroger la disponibilite ») et la barre de pagination des BL sont visibles.
 * Lecture seule : la fenetre de modification est fermee par « Annuler ».
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

const mesurer = (p, dernier) => p.evaluate((dernier) => {
  const w = Ext.ComponentQuery.query('window{isVisible()}').pop();
  const r = w.getEl().dom.getBoundingClientRect();
  const defile = [];
  w.getEl().dom.querySelectorAll('*').forEach((e) => {
    const cs = getComputedStyle(e), grille = e.classList.contains('x-grid-view');
    if (!grille && /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) { defile.push('vertical ' + e.className.slice(0, 40) + ' ' + e.scrollHeight + '/' + e.clientHeight); }
    if (/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) { defile.push('horizontal ' + e.className.slice(0, 40) + ' ' + e.scrollWidth + '/' + e.clientWidth); }
  });
  /* visible = entier dans le corps de la fenetre (ce qui depasse du corps est coupe), et dans l'ecran */
  const corps = w.body.dom.getBoundingClientRect();
  const visible = (el, bouton) => { if (!el) { return false; } const b = el.getBoundingClientRect(); const z = bouton ? r : corps; return b.height > 0 && b.top >= z.top - 1 && b.bottom <= z.bottom + 1 && b.bottom <= innerHeight; };
  const boutons = w.query('button').filter((x) => x.isVisible() && x.up('toolbar[dock=bottom]'));
  const cible = dernier === 'pagination' ? w.down('pagingtoolbar') : Ext.ComponentQuery.query('#' + dernier)[0];
  return { titre: w.title, cadre: [r.top, r.bottom, innerHeight].map(Math.round), defile,
    dansEcran: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    boutons: boutons.length > 0 && boutons.every((x) => visible(x.getEl().dom, true)), dernier: !!cible && visible(cible.getEl().dom) };
}, dernier);

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    for (const [l, h] of [[1366, 768], [1920, 1080]]) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'grossistemanager', true); return [r.parentNode.get('text'), r.get('text')]; });
      await V.ouvrirMenu(p, menu[0], menu[1]);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
      for (const [handler, nom, dernier] of [['onEditClick', 'Modifier', 'int_PHARMAML_DISPO'], ['onManageClick', 'Détail', 'pagination']]) {
        /* vrai clic sur l'icone de la premiere ligne */
        const icone = await p.evaluate((h) => {
          const e = Ext.ComponentQuery.query('grossistemanager')[0];
          const col = e.headerCt.getGridColumns().find((c) => c.xtype === 'actioncolumn' && c.items && c.items[0] && c.items[0].handler === e[h]);
          const i = e.getView().getNode(0).querySelector('.x-grid-cell-' + col.id + ' .x-action-col-icon'); i.id = i.id || ('e2e-' + h); return i.id;
        }, handler);
        await p.click('#' + icone);
        await p.waitForFunction(() => Ext.ComponentQuery.query('window{isVisible()}').length > 0, null, { timeout: 15000 });
        await p.waitForTimeout(2500);
        const m = await mesurer(p, dernier);
        ok(`${l}x${h} — ${nom} : aucune barre de défilement dans la fenêtre`, m.defile.length === 0, m.defile.join(' | '));
        ok(`${l}x${h} — ${nom} : fenêtre entière dans l'écran, boutons du bas visibles`, m.dansEcran && m.boutons, JSON.stringify(m.cadre));
        ok(`${l}x${h} — ${nom} : le bas du contenu est visible (${dernier})`, m.dernier);
        await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').forEach((w) => w.close()));
        await p.waitForTimeout(500);
      }
      await p.context().close();
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
