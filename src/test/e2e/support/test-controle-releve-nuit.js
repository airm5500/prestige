/* CONTROLE DE COHERENCE « SNAPSHOT_JOUR_MANQUANT » : FAUSSE ALERTE CHAQUE NUIT (journal du poste caisse 3, 23/10).
 *
 * « Snapshot de stock absent pour la veille » : le controle lisait t_stock_snapshot, que plus rien n'alimente depuis
 * le retrait de la procedure de nuit (le releve est ecrit dans stock_snapshot_day, a 00:05, date du jour). Il signalait
 * donc une absence chaque nuit, y compris quand le releve est desactive (KEY_VALORISATION_JOURNALIERE = 0).
 * La requete du controle, telle qu'elle est enregistree en base (t_support_controle), est executee sur trois cas :
 *  - releve desactive : aucun cas ;
 *  - releve active, pas de releve du jour : un cas ;
 *  - releve active, releve du jour present : aucun cas.
 * Parametre et ligne de releve d'essai remis a la fin.
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PARAM = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VALORISATION_JOURNALIERE'), 'ABSENT')");
const SQL = q("SELECT requete_sql FROM t_support_controle WHERE code = 'SNAPSHOT_JOUR_MANQUANT'");
const PRODUIT = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' LIMIT 1");
const JOUR = q("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d')");
const DEJA = q(`SELECT COUNT(*) FROM stock_snapshot_day WHERE stock_of_day = ${JOUR}`);
const cas = () => q(SQL).split(/\r?\n/).filter(Boolean).length;
const parametre = (v) => q(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = 'KEY_VALORISATION_JOURNALIERE'`);
try {
  ok('Jeu d\'essai : paramètre présent, pas de relevé du jour sur le banc', PARAM !== 'ABSENT' && DEJA === '0', PARAM + ' / ' + DEJA);
  ok('La requête ne lit plus t_stock_snapshot', !/t_stock_snapshot/.test(SQL) && /stock_snapshot_day/.test(SQL), SQL.slice(0, 200));
  parametre('0');
  ok('Relevé de nuit désactivé : aucun cas', cas() === 0);
  parametre('1');
  ok('Relevé activé, pas de relevé du jour : un cas', cas() === 1);
  q(`INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id) VALUES (${JOUR}, '1', '${PRODUIT}')`);
  ok('Relevé activé, relevé du jour présent : aucun cas', cas() === 0);
} catch (e) {
  ok('Parcours sans exception', false, e.stack);
} finally {
  q(`DELETE FROM stock_snapshot_day WHERE stock_of_day = ${JOUR} AND magasin_id = '1' AND produit_id = '${PRODUIT}'`);
  if (PARAM !== 'ABSENT') { parametre(PARAM); }
  ok('Paramètre et relevé d\'essai remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VALORISATION_JOURNALIERE'") === PARAM
    && q(`SELECT COUNT(*) FROM stock_snapshot_day WHERE stock_of_day = ${JOUR}`) === DEJA);
}
const ko = res.filter((x) => !x.c).length;
console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
process.exit(ko ? 1 : 0);
