/* SUPPRESSION D'UNE COMMANDE ENVOYEE DEUX FOIS (journal du 16/10, 10:31:44 : deux DELETE dans la meme seconde).
 *
 * Le second appel ne trouvait plus la commande et finissait en erreur 500 (« attempt to create delete event with null
 * entity »). Ce que le test etablit (commande d'essai, retiree) :
 *  - premier DELETE : 200, commande supprimee ;
 *  - second DELETE de la meme commande : 200 aussi (deja supprimee), aucune erreur ;
 *  - deux DELETE simultanes : aucun 500 ;
 *  - une commande avec une ligne est supprimee avec sa ligne (comme avant).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID1 = 'E2E-CMD-DBL-1', ID2 = 'E2E-CMD-DBL-2', ID3 = 'E2E-CMD-DBL-3';
const creer = (id) => q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE) VALUES ('" + id + "', '" + id + "', 0, 'is_Process', NOW(), NOW(), 0)");
const nettoyer = () => q("DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + ID3 + "'; DELETE FROM t_order WHERE lg_ORDER_ID IN ('" + ID1 + "', '" + ID2 + "', '" + ID3 + "')");

(async () => {
  nettoyer(); creer(ID1); creer(ID2); creer(ID3);
  q("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID) SELECT 'E2E-CMD-DBL-L', '" + ID3 + "', f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID FROM t_famille f, t_grossiste g LIMIT 1");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const suppr = (id) => p.evaluate(async (id) => (await fetch('../api/v1/commande/order/' + id, { method: 'DELETE' })).status, id);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const s1 = await suppr(ID1);
    ok('Premier DELETE : 200, commande supprimée', s1 === 200 && q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + ID1 + "'") === '0', s1);
    const s2 = await suppr(ID1);
    ok('Second DELETE de la même commande : 200 (déjà supprimée), pas d\'erreur 500', s2 === 200, s2);
    const deux = await p.evaluate(async (id) => Promise.all([1, 2].map(async () => (await fetch('../api/v1/commande/order/' + id, { method: 'DELETE' })).status)), ID2);
    ok('Deux DELETE simultanés : aucune erreur 500, commande supprimée', deux.every((s) => s === 200) && q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + ID2 + "'") === '0', deux.join(','));
    const s3 = await suppr(ID3);
    ok('Commande avec une ligne : supprimée avec sa ligne', s3 === 200 && q("SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '" + ID3 + "'") === '0'
      && q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + ID3 + "'") === '0', s3);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
