/* UNITES VENDUES : COLONNES « Nbre.VNO » ET « Nbre.VO » (demande du 16/10).
 *
 * La requete calculait le total de l'article puis le rangeait en VNO ou en VO selon le type d'UNE vente prise au hasard
 * parmi les siennes : les deux colonnes changeaient d'un appel a l'autre. Ce que le test etablit (lecture seule) :
 *  - deux appels de suite donnent les memes colonnes ;
 *  - pour chaque article : Nbre.VNO = quantite des ventes au comptant (type 1), Nbre.VO = quantite des ventes VO,
 *    calculees en SQL avec les memes filtres (periode, emplacement, cloturees, non annulees, montant > 0, hors depot) ;
 *  - Nbre.VNO + Nbre.VO = quantite vendue.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const D = '2026-09-01', F = '2026-09-30';
const U = '../api/v1/datareporting/unitesvendues?dtStart=' + D + '&dtEnd=' + F + '&codeFamile=&query=&codeRayon=&codeGrossiste=&start=0&limit=100000';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const lire = () => p.evaluate(async (u) => (await (await fetch(u)).json()).data, U);
    const a = await lire(), b2 = await lire();
    const cols = (l) => JSON.stringify(l.map((x) => [x.id, x.montantCumulTTC, x.montantCumulHT]).sort());
    ok('Deux appels de suite : mêmes colonnes VNO / VO', a.length > 0 && cols(a) === cols(b2), a.length + ' articles');
    const attendu = {};
    q("SELECT d.lg_FAMILLE_ID, SUM(CASE WHEN p.lg_TYPE_VENTE_ID = '1' THEN d.int_QUANTITY ELSE 0 END), SUM(CASE WHEN p.str_TYPE_VENTE = 'VO' THEN d.int_QUANTITY ELSE 0 END)"
      + " FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
      + " WHERE p.dt_UPDATED >= '" + D + "' AND p.dt_UPDATED < DATE_ADD('" + F + "', INTERVAL 1 DAY) AND u.lg_EMPLACEMENT_ID = '1' AND p.str_STATUT = 'is_Closed'"
      + " AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID NOT LIKE '5' GROUP BY d.lg_FAMILLE_ID")
      .split('\n').filter(Boolean).forEach((l) => { const [id, vno, vo] = l.split('\t'); attendu[id] = [Number(vno), Number(vo)]; });
    const faux = a.filter((x) => !attendu[x.id] || attendu[x.id][0] !== x.montantCumulTTC || attendu[x.id][1] !== x.montantCumulHT);
    ok('Chaque article : Nbre.VNO et Nbre.VO = quantités vendues au comptant et en VO (SQL)', faux.length === 0,
      faux.length + ' écarts sur ' + a.length + ' ; ' + faux.slice(0, 3).map((x) => x.code + ' ' + x.montantCumulTTC + '/' + x.montantCumulHT + ' ≠ ' + (attendu[x.id] || []).join('/')).join(' | '));
    const somme = a.filter((x) => x.montantCumulTTC + x.montantCumulHT !== x.montantCumulAchat);
    ok('Nbre.VNO + Nbre.VO = quantité vendue', somme.length === 0, somme.length + ' écarts');
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
