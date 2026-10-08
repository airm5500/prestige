-- Retours du 08/10 (13) : retours fournisseurs et reclamations par PharmaML (specification CSRP v4.8).
-- Demande d'autorisation de retour (REQ_RETOUR, § 3.1.5, motifs du tableau 6) et reclamation sur livraison
-- (RECLAMATIONS, § 3.1.4, motifs du tableau 3, actions du tableau 4) ; reponse du grossiste : bon de retour
-- (BON_RETOUR, § 3.2.5), souvent differe (fin de service puis vidage).

-- 1) correspondance motif local -> message PharmaML (RETOUR, RECLAMATION, AUCUN = pas d'envoi) et code norme
ALTER TABLE `t_motif_retour`
  ADD COLUMN IF NOT EXISTS `str_PML_TYPE` VARCHAR(12) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_CODE` VARCHAR(4) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_ACTION` VARCHAR(4) NULL;

UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RETOUR', `str_PML_CODE` = '0104' WHERE `str_CODE` IN ('PC', 'CE', 'AV') AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RETOUR', `str_PML_CODE` = '0103' WHERE `str_CODE` = 'PP' AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RETOUR', `str_PML_CODE` = '0105' WHERE `str_CODE` = 'RL' AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RETOUR', `str_PML_CODE` = '0111' WHERE `str_CODE` IN ('RBE', 'PE', 'EC', 'CO') AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RECLAMATION', `str_PML_CODE` = '0102', `str_PML_ACTION` = '0004' WHERE `str_CODE` = 'EL' AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RECLAMATION', `str_PML_CODE` = '0108', `str_PML_ACTION` = '0001' WHERE `str_CODE` = 'LNF' AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'RECLAMATION', `str_PML_CODE` = '0107', `str_PML_ACTION` = '0007' WHERE `str_CODE` = 'FNL' AND `str_PML_TYPE` IS NULL;
UPDATE `t_motif_retour` SET `str_PML_TYPE` = 'AUCUN' WHERE `str_CODE` = 'ER' AND `str_PML_TYPE` IS NULL;

-- 2) suivi de l'envoi sur le retour et sur chaque ligne
ALTER TABLE `t_retour_fournisseur`
  ADD COLUMN IF NOT EXISTS `str_PML_STATUT` VARCHAR(12) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_DETAIL` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_REF_RETOUR` VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_REF_RECLAMATION` VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_REF_BON_RETOUR` VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS `dt_PML_ENVOI` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `dt_PML_REPONSE` DATETIME NULL;

ALTER TABLE `t_retour_fournisseur_detail`
  ADD COLUMN IF NOT EXISTS `str_PML_TYPE` VARCHAR(12) NULL,
  ADD COLUMN IF NOT EXISTS `int_PML_NUM_LIGNE` INT NULL,
  ADD COLUMN IF NOT EXISTS `int_PML_QTE_DEMANDEE` INT NULL,
  ADD COLUMN IF NOT EXISTS `int_PML_QTE_ACCEPTEE` INT NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_COMMENTAIRE` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `str_PML_DATE_REPRISE` VARCHAR(20) NULL;
