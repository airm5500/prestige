/* MIGRATIONS DU PLAN DU 24/11 SUR UNE COPIE DE BASE D'OFFICINE (V7.6.41.2202 horloge, V7.6.41.2203 ventes en saisie).
 *
 * Joue les deux scripts tels que Flyway les jouera au démarrage du serveur de l'officine, sur la copie locale
 * « appaul » (2,1 millions de ventes, arrêtée à la version 2201), puis :
 *  - durée de chaque script (Flyway les joue AU DÉMARRAGE : un script long retarde l'ouverture de l'application) ;
 *  - colonnes, index, tables, paramètres, droits et sous-menus créés, ni plus ni moins ;
 *  - droits donnés exactement aux profils prévus (écran de vente ou de vente en dépôt ; administrateur, super
 *    administrateur, pharmacien, compte admin) ;
 *  - ventes déjà en attente du jour (au moins une ligne) marquées EN_ATTENTE « avant la mise à jour » ; vente sans
 *    ligne, vente de la veille, vente clôturée : intactes ; aucune vente ni ligne ajoutée, retirée ou changée de statut ;
 *  - rejouées une seconde fois : aucune erreur, aucun doublon.
 * À la fin, la copie est remise exactement dans son état de départ (colonnes, index, tables, lignes).
 * Refuse toute autre base que la copie « appaul » : jamais une base de production.
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MIGRATION_BASE || 'appaul';
if (BASE !== 'appaul') { console.log('FAIL  Base refusée : ' + BASE + ' (seule la copie locale « appaul » est admise)'); process.exit(1); }
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', timeout: 1800000 }).trim();
const DOSSIER = path.join(__dirname, '..', '..', '..', 'main', 'resources', 'db', 'migration');
const M2202 = path.join(DOSSIER, 'V7.6.41.2202__horloge_controle.sql');
const M2203 = path.join(DOSSIER, 'V7.6.41.2203__ventes_saisie_attente.sql');
const PLAFOND_S = 120;
const PRIVS = ['P_VENTE_METTRE_EN_ATTENTE', 'P_VENTE_REPRENDRE_ATTENTE', 'P_VENTE_VOIR_EN_COURS', 'P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI', 'P_SM_JOURNAL_SAISIE_VENTE'];
const PLISTE = PRIVS.map((x) => "'" + x + "'").join(',');
const PARAMS = "'KEY_HORLOGE_SEUIL_ECART_MIN','KEY_HORLOGE_SEUIL_RECUL_MIN','KEY_HORLOGE_REGULARISATION_DUREE_H','KEY_HORLOGE_REGULARISATION_RECUL_J'";
const COLS = ['etat_saisie', 'saisie_poste', 'saisie_session', 'saisie_signal', 'saisie_interruption', 'saisie_avant_maj'];

function jouer(fichier) {
  const debut = Date.now();
  execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE], { input: fs.readFileSync(fichier, 'utf8'), encoding: 'utf8', timeout: 1800000 });
  return Math.round((Date.now() - debut) / 100) / 10;
}
const schema = () => q("SELECT GROUP_CONCAT(CONCAT(COLUMN_NAME, ':', COLUMN_TYPE, ':', IS_NULLABLE) ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement'")
  + ' || ' + q("SELECT GROUP_CONCAT(DISTINCT INDEX_NAME ORDER BY INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement'")
  + ' || ' + q("SELECT IFNULL(GROUP_CONCAT(TABLE_NAME ORDER BY TABLE_NAME), '') FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME LIKE 'horloge%' OR TABLE_NAME = 'vente_journal_saisie')")
  /* format de ligne de la table (COMPACT déclaré, à la limite de taille) : la migration et la remise en l'état le gardent */
  + ' || ' + q("SELECT CONCAT(ROW_FORMAT, '/', CREATE_OPTIONS) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement'");
const comptes = () => q("SELECT CONCAT_WS('/', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM t_preenregistrement_detail), (SELECT COUNT(*) FROM t_privilege),"
  + ' (SELECT COUNT(*) FROM t_role_privelege), (SELECT COUNT(*) FROM t_sous_menu), (SELECT COUNT(*) FROM t_parameters))');
