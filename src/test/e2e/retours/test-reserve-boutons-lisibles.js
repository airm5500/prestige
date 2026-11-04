/* RETOUR DU 03/11 : « menu Gestion des réserves : on ne voit pas le texte des boutons » (Suggestions de réappro de la
 * réserve, du rayon, Suggestion sur tout le résultat, sur la sélection : texte blanc sur fond blanc).
 *
 * Par les vues, avec de vrais clics : menu « Gestion des réserves », onglets TOUT, REAPPRO RESERVE, REASSORT RAYON.
 * Pour chaque bouton visible des barres d'outils de l'onglet : contraste entre la couleur du texte et le fond
 * reellement peint derriere lui (premier fond non transparent en remontant) : au moins 4,5 (lisibilite WCAG AA) pour les
 * boutons colores de l'ecran, au moins 3 pour les boutons a l'habillage commun de l'application.
 * Aucune donnee ecrite.
 *
 * node retours/test-reserve-boutons-lisibles.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [PARENT, ENTREE] = q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE s.str_COMPOSANT = 'reservemanager' LIMIT 1").split('|');

/* contraste de chaque bouton visible sous la racine donnee */
const mesurer = (p, racine) => p.evaluate((racine) => {
  const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) { return null; } const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fond = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); const c = rgb(s.backgroundColor); if (c && c.a > 0.5) { return c; } if (s.backgroundImage && s.backgroundImage !== 'none' && /gradient/.test(s.backgroundImage)) { const m = s.backgroundImage.match(/rgba?\([^)]+\)/); if (m) { return rgb(m[0]); } } } return { r: 255, g: 255, b: 255, a: 1 }; };
  const r = document.querySelector(racine);
  if (!r) { return null; }
  return Array.from(r.querySelectorAll('.x-btn')).filter((b) => b.offsetParent && b.getBoundingClientRect().width > 0).map((b) => {
    const t = b.querySelector('.x-btn-inner') || b;
    const texte = (t.innerText || '').trim();
    if (!texte) { return null; }
    const ct = rgb(getComputedStyle(t).color), cf = fond(t);
    const l1 = lum(ct), l2 = lum(cf);
    return { texte, contraste: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 10) / 10, texteCouleur: getComputedStyle(t).color, fond: 'rgb(' + cf.r + ',' + cf.g + ',' + cf.b + ')', cls: b.className.split(' ').filter((x) => /^btn-/.test(x)).join(' ') };
  }).filter(Boolean);
}, racine);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, PARENT, ENTREE);
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); return m && m.getActiveTab(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const onglets = await p.evaluate(() => Ext.getCmp('reservemanagerID').items.getRange().map((c) => ({ id: c.getId(), titre: (c.baseTitle || c.title || '').replace(/<[^>]+>/g, '') })));
    for (const o of onglets.filter((x) => !/SUGGESTION|HISTORIQUE/i.test(x.titre))) {
      const tab = await p.evaluate((id) => { const c = Ext.getCmp(id); return c.tab ? c.tab.getId() : null; }, o.id);
      if (tab) { await p.click('#' + tab); }
      await p.waitForTimeout(1200);
      const mesures = await mesurer(p, '#' + o.id);
      /* boutons colores signales (btn-...) : 4,5 ; les autres, habillage commun de l'application : au moins 3 */
      const illisibles = (mesures || []).filter((x) => x.contraste < (x.cls ? 4.5 : 3));
      ok('Onglet « ' + o.titre + ' » : texte de chaque bouton lisible (boutons colorés ≥ 4,5, autres ≥ 3)', mesures && mesures.length > 0 && illisibles.length === 0,
        JSON.stringify(illisibles.length ? illisibles : mesures.filter((x) => x.cls).slice(0, 4)));
      /* au survol aussi : la souris posee sur le bouton colore ne doit pas effacer son texte */
      const colore = p.locator('#' + o.id + ' .x-btn[class*="btn-"]').filter({ visible: true }).first();
      if (await colore.count()) {
        await colore.hover();
        await p.waitForTimeout(300);
        const survol = (await mesurer(p, '#' + o.id)).filter((x) => x.cls && x.contraste < 4.5);
        ok('Onglet « ' + o.titre + ' » : bouton coloré lisible au survol', survol.length === 0, JSON.stringify(survol));
        await p.mouse.move(5, 880);
      }
    }
    await p.screenshot({ path: process.env.CAPTURE_RESERVE || require('path').join(require('os').tmpdir(), 'reserve-boutons.png'), clip: { x: 0, y: 0, width: 1600, height: 260 } }).catch(() => {});
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
