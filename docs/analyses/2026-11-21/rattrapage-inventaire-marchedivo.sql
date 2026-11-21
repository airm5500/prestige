-- =====================================================================
-- Rattrapage de l'inventaire unitaire 16102712212465976322 (« Review annul », clôturé le 30/10/2026 à 20:53).
--
-- Défaut de l'ancienne version : l'actualisation puis la clôture ont traité toutes les lignes de l'inventaire,
-- y compris les lignes non cochées (bool_INVENTAIRE = 0). Pour ces lignes, le stock a été ramené à sa valeur du
-- 27/10 (création de l'inventaire) : les mouvements du 27 au 30/10 ont été effacés du stock.
--
-- Principe du rattrapage : on ne remet pas une valeur, on rend la différence.
--   correction = stock juste avant la clôture (int_NUMBER_INIT) - stock posé par la clôture (int_NUMBER)
--   stock corrigé = stock actuel + correction
-- Les ventes et les entrées faites depuis la clôture sont donc conservées.
--
-- Sont exclus : les produits qui ont reçu depuis la clôture un inventaire ou un ajustement (déjà recomptés à la main).
--
-- À EXÉCUTER : une seule fois, Prestige arrêté (le serveur garde les stocks en mémoire), après une sauvegarde.
-- La création de la table de trace échoue si le script a déjà été joué : c'est voulu.
-- =====================================================================

SET @inventaire := '16102712212465976322';
SET @cloture := (SELECT dt_UPDATED FROM t_inventaire
                 WHERE lg_INVENTAIRE_ID = @inventaire AND str_STATUT = 'is_Closed' AND str_TYPE = 'unitaire');
SET @utilisateur := (SELECT lg_USER_ID FROM t_inventaire WHERE lg_INVENTAIRE_ID = @inventaire);

-- 1. Table de trace : une ligne par produit non coché dont le stock a été modifié par la clôture.
CREATE TABLE rattrapage_inventaire_20261030 (
    lg_FAMILLE_STOCK_ID      VARCHAR(50) NOT NULL PRIMARY KEY,
    lg_FAMILLE_ID            VARCHAR(40) NOT NULL,
    lg_EMPLACEMENT_ID        VARCHAR(40) NOT NULL,
    lg_INVENTAIRE_FAMILLE_ID BIGINT UNSIGNED NOT NULL,
    stock_avant_cloture      INT NOT NULL,
    stock_pose_par_cloture   INT NOT NULL,
    correction               INT NOT NULL,
    stock_avant_rattrapage   INT NOT NULL,
    stock_apres_rattrapage   INT NOT NULL,
    exclu                    VARCHAR(80) NULL,
    dt_rattrapage            DATETIME NOT NULL
);

INSERT INTO rattrapage_inventaire_20261030
SELECT s.lg_FAMILLE_STOCK_ID, i.lg_FAMILLE_ID, s.lg_EMPLACEMENT_ID, i.lg_INVENTAIRE_FAMILLE_ID,
       i.int_NUMBER_INIT, i.int_NUMBER, i.int_NUMBER_INIT - i.int_NUMBER,
       s.int_NUMBER_AVAILABLE, s.int_NUMBER_AVAILABLE + i.int_NUMBER_INIT - i.int_NUMBER,
       IF(EXISTS (SELECT 1 FROM hmvtproduit h
                  WHERE h.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND h.lg_EMPLACEMENT_ID = s.lg_EMPLACEMENT_ID
                    AND h.typeMvt IN ('04', '07', '08') AND h.createdAt > @cloture),
          'inventaire ou ajustement fait depuis la clôture', NULL),
       NOW()
FROM t_inventaire_famille i
JOIN t_famille_stock s ON s.lg_FAMILLE_STOCK_ID = i.lg_FAMILLE_STOCK_ID
WHERE i.lg_INVENTAIRE_ID = @inventaire
  AND @cloture IS NOT NULL
  AND i.bool_INVENTAIRE = 0
  AND i.str_STATUT = 'is_Closed'
  AND i.int_NUMBER <> i.int_NUMBER_INIT;

-- 2. Contrôle avant écriture : à lire avant d'aller plus loin (939 lignes attendues sur la copie du 16/11).
SELECT COUNT(*) AS produits, SUM(exclu IS NULL) AS a_corriger, SUM(exclu IS NOT NULL) AS exclus,
       SUM(IF(exclu IS NULL, correction, 0)) AS unites_nettes
FROM rattrapage_inventaire_20261030;

START TRANSACTION;

-- 3. Stock rayon : on rend la différence.
UPDATE t_famille_stock s
JOIN rattrapage_inventaire_20261030 r ON r.lg_FAMILLE_STOCK_ID = s.lg_FAMILLE_STOCK_ID
SET s.int_NUMBER = s.int_NUMBER + r.correction,
    s.int_NUMBER_AVAILABLE = s.int_NUMBER_AVAILABLE + r.correction,
    s.VERSION = IFNULL(s.VERSION, 0) + 1
WHERE r.exclu IS NULL;

-- 4. Trace dans le suivi des mouvements : un ajustement par produit (08 positif, 07 négatif).
INSERT INTO hmvtproduit (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt,
                         valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug)
SELECT UUID(), 1, NOW(), CURDATE(), CONCAT('RATTRAPAGE-INV-', r.lg_INVENTAIRE_FAMILLE_ID),
       IFNULL(f.int_PAF, 0), IFNULL(f.int_PRICE, 0),
       r.stock_avant_rattrapage, r.stock_apres_rattrapage, r.correction, 0,
       r.lg_EMPLACEMENT_ID, r.lg_FAMILLE_ID, @utilisateur, IF(r.correction > 0, '08', '07'), 0
FROM rattrapage_inventaire_20261030 r
JOIN t_famille f ON f.lg_FAMILLE_ID = r.lg_FAMILLE_ID
WHERE r.exclu IS NULL;

COMMIT;

-- 5. Contrôle après écriture : « ecarts » doit valoir 0.
SELECT COUNT(*) AS corriges,
       SUM(s.int_NUMBER_AVAILABLE <> r.stock_apres_rattrapage OR s.int_NUMBER <> s.int_NUMBER_AVAILABLE) AS ecarts,
       SUM(s.int_NUMBER_AVAILABLE < 0) AS stocks_negatifs
FROM rattrapage_inventaire_20261030 r
JOIN t_famille_stock s ON s.lg_FAMILLE_STOCK_ID = r.lg_FAMILLE_STOCK_ID
WHERE r.exclu IS NULL;

-- Retour arrière, si besoin, tant qu'aucun mouvement n'a eu lieu depuis :
--   UPDATE t_famille_stock s JOIN rattrapage_inventaire_20261030 r ON r.lg_FAMILLE_STOCK_ID = s.lg_FAMILLE_STOCK_ID
--   SET s.int_NUMBER = s.int_NUMBER - r.correction, s.int_NUMBER_AVAILABLE = s.int_NUMBER_AVAILABLE - r.correction
--   WHERE r.exclu IS NULL;
--   DELETE FROM hmvtproduit WHERE pkey LIKE 'RATTRAPAGE-INV-%';
--   DROP TABLE rattrapage_inventaire_20261030;
