/* REGLAGES DU POSTE : base, navigateur et client MariaDB des tests d'ecran.
 *
 * Le banc Linux garde ses reglages d'origine (base capitale, Chromium dans /opt/pw-browsers, client mariadb sans
 * options). Sous Windows, sur le PC de l'officine, les tests ne travaillent que sur la copie de travail
 * laborex_v1_db : jamais sur la base ou se font les ventes (voir outils/poste-local/LISEZMOI.md).
 *
 * Variables d'environnement :
 *   DB_TEST          base des tests (defaut : laborex_v1_db sous Windows, capitale sous Linux) ;
 *   E2E_LOGIN        compte de connexion des tests, mot de passe e2etest (defaut : e2e sous Windows, cree par
 *                    outils/poste-local/compte-essai.sql avec les droits d'admin ; admin sous Linux) ;
 *   E2E_BASE_LIBRE   1 pour autoriser, sous Windows, une autre base que laborex_v1_db ;
 *   CHROMIUM         executable de Chromium (defaut sous Windows : celui de PLAYWRIGHT_BROWSERS_PATH) ;
 *   MARIADB_OPTIONS  fichier d'options du client mariadb : utilisateur et mot de passe, hors du depot
 *                    (defaut sous Windows : %USERPROFILE%\.prestige-e2e.cnf) ;
 *   E2E_VISIBLE      1 pour suivre le test a l'ecran (fenetre de Chromium, actions ralenties de 300 ms) ;
 *   E2E_CAPTURES     dossier des videos et captures (defaut sous Windows : captures\ a la racine du depot, exclu de
 *                    Git ; aucun sous Linux) ; 0 pour ne rien enregistrer. Un sous-dossier par test et par lancement.
 *
 * Les videos et captures restent sur le poste. Sur laborex_v1_db, elles peuvent montrer des donnees de patients :
 * ne pas les diffuser.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const WINDOWS = process.platform === 'win32';

/* Sous Windows, le client mariadb lit ses arguments dans la page de codes du systeme : une requete « -e » avec des
   accents arrive fausse (« Incorrect string value: '\xE9' », melange de collations). La requete passe alors par
   l'entree standard, en UTF-8. Les requetes en ASCII ne changent pas. */
if (WINDOWS) {
  const cp = require('child_process');
  const execFileSyncOrigine = cp.execFileSync;
  cp.execFileSync = function (fichier, args, options) {
    if (/(^|[\\/])mariadb(\.exe)?$/i.test(String(fichier)) && Array.isArray(args)) {
      const i = args.indexOf('-e');
      if (i >= 0 && /[^\x00-\x7f]/.test(String(args[i + 1])) && !(options && options.input !== undefined)) {
        const reste = args.slice(0, i).concat(args.slice(i + 2));
        if (!reste.some((a) => /^--default-character-set=/.test(a))) {
          reste.splice(/^--defaults-extra-file=/.test(reste[0] || '') ? 1 : 0, 0, '--default-character-set=utf8mb4');
        }
        return execFileSyncOrigine.call(this, fichier, reste, Object.assign({}, options, { input: String(args[i + 1]) }));
      }
    }
    return execFileSyncOrigine.apply(this, arguments);
  };
}
/* Sous Windows, Python ecrit dans la page de codes du systeme quand sa sortie est lue par le test : les accents des
   classeurs lus par python3 arriveraient faux. Il est lance en mode UTF-8 (« -X utf8 », que « -I » n'ignore pas,
   contrairement a PYTHONUTF8 ; la variable sert aux appels par execSync). */
if (WINDOWS) {
  if (!process.env.PYTHONUTF8) { process.env.PYTHONUTF8 = '1'; }
  const cp = require('child_process');
  const execFileSyncPrecedent = cp.execFileSync;
  cp.execFileSync = function (fichier, args, options) {
    if (/(^|[\\/])python3?(\.exe)?$/i.test(String(fichier)) && Array.isArray(args) && args[0] !== '-X') {
      return execFileSyncPrecedent.call(this, fichier, ['-X', 'utf8'].concat(args), options);
    }
    return execFileSyncPrecedent.apply(this, arguments);
  };
}
const COPIE_DE_TRAVAIL = 'laborex_v1_db';

const BASE = process.env.DB_TEST || (WINDOWS ? COPIE_DE_TRAVAIL : 'capitale');
if (WINDOWS && BASE !== COPIE_DE_TRAVAIL && process.env.E2E_BASE_LIBRE !== '1') {
  throw new Error('Sur le poste local, les tests ne travaillent que sur ' + COPIE_DE_TRAVAIL + ' (DB_TEST=' + BASE
    + '). Pour une autre copie de travail, poser E2E_BASE_LIBRE=1.');
}