const statuts = () => q("SELECT GROUP_CONCAT(CONCAT(IFNULL(str_STATUT, '-'), '=', n) ORDER BY str_STATUT) FROM (SELECT str_STATUT, COUNT(*) n FROM t_preenregistrement GROUP BY str_STATUT) x");

const FIX = [
  /* id, statut, nature, jour, lignes, attendu */
  ['E2E-MIG-1', 'is_Process', '1', 'NOW()', 2, 'EN_ATTENTE/1'],
  ['E2E-MIG-2', 'pending', '3', 'NOW()', 1, 'EN_ATTENTE/1'],
  ['E2E-MIG-3', 'is_Process', '1', 'NOW()', 0, '-/0'],
  ['E2E-MIG-4', 'is_Process', '1', 'NOW() - INTERVAL 1 DAY', 1, '-/0'],
  ['E2E-MIG-5', 'is_Closed', '1', 'NOW()', 1, '-/0'],
];
let cree = false;

function retirer(avecSchema) {
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-MIG-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-MIG-%'");
  if (!avecSchema) { return; }
  q('DELETE rp FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME IN (' + PLISTE + ');'
    + ' DELETE FROM t_privilege WHERE str_NAME IN (' + PLISTE + ');'
    + " DELETE FROM t_sous_menu WHERE str_COMPOSANT IN ('ventesencourssaisie', 'journalsaisievente');"
    + ' DELETE FROM t_parameters WHERE str_KEY IN (' + PARAMS + ');'
    + ' DROP TABLE IF EXISTS vente_journal_saisie; DROP TABLE IF EXISTS horloge_trace; DROP TABLE IF EXISTS horloge_repere;');
  if (q("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement' AND COLUMN_NAME = 'etat_saisie'") === '1') {
    q('ALTER TABLE t_preenregistrement DROP KEY idx_preenregistrement_etat_saisie, ' + COLS.map((c) => 'DROP COLUMN ' + c).join(', '));
  }
}

