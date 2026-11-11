-- REGROUPEMENT DES LOTS EN DOUBLE D'UN BL IMPORTE (retour du 11/11/2026, base de Tiassale, BL R20285250)
--
-- Cause, corrigee dans l'application (LotsImport) : quand un produit revient deux fois dans le fichier du grossiste
-- (modele DPCI : ni numero de lot ni date), l'import faisait une seule ligne de BL mais DEUX lots vides. L'ecran du
-- BL ne montre et ne complete qu'un lot par ligne : le second reste sans date et l'entree en stock est refusee
-- (« Certaines dates de péremptions ne sont pas renseignées »).
--
-- Ce que fait le script, pour UN BL ouvert donne par sa reference, produit par produit :
--   1. si le produit a exactement UN lot date sur ce BL : ses lots vides (sans numero ni date) lui sont ajoutes
--      (quantite et unites gratuites), puis supprimes ;
--   2. si le produit n'a AUCUN lot date et plusieurs lots vides : ils sont regroupes dans le premier, qu'il reste a
--      completer a l'ecran (numero et date) ;
--   3. tout autre cas (plusieurs lots dates, lot avec numero sans date...) n'est pas touche : il est liste a la fin.
-- La quantite de chaque produit (somme de ses lots) ne change pas : le script le verifie avant le COMMIT.
--
-- Execution MANUELLE, par une personne habilitee, apres sauvegarde de la base, sur un BL encore OUVERT.
-- Mode d'emploi :
--   - remplacer R20285250 par la reference du BL (ligne SET @ref ci-dessous) ;
--   - lancer : mariadb -u <compte> -p <base> < regrouper-lots-bl-importe.sql
--   - lire les tableaux « AVANT » et « APRES » ; « controle » doit valoir OK, sinon la transaction est annulee.
-- Le script ne touche que la table t_lot, et seulement les lots du BL donne.

SET @ref := 'R20285250';

-- 0. Le BL doit exister et etre ouvert
SELECT b.str_REF_LIVRAISON AS bl, b.str_STATUT AS statut, g.str_LIBELLE AS grossiste,
       IF(b.str_STATUT = 'enable', 'OK : BL ouvert', 'ARRET : BL absent ou deja entre en stock') AS etat
FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID
WHERE b.str_REF_LIVRAISON = @ref;

-- AVANT : produits qui ont plus d'un lot sur ce BL
SELECT 'AVANT' AS moment, f.int_CIP, f.str_NAME, l.int_NUM_LOT, l.dt_PEREMPTION, l.int_NUMBER, l.int_NUMBER_GRATUIT
FROM t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID
WHERE l.str_REF_LIVRAISON = @ref AND IFNULL(l.str_STATUT, '') <> 'delete'
  AND (SELECT COUNT(*) FROM t_lot x WHERE x.lg_FAMILLE_ID = l.lg_FAMILLE_ID AND x.str_REF_LIVRAISON = l.str_REF_LIVRAISON
       AND x.lg_GROSSISTE_ID = l.lg_GROSSISTE_ID AND IFNULL(x.str_STATUT, '') <> 'delete') > 1
ORDER BY f.str_NAME, l.dt_PEREMPTION DESC;

START TRANSACTION;

-- quantites par produit avant, pour le controle
DROP TEMPORARY TABLE IF EXISTS tmp_qte_avant;
CREATE TEMPORARY TABLE tmp_qte_avant AS
SELECT l.lg_FAMILLE_ID, l.lg_GROSSISTE_ID, SUM(l.int_NUMBER) AS n, SUM(IFNULL(l.int_NUMBER_GRATUIT, 0)) AS g
FROM t_lot l JOIN t_bon_livraison b ON b.str_REF_LIVRAISON = l.str_REF_LIVRAISON AND b.str_STATUT = 'enable'
WHERE l.str_REF_LIVRAISON = @ref AND IFNULL(l.str_STATUT, '') <> 'delete'
GROUP BY l.lg_FAMILLE_ID, l.lg_GROSSISTE_ID;

-- lots du BL (ouvert seulement) avec leur etat
DROP TEMPORARY TABLE IF EXISTS tmp_lots;
CREATE TEMPORARY TABLE tmp_lots AS
SELECT l.lg_LOT_ID, l.lg_FAMILLE_ID, l.lg_GROSSISTE_ID, l.int_NUMBER AS n, IFNULL(l.int_NUMBER_GRATUIT, 0) AS g,
       (l.dt_PEREMPTION IS NOT NULL) AS date_ok,
       (l.dt_PEREMPTION IS NULL AND (l.int_NUM_LOT IS NULL OR TRIM(l.int_NUM_LOT) = '')) AS vide
