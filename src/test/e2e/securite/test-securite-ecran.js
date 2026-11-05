/* ONGLET « SECURITE » DU CENTRE DE SUPPORT (cas 4, lot 4.B), parametre KEY_SECURITE_BASE. Windows et serveur Payara
 * du poste seulement (asadmin). Par le vrai chemin de l'ecran (Centre de support > Stabilite du serveur > Securite),
 * sur un compte MariaDB d'application CREE PAR LE TEST, jamais sur le compte applicatif reel : le pool de Payara est
 * bascule sur ce compte le temps du test, puis remis tel qu'il etait.
 *  - a 0 : pas d'onglet « Securite », l'API repond {actif: false} ;
 *  - a 1 : onglet present, etat (pool en clair, copies de domain.xml en clair, aucune rotation) ;
 *  - rotation refusee sans le bon mot de passe de session (journal « Refusé », rien ne change) ;
 *  - rotation « Générer » : nouveau mot de passe de 24 caracteres dans domain.xml, l'ancien ne se connecte plus, champs
 *    vides, journal OK, date de derniere rotation posee ;
 *  - rotation « Saisir » : saisie faible refusee, saisie forte acceptee ;
 *  - echec simule (compte verrouille par le test avant la rotation : le pool ne se reconnecte pas) : retour arriere,
 *    MariaDB et Payara reviennent a l'ancien mot de passe ;
 *  - alias Payara pose sur le pool (domain.xml ne porte plus le mot de passe), puis rotation en mode alias ;
 *  - purge des copies de domain.xml dans un dossier de test ;
 *  - aucun mot de passe (anciens, nouveaux, compte de rotation) dans server.log ni dans les reponses ; aucune fenetre.
 * Reglages : BASE, DB_TEST + E2E_BASE_LIBRE=1, PAYARA_DOMAINE (domain.xml, server.log, port d'administration).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { connexion: connexionVue, ouvrirMenu, cliquer } = require('../outils/vues');
/* la premiere connexion apres un deploiement, ou pendant le rattachement de l'application au pool recree, peut depasser le delai : trois essais */
const connexion = async (p, login, mdp) => { let e = null; for (let i = 0; i < 3; i++) { try { await connexionVue(p, login, mdp); return; } catch (x) { e = x; } } throw e; };
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
if (!ENV_E2E.WINDOWS) { console.log('Test Windows seulement (asadmin du poste) : rien a faire ici.'); process.exit(0); }
const BASE = ENV_E2E.BASE;
const BASE_HTTP = require('../outils/vues').BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_SM_SUPPORT_SERVEUR');
const TMP = path.join(os.tmpdir(), 'e2e-securite-ecran');
const COPIES = path.join(TMP, 'copies');
const DOMAINE = ENV_E2E.PAYARA_DOMAINE;
const XML = DOMAINE + '/config/domain.xml';
const LOG = ENV_E2E.JOURNAL_SERVEUR;
const APP = 'prestige_app_e2e', ADMIN = 'prestige_rot_e2e', ALIAS = 'prestige-db';
const CLES = ['KEY_SECURITE_BASE', 'KEY_SECURITE_DERNIERE_ROTATION', 'KEY_SECURITE_DOSSIER_COPIES', 'KEY_SECURITE_FICHIER_IDENTIFIANTS', 'KEY_SAUVEGARDE_ACTIVE'];
/* mots de passe d'essai (comptes crees par le test) : jamais affiches, cherches dans le journal du serveur */
const P0 = 'E2eDepart-2026#app', PA = 'E2eRotation-2026#adm', P2 = 'E2eSaisi-2026#deux', P3 = 'E2eAlias-2026#trois', P4 = 'E2eEchec-2026#quatre';
const sanitize = (s) => String(s || '').replace(/\s+/g, ' ');
const journalDepuis = (depuis) => { const n = fs.statSync(LOG).size - depuis; if (n <= 0) { return ''; } const fd = fs.openSync(LOG, 'r'); const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, depuis); fs.closeSync(fd); return b.toString('utf8'); };
const parametre = (cle, valeur) => exec(valeur === null ? "DELETE FROM t_parameters WHERE str_KEY = '" + cle + "'"
  : "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + cle + "', '" + valeur.replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'essai e2e', 'SYSTEME', 'enable', NOW()) ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE)");

