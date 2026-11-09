-- =====================================================================
-- Rattrapage des inventaires clotures par l'API REST avant le 13/09/2026
-- ---------------------------------------------------------------------
-- La cloture d'inventaire est passee de la procedure stockee
-- proc_clotureinentaire a l'API REST le 01/08/2026. Cette version REST
-- mettait a jour le stock rayon (t_famille_stock) et l'historique
-- HMvtProduit, mais avait perdu quatre ecritures que la procedure
-- faisait :
--
--   1. t_mouvement            : mouvement du jour, action INVENTAIRE
--                               (lu par les etats de stock par jour) ;
--   2. t_mouvement_snapshot   : instantane du stock du jour ;
--   3. t_famille.dt_LAST_INVENTAIRE : date du dernier inventaire du
--                               produit (affichee sur la fiche article) ;
--   4. t_type_stock_famille   : stock par type (rayon), lu par la
--                               repartition rayon / reserve.
--
-- Ces ecritures sont retablies ici pour les inventaires concernes. Le
-- stock rayon, lui, avait bien ete mis a jour : il n'est pas touche.
--
-- Le script est SANS EFFET sur :
--   - les inventaires clotures par la procedure stockee (ils ont deja
--     leur mouvement du jour) ;
--   - les inventaires clotures depuis le correctif (idem) ;
--   - les inventaires de reserve (la version REST mettait deja a jour le
--     stock reserve) ;
--   - les inventaires sans aucun ecart (rien a ecrire).
--
-- Il est IDEMPOTENT : une deuxieme execution ne reecrit rien. Chaque
-- inventaire rattrape est trace dans rattrapage_cloture_inventaire, avec
-- le detail de ce qui a ete ecrit. Les lignes posees dans t_mouvement et
-- t_mouvement_snapshot portent dt_UPDATED = date du rattrapage : elles
-- restent donc identifiables.
--
-- Les mouvements sont dates du JOUR REEL DE LA CLOTURE (dt_UPDATED de
-- l'inventaire), pas du jour du rattrapage : les etats par jour restent
-- justes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Trace du rattrapage
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rattrapage_cloture_inventaire` (
    `lg_INVENTAIRE_ID` varchar(40) NOT NULL,
    `str_NAME` varchar(100) DEFAULT NULL,
    `dt_CLOTURE` datetime DEFAULT NULL,
    `lg_EMPLACEMENT_ID` varchar(40) DEFAULT NULL,
    `nbre_lignes_ecart` int(11) DEFAULT 0,
    `nbre_mouvements` int(11) DEFAULT 0,
    `nbre_snapshots` int(11) DEFAULT 0,
    `nbre_dates_produit` int(11) DEFAULT 0,
    `nbre_type_stock` int(11) DEFAULT 0,
    `dt_RATTRAPAGE` datetime DEFAULT NULL,
    PRIMARY KEY (`lg_INVENTAIRE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- ---------------------------------------------------------------------
-- 1. Les inventaires a rattraper : clotures, non reserve, avec des
--    ecarts, un historique HMvtProduit (preuve d'une cloture REST) et
--    AUCUN mouvement du jour pour leurs produits (preuve que les
--    ecritures manquent).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO `rattrapage_cloture_inventaire`
    (`lg_INVENTAIRE_ID`, `str_NAME`, `dt_CLOTURE`, `lg_EMPLACEMENT_ID`, `nbre_lignes_ecart`)
SELECT i.`lg_INVENTAIRE_ID`, i.`str_NAME`, i.`dt_UPDATED`, i.`lg_EMPLACEMENT_ID`,
       (SELECT COUNT(*) FROM `t_inventaire_famille` f
         WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
           AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`)
FROM `t_inventaire` i
WHERE i.`str_STATUT` = 'is_Closed'
  AND i.`dt_UPDATED` IS NOT NULL
  AND IFNULL(i.`str_TYPE`, '') <> 'reserve'
  AND EXISTS (SELECT 1 FROM `t_inventaire_famille` f
               WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
                 AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`)
  AND EXISTS (SELECT 1 FROM `t_inventaire_famille` f
               JOIN `HMvtProduit` h ON h.`pkey` = CAST(f.`lg_INVENTAIRE_FAMILLE_ID` AS CHAR)
                    AND h.`typeMvt` = '04'
               WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID`)
  AND NOT EXISTS (SELECT 1 FROM `t_inventaire_famille` f
                   JOIN `t_mouvement` m ON m.`lg_FAMILLE_ID` = f.`lg_FAMILLE_ID`
                        AND m.`str_ACTION` = 'INVENTAIRE'
                        AND m.`dt_DAY` = DATE(i.`dt_UPDATED`)
                        AND m.`lg_EMPLACEMENT_ID` = i.`lg_EMPLACEMENT_ID`
                   WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
                     AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`);

-- ---------------------------------------------------------------------
-- 2. Les lignes a rattraper, regroupees par produit et par journee : un
--    seul mouvement par produit et par jour, comme le faisait la
--    procedure (elle cumulait sur la ligne existante).
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS `tmp_rattrapage_inventaire`;
CREATE TEMPORARY TABLE `tmp_rattrapage_inventaire` (
    `lg_FAMILLE_ID` varchar(40) NOT NULL,
    `lg_FAMILLE_STOCK_ID` varchar(50) DEFAULT NULL,
    `lg_EMPLACEMENT_ID` varchar(40) NOT NULL,
    `lg_USER_ID` varchar(40) NOT NULL,
    `jour` date NOT NULL,
    `dt_CLOTURE` datetime DEFAULT NULL,
    `qte_comptee` int(11) DEFAULT 0,
    `qte_initiale` int(11) DEFAULT 0,
    `nbre_lignes` int(11) DEFAULT 0,
    KEY `k_famille` (`lg_FAMILLE_ID`),
    KEY `k_jour` (`jour`)
) ENGINE=InnoDB;

INSERT INTO `tmp_rattrapage_inventaire`
    (`lg_FAMILLE_ID`, `lg_FAMILLE_STOCK_ID`, `lg_EMPLACEMENT_ID`, `lg_USER_ID`, `jour`, `dt_CLOTURE`,
     `qte_comptee`, `qte_initiale`, `nbre_lignes`)
SELECT f.`lg_FAMILLE_ID`, MIN(f.`lg_FAMILLE_STOCK_ID`), i.`lg_EMPLACEMENT_ID`, i.`lg_USER_ID`,
       DATE(r.`dt_CLOTURE`), MIN(r.`dt_CLOTURE`),
       SUM(f.`int_NUMBER`), SUM(f.`int_NUMBER_INIT`), COUNT(*)
FROM `rattrapage_cloture_inventaire` r
JOIN `t_inventaire` i ON i.`lg_INVENTAIRE_ID` = r.`lg_INVENTAIRE_ID`
JOIN `t_inventaire_famille` f ON f.`lg_INVENTAIRE_ID` = r.`lg_INVENTAIRE_ID`
     AND f.`bool_INVENTAIRE` = 1 AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`
WHERE r.`dt_RATTRAPAGE` IS NULL
GROUP BY f.`lg_FAMILLE_ID`, i.`lg_EMPLACEMENT_ID`, i.`lg_USER_ID`, DATE(r.`dt_CLOTURE`);

-- ---------------------------------------------------------------------
-- 3. Mouvement du jour (t_mouvement, action INVENTAIRE). Une ligne deja
--    presente pour ce produit, ce jour, cet emplacement et cet operateur
--    n'est pas touchee : on ne peut pas savoir si elle compte deja cet
--    inventaire.
-- ---------------------------------------------------------------------
INSERT INTO `t_mouvement`
    (`lg_MOUVEMENT_ID`, `lg_FAMILLE_ID`, `lg_USER_ID`, `P_KEY`, `str_TYPE_ACTION`, `str_ACTION`,
     `dt_DAY`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`, `int_NUMBER`, `int_NUMBERTRANSACTION`,
     `lg_EMPLACEMENT_ID`)
SELECT UUID(), t.`lg_FAMILLE_ID`, t.`lg_USER_ID`, '', 'OTHER', 'INVENTAIRE',
       t.`jour`, t.`dt_CLOTURE`, NOW(), 'enable', t.`qte_comptee`, t.`nbre_lignes`, t.`lg_EMPLACEMENT_ID`
FROM `tmp_rattrapage_inventaire` t
WHERE NOT EXISTS (SELECT 1 FROM `t_mouvement` m
                   WHERE m.`lg_FAMILLE_ID` = t.`lg_FAMILLE_ID` AND m.`dt_DAY` = t.`jour`
                     AND m.`str_ACTION` = 'INVENTAIRE' AND m.`lg_USER_ID` = t.`lg_USER_ID`
                     AND m.`lg_EMPLACEMENT_ID` = t.`lg_EMPLACEMENT_ID`);

-- ---------------------------------------------------------------------
-- 4. Instantane du jour (t_mouvement_snapshot). Une ligne deja presente
--    pour ce produit et ce jour n'est PAS reecrite : son stock du jour
--    peut refleter un etat de fin de journee que ce rattrapage ne connait
--    pas.
-- ---------------------------------------------------------------------
INSERT INTO `t_mouvement_snapshot`
    (`lg_MOUVEMENT_SNAPSHOT_ID`, `lg_FAMILLE_ID`, `dt_DAY`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`,
     `int_NUMBERTRANSACTION`, `lg_EMPLACEMENT_ID`, `int_STOCK_JOUR`, `int_STOCK_DEBUT`)
SELECT UUID(), t.`lg_FAMILLE_ID`, t.`jour`, t.`dt_CLOTURE`, NOW(), 'enable',
       t.`nbre_lignes`, t.`lg_EMPLACEMENT_ID`, t.`qte_comptee`, t.`qte_initiale`
FROM `tmp_rattrapage_inventaire` t
WHERE NOT EXISTS (SELECT 1 FROM `t_mouvement_snapshot` s
                   WHERE s.`lg_FAMILLE_ID` = t.`lg_FAMILLE_ID` AND s.`dt_DAY` = t.`jour`
                     AND s.`lg_EMPLACEMENT_ID` = t.`lg_EMPLACEMENT_ID`);

-- ---------------------------------------------------------------------
-- 5. Date du dernier inventaire du produit. Jamais ramenee en arriere :
--    seule une date absente ou plus ancienne que la cloture est corrigee.
-- ---------------------------------------------------------------------
UPDATE `t_famille` f
JOIN `tmp_rattrapage_inventaire` t ON t.`lg_FAMILLE_ID` = f.`lg_FAMILLE_ID`
SET f.`dt_LAST_INVENTAIRE` = t.`dt_CLOTURE`
WHERE f.`dt_LAST_INVENTAIRE` IS NULL OR f.`dt_LAST_INVENTAIRE` < t.`dt_CLOTURE`;

-- ---------------------------------------------------------------------
-- 6. Stock par type (rayon). Il est realigne sur le stock rayon
--    D'AUJOURD'HUI (t_famille_stock), et non sur la quantite comptee a
--    l'epoque : depuis la cloture, les ventes et les receptions ont fait
--    bouger le stock. C'est exactement ce que fait l'application a chaque
--    mouvement rayon / reserve (ReserveServiceImpl : le stock par type est
--    recale sur le stock rayon).
--    Type 1 pour l'officine, type 3 pour un autre emplacement, comme la
--    procedure et comme la cloture actuelle.
-- ---------------------------------------------------------------------
UPDATE `t_type_stock_famille` ts
JOIN `tmp_rattrapage_inventaire` t ON t.`lg_FAMILLE_ID` = ts.`lg_FAMILLE_ID`
     AND ts.`lg_EMPLACEMENT_ID` = t.`lg_EMPLACEMENT_ID`
     AND ts.`lg_TYPE_STOCK_ID` = IF(t.`lg_EMPLACEMENT_ID` = '1', '1', '3')
JOIN `t_famille_stock` s ON s.`lg_FAMILLE_ID` = t.`lg_FAMILLE_ID`
     AND s.`lg_EMPLACEMENT_ID` = t.`lg_EMPLACEMENT_ID`
SET ts.`int_NUMBER` = s.`int_NUMBER_AVAILABLE`, ts.`dt_UPDATED` = NOW()
WHERE ts.`str_STATUT` = 'enable' AND IFNULL(ts.`int_NUMBER`, -1) <> s.`int_NUMBER_AVAILABLE`;

-- ---------------------------------------------------------------------
-- 7. Trace : ce qui a ete ecrit pour chaque inventaire rattrape.
-- ---------------------------------------------------------------------
UPDATE `rattrapage_cloture_inventaire` r
SET r.`nbre_mouvements` = (
        SELECT COUNT(*) FROM `t_mouvement` m
         JOIN `t_inventaire_famille` f ON f.`lg_FAMILLE_ID` = m.`lg_FAMILLE_ID`
              AND f.`lg_INVENTAIRE_ID` = r.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
              AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`
         WHERE m.`str_ACTION` = 'INVENTAIRE' AND m.`dt_DAY` = DATE(r.`dt_CLOTURE`)
           AND m.`lg_EMPLACEMENT_ID` = r.`lg_EMPLACEMENT_ID`),
    r.`nbre_snapshots` = (
        SELECT COUNT(*) FROM `t_mouvement_snapshot` s
         JOIN `t_inventaire_famille` f ON f.`lg_FAMILLE_ID` = s.`lg_FAMILLE_ID`
              AND f.`lg_INVENTAIRE_ID` = r.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
              AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`
         WHERE s.`dt_DAY` = DATE(r.`dt_CLOTURE`) AND s.`lg_EMPLACEMENT_ID` = r.`lg_EMPLACEMENT_ID`),
    r.`nbre_dates_produit` = (
        SELECT COUNT(*) FROM `t_famille` fa
         JOIN `t_inventaire_famille` f ON f.`lg_FAMILLE_ID` = fa.`lg_FAMILLE_ID`
              AND f.`lg_INVENTAIRE_ID` = r.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
              AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`
         WHERE fa.`dt_LAST_INVENTAIRE` >= r.`dt_CLOTURE`),
    r.`nbre_type_stock` = (
        SELECT COUNT(*) FROM `t_type_stock_famille` ts
         JOIN `t_inventaire_famille` f ON f.`lg_FAMILLE_ID` = ts.`lg_FAMILLE_ID`
              AND f.`lg_INVENTAIRE_ID` = r.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
              AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`
         JOIN `t_famille_stock` fs ON fs.`lg_FAMILLE_ID` = ts.`lg_FAMILLE_ID`
              AND fs.`lg_EMPLACEMENT_ID` = ts.`lg_EMPLACEMENT_ID`
         WHERE ts.`lg_EMPLACEMENT_ID` = r.`lg_EMPLACEMENT_ID`
           AND ts.`lg_TYPE_STOCK_ID` = IF(r.`lg_EMPLACEMENT_ID` = '1', '1', '3')
           AND ts.`str_STATUT` = 'enable' AND ts.`int_NUMBER` = fs.`int_NUMBER_AVAILABLE`),
    r.`dt_RATTRAPAGE` = NOW()
WHERE r.`dt_RATTRAPAGE` IS NULL;

DROP TEMPORARY TABLE IF EXISTS `tmp_rattrapage_inventaire`;