(async () => {
  /* état de départ : la copie n'a encore rien de ce plan (sinon on ne touche à rien) */
  const vierge = q("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement' AND COLUMN_NAME = 'etat_saisie'") === '0'
    && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME LIKE 'horloge%' OR TABLE_NAME = 'vente_journal_saisie')") === '0'
    && q('SELECT COUNT(*) FROM t_privilege WHERE str_NAME IN (' + PLISTE + ')') === '0' && q('SELECT COUNT(*) FROM t_parameters WHERE str_KEY IN (' + PARAMS + ')') === '0'
    && q("SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT IN ('ventesencourssaisie', 'journalsaisievente')") === '0';
  ok('Préparation : copie d\'officine « appaul » sans rien de ce plan (version ' + q('SELECT version FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1') + ')', vierge);
  if (!vierge) { console.log('\n0/1 : copie déjà touchée, rien n\'est fait'); process.exit(1); }
  const schema0 = schema();
  retirer(false);
  const comptes0 = comptes();
  cree = true;
  try {
    for (const [id, statut, nature, jour, lignes] of FIX) {
      q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_STATUT, lg_NATURE_VENTE_ID, lg_TYPE_VENTE_ID, int_PRICE, dt_CREATED, dt_UPDATED)"
        + " VALUES ('" + id + "', '" + id + "', '" + statut + "', '" + nature + "', '1', 1000, " + jour + ', ' + jour + ')');
      for (let i = 0; i < lignes; i++) {
        q("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, int_QUANTITY, int_PRICE, prixAchat, str_STATUT, dt_CREATED, dt_UPDATED)"
          + " VALUES ('" + id + '-L' + i + "', '" + id + "', 1, 500, 300, '" + statut + "', " + jour + ', ' + jour + ')');
      }
    }
    const statuts0 = statuts();
    const comptesAvecFixtures = comptes();
    const attenteDuJour = q("SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT IN ('is_Process', 'pending') AND p.dt_UPDATED >= CURDATE()"
      + ' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)');
    const roles1 = q("SELECT GROUP_CONCAT(DISTINCT rp.lg_ROLE_ID ORDER BY rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE m.str_NAME IN ('P_SM_CLOTURER_CAISSE', 'P_SM_VENTEDEPOT')");
    const roles2 = q("SELECT GROUP_CONCAT(DISTINCT r ORDER BY r) FROM (SELECT rp.lg_ROLE_ID r FROM t_role_privelege rp JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE m.str_NAME IN ('P_PROFIL_SUPER_ADMIN', 'P_PROFIL_ADMIN', 'P_PROFIL_PHARMACIEN') UNION SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'admin') x");
    const menu = q("SELECT lg_MENU_ID FROM t_sous_menu WHERE str_COMPOSANT = 'suppressionsvente' LIMIT 1");
    ok('Préparation : 5 ventes d\'essai (2 en attente du jour avec lignes, 1 sans ligne, 1 de la veille, 1 clôturée) ; sous-menu de référence présent',
      attenteDuJour === '2' && !!menu, attenteDuJour + ' / menu ' + menu);

    const d1 = jouer(M2202);
    const d2 = jouer(M2203);
    ok('Durée au démarrage : V2202 ' + d1 + ' s, V2203 ' + d2 + ' s (plafond ' + PLAFOND_S + ' s chacune, 2,1 millions de ventes)', d1 < PLAFOND_S && d2 < PLAFOND_S, d1 + ' / ' + d2);

    ok('Colonnes et index ajoutés à t_preenregistrement, rien d\'autre',
      q("SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement' AND COLUMN_NAME IN ('" + COLS.join("','") + "')") === COLS.join(',')
      && q("SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement' AND INDEX_NAME = 'idx_preenregistrement_etat_saisie'") === '1'
      && schema().split(' || ')[0] === schema0.split(' || ')[0] + ',' + ['etat_saisie:varchar(20):YES', 'saisie_poste:varchar(100):YES', 'saisie_session:varchar(64):YES', 'saisie_signal:datetime(3):YES',
        'saisie_interruption:varchar(40):YES', 'saisie_avant_maj:tinyint(4):NO'].join(','), schema().split(' || ')[0].split(',').slice(-7).join(','));
    ok('Tables créées : horloge_repere (1 ligne), horloge_trace, vente_journal_saisie (vides)', schema().split(' || ')[2] === 'horloge_repere,horloge_trace,vente_journal_saisie'
      && q('SELECT COUNT(*) FROM horloge_repere') === '1' && q('SELECT COUNT(*) FROM horloge_trace') === '0' && q('SELECT COUNT(*) FROM vente_journal_saisie') === '0');
    ok('Format de ligne de t_preenregistrement inchangé (' + schema0.split(' || ')[3] + ')', schema().split(' || ')[3] === schema0.split(' || ')[3], schema().split(' || ')[3]);
    ok('Paramètres de l\'horloge : 4, valeurs par défaut 30 / 30 / 24 / 7', q('SELECT GROUP_CONCAT(CONCAT(str_KEY, \'=\', str_VALUE) ORDER BY str_KEY) FROM t_parameters WHERE str_KEY IN (' + PARAMS + ')')
      === 'KEY_HORLOGE_REGULARISATION_DUREE_H=24,KEY_HORLOGE_REGULARISATION_RECUL_J=7,KEY_HORLOGE_SEUIL_ECART_MIN=30,KEY_HORLOGE_SEUIL_RECUL_MIN=30');
    ok('Droits : les 5 créés, une seule fois chacun', q('SELECT GROUP_CONCAT(str_NAME ORDER BY str_NAME) FROM t_privilege WHERE str_NAME IN (' + PLISTE + ')') === [...PRIVS].sort().join(','));
    const donne = (nom) => q("SELECT IFNULL(GROUP_CONCAT(rp.lg_ROLE_ID ORDER BY rp.lg_ROLE_ID), '') FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = '" + nom + "'");
    ok('« Mettre en attente » et « reprendre une vente en attente » : exactement les profils qui ont l\'écran de vente ou de vente en dépôt (' + roles1.split(',').length + ' profils) : rien ne change pour eux',
      donne('P_VENTE_METTRE_EN_ATTENTE') === roles1 && donne('P_VENTE_REPRENDRE_ATTENTE') === roles1, roles1);
    ok('« Voir », « reprendre celle d\'un autre », « journal » : exactement administrateur, super administrateur, pharmacien, compte admin (' + roles2.split(',').length + ' profils)',
      ['P_VENTE_VOIR_EN_COURS', 'P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI', 'P_SM_JOURNAL_SAISIE_VENTE'].every((x) => donne(x) === roles2), roles2);
    ok('Sous-menus : les deux, sous le même menu que « suppressions de vente », chacun avec son droit',
      q("SELECT GROUP_CONCAT(CONCAT(str_COMPOSANT, '/', P_KEY, '/', lg_MENU_ID = '" + menu + "', '/', str_Status) ORDER BY str_COMPOSANT) FROM t_sous_menu WHERE str_COMPOSANT IN ('ventesencourssaisie', 'journalsaisievente')")
      === 'journalsaisievente/P_SM_JOURNAL_SAISIE_VENTE/1/enable,ventesencourssaisie/P_VENTE_VOIR_EN_COURS/1/enable');
    const marques = q("SELECT GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, ':', IFNULL(etat_saisie, '-'), '/', saisie_avant_maj) ORDER BY lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-MIG-%'");
    ok('Ventes en attente du jour (vente et dépôt, avec lignes) : EN_ATTENTE « avant la mise à jour » ; sans ligne, de la veille, clôturée : intactes',
      marques === FIX.map((f) => f[0] + ':' + f[5]).join(','), marques);
    ok('Aucune autre vente marquée (sur 2,1 millions)', q('SELECT COUNT(*) FROM t_preenregistrement WHERE etat_saisie IS NOT NULL OR saisie_avant_maj <> 0') === attenteDuJour);
    ok('Aucune vente ni ligne ajoutée ou retirée, aucun statut changé', statuts() === statuts0 && comptes().split('/').slice(0, 2).join('/') === comptesAvecFixtures.split('/').slice(0, 2).join('/'), statuts());
    const ajoutes = comptes().split('/').map(Number), avant = comptesAvecFixtures.split('/').map(Number);
    const attenduRp = roles1.split(',').length * 2 + roles2.split(',').length * 3;
    ok('Bilan : exactement 5 droits, ' + attenduRp + ' attributions, 2 sous-menus, 4 paramètres ajoutés', ajoutes[2] - avant[2] === 5 && ajoutes[3] - avant[3] === attenduRp
      && ajoutes[4] - avant[4] === 2 && ajoutes[5] - avant[5] === 4, ajoutes.map((x, i) => x - avant[i]).join('/'));

    /* rejouees : aucune erreur, aucun doublon */
    const apres1 = comptes() + statuts() + schema() + marques;
    let erreur = '';
    try { jouer(M2202); jouer(M2203); } catch (e) { erreur = String(e.stderr || e.message).slice(0, 300); }
    ok('Rejouées une seconde fois : aucune erreur, aucun doublon, rien ne change', !erreur && comptes() + statuts() + schema()
      + q("SELECT GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, ':', IFNULL(etat_saisie, '-'), '/', saisie_avant_maj) ORDER BY lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-MIG-%'") === apres1, erreur);
  } catch (e) {
    ok('Parcours sans exception', false, String(e.stderr || e.stack).slice(0, 600));
  } finally {
    if (cree) { retirer(true); }
    ok('Copie remise dans son état de départ : mêmes colonnes, index et tables ; mêmes nombres de ventes, lignes, droits, attributions, sous-menus, paramètres',
      schema() === schema0 && comptes() === comptes0, comptes() + ' / ' + comptes0);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
