-- =====================================================================
-- Evolution 5, point 1 : vente dans un depot d'extension
-- ---------------------------------------------------------------------
-- Jusqu'ici une vente n'avait pas d'emplacement propre : tout le code
-- deduisait l'emplacement de la vente de celui de son utilisateur
-- (tp.lg_USER_ID -> t_user.lg_EMPLACEMENT_ID). Cette convention suffit
-- a l'officine, mais elle interdit qu'un operateur de l'officine vende
-- le stock d'un depot d'extension : le destockage, les references et
-- les contrats de stock tomberaient sur l'officine.
--
-- On pose donc un emplacement de vente explicite, NULLABLE. NULL est
-- l'etat de toutes les ventes existantes et de toutes les ventes
-- d'officine a venir : le code retombe alors exactement sur l'ancienne
-- regle (l'emplacement de l'utilisateur de la vente), sans changement
-- de comportement. Renseigne, il designe le depot d'extension dont le
-- stock est vendu ; l'argent, lui, reste dans la caisse de l'operateur
-- connecte (mvttransaction.magasin / caisse, inchanges).
--
-- A ne pas confondre avec PK_BRAND, qui porte deja l'emplacement du
-- depot CLIENT d'une « vente a un depot ». Ici le depot n'est pas le
-- client : c'est le lieu de la vente.
-- =====================================================================

ALTER TABLE `t_preenregistrement`
    ADD COLUMN IF NOT EXISTS `lg_EMPLACEMENT_VENTE_ID` VARCHAR(50) NULL DEFAULT NULL
    COMMENT 'Depot d extension ou la vente a lieu ; NULL = vente d officine';

CREATE INDEX IF NOT EXISTS `idx_preenregistrement_emplacement_vente`
    ON `t_preenregistrement` (`lg_EMPLACEMENT_VENTE_ID`);

-- Privilege de la vente en contexte depot. Sans lui l'ecran de vente se
-- comporte comme aujourd'hui : aucun selecteur de depot n'est propose.
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260918', 'P_VENTE_DEPOT_EXTENSION', 'CUSTOMER',
            'Vendre le stock d un depot d extension depuis l ecran de vente de l officine',
            NULL, NOW(), NULL, NOW(), NULL, 'enable');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260918', NOW(), NOW()
  FROM t_role r
 WHERE UPPER(r.str_NAME) LIKE '%ADMIN%'
   AND r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260918');
