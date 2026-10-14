/* EXPERIENCE UTILISATEUR (RUM) et POINT DE VEILLE (retour du 14/10), par l'ecran.
 *  - en ouvrant des ecrans, le navigateur mesure l'ouverture de chaque ecran et chaque appel au serveur, puis envoie
 *    ses lots : t_rum recoit ECRAN (cle = ecran) et API (methode + chemin SANS parametres ni identifiants) ;
 *  - Stabilite du serveur > Experience utilisateur : courbe, poste, ecrans et appels les plus lents ;
 *  - SUPPORT_RUM_ACTIF = 0 : le navigateur cesse d'envoyer ;
 *  - v1/support/veille : ferme si le jeton est vide en base, refuse sans jeton ou avec un mauvais jeton, repond avec
 *    le bon jeton (memoire, pool, base) et sans aucune donnee de vente ou de client ;
 *  - aucune fenetre, aucune erreur JavaScript ; parametres et mesures du test remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const JETON = 'E2E-VEILLE-' + Date.now();

(async () => {
  const debut = q("SELECT DATE_FORMAT(NOW() - INTERVAL 1 MINUTE, '%Y-%m-%d %H:%i:00')");
  const rumAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_RUM_ACTIF'");
  const jetonAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_VEILLE_JETON'");
  exec("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'SUPPORT_RUM_ACTIF'; UPDATE t_parameters SET str_VALUE = '' WHERE str_KEY = 'SUPPORT_VEILLE_JETON'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const dialogues = [], err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && window.PrestigeRum, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    for (const x of ['campagnes', 'supportmaintenance', 'supportserveur']) {
      await p.evaluate((x) => testextjs.app.getController('App').onRedirectTo(x, {}), x);
      await p.waitForTimeout(4000);
    }
    /* un appel avec parametres et identifiant, pour verifier qu'ils ne sont pas gardes */
    await p.evaluate(async () => { await fetch('../api/v1/campagnes/fetes?annee=2026'); await fetch('../api/v1/client/E2E-RUM-123456/consentement'); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => window.PrestigeRum.envoyer(false));
    await p.waitForTimeout(2500);
    const ecrans = q(`SELECT GROUP_CONCAT(DISTINCT cle ORDER BY cle) FROM t_rum WHERE utilisateur = 'admin' AND type = 'ECRAN' AND minute >= '${debut}'`);
    ok('Ouverture des écrans mesurée (campagnes, maintenance, stabilité)', ['campagnes', 'supportmaintenance', 'supportserveur'].every((x) => ecrans.split(',').indexOf(x) >= 0), ecrans);
    const apis = q(`SELECT GROUP_CONCAT(DISTINCT cle ORDER BY cle SEPARATOR ' ; ') FROM t_rum WHERE utilisateur = 'admin' AND type = 'API' AND minute >= '${debut}'`);
    ok('Appels mesurés, chemin normalisé (GET v1/campagnes/fetes, GET v1/client/{id}/consentement)', apis.indexOf('GET v1/campagnes/fetes') >= 0 && apis.indexOf('GET v1/client/{id}/consentement') >= 0, apis.slice(0, 300));
    ok('Aucun paramètre ni identifiant gardé', q(`SELECT COUNT(*) FROM t_rum WHERE minute >= '${debut}' AND (cle LIKE '%?%' OR cle LIKE '%annee%' OR cle LIKE '%E2E-RUM%' OR cle LIKE '%123456%')`) === '0');
    ok('Poste = celui de ce serveur Payara', /\/(serveur|caisse)$/.test(q(`SELECT DISTINCT poste FROM t_rum WHERE utilisateur = 'admin' AND minute >= '${debut}' LIMIT 1`)));

    /* onglet Experience utilisateur */
    await p.click('.supportserveur .x-tab:has-text("Expérience utilisateur")');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #ecransRum')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    const ex = await p.evaluate(() => { const o = Ext.ComponentQuery.query('supportserveur #ongletExperience')[0];
      return { serie: o.serie.getCount(), postes: o.down('#postesRum').getStore().getCount(), ecrans: o.down('#ecransRum').getStore().collect('cle'), apis: o.down('#apisRum').getStore().getCount(),
        choixPostes: o.down('#posteRum').getStore().getCount() }; });
    ok('Onglet Expérience utilisateur : courbe, par poste, écrans et appels les plus lents', ex.serie > 0 && ex.postes >= 1 && ex.ecrans.indexOf('campagnes') >= 0 && ex.apis > 0 && ex.choixPostes >= 2, JSON.stringify(ex));

    /* arret de l'envoi */
    exec("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'SUPPORT_RUM_ACTIF'");
    await p.evaluate(async () => { await fetch('../api/v1/campagnes/contexte'); });
    await p.evaluate(() => window.PrestigeRum.envoyer(false));
    await p.waitForTimeout(2000);
    ok('SUPPORT_RUM_ACTIF = 0 : le navigateur cesse d\'envoyer', await p.evaluate(() => window.PrestigeRum.etat().actif) === false);

    /* point de veille */
    const appel = (jeton) => p.evaluate(async (j) => { const h = j === null ? {} : { 'X-Veille-Jeton': j }; const r = await fetch('../api/v1/support/veille', { headers: h, credentials: 'omit' });
      return { status: r.status, corps: await r.text() }; }, jeton);
    let v = await appel('nimporte');
    ok('Veille : fermée quand le jeton est vide en base', v.status === 403, v.status);
    exec(`UPDATE t_parameters SET str_VALUE = '${JETON}' WHERE str_KEY = 'SUPPORT_VEILLE_JETON'`);
    const sans = await appel(null), faux = await appel(JETON + 'x');
    ok('Veille : refusée sans jeton ou avec un mauvais jeton', sans.status === 403 && faux.status === 403, sans.status + ' ' + faux.status);
    v = await appel(JETON);
    const o = JSON.parse(v.corps);
    ok('Veille : bon jeton, sans session -> mémoire, pool, base, expérience utilisateur', v.status === 200 && o.memoireMaxMo > 0 && o.poolMs >= 0 && o.bddConnexions > 0 && Array.isArray(o.rum), v.corps.slice(0, 200));
    ok('Veille : aucune donnée de vente ou de client', !/client|vente|montant|patient/i.test(Object.keys(o).join(' ')), Object.keys(o).join(','));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    exec(`UPDATE t_parameters SET str_VALUE = '${rumAvant}' WHERE str_KEY = 'SUPPORT_RUM_ACTIF'; UPDATE t_parameters SET str_VALUE = '${jetonAvant}' WHERE str_KEY = 'SUPPORT_VEILLE_JETON';`
      + `DELETE FROM t_rum WHERE utilisateur = 'admin' AND minute >= '${debut}'`);
    ok('Paramètres et mesures du test remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_VEILLE_JETON'") === jetonAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
