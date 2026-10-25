-- Retours du 25/10 (point 14) : listes de diffusion nommées des campagnes (créer, ajouter, retirer, envoyer à une liste).
CREATE TABLE IF NOT EXISTS t_campagne_liste (
    id         VARCHAR(40)  NOT NULL,
    nom        VARCHAR(80)  NOT NULL,
    created_at DATETIME     NOT NULL,
    lg_USER_ID VARCHAR(40)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_campagne_liste_nom (nom)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS t_campagne_liste_client (
    liste_id     VARCHAR(40) NOT NULL,
    lg_CLIENT_ID VARCHAR(40) NOT NULL,
    ajoute_at    DATETIME    NOT NULL,
    PRIMARY KEY (liste_id, lg_CLIENT_ID),
    KEY idx_campagne_liste_client (lg_CLIENT_ID),
    CONSTRAINT fk_campagne_liste_client_liste FOREIGN KEY (liste_id) REFERENCES t_campagne_liste (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
