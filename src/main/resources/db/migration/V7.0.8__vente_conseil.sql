-- =====================================================================
-- Retours du 13/10 (point 11) : « Conseil » a la vente (facultatif) : la personne qui a conseille le client.
-- Enregistre a la cloture ; repris dans les statistiques d'activite par operateur (ventes conseillees).
-- Colonne ajoutee sans reecriture de la table (MariaDB 10.3+). Rejouable.
-- =====================================================================
ALTER TABLE t_preenregistrement ADD COLUMN IF NOT EXISTS lg_USER_CONSEIL_ID VARCHAR(40) NULL;
CREATE INDEX IF NOT EXISTS idx_preenregistrement_conseil ON t_preenregistrement (lg_USER_CONSEIL_ID, dt_CREATED);
