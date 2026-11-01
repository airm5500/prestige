-- Sauvegardes de la base (retour du 01/11) : historique des sauvegardes faites par Prestige.
-- Les reglages (KEY_SAUVEGARDE_*) sont crees par l'ecran ; sans eux, valeurs par defaut du code.
CREATE TABLE IF NOT EXISTS t_sauvegarde (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    debut         DATETIME     NOT NULL,
    fin           DATETIME     NULL,
    origine       VARCHAR(20)  NOT NULL,
    statut        VARCHAR(20)  NOT NULL,
    fichier       VARCHAR(255) NULL,
    taille_octets BIGINT       NULL,
    duree_s       INT          NULL,
    copie         VARCHAR(20)  NULL,
    message       VARCHAR(1000) NULL,
    hote          VARCHAR(100) NULL,
    PRIMARY KEY (id),
    KEY t_sauvegarde_debut (debut),
    KEY t_sauvegarde_statut (statut, debut)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
