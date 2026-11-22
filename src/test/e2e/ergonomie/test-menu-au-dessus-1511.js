/* RETOUR DU 15/11 : le volet de navigation deplie doit passer AU-DESSUS de l'ecran ouvert.
 *
 * Defaut : sur « Ouverture / cloture caisse », le voile blanc du panneau grise (masque d'element ExtJS, z-index 100)
 * recouvrait les premieres entrees du menu (z-index 5) : entrees delavees, et un clic tombait sur le voile.
 *
 * Test d'apparence, par l'ecran : pour chaque ecran ouvert (caisse avec un cote grise, puis un ecran a panneau
 * desactive cree pour l'essai), on deplie le menu par sa barre, puis pour CHAQUE entree visible du menu on demande au
 * navigateur quel element est au premier plan au centre de l'entree (document.elementFromPoint) : ce doit etre le
 * menu, jamais un voile. Puis un clic reel sur une entree recouverte auparavant doit ouvrir son sous-menu.
 * Lecture seule : rien n'est ecrit.
 *
 * node src/test/e2e/ergonomie/test-menu-au-dessus-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));

  const deplier = async () => {
    const ph = await p.evaluate(() => { const n = Ext.ComponentQuery.query('[title*=Navigation]')[0];
      return n && n.placeholder && n.placeholder.rendered ? n.placeholder.getEl().id : null; });
    if (ph) { await p.click('#' + ph, { position: { x: 10, y: 220 } }); }
    await p.waitForFunction(() => { const n = (Ext.ComponentQuery.query('[title*=Navigation]')[0]); return n && n.getEl() && n.getEl().isVisible() && !n.getEl().dom.closest('[id*="-anim-wrap-for-"]'); }, null, { timeout: 15000 });
    await p.waitForTimeout(800);
  };
  /* entrees visibles du menu : celles dont le centre est recouvert par autre chose que le menu */
  const recouvertes = () => p.evaluate(() => {
    const nav = (Ext.ComponentQuery.query('[title*=Navigation]')[0]).getEl().dom, r = nav.getBoundingClientRect(), vues = [], ko = [];
    nav.querySelectorAll('.x-grid-row, .x-tree-node-text, .x-menu-item').forEach((e) => {
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height || b.top < r.top || b.bottom > Math.min(r.bottom, window.innerHeight)) { return; }
      const x = b.left + Math.min(b.width / 2, 120), y = b.top + b.height / 2, dessus = document.elementFromPoint(x, y);
      vues.push(e.textContent.trim());
      if (!dessus || !nav.contains(dessus)) { ko.push(e.textContent.trim() + ' sous ' + (dessus ? (dessus.className || dessus.tagName) : 'rien')); }
    });
    return { vues, ko };
  });
  const voiles = () => p.evaluate(() => Array.from(document.querySelectorAll('.x-mask')).filter((m) => m.offsetWidth && getComputedStyle(m).display !== 'none').length);

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. Ouverture / cloture caisse : un des deux cotes est grise */
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ouverture/clôture caisse');
    await p.waitForFunction(() => Ext.ComponentQuery.query('caisseouverturecloture').length > 0, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const v1 = await voiles();
    await deplier();
    const r1 = await recouvertes();
    ok('Caisse (' + v1 + ' voile(s) à l\'écran) : chaque entrée visible du menu est au premier plan', v1 > 0 && r1.vues.length >= 8 && r1.ko.length === 0,
      r1.vues.length + ' entrées ; recouvertes : ' + (r1.ko.join(' | ') || 'aucune'));
    /* clic reel sur la premiere entree (recouverte avant la correction) : le sous-menu s'ouvre */
    const premiere = p.locator('.prestige-nav .x-grid-row, .prestige-nav .x-tree-node-text').filter({ visible: true }).first();
    await premiere.click();
    const sousMenu = await p.locator('.prestige-flyout-menu .x-menu-item').filter({ visible: true }).first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    ok('Clic sur la première entrée du menu (« ' + (r1.vues[0] || '?') + ' ») : son sous-menu s\'ouvre', sousMenu, '');
    await p.keyboard.press('Escape');
    await p.mouse.click(1200, 600);
    await p.waitForTimeout(800);

    /* 2. ecran quelconque avec un panneau desactive (voile pose pour l'essai sur le panneau central) */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('caisseouverturecloture')[0]; if (c) { c.setDisabled(true); } });
    const v2 = await voiles();
    await deplier();
    const r2 = await recouvertes();
    ok('Panneau entier désactivé (' + v2 + ' voile(s)) : chaque entrée visible du menu reste au premier plan', v2 > 0 && r2.ko.length === 0,
      r2.vues.length + ' entrées ; recouvertes : ' + (r2.ko.join(' | ') || 'aucune'));
    /* 3. les fenetres restent au-dessus du menu */
    const fenetre = await p.evaluate(() => { const w = Ext.create('Ext.window.Window', { title: 'Essai', width: 400, height: 200, x: 60, y: 150 }).show();
      const b = w.getEl().dom.getBoundingClientRect(), d = document.elementFromPoint(b.left + 100, b.top + 100), dessus = w.getEl().dom.contains(d); w.close(); return dessus; });
    ok('Une fenêtre ouverte reste au-dessus du menu déplié', fenetre, '');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement', false, e.stack);
  } finally {
    await b.close();
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
