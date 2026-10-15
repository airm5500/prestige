/* FICHE ARTICLE : « DERNIERE VENTE » SANS RELIRE TOUT L'HISTORIQUE (retour du 15/10, lenteur au clic sur
 * « Modification » et « Détail sur l'article »).
 *
 * GET v1/produit-search/produits/{id} calcule la date de derniere vente en joignant TOUTES les lignes de vente de
 * l'article (22 000 pour un gros vendeur du banc) puis en triant. Ce que le test etablit, sur un gros vendeur, un
 * article peu vendu et un article jamais vendu :
 *  - dt_LAST_VENTE identique au calcul SQL d'origine (derniere vente cloturee, non annulee, montant > 0, emplacement) ;
 *  - temps de la route a chaud sous 80 ms pour le gros vendeur (mediane de 5 appels).
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const reference = (id) => q("SELECT IFNULL(DATE_FORMAT(MAX(p.dt_UPDATED), '%d/%m/%Y %H:%i'), '') FROM t_preenregistrement_detail d"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
  + " WHERE d.lg_FAMILLE_ID = '" + id + "' AND u.lg_EMPLACEMENT_ID = '" + EMP + "' AND p.b_IS_CANCEL = 0 AND p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0");

(async () => {
  const GROS = q("SELECT lg_FAMILLE_ID FROM t_preenregistrement_detail WHERE dt_CREATED > NOW() - INTERVAL 30 DAY GROUP BY lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 1");
  const PEU = q("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d GROUP BY d.lg_FAMILLE_ID HAVING COUNT(*) BETWEEN 2 AND 5 LIMIT 1");
  const JAMAIS = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) LIMIT 1");
  ok('Jeu d\'essai : gros vendeur, peu vendu, jamais vendu', !!GROS && !!PEU && !!JAMAIS, [GROS, PEU, JAMAIS].join(' / '));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const lire = (id) => p.evaluate(async (id) => { const t0 = performance.now(); const r = await fetch('../api/v1/produit-search/produits/' + id); const j = await r.json(); return { ms: performance.now() - t0, d: (j.data || {}).dt_LAST_VENTE }; }, id);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    for (const [nom, id] of [['gros vendeur', GROS], ['peu vendu', PEU], ['jamais vendu', JAMAIS]]) {
      const r = await lire(id), attendu = reference(id);
      ok('Dernière vente (' + nom + ') = calcul SQL d\'origine', (r.d || '') === attendu, JSON.stringify(r.d) + ' / attendu ' + JSON.stringify(attendu));
    }
    const temps = [];
    for (let i = 0; i < 5; i++) { temps.push((await lire(GROS)).ms); }
    temps.sort((a, b) => a - b);
    ok('Gros vendeur : route sous 80 ms à chaud (médiane de 5)', temps[2] < 80, temps.map(Math.round).join(', ') + ' ms');
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
