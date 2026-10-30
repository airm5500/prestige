/* REGLAGES DU SERVEUR APPLIQUES DEPUIS PRESTIGE (Centre de support > Stabilité du serveur > Réglages conseillés).
 *  - super administrateur : boutons « Appliquer à chaud » et « Écrire dans my.ini » ; le compte de l'application a le
 *    droit SUPER (rien de signale) ;
 *  - confirmation dans le bouton lui-meme : 1er clic -> « Confirmer : ... », sans aucune fenetre ; sans 2e clic, le
 *    bouton se desarme apres 6 s et rien n'est change ;
 *  - a chaud : les reglages a ajuster prennent leur valeur conseillee (SET GLOBAL), le tampon InnoDB reste tel quel
 *    tant que « avec le tampon InnoDB » n'est pas coche, innodb_flush_log_at_trx_commit passe a 1 ; compte rendu avant
 *    -> apres a l'ecran ; journal des evenements : qui et chaque reglage avant puis apres ;
 *  - my.ini (dossier des donnees de MariaDB) : copie de sauvegarde identique a l'original, cles conseillees ecrites,
 *    reste du fichier inchange, innodb_flush_log_at_trx_commit=1 ; MariaDB n'est pas redemarre (meme Uptime) ;
 *  - un compte qui a l'ecran mais n'est pas super administrateur est refuse par le serveur ;
 *  - tout est remis : variables, my.ini, copies de sauvegarde, lignes de journal, droit d'essai.
 *
 * A LANCER SUR UNE INSTANCE MARIADB JETABLE, jamais sur celle d'un domaine en service : le test change ses reglages
 * globaux et son my.ini. Refuse l'instance du port 3306 sauf E2E_REGLAGES_INSTANCE=3306.
 *   E2E_URL          adresse de Prestige (defaut http://localhost:8080/prestige) ;
 *   DB_TEST, E2E_BASE_LIBRE=1, MARIADB_OPTIONS : base et client MariaDB de cette instance (voir outils/poste.js).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const privilegeEssai = require('./privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = (process.env.E2E_URL || 'http://localhost:8080/prestige').replace(/\/$/, '');
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CLES = ['innodb_buffer_pool_size', 'innodb_log_buffer_size', 'max_allowed_packet', 'tmp_table_size', 'max_heap_table_size',
  'max_connections', 'thread_cache_size', 'table_open_cache', 'innodb_io_capacity_max', 'innodb_io_capacity',
  'innodb_flush_log_at_trx_commit', 'slow_query_log', 'long_query_time', 'innodb_print_all_deadlocks'];
const variables = () => {
  const m = {};
  q("SELECT CONCAT(LOWER(VARIABLE_NAME), '=', VARIABLE_VALUE) FROM information_schema.GLOBAL_VARIABLES WHERE LOWER(VARIABLE_NAME) IN ('"
    + CLES.join("','") + "')").split('\n').filter(Boolean).forEach((l) => { const i = l.indexOf('='); m[l.slice(0, i)] = l.slice(i + 1); });
  return m;
};
/* valeurs SET GLOBAL : ON/OFF en 1/0 */
const sqlValeur = (v) => (v === 'ON' ? '1' : v === 'OFF' ? '0' : v);

