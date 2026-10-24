/* ORDRE DES MODULES DU MENU STABLE (demande du 24/10).
 *
 * « Campagnes SMS / WhatsApp » et « Ressources humaines » avaient la meme priorite en base (12) : leur ordre dans le
 * menu pouvait s'inverser d'un chargement a l'autre. Par les vues (admin), lecture seule :
 *  - aucun des modules affiches dans le menu de l'admin ne partage sa priorite avec un autre ;
 *  - « Campagnes SMS / WhatsApp » puis « Ressources humaines » (l'ordre affiche jusqu'ici sur le banc), sur trois connexions ;
 *  - l'ordre des autres modules ne change pas (meme suite qu'avant, ces deux-la mis a part).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* ordre des autres modules du menu de l'admin, releve avant le changement */
const AUTRES = ['SERVICE CLIENT', 'GESTION COURANTE', 'FACTURATION', 'GESTION DES TIERS-PAYANTS', 'GESTION DES COMMANDES', 'GESTION DU STOCK',
  'PARAMETRAGES', 'RETROCESSION', 'ANALYSE DE GESTION', 'NOTIFICATIONS', 'GESTION DES UTILISATEURS', 'AVIS CLIENTS', 'CENTRE DE SUPPORT'];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ordres = [];
  try {
    for (let i = 0; i < 3; i++) {
      const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
      await connexion(p, 'admin', 'e2etest');
      ordres.push(await p.evaluate(() => { const l = []; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().eachChild((m) => { if (m.childNodes.length) { l.push(m.get('text')); } }); return l; }));
      await p.context().close();
    }
    const affiches = ordres[0].map((t) => t.toUpperCase());
    const prios = q("SELECT UPPER(str_VALUE), int_PRIORITY FROM t_menu WHERE str_Status = 'enable'").split('\n').map((l) => l.split('\t'));
    const prio = (nom) => (prios.find((x) => x[0] === nom) || [])[1];
    const vues = affiches.map((n) => n + '=' + prio(n));
    const doublons = affiches.filter((n, i) => affiches.some((m, j) => j !== i && prio(m) === prio(n)));
    ok('Aucun module du menu ne partage sa priorité avec un autre', doublons.length === 0, doublons.join(', ') || vues.join(' '));
    const rh = (o) => o.map((t) => t.toUpperCase()).indexOf('RESSOURCES HUMAINES'), ca = (o) => o.map((t) => t.toUpperCase()).indexOf('CAMPAGNES SMS / WHATSAPP');
    ok('« Campagnes SMS / WhatsApp » puis « Ressources humaines » sur trois connexions', ordres.every((o) => ca(o) >= 0 && rh(o) === ca(o) + 1)
      && ordres.every((o) => JSON.stringify(o) === JSON.stringify(ordres[0])), ordres.map((o) => rh(o) + '/' + ca(o)).join(' '));
    const reste = affiches.filter((n) => n !== 'RESSOURCES HUMAINES' && n !== 'CAMPAGNES SMS / WHATSAPP');
    ok('Ordre des autres modules inchangé', JSON.stringify(reste) === JSON.stringify(AUTRES), reste.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
