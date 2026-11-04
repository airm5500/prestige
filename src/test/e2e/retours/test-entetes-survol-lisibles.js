/* RETOUR DU 03/11 : « fiche article : quand on met la souris sur l'entete des colonnes on voit du vert et pas tres bien
 * le texte, et cela un peu partout au survol des entetes ».
 *
 * Par les vues, avec de vrais survols de souris : « Fiche Article » puis « Gestion des réserves ». Pour chaque entete
 * de colonne visible de la grille principale : la souris passe dessus, puis contraste entre le texte de l'entete et
 * le fond reellement peint derriere lui, au moins 4,5 (lisibilite WCAG AA). Hors survol aussi. Aucune donnee ecrite.
 *
 * node retours/test-entetes-survol-lisibles.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const menu = (cond) => q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE "
  + cond + " AND s.str_Status = 'enable' ORDER BY s.int_PRIORITY LIMIT 1").split('|');
const ECRANS = [
  { nom: 'Fiche Article', menu: menu("s.str_DESCRIPTION = 'Fiche Article'") },
  { nom: 'Gestion des réserves', menu: menu("s.str_COMPOSANT = 'reservemanager'") }
];

/* contraste de l'entete donnee (element DOM d'id connu) */
const mesurer = (p, id) => p.evaluate((id) => {
  const rgb = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) { return null; } const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fond = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); const c = rgb(s.backgroundColor); if (c && c.a > 0.5) { return c; }
    if (s.backgroundImage && /gradient/.test(s.backgroundImage)) { const m = s.backgroundImage.match(/rgba?\([^)]+\)/g); if (m) { const v = m.map(rgb); return v[Math.floor(v.length / 2)]; } } } return { r: 255, g: 255, b: 255, a: 1 }; };
  const h = document.getElementById(id);
  const t = h && (h.querySelector('.x-column-header-text') || h);
  if (!t) { return null; }
  const ct = rgb(getComputedStyle(t).color), cf = fond(t);
  const l1 = lum(ct), l2 = lum(cf);
  return { texte: (t.innerText || '').trim(), contraste: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 10) / 10,
    couleur: getComputedStyle(t).color, fond: 'rgb(' + cf.r + ',' + cf.g + ',' + cf.b + ')', survol: !!(h.className.indexOf('x-column-header-over') >= 0 || h.querySelector('.x-column-header-over')) };
}, id);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    for (const e of ECRANS) {
      if (!e.menu[1]) { ok(e.nom + ' : menu trouvé', false); continue; }
      await ouvrirMenu(p, e.menu[0], e.menu[1]);
      await p.waitForTimeout(3500);
      /* entetes visibles de la grille la plus large de l'ecran ouvert */
      const ids = await p.evaluate(() => {
        const grilles = Ext.ComponentQuery.query('gridpanel').filter((g) => g.isVisible(true) && g.getEl());
        grilles.sort((a, b) => b.getWidth() * b.getHeight() - a.getWidth() * a.getHeight());
        const g = grilles[0];
        return g ? g.headerCt.getGridColumns().filter((c) => c.isVisible(true) && c.getEl() && (c.text || '').replace(/<[^>]+>|&#160;/g, '').trim()).slice(0, 8).map((c) => c.getEl().dom.id) : [];
      });
      ok(e.nom + ' : entêtes de colonnes trouvées', ids.length > 0, ids.length);
      const repos = [], survol = [];
      for (const id of ids) {
        repos.push(await mesurer(p, id));
        await p.hover('#' + id);
        await p.waitForTimeout(250);
        survol.push(await mesurer(p, id));
      }
      await p.mouse.move(5, 890);
      const mauvais = (l) => l.filter((x) => x && x.contraste < 4.5);
      ok(e.nom + ' : entêtes lisibles hors survol (contraste ≥ 4,5)', mauvais(repos).length === 0, JSON.stringify(mauvais(repos).slice(0, 3)));
      ok(e.nom + ' : entêtes lisibles au survol de la souris (contraste ≥ 4,5)', survol.some((x) => x && x.survol) && mauvais(survol).length === 0,
        JSON.stringify(mauvais(survol).length ? mauvais(survol).slice(0, 3) : survol.slice(0, 2)));
    }
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
