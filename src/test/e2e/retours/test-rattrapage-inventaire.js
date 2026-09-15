/* Rattrapage des inventaires clotures par l'API REST avant le correctif du 13/09
 * (migration V6.9.36) : les quatre ecritures perdues sont retablies, datees du jour reel de la cloture, sans
 * toucher au stock rayon ni aux inventaires deja complets. Le script est rejoue une seconde fois pour verifier
 * qu'il n'ecrit rien de plus. Tout ce que le test pose est retire et les valeurs d'origine sont retablies. */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const script = '/home/user/prestige/src/main/resources/db/migration/V6.9.36__rattrapage_cloture_inventaire_rest.sql';
const jouerScript = () => execFileSync('bash', ['-c', 'mariadb ' + BASE + ' < ' + script], { encoding: 'utf8' });

const A = 'E2E-RATT-REST';      // cloture par l'ancienne version REST : a rattraper
const B = 'E2E-RATT-COMPLET';   // cloture complete (mouvement du jour present) : a ignorer
const C = 'E2E-RATT-RESERVE';   // inventaire reserve : a ignorer
const JOUR = q("SELECT DATE_FORMAT(NOW() - INTERVAL 5 DAY, '%Y-%m-%d')");
const CLOTURE = JOUR + ' 09:30:00';

