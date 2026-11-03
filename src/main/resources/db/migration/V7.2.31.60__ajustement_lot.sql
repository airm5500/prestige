-- =====================================================================
-- Ajustement : lot choisi sur la ligne (audit 06 AJ-02)
-- ---------------------------------------------------------------------
-- Sur une ligne d'ajustement negatif (web et mobile), l'utilisateur peut
-- indiquer le lot. A la cloture, ce lot est diminue en premier ; sans lot,
-- ou pour ce qu'il ne couvre pas, la regle de la vente s'applique (lots
-- valables qui periment le plus tot, puis lots deja perimes).
-- Colonne facultative : les lignes existantes restent sans lot.
-- =====================================================================
ALTER TABLE t_ajustement_detail ADD COLUMN IF NOT EXISTS lg_LOT_ID VARCHAR(40) NULL;
