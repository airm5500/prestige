/* Exploitation du 14/11, S2 : 57 interblocages MariaDB dans la journee d'appaul, a minute paire et seconde 00.
 * Chaque Payara (serveur et caisses) ecrivait son releve de sante (t_serveur_mesure) et purgeait toute la table dans
 * la meme transaction, a la meme seconde : les purges se croisaient et le releve du moment etait perdu.
 *
 * 1. Banc : 8 postes simules (processus mariadb en parallele) font 30 releves chacun, avec la facon d'ecrire et de
 *    purger du code a l'essai (lue dans ServeurVieService.java : purge generale dans la transaction du releve, ou
 *    releve seul puis purge des lignes du poste). Attendu : aucun interblocage, 240 releves sur 240.
 *    Table de travail e2e_banc_mesure (copie vide de t_serveur_mesure), supprimee a la fin.
 * 2. Chemin reel, sur le serveur d'essai : pendant 2 battements (toutes les 2 min, seconde 00), 7 postes simules
 *    ecrivent et purgent t_serveur_mesure a la meme seconde que le serveur. Attendu : un releve du serveur par
 *    battement, aucune exception de ServeurVieService ni « Deadlock » dans son server.log ; bilan : les lignes des
 *    postes simules (hote E2E-RS-*) sont retirees, celles du serveur restent.
 * Lancement seul (4 a 5 min) : node src/test/e2e/support/test-releve-sante-interblocage-1511.js
 */
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const OPT = [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE];
const q = (s) => execFileSync('mariadb', [...OPT, '-sN'], { input: s, encoding: 'utf8' }).trim();
const SOURCE = process.env.SOURCE_RELEVE || path.join(__dirname, '../../../main/java/rest/service/impl/serveur/ServeurVieService.java');
const src = fs.readFileSync(SOURCE, 'utf8');
/* facon d'ecrire du code a l'essai : l'ancien purgeait toute la table dans la transaction du releve */
const ANCIEN = src.includes('createNativeQuery("DELETE FROM t_serveur_mesure WHERE mesure_at < ?1 LIMIT 2000")');
const NOUVEAU = !ANCIEN && /SQL_PURGE_POSTE\s*=\s*"DELETE FROM t_serveur_mesure WHERE hote = \?1 AND mesure_at < \?2/.test(src);

