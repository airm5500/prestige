/* INVENTAIRE : ETAT DE TOUS LES RAYONS EN UNE REQUETE (demandes serveur des applications mobiles, point 30).
 *
 * GET ws/inventaires/{id}/rayons/etat remplace les deux listes completes par rayon (detailsTouchedRayon,
 * detailsUntouchedRayon) que l'application Inventaire chargeait pour n'en garder que le nombre. Sur un inventaire du
 * banc, trois lignes sont saisies par la route de saisie de l'application (PUT ws/inventaires/details), puis remises
 * a l'identique. Ce que le test etablit :
 *  - memes rayons, dans le meme ordre, que ws/inventaires/rayons ;
 *  - pour chaque rayon : comptes = nombre de lignes de detailsTouchedRayon, restants = detailsUntouchedRayon ;
 *  - derniereSaisie et auteurs (avecAuteurs=1) sur le rayon des lignes saisies ;
 *  - (50) auteur de la saisie (auteurId, auteurLogin, auteurNom) dans les routes details* ;
 *  - inventaire inconnu : 410 INVENTAIRE_INCONNU ; sans session : 401 ;
 *  - reponse en moins de 300 ms.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

(async () => {
  const INV = q("SELECT i.lg_INVENTAIRE_ID FROM t_inventaire i JOIN t_inventaire_famille f ON f.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID"
    + " WHERE i.str_STATUT <> 'is_Closed' GROUP BY i.lg_INVENTAIRE_ID ORDER BY COUNT(*) DESC LIMIT 1");
  const lignes = q("SELECT CONCAT_WS('|', lg_INVENTAIRE_FAMILLE_ID, int_NUMBER, IFNULL(dt_UPDATED, 'NULL'), IFNULL(str_UPDATED_ID, 'NULL'))"
    + " FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + INV + "' AND bool_INVENTAIRE = 1 ORDER BY lg_INVENTAIRE_FAMILLE_ID LIMIT 3").split('\n').map((l) => l.split('|'));
  ok('Jeu d\'essai : un inventaire ouvert du banc, trois lignes à saisir', !!INV && lignes.length === 3, INV);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const lire = (url, m, corps) => p.evaluate(async ([url, m, corps]) => { const t0 = performance.now(); const r = await fetch(url, { method: m || 'GET', headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* texte */ } return { s: r.status, j, ms: performance.now() - t0 }; }, [url, m, corps]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    const sans = await lire('../api/v1/ws/inventaires/' + INV + '/rayons/etat');
    ok('Sans session : 401', sans.s === 401, sans.s);
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });

    for (const [id] of lignes) {
      const r = await lire('../api/v1/ws/inventaires/details', 'PUT', { id: Number(id), quantite: 4 });
      if (r.s !== 200) { throw new Error('saisie refusée ' + r.s + ' ' + JSON.stringify(r.j)); }
    }
    const rayonSaisi = q("SELECT f.lg_ZONE_GEO_ID FROM t_inventaire_famille i JOIN t_famille f ON f.lg_FAMILLE_ID = i.lg_FAMILLE_ID WHERE i.lg_INVENTAIRE_FAMILLE_ID = '" + lignes[0][0] + "'");

    await lire('../api/v1/ws/inventaires/' + INV + '/rayons/etat');
    const etat = await lire('../api/v1/ws/inventaires/' + INV + '/rayons/etat');
    if (!Array.isArray(etat.j)) { throw new Error('réponse ' + etat.s + ' ' + JSON.stringify(etat.j).slice(0, 200)); }
    const rayons = await lire('../api/v1/ws/inventaires/rayons?idInventaire=' + INV);
    const idsEtat = (etat.j || []).map((r) => r.rayonId), idsRayons = (rayons.j || []).map((r) => r.id || r.rayonId || r.lgZONEGEOID);
    ok('Mêmes rayons, même ordre que ws/inventaires/rayons', etat.s === 200 && JSON.stringify(idsEtat) === JSON.stringify(idsRayons), idsEtat.length + ' / ' + idsRayons.length + ' ' + JSON.stringify((rayons.j || [])[0]));
    ok('Réponse en moins de 300 ms', etat.ms < 300, Math.round(etat.ms) + ' ms');
    let ecarts = [];
    for (const r of etat.j || []) {
      const t = await lire('../api/v1/ws/inventaires/detailsTouchedRayon?idInventaire=' + INV + '&idRayon=' + r.rayonId);
      const u = await lire('../api/v1/ws/inventaires/detailsUntouchedRayon?idInventaire=' + INV + '&idRayon=' + r.rayonId);
      if (r.comptes !== t.j.length || r.restants !== u.j.length || r.totalProduits !== r.comptes + r.restants) {
        ecarts.push(r.libelle + ' ' + r.comptes + '/' + t.j.length + ' ' + r.restants + '/' + u.j.length);
      }
    }
    ok('Chaque rayon : comptes = detailsTouchedRayon, restants = detailsUntouchedRayon', (etat.j || []).length > 0 && ecarts.length === 0, ecarts.join(' ; '));
    const avec = await lire('../api/v1/ws/inventaires/' + INV + '/rayons/etat?avecAuteurs=1');
    const r1 = (avec.j || []).find((r) => r.rayonId === rayonSaisi) || {};
    ok('Rayon saisi : dernière saisie datée et auteur « admin »', r1.comptes >= 1 && /^\d{4}-\d\d-\d\dT/.test(r1.derniereSaisie || '') && (r1.auteurs || []).indexOf('admin') >= 0, JSON.stringify(r1));
    ok('Sans avecAuteurs : pas de champ auteurs', (etat.j || []).every((r) => !('auteurs' in r)));
    /* 50 : auteur de la saisie dans les routes details* */
    const ADM = q("SELECT CONCAT_WS('|', lg_USER_ID, str_LOGIN, CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME)) FROM t_user WHERE str_LOGIN = 'admin'").split('|');
    const routes = ['detailsTouchedRayon?idInventaire=' + INV + '&idRayon=' + rayonSaisi, 'details?idInventaire=' + INV + '&idRayon=' + rayonSaisi, 'detailsAll?idInventaire=' + INV,
      'detailsAllTouched?idInventaire=' + INV, 'detailsAllEcarts?idInventaire=' + INV];
    const manquants = [];
    for (const r of routes) {
      const l = await lire('../api/v1/ws/inventaires/' + r + (r.indexOf('All') >= 0 ? '&maxResult=5000' : ''));
      const ligne = (l.j || []).find((x) => String(x.id) === String(lignes[0][0]));
      if (!ligne || ligne.auteurId !== ADM[0] || ligne.auteurLogin !== ADM[1] || ligne.auteurNom !== ADM[2]) { manquants.push(r.split('?')[0] + ' ' + JSON.stringify(ligne || null).slice(0, 160)); }
    }
    ok('50 : auteurId, auteurLogin, auteurNom de la saisie dans les routes details*', manquants.length === 0, manquants.join(' ; '));
    const nonSaisie = await lire('../api/v1/ws/inventaires/detailsUntouchedRayon?idInventaire=' + INV + '&idRayon=' + rayonSaisi);
    ok('50 : ligne jamais saisie : auteur nul', (nonSaisie.j || []).length === 0 || (nonSaisie.j || []).every((x) => x.auteurLogin === null || x.auteurLogin === undefined || !x.dtUpdated), JSON.stringify((nonSaisie.j || [])[0] || {}).slice(0, 200));
    const inconnu = await lire('../api/v1/ws/inventaires/ZZZ-INCONNU/rayons/etat');
    ok('Inventaire inconnu : 410 INVENTAIRE_INCONNU', inconnu.s === 410 && inconnu.j && inconnu.j.code === 'INVENTAIRE_INCONNU', inconnu.s + ' ' + JSON.stringify(inconnu.j));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    lignes.forEach(([id, n, dt, u]) => exec("UPDATE t_inventaire_famille SET int_NUMBER = " + n + ", dt_UPDATED = " + (dt === 'NULL' ? 'NULL' : "'" + dt + "'")
      + ", str_UPDATED_ID = " + (u === 'NULL' ? 'NULL' : "'" + u + "'") + " WHERE lg_INVENTAIRE_FAMILLE_ID = '" + id + "'"));
    ok('Lignes saisies remises à l\'identique', lignes.every(([id, n, dt, u]) => q("SELECT CONCAT_WS('|', int_NUMBER, IFNULL(dt_UPDATED, 'NULL'), IFNULL(str_UPDATED_ID, 'NULL')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = '" + id + "'") === [n, dt, u].join('|')));
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
