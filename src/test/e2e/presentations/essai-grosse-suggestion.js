/* PRESENTATIONS A L'ESSAI : une grosse suggestion existante s'ouvre vite en variante (lecture seule).
 *
 * Regression du 04/11 : les variantes lisaient toutes les lignes d'un coup (limite 5000) alors que la grille d'origine
 * lit 10 lignes par page ; sur une suggestion de 1 819 lignes, le calcul de chaque ligne a sature le serveur. Les
 * variantes lisent desormais la page de la grille d'origine.
 * Lancement : REF_SUGG=<reference d'une suggestion de plus de 100 lignes> ; aucune ecriture (aucune quantite changee).
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const { q, ok } = C;

const REF = process.env.REF_SUGG
  || q("SELECT o.str_REF FROM t_suggestion_order o WHERE o.str_STATUT IN ('is_Process', 'pending') AND (SELECT COUNT(*) FROM t_suggestion_order_details d"
    + " WHERE d.lg_SUGGESTION_ORDER_ID = o.lg_SUGGESTION_ORDER_ID) > 100 ORDER BY o.dt_UPDATED DESC LIMIT 1");
const N = Number(q(`SELECT COUNT(*) FROM t_suggestion_order_details d JOIN t_suggestion_order o ON o.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE o.str_REF = '${REF}'`));

(async () => {
  ok('Précondition : une suggestion de plus de 100 lignes', !!REF && N > 100, REF + ' : ' + N + ' lignes');
  let b = null, p = null, erreurs = [];
  try {
    ({ b, p, erreurs } = await C.demarrer(chromium));
    const limites = [];
    p.on('request', (r) => { const m = /suggestion\/list\/items\?.*\blimit=(\d+)/.exec(r.url()); if (m) { limites.push(Number(m[1])); } });
    await C.ouvrirDocument(p, 'Suggestion de reappro.', 'i_sugg_manager', 'str_REF', REF, 'Modifier');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 120000 });
    const t0 = Date.now();
    await C.choisirPresentation(p, 'A');
    await C.attendreCalme(p);
    const duree = Date.now() - t0;
    const r = await p.evaluate(() => ({ lignes: document.querySelectorAll('.pp-vue input[data-pp-qte]').length,
      pages: (document.querySelector('.pp-vue [data-pp-pages]') || {}).textContent, total: (document.querySelector('.pp-vue [data-pp-total="lignes"]') || {}).textContent }));
    ok('A : une page de lignes, comme la grille d\'origine', r.lignes > 0 && r.lignes <= 50, JSON.stringify(r));
    ok('A : le total donne toutes les lignes de la suggestion', Number(String(r.total).replace(/\D/g, '')) === N, r.total + ' / ' + N);
    ok('A : affichée en moins de 30 s', duree < 30000, duree + ' ms');
    await p.click('.pp-vue [data-pp-page="1"]');
    await C.attendreCalme(p);
    const r2 = await p.evaluate(() => (document.querySelector('.pp-vue [data-pp-pages]') || {}).textContent);
    ok('A : « › » passe à la page suivante de la grille d\'origine', /^Lignes 11–20 sur/.test(r2 || ''), r2);
    ok('Aucune demande de lignes au-delà de la taille de page (≤ 50)', limites.length > 0 && Math.max(...limites) <= 50, JSON.stringify(limites));
    await C.ergonomie(p, 'Grosse suggestion A');
    await C.choisirPresentation(p, 'actuel');
    ok('Aucune erreur JavaScript ni fenêtre du navigateur', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack || e);
  } finally {
    if (b) { await b.close().catch(() => {}); }
    process.exit(C.bilan());
  }
})();
