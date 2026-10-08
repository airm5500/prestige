-- PharmaML (retours du 08/10, decision de l'officine) :
-- 1) 1.0.0.0 redevient la version par defaut (commande et information produit) : DPCI refuse la 3.0.0.0 et les envois
--    1.0.0.0 fonctionnaient chez LABOREX / TEDIS avant le 06/10. Tous les grossistes repassent en 1.0.0.0 ; la 3.0.0.0
--    se choisit dans la fiche d'un grossiste qui l'a confirmee.
ALTER TABLE `t_grossiste`
  MODIFY COLUMN `str_PHARMAML_VERSION_INFO` VARCHAR(10) NOT NULL DEFAULT '1.0.0.0',
  MODIFY COLUMN `str_PHARMAML_VERSION_CMDE` VARCHAR(10) NOT NULL DEFAULT '1.0.0.0';
UPDATE `t_grossiste` SET `str_PHARMAML_VERSION_INFO` = '1.0.0.0', `str_PHARMAML_VERSION_CMDE` = '1.0.0.0';

-- 2) En-tete de controle Content-PharmaML regle PAR GROSSISTE (CSRP = specification v4.8 § 4.4.3, AUCUN = pas
--    d'en-tete, comme avant le 07/10 ; HMAC_MD5, MD5_CLE_FIN, MD5_CLE_DEBUT : variantes). Vide = parametre global
--    KEY_PHARMAML_CONTROLE. Existant : comportement d'avant (AUCUN), sauf DPCI qui exige le controle (CSRP).
ALTER TABLE `t_grossiste` ADD COLUMN IF NOT EXISTS `str_PHARMAML_CONTROLE` VARCHAR(15) NULL;
UPDATE `t_grossiste` SET `str_PHARMAML_CONTROLE` = CASE WHEN UPPER(`str_LIBELLE`) LIKE '%DPCI%' THEN 'CSRP' ELSE 'AUCUN' END
WHERE `str_PHARMAML_CONTROLE` IS NULL;
