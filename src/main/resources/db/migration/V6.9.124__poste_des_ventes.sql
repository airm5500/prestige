-- Retours du 10/10 (journal, precision) : les ventes ne sont PAS journalisees ; chaque vente garde le poste d'ou
-- elle a ete faite (saisie et encaissement) et l'adresse IP, pour le detail et le filtre de « Ventes terminees ».
ALTER TABLE t_preenregistrement
    ADD COLUMN IF NOT EXISTS str_POSTE_SAISIE VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS str_POSTE VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS str_IP VARCHAR(64) NULL;

-- Lignes « Vente » / « Prevente » ecrites par la version precedente (types retires) : sans objet desormais.
DELETE FROM t_event_log WHERE typeLog IN (38, 39);