function poser() {
  nettoyer();
  exec("DROP TABLE IF EXISTS e2e_ratt_sauvegarde;"
    + "CREATE TABLE e2e_ratt_sauvegarde AS SELECT f.lg_FAMILLE_ID, f.dt_LAST_INVENTAIRE, s.lg_FAMILLE_STOCK_ID,"
    + " s.int_NUMBER, s.int_NUMBER_AVAILABLE, s.dt_UPDATED,"
    + " (SELECT t.int_NUMBER FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable' LIMIT 1) AS type_stock,"
    + " (SELECT t.dt_UPDATED FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable' LIMIT 1) AS type_dt"
    + " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.int_PAF>0 AND s.int_NUMBER_AVAILABLE>10"
    + "  AND EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable')"
    + "  AND NOT EXISTS (SELECT 1 FROM t_mouvement m WHERE m.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND m.dt_DAY='" + JOUR + "')"
    + " ORDER BY f.lg_FAMILLE_ID LIMIT 12;");
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  /* A : les 6 premiers produits, 4 en ecart. Cloture « ancienne version REST » : stock rayon a jour et
     HMvtProduit ecrit, mais ni mouvement du jour, ni instantane, ni date produit, ni stock par type. */
  exec("INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID)"
    + " VALUES ('" + A + "', 'E2E rattrapage REST', 'E2E', 'emplacement', 'is_Closed', '" + CLOTURE + "', '" + CLOTURE + "', '" + user + "', '1'),"
    + "        ('" + B + "', 'E2E rattrapage complet', 'E2E', 'emplacement', 'is_Closed', '" + CLOTURE + "', '" + CLOTURE + "', '" + user + "', '1'),"
    + "        ('" + C + "', 'E2E rattrapage reserve', 'E2E', 'reserve', 'is_Closed', '" + CLOTURE + "', '" + CLOTURE + "', '" + user + "', '1');"
    /* lignes de A : ecart sur les 4 premieres */
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)"
    + " SELECT '" + A + "', b.lg_FAMILLE_ID, IF(x.rn<=4, b.int_NUMBER_AVAILABLE - 2, b.int_NUMBER_AVAILABLE), b.int_NUMBER_AVAILABLE,"
    + "        IF(x.rn<=4, 'is_Closed', 'enable'), '" + CLOTURE + "', '" + CLOTURE + "', 1, '', b.lg_FAMILLE_STOCK_ID"
    + " FROM e2e_ratt_sauvegarde b JOIN (SELECT lg_FAMILLE_ID, ROW_NUMBER() OVER (ORDER BY lg_FAMILLE_ID) rn FROM e2e_ratt_sauvegarde) x"
    + "   ON x.lg_FAMILLE_ID=b.lg_FAMILLE_ID WHERE x.rn<=6;"
    /* lignes de B : 3 produits suivants, 2 en ecart */
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)"
    + " SELECT '" + B + "', b.lg_FAMILLE_ID, IF(x.rn<=9, b.int_NUMBER_AVAILABLE - 1, b.int_NUMBER_AVAILABLE), b.int_NUMBER_AVAILABLE,"
    + "        'is_Closed', '" + CLOTURE + "', '" + CLOTURE + "', 1, '', b.lg_FAMILLE_STOCK_ID"
    + " FROM e2e_ratt_sauvegarde b JOIN (SELECT lg_FAMILLE_ID, ROW_NUMBER() OVER (ORDER BY lg_FAMILLE_ID) rn FROM e2e_ratt_sauvegarde) x"
    + "   ON x.lg_FAMILLE_ID=b.lg_FAMILLE_ID WHERE x.rn BETWEEN 7 AND 9;"
    /* lignes de C (reserve) : les 3 derniers, tous en ecart */
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)"
    + " SELECT '" + C + "', b.lg_FAMILLE_ID, b.int_NUMBER_AVAILABLE + 3, b.int_NUMBER_AVAILABLE, 'is_Closed', '" + CLOTURE + "', '" + CLOTURE + "', 1, '', b.lg_FAMILLE_STOCK_ID"
    + " FROM e2e_ratt_sauvegarde b JOIN (SELECT lg_FAMILLE_ID, ROW_NUMBER() OVER (ORDER BY lg_FAMILLE_ID) rn FROM e2e_ratt_sauvegarde) x"
    + "   ON x.lg_FAMILLE_ID=b.lg_FAMILLE_ID WHERE x.rn>=10;");
  /* historique HMvtProduit : ce que l'ancienne version REST ecrivait, pour A et B (pas pour la reserve) */
  exec("INSERT INTO HMvtProduit (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug)"
    + " SELECT UUID(), 1, '" + CLOTURE + "', '" + JOUR + "', CAST(f.lg_INVENTAIRE_FAMILLE_ID AS CHAR), IFNULL(fa.int_PAF,0), IFNULL(fa.int_PRICE,0),"
    + "        f.int_NUMBER_INIT, f.int_NUMBER, f.int_NUMBER, 0, '1', f.lg_FAMILLE_ID, '" + user + "', '04', 0"
    + " FROM t_inventaire_famille f JOIN t_famille fa ON fa.lg_FAMILLE_ID=f.lg_FAMILLE_ID"
    + " WHERE f.lg_INVENTAIRE_ID IN ('" + A + "','" + B + "');");
  /* stock rayon deja mis a jour par la cloture, pour A et B */
  exec("UPDATE t_famille_stock s JOIN t_inventaire_famille f ON f.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID"
    + " SET s.int_NUMBER=f.int_NUMBER, s.int_NUMBER_AVAILABLE=f.int_NUMBER, s.dt_UPDATED='" + CLOTURE + "'"
    + " WHERE f.lg_INVENTAIRE_ID IN ('" + A + "','" + B + "') AND f.int_NUMBER<>f.int_NUMBER_INIT;");
  /* les ecritures perdues : date produit vidée et stock par type volontairement desaligne */
  exec("UPDATE t_famille f JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND i.lg_INVENTAIRE_ID='" + A + "' SET f.dt_LAST_INVENTAIRE=NULL;"
    /* seules les lignes en ecart avaient une ecriture a faire : ce sont elles qui sont restees desalignees */
    + "UPDATE t_type_stock_famille t JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID=t.lg_FAMILLE_ID AND i.lg_INVENTAIRE_ID='" + A + "' AND i.int_NUMBER<>i.int_NUMBER_INIT"
    + " SET t.int_NUMBER=999999 WHERE t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable';");
  /* B est complet : son mouvement du jour existe */
  exec("INSERT INTO t_mouvement (lg_MOUVEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, P_KEY, str_TYPE_ACTION, str_ACTION, dt_DAY, dt_CREATED, str_STATUT, int_NUMBER, int_NUMBERTRANSACTION, lg_EMPLACEMENT_ID)"
    + " SELECT UUID(), f.lg_FAMILLE_ID, '" + user + "', '', 'OTHER', 'INVENTAIRE', '" + JOUR + "', '" + CLOTURE + "', 'enable', f.int_NUMBER, 1, '1'"
    + " FROM t_inventaire_famille f WHERE f.lg_INVENTAIRE_ID='" + B + "' AND f.int_NUMBER<>f.int_NUMBER_INIT;");
  return user;
}
function nettoyer() {
  const ids = "('" + A + "','" + B + "','" + C + "')";
  try {
    exec("UPDATE t_famille_stock s JOIN e2e_ratt_sauvegarde b ON b.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID SET s.int_NUMBER=b.int_NUMBER, s.int_NUMBER_AVAILABLE=b.int_NUMBER_AVAILABLE, s.dt_UPDATED=b.dt_UPDATED;"
      + "UPDATE t_famille f JOIN e2e_ratt_sauvegarde b ON b.lg_FAMILLE_ID=f.lg_FAMILLE_ID SET f.dt_LAST_INVENTAIRE=b.dt_LAST_INVENTAIRE;"
      + "UPDATE t_type_stock_famille t JOIN e2e_ratt_sauvegarde b ON b.lg_FAMILLE_ID=t.lg_FAMILLE_ID SET t.int_NUMBER=b.type_stock, t.dt_UPDATED=b.type_dt WHERE t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable';"
      + "DELETE m FROM t_mouvement m JOIN e2e_ratt_sauvegarde b ON b.lg_FAMILLE_ID=m.lg_FAMILLE_ID WHERE m.dt_DAY='" + JOUR + "';"
      + "DELETE s FROM t_mouvement_snapshot s JOIN e2e_ratt_sauvegarde b ON b.lg_FAMILLE_ID=s.lg_FAMILLE_ID WHERE s.dt_DAY='" + JOUR + "';"
      + "DELETE h FROM HMvtProduit h JOIN t_inventaire_famille f ON CAST(f.lg_INVENTAIRE_FAMILLE_ID AS CHAR)=h.pkey WHERE f.lg_INVENTAIRE_ID IN " + ids + ";");
  } catch (e) { /* premiere execution : la sauvegarde n'existe pas encore */ }
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN " + ids + ";"
    + "DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN " + ids + ";");
  /* la table de trace n'existe qu'apres la premiere execution du script */
  try { exec("DELETE FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID IN " + ids + ";"); } catch (e) { }
  exec("DROP TABLE IF EXISTS e2e_ratt_sauvegarde;");
}

