-- Demande du 02/11 : STABILITE DU SERVEUR, reglages de Payara de CHAQUE poste (serveur et caisses secondaires qui ont
-- leur propre Payara). Chaque Payara ecrit ici sa ligne a son demarrage et a l'ouverture de l'ecran ; l'ecran du serveur
-- les liste toutes. Une ligne par machine et par domaine, remplacee a chaque releve ; les lignes de plus de 180 jours
-- sont retirees. Aucune donnee de vente ni de client, aucun mot de passe. Aucune donnee existante modifiee. Rejouable.
CREATE TABLE IF NOT EXISTS t_serveur_poste (
    hote          VARCHAR(80)  NOT NULL,
    domaine       VARCHAR(60)  NOT NULL,
    serveur       TINYINT(1)   NOT NULL,      -- 1 : application.mode = server ; 0 : caisse
    mariadb_locale TINYINT(1)  NOT NULL,      -- la base est sur cette machine
    releve_at     DATETIME     NOT NULL,
    ram_mo        BIGINT       NULL,
    heap_mo       BIGINT       NULL,
    processeurs   INT          NULL,
    pool_max      INT          NULL,          -- -1 : domain.xml illisible
    fils_http     INT          NULL,
    a_ajuster     INT          NOT NULL DEFAULT 0,
    critiques     INT          NOT NULL DEFAULT 0,
    reglages      TEXT         NULL,          -- JSON : cle, libelle, actuel, conseille, niveau
    PRIMARY KEY (hote, domaine)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
