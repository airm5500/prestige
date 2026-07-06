-- Index de performance sur t_preenregistrement, jusqu'ici créés manuellement
-- en base et non versionnés. IF NOT EXISTS => sans effet là où ils existent déjà.

-- Avoirs non clôturés (cloche de notifications / centre des avoirs) :
-- filtre b_IS_AVOIR + borne de date. Évite le scan complet qui faisait
-- dépasser le timeout (connexions abandonnées).
ALTER TABLE t_preenregistrement
    ADD INDEX IF NOT EXISTS idx_preenr_avoir_date (b_IS_AVOIR, dt_UPDATED) USING BTREE;

-- Liste des préventes (str_STATUT + date) : requête ramenée de ~13s à ~1,6s.
ALTER TABLE t_preenregistrement
    ADD INDEX IF NOT EXISTS idx_preenr_statut_date (str_STATUT, dt_UPDATED) USING BTREE;