/* la copie de travail garde le mot de passe d'origine d'admin : les tests y ont leur propre compte */
const LOGIN = process.env.E2E_LOGIN || (WINDOWS ? 'e2e' : 'admin');
/* compte Super Administrateur (retours du 25/10 : Centre de support, sauf « Me contacter », et audit reserves au super
   administrateur) : e2e-sa sous Windows (outils/poste-local/compte-essai.sql) ; sur le banc, poser E2E_LOGIN_SUPPORT
   avec un compte super administrateur (mot de passe e2etest) */
const LOGIN_SUPPORT = process.env.E2E_LOGIN_SUPPORT || (WINDOWS ? 'e2e-sa' : 'admin');

/* undefined : Playwright prend le Chromium installe par « playwright-core install chromium » */
const CHROMIUM = process.env.CHROMIUM || (WINDOWS ? undefined : '/opt/pw-browsers/chromium');

const OPTIONS = process.env.MARIADB_OPTIONS || (WINDOWS ? path.join(os.homedir(), '.prestige-e2e.cnf') : '');

/* dossier des sorties et captures : /tmp n'existe pas sous Windows */
const TMP = WINDOWS ? os.tmpdir() : '/tmp';

/* domaine Payara de Prestige (journal server.log, domain.xml) : SERVER_LOG / PAYARA_DOMAINE pour un autre poste */
const PAYARA_DOMAINE = process.env.PAYARA_DOMAINE
  || (WINDOWS ? 'D:/payara5/payara5/glassfish/domains/domain1' : '/opt/payara5/glassfish/domains/domain1');
const JOURNAL_SERVEUR = process.env.SERVER_LOG || PAYARA_DOMAINE + '/logs/server.log';

/* dossiers ou le serveur ecrit ses fichiers, calcules comme lui (util.StockageDisque, ArchivePharmaMl) :
 *   STOCKAGE      racine des donnees : sous Windows D:\prestige (ou F:, E:), sinon <profil>\prestige ;
 *   CONFIG_POSTE  dossier de dicisms.properties s'il est a sa place historique (Documents), sinon STOCKAGE\config ;
 *   PHARMAML      archives des echanges : cle pharmaMlDir de dicisms.properties (seule cle lue).
 * E2E_STOCKAGE, E2E_CONFIG et E2E_PHARMAML les imposent. Sur le banc Linux : /root/prestige, comme avant. */
const STOCKAGE = process.env.E2E_STOCKAGE || (WINDOWS
  ? (['D:', 'F:', 'E:'].map((d) => d + '\\prestige').find((d) => fs.existsSync(d)) || path.join(os.homedir(), 'prestige'))
  : '/root/prestige');
const DICISMS = path.join(os.homedir(), 'Documents', 'dicisms.properties');
const CONFIG_POSTE = process.env.E2E_CONFIG || (WINDOWS && fs.existsSync(DICISMS) ? path.dirname(DICISMS)
  : path.join(STOCKAGE, 'config'));
function dossierPharmaMl() {
  if (process.env.E2E_PHARMAML) { return process.env.E2E_PHARMAML; }
  if (!WINDOWS) { return '/root/prestige/pharmaml'; }
  const f = path.join(CONFIG_POSTE, 'dicisms.properties');
  const ligne = fs.existsSync(f) ? fs.readFileSync(f, 'latin1').split(/\r?\n/).find((l) => /^\s*pharmaMlDir\s*[=:]/.test(l)) : null;
  /* format des fichiers .properties : « \: » pour « : », « \\ » pour « \ » */
  return ligne ? ligne.replace(/^\s*pharmaMlDir\s*[=:]\s*/, '').replace(/\\(.)/g, '$1').trim() : path.join(STOCKAGE, 'pharmaml');
}
const PHARMAML = dossierPharmaMl();

const VISIBLE = process.env.E2E_VISIBLE === '1';
const CAPTURES = process.env.E2E_CAPTURES === '0' ? null
  : process.env.E2E_CAPTURES || (WINDOWS ? path.resolve(__dirname, '../../../../captures') : null);

/* captures/<test>/<date-heure>/, cree au premier besoin */
let dossierDuTest = null, numero = 0;
function dossier() {
  if (!dossierDuTest) {
    const d = new Date(), z = (n) => String(n).padStart(2, '0');
    const quand = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + 'h'
      + z(d.getMinutes()) + 'm' + z(d.getSeconds()) + 's';
    const test = require.main ? path.basename(require.main.filename, '.js') : 'test';
    dossierDuTest = path.join(CAPTURES, test, quand);
    fs.mkdirSync(dossierDuTest, { recursive: true });
  }
  return dossierDuTest;
}

