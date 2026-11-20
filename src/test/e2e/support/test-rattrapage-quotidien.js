/* RATTRAPAGE DES JOBS DE NUIT AU DEMARRAGE (journaux de Pontmain et de leana, 18/11).
 *
 * Officine qui eteint son serveur la nuit : la purge du Centre de support (03:45) et la veille de coherence (04:15)
 * ne tournent jamais a leur heure. Le rattrapage au demarrage n'agissait qu'apres 30 h sans passage : un passage vieux
 * de moins de 30 h, mais d'avant l'echeance du jour, n'etait pas rattrape, et le Centre de support signalait ensuite
 * « Job planifie en retard » toutes les heures.
 *
 * Parcours reel : dernier passage pose juste avant la derniere echeance franchie (moins de 30 h), puis application
 * redemarree (asadmin disable / enable, comme un demarrage du poste) ; le rattrapage part 5 minutes apres.
 * Bilan avant / apres :
 *  - purge et veille rattrapees une fois chacune (dernier passage >= redemarrage, une ligne par job, une ligne de
 *    journal « Rattrapage au demarrage » par job) ;
 *  - jobs non dus intacts (ventes en attente, purge du releve, archivage PDF) ;
 *  - aucun evenement « Job planifie en retard » cree pour ces deux jobs depuis le redemarrage.
 * Les passages sont de vrais passages (purge et veille executees sur la copie de travail) : ils ne sont pas remis.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DOMAINE = ENV_E2E.PAYARA_DOMAINE;
const xml = fs.readFileSync(DOMAINE + '/config/domain.xml', 'utf8');
const PORT_ADMIN = (xml.match(/port="(\d+)" name="admin-listener"/) || [])[1] || '4848';
const ASADMIN = path.resolve(DOMAINE, '../../../bin/asadmin.bat');
const ENV_ASADMIN = Object.assign({}, process.env); delete ENV_ASADMIN.JAVA_HOME;
const asadmin = (...a) => execFileSync('cmd.exe', ['/c', ASADMIN, '--port', PORT_ADMIN, ...a], { encoding: 'utf8', env: ENV_ASADMIN });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const JOBS = { PURGE_SUPPORT: '03:45:00', COHERENCE_SUPPORT: '04:15:00' };
const LIBELLES = { PURGE_SUPPORT: 'purge du Centre de Support', COHERENCE_SUPPORT: 'veilleur de coherence' };
const NON_DUS = ['VENTES_ATTENTE_EXPIREES', 'PURGE_VALORISATION', 'VALORISATION_PDF'];
const dernier = (code) => q(`SELECT IFNULL((SELECT DATE_FORMAT(last_run_at, '%Y-%m-%d %H:%i:%s') FROM t_support_job_run WHERE code = '${code}'), 'AUCUN')`);
/* derniere echeance franchie : heure du jour + 1 h de marge, sinon celle de la veille (regle du rattrapage) */
const echeance = (heure) => q(`SELECT DATE_FORMAT(IF(NOW() < TIMESTAMP(CURDATE(), '${heure}') + INTERVAL 1 HOUR,
  TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '${heure}'), TIMESTAMP(CURDATE(), '${heure}')), '%Y-%m-%d %H:%i:%s')`);

(async () => {
  const avant = {};
  for (const c of NON_DUS) { avant[c] = dernier(c); }
  const tailleJournal = fs.statSync(ENV_E2E.JOURNAL_SERVEUR).size;
  try {
    const poses = {};
    for (const code of Object.keys(JOBS)) {
      poses[code] = q(`SELECT DATE_FORMAT(TIMESTAMP('${echeance(JOBS[code])}') - INTERVAL 1 MINUTE, '%Y-%m-%d %H:%i:%s')`);
      q(`INSERT INTO t_support_job_run (code, last_run_at, hostname) VALUES ('${code}', '${poses[code]}', 'e2e-rattrapage')
        ON DUPLICATE KEY UPDATE last_run_at = '${poses[code]}', hostname = 'e2e-rattrapage'`);
    }
    const ages = Object.keys(JOBS).map((c) => Number(q(`SELECT TIMESTAMPDIFF(MINUTE, '${poses[c]}', NOW())`)));
    ok('Jeu d\'essai : dernier passage avant l\'échéance du jour, moins de 30 h (l\'ancienne règle ne rattrape pas)',
      ages.every((a) => a > 0 && a < 1800), JSON.stringify(poses) + ' âges ' + ages);

    const t0 = q('SELECT DATE_FORMAT(NOW(), \'%Y-%m-%d %H:%i:%s\')');
    asadmin('disable', 'prestige');
    asadmin('enable', 'prestige');
    ok('Application redémarrée', /executed successfully/.test(asadmin('list-applications')), t0);

    /* le rattrapage part 5 min apres le demarrage : jusqu'a 9 min d'attente */
    const fin = Date.now() + 9 * 60000;
    let faits = {};
    while (Date.now() < fin) {
      faits = {};
      for (const code of Object.keys(JOBS)) { faits[code] = dernier(code); }
      if (Object.keys(JOBS).every((c) => faits[c] >= t0)) { break; }
      await attendre(10000);
    }
    for (const code of Object.keys(JOBS)) {
      ok(`${code} rattrapé après le redémarrage`, faits[code] >= t0, `posé ${poses[code]} → ${faits[code]} (redémarrage ${t0})`);
      ok(`${code} : une seule ligne de passage, écrite par le serveur`, q(`SELECT COUNT(*) FROM t_support_job_run WHERE code = '${code}'`) === '1'
        && q(`SELECT hostname FROM t_support_job_run WHERE code = '${code}'`) !== 'e2e-rattrapage');
    }
    await attendre(5000);
    const journal = fs.readFileSync(ENV_E2E.JOURNAL_SERVEUR, 'latin1').slice(tailleJournal);
    for (const code of Object.keys(JOBS)) {
      const n = (journal.match(new RegExp('Rattrapage au demarrage : ' + LIBELLES[code], 'g')) || []).length;
      ok(`Journal du serveur : un seul rattrapage « ${LIBELLES[code]} »`, n === 1, n);
    }
    for (const c of NON_DUS) {
      ok(`${c} non dû : intact`, dernier(c) === avant[c], avant[c] + ' → ' + dernier(c));
    }
    const retards = q(`SELECT COUNT(*) FROM t_application_event WHERE message_court LIKE 'Job planifie en retard%'
      AND (message_court LIKE '%Purge quotidienne du Centre%' OR message_court LIKE '%Veilleur de coherence%') AND last_seen_at >= '${t0}'`);
    ok('Aucune alerte « Job planifié en retard » pour la purge ou la veille depuis le redémarrage', retards === '0', retards);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    q("DELETE FROM t_support_job_run WHERE hostname = 'e2e-rattrapage'");
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
