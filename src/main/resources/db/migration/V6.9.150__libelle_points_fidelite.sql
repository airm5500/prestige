-- Retour du 14/10 : le menu de la fidelite reprend le libelle « Points fidelite » (demande du 10/10) a la place de
-- « Suivi fidelite » (libelles courts du 12/10). Le texte long reste en infobulle (str_VALUE).
UPDATE t_sous_menu SET str_DESCRIPTION = 'Points fidélité' WHERE str_COMPOSANT = 'fideliteclients';
