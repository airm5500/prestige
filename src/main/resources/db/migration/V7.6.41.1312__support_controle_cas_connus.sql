-- Rapport d'exploitation du 13/11, point 11 : la veille de coherence remontait chaque nuit tout l'historique connu, sans
-- dire ce qui etait apparu depuis le passage precedent. On garde ici, par controle, les identifiants deja signales :
-- chaque passage separe les cas nouveaux des cas deja connus. Un cas resolu est retire ; s'il revient, il est nouveau.
-- Seuls des identifiants techniques sont gardes (premiere colonne du controle), jamais de donnee nominative.
CREATE TABLE IF NOT EXISTS t_support_controle_cas (
    code VARCHAR(60) NOT NULL,
    cas_id VARCHAR(191) NOT NULL,
    premier_vu DATETIME NOT NULL,
    PRIMARY KEY (code, cas_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
