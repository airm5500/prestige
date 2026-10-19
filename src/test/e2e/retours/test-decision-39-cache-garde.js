/* DECISION 39 DU PHARMACIEN (15/10, confirmee le 19/10) : GARDER QUELQUES MINUTES LE CALCUL D'UNE GARDE.
 *
 * GET v1/gardes/{id}/rapport recalculait toute l'analyse (tranches, classement ABC, indicateurs) a CHAQUE page
 * demandee par l'application (start / limit). Ce que le test etablit, sur une garde d'essai de deux semaines :
 *  - les pages suivantes sont servies depuis le calcul garde (moins de 300 ms chacune) ;
 *  - meme contenu : la page start=100 est exactement la tranche 100-199 de la liste complete ;
 *  - dates de la garde changees par l'ecran (POST v1/gardes) : le calcul est refait (pas de resultat perime).
 * La garde d'essai est retiree.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-GARDE-D39';
const retirer = () => q(`DELETE FROM garde WHERE id = '${ID}'`);

(async () => {
  retirer();
  q(`INSERT INTO garde (id, libelle, date_debut, date_fin, created_at, updated_at) VALUES ('${ID}', 'E2E décision 39', '2026-09-01 08:00:00', '2026-09-15 08:00:00', NOW(), NOW())`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const page = (s, l) => p.evaluate(async ([id, s, l]) => { const t = performance.now(); const x = await (await fetch('../api/v1/gardes/' + id + '/rapport?start=' + s + '&limit=' + l)).json();
    return { ms: Math.round(performance.now() - t), abc: (x.abc || []).map((a) => JSON.stringify(a)), total: x.totalAbc, kpi: JSON.stringify(x.kpi) }; }, [ID, s, l]);
  try {
    await connexion(p, 'admin', 'e2etest');
    const tout = await page(0, 200);
    const p2 = await page(100, 100), p3 = await page(200, 100);
    ok('Pages suivantes servies depuis le calcul gardé (< 300 ms chacune)', p2.ms < 300 && p3.ms < 300, 'tout ' + tout.ms + ' ms, page 2 ' + p2.ms + ' ms, page 3 ' + p3.ms + ' ms');
    ok('Même contenu : la page start=100 = lignes 100 à 199 de la liste complète', tout.total > 200 && JSON.stringify(p2.abc) === JSON.stringify(tout.abc.slice(100, 200)) && p2.kpi === tout.kpi,
      tout.total + ' produits');
    /* dates changees par la route de l'ecran */
    const maj = await p.evaluate(async (id) => (await fetch('../api/v1/gardes', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'id=' + id + '&libelle=E2E%20d%C3%A9cision%2039&dateDebut=2026-09-01T08%3A00%3A00&dateFin=2026-09-03T08%3A00%3A00' })).json(), ID);
    const apres = await page(0, 50);
    ok('Dates changées : le calcul est refait (autre nombre de produits)', maj.success !== false && apres.total > 0 && apres.total < tout.total, JSON.stringify(maj).slice(0, 120) + ' ; ' + apres.total + ' / ' + tout.total);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Garde d\'essai retirée', q(`SELECT COUNT(*) FROM garde WHERE id = '${ID}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
