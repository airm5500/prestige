-- Besoins du 11/10 (lot 4) : STABILITE DU SERVEUR. Historique des demarrages et des arrets du serveur (propre ou
-- brutal, avec la cause probable) et releves de l'etat du serveur toutes les 2 minutes (memoire, fils, processeur,
-- connexions a la base), conserves 14 jours : apres un arret brutal, on sait dans quel etat le serveur etait avant.
-- Aucune donnee de vente ni de client. Aucune donnee existante modifiee. Rejouable.
CREATE TABLE IF NOT EXISTS t_serveur_vie (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    hote                VARCHAR(80)  NOT NULL,
    pid                 BIGINT       NULL,
    demarre_at          DATETIME     NOT NULL,
    dernier_signe_at    DATETIME     NULL,
    arrete_at           DATETIME     NULL,
    arret               VARCHAR(10)  NOT NULL,      -- EN_COURS | PROPRE | BRUTAL
    cause_code          VARCHAR(24)  NULL,
    cause_libelle       VARCHAR(120) NULL,
    cause_explication   VARCHAR(400) NULL,
    cause_conseil       VARCHAR(400) NULL,
    indisponibilite_min INT          NULL,
    java_version        VARCHAR(40)  NULL,
    memoire_max_mo      BIGINT       NULL,
    options_jvm         VARCHAR(1000) NULL,
    PRIMARY KEY (id),
    KEY idx_serveur_vie_hote (hote, id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS t_serveur_mesure (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    vie_id          BIGINT      NULL,
    hote            VARCHAR(80) NOT NULL,
    mesure_at       DATETIME    NOT NULL,
    memoire_mo      BIGINT      NULL,
    memoire_max_mo  BIGINT      NULL,
    fils            INT         NULL,
    fils_http_actifs INT        NULL,
    gc_nombre       BIGINT      NULL,
    gc_ms           BIGINT      NULL,
    cpu_serveur_pct DECIMAL(5,1) NULL,
    cpu_machine_pct DECIMAL(5,1) NULL,
    ram_libre_mo    BIGINT      NULL,
    ram_totale_mo   BIGINT      NULL,
    disque_libre_mo BIGINT      NULL,
    requetes        INT         NULL,
    bdd_connexions  INT         NULL,
    PRIMARY KEY (id),
    KEY idx_serveur_mesure_at (hote, mesure_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
