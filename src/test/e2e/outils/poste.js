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
  if (!CAPTURES) { return b; }
  const pages = () => [].concat(...b.contexts().map((c) => c.pages()));
  const video = (o) => Object.assign({ recordVideo: { dir: dossier() } }, o);
  const newPage = b.newPage.bind(b), newContext = b.newContext.bind(b), close = b.close.bind(b);
  b.newPage = (o) => newPage(video(o));
  b.newContext = (o) => newContext(video(o));
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
  WINDOWS, BASE, LOGIN, LOGIN_SUPPORT, CHROMIUM, TMP, VISIBLE, CAPTURES, lancer, capture,
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