function appel(methode, chemin, cookie, corps) {
  return new Promise((ok_, ko) => {
    const u = new (require('url').URL)(URL + '/' + chemin);
    const donnees = corps === undefined ? '' : JSON.stringify(corps);
    const r = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: methode,
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(donnees) }, cookie ? { Cookie: cookie } : {}) },
    (rep) => { let t = ''; rep.setEncoding('utf8'); rep.on('data', (c) => { t += c; }); rep.on('end', () => ok_({ statut: rep.statusCode, corps: t,
      cookie: (rep.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ') })); });
    r.on('error', ko); r.end(donnees);
  });
}

(async () => {
  const port = q('SELECT @@port');
  if (port === '3306' && process.env.E2E_REGLAGES_INSTANCE !== '3306') {
    console.log('FAIL  instance MariaDB du port 3306 refusée : ce test change ses réglages globaux et son my.ini (voir l\'en-tête)');
    process.exit(1);
  }
  const datadir = q('SELECT @@datadir').replace(/\\/g, '/').replace(/\/+$/, '');
  const MY_INI = datadir + '/my.ini';
  const debut = q('SELECT NOW()');
  const varsAvant = variables();
  const iniAvant = fs.readFileSync(MY_INI);
  const copieTest = path.join(ENV_E2E.TMP, 'my.ini.e2e-' + Date.now());
  fs.writeFileSync(copieTest, iniAvant);
  const sauvegardesAvant = new Set(fs.readdirSync(datadir).filter((f) => /^my\.ini\.avant-prestige-/.test(f)));
  const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_SUPPORT_SERVEUR');
  droit.reprendre();
  /* reglages volontairement mal places, a corriger par l'ecran (instance jetable) */
  exec('SET GLOBAL slow_query_log = 0; SET GLOBAL long_query_time = 10; SET GLOBAL thread_cache_size = 10;'
    + ' SET GLOBAL innodb_print_all_deadlocks = 0; SET GLOBAL innodb_flush_log_at_trx_commit = 2;');
  const uptimeAvant = Number(q("SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'UPTIME'"));
  const tamponAvant = varsAvant.innodb_buffer_pool_size;

  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('supportserveur', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur')[0], null, { timeout: 30000 });
    /* onglet Réglages conseillés, par son titre */
    await p.click('text=Réglages conseillés');
    const pret = () => p.waitForFunction(() => { const c = Ext.ComponentQuery.query('supportserveur #ongletReglages')[0];
      return c && !c.el.down('.x-mask-msg', true) && Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().getCount() > 0; }, null, { timeout: 60000 });
    await pret();
    await p.waitForTimeout(800);
    const bouton = (id) => p.evaluate((i) => { const x = Ext.ComponentQuery.query('supportserveur #' + i)[0];
      return { visible: x.isVisible(), actif: !x.isDisabled(), texte: x.getText ? x.getText() : '', id: x.getEl() && x.getEl().id }; }, id);
    const texte = (id) => p.evaluate((i) => Ext.ComponentQuery.query('supportserveur #' + i)[0].getEl().dom.textContent, id);

    const chaud = await bouton('appliquerMariadb'), ini = await bouton('ecrireMyIni');
    ok('Super administrateur : « Appliquer à chaud » visible et actif', chaud.visible && chaud.actif, JSON.stringify(chaud) + ' ' + await texte('droitsMariadb'));
    ok('Droit SUPER du compte de l\'application : rien de signalé', !/manquant/i.test(await texte('droitsMariadb')), await texte('droitsMariadb'));
    ok('« Écrire dans my.ini » visible et actif', ini.visible && ini.actif, JSON.stringify(ini) + ' ' + await texte('etatMyIni'));
    const caseTampon = await p.evaluate(() => { const c = Ext.ComponentQuery.query('supportserveur #avecTampon')[0]; return { visible: c.isVisible(), coche: c.getValue() }; });
    ok('Case « avec le tampon InnoDB » décochée par défaut', !caseTampon.coche, JSON.stringify(caseTampon));

    /* desarmement : un seul clic, puis rien pendant 7 s */
    await p.click('#' + chaud.id);
    const arme = await bouton('appliquerMariadb');
    ok('1er clic : confirmation dans le bouton lui-même', /^Confirmer : \d+ réglage/.test(arme.texte), arme.texte);
    await p.waitForTimeout(7000);
    ok('Sans 2e clic : bouton désarmé après 6 s, rien de changé', (await bouton('appliquerMariadb')).texte === 'Appliquer à chaud'
      && variables().slow_query_log === 'OFF', (await bouton('appliquerMariadb')).texte);

    /* application a chaud : deux clics */
    await p.click('#' + chaud.id); await p.waitForTimeout(400); await p.click('#' + chaud.id);
    await p.waitForFunction(() => /MariaDB, à chaud/.test(Ext.ComponentQuery.query('supportserveur #etatReglages')[0].getEl().dom.textContent), null, { timeout: 60000 });
    const cr = await texte('etatReglages'), v = variables();
    ok('Compte rendu avant -> après à l\'écran', /Journal des requêtes lentes : désactivé → activé appliqué/.test(cr), cr.slice(0, 300));
    ok('SET GLOBAL : requêtes lentes ON, seuil 2 s, 64 fils, interblocages tracés', v.slow_query_log === 'ON' && Number(v.long_query_time) === 2
      && v.thread_cache_size === '64' && v.innodb_print_all_deadlocks === 'ON', JSON.stringify(v));
    ok('innodb_flush_log_at_trx_commit remis à 1', v.innodb_flush_log_at_trx_commit === '1', v.innodb_flush_log_at_trx_commit);
    ok('Tampon InnoDB non touché (case décochée)', v.innodb_buffer_pool_size === tamponAvant, tamponAvant + ' -> ' + v.innodb_buffer_pool_size);
    const journal = q("SELECT CONCAT(str_CREATEDBY, ' | ', REPLACE(str_DETAIL, '\\n', ' ; ')) FROM t_event_log WHERE str_TABLECONCERN = 'mariadb'"
      + " AND dt_CREATED >= '" + debut + "' ORDER BY dt_CREATED DESC LIMIT 1");
    ok('Journal : qui, et chaque réglage avant puis après', journal.startsWith(ENV_E2E.LOGIN_SUPPORT + ' |') && /slow_query_log : désactivé -> activé/.test(journal)
      && /innodb_flush_log_at_trx_commit : 2 -> 1/.test(journal), journal.slice(0, 300));

    /* my.ini */
    await pret();
    const ini2 = await bouton('ecrireMyIni');
    await p.click('#' + ini2.id);
    ok('my.ini : 1er clic, confirmation dans le bouton', /^Confirmer : \d+ ligne\(s\) dans my\.ini/.test((await bouton('ecrireMyIni')).texte), (await bouton('ecrireMyIni')).texte);
    await p.waitForTimeout(400); await p.click('#' + ini2.id);
    await p.waitForFunction(() => /my\.ini \(/.test(Ext.ComponentQuery.query('supportserveur #etatReglages')[0].getEl().dom.textContent)
      || /srv-critique/.test(Ext.ComponentQuery.query('supportserveur #etatReglages')[0].getEl().dom.innerHTML), null, { timeout: 60000 });
    const cr2 = await texte('etatReglages');
    ok('my.ini : compte rendu, copie de sauvegarde, « prochain redémarrage »', /Copie de sauvegarde/.test(cr2) && /prochain redémarrage/.test(cr2), cr2.slice(0, 300));
    const nouvelles = fs.readdirSync(datadir).filter((f) => /^my\.ini\.avant-prestige-/.test(f) && !sauvegardesAvant.has(f));
    ok('Copie de sauvegarde identique à l\'original', nouvelles.length === 1 && fs.readFileSync(path.join(datadir, nouvelles[0])).equals(iniAvant), nouvelles.join(','));
    const apres = fs.readFileSync(MY_INI, 'latin1');
    ok('my.ini : innodb_flush_log_at_trx_commit=1, requêtes lentes, 64 fils', /^innodb_flush_log_at_trx_commit=1\r?$/m.test(apres)
      && /^slow_query_log=1\r?$/m.test(apres) && /^thread_cache_size=64\r?$/m.test(apres), apres.slice(-400));
    const autres = (t) => t.split(/\r?\n/).filter((l) => !CLES.some((c) => l.replace(/-/g, '_').startsWith(c)) && !/^# Reglages conseilles par Prestige/.test(l) && l.trim());
    ok('my.ini : toutes les autres lignes inchangées', JSON.stringify(autres(apres)) === JSON.stringify(autres(iniAvant.toString('latin1'))));
    ok('MariaDB non redémarré', Number(q("SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'UPTIME'")) >= uptimeAvant);
    ok('Journal : my.ini avant / après et sauvegarde', /Sauvegarde : /.test(q("SELECT str_DETAIL FROM t_event_log WHERE str_TABLECONCERN = 'my.ini' AND dt_CREATED >= '"
      + debut + "' ORDER BY dt_CREATED DESC LIMIT 1")));
    await pret();
    ok('Après écriture : « my.ini à jour », bouton grisé', /my\.ini à jour/.test(await texte('etatMyIni')) && !(await bouton('ecrireMyIni')).actif, await texte('etatMyIni'));

    ok('Aucune fenêtre surgissante', dialogues.length === 0 && !(await p.evaluate(() => Ext.ComponentQuery.query('window[hidden=false]').some((w) => !/tip/i.test(w.xtype)))), dialogues.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));

    /* compte qui a l'ecran sans etre super administrateur : refuse par le serveur */
    droit.accorder();
    const c = (await appel('POST', 'api/v1/user/auth', null, { login: ENV_E2E.LOGIN, password: 'e2etest' })).cookie;
    const lecture = JSON.parse((await appel('GET', 'api/v1/support/serveur/reglages', c)).corps);
    const refus = JSON.parse((await appel('POST', 'api/v1/support/serveur/reglages/mariadb', c, {})).corps);
    const refusIni = JSON.parse((await appel('POST', 'api/v1/support/serveur/reglages/myini', c, {})).corps);
    ok('Non super administrateur : lecture permise, application et my.ini refusées', lecture.success && lecture.superAdmin === false
      && !refus.success && /super administrateur/i.test(refus.message) && !refusIni.success, refus.message + ' / ' + refusIni.message);
  } catch (e) {
    ok('Déroulement sans exception', false, e.stack);
  } finally {
    await b.close();
    droit.reprendre();
    /* remise en etat : variables, my.ini, copies de sauvegarde, journal */
    const remise = [];
    for (const k of CLES) {
      if (varsAvant[k] !== undefined && variables()[k] !== varsAvant[k]) {
        try { exec('SET GLOBAL ' + k + ' = ' + sqlValeur(varsAvant[k])); } catch (e) { remise.push(k + ' : ' + e.message); }
      }
    }
    fs.writeFileSync(MY_INI, fs.readFileSync(copieTest));
    fs.unlinkSync(copieTest);
    fs.readdirSync(datadir).filter((f) => /^my\.ini\.(avant-prestige-|prestige-tmp)/.test(f) && !sauvegardesAvant.has(f)).forEach((f) => fs.unlinkSync(path.join(datadir, f)));
    exec("DELETE FROM t_event_log WHERE str_TABLECONCERN IN ('mariadb', 'my.ini') AND dt_CREATED >= '" + debut + "'");
    const v = variables();
    ok('Remise en état : variables, my.ini, sauvegardes, journal', remise.length === 0 && CLES.every((k) => v[k] === varsAvant[k])
      && fs.readFileSync(MY_INI).equals(iniAvant), remise.join(' | ') + JSON.stringify(CLES.filter((k) => v[k] !== varsAvant[k])));
    const n = res.filter((x) => x.c).length;
    console.log(`\n${n}/${res.length} PASS`);
    process.exit(n === res.length ? 0 : 1);
  }
})();
