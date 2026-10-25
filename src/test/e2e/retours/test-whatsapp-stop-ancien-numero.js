/* STOP WHATSAPP DEPUIS L'ANCIEN IDENTIFIANT A 8 CHIFFRES (retour du 24/10, repris du CRM UBIPHARM).
 *
 * Un compte WhatsApp ouvert avant le passage a 10 chiffres (2021) ecrit souvent depuis 225 + 8 chiffres. Son « STOP »
 * etait ignore (numero juge invalide) : le client continuait de recevoir les campagnes.
 * Chemin reel du service WhatsApp Web : POST /api/v1/whatsapp/webhook-web avec le jeton partage, corps
 * {entrants:[{numero, texte}]}. Jeu d'essai isole (clients ZZSTOP), compte WEB remis a la fin.
 *  - STOP depuis 22508991122 -> le client du 07 08 99 11 22 est desinscrit ;
 *  - STOP depuis 22508994455 alors que 07 08 99 44 55 ET 05 08 99 44 55 existent -> personne (on ne devine pas) ;
 *  - STOP depuis le numero a 10 chiffres : toujours pris en compte (non-regression) ;
 *  - jeton faux : refuse (401), rien ne change ; le texte des messages n'apparait pas dans le journal.
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige/api/v1/whatsapp/webhook-web';
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const JETON = 'jeton-essai-stop-' + Date.now();
const lit = (s) => (s === undefined || s === 'NULL' || s === '' ? 'NULL' : "'" + s.replace(/'/g, "''") + "'");
const IDS = "('E2E-STOP-A','E2E-STOP-B','E2E-STOP-C','E2E-STOP-D')";
const consent = (id) => q(`SELECT bool_CONSENT_WHATSAPP + 0 FROM t_client WHERE lg_CLIENT_ID = '${id}'`);
const envoyer = (jeton, entrants) => fetch(URL, { method: 'POST', headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' },
  body: JSON.stringify({ statuts: [], entrants }) }).then((r) => r.status);

(async () => {
  exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN ' + IDS);
  const sauve = q("SELECT CONCAT_WS('#~#', IFNULL(web_jeton, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'");
  const tailleLog = fs.statSync(LOG).size;
  try {
    exec(`UPDATE whatsapp_compte SET web_jeton = '${JETON}' WHERE mode = 'WEB';`
      + 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_SEXE, dt_CREATED, dt_UPDATED, str_STATUT) VALUES'
      + " ('E2E-STOP-A', 'ZZSTOP', 'AWA', '1', '07 08 99 11 22', 'F', NOW(), NOW(), 'enable'),"
      + " ('E2E-STOP-B', 'ZZSTOP', 'BINTOU', '1', '0708994455', 'F', NOW(), NOW(), 'enable'),"
      + " ('E2E-STOP-C', 'ZZSTOP', 'CHANTAL', '1', '0508994455', 'F', NOW(), NOW(), 'enable'),"
      + " ('E2E-STOP-D', 'ZZSTOP', 'DRISSA', '1', '0108997788', 'M', NOW(), NOW(), 'enable');"
      + 'UPDATE t_client SET bool_CONSENT_WHATSAPP = 1 WHERE lg_CLIENT_ID IN ' + IDS);

    ok('Jeton faux : refusé (401), rien ne change', await envoyer('faux', [{ numero: '22508991122', texte: 'STOP' }]) === 401 && consent('E2E-STOP-A') === '1');
    ok('STOP depuis l\'ancien identifiant 225 08 99 11 22 : accepté', await envoyer(JETON, [{ numero: '22508991122', texte: 'STOP' }]) === 200);
    ok('Le client du 07 08 99 11 22 est désinscrit de WhatsApp', consent('E2E-STOP-A') === '0', consent('E2E-STOP-A'));
    await envoyer(JETON, [{ numero: '22508994455', texte: 'Stop' }]);
    ok('Ancien identifiant ambigu (07 et 05 08 99 44 55) : personne n\'est désinscrit', consent('E2E-STOP-B') === '1' && consent('E2E-STOP-C') === '1');
    await envoyer(JETON, [{ numero: '2250108997788', texte: 'STOP' }]);
    ok('STOP depuis le numéro à 10 chiffres : toujours pris en compte', consent('E2E-STOP-D') === '0');
    await envoyer(JETON, [{ numero: '22508994455', texte: 'Bonjour, merci' }]);
    ok('Un message ordinaire ne désinscrit pas', consent('E2E-STOP-B') === '1');
    const log = fs.readFileSync(LOG, 'utf8').slice(tailleLog);
    ok('Ni le texte des messages ni les numéros dans le journal du serveur', !/Bonjour, merci|08991122|08994455/.test(log) && !log.includes(JETON));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    /* 25/10 : les messages recus sont gardes dans les fils de discussion : ceux de l'essai sont retires aussi */
    exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN ' + IDS + ';'
      + "DELETE FROM whatsapp_discussion WHERE numero IN ('0708991122','0708994455','0508994455','0108997788');"
      + `UPDATE whatsapp_compte SET web_jeton = ${lit(sauve)} WHERE mode = 'WEB';`);
    ok('Jeu d\'essai retiré, jeton remis', q('SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ' + IDS) === '0'
      && q("SELECT COUNT(*) FROM whatsapp_discussion WHERE numero IN ('0708991122','0708994455','0508994455','0108997788')") === '0'
      && q("SELECT IFNULL(web_jeton, 'NULL') FROM whatsapp_compte WHERE mode = 'WEB'") === sauve);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
