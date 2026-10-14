/* EXPERIENCE UTILISATEUR (RUM) et POINT DE VEILLE (retour du 14/10), par l'ecran.
 *  - en ouvrant des ecrans, le navigateur mesure l'ouverture de chaque ecran et chaque appel au serveur, puis envoie
 *    ses lots : t_rum recoit ECRAN (cle = ecran) et API (methode + chemin SANS parametres ni identifiants) ;
 *  - Stabilite du serveur > Experience utilisateur : courbe, poste, ecrans et appels les plus lents ;
 *  - SUPPORT_RUM_ACTIF = 0 : le navigateur cesse d'envoyer ;
 *  - cout : 20 mesures = une ecriture groupee, une seule connexion empruntee (au plus 11 allers-retours), par 5 minutes ;
 *  - v1/support/veille : ferme si le jeton est vide en base, refuse sans jeton ou avec un mauvais jeton, repond avec
 *    le bon jeton (memoire, pool, base) et sans aucune donnee de vente ou de client ;
 *  - jeton cree par l'ecran (Reglages conseilles) : confirmation dans le bouton, affiche une fois, l'ancien refuse,
 *    absent du journal du serveur ;
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
  /* les mesures sont rangees par tranche de 5 minutes : depart = debut de la tranche d'il y a une minute */
  const debut = q("SELECT DATE_FORMAT(NOW() - INTERVAL 1 MINUTE - INTERVAL (MINUTE(NOW() - INTERVAL 1 MINUTE) % 5) MINUTE, '%Y-%m-%d %H:%i:00')");
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

    /* cout d'un envoi (retour du 14/10 « pas de cout sur l'exploitation ? ») : 20 mesures = une ecriture groupee,
       pas une ecriture par mesure ; regroupement par 5 minutes (5 fois moins de lignes) */
    exec("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'SUPPORT_RUM_ACTIF'");
    const journalAvant = q('SELECT @@general_log'), sortieAvant = q('SELECT @@log_output');
    exec("SET GLOBAL log_output = 'TABLE'; TRUNCATE mysql.general_log; SET GLOBAL general_log = 1");
    const lots20 = [];
    const t5 = Math.floor((Date.now() - 600000) / 300000) * 300000;
    for (let i = 0; i < 20; i++) lots20.push({ minute: t5 + (i % 5) * 60000, type: 'ECRAN', cle: 'e2e-cout-' + (i % 4), nombre: 1, totalMs: 100 + i, maxMs: 100 + i, echecs: 0 });
    const envoi = await p.evaluate(async (l) => (await fetch('../api/v1/support/rum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lots: l }) })).json(), lots20);
    await p.waitForTimeout(300);
    const allers = Number(q("SELECT COUNT(*) FROM mysql.general_log WHERE command_type IN ('Query', 'Execute') AND argument NOT LIKE '%general_log%'"));
    exec(`SET GLOBAL general_log = ${journalAvant}; SET GLOBAL log_output = '${sortieAvant}'; TRUNCATE mysql.general_log`);
    ok('Envoi de 20 mesures : 20 retenues, une seule connexion empruntée (au plus 11 allers-retours, 116 avant)', envoi.retenus === 20 && allers <= 11, allers + ' allers-retours');
    const lignes = q("SELECT COUNT(*), COALESCE(SUM(nombre), 0), COUNT(DISTINCT minute) FROM t_rum WHERE utilisateur = 'admin' AND cle LIKE 'e2e-cout-%'").split('\t');
    ok('Regroupement par 5 minutes : 4 lignes pour 20 mesures (4 écrans), rien de perdu', lignes[0] === '4' && lignes[1] === '20' && lignes[2] === '1', lignes.join(' '));

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

    /* jeton cree par l'ecran (Stabilite du serveur > Reglages conseilles), confirmation dans le bouton */
    const clic = async (sel) => { const id = await p.evaluate((sel) => Ext.ComponentQuery.query(sel)[0].getEl().id, sel); await p.click('#' + id); };
    await p.click('.supportserveur .x-tab:has-text("Réglages conseillés")');
    await p.waitForFunction(() => /renseigné/.test(Ext.ComponentQuery.query('supportserveur #etatJetonVeille')[0].getEl().dom.textContent), null, { timeout: 30000 });
    ok('Réglages : jeton de veille indiqué « renseigné » sans afficher sa valeur', await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #etatJetonVeille')[0].getEl().dom.textContent) === 'renseigné'
      && (await p.content()).indexOf(JETON) < 0);
    await clic('supportserveur #jetonVeille');
    const texte = await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #jetonVeille')[0].getText());
    ok('Nouveau jeton : confirmation dans le bouton (l\'ancien cessera de fonctionner)', /Confirmer : l'ancien jeton cessera de fonctionner/.test(texte), texte);
    ok('Rien n\'est changé avant la confirmation', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_VEILLE_JETON'") === JETON);
    await clic('supportserveur #jetonVeille');
    await p.waitForSelector('#srvJetonVeille', { timeout: 15000 });
    const nouveau = (await p.textContent('#srvJetonVeille')).trim();
    ok('Jeton affiché une fois, aléatoire (43 caractères), avec la marche à suivre', /^[A-Za-z0-9_-]{43}$/.test(nouveau) && /Prestige Veille > Réglages > « Jeton de veille »/.test(await p.evaluate(() => document.getElementById('srvJetonVeille').parentNode.textContent)), nouveau.length);
    const nv = await appel(nouveau), ancien = await appel(JETON);
    ok('Le nouveau jeton ouvre la veille, l\'ancien est refusé', nv.status === 200 && ancien.status === 403, nv.status + ' ' + ancien.status);
    const log = execFileSync('sh', ['-c', 'tail -c 2000000 /opt/payara5/glassfish/domains/domain1/logs/server.log'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    ok('Jeton absent du journal du serveur (seul l\'auteur est noté)', log.indexOf(nouveau) < 0 && /Jeton de Prestige Veille renouvele par admin/.test(log));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    exec(`UPDATE t_parameters SET str_VALUE = '${rumAvant}' WHERE str_KEY = 'SUPPORT_RUM_ACTIF'; UPDATE t_parameters SET str_VALUE = '${jetonAvant}' WHERE str_KEY = 'SUPPORT_VEILLE_JETON';`
      + `DELETE FROM t_rum WHERE utilisateur = 'admin' AND (minute >= '${debut}' OR cle LIKE 'e2e-cout-%')`);
    ok('Paramètres et mesures du test remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_VEILLE_JETON'") === jetonAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