FROM t_lot l JOIN t_bon_livraison b ON b.str_REF_LIVRAISON = l.str_REF_LIVRAISON AND b.str_STATUT = 'enable'
WHERE l.str_REF_LIVRAISON = @ref AND IFNULL(l.str_STATUT, '') <> 'delete';

-- par produit : nombre de lots dates, de lots vides, et le lot qui recoit
DROP TEMPORARY TABLE IF EXISTS tmp_produits;
CREATE TEMPORARY TABLE tmp_produits AS
SELECT lg_FAMILLE_ID, lg_GROSSISTE_ID, SUM(date_ok) AS dates, SUM(vide) AS vides,
       CASE WHEN SUM(date_ok) = 1 THEN MAX(IF(date_ok = 1, lg_LOT_ID, NULL))
            WHEN SUM(date_ok) = 0 AND SUM(vide) > 1 THEN MIN(IF(vide = 1, lg_LOT_ID, NULL)) END AS cible
FROM tmp_lots GROUP BY lg_FAMILLE_ID, lg_GROSSISTE_ID;

-- lots vides a verser dans la cible
DROP TEMPORARY TABLE IF EXISTS tmp_verser;
CREATE TEMPORARY TABLE tmp_verser AS
SELECT t.lg_LOT_ID, p.cible, t.n, t.g
FROM tmp_lots t JOIN tmp_produits p ON p.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_GROSSISTE_ID = t.lg_GROSSISTE_ID
WHERE p.cible IS NOT NULL AND t.vide = 1 AND t.lg_LOT_ID <> p.cible;

UPDATE t_lot c JOIN (SELECT cible, SUM(n) AS n, SUM(g) AS g FROM tmp_verser GROUP BY cible) v ON v.cible = c.lg_LOT_ID
SET c.int_NUMBER = c.int_NUMBER + v.n, c.int_NUMBER_GRATUIT = IFNULL(c.int_NUMBER_GRATUIT, 0) + v.g, c.dt_UPDATED = NOW();

DELETE l FROM t_lot l JOIN tmp_verser v ON v.lg_LOT_ID = l.lg_LOT_ID;

-- APRES : les memes produits
SELECT 'APRES' AS moment, f.int_CIP, f.str_NAME, l.int_NUM_LOT, l.dt_PEREMPTION, l.int_NUMBER, l.int_NUMBER_GRATUIT
FROM t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID
JOIN tmp_produits p ON p.lg_FAMILLE_ID = l.lg_FAMILLE_ID AND p.lg_GROSSISTE_ID = l.lg_GROSSISTE_ID
WHERE l.str_REF_LIVRAISON = @ref AND IFNULL(l.str_STATUT, '') <> 'delete' AND p.cible IS NOT NULL
  AND p.dates + p.vides > 1
ORDER BY f.str_NAME;

-- lots regroupes, et cas laisses tels quels (a voir a l'ecran)
SELECT (SELECT COUNT(*) FROM tmp_verser) AS lots_regroupes,
       (SELECT COUNT(*) FROM tmp_produits WHERE cible IS NULL AND dates + vides > 1) AS produits_non_touches;

-- controle : la quantite de chaque produit est la meme qu'avant
DROP TEMPORARY TABLE IF EXISTS tmp_qte_apres;
CREATE TEMPORARY TABLE tmp_qte_apres AS
SELECT l.lg_FAMILLE_ID, l.lg_GROSSISTE_ID, SUM(l.int_NUMBER) AS n, SUM(IFNULL(l.int_NUMBER_GRATUIT, 0)) AS g
FROM t_lot l WHERE l.str_REF_LIVRAISON = @ref AND IFNULL(l.str_STATUT, '') <> 'delete'
GROUP BY l.lg_FAMILLE_ID, l.lg_GROSSISTE_ID;
SET @ecarts := (SELECT COUNT(*) FROM tmp_qte_avant a LEFT JOIN tmp_qte_apres p
                ON p.lg_FAMILLE_ID = a.lg_FAMILLE_ID AND p.lg_GROSSISTE_ID = a.lg_GROSSISTE_ID
                WHERE p.n IS NULL OR p.n <> a.n OR p.g <> a.g);
SELECT IF(@ecarts = 0, 'OK : quantites inchangees, modifications validees', 'ECART : modifications annulees') AS controle;

-- validation seulement si le controle est bon
SET @fin := IF(@ecarts = 0, 'COMMIT', 'ROLLBACK');
PREPARE fin FROM @fin;
EXECUTE fin;
DEALLOCATE PREPARE fin;
