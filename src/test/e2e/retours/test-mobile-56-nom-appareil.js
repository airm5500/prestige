/* DEMANDE MOBILE 56 (transmission du 25/10, 2) : retrouver le nom de l'appareil apres une reinstallation.
 *
 * Par les routes de l'application (v1/appareil/nom), empreinte d'essai (64 caracteres hexadecimaux) :
 *  - lecture SANS session : empreinte invalide -> 400 ; inconnue -> {nom: null} ;
 *  - enregistrement sans session -> 401 ; connecte : nom nettoye comme X-Poste, enregistre, rendu ; nom vide -> 400 ;
 *  - « reinstallation » : nouveau navigateur sans session, lecture -> le nom enregistre ;
 *  - un second enregistrement remplace le nom ;
 *  - journal : la ligne porte le nom et 8 caracteres de l'empreinte, jamais l'empreinte entiere ;
 *  - debit : au-dela de 30 lectures par minute depuis la meme adresse -> 429.
 * Donnees d'essai (ligne de t_appareil_nom, lignes de journal) retirees a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const EMP = crypto.createHash('sha256').update('e2e-android-id:ci.prestige.vente').digest('hex');
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const nettoyer = () => q("DELETE FROM t_appareil_nom WHERE empreinte = '" + EMP + "'; DELETE FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND str_DESCRIPTION LIKE 'Nom d''appareil « E2E%'");

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  try {
    const api = (p, m, u, c) => p.evaluate(async ([m, u, c]) => {
      const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 100) }; } j.http = r.status; return j; }, [m, u, c]);
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const inv = await api(anonyme, 'GET', '../api/v1/appareil/nom?empreinte=abc123');
    ok('Lecture sans session, empreinte invalide : 400', inv.http === 400, JSON.stringify(inv));
    const inconnue = await api(anonyme, 'GET', '../api/v1/appareil/nom?empreinte=' + EMP);
    ok('Lecture sans session, empreinte inconnue : 200 {nom: null}', inconnue.http === 200 && inconnue.nom === null, JSON.stringify(inconnue));
    const sansSession = await api(anonyme, 'PUT', '../api/v1/appareil/nom', { empreinte: EMP, nom: 'E2E Caisse mobile 56' });
    ok('Enregistrement sans session : 401, rien d\'enregistré', sansSession.http === 401 && q("SELECT COUNT(*) FROM t_appareil_nom WHERE empreinte = '" + EMP + "'") === '0', JSON.stringify(sansSession));

    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(async () => fetch('../api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'admin', password: 'e2etest' }) }));
    const vide = await api(p, 'PUT', '../api/v1/appareil/nom', { empreinte: EMP, nom: ' !!! ' });
    ok('Connecté, nom vide (après nettoyage) : 400', vide.http === 400, JSON.stringify(vide));
    const enr = await api(p, 'PUT', '../api/v1/appareil/nom', { empreinte: EMP.toUpperCase(), nom: 'E2E Caisse mobile 56 <b>!' });
    const ligne = q("SELECT CONCAT_WS('|', nom, lg_USER_ID IS NOT NULL) FROM t_appareil_nom WHERE empreinte = '" + EMP + "'");
    ok('Connecté : nom nettoyé comme X-Poste, enregistré et rendu', enr.http === 200 && enr.nom === 'E2E Caisse mobile 56 b' && ligne === 'E2E Caisse mobile 56 b|1', JSON.stringify(enr) + ' / ' + ligne);

    const reinstalle = await (await b.newContext()).newPage();
    await reinstalle.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const relu = await api(reinstalle, 'GET', '../api/v1/appareil/nom?empreinte=' + EMP);
    ok('« Réinstallation » (sans session) : le nom est retrouvé', relu.http === 200 && relu.nom === 'E2E Caisse mobile 56 b', JSON.stringify(relu));
    const rempl = await api(p, 'PUT', '../api/v1/appareil/nom', { empreinte: EMP, nom: 'E2E Caisse comptoir 2' });
    const relu2 = await api(reinstalle, 'GET', '../api/v1/appareil/nom?empreinte=' + EMP);
    ok('Second enregistrement : le nom est remplacé', rempl.http === 200 && relu2.nom === 'E2E Caisse comptoir 2' && q("SELECT COUNT(*) FROM t_appareil_nom WHERE empreinte = '" + EMP + "'") === '1', JSON.stringify(relu2));

    const journal = q("SELECT GROUP_CONCAT(CONCAT_WS('|', str_DESCRIPTION, str_TABLE_CONCERN) SEPARATOR ' ## ') FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND str_DESCRIPTION LIKE 'Nom d''appareil « E2E%'");
    const entiere = q("SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND (str_DESCRIPTION LIKE '%" + EMP + "%' OR IFNULL(str_TABLE_CONCERN, '') LIKE '%" + EMP + "%' OR IFNULL(str_DETAIL, '') LIKE '%" + EMP + "%')");
    ok('Journal : nom et 8 caractères de l\'empreinte, jamais l\'empreinte entière', /E2E Caisse mobile 56 b/.test(journal) && journal.indexOf(EMP.slice(0, 8)) >= 0 && entiere === '0', journal.slice(0, 200) + ' / entière : ' + entiere);

    /* debit : 30 lectures par minute et par adresse (lectures deja faites comprises) */
    const codes = await reinstalle.evaluate(async (e) => { const o = []; for (let i = 0; i < 32; i++) { o.push((await fetch('../api/v1/appareil/nom?empreinte=' + e)).status); } return o; }, EMP);
    ok('Débit : au-delà de 30 lectures par minute, 429', codes.indexOf(429) > 0 && codes.slice(0, codes.indexOf(429)).every((c) => c === 200), codes.join(','));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT COUNT(*) FROM t_appareil_nom WHERE empreinte = '" + EMP + "'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