try {
  const user = poser();
  const ecartsA = Number(q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + A + "' AND int_NUMBER<>int_NUMBER_INIT"));
  ok('Jeu d essai : un inventaire REST incomplet (4 ecarts), un complet, un de reserve', ecartsA === 4
    && q("SELECT COUNT(*) FROM t_mouvement m JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=m.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + A + "' WHERE m.dt_DAY='" + JOUR + "'") === '0'
    && q("SELECT COUNT(*) FROM t_mouvement m JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=m.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + B + "' WHERE m.dt_DAY='" + JOUR + "'") === '3', 'ecarts A=' + ecartsA);

  /* ---------------------------------------------------------------- premiere execution */
  jouerScript();
  const trace = q("SELECT nbre_lignes_ecart, nbre_mouvements, nbre_snapshots, nbre_dates_produit, nbre_type_stock, dt_RATTRAPAGE IS NOT NULL FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID='" + A + "'").split('\t');
  ok('L inventaire incomplet est rattrape et trace', trace[0] === '4' && trace[1] === '4' && trace[2] === '4' && trace[3] === '4' && trace[4] === '4' && trace[5] === '1', trace.join('/'));
  const mvt = q("SELECT COUNT(*), SUM(m.int_NUMBER = f.int_NUMBER), SUM(m.dt_DAY = '" + JOUR + "'), SUM(m.str_ACTION='INVENTAIRE' AND m.str_TYPE_ACTION='OTHER' AND m.str_STATUT='enable'), SUM(m.lg_USER_ID='" + user + "' AND m.lg_EMPLACEMENT_ID='1'), SUM(DATE(m.dt_CREATED)='" + JOUR + "') FROM t_mouvement m JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=m.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + A + "' AND f.int_NUMBER<>f.int_NUMBER_INIT WHERE m.dt_DAY='" + JOUR + "'").split('\t');
  ok('Mouvement du jour : une ligne par produit en ecart, quantite comptee, datee du jour de la cloture', mvt.every(v => v === '4'), mvt.join('/'));
  const snap = q("SELECT COUNT(*), SUM(s.int_STOCK_JOUR = f.int_NUMBER), SUM(s.int_STOCK_DEBUT = f.int_NUMBER_INIT), SUM(s.dt_DAY='" + JOUR + "') FROM t_mouvement_snapshot s JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + A + "' AND f.int_NUMBER<>f.int_NUMBER_INIT WHERE s.dt_DAY='" + JOUR + "'").split('\t');
  ok('Instantane du jour : stock du jour = compte, stock de debut = initial', snap.every(v => v === '4'), snap.join('/'));
  ok('Date du dernier inventaire du produit posee a la date de cloture', q("SELECT COUNT(*) FROM t_famille fa JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=fa.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + A + "' AND f.int_NUMBER<>f.int_NUMBER_INIT WHERE fa.dt_LAST_INVENTAIRE='" + CLOTURE + "'") === '4');
  const typeStock = q("SELECT COUNT(*), SUM(t.int_NUMBER=s.int_NUMBER_AVAILABLE) FROM t_type_stock_famille t JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=t.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + A + "' AND f.int_NUMBER<>f.int_NUMBER_INIT JOIN t_famille_stock s ON s.lg_FAMILLE_ID=t.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID=t.lg_EMPLACEMENT_ID WHERE t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable'").split('\t');
  ok('Stock par type realigne sur le stock rayon d aujourd hui', typeStock[0] === typeStock[1] && Number(typeStock[0]) >= 4
    && q("SELECT COUNT(*) FROM t_type_stock_famille WHERE int_NUMBER=999999") === '0', typeStock.join('/'));
  ok('Le stock rayon n est pas touche : il reste la quantite comptee', q("SELECT COUNT(*) FROM t_famille_stock s JOIN t_inventaire_famille f ON f.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID WHERE f.lg_INVENTAIRE_ID='" + A + "' AND f.int_NUMBER<>f.int_NUMBER_INIT AND s.int_NUMBER_AVAILABLE=f.int_NUMBER") === '4');
  ok('Les lignes sans ecart ne recoivent rien', q("SELECT COUNT(*) FROM t_mouvement m JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=m.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + A + "' AND f.int_NUMBER=f.int_NUMBER_INIT WHERE m.dt_DAY='" + JOUR + "'") === '0');
  ok('L inventaire deja complet est ignore : ni trace, ni mouvement en plus', q("SELECT COUNT(*) FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID='" + B + "'") === '0'
    && q("SELECT COUNT(*) FROM t_mouvement m JOIN t_inventaire_famille f ON f.lg_FAMILLE_ID=m.lg_FAMILLE_ID AND f.lg_INVENTAIRE_ID='" + B + "' WHERE m.dt_DAY='" + JOUR + "'") === '3');
  ok('L inventaire de reserve est ignore', q("SELECT COUNT(*) FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID='" + C + "'") === '0');

  /* ---------------------------------------------------------------- deuxieme execution : rien de plus */
  const avant = q("SELECT (SELECT COUNT(*) FROM t_mouvement), (SELECT COUNT(*) FROM t_mouvement_snapshot), (SELECT dt_RATTRAPAGE FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID='" + A + "')");
  jouerScript();
  const apres = q("SELECT (SELECT COUNT(*) FROM t_mouvement), (SELECT COUNT(*) FROM t_mouvement_snapshot), (SELECT dt_RATTRAPAGE FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID='" + A + "')");
  ok('Rejoue une seconde fois, le script n ecrit rien de plus', avant === apres, avant + ' -> ' + apres);
  ok('Aucun inventaire ne reste a rattraper', q("SELECT COUNT(*) FROM t_inventaire i WHERE i.str_STATUT='is_Closed' AND i.dt_UPDATED IS NOT NULL AND IFNULL(i.str_TYPE,'')<>'reserve' AND EXISTS (SELECT 1 FROM t_inventaire_famille f WHERE f.lg_INVENTAIRE_ID=i.lg_INVENTAIRE_ID AND f.bool_INVENTAIRE=1 AND f.int_NUMBER<>f.int_NUMBER_INIT) AND EXISTS (SELECT 1 FROM t_inventaire_famille f JOIN HMvtProduit h ON h.pkey=CAST(f.lg_INVENTAIRE_FAMILLE_ID AS CHAR) AND h.typeMvt='04' WHERE f.lg_INVENTAIRE_ID=i.lg_INVENTAIRE_ID) AND NOT EXISTS (SELECT 1 FROM t_inventaire_famille f JOIN t_mouvement m ON m.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND m.str_ACTION='INVENTAIRE' AND m.dt_DAY=DATE(i.dt_UPDATED) AND m.lg_EMPLACEMENT_ID=i.lg_EMPLACEMENT_ID WHERE f.lg_INVENTAIRE_ID=i.lg_INVENTAIRE_ID AND f.bool_INVENTAIRE=1 AND f.int_NUMBER<>f.int_NUMBER_INIT)") === '0');
} catch (e) {
  ok('Deroulement sans exception', false, e.stack || e.message);
}
nettoyer();
const ko = res.filter(r => !r.c).length;
console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
process.exit(ko ? 1 : 0);
