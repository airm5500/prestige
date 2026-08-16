-- Les colonnes « Part tiers payant » des modeles de facture dynamiques prennent le libelle court
-- « Part TP ».
--
-- Pourquoi : sur la facture, l'entete « PART TIERS PAYANT » est plus large que les montants qu'il
-- coiffe. Sa colonne devait donc etre large pour son seul titre, et cette place etait prise au
-- nom du client juste a cote, dont les noms longs passaient a la ligne.
--
-- Seules les colonnes que personne n'a renommees sont touchees : un libelle choisi par
-- l'utilisateur reste tel qu'il l'a ecrit.
UPDATE model_facture_dynamique_colonne
   SET str_LIBELLE = 'Part TP'
 WHERE str_CHAMP = 'PART_TIERS_PAYANT'
   AND str_LIBELLE IN ('Part tiers payant', 'Part Tiers Payant', 'PART TIERS PAYANT');
