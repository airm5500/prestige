/* RESERVE : ONGLET « LISTE RÉSERVE » SANS DEBORDEMENT (retour du 22/11 sur le lot 3 du plan du 21/11).
 *
 * A 1280×720, l'onglet debordait : 1 266 px de contenu pour 1 215 px de vue, donc une barre de defilement
 * horizontale et des boutons hors de vue. Le test ouvre l'onglet par le vrai menu, en 1366×768, 1280×720 et
 * 1920×1080, et verifie pour chaque barre (filtres, regle, bandeau, pagination) et pour la grille :
 *  - aucun element hors de la largeur de l'onglet, aucun defilement horizontal ;
 *  - chaque bouton et chaque champ visible, entier, sur une seule ligne ;
 *  - les colonnes tiennent dans la grille (pas de defilement horizontal de la grille) ;
 *  - l'ergonomie : la recherche garde sa largeur utile, les boutons gardent leur libelle complet.
 * Le test n'ecrit rien en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const TAILLES = [[1366, 768], [1280, 720], [1920, 1080]];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    for (const [l, h] of TAILLES) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => erreurs.push(e.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      const libelles = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
        if (n.get('id') === 'reservemanager') { r = [n.parentNode.get('text'), n.get('text')]; return false; } }); return r; });
      const texte = (x) => String(x).replace(/<[^>]*>/g, '').trim();
      await ouvrirMenu(p, texte(libelles[0]), texte(libelles[1]));
      await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); return m && m.rendered; }, null, { timeout: 60000 });
      /* l'onglet LISTE RÉSERVE, par un clic sur son titre */
      const onglet = await p.evaluate(() => { const t = Ext.getCmp('reservemanagerID').items.items.filter((x) => x.down && (x.xtype === 'reservelistegrid' || x.down('reservelistegrid')))[0];
        return t && t.tab ? t.tab.getId() : null; });
      ok(l + '×' + h + ' : onglet LISTE RÉSERVE présent', !!onglet);
      if (!onglet) { await p.close(); continue; }
      await p.click('#' + onglet);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('reservelistegrid')[0]; return g && g.rendered && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 90000 });
      await p.waitForTimeout(700);
      const m = await p.evaluate(() => {
        const g = Ext.ComponentQuery.query('reservelistegrid')[0];
        const cadre = g.getEl().dom.getBoundingClientRect();
        const r = { vue: Math.round(cadre.width), barres: [], horsVue: [], coupes: [], grille: null, recherche: 0 };
        g.getDockedItems().filter((d) => d.isVisible() && (d.xtype === 'toolbar' || d.xtype === 'pagingtoolbar')).forEach((d) => {
          const tb = d.getEl().dom; const it = d.layout && d.layout.innerCt ? d.layout.innerCt.dom : tb;
          r.barres.push({ id: d.itemId || d.xtype, contenu: Math.round(it.scrollWidth), vue: Math.round(tb.clientWidth) });
          d.items.items.filter((c) => c.isVisible() && c.getEl && c.getEl()).forEach((c) => {
            const e = c.getEl().dom.getBoundingClientRect();
            if (e.width > 0 && (e.right > cadre.right + 1 || e.left < cadre.left - 1)) { r.horsVue.push((d.itemId || d.xtype) + '/' + (c.itemId || c.text || c.xtype) + ' ' + Math.round(e.right) + '>' + Math.round(cadre.right)); }
            if (c.xtype === 'button' && c.btnInnerEl) { const s = c.btnInnerEl.dom; if (s.scrollWidth > s.clientWidth + 1) { r.coupes.push(c.itemId || c.text); } }
          });
        });
        const v = g.getView().getEl().dom;
        r.grille = { contenu: v.scrollWidth, vue: v.clientWidth };
        r.page = { contenu: document.documentElement.scrollWidth, vue: document.documentElement.clientWidth };
        r.recherche = Math.round(g.down('#lrRecherche').getEl().dom.getBoundingClientRect().width);
        const cols = g.headerCt.getGridColumns().filter((c) => c.isVisible());
        /* texte de l'en-tete (span) entierement dans sa case visible */
        r.entetes = cols.filter((c) => { if (!c.textEl || !c.titleEl) { return false; } const t = c.textEl.dom.getBoundingClientRect(), z = c.getEl().dom.getBoundingClientRect();
          return t.width > 0 && (t.right > z.right + 1 || t.left < z.left - 1 || t.bottom > z.bottom + 1); }).map((c) => c.menuText || c.text);
        r.cellules = [];
        const vue = g.getView();
        cols.filter((c) => ['capacite', 'seuilMini', 'stockRayon', 'stockReserve', 'vmj'].indexOf(c.dataIndex) >= 0).forEach((c) => {
          vue.getEl().dom.querySelectorAll(vue.getCellSelector(c) + ' .x-grid-cell-inner').forEach((d) => { if (d.scrollWidth > d.clientWidth + 1) { r.cellules.push(c.dataIndex + ':' + d.textContent); } });
        });
        r.colonnesChiffres = cols.filter((c) => ['capacite', 'seuilMini', 'stockRayon', 'stockReserve'].indexOf(c.dataIndex) >= 0).map((c) => c.getWidth());
        return r;
      });
      const deborde = m.barres.filter((x) => x.contenu > x.vue + 1);
      ok(l + '×' + h + ' : aucune barre ne déborde (filtres, règle, bandeau, pagination)', deborde.length === 0, JSON.stringify(m.barres));
      ok(l + '×' + h + ' : aucun bouton ni champ hors de l\'onglet', m.horsVue.length === 0, m.horsVue.join(' ; '));
      ok(l + '×' + h + ' : aucun libellé de bouton coupé', m.coupes.length === 0, m.coupes.join(', '));
      ok(l + '×' + h + ' : colonnes de la grille dans la largeur (pas de défilement horizontal)', m.grille.contenu <= m.grille.vue + 1, JSON.stringify(m.grille));
      ok(l + '×' + h + ' : pas de défilement horizontal de la page', m.page.contenu <= m.page.vue + 1, JSON.stringify(m.page));
      ok(l + '×' + h + ' : la recherche garde au moins 200 px', m.recherche >= 200, m.recherche);
      ok(l + '×' + h + ' : en-têtes de colonne lisibles en entier', m.entetes.length === 0, m.entetes.join(', '));
      ok(l + '×' + h + ' : stocks, capacité et seuil affichés sans coupure', m.cellules.length === 0, m.cellules.slice(0, 8).join(' | '));
      await p.close();
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement sans exception', false, e.stack);
  } finally {
    await b.close();
    const n = res.filter((x) => x.c).length;
    console.log(n + '/' + res.length);
    process.exit(n === res.length ? 0 : 1);
  }
})();