/* pool de Prestige dans domain.xml : noms de proprietes et valeurs lus pour les comparer, jamais affiches */
function pool() {
  const xml = fs.readFileSync(XML, 'utf8');
  const bloc = (xml.match(/<jdbc-connection-pool[^>]*name="laborex_pool"[^>]*>[\s\S]*?<\/jdbc-connection-pool>/) || [''])[0];
  const prop = (n) => { const m = bloc.match(new RegExp('<property name="' + n + '" value="([^"]*)"', 'i')); return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : null; };
  const admin = (xml.match(/<network-listener[^>]*name="admin-listener"[^>]*>/) || [''])[0].match(/port="(\d+)"/);
  return { user: prop('user'), password: prop('password'), serverName: prop('serverName'), portNumber: prop('portNumber'), databaseName: prop('databaseName'), portAdmin: admin ? admin[1] : '4848' };
}
const pool0 = pool();
if (!pool0.user || pool0.password === null) { console.log('Pool laborex_pool illisible dans ' + XML + ' : rien a faire ici.'); process.exit(0); }
if (/^\$\{ALIAS=/.test(pool0.password)) { console.log('Le pool de ce domaine porte deja un alias : le test ne sait pas le remettre ; rien a faire ici.'); process.exit(0); }
/* asadmin par le client Java (pas de cmd.exe : la valeur d'origine du mot de passe est remise telle quelle) */
const ASADMIN_JAR = path.resolve(DOMAINE, '..', '..', 'modules', 'admin-cli.jar');
const JAVA = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java.exe') : 'java';
const asadmin = (...args) => execFileSync(JAVA, ['-jar', ASADMIN_JAR, '--interactive=false', '--port', pool0.portAdmin, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const setPool = (prop, valeur) => asadmin('set', 'resources.jdbc-connection-pool.laborex_pool.property.' + prop + '=' + valeur);
/* apres un set : ping par asadmin (Payara ouvre une connexion neuve avec la configuration du moment) */
const flush = () => { asadmin('ping-connection-pool', 'laborex_pool'); };
/* processus qui ecoute le port d'administration : change au redemarrage du domaine */
const pidPayara = () => { const l = execFileSync('netstat', ['-ano'], { encoding: 'utf8' }).split(/\r?\n/).find((x) => new RegExp(':' + pool0.portAdmin + '\\s.*LISTENING').test(x)); return l ? l.trim().split(/\s+/).pop() : ''; };
const sommeil = (ms) => new Promise((r) => setTimeout(r, ms));
const repond = async () => { try { const r = await fetch(BASE_HTTP + '/security/index.html'); return r.status === 200; } catch (e) { return false; } };
/* attend le redemarrage du domaine (nouveau processus, puis Prestige qui repond, puis un temps de chauffe) ; false si rien n'a redemarre */
async function attendreRedemarrage(pidAvant, delaiArret) {
  let fin = Date.now() + (delaiArret || 120000);
  while (Date.now() < fin && pidPayara() === pidAvant) { await sommeil(2000); }
  if (pidPayara() === pidAvant) { return false; }
  fin = Date.now() + 600000;
  while (Date.now() < fin && !(pidPayara() && await repond())) { await sommeil(5000); }
  await sommeil(20000);
  return true;
}
/* redemarrage du domaine par le test lui-meme (bascule du pool sur le compte d'essai, puis remise), comme le fait le service */
async function redemarrerDomaine() {
  const pid = pidPayara();
  const nom = path.basename(DOMAINE), dossier = path.dirname(DOMAINE);
  try { execFileSync('cmd', ['/c', path.resolve(DOMAINE, '..', '..', '..', 'bin', 'asadmin.bat'), '--interactive=false', 'restart-domain', '--domaindir', dossier, nom], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 }); } catch (e) { console.log('  restart-domain : ' + String(e.stderr || e.message).trim().slice(0, 200)); }
  return attendreRedemarrage(pid, 60000);
}
/* domain.xml est reecrit par Payara un peu apres chaque « set » */
const attendrePool = async (p, test) => { const fin = Date.now() + 20000; while (Date.now() < fin) { if (test(pool())) { return true; } await p.waitForTimeout(500); } return test(pool()); };
/* connexion directe d'un compte d'essai avec un mot de passe donne (fichier d'options du test, jamais la ligne de commande) */
function connecte(user, mdp) {
  const f = path.join(TMP, 'essai-' + user + '.cnf');
  fs.writeFileSync(f, '[client]\nuser="' + user + '"\npassword="' + mdp + '"\nhost=' + (pool0.serverName || '127.0.0.1') + '\nport=' + (pool0.portNumber || 3306) + '\n');
  try { return execFileSync('mariadb', ['--defaults-extra-file=' + f, '-sN', '-e', 'SELECT CURRENT_USER()'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().startsWith(user + '@'); } catch (e) { return false; } finally { fs.rmSync(f, { force: true }); }
}
const fauxDomainXml = (mdp) => '<domain><resources><jdbc-connection-pool name="laborex_pool" datasource-classname="x">\n<property name="user" value="ancien"/>\n<property name="password" value="' + mdp + '"/>\n</jdbc-connection-pool><jdbc-resource jndi-name="jdbc/__laborex_pool" pool-name="laborex_pool"/></resources></domain>\n';

(async () => {
  droit.remettre();
  const idJournal = Number(q("SELECT COALESCE(MAX(id), 0) FROM t_securite_journal"));
  const reglagesAvant = q("SELECT GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(COPIES, { recursive: true });
  for (let i = 1; i <= 3; i++) { fs.writeFileSync(path.join(COPIES, 'domain.xml.avant-prestige-2026110' + i + '-120000'), fauxDomainXml('FauxAncien' + i + '#2026')); }
  fs.writeFileSync(path.join(COPIES, 'autre-fichier.txt'), 'ne doit pas etre supprime');
  /* comptes d'essai : application (cible de la rotation) et rotation (CREATE USER seulement) */
  exec("DROP USER IF EXISTS '" + APP + "'@'localhost'; DROP USER IF EXISTS '" + ADMIN + "'@'localhost';"
    + " CREATE USER '" + APP + "'@'localhost' IDENTIFIED BY '" + P0 + "'; GRANT ALL PRIVILEGES ON `" + BASE + "`.* TO '" + APP + "'@'localhost'; GRANT ALL PRIVILEGES ON `prestige_valo_tmp`.* TO '" + APP + "'@'localhost';"
    + " CREATE USER '" + ADMIN + "'@'localhost' IDENTIFIED BY '" + PA + "'; GRANT CREATE USER ON *.* TO '" + ADMIN + "'@'localhost'; GRANT SELECT ON mysql.user TO '" + ADMIN + "'@'localhost';");
  parametre('KEY_SECURITE_BASE', '0'); parametre('KEY_SECURITE_DOSSIER_COPIES', COPIES); parametre('KEY_SAUVEGARDE_ACTIVE', '0');
  parametre('KEY_SECURITE_FICHIER_IDENTIFIANTS', path.join(TMP, 'absent.cnf')); parametre('KEY_SECURITE_DERNIERE_ROTATION', '');
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [], reponses = [];
  const contexte = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  contexte.on('page', (pg) => { pg.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); }); pg.on('pageerror', (e) => err.push(String(e.message))); });
  contexte.on('response', async (r) => { if (/api\/v1\/support\/serveur\/securite/.test(r.url())) { try { reponses.push(await r.text()); } catch (e) { /* */ } } });
  const S = (sel) => 'supportserveur #ongletSecurite ' + sel;
  const inputId = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].inputId, S(sel));
  const remplir = async (p, sel, v) => { await p.fill('#' + await inputId(p, sel), v); };
  const valeur = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getValue(), S(sel));
  const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c && c.getEl() ? c.getEl().dom.textContent : ''; }, S(sel));
  const attendreTexte = async (p, sel, motif, delai) => { const fin = Date.now() + (delai || 120000); let t = ''; while (Date.now() < fin) { t = await texte(p, sel); if (motif.test(t)) { return t; } await p.waitForTimeout(500); } return t; };
  const boutonTexte = (p, sel) => p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getText(), S(sel));
  /* confirmation dans le bouton : premier clic arme, second clic execute */
  const confirmer = async (p, sel) => { await cliquer(p, S(sel)); const t = await boutonTexte(p, sel); await p.waitForTimeout(300); await cliquer(p, S(sel)); return t; };
  const etatApi = (p) => p.evaluate(() => fetch('../api/v1/support/serveur/securite/etat').then((r) => r.json()));
  const journal = () => q("SELECT CONCAT(str_ACTION, ' ', str_RESULTAT, ' ', COALESCE(str_DETAIL, '')) FROM t_securite_journal WHERE id > " + idJournal + " ORDER BY id");
  const ouvrir = async (p) => { await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Stabilité du serveur');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').length > 0, null, { timeout: 30000 }); await p.waitForTimeout(2500); };
  const rotation = async (p, { session, compte, mdp, mode, nouveau, confirmation }) => {
    const pid = pidPayara();
    await remplir(p, '#secMdpSession', session);
    if (!await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isVisible(), S('#secFormulaire'))) { await cliquer(p, S('#btnSecRotation')); await p.waitForTimeout(300); }
    await remplir(p, '#secCompteRotation', compte); await remplir(p, '#secMdpRotation', mdp);
    await cliquer(p, S(mode === 'SAISIR' ? '#secModeSaisir' : '#secModeGenerer')); await p.waitForTimeout(200);
    if (mode === 'SAISIR') { await remplir(p, '#secNouveau', nouveau); await p.keyboard.press('Tab'); await remplir(p, '#secConfirmation', confirmation); await p.keyboard.press('Tab'); }
    const force = mode === 'SAISIR' ? await texte(p, '#secForce') : '';
    const arme = await confirmer(p, '#btnSecLancer');
    const message = await attendreTexte(p, '#secRotationMessage', /./, 240000);
    await p.waitForFunction((s) => !/en cours/.test(Ext.ComponentQuery.query(s)[0].getEl().dom.textContent), S('#secRotationMessage'), { timeout: 240000 });
    await p.waitForTimeout(1500);
    return { pid, arme, force, message: await texte(p, '#secRotationMessage'), etapes: await texte(p, '#secEtapes'), alerte: await texte(p, '#secAlerte'), champs: [await valeur(p, '#secMdpRotation'), await valeur(p, '#secNouveau'), await valeur(p, '#secConfirmation')].join('') };
  };
  let depuis = fs.statSync(LOG).size;
  let generes = [];
  let p = null;
  /* nouvelle page connectee, ecran ouvert sur l'onglet Securite */
  const reouvrir = async (avecOnglet) => {
    if (p) { await p.close().catch(() => {}); }
    p = await contexte.newPage();
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrir(p);
    if (avecOnglet) {
      await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #ongletSecurite').length > 0, null, { timeout: 30000 }).catch(() => {});
      await p.click('.supportserveur .x-tab:has-text("Sécurité")');
      await attendreTexte(p, '#secStockage', /Pool Payara/);
    }
  };
  /* apres une rotation ou un alias reussis, le service redemarre Payara : on attend, puis on se reconnecte */
  const apresRedemarrage = async (r, pid) => { const ok = await attendreRedemarrage(pid); await reouvrir(true); return ok; };
  try {
    /* 0. le pool de Payara passe sur le compte d'application du test : Payara doit redemarrer pour le prendre */
    setPool('user', APP); setPool('password', P0); flush();
    const redemarre0 = await redemarrerDomaine();
    await reouvrir(false);
    const api0 = await etatApi(p);
    ok('À 0 : pas d\'onglet « Sécurité » (le pool tourne sur le compte d\'essai après redémarrage), l\'API répond actif = false', redemarre0 && api0.success && api0.actif === false
      && await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #ongletSecurite').length === 0) && !(await p.locator('.supportserveur .x-tab:has-text("Sécurité")').count()), JSON.stringify(api0));

    /* 1. a 1 : onglet et etat */
    parametre('KEY_SECURITE_BASE', '1');
    await reouvrir(true);
    const stockage = await attendreTexte(p, '#secStockage', /Pool Payara/);
    const alerte = await texte(p, '#secAlerte');
    ok('À 1 : onglet « Sécurité » présent ; état : pool EN CLAIR sur le compte d\'essai, 3 copies de domain.xml en clair, rotation jamais faite', /EN CLAIR/.test(stockage) && stockage.indexOf(APP) >= 0
      && /3 FICHIER\(S\), 3 EN CLAIR/.test(stockage) && /JAMAIS/.test(await texte(p, '#secRotationEtat')) && /4 endroit/.test(alerte) && /jamais/.test(alerte), sanitize(alerte + ' | ' + stockage));
    ok('Boutons : purge « 3 copie(s) », alias actif, aucun mot de passe affiché', /3 copie/.test(await boutonTexte(p, '#btnSecPurger'))
      && !(await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isDisabled(), S('#btnSecAlias'))) && stockage.indexOf(P0) < 0);

    /* 2. refus : mauvais mot de passe de session */
    let r = await rotation(p, { session: 'faux-mot-de-passe', compte: ADMIN, mdp: PA, mode: 'GENERER' });
    ok('Rotation refusée sans le bon mot de passe de session : message, journal « Refusé », l\'ancien mot de passe se connecte toujours, champs vidés', /Confirmer/.test(r.arme) && /incorrect/.test(r.message)
      && /ROTATION REFUSE/.test(journal()) && connecte(APP, P0) && pool().password === P0 && r.champs === '', sanitize(r.arme + ' | ' + r.message + ' | ' + journal()));

    /* 3. rotation « Generer » */
    r = await rotation(p, { session: 'e2etest', compte: ADMIN, mdp: PA, mode: 'GENERER' });
    const pool1 = pool();
    if (pool1.password && pool1.password !== P0) { generes.push(pool1.password); }
    ok('Rotation « Générer » : changé et vérifié ; domain.xml porte un mot de passe de 24 caractères de l\'alphabet admis ; l\'ancien ne se connecte plus, le nouveau si ; l\'écran annonce le redémarrage', /changé et vérifié/.test(r.message) && pool1.user === APP
      && pool1.password !== P0 && /^[A-Za-z0-9#*+\-./:;=@\[\]_~]{24}$/.test(pool1.password) && !connecte(APP, P0) && connecte(APP, pool1.password) && /redémarre/.test(r.message) && /redémarre/.test(r.alerte), sanitize(r.message + ' | ' + r.etapes));
    const redemarre1 = await apresRedemarrage(r, r.pid);
    ok('… Payara a redémarré de lui-même (nouveau processus), Prestige répond et l\'onglet se rouvre', redemarre1 && /Pool Payara/.test(await texte(p, '#secStockage')));
    ok('… journal : ROTATION OK « mot de passe généré », date de dernière rotation posée, champs vidés, état rafraîchi', /ROTATION OK mot de passe généré/.test(journal()) && r.champs === ''
      && /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SECURITE_DERNIERE_ROTATION'"))
      && !/JAMAIS/.test(await attendreTexte(p, '#secRotationEtat', /par e2e|prochaine recommandée/)), sanitize(journal()));

    /* 4. rotation « Saisir » : faible refusee, forte acceptee */
    r = await rotation(p, { session: 'e2etest', compte: ADMIN, mdp: PA, mode: 'SAISIR', nouveau: 'court1#', confirmation: 'court1#' });
    ok('Rotation « Saisir » trop courte : contrôle de force à l\'écran, refus du serveur (12 caractères), rien ne change', /TROP COURT/.test(r.force) && /12 caractères/.test(r.message) && pool().password === pool1.password && connecte(APP, pool1.password), sanitize(r.force + ' | ' + r.message));
    r = await rotation(p, { session: 'e2etest', compte: ADMIN, mdp: PA, mode: 'SAISIR', nouveau: P2, confirmation: P2 });
    ok('Rotation « Saisir » forte : changé et vérifié ; domain.xml porte la valeur saisie, l\'ancienne ne se connecte plus', /FORT/.test(r.force) && /changé et vérifié/.test(r.message) && pool().password === P2 && connecte(APP, P2) && !connecte(APP, pool1.password)
      && /ROTATION OK mot de passe saisi/.test(journal()) && r.champs === '', sanitize(r.force + ' | ' + r.message));
    ok('… Payara a redémarré, Prestige répond', await apresRedemarrage(r, r.pid));

    /* 5. echec simule : compte verrouille avant la rotation (les connexions ouvertes du pool survivent, les nouvelles non) */
    exec("ALTER USER '" + APP + "'@'localhost' ACCOUNT LOCK");
    const depuisEchec = fs.statSync(LOG).size;
    r = await rotation(p, { session: 'e2etest', compte: ADMIN, mdp: PA, mode: 'SAISIR', nouveau: P4, confirmation: P4 });
    exec("ALTER USER '" + APP + "'@'localhost' ACCOUNT UNLOCK");
    flush();
    const jEchec = journalDepuis(depuisEchec);
    ok('Échec simulé : connexion par le pool en échec, retour arrière (Payara rétabli, ancien mot de passe remis), MariaDB et domain.xml à l\'ancienne valeur, ligne RETOUR_ARRIERE dans server.log',
      /revenu à l'ancien/.test(r.message) && /Payara rétabli/.test(r.etapes) && /ancien mot de passe remis/.test(r.etapes) && pool().password === P2 && connecte(APP, P2) && !connecte(APP, P4)
      && /ROTATION par .* : RETOUR_ARRIERE/.test(jEchec), sanitize(r.message + ' | ' + r.etapes));
    await p.waitForTimeout(2000);
    const apiApres = await etatApi(p);
    ok('… après déverrouillage, l\'écran et l\'API répondent sans redémarrage (pool revenu aux valeurs du démarrage)', apiApres.success && apiApres.pool && apiApres.pool.forme === 'CLAIR' && pidPayara() === r.pid && !/redémarre/.test(r.message), JSON.stringify(apiApres).slice(0, 300));

    /* 6. alias Payara */
    await remplir(p, '#secMdpSession', 'e2etest');
    const pidAlias = pidPayara();
    const armeAlias = await confirmer(p, '#btnSecAlias');
    const mAlias = await attendreTexte(p, '#secMessage', /alias|Alias|Échec|échec/i, 240000);
    await p.waitForFunction((s) => !/en cours|Pose de/.test(Ext.ComponentQuery.query(s)[0].getEl().dom.textContent), S('#secMessage'), { timeout: 240000 });
    const okAlias = await attendrePool(p, (x) => x.password === '${ALIAS=' + ALIAS + '}');
    const aliases = asadmin('list-password-aliases');
    ok('Alias Payara : confirmation dans le bouton, domain.xml porte ${ALIAS=prestige-db}, alias listé, pool en service, journal ALIAS OK', /Confirmer/.test(armeAlias) && okAlias
      && new RegExp('^\\s*' + ALIAS + '\\s*$', 'm').test(aliases) && /plus en clair/.test(await texte(p, '#secMessage')) && /ALIAS OK/.test(journal()) && connecte(APP, P2), sanitize(mAlias + ' | ' + await texte(p, '#secMessage')));
    ok('… Payara a redémarré, Prestige répond avec le pool sous alias', await apresRedemarrage(null, pidAlias));
    const stockage2 = await attendreTexte(p, '#secStockage', /ALIAS PAYARA/);
    ok('… état : pool ALIAS PAYARA, bouton d\'alias désactivé', /ALIAS PAYARA/.test(stockage2) && await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isDisabled(), S('#btnSecAlias')), sanitize(stockage2));

    /* 7. rotation en mode alias */
    r = await rotation(p, { session: 'e2etest', compte: ADMIN, mdp: PA, mode: 'SAISIR', nouveau: P3, confirmation: P3 });
    ok('Rotation en mode alias : changé et vérifié ; domain.xml garde l\'alias (aucune valeur), l\'ancien ne se connecte plus, le nouveau si', /changé et vérifié/.test(r.message) && pool().password === '${ALIAS=' + ALIAS + '}'
      && connecte(APP, P3) && !connecte(APP, P2) && /alias prestige-db/.test(r.etapes), sanitize(r.message + ' | ' + r.etapes));
    ok('… Payara a redémarré, Prestige répond avec le nouveau mot de passe sous alias', await apresRedemarrage(r, r.pid));

    /* 8. purge des copies */
    await remplir(p, '#secMdpSession', 'e2etest');
    const armePurge = await confirmer(p, '#btnSecPurger');
    const mPurge = await attendreTexte(p, '#secMessage', /supprimée/, 60000);
    await p.waitForTimeout(1500);
    ok('Purge des copies : confirmation dans le bouton, 3 copies supprimées, l\'autre fichier du dossier reste, état « AUCUNE », journal PURGE_COPIES OK', /Confirmer/.test(armePurge) && /3 copie\(s\) supprimée/.test(mPurge)
      && fs.readdirSync(COPIES).join(',') === 'autre-fichier.txt' && /Copies.*AUCUNE/.test(await attendreTexte(p, '#secStockage', /AUCUNE/)) && /PURGE_COPIES OK 3 copie/.test(journal()), sanitize(mPurge + ' | ' + journal()));

    /* 9. aucun secret nulle part */
    const j = journalDepuis(depuis);
    const secrets = [P0, PA, P2, P3, P4].concat(generes);
    const fuite = (t) => secrets.find((s) => t.indexOf(s) >= 0);
    ok('Aucun mot de passe (comptes d\'essai, générés, saisis, compte de rotation) dans server.log, ni ordre ALTER USER avec sa valeur, ni fichier d\'alias',
      !fuite(j) && !/IDENTIFIED BY '[^*]/.test(j) && !/AS_ADMIN_ALIASPASSWORD=/.test(j) && j.indexOf(ADMIN + "'@") < 0 && !/password=(?!\*\*\*)[^\s"&*${]+/i.test(j), (fuite(j) ? 'fuite' : 'ok') + ' ' + j.length + ' octets');
    ok('Aucun mot de passe dans les réponses de l\'API de sécurité, ni dans la table t_securite_journal', !reponses.some((t) => fuite(t)) && !fuite(journal()) && reponses.length > 5, reponses.length + ' réponses');
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    droit.remettre();
    await b.close().catch(() => {});
    /* pool remis sur le compte d'origine, alias retire, parametres et journal remis, comptes et fichiers du test retires */
    let remise = '';
    try { setPool('password', pool0.password); setPool('user', pool0.user); } catch (e) { remise += ' pool:' + e.message; }
    try { asadmin('delete-password-alias', ALIAS); } catch (e) { remise += ' alias:' + (e.stderr || e.message); }
    try { flush(); } catch (e) { remise += ' flush:' + e.message; }
    const redemarreFin = await redemarrerDomaine();
    exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
      + (reglagesAvant && reglagesAvant !== 'NULL' ? reglagesAvant.split('|').map((kv) => { const i = kv.indexOf('=');
        return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + kv.slice(i + 1).replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'Sécurité de la base', 'SYSTEME', 'enable', NOW());"; }).join('') : '')
      + 'DELETE FROM t_securite_journal WHERE id > ' + idJournal + ';'
      + "DROP USER IF EXISTS '" + APP + "'@'localhost'; DROP USER IF EXISTS '" + ADMIN + "'@'localhost';");
    fs.rmSync(TMP, { recursive: true, force: true });
    const poolFin = pool();
    const fin = Date.now() + 20000;
    while ((poolFin.user !== pool0.user || poolFin.password !== pool0.password) && Date.now() < fin) { execFileSync('cmd', ['/c', 'timeout', '/t', '1', '/nobreak'], { stdio: 'ignore' }); Object.assign(poolFin, pool()); }
    ok('Pool remis sur son compte d\'origine (domain.xml identique), Payara redémarré et Prestige répond, alias retiré, paramètres, journal, comptes et fichiers du test retirés', poolFin.user === pool0.user && poolFin.password === pool0.password && redemarreFin && await repond() && !/prestige-db/.test(asadmin('list-password-aliases'))
      && !fs.existsSync(TMP) && q("SELECT COUNT(*) FROM mysql.user WHERE User IN ('" + APP + "', '" + ADMIN + "')") === '0'
      && q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')") === (reglagesAvant || 'NULL')
      && q('SELECT COALESCE(MAX(id), 0) FROM t_securite_journal') === String(idJournal), remise || 'ok');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
