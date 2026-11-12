-- Lenteurs d'appaul (12/11) : ventes par mois du « Détail sur l'article » (4,9 s pour un article très vendu).
-- 0 = chargées à l'ouverture du détail (comme avant) ; 1 = chargées au clic sur « Afficher les ventes par mois ».
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_FICHE_VENTES_MOIS_A_LA_DEMANDE', '0', 'Détail sur l''article : 0 = ventes par mois chargées à l''ouverture, 1 = chargées au clic sur « Afficher les ventes par mois »', 'SYSTEME', 'enable');
