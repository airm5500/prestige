-- Libelles de deux menus, revus en recette.
--
-- 1) « Registre des produits demandes mais non vendus » etait trop long pour la barre de menus :
--    le sous-menu et sa description deviennent « Registre des produits rates ».
-- 2) « Suppressions a la vente » ne disait pas ce que l'ecran contient reellement - les articles
--    retires d'une vente ET les ventes abandonnees : il devient « Produits retires et ventes
--    abandonnees ».
--
-- Seuls des libelles changent : aucun identifiant, aucun composant, aucun droit n'est touche.
-- Les deux mises a jour sont ciblees sur le composant, pas sur un identifiant de ligne, pour
-- fonctionner quel que soit l'historique de la base.

UPDATE t_sous_menu
   SET str_VALUE = 'Registre des produits ratés',
       str_DESCRIPTION = 'Registre des produits ratés',
       dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'ventesrateesmanager';

UPDATE t_sous_menu
   SET str_VALUE = 'Produits rétirés et ventes abandonnées',
       str_DESCRIPTION = 'Produits rétirés et ventes abandonnées',
       dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'suppressionsvente';
