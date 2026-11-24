-- Retours du 23/11 : onglet « Historique » de la fiche article et avertissement à la création d'un article dont le CIP
-- appartient à une fiche désactivée ou supprimée.
-- Les lignes du journal qui concernent un produit portent sa référence (identifiant de la fiche, ou CIP pour les
-- lignes anciennes) dans str_TYPE_LOG : un index évite de parcourir tout le journal à chaque ouverture de l'onglet.
CREATE INDEX IF NOT EXISTS idx_event_log_ref ON t_event_log (str_TYPE_LOG);
