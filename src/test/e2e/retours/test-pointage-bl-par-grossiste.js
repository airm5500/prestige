/* POINTAGE BL : GROSSISTE SUR CHAQUE PIECE ET MONTANT DE CHAQUE GROSSISTE D'UN GROUPE (demandes serveur, point 45).
 *
 * GET v1/pointage-bl?groupe=... sur un groupe de grossistes du banc (lecture seule). Ce que le test etablit :
 *  - chaque piece porte grossisteId et grossiste (libelle de t_grossiste) ;
 *  - recherche par groupe : parGrossiste, un element par grossiste ayant des pieces, trie par libelle ; ses sommes
 *    egalent les totaux du groupe ; net = totalBl + totalAvoirs ; pieces = pointes + nonPointes + receptions ;
 *  - parGrossiste identique entre etat TOUS et NON_POINTES ;
 *  - recherche par grossiste : pas de parGrossiste, montants egaux a l'element du meme grossiste ;
 *  - chaque montant compare au calcul de la liste des pieces du grossiste.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DU = '2026-09-01', AU = '2026-10-15';

(async () => {
  const GROUPE = q("SELECT groupeId FROM t_grossiste WHERE groupeId IS NOT NULL GROUP BY groupeId HAVING COUNT(*) >= 2 ORDER BY COUNT(*) DESC LIMIT 1");
  const libelles = {};
  q("SELECT CONCAT(lg_GROSSISTE_ID, '|', str_LIBELLE) FROM t_grossiste WHERE groupeId = '" + GROUPE + "'").split('\n').forEach((l) => { const [i, n] = l.split('|'); libelles[i] = n; });
  ok('Jeu d\'essai : un groupe d\'au moins 2 grossistes', !!GROUPE && Object.keys(libelles).length >= 2, GROUPE + ' ' + Object.values(libelles).join(', '));
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage();
  const lire = (u) => p.evaluate(async (u) => (await fetch(u)).json(), u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const tous = await lire('../api/v1/pointage-bl?groupe=' + GROUPE + '&du=' + DU + '&au=' + AU + '&etat=TOUS');
    const data = tous.data || [];
    ok('Groupe : des pièces sur la période', tous.success === true && data.length > 0, data.length);
    ok('Chaque pièce porte grossisteId et grossiste (libellé)', data.length > 0 && data.every((x) => libelles[x.grossisteId] !== undefined && x.grossiste === libelles[x.grossisteId]), JSON.stringify(data.find((x) => !libelles[x.grossisteId] || x.grossiste !== libelles[x.grossisteId]) || {}).slice(0, 200));
    const pg = tous.parGrossiste || [];
    const somme = (k) => pg.reduce((a, x) => a + x[k], 0);
    ok('parGrossiste : sommes = totaux du groupe', pg.length > 0 && somme('totalBl') === tous.totalBl && somme('totalAvoirs') === tous.totalAvoirs && somme('net') === tous.net
      && somme('pointes') === tous.pointes && somme('nonPointes') === tous.nonPointes && somme('pieces') === data.length,
      JSON.stringify({ bl: [somme('totalBl'), tous.totalBl], av: [somme('totalAvoirs'), tous.totalAvoirs], pieces: [somme('pieces'), data.length] }));
    const tri = pg.map((x) => x.libelle);
    ok('parGrossiste : un élément par grossiste ayant des pièces, trié par libellé, net = BL + avoirs', JSON.stringify(tri) === JSON.stringify(tri.slice().sort((a, b) => a.localeCompare(b)))
      && pg.every((x) => x.pieces > 0 && x.net === x.totalBl + x.totalAvoirs && x.libelle === libelles[x.grossisteId])
      && pg.length === new Set(data.map((x) => x.grossisteId)).size, JSON.stringify(pg).slice(0, 250));
    const np = await lire('../api/v1/pointage-bl?groupe=' + GROUPE + '&du=' + DU + '&au=' + AU + '&etat=NON_POINTES');
    ok('parGrossiste identique entre TOUS et NON_POINTES', JSON.stringify(np.parGrossiste) === JSON.stringify(tous.parGrossiste));
    let ecarts = [];
    for (const e of pg) {
      const g = await lire('../api/v1/pointage-bl?grossiste=' + e.grossisteId + '&du=' + DU + '&au=' + AU + '&etat=TOUS');
      if ('parGrossiste' in g) { ecarts.push(e.libelle + ' : parGrossiste présent'); }
      const recep = (g.data || []).filter((x) => x.type === 'RECEPTION').length;
      if (g.totalBl !== e.totalBl || g.totalAvoirs !== e.totalAvoirs || g.net !== e.net || g.pointes !== e.pointes || g.nonPointes !== e.nonPointes || (g.data || []).length !== e.pieces
        || e.pieces !== e.pointes + e.nonPointes + recep) {
        ecarts.push(e.libelle + ' ' + JSON.stringify([g.totalBl, e.totalBl, g.totalAvoirs, e.totalAvoirs, (g.data || []).length, e.pieces]));
      }
    }
    ok('Recherche par grossiste : pas de parGrossiste, montants = élément du même grossiste', ecarts.length === 0, ecarts.join(' ; '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
