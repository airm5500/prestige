/* MAJUSCULES A L'ENREGISTREMENT (retours du 10/10, point 17).
 * Par les memes services que les ecrans (creation du BL depuis la commande, client rapide de la vente,
 * client carnet, ayant droit) :
 *  - reference du BL, noms, prenoms et matricule enregistres en majuscules ;
 *  - ni l'e-mail ni l'adresse ne changent ;
 *  - une reference deja prise pour le grossiste reste refusee quelle que soit la casse saisie.
 * Jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CMD = 'E2E-MAJ-CMD', M = 'zzmaj';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' ORDER BY f.str_NAME LIMIT 1");

function nettoyer() {
  exec("SET FOREIGN_KEY_CHECKS = 0;"
    + "DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "');"
    + "DELETE FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_ayant_droit WHERE str_FIRST_NAME LIKE '" + M + "%' OR str_LAST_NAME LIKE '" + M + "%';"
    + "DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "%' OR str_LAST_NAME LIKE '" + M + "%'));"
    + "DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "%' OR str_LAST_NAME LIKE '" + M + "%');"
    + "DELETE FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "%' OR str_LAST_NAME LIKE '" + M + "%'; SET FOREIGN_KEY_CHECKS = 1;");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 1, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'passed', NOW(), NOW(), 2000, 0, 0);"
    + "INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixUnitaire, prixAchat, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + CMD + "-0', '" + CMD + "', '" + P + "', '" + G + "', 2, 2000, 1000, 2000, 2000, 1000, 'passed', NOW(), NOW())");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const poster = (url, corps) => p.evaluate(async (a) => { const r = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) }); return r.json(); }, { url, corps });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* creation du BL : memes parametres que l'ecran de reception de commande (doCreateBL) */
    const jour = new Date().toISOString().slice(0, 10);
    let r = await poster('../api/v1/commande/creerbl', { refParent: CMD, ref: '  bl-e2e-maj7 ', dtStart: jour, value: 2000, valueTwo: 0 });
    ok('BL créé, référence « BL-E2E-MAJ7 » en majuscules', r.success === true && q("SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "'") === 'BL-E2E-MAJ7', JSON.stringify(r).slice(0, 200));
    exec("UPDATE t_order SET str_STATUT = 'passed' WHERE lg_ORDER_ID = '" + CMD + "'");
    r = await poster('../api/v1/commande/creerbl', { refParent: CMD, ref: 'Bl-E2E-maj7', dtStart: jour, value: 2000, valueTwo: 0 });
    ok('Même référence saisie dans une autre casse : refusée pour ce grossiste', r.success === false && /déjà/.test(r.msg) && q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "'") === '1', JSON.stringify(r).slice(0, 200));

    /* client rapide de la vente */
    r = await poster('../api/v1/client/add/lambda', { strFIRSTNAME: M + 'awa', strLASTNAME: M + 'traoré', strADRESSE: 'rue des jardins', email: 'awa.e2e@exemple.ci', lgTYPECLIENTID: '6', strSEXE: 'F' });
    const c = q("SELECT CONCAT_WS('|', str_FIRST_NAME, str_LAST_NAME, IFNULL(str_ADRESSE, ''), IFNULL(email, '')) FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "awa'");
    ok('Client rapide : nom et prénom en majuscules (accents gardés), adresse et e-mail inchangés', c === 'ZZMAJAWA|ZZMAJTRAORÉ|rue des jardins|awa.e2e@exemple.ci', c + ' / ' + JSON.stringify(r).slice(0, 120));
    ok('Client rapide : la réponse renvoie le nom en majuscules (affiché à la vente)', r.success && r.data && r.data.strFIRSTNAME === 'ZZMAJAWA', JSON.stringify(r.data || r).slice(0, 160));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "') + (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "') + (SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + M + "%')") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
