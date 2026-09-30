-- =====================================================================
-- Ordonnances clients, retour du 30/09 : la quantite servie se met a
-- jour toute seule quand la prevente nee de l'ordonnance est cloturee a
-- la caisse.
--
-- Le report est fait UNE fois par prevente (dt_REPORT_SERVICE), et ce
-- qui a ete reporte est garde ligne par ligne (str_REPORT : avant /
-- apres) pour pouvoir le DEFAIRE si la vente est annulee ensuite
-- (dt_ANNULATION_REPORT).
--
-- Colonnes ajoutees a une table de ce module, rien d'autre. Rejouable.
-- =====================================================================
ALTER TABLE t_ordonnance_client_prevente
    ADD COLUMN IF NOT EXISTS dt_REPORT_SERVICE DATETIME NULL,
    ADD COLUMN IF NOT EXISTS int_QTE_REPORTEE INT NULL,
    ADD COLUMN IF NOT EXISTS str_REPORT TEXT NULL,
    ADD COLUMN IF NOT EXISTS dt_ANNULATION_REPORT DATETIME NULL;
