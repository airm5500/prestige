-- Retours du 10/10 : menu renomme « Pointer les BL / Avoirs ».
UPDATE t_sous_menu SET str_VALUE = 'Pointer les BL / Avoirs'
 WHERE str_COMPOSANT = 'pointagebl' AND str_VALUE = 'Pointage BL / avoirs';
