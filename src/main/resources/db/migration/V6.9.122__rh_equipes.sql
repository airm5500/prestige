-- Retours du 10/10 (section 9) : equipes RH. Une equipe regroupe des employes (un employe dans une seule equipe) et
-- porte un programme commun de la semaine (un type par jour : travail, garde, repos ; heures et pause), applique au
-- planning de la semaine choisie pour tous ses membres.
CREATE TABLE IF NOT EXISTS t_equipe (
    id         VARCHAR(40) NOT NULL,
    nom        VARCHAR(60) NOT NULL,
    created_at DATETIME    NULL,
    updated_at DATETIME    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_equipe_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_equipe_membre (
    employe_id VARCHAR(40) NOT NULL,
    equipe_id  VARCHAR(40) NOT NULL,
    PRIMARY KEY (employe_id),
    KEY idx_equipe_membre_equipe (equipe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_equipe_programme (
    equipe_id     VARCHAR(40) NOT NULL,
    jour_semaine  TINYINT     NOT NULL,
    type          VARCHAR(12) NOT NULL,
    debut         TIME        NULL,
    fin           TIME        NULL,
    pause_minutes INT         NOT NULL DEFAULT 0,
    PRIMARY KEY (equipe_id, jour_semaine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
