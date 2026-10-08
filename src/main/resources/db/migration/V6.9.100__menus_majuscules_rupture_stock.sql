-- Retours du 08/10 :
-- 1) menu « Liste des ruptures de stock » (ancien ecran rupturefournisseurmanager) desactive ; la liste des ruptures
--    PharmaML (rupturepharma) reste.
UPDATE `t_sous_menu` SET `str_Status` = 'disable' WHERE `lg_SOUS_MENU_ID` = '57211545311829336645';
-- 2) libelles des menus en MAJUSCULES comme les autres (Ressources humaines, Centre de Support...).
UPDATE `t_menu` SET `str_VALUE` = UPPER(`str_VALUE`), `str_DESCRIPTION` = UPPER(`str_DESCRIPTION`);
