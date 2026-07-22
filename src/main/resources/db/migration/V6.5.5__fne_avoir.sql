-- =====================================================================
-- FNE - Certification de facture d'avoir (API #2 /refund)
-- ---------------------------------------------------------------------
-- 1) fne_invoice : la table (creee en V5.7.1, jamais alimentee jusqu'ici)
--    stocke desormais la reponse JSON complete de chaque appel FNE.
--    Ajout de colonnes pour distinguer les certifications de vente (SALE)
--    des avoirs (AVOIR) et retrouver la reference FNE sans parser le JSON.
-- 2) t_facture : marquage simple de l'avoir emis (reference "A..." + URL
--    de verification). Aucune annulation automatique de la facture.
-- 3) Privilege AUTORISATION_AVOIR_FNE : requis pour emettre un avoir ou
--    rattacher une ancienne facture. Attribue par defaut au role systeme
--    '00' et aux profils Administrateur ; a accorder ensuite aux autres
--    roles via la gestion des roles/privileges.
-- Toutes les modifications sont additives : aucune colonne ni donnee
-- existante n'est modifiee.
-- =====================================================================

ALTER TABLE `fne_invoice`
    ADD COLUMN IF NOT EXISTS `type` VARCHAR(20) NOT NULL DEFAULT 'SALE' AFTER `mvt_date`,
    ADD COLUMN IF NOT EXISTS `reference` VARCHAR(70) NULL DEFAULT NULL AFTER `type`;

ALTER TABLE `t_facture`
    ADD COLUMN IF NOT EXISTS `fne_avoir_reference` VARCHAR(70) NULL DEFAULT NULL AFTER `fne_url`,
    ADD COLUMN IF NOT EXISTS `fne_avoir_url` VARCHAR(500) NULL DEFAULT NULL AFTER `fne_avoir_reference`;

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260722', 'AUTORISATION_AVOIR_FNE', 'CUSTOMER', 'Autorisation d''avoir FNE', NULL, NOW(), NULL, NULL, NULL, 'enable');

-- Attribution : role systeme '00'
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), '00', p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_privilege p
WHERE p.str_NAME = 'AUTORISATION_AVOIR_FNE'
  AND NOT EXISTS (
      SELECT 1 FROM t_role_privelege rp
       WHERE rp.lg_ROLE_ID = '00' AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
  );

-- Attribution : profils Administrateur / Super Administrateur
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_role r
JOIN t_privilege p ON p.str_NAME = 'AUTORISATION_AVOIR_FNE'
WHERE r.str_STATUT = 'enable'
  AND (
        r.str_NAME LIKE 'Administrateur%'
        OR r.str_NAME LIKE 'Super Administrateur%'
        OR r.str_DESIGNATION LIKE 'Administrateur%'
        OR r.str_DESIGNATION LIKE 'Super Administrateur%'
      )
  AND NOT EXISTS (
      SELECT 1 FROM t_role_privelege rp
       WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
  );
