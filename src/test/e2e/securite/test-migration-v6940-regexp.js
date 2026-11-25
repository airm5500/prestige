/* MIGRATION V6.9.40 (téléphone du client standard) : REGEXP jamais appliqué à une chaîne vide (25/11).
 *
 * Chez un utilisateur, Flyway s'est bloqué sur 6.9.40 : « Regex error 'NULL argument passed' » (1139). Certains
 * MariaDB sous Windows (PCRE2 embarquée) refusent qu'on soumette une chaîne vide à REGEXP ; il suffit d'un client
 * standard dont l'adresse est vide ou faite seulement d'espaces, points, tirets, parenthèses. L'erreur ne se reproduit
 * pas sur le MariaDB 10.6.18 de ce poste : défaut « suspecté », corrigé par précaution en préfixant « # ».
 *
 *  1. Garde-fou : aucune migration ne soumet à REGEXP une valeur qui peut être vide (toute REGEXP porte sur
 *     CONCAT('#', ...)). Échoue sur l'ancien script.
 *  2. Mêmes numéros retenus : l'ancien et le nouveau script, joués chacun sur une base jetable avec les mêmes 22
 *     clients (vide, NULL, espaces, séparateurs seuls, indicatifs 225 et 00225, mauvaise longueur, lettre O, autres
 *     types de client, numéro en double), donnent exactement les mêmes str_TELEPHONE ; et ce sont ceux attendus.
 *  3. Rejouable : le nouveau script se rejoue deux fois de suite sans erreur ni changement (cas de l'utilisateur dont
 *     le premier passage a déjà ajouté la colonne).
 * La base jetable (préfixe e2e_v6940_) est supprimée à la fin ; aucune autre base n'est touchée.
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const DOSSIER = path.join(__dirname, '..', '..', '..', 'main', 'resources', 'db', 'migration');
const FICHIER = 'V6.9.40__telephone_client_standard.sql';
const NOUVEAU = fs.readFileSync(path.join(DOSSIER, FICHIER), 'utf8');
const ANCIEN = execFileSync('git', ['show', '96e4e6638:src/main/resources/db/migration/' + FICHIER], { cwd: DOSSIER, encoding: 'utf8' });
const BASE = 'e2e_v6940_' + process.pid;
if (!/^e2e_v6940_\d+$/.test(BASE)) { process.exit(1); }
const sql = (s, db) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ...(db ? [db] : []), '-sN'], { input: s, encoding: 'utf8' }).trim();

/* [id, adresse, type, date de création, numéro attendu ou null] */
const CLIENTS = [
  ['C01', '', '6', '2020-01-01', null],
  ['C02', null, '6', '2020-01-02', null],
  ['C03', '   ', '6', '2020-01-03', null],
  ['C04', '..--()', '6', '2020-01-04', null],
  ['C05', '+', '6', '2020-01-05', null],
  ['C06', '0707070707', '6', '2020-01-06', '0707070707'],
  ['C07', '07 07 07 07 08', '6', '2020-01-07', '0707070708'],
  ['C08', '+225 05.05.05.05.05', '6', '2020-01-08', '0505050505'],
  ['C09', '00225-01-01-01-01-01', '6', '2020-01-09', '0101010101'],
  ['C10', '(225) 0102030405', '6', '2020-01-10', '0102030405'],
  ['C11', '0907070707', '6', '2020-01-11', null],
  ['C12', '070707070', '6', '2020-01-12', null],
  ['C13', '07070707070', '6', '2020-01-13', null],
  ['C14', 'O707070707', '6', '2020-01-14', null],
  ['C15', 'Rue des jardins', '6', '2020-01-15', null],
  ['C16', '0707070707', '6', '2021-05-05', null],
  ['C17', '0505050506', '1', '2020-01-17', null],
  ['C18', '', '2', '2020-01-18', null],
  ['C19', '00225', '6', '2020-01-19', null],
  ['C20', '225', '6', '2020-01-20', null],
  ['C21', '2250707070799', '6', '2020-01-21', '0707070799'],
  ['C22', '05-05-05-05-07 ', '6', '2020-01-22', '0505050507'],
];

