-- Retours du 10/10 (Q11, lecture 2) : le controle des BL fait dans l'application mobile est exploite dans Prestige.
-- Qui a controle la ligne et quand (renseignes a chaque quantite controlee envoyee).
ALTER TABLE t_bon_livraison_detail
    ADD COLUMN IF NOT EXISTS dt_CONTROLE DATETIME NULL,
    ADD COLUMN IF NOT EXISTS lg_CONTROLE_USER VARCHAR(40) NULL;
