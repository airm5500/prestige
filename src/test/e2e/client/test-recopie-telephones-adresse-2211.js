/* SCRIPT DE RECOPIE DES NUMEROS SAISIS DANS L'ADRESSE (plan du 21/11, point 7) :
 * outils/officine/recopier-telephones-depuis-adresse.sql, a lancer a la main.
 *
 *  - coherence : 4 000 saisies tirees au hasard (graine fixe : numeros conformes, zero de tete perdu, +225, 00225,
 *    fixes, 8 chiffres, texte, separateurs varies, tabulations, espace insecable) passees dans les instructions memes
 *    du script = reference Java de l'ecran (TelephoneCi apres le zero de tete retabli) ; les deux blocs de lecture du
 *    script (Adresse, Telephone) sont identiques ;
 *  - aperçu (@ecrire = 0) : comptes exacts pour 18 fiches d'essai variees, rien d'ecrit dans toute la base ;
 *  - recopie (@ecrire = 1) : chaque fiche d'essai a exactement le telephone attendu ; doublons du meme type
 *    ecartes, autre type accepte, telephone deja rempli et client desactive intacts ; Adresse jamais modifiee ;
 *    nombre de fiches recopiees = aperçu = lignes de sauvegarde = fiches mises a jour ; aucun numero affiche ;
 *  - relance : rien de plus ; retour arriere du script : la base revient exactement a son etat de depart.
 * Fiches d'essai retirees, table de sauvegarde remise dans son etat.
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
const RACINE = path.join(__dirname, '../../../..');
const SCRIPT = fs.readFileSync(path.join(RACINE, 'outils/officine/recopier-telephones-depuis-adresse.sql'), 'utf8').replace(/\r\n/g, '\n');
const JAVA = process.env.JAVA11 || 'C:\\Program Files\\AdoptOpenJDK\\jdk-11.0.9.101-hotspot\\bin\\java.exe';

/* reference Java : saisies -> numero local ou « - » */
function reference(saisies) {
  const entree = saisies.map((x) => Buffer.from(x, 'utf8').toString('hex')).join('\n') + '\n';
  return execFileSync(JAVA, ['-cp', [path.join(RACINE, 'target/classes'), path.join(RACINE, 'target/prestige/WEB-INF/lib/*')].join(path.delimiter), path.join(__dirname, '../outils/TelephoneCiLot.java')],
    { input: entree, encoding: 'utf8', maxBuffer: 64 << 20 }).split(/\r?\n/).slice(0, saisies.length);
}
/* graine fixe */
let graine = 2211071;
const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const choix = (t) => t[Math.floor(hasard() * t.length)];
const chiffres = (n) => Array.from({ length: n }, () => Math.floor(hasard() * 10)).join('');
function tirer() {
  const mobile = choix(['01', '05', '07']) + chiffres(8);
  const brut = choix([mobile, mobile, mobile.slice(1), '+225' + mobile, '00225' + mobile, '225' + mobile, choix(['21', '25', '27']) + chiffres(8),
    chiffres(8), chiffres(choix([7, 9, 11, 12])), choix(['03', '09', '10']) + chiffres(8), 'Cocody ' + chiffres(3), 'BP ' + chiffres(4) + ' Abidjan', '', '+', '()']);
  /* separateurs inseres au hasard */
  let s = '';
  for (const c of brut) {
    if (hasard() < 0.25) { s += choix([' ', ' ', '.', '-', '(', ')', '\t', '\u00a0', '/', '_']); }
    s += c;
  }
  if (hasard() < 0.15) { s = choix([' ', '  ', '\t']) + s + choix([' ', '']); }
  if (hasard() < 0.05) { s = s.replace(/\d/, 'O'); }
  return s.slice(0, 50);
}
/* les instructions du script qui lisent l'Adresse, appliquees a une table de saisies */
function blocLecture(table) {
  const debut = SCRIPT.indexOf(`CREATE TEMPORARY TABLE ${table} AS`);
  const fin = SCRIPT.indexOf(table === 'rta_adresse' ? '-- Même règle pour le Téléphone' : '-- Fiches visées');
  return SCRIPT.slice(debut, fin);
}
const lancer = (ecrire) => {
  const s = ecrire ? SCRIPT.replace('SET @ecrire = 0;', 'SET @ecrire = 1;') : SCRIPT;
  const l = q(s).split(/\r?\n/);
  const a = l[0].split('\t').map(Number);
  return { aRecopier: a[0], doublons: a[1], nonConforme: a[2], dejaRempli: a[3], recopiees: Number(l[1]), encore: l[2], brut: l };
};
/* empreinte de toute la table, sans rien afficher */
const empreinte = (champs, ou) => q(`SELECT CONCAT(COUNT(*), ':', BIT_XOR(CRC32(CONCAT_WS('|', lg_CLIENT_ID, ${champs}))), ':', SUM(CRC32(CONCAT_WS('|', lg_CLIENT_ID, ${champs})))) FROM t_client ${ou || ''}`);
const TOUT = "IFNULL(str_TELEPHONE, '~'), IFNULL(str_ADRESSE, '~'), IFNULL(dt_UPDATED, '~'), str_STATUT";
const ADRESSES = "IFNULL(str_ADRESSE, '~')";

