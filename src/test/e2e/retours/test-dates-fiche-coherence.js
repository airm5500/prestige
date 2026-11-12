/* DATES DE LA FICHE ARTICLE tenues dans t_famille (demande du 12/11) : test de coherence, lecture seule.
 *
 * Regle : pour chaque article, les trois colonnes de t_famille valent le recalcul a partir de l'historique, a la
 * seconde pres :
 *  - dt_DATE_LAST_SORTIE = plus grande date de cloture des ventes cloturees, non annulees, de montant positif, faites
 *    par un utilisateur de l'officine ;
 *  - dt_DATE_LAST_ENTREE = pour chaque ligne de BL cloture, date du mouvement « entree en stock » (type 01), a defaut
 *    date du BL ; la plus recente ;
 *  - dt_LAST_INVENTAIRE = plus grande date de cloture des inventaires clotures par l'officine contenant l'article.
 * Le recalcul est ecrit ici independamment des procedures (simple MAX).
 * Jeu varie, graine fixe : articles tres vendus, tires au hasard, jamais vendus, entres par BL, inventories, avec une
 * vente annulee, et TOUS les articles sur l'ensemble de la base pour les comptes (NULL attendu = NULL stocke).
 * Variables : DB_TEST, MARIADB_OPTIONS (copie de travail), ECHANTILLON (400 par defaut).
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
/* blocs longs : par l'entree standard (la ligne de commande de Windows est limitee a 32 000 caracteres) */
const qe = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const N = Number(process.env.ECHANTILLON || 400);

const VENTE = "p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND u.lg_EMPLACEMENT_ID = '1'";
const ATTENDU_SORTIE = "(SELECT MAX(p.dt_UPDATED) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND " + VENTE + ")";
const ATTENDU_ENTREE = "(SELECT MAX(COALESCE((SELECT MAX(h.createdAt) FROM hmvtproduit h WHERE h.pkey = bld.lg_BON_LIVRAISON_DETAIL AND h.typeMvt = '01'), bl.dt_UPDATED))"
  + " FROM t_bon_livraison_detail bld JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID"
  + " WHERE bld.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND bl.str_STATUT = 'is_Closed')";
const ATTENDU_INVENTAIRE = "(SELECT MAX(i.dt_UPDATED) FROM t_inventaire_famille l JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID"
  + " JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1')";

const ids = new Map();
const prendre = (sql, quoi) => q(sql).split('\n').filter(Boolean).forEach((id) => { if (!ids.has(id)) { ids.set(id, quoi); } });
prendre("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.dt_CREATED > NOW() - INTERVAL 60 DAY GROUP BY d.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 15", 'très vendu');
prendre("SELECT lg_FAMILLE_ID FROM t_famille ORDER BY CRC32(CONCAT(lg_FAMILLE_ID, '20261112')) LIMIT " + Math.round(N * 0.6), 'au hasard');
prendre("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY CRC32(f.lg_FAMILLE_ID) LIMIT 20", 'jamais vendu');
prendre("SELECT DISTINCT bld.lg_FAMILLE_ID FROM t_bon_livraison_detail bld JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID WHERE bl.str_STATUT = 'is_Closed' ORDER BY bl.dt_UPDATED DESC LIMIT 30", 'entré par BL');
prendre("SELECT DISTINCT bld.lg_FAMILLE_ID FROM t_bon_livraison_detail bld JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID WHERE bl.str_STATUT <> 'is_Closed' ORDER BY CRC32(bld.lg_FAMILLE_ID) LIMIT 15", 'BL non clôturé');
prendre("SELECT l.lg_FAMILLE_ID FROM t_inventaire_famille l JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID WHERE i.str_STATUT = 'is_Closed' ORDER BY CRC32(CONCAT(l.lg_INVENTAIRE_FAMILLE_ID, '1112')) LIMIT 30", 'inventorié');
prendre("SELECT l.lg_FAMILLE_ID FROM t_inventaire_famille l JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID WHERE i.str_STATUT <> 'is_Closed' ORDER BY CRC32(l.lg_FAMILLE_ID) LIMIT 15", 'inventaire supprimé');
prendre("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE p.b_IS_CANCEL = 1 ORDER BY p.dt_UPDATED DESC LIMIT 20", 'vente annulée');
prendre("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE p.str_STATUT = 'is_Closed' AND p.int_PRICE <= 0 ORDER BY p.dt_UPDATED DESC LIMIT 15", 'avoir / montant nul');

