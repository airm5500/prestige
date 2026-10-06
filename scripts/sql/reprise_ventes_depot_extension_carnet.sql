-- Reprise des ventes faites en « depot extension » sur les carnets depot.
--
-- A QUOI CA SERT
-- Des depots ont d'abord ete servis en vente « depot extension » (type de vente 5, depot client
-- dans PK_BRAND), puis crees en carnet depot (tiers payant marque is_depot). Leurs carnets sont
-- vides : le menu Gestion carnet depot ne montre que les ventes portees par une ligne de tiers
-- payant sur le carnet, et le reglement se fait sur le solde du carnet (t_tiers_payant.account).
--
-- Ce script rattache chaque vente depot extension au carnet du meme depot, reconnu par son nom :
--   - une ligne de tiers payant par vente, de la meme forme qu'une vente carnet ordinaire
--     (taux 100 %, montant = net de la vente, statut is_Closed, unpaid) ;
--   - le solde du carnet augmente du total rattache.
-- La caisse et le stock ne sont PAS modifies. Des ventes, seul l'indicateur d'avoir est complete
-- quand il est vide (voir l'etape 4) : sans lui, l'ecran du carnet n'affiche aucune vente.
--
-- COMPATIBILITE
-- SQL simple, ecrit pour les anciens serveurs : ni WITH, ni fonctions de fenetre, ni
-- REGEXP_REPLACE (absents de MySQL 5.x). N'utilise que des colonnes presentes en 5.9.7 ; la seule
-- colonne plus recente (b_HAS_AVOIR, V6.1.6) n'est touchee que si elle existe.
-- Les tables de travail sont creees a partir des tables du logiciel (CREATE TABLE ... SELECT) :
-- elles en reprennent le jeu de caracteres. L'identifiant genere est force en texte (sur
-- MariaDB 10.7 et plus, UUID() produit sinon une colonne de type UUID).
-- Essaye au banc (MariaDB 10.11) sur une base reelle en 5.9.7 et la meme mise a jour en 6.9.72,
-- avec des depots et carnets fictifs ; ecran Gestion carnet depot et reglement verifies en 6.9.72.
--
-- MODE D'EMPLOI : lancer les etapes UNE PAR UNE, dans l'ordre, et lire le resultat de chacune.
--   Etape 0  sauvegarde de la base (mysqldump) : obligatoire avant l'etape 4
--   Etape 1  correspondance depot -> carnet par le nom (rien n'est modifie dans le logiciel)
--   Etape 2  controle et corrections a la main de la correspondance
--   Etape 3  apercu de ce qui sera rattache (relancable a volonte)
--   Etape 4  rattachement (la seule etape qui modifie le logiciel ; sans effet si relancee)
--   Etape 5  verification, comme l'ecran la lit
--   Annulation : en fin de fichier.
-- Le script ne rattache jamais deux fois la meme vente : une vente qui porte deja une ligne de
-- tiers payant est ignoree.


-- ============================================================================================
-- Parametre : date de debut des ventes a reprendre (comme la procedure carnet simple).
-- ============================================================================================
SET @depuis = '2024-01-07';


-- ============================================================================================
-- ETAPE 1 : noms des depots et des carnets, ramenes a une cle comparable
-- ============================================================================================
DROP TABLE IF EXISTS reprise_noms;
CREATE TABLE reprise_noms AS
SELECT 'DEPOT' AS genre, e.lg_EMPLACEMENT_ID AS ref_id, e.str_NAME AS nom,
       CONCAT(' ', UPPER(TRIM(IFNULL(e.str_NAME, ''))), ' ') AS cle
FROM t_emplacement e
WHERE e.lg_EMPLACEMENT_ID IN (SELECT p.PK_BRAND FROM t_preenregistrement p
                              WHERE p.lg_TYPE_VENTE_ID = '5' AND p.PK_BRAND <> '1')
UNION ALL
SELECT 'CARNET', tp.lg_TIERS_PAYANT_ID, tp.str_NAME, CONCAT(' ', UPPER(TRIM(IFNULL(tp.str_NAME, ''))), ' ')
FROM t_tiers_payant tp WHERE tp.is_depot = 1
UNION ALL
SELECT 'CARNET', tp.lg_TIERS_PAYANT_ID, tp.str_FULLNAME, CONCAT(' ', UPPER(TRIM(IFNULL(tp.str_FULLNAME, ''))), ' ')
FROM t_tiers_payant tp WHERE tp.is_depot = 1 AND IFNULL(tp.str_FULLNAME, '') <> '';

-- accents
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(cle, 'É', 'E'), 'È', 'E'), 'Ê', 'E'), 'Ë', 'E');
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(cle, 'Ô', 'O'), 'Ö', 'O'), 'À', 'A'), 'Â', 'A');
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(cle, 'Î', 'I'), 'Ï', 'I'), 'Û', 'U'), 'Ù', 'U'), 'Ç', 'C');
-- ponctuation remplacee par un espace
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(cle, '-', ' '), '.', ' '), '''', ' '), '_', ' ');
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(cle, '/', ' '), ',', ' '), '(', ' '), ')', ' ');
-- articles, en mots entiers (« LA » de « PLATEAU » est garde)
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(cle, ' DE ', ' '), ' DU ', ' '), ' DES ', ' '), ' D ', ' ');
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(REPLACE(cle, ' LA ', ' '), ' LE ', ' '), ' LES ', ' '), ' L ', ' ');
-- mots sans valeur pour reconnaitre un depot
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(cle, 'DEPOTS', ''), 'DEPOT', ''), 'EXTENSION', '');
UPDATE reprise_noms SET cle = REPLACE(REPLACE(REPLACE(cle, 'PHARMACIE', ''), 'PHCIE', ''), 'CARNET', '');
-- espaces
UPDATE reprise_noms SET cle = REPLACE(cle, ' ', '');

-- Correspondance proposee : chaque depot avec les carnets dont la cle est egale (IDENTIQUE) ou
-- contient / est contenue dans la sienne (PROCHE). Cles de moins de 3 lettres : aucune proposition.
DROP TABLE IF EXISTS reprise_correspondance;
CREATE TABLE reprise_correspondance AS
SELECT d.ref_id AS depot_id, d.nom AS depot, c.ref_id AS carnet_id,
       MIN(CASE WHEN c.cle = d.cle THEN '1-IDENTIQUE' ELSE '2-PROCHE' END) AS correspondance
FROM reprise_noms d
JOIN reprise_noms c ON c.genre = 'CARNET'
WHERE d.genre = 'DEPOT' AND LENGTH(d.cle) >= 3 AND LENGTH(c.cle) >= 3
  AND (c.cle = d.cle OR c.cle LIKE CONCAT('%', d.cle, '%') OR d.cle LIKE CONCAT('%', c.cle, '%'))
GROUP BY d.ref_id, d.nom, c.ref_id;


-- ============================================================================================
-- ETAPE 2 : controle de la correspondance
-- ============================================================================================
SET @depuis = '2024-01-07';   -- meme date qu'en tete de fichier
-- 2a. Tous les depots, avec leurs ventes a reprendre (pas encore rattachees) et le ou les carnets proposes.
--     « candidats » doit valoir 1 pour chaque depot a reprendre.
SELECT d.ref_id AS depot_id, d.nom AS depot,
       (SELECT COUNT(*) FROM t_preenregistrement p
         WHERE p.PK_BRAND = d.ref_id AND p.lg_TYPE_VENTE_ID = '5' AND p.str_STATUT = 'is_Closed'
           AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= @depuis
           AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent cp
                           WHERE cp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)) AS ventes,
       (SELECT SUM(p.int_PRICE - IFNULL(p.int_PRICE_REMISE, 0)) FROM t_preenregistrement p
         WHERE p.PK_BRAND = d.ref_id AND p.lg_TYPE_VENTE_ID = '5' AND p.str_STATUT = 'is_Closed'
           AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= @depuis
           AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent cp
                           WHERE cp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)) AS montant_net,
       m.carnet_id, tp.str_NAME AS carnet, tp.str_FULLNAME AS carnet_complet, tp.account AS solde_carnet,
       IFNULL(m.correspondance, 'AUCUN CARNET') AS correspondance,
       (SELECT COUNT(*) FROM reprise_correspondance x WHERE x.depot_id = d.ref_id) AS candidats,
       d.cle AS cle_depot
FROM reprise_noms d
LEFT JOIN reprise_correspondance m ON m.depot_id = d.ref_id
LEFT JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = m.carnet_id
WHERE d.genre = 'DEPOT'
ORDER BY d.nom, m.correspondance, tp.str_NAME;

-- 2b. Les carnets depot existants et leur cle, pour retrouver un carnet a la main.
SELECT c.ref_id AS carnet_id, c.nom, c.cle, tp.account AS solde_carnet, tp.str_STATUT
FROM reprise_noms c JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = c.ref_id
WHERE c.genre = 'CARNET'
ORDER BY c.nom;

-- 2c. CORRECTIONS A LA MAIN (a adapter, puis relancer 2a) :
--   retirer un carnet propose a tort :
--     DELETE FROM reprise_correspondance WHERE depot_id = '<depot_id>' AND carnet_id = '<carnet_id>';
--   associer un depot a un carnet que le nom n'a pas reconnu :
--     INSERT INTO reprise_correspondance (depot_id, depot, carnet_id, correspondance)
--     SELECT e.lg_EMPLACEMENT_ID, e.str_NAME, '<carnet_id>', '3-MANUEL'
--     FROM t_emplacement e WHERE e.lg_EMPLACEMENT_ID = '<depot_id>';
--   ne pas reprendre un depot :
--     DELETE FROM reprise_correspondance WHERE depot_id = '<depot_id>';
-- Seuls les depots qui ont EXACTEMENT un carnet seront repris a l'etape 4.


-- ============================================================================================
-- ETAPE 3 : apercu de ce qui sera rattache (rien n'est encore modifie dans le logiciel)
-- ============================================================================================
-- Peut etre relancee autant de fois que voulu (apres une correction de l'etape 2 par exemple).
SET @depuis = '2024-01-07';   -- meme date qu'en tete de fichier
-- Compte client du carnet sur lequel les ventes seront portees : le premier compte actif.
-- Un carnet sans compte client actif ne peut rien recevoir : il est signale ici et ignore.
DROP TABLE IF EXISTS reprise_apercu;
CREATE TABLE reprise_apercu AS
SELECT CAST(UUID() AS CHAR(36)) AS cp_id, p.lg_PREENREGISTREMENT_ID AS vente_id, p.str_REF AS reference,
       p.dt_UPDATED AS date_vente, p.lg_USER_ID AS user_id, m.depot_id, m.carnet_id,
       (SELECT ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant ct
         WHERE ct.lg_TIERS_PAYANT_ID = m.carnet_id AND ct.str_STATUT = 'enable'
         ORDER BY ct.int_PRIORITY, ct.dt_CREATED, ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIMIT 1) AS compte_tp_id,
       p.int_PRICE - IFNULL(p.int_PRICE_REMISE, 0) AS montant
FROM t_preenregistrement p
JOIN reprise_correspondance m ON m.depot_id = p.PK_BRAND
WHERE p.lg_TYPE_VENTE_ID = '5' AND p.PK_BRAND <> '1' AND p.str_STATUT = 'is_Closed'
  AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= @depuis
  AND p.int_PRICE - IFNULL(p.int_PRICE_REMISE, 0) > 0
  AND m.depot_id IN (SELECT x.depot_id FROM reprise_correspondance x GROUP BY x.depot_id HAVING COUNT(*) = 1)
  AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent cp
                  WHERE cp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID);

-- 3a. Total par carnet : c'est ce qui apparaitra dans Gestion carnet depot.
SELECT tp.str_NAME AS carnet, a.carnet_id, COUNT(*) AS ventes, SUM(a.montant) AS montant,
       MIN(a.date_vente) AS premiere, MAX(a.date_vente) AS derniere,
       IFNULL(tp.account, 0) AS solde_avant, IFNULL(tp.account, 0) + SUM(a.montant) AS solde_apres,
       CASE WHEN MIN(a.compte_tp_id) IS NULL THEN 'CARNET SANS COMPTE CLIENT : IGNORE' ELSE 'OK' END AS etat
FROM reprise_apercu a JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = a.carnet_id
GROUP BY a.carnet_id, tp.str_NAME, tp.account
ORDER BY tp.str_NAME;

-- 3b. Le detail, vente par vente.
SELECT a.reference, a.date_vente, a.montant, tp.str_NAME AS carnet, e.str_NAME AS depot
FROM reprise_apercu a
JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = a.carnet_id
JOIN t_emplacement e ON e.lg_EMPLACEMENT_ID = a.depot_id
ORDER BY tp.str_NAME, a.date_vente;


-- ============================================================================================
-- ETAPE 4 : rattachement (SAUVEGARDE FAITE AVANT)
-- ============================================================================================
-- Sans effet si on la relance : une vente deja rattachee n'est jamais reprise une seconde fois.
-- Le journal (reprise_journal) garde chaque ligne creee ; il n'est jamais efface par ce script.
CREATE TABLE IF NOT EXISTS reprise_journal AS
SELECT a.*, NOW() AS fait_le FROM reprise_apercu a WHERE 1 = 0;

SET @lot = NOW();

START TRANSACTION;

INSERT INTO reprise_journal
SELECT a.*, @lot FROM reprise_apercu a
WHERE a.compte_tp_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent cp
                  WHERE cp.lg_PREENREGISTREMENT_ID = a.vente_id);

INSERT INTO t_preenregistrement_compte_client_tiers_payent
    (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
     lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PERCENT, int_PRICE, int_PRICE_RESTE,
     str_STATUT_FACTURE, str_REF_BON, dbl_QUOTA_CONSO_VENTE)
SELECT j.cp_id, j.vente_id, j.compte_tp_id, j.user_id, 'is_Closed', j.date_vente, j.date_vente, 100, j.montant,
       j.montant, 'unpaid', 'REPRISE DEPOT', j.montant
FROM reprise_journal j
WHERE j.fait_le = @lot;

UPDATE t_tiers_payant tp
JOIN (SELECT carnet_id, SUM(montant) AS total FROM reprise_journal WHERE fait_le = @lot GROUP BY carnet_id) j
  ON j.carnet_id = tp.lg_TIERS_PAYANT_ID
SET tp.account = IFNULL(tp.account, 0) + j.total;

COMMIT;

-- Indicateur « a eu un avoir » des ventes portees par un carnet depot (versions qui ont la colonne
-- b_HAS_AVOIR, migration V6.1.6). Sur une base mise a jour depuis une version plus ancienne, la
-- colonne a pu etre creee VIDE (NULL) au lieu de 0 : l'ecran Gestion carnet depot ne peut alors
-- charger AUCUNE vente du carnet (la liste reste vide, sans message ; constate au banc). On lui
-- donne la valeur que la migration aurait mise : 1 pour un avoir, 0 sinon. Seul champ des ventes
-- modifie par ce script, et uniquement s'il est vide. Sans effet sur une version sans la colonne.
SET @colonne = (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 't_preenregistrement'
                  AND column_name = 'b_HAS_AVOIR');
SET @ordre = IF(@colonne > 0,
    'UPDATE t_preenregistrement p
     JOIN t_preenregistrement_compte_client_tiers_payent cp ON cp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
     JOIN t_compte_client_tiers_payant ct ON ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = ct.lg_TIERS_PAYANT_ID
     SET p.b_HAS_AVOIR = CASE WHEN p.b_IS_AVOIR = 1 THEN 1 ELSE 0 END
     WHERE tp.is_depot = 1 AND p.b_HAS_AVOIR IS NULL',
    'SELECT ''colonne b_HAS_AVOIR absente : rien a faire'' AS info');
PREPARE ordre FROM @ordre;
EXECUTE ordre;
DEALLOCATE PREPARE ordre;

-- Ce qui vient d'etre fait :
SELECT tp.str_NAME AS carnet, COUNT(*) AS ventes_rattachees, SUM(j.montant) AS montant, tp.account AS nouveau_solde
FROM reprise_journal j JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = j.carnet_id
WHERE j.fait_le = @lot
GROUP BY j.carnet_id, tp.str_NAME, tp.account
ORDER BY tp.str_NAME;


-- ============================================================================================
-- ETAPE 5 : verification, avec les filtres de l'ecran Gestion carnet depot
-- ============================================================================================
SELECT tp.str_NAME AS carnet, COUNT(*) AS ventes_visibles, SUM(cp.int_PRICE) AS montant_visible,
       tp.account AS solde_carnet,
       SUM(cp.str_REF_BON = 'REPRISE DEPOT') AS dont_reprises
FROM t_preenregistrement_compte_client_tiers_payent cp
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = cp.lg_PREENREGISTREMENT_ID
JOIN t_compte_client_tiers_payant ct ON ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = ct.lg_TIERS_PAYANT_ID
WHERE tp.is_depot = 1 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
  AND cp.str_STATUT = 'is_Closed'
GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_NAME, tp.account
ORDER BY tp.str_NAME;
-- 5b. Ventes des carnets depot que l'ecran ne pourrait pas charger (indicateur d'avoir vide) :
--     doit valoir 0 (l'etape 4 les corrige ; relancer l'etape 4 si besoin).
SET @colonne = (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 't_preenregistrement'
                  AND column_name = 'b_HAS_AVOIR');
SET @ordre = IF(@colonne > 0,
    'SELECT COUNT(*) AS ventes_carnet_illisibles
     FROM t_preenregistrement p
     JOIN t_preenregistrement_compte_client_tiers_payent cp ON cp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
     JOIN t_compte_client_tiers_payant ct ON ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = ct.lg_TIERS_PAYANT_ID
     WHERE tp.is_depot = 1 AND p.b_HAS_AVOIR IS NULL',
    'SELECT 0 AS ventes_carnet_illisibles');
PREPARE ordre FROM @ordre;
EXECUTE ordre;
DEALLOCATE PREPARE ordre;

-- Dans l'ecran, choisir une periode qui couvre les dates des ventes reprises (date de la vente).
-- Les ventes reprises y portent la reference de bon « REPRISE DEPOT ».
--
-- GARDER la table reprise_journal : elle permet l'annulation ci-dessous. Les autres tables de
-- travail peuvent etre supprimees une fois la reprise validee a l'ecran :
--   DROP TABLE reprise_noms, reprise_correspondance, reprise_apercu;


-- ============================================================================================
-- ANNULATION (uniquement si besoin, et AVANT tout reglement sur ces ventes)
-- ============================================================================================
-- Retire les lignes creees par la reprise (reconnues par la vente du journal ET la reference de
-- bon « REPRISE DEPOT ») et rend aux carnets leur solde d'avant. Sans effet si on la relance :
-- seules les lignes encore presentes sont comptees.
-- START TRANSACTION;
-- UPDATE t_tiers_payant tp
-- JOIN (SELECT j.carnet_id, SUM(cp.int_PRICE) AS total
--       FROM (SELECT DISTINCT vente_id, carnet_id FROM reprise_journal) j
--       JOIN t_preenregistrement_compte_client_tiers_payent cp
--         ON cp.lg_PREENREGISTREMENT_ID = j.vente_id AND cp.str_REF_BON = 'REPRISE DEPOT'
--       GROUP BY j.carnet_id) x
--   ON x.carnet_id = tp.lg_TIERS_PAYANT_ID
-- SET tp.account = IFNULL(tp.account, 0) - x.total;
-- DELETE cp FROM t_preenregistrement_compte_client_tiers_payent cp
-- JOIN reprise_journal j ON j.vente_id = cp.lg_PREENREGISTREMENT_ID
-- WHERE cp.str_REF_BON = 'REPRISE DEPOT';
-- COMMIT;
