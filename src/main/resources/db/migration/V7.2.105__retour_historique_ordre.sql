-- =====================================================================
-- 09/11 : historique d'un retour fournisseur dans l'ordre des actions.
-- dt_ACTION est a la seconde ; deux actions de la meme seconde etaient departagees par l'identifiant (UUID tire au
-- hasard), d'ou un historique parfois dans le desordre. Numero croissant pose a l'insertion, lu en second critere
-- de tri (RetourAttenteService). Les lignes deja presentes recoivent un numero ; leur ordre reste celui de dt_ACTION.
-- Idempotente.
-- =====================================================================
ALTER TABLE t_retour_fournisseur_historique
    ADD COLUMN IF NOT EXISTS ordre BIGINT NOT NULL AUTO_INCREMENT UNIQUE;
