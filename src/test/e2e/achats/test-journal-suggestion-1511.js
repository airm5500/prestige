/* Exploitation du 14/11, S1 : le journal du serveur d'appaul etait noye par la suggestion (94 % du volume, 81 Mo).
 * A chaque ouverture ou rechargement d'une suggestion, le serveur ecrivait 9 lignes INFO « SUGGESTION PERF » par
 * produit, et une pile SEVERE complete (NoResultException) pour chaque produit sans fiche chez le grossiste (cas
 * normal). Le journal tournait toutes les 20 a 60 s : une erreur du matin avait disparu avant qu'on la cherche.
 *
 * Parcours : Commandes > Suggestions > recherche de la suggestion > ouverture du detail.
 * Jeu d'essai (retire a la fin) : une suggestion de 10 produits en stock (une page), quantites 1 a 10 ; 5 ont une fiche chez le
 * grossiste (code article propre), 5 n'en ont pas.
 * Controles :
 *  - rapprochement ecran / base, ligne par ligne : produit, quantite, code affiche (code article du grossiste s'il
 *    existe, sinon CIP du produit) ;
 *  - journal : pendant l'ouverture et un rechargement, aucune ligne « SUGGESTION PERF », aucune NoResultException,
 *    et moins de 20 lignes en tout (avant : plus de 200).
 * Lancement seul : node src/test/e2e/achats/test-journal-suggestion-1511.js
 */
const fs = require('fs');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const M = 'E2E-JSG-';
const JOURNAL = ENV_E2E.JOURNAL_SERVEUR;

/* grossiste qui a le plus de fiches produit */
const G = q("SELECT fg.lg_GROSSISTE_ID FROM t_famille_grossiste fg JOIN t_grossiste g ON g.lg_GROSSISTE_ID = fg.lg_GROSSISTE_ID AND g.str_STATUT = 'enable'"
  + " WHERE fg.str_STATUT = 'enable' AND fg.str_CODE_ARTICLE IS NOT NULL AND fg.str_CODE_ARTICLE <> '' GROUP BY fg.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1");
const produits = (avec) => q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, IFNULL((SELECT fg.str_CODE_ARTICLE FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + ` AND fg.lg_GROSSISTE_ID = '${G}' AND fg.str_STATUT = 'enable' LIMIT 1), '')) FROM t_famille f`
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP IS NOT NULL AND f.int_CIP <> ''"
  + ` AND ${avec ? '' : 'NOT '}EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '${G}' AND fg.str_STATUT = 'enable'`
  + (avec ? " AND fg.str_CODE_ARTICLE IS NOT NULL AND fg.str_CODE_ARTICLE <> '' AND fg.str_CODE_ARTICLE <> f.int_CIP" : '') + ')'
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + ' ORDER BY f.lg_FAMILLE_ID LIMIT 5 OFFSET 5').split(/\r?\n/).filter(Boolean).map((l) => { const [id, cip, code] = l.split('|'); return { id, cip, code }; });
const AVEC = produits(true);
const SANS = produits(false);
const LIGNES = [...AVEC, ...SANS].map((pr, i) => ({ ...pr, qte: i + 1, attenduCode: pr.code || pr.cip }));

function retirer() {
  q(`DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${M}S'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${M}S';`);
}
function lireJournal(depuis) {
  if (!fs.existsSync(JOURNAL)) { return ''; }
  const t = fs.statSync(JOURNAL).size;
  const de = t >= depuis ? depuis : 0;
  const buf = Buffer.alloc(t - de);
  const fd = fs.openSync(JOURNAL, 'r');
  fs.readSync(fd, buf, 0, buf.length, de);
  fs.closeSync(fd);
  return buf.toString('latin1');
}

(async () => {
  retirer();
  ok('Précondition : un grossiste, 5 produits avec fiche chez lui et 5 sans', !!G && AVEC.length === 5 && SANS.length === 5, G + ' ' + AVEC.length + '/' + SANS.length);
  q(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${M}S', '${M}S', '${G}', 'is_Process', NOW(), NOW());`
    + LIGNES.map((l, i) => 'INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID,'
      + ` int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${M}L${i}', '${M}S', '${G}', '${l.id}',`
      + ` ${l.qte}, ${100 * l.qte}, 150, 100, NOW(), NOW(), 'is_Process', 0);`).join(''));
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    /* retour du 25/11 : la question « Nettoyer la suggestion ? » (fenetre a l'ouverture) recoit « Non, garder » */
    await require('../support/question-nettoyage-suggestion').garder(p);
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const taille0 = fs.existsSync(JOURNAL) ? fs.statSync(JOURNAL).size : 0;
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; if (g.down('#filtreStatut')) { g.down('#filtreStatut').setValue(''); }
      Ext.getCmp('rechecher').setValue(r); g.onRechClick(); }, M + 'S');
    await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', r) >= 0; }, M + 'S', { timeout: 30000 });
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', r)); }, M + 'S');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.getStore().isLoading() === false && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    /* rechargement, comme apres chaque modification de quantite */
    const relu = p.waitForResponse((x) => x.url().indexOf('/suggestion/list/items') >= 0, { timeout: 60000 });
    await vues.cliquer(p, '#gridpanelSuggestionID pagingtoolbar #refresh');
    await relu;
    await p.waitForTimeout(3000);

    const ecran = await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').getStore().getRange()
      .map((r) => ({ id: r.get('lg_FAMILLE_ID'), qte: Number(r.get('int_NUMBER')), code: String(r.get('str_FAMILLE_CIP') || '') })));
    const ecarts = [];
    LIGNES.forEach((l) => {
      const e = ecran.find((x) => x.id === l.id);
      if (!e || e.qte !== l.qte || e.code !== l.attenduCode) { ecarts.push(l.id + ' attendu ' + l.qte + '/' + l.attenduCode + ' écran ' + JSON.stringify(e)); }
    });
    const base = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY lg_FAMILLE_ID) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${M}S'`);
    const vu = ecran.map((x) => x.id + ':' + x.qte).sort().join(',');
    ok('Rapprochement écran / base : 10 lignes (une page), mêmes produits et quantités (1 à 10)', ecran.length === 10 && vu === base.split(',').sort().join(','), vu + ' / ' + base);
    ok('Code affiché : code article du grossiste (5 produits), sinon CIP (5 produits sans fiche)', ecarts.length === 0, ecarts.join(' | '));

    const journal = lireJournal(taille0);
    const lignes = journal.split(/\r?\n/).filter((l) => /^\[20\d\d-/.test(l));
    const perf = (journal.match(/SUGGESTION PERF/g) || []).length;
    const nores = (journal.match(/NoResultException/g) || []).length;
    ok('Journal : aucune ligne « SUGGESTION PERF » pendant l\'ouverture et le rechargement', perf === 0, perf + ' ligne(s)');
    ok('Journal : aucune NoResultException pour les 5 produits sans fiche chez le grossiste', nores === 0, nores + ' occurrence(s)');
    ok('Journal : moins de 20 entrées en tout pour l\'ouverture et le rechargement', lignes.length < 20, lignes.length + ' entrée(s), ' + journal.length + ' octets');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${M}S'`) === '0'
      && q(`SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${M}S'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
