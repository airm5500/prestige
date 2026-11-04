/* RETOUR DU 04/11 : « je ne veux plus de ceci : les couleurs en bordure de section, tuile ou autre ». Styles choisis
 * (PROPOSITION_STYLES_2026-11-04) : sections B (bandeau de titre gris), tuiles C (pastille d'icone), messages A (fond
 * doux), niveaux de gravite A (etiquette), element choisi B (fond et texte appuyes).
 *
 * 1. Sources : aucune regle CSS ni aucun style ecrit en JavaScript de l'application ne pose de filet de couleur sur un
 *    seul cote (bordure de 2 px ou plus d'une couleur franche, ou ombre interieure decalee d'un seul cote). Le theme
 *    ExtJS d'origine (build/KitchenSink) et la page d'accueil ne sont pas concernes. Exceptions qui ne sont pas des
 *    filets : roues de chargement, pointe des bulles d'aide, trait de legende d'un graphique, bords du cadre sombre de
 *    l'application (entete, barre de menu repliee).
 * 2. Ecrans, par de vrais clics : « Gestion des réserves », « Fiche Article », puis « Suggestion de reappro. » et
 *    « Modifier » sur une suggestion (sections habillees, celles de la capture). Aucun element
 *    visible n'a de filet ; les sections ont leur bandeau de titre gris sur toute la largeur.
 * Seule ecriture : l'ouverture de la suggestion la passe « en cours » ; son statut est remis a la fin.
 *
 * node retours/test-sans-filet-colore.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const menu = (cond) => q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE "
  + cond + " AND s.str_Status = 'enable' ORDER BY s.int_PRIORITY LIMIT 1").split('|');

/* ------------------------------------------------------------------ 1. sources */
const RACINE = path.resolve(__dirname, '../../../main/webapp/general');
const EXCEPTIONS = [/rond-chargement/, /pr-roue/, /x-tip-anchor/, /fc-legende/, /^resources\/css\/header\.css:/, /x-region-collapsed-placeholder/];
function sature(c) {
  c = c.trim().toLowerCase();
  let r, g, b, m;
  if ((m = c.match(/^#([0-9a-f]{3})$/))) { [r, g, b] = m[1].split('').map((x) => parseInt(x + x, 16)); }
  else if ((m = c.match(/^#([0-9a-f]{6})/))) { [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16)); }
  else if ((m = c.match(/rgba?\(([^)]+)\)/))) { const v = m[1].split(',').map((x) => parseFloat(x)); if (v.length > 3 && v[3] < 0.3) { return false; } [r, g, b] = v; }
  else if (/^var\(/.test(c)) { return true; }
  else { return /^(red|blue|green|orange|purple|navy|teal|gold|crimson)$/.test(c); }
  return Math.max(r, g, b) - Math.min(r, g, b) >= 40;
}
function filetsDesSources() {
  const trouves = [];
  (function parcourir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name), rel = path.relative(RACINE, p).replace(/\\/g, '/');
      if (e.isDirectory()) { if (!/^(build|home|ext|lib|libs|vendor|node_modules|fonts|images)$/i.test(e.name)) { parcourir(p); } continue; }
      if (!/\.(css|js)$/.test(e.name) || /ext-all|\.min\./.test(e.name)) { continue; }
      // une regle CSS peut s'etendre sur plusieurs lignes : on garde le selecteur de la regle en cours pour les exceptions
      let selecteur = '';
      fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((l, i) => {
        if (/\{/.test(l)) { selecteur = l; }
        const lieu = rel + ':' + (i + 1) + ' ' + selecteur.trim().slice(0, 80) + ' ' + l.trim().slice(0, 80);
        const ajouter = (x) => { if (!EXCEPTIONS.some((r) => r.test(lieu))) { trouves.push(rel + ':' + (i + 1) + '  ' + x); } };
        let m;
        const r1 = /border-(left|right|top|bottom)\s*:\s*(\d+)px\s+(?:solid|double)\s+(#[0-9a-fA-F]{3,6}|rgba?\([^)]*\)|var\([^)]*\)|[a-z]+)/g;
        while ((m = r1.exec(l))) { if (Number(m[2]) >= 2 && sature(m[3])) { ajouter(m[0]); } }
        const r2 = /border-(left|right|top|bottom)-color\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))/g;
        while ((m = r2.exec(l))) { if (sature(m[2])) { ajouter(m[0]); } }
        const r3 = /inset\s+(-?\d+)px\s+(-?\d+)(?:px)?\s+0(?:px)?\s+(#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))/g;
        while ((m = r3.exec(l))) { if ((Math.abs(Number(m[1])) >= 2) !== (Math.abs(Number(m[2])) >= 2) && sature(m[3])) { ajouter(m[0]); } }
      });
    }
  })(RACINE);
  return trouves;
}

/* ------------------------------------------------------------------ 2. ecrans */
const filetsVisibles = (p) => p.evaluate(() => {
  const rgb = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) { return null; } const v = m[1].split(',').map(parseFloat); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const sature = (c) => { const x = rgb(c); return x && x.a >= 0.3 && Math.max(x.r, x.g, x.b) - Math.min(x.r, x.g, x.b) >= 40; };
  const nom = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className || '').split(' ').filter(Boolean).slice(0, 3).join('.');
  const out = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width < 12 || r.height < 8 || !e.offsetParent && getComputedStyle(e).position !== 'fixed') { continue; }
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || /50%/.test(s.borderRadius) || e.closest('#app-header, .x-tip-anchor, .rond-chargement, .pr-roue, .prestige-nav, .x-region-collapsed-placeholder')) { continue; }
    const cotes = ['Top', 'Right', 'Bottom', 'Left'].map((c) => ({ c, w: parseFloat(s['border' + c + 'Width']), st: s['border' + c + 'Style'], col: s['border' + c + 'Color'] }));
    const epais = cotes.filter((x) => x.w >= 2 && x.st !== 'none' && sature(x.col));
    if (epais.length && epais.length < 4) { out.push(nom(e) + ' bord ' + epais.map((x) => x.c + ' ' + x.w + 'px ' + x.col).join(', ')); }
    const m = s.boxShadow && s.boxShadow.match(/(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+0px(?:\s+0px)?\s+inset/);
    if (m && (Math.abs(parseFloat(m[2])) >= 2) !== (Math.abs(parseFloat(m[3])) >= 2) && sature(m[1])) { out.push(nom(e) + ' ombre ' + m[0]); }
  }
  return Array.from(new Set(out));
});

