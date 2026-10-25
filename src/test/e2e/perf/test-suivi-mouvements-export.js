/* SUIVI DES MOUVEMENTS D'ARTICLES (grilles, export Excel) - audit des exports apres le journal du 15/10.
 *
 * Chaque article relisait son stock puis CHARGEAIT chacun de ses mouvements du mois (et les objets lies : utilisateur,
 * ligne de vente...) : sur le banc, un mois (1 779 articles) prenait 1 079 s (suivi complet), 1 122 s (suivi) et
 * 1 062 s (Excel). Les totaux par type sont maintenant calcules par la base, par lots. Ce que le test etablit :
 *  - suivi complet, suivi et Excel d'un mois en moins de 30 s chacun ; un article par article mouvemente ;
 *  - echantillon : quantites vendues et entrees, et stock, conformes a la base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const D = '2026-09-01', F = '2026-09-30', MAX_MS = 30000;
const P = 'dtStart=' + D + '&dtEnd=' + F + '&search=&categorieId=&fabricantId=&rayonId=';

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage();
  const get = (u, json) => p.evaluate(async ([u, json, max]) => {
    const ctl = new AbortController(); const m = setTimeout(() => ctl.abort(), max * 2); const t = performance.now();
    try { const x = await fetch(u, { signal: ctl.signal }); const r = json ? await x.json() : (await x.arrayBuffer()).byteLength; return { s: x.status, ms: Math.round(performance.now() - t), r }; }
    catch (e) { return { s: 0, ms: Math.round(performance.now() - t), e: String(e) }; } finally { clearTimeout(m); }
  }, [u, json, MAX_MS]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const articles = Number(q("SELECT COUNT(DISTINCT lg_FAMILLE_ID) FROM hmvtproduit WHERE mvtdate BETWEEN '" + D + "' AND '" + F + "' AND lg_EMPLACEMENT_ID = '1'"));
    const complet = await get('../api/v1/produit/monitoring-complet?start=0&limit=100000&' + P, true);
    const suivi = await get('../api/v1/produit/monitoring?start=0&limit=100000&' + P, true);
    const excel = await get('../api/v1/produit/monitoring-complet/excel?' + P, false);
    const n = (r) => (r.r && r.r.data ? r.r.data.length : -1);
    ok('Suivi complet d\'un mois en moins de 30 s, un article par article mouvementé', complet.s === 200 && complet.ms < MAX_MS && n(complet) === articles && articles > 0, complet.ms + ' ms, ' + n(complet) + ' / ' + articles + (complet.e || ''));
    ok('Suivi d\'un mois en moins de 30 s, un article par article mouvementé', suivi.s === 200 && suivi.ms < MAX_MS && n(suivi) === articles, suivi.ms + ' ms, ' + n(suivi) + ' / ' + articles + (suivi.e || ''));
    ok('Export Excel du suivi complet en moins de 30 s', excel.s === 200 && excel.ms < MAX_MS && excel.r > 10000, excel.ms + ' ms, ' + excel.r + ' octets');
    let vus = 0; const faux = [];
    const lignes = (complet.r && complet.r.data) || [];
    for (const l of lignes.filter((x, i) => i % Math.max(1, Math.floor(lignes.length / 30)) === 0)) {
      const somme = (types) => Number(q("SELECT IFNULL(SUM(qteMvt), 0) FROM hmvtproduit WHERE lg_FAMILLE_ID = '" + l.produitId + "' AND lg_EMPLACEMENT_ID = '1' AND mvtdate BETWEEN '" + D + "' AND '" + F + "' AND typeMvt IN (" + types + ")"));
      const stock = q("SELECT IFNULL((SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + l.produitId + "' AND lg_EMPLACEMENT_ID = '1' AND str_STATUT = 'enable' LIMIT 1), 0)");
      const v = somme("'02', '12'"), e = somme("'01'");
      vus++;
      if (l.qtyVente !== v || l.qtyEntree !== e || String(l.currentStock) !== stock) { faux.push(l.cip + ' : ' + [l.qtyVente, l.qtyEntree, l.currentStock].join('/') + ' ≠ ' + [v, e, stock].join('/')); }
    }
    ok('Échantillon : quantités vendues, entrées et stock conformes à la base', vus >= 10 && faux.length === 0, vus + ' articles ; ' + faux.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