const PFX = 'E2E-RTA-';
/* [n°, type, telephone, adresse, statut, attendu (telephone apres recopie, '=' : inchange)] */
const JEU = [
  ['01', '1', null, '0100990101', 'enable', '0100990101'],
  ['02', '1', null, '01 00 99 01 02', 'enable', '0100990102'],
  ['03', '1', '', '+225 01.00.99.01.03', 'enable', '0100990103'],
  ['04', '1', null, '100990104', 'enable', '0100990104'],
  ['05', '1', null, 'Cocody Angré', 'enable', '='],
  ['06', '1', '0100990199', '0100990106', 'enable', '='],
  ['07', '1', null, '27 22 00 99 07', 'enable', '='],
  ['08', '1', null, '00990108', 'enable', '='],
  ['09', '1', null, '0100990109', 'enable', '='],
  ['10', '1', null, '01-00-99-01-09', 'enable', '='],
  ['11', '6', null, '0100990109', 'enable', '0100990109'],
  ['12', '1', null, '0100990112', 'enable', '='],
  ['13', '1', '01 00 99 01 12', 'Plateau', 'enable', '='],
  ['14', '1', null, '0100990114', 'disable', '='],
  ['15', '1', '   ', '05 00 99 01 15', 'enable', '0500990115'],
  ['16', '6', null, '0700990116', 'enable', '0700990116'],
  ['17', '1', null, '00225 0100990117', 'enable', '0100990117'],
  ['18', '1', null, '2250100990118', 'enable', '0100990118']
];
const sql = (v) => (v === null ? 'NULL' : "'" + v.replace(/'/g, "''") + "'");
const fiches = () => q(`SELECT CONCAT_WS('|', SUBSTRING(lg_CLIENT_ID, 9), IFNULL(str_TELEPHONE, '~'), IFNULL(str_ADRESSE, '~')) FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}%' ORDER BY lg_CLIENT_ID`).split(/\r?\n/);
const nettoyer = () => q(`DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}%';`);
const tableExiste = () => q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_client_telephone_recopie'") === '1';

(function () {
  nettoyer();
  const tableAvant = tableExiste();
  const recopiesAvant = tableAvant ? q('SELECT COUNT(*) FROM t_client_telephone_recopie') : '0';
  let date = null;
  try {
    ok('Préalable : numéros fictifs 0x00990xxx libres dans la base', q("SELECT COUNT(*) FROM t_client WHERE REGEXP_REPLACE(CONCAT(IFNULL(str_TELEPHONE, ''), '#', IFNULL(str_ADRESSE, '')), '[^0-9#]', '') REGEXP '0[157]00990|[157]00990[0-9]{3}'") === '0');

    /* 1. coherence : lecture du script = reference Java */
    const saisies = Array.from({ length: 4000 }, tirer).concat(JEU.map((x) => x[3]));
    const attendu = reference(saisies);
    const valeurs = saisies.map((x, i) => `(${i}, CONVERT(UNHEX('${Buffer.from(x, 'utf8').toString('hex')}') USING utf8mb4))`);
    const lecture = blocLecture('rta_adresse').replace("FROM t_client c\nWHERE c.str_STATUT = 'enable';",
      'FROM (SELECT k AS lg_CLIENT_ID, NULL AS lg_TYPE_CLIENT_ID, NULL AS str_TELEPHONE, x AS str_ADRESSE FROM rta_saisies) c;');
    if (lecture.indexOf('rta_saisies') < 0) { throw new Error('bloc de lecture du script introuvable'); }
    const obtenu = q('CREATE TEMPORARY TABLE rta_saisies (k INT PRIMARY KEY, x VARCHAR(80)) DEFAULT CHARSET = utf8mb4;'
      + 'INSERT INTO rta_saisies VALUES ' + valeurs.join(',') + ';' + lecture
      + "SELECT IFNULL(numero, '-') FROM rta_adresse ORDER BY id + 0;").split(/\r?\n/);
    const ecarts = [];
    saisies.forEach((x, i) => { if (obtenu[i] !== attendu[i]) { ecarts.push(JSON.stringify(x) + ' : script ' + obtenu[i] + ' / écran ' + attendu[i]); } });
    const conformes = attendu.filter((x) => x !== '-').length;
    ok('Cohérence : 4 018 saisies, le script retient exactement le numéro de l\'écran (ou le refuse comme lui)', ecarts.length === 0 && obtenu.length === saisies.length,
      ecarts.length + ' écarts : ' + ecarts.slice(0, 5).join(' ; '));
    ok('Cohérence : jeu varié (conformes et refusés en nombre)', conformes > 600 && saisies.length - conformes > 1000, conformes + ' conformes sur ' + saisies.length);
    const regle = (t, col) => { const b = blocLecture(t).split(t).join('T').split(col).join('C'); return b.slice(b.indexOf('REGEXP_REPLACE')).replace(/FROM t_client c[\s\S]*?;/, ''); };
    ok('Le Téléphone des autres fiches est lu par la même règle que l\'Adresse', regle('rta_adresse', 'str_ADRESSE') === regle('rta_telephone', 'str_TELEPHONE')
      && regle('rta_adresse', 'str_ADRESSE').length > 300, regle('rta_adresse', 'str_ADRESSE').length);

    /* 2. apercu : comptes exacts, rien d'ecrit */
    const base0 = lancer(false);
    const tout0 = empreinte(TOUT);
    q(JEU.map((x) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
      + ` dt_CREATED, dt_UPDATED) VALUES ('${PFX}${x[0]}', 'ZZRTA${x[0]}', 'ESSAI', ${sql(x[2])}, ${sql(x[3])}, 'F', '${x[1]}', '${x[4]}',`
      + " '2025-01-01 10:00:00', '2025-01-01 10:00:00');").join(''));
    const fiches0 = fiches();
    const toutAvant = empreinte(TOUT), adressesAvant = empreinte(ADRESSES);
    const ap = lancer(false);
    ok('Aperçu : 9 fiches d\'essai à recopier, 3 écartées (numéro déjà pris dans le type), 3 adresses non conformes, 2 téléphones déjà remplis',
      ap.aRecopier - base0.aRecopier === 9 && ap.doublons - base0.doublons === 3 && ap.nonConforme - base0.nonConforme === 3 && ap.dejaRempli - base0.dejaRempli === 2,
      JSON.stringify({ base0: [base0.aRecopier, base0.doublons, base0.nonConforme, base0.dejaRempli], apres: [ap.aRecopier, ap.doublons, ap.nonConforme, ap.dejaRempli] }));
    ok('Aperçu : rien n\'est écrit dans toute la base, aucune table de sauvegarde créée en plus', empreinte(TOUT) === toutAvant && base0.recopiees === 0 && ap.recopiees === 0
      && (tableExiste() ? q('SELECT COUNT(*) FROM t_client_telephone_recopie') : '0') === recopiesAvant && empreinte(TOUT, `WHERE lg_CLIENT_ID NOT LIKE '${PFX}%'`) === tout0);
    ok('Aperçu : seulement quatre nombres affichés, aucun numéro ni nom', /^\d+\t\d+\t\d+\t\d+$/.test(ap.brut[0]) && !ap.brut.some((l) => /0099|ZZRTA/.test(l)), ap.brut.join(' / '));

    /* 3. recopie */
    const parFiche = () => { const m = new Map(); q(`SELECT lg_CLIENT_ID, CRC32(CONCAT_WS('|', ${TOUT})) FROM t_client`).split(/\r?\n/).forEach((l) => { const [i, c] = l.split('\t'); m.set(i, c); }); return m; };
    const avantRecopie = parFiche();
    const rc = lancer(true);
    date = q('SELECT MAX(dt_recopie) FROM t_client_telephone_recopie');
    const apres = fiches();
    const defauts = [];
    JEU.forEach((x, i) => {
      const [, tel, adr] = apres[i].split('|');
      const telAvant = fiches0[i].split('|')[1];
      const voulu = x[5] === '=' ? telAvant : x[5];
      if (tel !== voulu || adr !== fiches0[i].split('|')[2]) { defauts.push(x[0] + ' : ' + tel + ' au lieu de ' + voulu); }
    });
    ok('Recopie : chaque fiche d\'essai a le téléphone attendu (conformes, espaces, +225, 00225, zéro perdu, téléphone blanc) ; doublons, texte, fixe, 8 chiffres, déjà rempli et désactivé intacts',
      defauts.length === 0, defauts.join(' ; '));
    ok('Recopie : même numéro accepté pour un autre type de client (11, standard), refusé dans le type (09, 10 assurés)', apres[10].split('|')[1] === '0100990109'
      && apres[8].split('|')[1] === '~' && apres[9].split('|')[1] === '~');
    ok('Recopie : nombre recopié = aperçu, contrôle à 0', rc.recopiees === ap.aRecopier && rc.encore === '0', JSON.stringify([rc.recopiees, ap.aRecopier, rc.encore]));
    const majDate = q(`SELECT COUNT(*) FROM t_client WHERE dt_UPDATED = '${date}'`);
    const sauvees = q(`SELECT COUNT(*) FROM t_client_telephone_recopie WHERE dt_recopie = '${date}'`);
    const sauveesEssai = q(`SELECT GROUP_CONCAT(SUBSTRING(lg_CLIENT_ID, 9) ORDER BY lg_CLIENT_ID) FROM t_client_telephone_recopie WHERE dt_recopie = '${date}' AND lg_CLIENT_ID LIKE '${PFX}%'`);
    ok('Bilan : fiches mises à jour = lignes de sauvegarde = fiches recopiées ; sauvegarde des fiches d\'essai = les 9 recopiées', Number(majDate) === rc.recopiees
      && Number(sauvees) === rc.recopiees && sauveesEssai === '01,02,03,04,11,15,16,17,18', [majDate, sauvees, rc.recopiees, sauveesEssai].join(' / '));
    ok('Bilan : aucune Adresse modifiée dans toute la base', empreinte(ADRESSES) === adressesAvant);
    const apresRecopie = parFiche();
    const changees = [...apresRecopie.keys()].filter((i) => avantRecopie.get(i) !== apresRecopie.get(i)).sort();
    const sauvegarde = q(`SELECT lg_CLIENT_ID FROM t_client_telephone_recopie WHERE dt_recopie = '${date}' ORDER BY lg_CLIENT_ID`).split(/\r?\n/).filter((x) => x).sort();
    ok('Bilan : les fiches modifiées sont exactement celles de la sauvegarde, aucune fiche ajoutée ni retirée', apresRecopie.size === avantRecopie.size
      && changees.join(',') === sauvegarde.join(','), changees.length + ' modifiées / ' + sauvegarde.length + ' sauvegardées');
    ok('Recopie : aucun numéro ni nom affiché', !rc.brut.some((l) => /0099|ZZRTA/.test(l)), rc.brut.join(' / '));

    /* 4. relance : plus rien a faire */
    const re = lancer(true);
    ok('Relance : plus aucune fiche à recopier, rien d\'écrit', re.aRecopier === 0 && re.recopiees === 0 && q(`SELECT COUNT(*) FROM t_client_telephone_recopie WHERE dt_recopie > '${date}'`) === '0',
      JSON.stringify([re.aRecopier, re.recopiees]));

    /* 5. retour arriere du script : etat de depart exact */
    const retour = SCRIPT.slice(SCRIPT.indexOf('-- UPDATE t_client c JOIN t_client_telephone_recopie')).split(/\r?\n/).map((l) => l.replace(/^-- ?/, '')).join('\n').replace("'<date>'", `'${date}'`);
    q(retour);
    ok('Retour arrière du script : toute la base revient exactement à son état d\'avant la recopie', empreinte(TOUT) === toutAvant);
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try {
      nettoyer();
      if (date) { q(`DELETE FROM t_client_telephone_recopie WHERE dt_recopie >= '${date}';`); }
      if (!tableAvant && tableExiste() && q('SELECT COUNT(*) FROM t_client_telephone_recopie') === '0') { q('DROP TABLE t_client_telephone_recopie;'); }
    } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : fiches d\'essai retirées, table de sauvegarde dans son état de départ', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}%'`) === '0'
      && tableExiste() === tableAvant);
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
