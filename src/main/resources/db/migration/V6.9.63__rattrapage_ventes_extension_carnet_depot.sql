-- Rattrapage des ventes faites DANS un depot d'extension avec un carnet qui
-- n'etait pas encore marque « carnet depot ».
--
-- La colonne lg_EMPLACEMENT_VENTE_ID est le critere fiable : PK_BRAND designe
-- au contraire le depot CLIENT d'une vente « a un depot ».
--
-- La procedure travaille en deux temps afin d'eviter une modification massive
-- accidentelle :
--   CALL proc_rattraper_ventes_extension_carnet_depot('2026-09-17', FALSE);
--     -> simulation de tous les emplacements sauf l'officine (identifiant 1) ;
--   CALL proc_rattraper_ventes_extension_carnet_depot('2026-09-17', TRUE);
--     -> applique le rattrapage a tous ces emplacements.
--
-- Une table de trace rend l'operation idempotente : une ligne de prise en charge
-- deja ajoutee au solde ne peut pas l'etre une seconde fois.

CREATE TABLE IF NOT EXISTS `t_rattrapage_vente_extension_carnet_depot` (
    `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` VARCHAR(40) NOT NULL,
    `lg_PREENREGISTREMENT_ID` VARCHAR(40) NOT NULL,
    `lg_TIERS_PAYANT_ID` VARCHAR(40) NOT NULL,
    `lg_EMPLACEMENT_VENTE_ID` VARCHAR(50) NOT NULL,
    `montant` INT NOT NULL,
    `date_vente` DATETIME NOT NULL,
    `date_rattrapage` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`),
    KEY `idx_rattrapage_extension_tp` (`lg_TIERS_PAYANT_ID`),
    KEY `idx_rattrapage_extension_vente` (`lg_PREENREGISTREMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
  COMMENT='Trace idempotente des ventes depot extension ajoutees au solde carnet depot';

DELIMITER @@

DROP PROCEDURE IF EXISTS `proc_rattraper_ventes_extension_carnet_depot` @@

CREATE PROCEDURE `proc_rattraper_ventes_extension_carnet_depot`(
    IN p_date_debut DATETIME,
    IN p_appliquer BOOLEAN
)
BEGIN
    DECLARE v_date_debut DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_ventes_extension_carnet_depot;
        RESIGNAL;
    END;

    IF p_date_debut IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La date de debut est obligatoire';
    END IF;

    SET v_date_debut = p_date_debut;

    START TRANSACTION;

    DROP TEMPORARY TABLE IF EXISTS tmp_ventes_extension_carnet_depot;
    CREATE TEMPORARY TABLE tmp_ventes_extension_carnet_depot (
        ligne_id VARCHAR(40) NOT NULL,
        vente_id VARCHAR(40) NOT NULL,
        tiers_payant_id VARCHAR(40) NOT NULL,
        tiers_payant_nom VARCHAR(255) NULL,
        depot_id VARCHAR(50) NOT NULL,
        depot_nom VARCHAR(255) NULL,
        montant INT NOT NULL,
        date_vente DATETIME NOT NULL,
        PRIMARY KEY (ligne_id),
        KEY idx_tmp_rattrapage_tp (tiers_payant_id)
    ) ENGINE=InnoDB;

    INSERT INTO tmp_ventes_extension_carnet_depot
        (ligne_id, vente_id, tiers_payant_id, tiers_payant_nom,
         depot_id, depot_nom, montant, date_vente)
    SELECT cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID,
           p.lg_PREENREGISTREMENT_ID,
           tp.lg_TIERS_PAYANT_ID,
           tp.str_FULLNAME,
           depot.lg_EMPLACEMENT_ID,
           depot.str_NAME,
           cp.int_PRICE,
           p.dt_CREATED
      FROM t_preenregistrement_compte_client_tiers_payent cp
      JOIN t_preenregistrement p
        ON p.lg_PREENREGISTREMENT_ID = cp.lg_PREENREGISTREMENT_ID
      JOIN t_compte_client_tiers_payant ct
        ON ct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
      JOIN t_tiers_payant tp
        ON tp.lg_TIERS_PAYANT_ID = ct.lg_TIERS_PAYANT_ID
      JOIN t_emplacement depot
        ON depot.lg_EMPLACEMENT_ID = p.lg_EMPLACEMENT_VENTE_ID
      LEFT JOIN t_rattrapage_vente_extension_carnet_depot deja
        ON deja.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID =
           cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID
     WHERE p.int_PRICE > 0
       AND COALESCE(p.b_IS_CANCEL, 0) = 0
       AND p.str_STATUT = 'is_Closed'
       AND cp.int_PRICE > 0
       AND cp.str_STATUT = 'is_Closed'
       AND p.dt_CREATED >= v_date_debut
       -- L'emplacement 1 est l'officine : tous les autres sont a rattraper.
       AND depot.lg_EMPLACEMENT_ID <> '1'
       AND tp.lg_TYPE_TIERS_PAYANT_ID = '2'
       AND tp.str_STATUT = 'enable'
       -- Un carnet deja depot ou exclu a deja credite account lors de la vente.
       -- Le reprendre ici doublerait son solde.
       AND COALESCE(tp.is_depot, FALSE) = FALSE
       AND COALESCE(tp.to_be_exclude, FALSE) = FALSE
       AND deja.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID IS NULL;

    IF COALESCE(p_appliquer, FALSE) THEN
        UPDATE t_tiers_payant tp
        JOIN (
            SELECT tiers_payant_id, SUM(montant) AS montant
              FROM tmp_ventes_extension_carnet_depot
             GROUP BY tiers_payant_id
        ) r ON r.tiers_payant_id = tp.lg_TIERS_PAYANT_ID
           SET tp.account = COALESCE(tp.account, 0) + r.montant,
               tp.is_depot = TRUE;

        INSERT INTO t_rattrapage_vente_extension_carnet_depot
            (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID,
             lg_PREENREGISTREMENT_ID, lg_TIERS_PAYANT_ID,
             lg_EMPLACEMENT_VENTE_ID, montant, date_vente)
        SELECT ligne_id, vente_id, tiers_payant_id, depot_id, montant, date_vente
          FROM tmp_ventes_extension_carnet_depot;
    END IF;

    SELECT COALESCE(p_appliquer, FALSE) AS applique,
           COUNT(*) AS nombre_lignes,
           COUNT(DISTINCT vente_id) AS nombre_ventes,
           COUNT(DISTINCT tiers_payant_id) AS nombre_carnets,
           COALESCE(SUM(montant), 0) AS montant_total
      FROM tmp_ventes_extension_carnet_depot;

    SELECT tiers_payant_id, tiers_payant_nom, depot_id, depot_nom,
           COUNT(DISTINCT vente_id) AS nombre_ventes,
           SUM(montant) AS montant
      FROM tmp_ventes_extension_carnet_depot
     GROUP BY tiers_payant_id, tiers_payant_nom, depot_id, depot_nom
     ORDER BY depot_nom, tiers_payant_nom;

    COMMIT;
    DROP TEMPORARY TABLE IF EXISTS tmp_ventes_extension_carnet_depot;
END @@

DELIMITER ;