const liste = [...ids.keys()];
const parQuoi = {};
ids.forEach((quoi) => { parQuoi[quoi] = (parQuoi[quoi] || 0) + 1; });
ok('Jeu d\'essai : ' + liste.length + ' articles variés', liste.length >= N * 0.6 && Object.keys(parQuoi).length >= 8, JSON.stringify(parQuoi));

const lignes = q("SELECT f.lg_FAMILLE_ID, IFNULL(f.dt_DATE_LAST_SORTIE, '-'), IFNULL(" + ATTENDU_SORTIE + ", '-'), IFNULL(f.dt_DATE_LAST_ENTREE, '-'), IFNULL(" + ATTENDU_ENTREE
  + ", '-'), IFNULL(f.dt_LAST_INVENTAIRE, '-'), IFNULL(" + ATTENDU_INVENTAIRE + ", '-') FROM t_famille f WHERE f.lg_FAMILLE_ID IN ('" + liste.join("','") + "')")
  .split('\n').map((l) => l.split('\t'));
for (const [k, nom, a, b] of [[1, 'dernière vente', 1, 2], [2, 'dernière entrée', 3, 4], [3, 'dernier inventaire', 5, 6]]) {
  const ecarts = lignes.filter((l) => l[a] !== l[b]);
  const renseignes = lignes.filter((l) => l[b] !== '-').length;
  const exemples = ecarts.slice(0, 4).map((l) => ids.get(l[0]) + ' ' + l[0] + ' : stocké ' + l[a] + ' / historique ' + l[b]);
  ok('Cohérence ' + k + ', ' + nom + ' : t_famille = recalcul sur l\'historique pour les ' + lignes.length + ' articles (' + renseignes + ' renseignés)',
    lignes.length === liste.length && ecarts.length === 0, ecarts.length + ' écart(s) ; ' + exemples.join(' | '));
}

/* procedures de recalcul (annulation, suppression) : dates effacees puis recalculees, dans une transaction annulee a la
   fin (rien n'est garde) ; le resultat doit etre le recalcul ci-dessus */
const appels = liste.map((id) => "CALL proc_fiche_sortie_recalculer('" + id + "'); CALL proc_fiche_entree_recalculer('" + id + "'); CALL proc_fiche_inventaire_recalculer('" + id + "');").join(' ');
const recalcul = qe("START TRANSACTION; SET @prestige_dates_fiche = 1; UPDATE t_famille SET dt_DATE_LAST_SORTIE = NULL, dt_DATE_LAST_ENTREE = NULL, dt_LAST_INVENTAIRE = NULL"
  + " WHERE lg_FAMILLE_ID IN ('" + liste.join("','") + "'); SET @prestige_dates_fiche = NULL; " + appels
  + " SELECT SUM(NOT (f.dt_DATE_LAST_SORTIE <=> " + ATTENDU_SORTIE + ")), SUM(NOT (f.dt_DATE_LAST_ENTREE <=> " + ATTENDU_ENTREE + ")), SUM(NOT (f.dt_LAST_INVENTAIRE <=> " + ATTENDU_INVENTAIRE + ")),"
  + " SUM(f.dt_DATE_LAST_SORTIE IS NOT NULL) FROM t_famille f WHERE f.lg_FAMILLE_ID IN ('" + liste.join("','") + "'); ROLLBACK;").split('	').map(Number);
ok('Procédures de recalcul (vente, entrée, inventaire) = historique, sur les ' + liste.length + ' articles (transaction annulée)',
  recalcul[0] === 0 && recalcul[1] === 0 && recalcul[2] === 0 && recalcul[3] > 0, 'écarts vente/entrée/inventaire : ' + recalcul.slice(0, 3).join('/') + ' ; ventes recalculées ' + recalcul[3]);

/* sur toute la base : pas de date stockee sans historique, pas d'historique sans date stockee (comptes) */
const comptes = q("SELECT SUM(f.dt_DATE_LAST_SORTIE IS NOT NULL), SUM(EXISTS(SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND " + VENTE + ")),"
  + " SUM(f.dt_LAST_INVENTAIRE IS NOT NULL), SUM(EXISTS(SELECT 1 FROM t_inventaire_famille l JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID"
  + " WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1')) FROM t_famille f").split('\t').map(Number);
ok('Toute la base : autant d\'articles avec une date de dernière vente que d\'articles vendus', comptes[0] === comptes[1], comptes[0] + ' / ' + comptes[1]);
ok('Toute la base : autant d\'articles avec une date de dernier inventaire que d\'articles inventoriés', comptes[2] === comptes[3], comptes[2] + ' / ' + comptes[3]);

const k = res.filter((x) => x.c).length;
console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
process.exit(k === res.length ? 0 : 1);
