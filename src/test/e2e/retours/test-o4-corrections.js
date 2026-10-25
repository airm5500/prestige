/* O4 (Prestige Mobile) : APPRENTISSAGES DES ORDONNANCES PARTAGES ENTRE TERMINAUX (demandes serveur, point 40).
 *
 * Par les routes de l'application (session habituelle) :
 *  - capacite ordonnanceCorrections annoncee par v1/app-vente/capacites ;
 *  - POST ordonnances/corrections : une correction enregistree (enregistres:1), le meme lot renvoye -> dejaConnus:1 ;
 *    segment « Jean Dupont 06 12 34 56 78 » (et sa forme en minuscules) rejete, produit inconnu rejete ; 501 lignes
 *    -> 400 ;
 *  - GET ordonnances/corrections?depuis= : la correction est relue, horloge du serveur rendue ;
 *  - sans session : 401.
 * Les corrections du test (cle e2e-o4-*) sont retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const nettoyer = () => exec("DELETE FROM mobile_ordonnance_correction WHERE cle LIKE 'e2e-o4-%'");
const [PID, CIP, NOM] = q("SELECT CONCAT_WS('|', lg_FAMILLE_ID, int_CIP, str_NAME) FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 1").split('|');

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [m, u, c]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const sans = await api('POST', '../api/v1/app-vente/ordonnances/corrections', { corrections: [] });
    ok('Sans session : 401', sans.http === 401, sans.http);
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    const cap = await api('GET', '../api/v1/app-vente/capacites');
    ok('Capacité ordonnanceCorrections annoncée', cap.ordonnanceCorrections === true && cap.ordonnanceCorrectionsVersion === 1, JSON.stringify(cap));
    const avant = q("SELECT DATE_FORMAT(NOW() - INTERVAL 2 SECOND, '%Y-%m-%d %H:%i:%s')");
    const lot = { corrections: [{ cle: 'e2e-o4-1', segment: 'amoxicilline 1000 mg', produitId: PID, cip: CIP, nom: NOM, at: avant }] };
    const e1 = await api('POST', '../api/v1/app-vente/ordonnances/corrections', lot);
    ok('Correction enregistrée (enregistres:1)', e1.http === 200 && e1.enregistres === 1 && e1.dejaConnus === 0, JSON.stringify(e1));
    const e2 = await api('POST', '../api/v1/app-vente/ordonnances/corrections', lot);
    ok('Même lot renvoyé : dejaConnus:1, rien de plus', e2.enregistres === 0 && e2.dejaConnus === 1 && q("SELECT COUNT(*) FROM mobile_ordonnance_correction WHERE cle LIKE 'e2e-o4-%'") === '1', JSON.stringify(e2));
    const rej = await api('POST', '../api/v1/app-vente/ordonnances/corrections', { corrections: [
      { cle: 'e2e-o4-2', segment: 'Jean Dupont 06 12 34 56 78', produitId: PID },
      { cle: 'e2e-o4-3', segment: 'jean dupont 06 12 34 56 78', produitId: PID },
      { cle: 'e2e-o4-4', segment: 'doliprane 500 mg', produitId: 'ZZZ-INCONNU' }] });
    ok('Nom et téléphone (majuscules ou non) et produit inconnu : rejetés, rien d\'écrit', rej.enregistres === 0 && (rej.rejetes || []).length === 3
      && q("SELECT COUNT(*) FROM mobile_ordonnance_correction WHERE cle LIKE 'e2e-o4-%'") === '1', JSON.stringify(rej.rejetes));
    const trop = await api('POST', '../api/v1/app-vente/ordonnances/corrections', { corrections: Array.from({ length: 501 }, (x, i) => ({ cle: 'e2e-o4-t' + i, segment: 'abc', produitId: PID })) });
    ok('501 corrections : 400', trop.http === 400, trop.http);
    const lu = await api('GET', '../api/v1/app-vente/ordonnances/corrections?depuis=' + encodeURIComponent(avant));
    const c = (lu.data || []).find((x) => x.cle === 'e2e-o4-1') || {};
    ok('Lecture différentielle : correction relue, horloge du serveur', lu.http === 200 && c.segment === 'amoxicilline 1000 mg' && c.produitId === PID && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(lu.serveurMaintenant || ''), JSON.stringify(c));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Corrections du test retirées', q("SELECT COUNT(*) FROM mobile_ordonnance_correction WHERE cle LIKE 'e2e-o4-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
