-- Demande mobile 56 (25/10) : le nom de l'appareil (X-Poste) garde par le serveur, rattache a l'empreinte de
-- l'appareil (SHA-256 de ANDROID_ID et du paquet, 64 caracteres hexadecimaux) : retrouve apres une reinstallation.
CREATE TABLE IF NOT EXISTS t_appareil_nom (
    empreinte  CHAR(64)    NOT NULL,
    nom        VARCHAR(60) NOT NULL,
    maj        DATETIME    NOT NULL,
    lg_USER_ID VARCHAR(40) NULL,
    PRIMARY KEY (empreinte)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