/* capture d'une page, numerotee dans l'ordre du test ; sans effet si rien n'est enregistre */
async function capture(page, nom) {
  if (!CAPTURES) { return null; }
  const f = path.join(dossier(), String(++numero).padStart(3, '0') + '-'
    + String(nom).replace(/[^\w.-]+/g, '_').slice(0, 80) + '.png');
  return page.screenshot({ path: f }).then(() => f).catch(() => null);
}

/*
 * Lance Chromium pour un test. E2E_VISIBLE : fenetre et actions ralenties. Avec un dossier de captures : une video
 * par page (contexte), une capture des pages ouvertes a chaque ligne « FAIL » ecrite par le test, et une capture de
 * fin a la fermeture du navigateur.
 */
async function lancer(chromium, options) {
  const b = await chromium.launch(Object.assign({ executablePath: CHROMIUM, headless: !VISIBLE },
    VISIBLE ? { slowMo: 300 } : {}, options));
  /* Banniere WhatsApp (toast en bas a droite) : sur un poste sans service WhatsApp, elle apparait au hasard des
     verifications et couvre les boutons du bas. Comme l'utilisateur, on la « Masque » (30 min, renouvele a chaque
     page). Les tests de la banniere elle-meme posent E2E_BANNIERE_WHATSAPP=1 pour la garder. */
  const sansBanniere = process.env.E2E_BANNIERE_WHATSAPP !== '1';
  const masquer = async (c) => {
    if (sansBanniere) {
      await c.addInitScript(() => { try { localStorage.setItem('prestige.alerteWhatsApp.masquee', String(Date.now() + 1800000)); } catch (e) { /* */ } });
    }
    /* Chromium sans fenetre telecharge le PDF ouvert dans un onglet au lieu de l'afficher : la navigation ne
       s'acheve pas et page.url() reste vide. L'onglet rend alors l'adresse qu'il a demandee, celle qu'un
       utilisateur verrait dans la barre d'adresse. */
    const sansCadre = []; // demandes d'onglets emises avant que Playwright ne connaisse leur cadre
    c.on('request', (r) => {
      if (!r.isNavigationRequest()) { return; }
      let f = null;
      try { f = r.frame(); } catch (e) { sansCadre.push(r.url()); return; }
      if (f === f.page().mainFrame()) { f.page().adresseDemandee = r.url(); }
    });
    c.on('page', (pg) => {
      const url0 = pg.url.bind(pg);
      pg.url = () => {
        const u = url0();
        if (u) { return u; }
        if (!pg.adresseDemandee && sansCadre.length) { pg.adresseDemandee = sansCadre.shift(); }
        return pg.adresseDemandee || '';
      };
    });
    return c;
  };
  const avecVideo = (o) => (CAPTURES ? Object.assign({ recordVideo: { dir: dossier() } }, o) : o);
  const newContext0 = b.newContext.bind(b);
  b.newContext = async (o) => masquer(await newContext0(avecVideo(o)));
  b.newPage = async (o) => { const c = await b.newContext(o); const p = await c.newPage(); p.close = ((f) => async (x) => { await f(x); await c.close(); })(p.close.bind(p)); return p; };
  if (!CAPTURES) { return b; }
  const pages = () => [].concat(...b.contexts().map((c) => c.pages()));
  const close = b.close.bind(b);
  const enCours = [], log = console.log;
  console.log = function () {
    log.apply(console, arguments);
    const ligne = String(arguments[0] || '');
    if (/^FAIL\b/.test(ligne)) {
      pages().forEach((p, i) => enCours.push(capture(p, 'echec-' + ligne.slice(4).trim() + (i ? '-' + i : ''))));
    }
  };
  b.close = async () => {
    await Promise.all(enCours);
    for (const [i, p] of pages().entries()) { await capture(p, 'fin' + (i ? '-' + i : '')); }
    console.log = log;
    await close();
    if (dossierDuTest) { log('Videos et captures : ' + dossierDuTest); }
  };
  return b;
}

module.exports = {
  WINDOWS, BASE, LOGIN, LOGIN_SUPPORT, CHROMIUM, TMP, PAYARA_DOMAINE, JOURNAL_SERVEUR, VISIBLE, CAPTURES, lancer, capture,
  STOCKAGE, CONFIG_POSTE, PHARMAML,
  /* arguments a placer en tete de chaque appel au client mariadb ; verifie a l'appel, pour que les tests sans base
     n'aient pas besoin du fichier d'options */
  get MARIADB() {
    if (!OPTIONS) { return []; }
    if (!fs.existsSync(OPTIONS)) {
      throw new Error('Fichier d\'options MariaDB introuvable : ' + OPTIONS
        + ' (modele : outils/poste-local/prestige-e2e.cnf.exemple)');
    }
    /* --defaults-extra-file doit etre le premier argument du client */
    return ['--defaults-extra-file=' + OPTIONS];
  },
};
