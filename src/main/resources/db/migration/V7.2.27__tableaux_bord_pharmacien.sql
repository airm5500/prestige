-- Retours du 30/10 : les deux tableaux de bord du pharmacien de l'officine depassaient 25 caracteres (besoins du 11/10,
-- point 8). « Tableau de bord pharmacien » (tableauBordPharmacienManager) est desactive ; « Tableau de bord du
-- pharmacien2 » (tableauPhama), qui reste seul, devient « Tableau bord pharmacien », texte long en infobulle.
-- Menus propres aux officines qui les ont : sans effet ailleurs. Rejouable.
UPDATE t_sous_menu SET str_Status = 'disable'
 WHERE str_COMPOSANT = 'tableauBordPharmacienManager' AND str_Status = 'enable';
UPDATE t_sous_menu SET str_VALUE = IF(CHAR_LENGTH(IFNULL(str_VALUE, '')) >= CHAR_LENGTH(str_DESCRIPTION), str_VALUE, str_DESCRIPTION), str_DESCRIPTION = 'Tableau bord pharmacien' WHERE str_COMPOSANT = 'tableauPhama' AND CHAR_LENGTH(str_DESCRIPTION) > 25;