function releves(table, hote, n) {
  let s = '';
  for (let r = 0; r < n; r++) {
    const insert = `INSERT INTO ${table} (vie_id, hote, mesure_at, memoire_mo) VALUES (NULL, '${hote}', NOW(), ${r});`;
    s += NOUVEAU
      ? `START TRANSACTION; ${insert} COMMIT; START TRANSACTION; DELETE FROM ${table} WHERE hote = '${hote}' AND mesure_at < NOW() - INTERVAL 14 DAY LIMIT 20; COMMIT;\n`
      : `START TRANSACTION; ${insert} DELETE FROM ${table} WHERE mesure_at < NOW() - INTERVAL 14 DAY LIMIT 20; COMMIT;\n`;
  }
  return s;
}
/* lance les postes simules en parallele ; rend le nombre d'interblocages et d'erreurs */
function postes(table, prefixe, k, n) {
  return new Promise((fin) => {
    let fini = 0; let dead = 0; let erreurs = 0;
    for (let i = 0; i < k; i++) {
      const p = spawn('mariadb', [...OPT, '--force', '-sN']);
      let err = '';
      p.stderr.on('data', (d) => { err += d; });
      p.on('close', () => {
        dead += (err.match(/Deadlock/g) || []).length;
        erreurs += (err.match(/ERROR/g) || []).length;
        if (++fini === k) { fin({ dead, erreurs }); }
      });
      p.stdin.end(releves(table, prefixe + i, n));
    }
  });
}
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  ok('Code à l\'essai reconnu (' + (NOUVEAU ? 'relevé seul puis purge du poste' : 'purge générale dans le relevé') + ')', NOUVEAU || ANCIEN, SOURCE);
  const T = 'e2e_banc_mesure';
  try {
    /* 1. banc */
    q(`DROP TABLE IF EXISTS ${T}; CREATE TABLE ${T} LIKE t_serveur_mesure;`
      + `INSERT INTO ${T} (vie_id, hote, mesure_at) SELECT NULL, CONCAT('E2E-BANC-', p.seq), NOW() - INTERVAL 20 DAY + INTERVAL m.seq MINUTE FROM seq_0_to_7 p, seq_1_to_400 m;`);
    const b = await postes(T, 'E2E-BANC-', 8, 30);
    const ecrits = Number(q(`SELECT COUNT(*) FROM ${T} WHERE mesure_at > NOW() - INTERVAL 1 DAY`));
    ok('Banc, 8 postes x 30 relevés à la même seconde : aucun interblocage', b.dead === 0, b.dead + ' interblocage(s), ' + b.erreurs + ' erreur(s)');
    ok('Banc : 240 relevés écrits sur 240', ecrits === 240, ecrits + ' / 240');
    ok('Banc : les anciennes lignes sont purgées (8 x 400 au départ)', Number(q(`SELECT COUNT(*) FROM ${T} WHERE mesure_at < NOW() - INTERVAL 14 DAY`)) < 3200,
      q(`SELECT COUNT(*) FROM ${T} WHERE mesure_at < NOW() - INTERVAL 14 DAY`) + ' restantes');
  } finally {
    q(`DROP TABLE IF EXISTS ${T}`);
  }

  /* 2. chemin reel : le battement du serveur d'essai */
  const SERVEUR = q("SELECT hote FROM t_serveur_mesure WHERE hote NOT LIKE 'E2E-%' AND mesure_at > NOW() - INTERVAL 5 MINUTE ORDER BY id DESC LIMIT 1");
  ok('Le serveur d\'essai fait ses relevés (hôte connu)', !!SERVEUR, SERVEUR);
  const journal = ENV_E2E.JOURNAL_SERVEUR;
  const taille0 = fs.existsSync(journal) ? fs.statSync(journal).size : 0;
  const debut = q('SELECT NOW()');
  try {
    q("DELETE FROM t_serveur_mesure WHERE hote LIKE 'E2E-RS-%';"
      + "INSERT INTO t_serveur_mesure (vie_id, hote, mesure_at) SELECT NULL, CONCAT('E2E-RS-', p.seq), NOW() - INTERVAL 20 DAY + INTERVAL m.seq MINUTE FROM seq_0_to_6 p, seq_1_to_300 m;");
    let dead = 0;
    for (let n = 0; n < 2; n++) {
      /* jusqu'a la prochaine minute paire, seconde 00 */
      const now = new Date();
      const prochaine = new Date(now); prochaine.setSeconds(0, 0);
      prochaine.setMinutes(prochaine.getMinutes() + (prochaine.getMinutes() % 2 === 0 ? 2 : 1));
      await attendre(prochaine - now - 150);
      const r = await postes('t_serveur_mesure', 'E2E-RS-', 7, 15);
      dead += r.dead;
      await attendre(5000);
    }
    await attendre(5000);
    const du = q(`SELECT COUNT(*) FROM t_serveur_mesure WHERE hote = '${SERVEUR}' AND mesure_at >= '${debut}'`);
    ok('Chemin réel : un relevé du serveur par battement (2) malgré les postes simulés', Number(du) >= 2, du + ' relevé(s) depuis ' + debut + ' ; interblocages des postes simulés : ' + dead);
    let ajout = '';
    if (fs.existsSync(journal)) {
      const t = fs.statSync(journal).size;
      const fd = fs.openSync(journal, 'r');
      const depuis = t >= taille0 ? taille0 : 0;
      const buf = Buffer.alloc(t - depuis);
      fs.readSync(fd, buf, 0, buf.length, depuis);
      fs.closeSync(fd);
      ajout = buf.toString('latin1');
    }
    const fautes = (ajout.match(/ServeurVieService|Deadlock found/g) || []).length;
    ok('Chemin réel : aucune exception du relevé ni interblocage dans le server.log du serveur', fautes === 0, fautes + ' ligne(s) ; ' + journal);
  } finally {
    q("DELETE FROM t_serveur_mesure WHERE hote LIKE 'E2E-RS-%'");
    ok('Bilan : lignes des postes simulés retirées, celles du serveur gardées',
      q("SELECT COUNT(*) FROM t_serveur_mesure WHERE hote LIKE 'E2E-RS-%'") === '0' && Number(q(`SELECT COUNT(*) FROM t_serveur_mesure WHERE hote = '${SERVEUR}'`)) > 0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
