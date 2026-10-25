/* MENUS CASSES MASQUES (retour du 24/10, valide par l'utilisateur).
 *
 * Quatre entrees actives en base ouvraient « Impossible d'ouvrir ce menu (vue … introuvable) » : l'ecran n'existe
 * plus dans le code. Elles sont masquees a l'affichage du menu (liste dans correctifs-affichage.js), sans toucher a
 * la base (entrees, droits et roles restent tels quels).
 * Par les vues (admin) :
 *  - arbre du menu charge : aucune des 4 vues ; les autres entrees de SERVICE CLIENT et d'ANALYSE DE GESTION restent ;
 *  - volet SERVICE CLIENT ouvert : « Ventes sans n° de bon », « Vendeurs et caissiers », « Corbeille des ventes »
 *    absentes ; « Ventes » present et s'ouvre ;
 *  - volet ANALYSE DE GESTION : « Stats famille article » absente ;
 *  - base inchangee (4 entrees toujours enable) ; aucune erreur JavaScript. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CASSES = ['ventemanagerbis', 'vendeurcaissiermanager', 'corbeillevente', 'statistiquefamillearticlemanager'];

(async () => {
  const enBase = () => q("SELECT COUNT(*) FROM t_sous_menu WHERE str_Status = 'enable' AND str_COMPOSANT IN ('" + CASSES.join("','") + "')");
  const avant = enBase();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    const arbre = await p.evaluate(() => { const ids = [], parents = {};
      Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.isLeaf()) { ids.push(n.get('id'));
        const t = n.parentNode.get('text'); parents[t] = (parents[t] || 0) + 1; } }); return { ids, parents }; });
    const restes = CASSES.filter((c) => arbre.ids.includes(c));
    ok('Arbre du menu : aucune des 4 vues introuvables', restes.length === 0, restes.join(','));
    ok('Les autres entrées restent (SERVICE CLIENT et ANALYSE DE GESTION non vides)', arbre.parents['SERVICE CLIENT'] >= 10 && arbre.parents['ANALYSE DE GESTION'] >= 10, JSON.stringify(arbre.parents));
    const volet = async (menu) => {
      await ouvrirMenu(p, menu, '__aucune__').catch(() => {});
      const l = await p.evaluate(() => { const v = Array.from(document.querySelectorAll('.prestige-flyout-menu')).filter((m) => m.offsetParent && m.getBoundingClientRect().width > 0);
        const m = v[v.length - 1]; return m ? Array.from(m.querySelectorAll('.x-menu-item')).map((e) => e.textContent.trim()).filter(Boolean) : []; });
      await p.keyboard.press('Escape');
      await p.waitForTimeout(800);
      return l;
    };
    const sc = await volet('SERVICE CLIENT');
    ok('Volet SERVICE CLIENT : les 3 entrées cassées absentes, « Ventes » présente', sc.length > 0 && !sc.some((t) => /^(Ventes sans n° de bon|Vendeurs et caissiers|Corbeille des ventes)$/.test(t)) && sc.includes('Ventes'), sc.join(' | '));
    const ag = await volet('ANALYSE DE GESTION');
    ok('Volet ANALYSE DE GESTION : « Stats famille article » absente', ag.length > 0 && !ag.includes('Stats famille article'), ag.join(' | '));
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForTimeout(4000);
    const msg = await p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    ok('« Ventes » s\'ouvre normalement', !/introuvable/.test(msg), msg);
    ok('Base inchangée : les 4 entrées restent actives en base', enBase() === avant && avant === '4', avant + ' -> ' + enBase());
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