(async () => {
  const sources = filetsDesSources();
  ok('Sources : aucun filet de couleur sur un seul côté (CSS et styles écrits en JavaScript)', sources.length === 0, sources.length + ' : ' + sources.slice(0, 12).join(' | '));

  let suggestion = null, statutAvant = null;
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const ECRANS = [['Gestion des réserves', menu("s.str_COMPOSANT = 'reservemanager'")], ['Fiche Article', menu("s.str_DESCRIPTION = 'Fiche Article'")]];
    for (const [nomEcran, m] of ECRANS) {
      await ouvrirMenu(p, m[0], m[1]);
      await p.waitForTimeout(3500);
      const f = await filetsVisibles(p);
      ok(nomEcran + ' : aucun filet de couleur à l\'écran', f.length === 0, f.slice(0, 8).join(' | '));
    }
    /* « Suggestion de reappro. », puis « Modifier » sur la premiere suggestion : ecran a sections habillees, celui de la
       capture (Infos, Ajout). L'ouverture la passe « en cours » : son statut est remis a la fin. */
    const ms = menu("s.str_COMPOSANT = 'i_sugg_manager'");
    await ouvrirMenu(p, ms[0], ms[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('gridpanel').some((g) => g.isVisible(true) && g.getStore().getCount() > 0 && g.getStore().getAt(0).get('lg_SUGGESTION_ORDER_ID')), null, { timeout: 60000 });
    suggestion = await p.evaluate(() => Ext.ComponentQuery.query('gridpanel').find((g) => g.isVisible(true) && g.getStore().getCount() > 0 && g.getStore().getAt(0).get('lg_SUGGESTION_ORDER_ID')).getStore().getAt(0).get('lg_SUGGESTION_ORDER_ID'));
    statutAvant = q(`SELECT str_STATUT FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${suggestion}'`);
    await p.locator('.x-grid-row [data-qtip="Modifier"]:visible, .x-grid-row img[src*="page_white_edit"]:visible').first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('suggerercdemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(3000);
    const f = await filetsVisibles(p);
    ok('Suggestion de commande : aucun filet de couleur à l\'écran', f.length === 0, f.slice(0, 8).join(' | '));
    /* style B : bandeau de titre gris sur toute la largeur de la section */
    const sections = await p.evaluate(() => Ext.ComponentQuery.query('suggerercdemanager fieldset').filter((s) => s.isVisible(true) && s.legend).map((s) => {
      const l = s.legend.getEl().dom, fr = s.getEl().dom.getBoundingClientRect(), lr = l.getBoundingClientRect(), st = getComputedStyle(l);
      return { titre: (s.title || '').replace(/<[^>]+>/g, ''), fond: st.backgroundColor, largeur: Math.round(lr.width / fr.width * 100) };
    }));
    const gris = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) { return false; } const v = m[1].split(',').map(parseFloat); return (v.length < 4 || v[3] > 0.5) && v[0] < 250 && Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]) < 25; };
    ok('Sections de la suggestion : bandeau de titre gris sur toute la largeur', sections.length >= 2 && sections.every((s) => gris(s.fond) && s.largeur >= 97), JSON.stringify(sections));
    await p.screenshot({ path: process.env.CAPTURE_FILETS || path.join(require('os').tmpdir(), 'sans-filet.png') }).catch(() => {});
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (suggestion && statutAvant) {
      execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-e', `UPDATE t_suggestion_order SET str_STATUT = '${statutAvant}' WHERE lg_SUGGESTION_ORDER_ID = '${suggestion}'`]);
      ok('Statut de la suggestion ouverte remis (' + statutAvant + ')', q(`SELECT str_STATUT FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${suggestion}'`) === statutAvant);
    }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
