/* REGLAGES DU POSTE : base, navigateur et client MariaDB des tests d'ecran.
 *
 * Le banc Linux garde ses reglages d'origine (base capitale, Chromium dans /opt/pw-browsers, client mariadb sans
 * options). Sous Windows, sur le PC de l'officine, les tests ne travaillent que sur la copie de travail
 * laborex_v1_db : jamais sur la base ou se font les ventes (voir outils/poste-local/LISEZMOI.md).
 *
 * Variables d'environnement :
 *   DB_TEST          base des tests (defaut : laborex_v1_db sous Windows, capitale sous Linux) ;
 *   E2E_BASE_LIBRE   1 pour autoriser, sous Windows, une autre base que laborex_v1_db ;
 *   CHROMIUM         executable de Chromium (defaut sous Windows : celui de PLAYWRIGHT_BROWSERS_PATH) ;
 *   MARIADB_OPTIONS  fichier d'options du client mariadb : utilisateur et mot de passe, hors du depot
 *                    (defaut sous Windows : %USERPROFILE%\.prestige-e2e.cnf).
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

/* undefined : Playwright prend le Chromium installe par « playwright-core install chromium » */
const CHROMIUM = process.env.CHROMIUM || (WINDOWS ? undefined : '/opt/pw-browsers/chromium');

const OPTIONS = process.env.MARIADB_OPTIONS || (WINDOWS ? path.join(os.homedir(), '.prestige-e2e.cnf') : '');

/* dossier des sorties et captures : /tmp n'existe pas sous Windows */
const TMP = WINDOWS ? os.tmpdir() : '/tmp';

module.exports = {
  WINDOWS, BASE, CHROMIUM, TMP,
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
