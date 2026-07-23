-- =====================================================================
-- Menus "Promotions" et "Historique de promotions"
-- ---------------------------------------------------------------------
-- Les ecrans de ces deux menus n'existaient plus dans l'application (ni
-- vue ExtJS ni webservice) : le clic n'affichait ni vue ni donnees. Les
-- ecrans sont reconstruits en API REST (v1/promotions) avec les xtypes
-- 'promotionmanager' et 'promotionhistorymanager'. Cette migration
-- rebranche les sous-menus existants sur ces composants, quel que soit
-- le composant qu'ils referencaient auparavant.
-- =====================================================================

UPDATE t_sous_menu
SET str_COMPOSANT = 'promotionmanager'
WHERE (UPPER(str_DESCRIPTION) LIKE '%PROMOTION%' OR UPPER(str_VALUE) LIKE '%PROMOTION%')
  AND UPPER(CONCAT(IFNULL(str_DESCRIPTION, ''), ' ', IFNULL(str_VALUE, ''))) NOT LIKE '%HISTORIQUE%';

UPDATE t_sous_menu
SET str_COMPOSANT = 'promotionhistorymanager'
WHERE (UPPER(str_DESCRIPTION) LIKE '%PROMOTION%' OR UPPER(str_VALUE) LIKE '%PROMOTION%')
  AND UPPER(CONCAT(IFNULL(str_DESCRIPTION, ''), ' ', IFNULL(str_VALUE, ''))) LIKE '%HISTORIQUE%';
