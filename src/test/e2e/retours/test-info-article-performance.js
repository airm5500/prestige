/* MOBILE : PERFORMANCE DE GET v1/info (demandes serveur, point 44).
 *
 * La requete agregeait les ventes de tout le catalogue sur la periode puis ne gardait que les produits cherches.
 * Ce que le test etablit (lecture seule) :
 *  - quantiteVendue de chaque produit = calcul SQL direct (memes regles, meme debut de periode dtStart) ;
 *  - CIP exact : moins de 300 ms a chaud (seuil de la demande : 1 s sur le poste) ;
 *  - « doli » : moins de 1 s a chaud (seuil de la demande : 3 s) ;
 *  - mediane de 3 appels.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const DEBUT = q("SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 3 MONTH)");
  const CIP = q("SELECT int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND str_NAME LIKE 'DOLI%' ORDER BY int_CIP LIMIT 1");
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  const lire = (s) => p.evaluate(async (s) => { const t0 = performance.now(); const r = await fetch('../api/v1/info?search=' + encodeURIComponent(s[0]) + '&dtStart=' + s[1].split('-').reverse().join('/')); const j = await r.json(); return { ms: performance.now() - t0, j }; }, [s, DEBUT]);
  const mediane = async (s) => { const t = []; let j; for (let i = 0; i < 3; i++) { const r = await lire(s); t.push(r.ms); j = r.j; } t.sort((a, b) => a - b); return { ms: t[1], j, t }; };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await lire('doli');
    const doli = await mediane('doli');
    const liste = Array.isArray(doli.j) ? doli.j : (doli.j.data || []);
    ok('« doli » : des produits rendus', liste.length > 0, liste.length);
    /* reference SQL : ventes cloturees, non annulees, montant > 0, depuis le debut de la periode de la route */
    let ecarts = [];
    for (const x of liste.slice(0, 8)) {
      const ref = q("SELECT IFNULL(SUM(d.int_QUANTITY), 0) FROM t_preenregistrement_detail d JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
        + " WHERE d.lg_FAMILLE_ID = '" + x.produitId + "' AND v.b_IS_CANCEL = 0 AND v.str_STATUT = 'is_Closed' AND v.int_PRICE > 0"
        + " AND v.dt_UPDATED >= '" + DEBUT + "' AND v.dt_UPDATED < DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND MONTH(v.dt_UPDATED) <> MONTH(CURDATE())");
      const rendu = x.quantiteVendue === undefined || x.quantiteVendue === null ? 0 : Number(x.quantiteVendue);
      if (rendu !== Number(ref)) { ecarts.push(x.codeCip + ' ' + rendu + '/' + ref); }
    }
    ok('quantiteVendue (mois écoulés de la période) = calcul SQL', ecarts.length === 0, ecarts.join(' ; '));
    const un = await mediane(CIP);
    ok('CIP exact : moins de 300 ms à chaud (médiane de 3)', un.ms < 300, un.t.map(Math.round).join(', ') + ' ms');
    ok('« doli » : moins de 1 s à chaud (médiane de 3)', doli.ms < 1000, doli.t.map(Math.round).join(', ') + ' ms');
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