function preparer() {
  sql('DROP DATABASE IF EXISTS `' + BASE + '`; CREATE DATABASE `' + BASE + '` CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci');
  sql('CREATE TABLE t_client (lg_CLIENT_ID VARCHAR(40) NOT NULL PRIMARY KEY, str_ADRESSE VARCHAR(50) NULL, lg_TYPE_CLIENT_ID VARCHAR(40) NULL, dt_CREATED DATETIME NULL) DEFAULT CHARSET=utf8mb3;'
    + 'INSERT INTO t_client VALUES ' + CLIENTS.map((c) => "('" + c[0] + "', " + (c[1] === null ? 'NULL' : "'" + c[1] + "'") + ", '" + c[2] + "', '" + c[3] + "')").join(', '), BASE);
}
const telephones = () => sql("SELECT GROUP_CONCAT(CONCAT(lg_CLIENT_ID, '=', IFNULL(str_TELEPHONE, '-')) ORDER BY lg_CLIENT_ID) FROM t_client", BASE);
const attendu = CLIENTS.map((c) => c[0] + '=' + (c[4] || '-')).join(',');

try {
  /* 1. garde-fou sur toutes les migrations */
  const fautives = fs.readdirSync(DOSSIER).filter((f) => f.endsWith('.sql')).flatMap((f) => fs.readFileSync(path.join(DOSSIER, f), 'utf8').split('\n')
    .filter((l) => /\bREGEXP\b/i.test(l) && !/^\s*--/.test(l) && !/CONCAT\('#',[^)]*\)\s+REGEXP\s+'\^#/i.test(l)).map((l) => f + ' : ' + l.trim()));
  ok('1. Aucune migration ne soumet à REGEXP une valeur qui peut être vide', fautives.length === 0, fautives.join(' || '));
  ok('1. Ancien script : il le faisait (preuve du garde-fou)', /x\.numero REGEXP '\^0\[157\]/.test(ANCIEN));

  /* 2. memes numeros retenus */
  preparer();
  sql(ANCIEN, BASE);
  const avecAncien = telephones();
  preparer();
  sql(NOUVEAU, BASE);
  const avecNouveau = telephones();
  ok('2. Mêmes numéros retenus par l\'ancien et le nouveau script (22 clients)', avecAncien === avecNouveau, avecAncien + ' <> ' + avecNouveau);
  ok('2. Numéros attendus : vides, séparateurs, mauvaise longueur, lettre O, autres types et doublon plus récent : aucun ; indicatifs retirés', avecNouveau === attendu, avecNouveau);
  ok('2. Colonne générée et index unique : seuls les clients standards ont un numéro dans telephone_standard',
    sql("SELECT COUNT(*) FROM t_client WHERE telephone_standard IS NOT NULL", BASE) === String(CLIENTS.filter((c) => c[4]).length)
    && sql("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_client' AND INDEX_NAME = 'uk_client_telephone_standard' AND NON_UNIQUE = 0", BASE) === '1');

  /* 3. rejouable */
  let erreur = '';
  try { sql(NOUVEAU, BASE); sql(NOUVEAU, BASE); } catch (e) { erreur = String(e.stderr || e.message).slice(0, 300); }
  ok('3. Rejoué deux fois : aucune erreur, aucun changement', !erreur && telephones() === avecNouveau, erreur);
} catch (e) {
  ok('Parcours sans exception', false, String(e.stderr || e.stack).slice(0, 600));
} finally {
  sql('DROP DATABASE IF EXISTS `' + BASE + '`');
  ok('Base jetable supprimée', sql("SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '" + BASE + "'") === '0');
  const ko = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
}
