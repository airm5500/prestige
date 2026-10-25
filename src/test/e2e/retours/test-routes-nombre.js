/* ROUTES DE COMPTAGE LEGERES POUR L'ACCUEIL (demandes serveur des applications mobiles, point 29).
 *
 * Chaque route « nombre » rend le nombre que montre la liste du module, avec les memes filtres et la meme session,
 * sans charger les montants. Lecture seule, sur les donnees du banc :
 *  - etat-control-bon/nombre = total de etat-control-bon/list (dates, groupe, utilisateur, statut de controle) ;
 *  - avis-clients/nombre = total de avis-clients/liste (statut) ;
 *  - pointage-bl/nombre = total de pointage-bl (grossiste, etat) ; sans grossiste : somme sur les grossistes actifs ;
 *  - sans session : meme refus que la liste.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const lire = (url) => p.evaluate(async (url) => { const r = await fetch(url); return { s: r.status, j: await r.json().catch(() => null) }; }, url);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    const sansSession = await lire('../api/v1/etat-control-bon/nombre?dtStart=2026-01-01&dtEnd=2026-01-31');
    const listeSansSession = await lire('../api/v1/etat-control-bon/list?dtStart=2026-01-01&dtEnd=2026-01-31&limit=1');
    ok('Sans session : même réponse que la liste', sansSession.s === listeSansSession.s, sansSession.s + ' / ' + listeSansSession.s);
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });

    const U = q("SELECT b.lg_USER_ID FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '2026-01-01' AND b.dt_DATE_LIVRAISON < '2026-02-01' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1");
    for (const filtre of ['', '&groupeId=1', '&userId=' + U, '&statutControle=NON_CONTROLE', '&statutControle=CONTROLE&ecart=AVEC_ECART']) {
      const crit = '?dtStart=2026-01-01&dtEnd=2026-01-31&dateType=LIVRAISON' + filtre;
      const t0 = Date.now(); const n = await lire('../api/v1/etat-control-bon/nombre' + crit); const dn = Date.now() - t0;
      const l = await lire('../api/v1/etat-control-bon/list' + crit + '&start=0&limit=1');
      ok('Contrôle des BL' + (filtre || ' (sans filtre)') + ' : nombre = total de la liste', n.j && n.j.success === true && n.j.nombre === l.j.total, n.j && n.j.nombre + ' / ' + l.j.total + ' (' + dn + ' ms)');
    }

    for (const statut of ['', 'NOUVEAU']) {
      const crit = '?du=2025-10-15&au=2026-10-15' + (statut ? '&statut=' + statut : '');
      const n = await lire('../api/v1/avis-clients/nombre' + crit);
      const l = await lire('../api/v1/avis-clients/liste' + crit + '&limit=1');
      ok('Avis clients ' + (statut || 'tous') + ' : nombre = total de la liste', n.j && n.j.success === true && n.j.nombre === l.j.total, JSON.stringify(n.j) + ' / ' + (l.j && l.j.total));
    }

    const actifs = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE").split('\n');
    for (const etat of ['NON_POINTES', 'TOUS']) {
      const crit = '&du=2026-09-01&au=2026-09-30&etat=' + etat;
      const n = await lire('../api/v1/pointage-bl/nombre?grossiste=' + actifs[0] + crit);
      const l = await lire('../api/v1/pointage-bl?grossiste=' + actifs[0] + crit);
      ok('Pointage BL ' + etat + ' (un grossiste) : nombre = total de la liste', n.j && n.j.success === true && n.j.nombre === l.j.total, JSON.stringify(n.j) + ' / ' + (l.j && l.j.total));
    }
    let somme = 0;
    for (const g of actifs) { const l = await lire('../api/v1/pointage-bl?grossiste=' + g + '&du=2026-09-01&au=2026-09-30&etat=NON_POINTES'); somme += (l.j && l.j.total) || 0; }
    const tous = await lire('../api/v1/pointage-bl/nombre?du=2026-09-01&au=2026-09-30&etat=NON_POINTES');
    ok('Pointage BL sans grossiste : somme sur les grossistes actifs', tous.j && tous.j.success === true && tous.j.nombre === somme, JSON.stringify(tous.j) + ' / ' + somme);
    const inverse = await lire('../api/v1/pointage-bl/nombre?du=2026-09-30&au=2026-09-01');
    ok('Pointage BL : dates inversées, même refus que la liste', inverse.j && inverse.j.success === false && /après la date de fin/.test(inverse.j.msg || ''), JSON.stringify(inverse.j));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
