-- Retours du 10/10 (journal, Q10 : tout le lot).
-- 1. Chaque ligne du journal porte l'application (navigateur, systeme) ; le poste et l'adresse IP utilisent les colonnes
--    existantes remote_host / remote_addr (jusqu'ici remplies seulement a la connexion). Detail avant / apres.
ALTER TABLE t_event_log
    ADD COLUMN IF NOT EXISTS str_APPLICATION VARCHAR(120) NULL,
    ADD COLUMN IF NOT EXISTS str_DETAIL TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_event_log_date ON t_event_log (dt_CREATED);

-- 2. Alertes et conservation, parametrables.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
 ('KEY_JOURNAL_ALERTE_ANNULATIONS', '3', 'Journal : alerte quand un meme utilisateur annule au moins ce nombre de ventes...', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_JOURNAL_ALERTE_MINUTES', '30', '...en moins de ce nombre de minutes (annulations en serie)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_JOURNAL_HEURE_DEBUT', '07:00', 'Journal : debut des horaires d''ouverture (operation avant = hors horaires)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_JOURNAL_HEURE_FIN', '21:00', 'Journal : fin des horaires d''ouverture (operation apres = hors horaires)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_JOURNAL_CONSERVATION_MOIS', '0', 'Journal : duree de conservation en mois (0 = tout garder) ; purge chaque nuit au-dela', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
