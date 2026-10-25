/* ORDRE DES MODULES DU MENU STABLE (demande du 24/10).
 *
 * « Campagnes SMS / WhatsApp » et « Ressources humaines » avaient la meme priorite en base (12) : leur ordre dans le
 * menu pouvait s'inverser d'un chargement a l'autre. Par les vues (admin), lecture seule :
 *  - aucun des modules affiches dans le menu de l'admin ne partage sa priorite avec un autre ;
 *  - « Campagnes SMS / WhatsApp » puis « Ressources humaines » (l'ordre affiche jusqu'ici sur le banc), sur trois connexions ;
 *  - l'ordre des autres modules ne change pas (meme suite qu'avant, ces deux-la mis a part) ;
 *  - meme correction pour « Gestion des tiers-payants », « Menu pharmacien » et « Gestion des promotions » (priorite 3
 *    toutes les trois ; les deux derniers ne sont pas dans le menu de l'admin) : en base, plus aucun module actif ne
 *    partage sa priorite, et l'ordre est tiers-payants, menu pharmacien, promotions, juste avant les commandes.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* ordre des autres modules du menu de l'admin, releve avant le changement */
const AUTRES = ['SERVICE CLIENT', 'GESTION COURANTE', 'FACTURATION', 'GESTION DES TIERS-PAYANTS', 'GESTION DES COMMANDES', 'GESTION DU STOCK',
  'PARAMETRAGES', 'RETROCESSION', 'ANALYSE DE GESTION', 'NOTIFICATIONS', 'GESTION DES UTILISATEURS', 'AVIS CLIENTS', 'CENTRE DE SUPPORT'];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ordres = [];
  try {
    for (let i = 0; i < 3; i++) {
      const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
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
    const actifs = q("SELECT UPPER(str_VALUE), int_PRIORITY FROM t_menu WHERE str_Status = 'enable' ORDER BY int_PRIORITY").split('\n').map((l) => l.split('\t'));
    const egaux = actifs.filter((x) => actifs.filter((y) => y[1] === x[1]).length > 1).map((x) => x.join('='));
    ok('En base : aucun module actif ne partage sa priorité avec un autre', egaux.length === 0, egaux.join(', '));
    const rang = (n) => actifs.findIndex((x) => x[0] === n);
    const suite = ['FACTURATION', 'GESTION DES TIERS-PAYANTS', 'MENU PHARMACIEN', 'GESTION DES PROMOTIONS', 'GESTION DES COMMANDES'].map(rang);
    ok('Ordre : facturation, tiers-payants, menu pharmacien, promotions, commandes', suite.every((r, i) => r >= 0 && (i === 0 || r === suite[i - 1] + 1)),
      actifs.map((x) => x.join('=')).join(' '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
