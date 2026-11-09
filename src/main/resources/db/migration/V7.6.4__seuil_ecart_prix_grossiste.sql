-- Correspondance produits grossistes / Prestige, lot 4 : seuil d'ecart tolere (FCFA) entre le dernier prix public
-- TTC lu chez un grossiste et le prix de vente Prestige. 0 par defaut : tout ecart est signale. Reglable depuis l'ecran
-- « Correspondance grossistes » (droit P_CORRESPONDANCE_GROSSISTES). Rejouable.
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_CORRESPONDANCE_SEUIL_ECART_PRIX', '0', 'ECART TOLERE ENTRE PRIX PUBLIC GROSSISTE ET PRIX PRESTIGE (FCFA)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
