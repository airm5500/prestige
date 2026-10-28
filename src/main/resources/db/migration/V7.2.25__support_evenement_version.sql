-- =====================================================================
-- Centre de support : version du build qui a produit l'evenement
-- ---------------------------------------------------------------------
-- Rapport des anomalies du 26/10 (SC8) : chaque caisse fait tourner son
-- propre serveur, mis a jour a des dates differentes. La version (horodatage
-- du build) de la DERNIERE occurrence est gardee avec l'evenement.
-- =====================================================================

ALTER TABLE t_application_event ADD COLUMN IF NOT EXISTS version_app VARCHAR(40) NULL;
