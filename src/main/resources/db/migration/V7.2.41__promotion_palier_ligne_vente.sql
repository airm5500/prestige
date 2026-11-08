-- Plan du 06/11/2026, points 3.2 et 3.5 (demande du 07/11) : promotions en unites gratuites.
-- 1. Option « par palier de » a cote de « a partir de » : str_MODE_UG = 'PALIER' ou 'A_PARTIR' (NULL = A_PARTIR).
--    Gardee aussi dans l'historique des promotions.
-- 2. La ligne de vente garde la promotion telle qu'elle etait le jour de la vente : type, option, seuil, unites
--    gratuites, prix d'avant la promotion. Le ticket, la reimpression et les ecrans les relisent, meme si la promotion a
--    ete modifiee ou supprimee depuis. Colonnes vides pour les ventes d'avant : l'ancien texte reste.
-- Rejouable (IF NOT EXISTS).
ALTER TABLE t_promotion_product ADD COLUMN IF NOT EXISTS str_MODE_UG VARCHAR(10) NULL DEFAULT NULL;
ALTER TABLE t_promotion_history ADD COLUMN IF NOT EXISTS str_MODE_UG VARCHAR(10) NULL DEFAULT NULL;
ALTER TABLE t_preenregistrement_detail
    ADD COLUMN IF NOT EXISTS promo_type VARCHAR(40) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS promo_mode VARCHAR(10) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS promo_seuil INT NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS promo_gratuites INT NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS promo_prix_avant INT NULL DEFAULT NULL;
