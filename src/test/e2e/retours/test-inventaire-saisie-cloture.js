/* SAISIE D'INVENTAIRE PAR LES TERMINAUX (demandes serveur des applications mobiles, 8 et 27).
 * PUT ws/inventaires/details (terminaux Prestige Inventaire) et POST inventaire/ligne/quantite (poste) :
 *  - ligne inconnue : 404 « LIGNE_INCONNUE » lisible (avant : NullPointerException, erreur 500) ;
 *  - saisie normale : quantite enregistree, AUTEUR de la saisie renseigne (avant : vide sur ce chemin) ;
 *  - quantite absente ou negative : 400 « QUANTITE_INVALIDE » ;
 *  - inventaire CLOTURE : 409 « INVENTAIRE_CLOTURE », rien d'ecrit (avant : la quantite etait modifiee) ;
 *    sur ligne/quantite : 200 + success 0 + code (forme de cette route).
 * La ligne et l'inventaire utilises sont remis exactement a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const [LIGNE, INV] = q("SELECT CONCAT_WS('|', f.lg_INVENTAIRE_FAMILLE_ID, f.lg_INVENTAIRE_ID) FROM t_inventaire_famille f JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = f.lg_INVENTAIRE_ID"
  + " WHERE i.str_STATUT = 'enable' AND f.str_STATUT = 'enable' ORDER BY f.lg_INVENTAIRE_FAMILLE_ID LIMIT 1").split('|');
const AVANT_L = q(`SELECT CONCAT_WS('|', int_NUMBER, IFNULL(dt_UPDATED, 'NULL'), IFNULL(str_UPDATED_ID, 'NULL')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = ${LIGNE}`).split('|');
const AVANT_I = q(`SELECT CONCAT_WS('|', str_STATUT, IFNULL(dt_UPDATED, 'NULL')) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${INV}'`).split('|');
const sqlv = (v) => (v === 'NULL' ? 'NULL' : `'${v}'`);
const remettre = () => exec(`UPDATE t_inventaire_famille SET int_NUMBER = ${AVANT_L[0]}, dt_UPDATED = ${sqlv(AVANT_L[1])}, str_UPDATED_ID = ${sqlv(AVANT_L[2])} WHERE lg_INVENTAIRE_FAMILLE_ID = ${LIGNE};`
  + `UPDATE t_inventaire SET str_STATUT = '${AVANT_I[0]}', dt_UPDATED = ${sqlv(AVANT_I[1])} WHERE lg_INVENTAIRE_ID = '${INV}'`);
const ligne = () => q(`SELECT CONCAT_WS('|', int_NUMBER, IFNULL(str_UPDATED_ID, '')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = ${LIGNE}`);

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext()).newPage();
  const put = (corps) => p.evaluate(async (c) => { const r = await fetch('../api/v1/ws/inventaires/details', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* vide */ } return { http: r.status, j }; }, corps);
  const post = (corps) => p.evaluate(async (c) => { const r = await fetch('../api/v1/inventaire/ligne/quantite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    return Object.assign({ http: r.status }, await r.json()); }, corps);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const inconnue = await put({ id: 999999999, quantite: 1 });
    ok('Ligne inconnue : 404 LIGNE_INCONNUE lisible (plus d\'erreur 500)', inconnue.http === 404 && inconnue.j && inconnue.j.code === 'LIGNE_INCONNUE' && /n'existe plus/.test(inconnue.j.message), JSON.stringify(inconnue));
    const normale = await put({ id: Number(LIGNE), quantite: 7 });
    ok('Saisie normale : 200, quantité 7 enregistrée, auteur = l\'utilisateur connecté', normale.http === 200 && ligne() === '7|' + ADMIN, normale.http + ' ' + ligne());
    const negative = await put({ id: Number(LIGNE), quantite: -2 });
    const absente = await put({ id: Number(LIGNE) });
    ok('Quantité négative ou absente : 400 QUANTITE_INVALIDE, rien d\'écrit', negative.http === 400 && absente.http === 400 && negative.j.code === 'QUANTITE_INVALIDE' && ligne().startsWith('7|'),
      JSON.stringify([negative, absente]));
    exec(`UPDATE t_inventaire SET str_STATUT = 'is_Closed' WHERE lg_INVENTAIRE_ID = '${INV}'`);
    const close = await put({ id: Number(LIGNE), quantite: 12 });
    ok('Inventaire clôturé : 409 INVENTAIRE_CLOTURE, quantité inchangée (7)', close.http === 409 && close.j && close.j.code === 'INVENTAIRE_CLOTURE' && /clôturé/.test(close.j.message) && ligne().startsWith('7|'),
      JSON.stringify(close) + ' ' + ligne());
    const poste = await post({ lg_INVENTAIRE_FAMILLE_ID: LIGNE, int_NUMBER: 12 });
    ok('Poste (ligne/quantite) sur inventaire clôturé : 200, success 0, code INVENTAIRE_CLOTURE, rien d\'écrit', poste.http === 200 && poste.success === 0 && poste.code === 'INVENTAIRE_CLOTURE' && ligne().startsWith('7|'),
      JSON.stringify(poste));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Ligne et inventaire remis à l\'identique', q(`SELECT CONCAT_WS('|', int_NUMBER, IFNULL(dt_UPDATED, 'NULL'), IFNULL(str_UPDATED_ID, 'NULL')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = ${LIGNE}`) === AVANT_L.join('|')
      && q(`SELECT str_STATUT FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${INV}'`) === AVANT_I[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
