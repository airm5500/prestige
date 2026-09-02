-- Menu « CA par zone géographique » renomme « Analyse CA Par Emplacement/Famille » (retour de recette)
UPDATE t_sous_menu SET str_VALUE = 'Analyse CA Par Emplacement/Famille',
       str_DESCRIPTION = 'Analyse du chiffre d''affaires par emplacement et par famille, comparaison de périodes'
WHERE str_COMPOSANT = 'cazonegeomanager';
