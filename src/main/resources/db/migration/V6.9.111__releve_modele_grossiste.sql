-- Retours du 09/10 (5) : chaque grossiste presente son releve a sa maniere. Reglage des colonnes du releve PDF
-- (position de la colonne de chaque champ), memorise par grossiste apres la reconnaissance a l'ecran.
CREATE TABLE IF NOT EXISTS t_releve_modele (
    lg_GROSSISTE_ID VARCHAR(40)   NOT NULL,
    str_MODELE      VARCHAR(2000) NOT NULL,
    dt_UPDATED      DATETIME      NOT NULL,
    lg_USER_ID      VARCHAR(40)   NULL,
    PRIMARY KEY (lg_GROSSISTE_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
