-- Indexes pour les requetes du tableau de bord d'accueil (api/v1/recap/dashboard/*).
-- t_preenregistrement est deja couverte par idx_preenregistrement_eval_vente (V6.1.1, dt_UPDATED)
-- et idx_preenregistrement_stat_operateur (V6.0.6, dt_CREATED).

-- Valeur des achats du jour et achats par grossiste :
-- WHERE str_STATUT = 'is_Closed' AND dt_UPDATED entre deux bornes
ALTER TABLE t_bon_livraison
    ADD INDEX IF NOT EXISTS idx_bon_livraison_statut_dt_updated (str_STATUT, dt_UPDATED) USING BTREE;

-- Mouvements de caisse du jour : WHERE dt_CREATED entre deux bornes, groupe par type
ALTER TABLE t_mvt_caisse
    ADD INDEX IF NOT EXISTS idx_mvt_caisse_dt_created (dt_CREATED) USING BTREE;
