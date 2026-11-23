-- Retour du 22/11 (lot 9), fiche article : les boutons suivent trois autorisations nommees.
--   P_BTN_IMPORT_ARTICLE : menu « Importation » (importer, verifier l'importation)
--   P_BTN_MAJ_SEUIL      : boutons « Recalculer seuils », « MAJ SEUIL » et « MAJ SÉLECTIVE »
--   P_BTN_CREER_ARTICLE  : bouton « Créer un Article »
-- Le recalcul des seuils ne lit plus P_BTN_RECALCULER_SEUILS : ce privilege est retire de la liste des droits
-- (desactive, ses attributions sont gardees pour l'historique). Sur les bases vues le 22/11, il etait attribue aux memes
-- roles que P_BTN_MAJ_SEUIL : aucun role ne gagne ni ne perd le recalcul.
UPDATE t_privilege SET str_DESCRIPTION = 'Autorisation d''importation fiche article', dt_UPDATED = NOW()
	WHERE str_NAME = 'P_BTN_IMPORT_ARTICLE';
UPDATE t_privilege SET str_DESCRIPTION = 'Autorisation de mise à jour sur fiche article', dt_UPDATED = NOW()
	WHERE str_NAME = 'P_BTN_MAJ_SEUIL';
UPDATE t_privilege SET str_DESCRIPTION = 'Autorisation de création article', dt_UPDATED = NOW()
	WHERE str_NAME = 'P_BTN_CREER_ARTICLE';
UPDATE t_privilege SET str_DESCRIPTION = 'Fiche article : recalculer seuils (remplacé par l''autorisation de mise à jour sur fiche article)',
	str_STATUT = 'disable', dt_UPDATED = NOW()
	WHERE str_NAME = 'P_BTN_RECALCULER_SEUILS';
