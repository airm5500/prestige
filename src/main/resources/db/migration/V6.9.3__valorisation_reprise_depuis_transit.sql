-- =====================================================================
-- Valorisation historique : reprise depuis l'archive relationnelle
-- ---------------------------------------------------------------------
-- La reprise lisait l'archive JSON stock_snapshot. Sur les officines
-- installees de longue date, t_stock_snapshot s'est revelee etre la
-- vraie archive : elle porte deux ans et demi de releves, avec le PMP et
-- le taux de TVA figes a la date reelle, la ou le JSON a perdu le PMP
-- (recopie du PAF) et n'a jamais porte la TVA.
--
-- Surtout : t_stock_snapshot n'a aucune colonne de reserve, donc rien ne
-- peut y falsifier la reserve. Le JSON, lui, a recu la reserve du jour de
-- la migration appliquee a des journees vieilles de deux ans.
--
-- La reprise se fait donc en deux etapes : d'abord l'archive
-- relationnelle, journee par journee, puis le JSON pour les seules
-- journees que l'archive ne couvre pas.
-- =====================================================================

ALTER TABLE `stock_snapshot_backfill`
    ADD COLUMN `etape` VARCHAR(20) NOT NULL DEFAULT 'TRANSIT' AFTER `id`,
    ADD COLUMN `derniere_journee` INT NULL AFTER `etape`,
    ADD COLUMN `journees_reprises` INT NOT NULL DEFAULT 0 AFTER `derniere_journee`;

-- La reprise precedente lisait le JSON : ce qu'elle a pu ecrire porte la
-- fausse reserve et un PMP errone. On la relance depuis le debut, l'ecriture
-- etant idempotente (mise a jour sur cle primaire, jamais de doublon).
UPDATE `stock_snapshot_backfill`
   SET `etape` = 'TRANSIT', `derniere_journee` = NULL, `journees_reprises` = 0,
       `dernier_produit_id` = NULL, `documents_lus` = 0, `documents_invalides` = 0,
       `lignes_importees` = 0, `journees_retenues` = NULL, `termine` = 0, `started_at` = NULL
 WHERE `id` = 1;

-- ---------------------------------------------------------------------
-- Date d'activation du suivi de la reserve, propre a chaque officine.
-- Laissee vide : elle est detectee dans la base au premier besoin, puis
-- ecrite ici. Le support peut la corriger a la main si la detection se
-- trompe. Valeurs particulieres : AUCUNE (reserve jamais activee, tout
-- l'historique est a zero) et INDETERMINEE (non datable : par prudence,
-- aucun assainissement n'est effectue).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
	VALUES ('KEY_VALORISATION_RESERVE_DEPUIS', '', 'DATE D''ACTIVATION DU SUIVI DE LA RESERVE (yyyyMMdd, AUCUNE OU INDETERMINEE)', 'SYSTEME', 'enable', NULL, NULL, NULL, NULL);
