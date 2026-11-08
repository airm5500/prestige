-- Plan du 06/11/2026, point 15 : PSCODE, reference Ubipharm de l'article (code grossiste secondaire, ex. FORT256).
-- Range sur la fiche article (t_famille) comme le code EAN 13, et non dans t_famille_grossiste. Facultatif, en
-- majuscules, 20 caracteres au plus, non unique ; cherche par la fiche article et par l'ecran de vente.
-- Rejouable (IF NOT EXISTS).
ALTER TABLE t_famille ADD COLUMN IF NOT EXISTS str_PSCODE VARCHAR(20) NULL DEFAULT NULL;
CREATE INDEX IF NOT EXISTS ix_famille_pscode ON t_famille (str_PSCODE);
