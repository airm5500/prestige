-- =====================================================================
-- Taille du nom de l'officine en tete de ticket
-- ---------------------------------------------------------------------
-- Elle etait figee a 15 points dans le code. Selon la longueur du nom et
-- la largeur du rouleau, ce nom passait a la ligne ou debordait, sans
-- aucun moyen de l'ajuster sans reprendre le code.
--
-- 15 reste la valeur par defaut : sans intervention, les tickets sortent
-- exactement comme avant.
-- =====================================================================

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`)
VALUES ('KEY_TAILLE_NOM_OFFICINE_TICKET', '15',
        'Taille de police du nom de l''officine en tete de ticket (en points, 15 par defaut)',
        'SYSTEME', 'enable');
