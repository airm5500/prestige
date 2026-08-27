-- =====================================================================
-- Fiche article - Mode de recherche
-- ---------------------------------------------------------------------
-- La recherche de l'ecran "Gestion des Articles" trouvait uniquement les
-- articles dont le CIP ou le nom COMMENCE PAR le texte saisi. Elle
-- cherche desormais partout dans le libelle (mode "contient"), et un
-- parametre permet de revenir a l'ancien comportement.
--
-- Ce mode ne concerne QUE la fiche article : la recherche de l'ecran de
-- commande et celle de la vente gardent leur comportement.
--
-- Valeurs :
--   contient     : le texte est cherche n'importe ou (defaut).
--   commence par : comportement historique.
-- =====================================================================

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('MODE_RECHERCHE_FICHE_ARTICLE', 'contient', 'Recherche fiche article : contient ou commence par', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
