/* VENTE SANS CLIENT RATTACHEE A UN CLIENT (Ventes terminees, « facture » d'une VNO) : la vente reprend le nom, le
 * prenom et le TELEPHONE du client (et non son adresse, defaut releve le 12/10). Plus : selecteur de periode commun,
 * 3 periodes ajoutees (3 dernieres semaines, 3 derniers mois, annee N-1).
 * Un client d'essai est cree, la vente du banc est remise dans son etat a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = process.env.E2E_LOGIN || 'admin';
const VENTE = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND str_TYPE_VENTE = 'VNO' AND lg_CLIENT_ID IS NULL ORDER BY dt_CREATED DESC LIMIT 1");
const AVANT = q(`SELECT CONCAT_WS('|', IFNULL(lg_CLIENT_ID, '~'), IFNULL(str_FIRST_NAME_CUSTOMER, '~'), IFNULL(str_LAST_NAME_CUSTOMER, '~'), IFNULL(str_PHONE_CUSTOME, '~')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${VENTE}'`);
const CLIENT = 'E2E-CLIENT-TEL';
const sql = (v) => (v === '~' ? 'NULL' : "'" + v.replace(/'/g, "''") + "'");
function remettre() {
  const [c, pn, n, t] = AVANT.split('|');
  q(`UPDATE t_preenregistrement SET lg_CLIENT_ID = ${sql(c)}, str_FIRST_NAME_CUSTOMER = ${sql(pn)}, str_LAST_NAME_CUSTOMER = ${sql(n)}, str_PHONE_CUSTOME = ${sql(t)} WHERE lg_PREENREGISTREMENT_ID = '${VENTE}';
    DELETE FROM t_client WHERE lg_CLIENT_ID = '${CLIENT}';`);
}

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : une vente VNO sans client sur le banc', !!VENTE);
    q(`DELETE FROM t_client WHERE lg_CLIENT_ID = '${CLIENT}';
      INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_STATUT, dt_CREATED, dt_UPDATED)
      VALUES ('${CLIENT}', 'INOUSSA', 'E2E', '0700000099', 'RUE DES TESTS', 'enable', NOW(), NOW());`);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* meme appel que l'ecran Ventes terminees (buildLambdaClientGrid) */
    await p.evaluate(([v, c]) => new Promise((r) => Ext.Ajax.request({ url: '../api/v1/vente/update-vno-client/' + v + '/' + c, method: 'PUT', callback: r })), [VENTE, CLIENT]);
    const [cl, prenom, tel] = q(`SELECT lg_CLIENT_ID, str_FIRST_NAME_CUSTOMER, str_PHONE_CUSTOME FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${VENTE}'`).split('\t');
    ok('Vente rattachée au client, nom repris', cl === CLIENT && prenom === 'INOUSSA', cl + ' ' + prenom);
    ok('Téléphone de la vente = téléphone du client (pas son adresse)', tel === '0700000099', tel);

    const periodes = await p.evaluate(() => { const j = new Date(2026, 9, 12); const f = (d) => Ext.Date.format(d, 'Y-m-d');
      return testextjs.view.commun.RaccourcisPeriode.periodes().map((x) => { const r = x[1](j); return x[0] + '=' + f(r[0]) + '>' + f(r[1]); }); });
    const P = (n) => periodes.find((x) => x.startsWith(n + '=')) || '';
    ok('Période « 3 dernières semaines » : 22/09 → 12/10', P('3 dernières semaines') === '3 dernières semaines=2026-09-22>2026-10-12', P('3 dernières semaines'));
    ok('Période « 3 derniers mois » : 12/07 → 12/10', P('3 derniers mois') === '3 derniers mois=2026-07-12>2026-10-12', P('3 derniers mois'));
    ok('Période « Année N-1 » : 01/01/2025 → 31/12/2025', P('Année N-1') === 'Année N-1=2025-01-01>2025-12-31', P('Année N-1'));
    ok('Périodes existantes conservées (8)', ['Aujourd\'hui', 'Hier', '7 derniers jours', '30 derniers jours', 'Ce mois', 'Mois dernier', '12 derniers mois', 'Cette année'].every((n) => P(n)));
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    remettre();
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
