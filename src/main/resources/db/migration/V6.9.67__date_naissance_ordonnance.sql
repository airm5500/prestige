-- =====================================================================
-- Ordonnances clients, retour du 30/09 : DATE DE NAISSANCE du patient.
--
-- Facultative. Saisie sur la fiche, avant l'age : l'age de l'ordonnance
-- en est deduit au jour de l'ordonnance. Pour un client STANDARD, elle
-- est aussi reportee sur t_client.dt_NAISSANCE (colonne existante) et
-- reprise aux ordonnances suivantes.
-- =====================================================================
ALTER TABLE t_ordonnance_client ADD COLUMN IF NOT EXISTS dt_NAISSANCE_PATIENT DATE NULL AFTER int_AGE_PATIENT;
