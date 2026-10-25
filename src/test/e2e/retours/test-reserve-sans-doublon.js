/* RESERVE : UNE DEMANDE RENVOYEE N'AGIT QU'UNE FOIS (demandes serveur des applications mobiles, 15).
 * Avec l'en-tete X-Client-Ref (telephone : reseau instable, double appui, reprise) :
 *  - suggestion-reserve/creer envoyee deux fois : UNE suggestion, meme reponse ;
 *  - reserve/assort envoye deux fois : UN mouvement, le stock ne bouge qu'une fois ;
 *  - sans en-tete : comportement d'origine (deux envois = deux mouvements).
 * Stocks (rayon, reserve) et donnees d'essai remis a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
/* produit avec stock rayon ; sa ligne de stock reserve est creee par le test (le banc n'en a pas), puis retiree */
const P = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2') ORDER BY s.lg_FAMILLE_ID LIMIT 1 OFFSET 5");
const AVANT = q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, r.int_NUMBER, IFNULL(f.bool_RESERVE, 'NULL')) FROM t_famille_stock s
  JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'
  JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID
  WHERE s.lg_FAMILLE_ID = '${P}' AND s.lg_EMPLACEMENT_ID = '1'`).split('|');
exec(`UPDATE t_famille SET bool_RESERVE = 1 WHERE lg_FAMILLE_ID = '${P}';`
  + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)`
  + ` VALUES ('E2E-RES-DOUBLON-T', '${P}', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', 0)`);
const poser = (rayon, reserve) => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${rayon}, int_NUMBER = ${rayon} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
  + `UPDATE t_type_stock_famille SET int_NUMBER = ${rayon} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';`
  + `UPDATE t_type_stock_famille SET int_NUMBER = ${reserve} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '2';`);
const stocks = () => q(`SELECT CONCAT(s.int_NUMBER_AVAILABLE, '/', v.int_NUMBER) FROM t_famille_stock s JOIN t_type_stock_famille v ON v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_EMPLACEMENT_ID = '1' AND v.lg_TYPE_STOCK_ID = '2'
  WHERE s.lg_FAMILLE_ID = '${P}' AND s.lg_EMPLACEMENT_ID = '1'`);
const mouvements = () => q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${DEBUT}'`);
function nettoyer() {
  exec(`DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${DEBUT}';`
    + `DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE s.str_COMMENTAIRE = 'E2E-RES-DOUBLON';`
    + `DELETE FROM t_suggestion_reserve WHERE str_COMMENTAIRE = 'E2E-RES-DOUBLON';`
    + `DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-RES-%';`);
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${AVANT[0]}, int_NUMBER = ${AVANT[1]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_type_stock_famille SET int_NUMBER = ${AVANT[2]} WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '1';`
    + `UPDATE t_famille SET bool_RESERVE = ${AVANT[3]} WHERE lg_FAMILLE_ID = '${P}';`);
}
const retirerReserve = () => exec("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-RES-DOUBLON-T'");

(async () => {
  poser(20, 10);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext()).newPage();
  const post = (u, c, ref) => p.evaluate(async ([u, c, ref]) => { const h = { 'Content-Type': 'application/json' }; if (ref) { h['X-Client-Ref'] = ref; }
    const r = await fetch(u, { method: 'POST', headers: h, body: JSON.stringify(c) }); return r.json(); }, [u, c, ref]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const MOTIF = Number(q('SELECT id FROM motif_suggestion_reserve ORDER BY id LIMIT 1'));
    const corps = { categorie: 'RAYON', motifId: MOTIF, commentaire: 'E2E-RES-DOUBLON', items: [{ lg_FAMILLE_ID: P, int_QTE: 2 }] };
    const s1 = await post('../api/v1/suggestion-reserve/creer', corps, 'E2E-RES-1');
    const s2 = await post('../api/v1/suggestion-reserve/creer', corps, 'E2E-RES-1');
    const nb = q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE = 'E2E-RES-DOUBLON'");
    ok('Suggestion envoyée deux fois (même X-Client-Ref) : une seule, même réponse', s1.success && s2.success && s1.lg_SUGGESTION_RESERVE_ID === s2.lg_SUGGESTION_RESERVE_ID && nb === '1',
      JSON.stringify([s1.lg_SUGGESTION_RESERVE_ID, s2.lg_SUGGESTION_RESERVE_ID, s1.msg || s1.message]) + ' en base ' + nb);
    const a1 = await post('../api/v1/reserve/assort', { lg_FAMILLE_ID: P, int_NUMBER: 3 }, 'E2E-RES-2');
    const a2 = await post('../api/v1/reserve/assort', { lg_FAMILLE_ID: P, int_NUMBER: 3 }, 'E2E-RES-2');
    ok('Assort envoyé deux fois (même X-Client-Ref) : un mouvement, stock déplacé une fois (20/10 → 17/13)', a1.success && a2.success && mouvements() === '1' && stocks() === '17/13',
      JSON.stringify([a1.message || a1.msg, a2.message || a2.msg]) + ' mouvements ' + mouvements() + ' stocks ' + stocks());
    const b1 = await post('../api/v1/reserve/assort', { lg_FAMILLE_ID: P, int_NUMBER: 1 });
    const b2 = await post('../api/v1/reserve/assort', { lg_FAMILLE_ID: P, int_NUMBER: 1 });
    ok('Sans en-tête : comportement d\'origine, deux envois = deux mouvements (17/13 → 15/15)', b1.success && b2.success && mouvements() === '3' && stocks() === '15/15', mouvements() + ' ' + stocks());
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    retirerReserve();
    ok('Stocks et données d\'essai remis', q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = '${P}' AND s.lg_EMPLACEMENT_ID = '1'`) === AVANT[0] + '|' + AVANT[1]
      && mouvements() === '0' && q("SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = 'E2E-RES-DOUBLON-T'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
