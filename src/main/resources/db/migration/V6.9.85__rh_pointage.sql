-- =====================================================================
-- Plan d'octobre, section 3 (lot L11b) : POINTAGE.
--
-- t_pointage        : un pointage (employe, horodatage, sens, source
--                     POINTEUSE / MANUEL / MOBILE). Un meme employe ne
--                     pointe qu'une fois a la meme seconde : reimporter le
--                     meme fichier ne double rien.
-- t_pointage_lot    : historique des imports (lignes lues, retenues,
--                     rejetees, deja connues, rapport).
-- t_pointage_modele : un modele par marque de pointeuse (colonnes,
--                     formats, valeurs du sens), configure une seule fois.
-- Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_pointage (
    id          VARCHAR(40)  NOT NULL,
    employe_id  VARCHAR(40)  NOT NULL,
    horodatage  DATETIME     NOT NULL,
    sens        VARCHAR(8)   NOT NULL DEFAULT 'INCONNU',
    source      VARCHAR(10)  NOT NULL,
    terminal    VARCHAR(60)  NULL,
    lot_id      VARCHAR(40)  NULL,
    saisi_par   VARCHAR(40)  NULL,
    motif       VARCHAR(250) NULL,
    created_at  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_pointage (employe_id, horodatage),
    KEY ix_pointage_date (horodatage),
    KEY ix_pointage_lot (lot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_pointage_lot (
    id              VARCHAR(40)  NOT NULL,
    fichier         VARCHAR(200) NULL,
    modele_id       VARCHAR(40)  NULL,
    marque          VARCHAR(60)  NULL,
    lignes_lues     INT          NOT NULL DEFAULT 0,
    retenues        INT          NOT NULL DEFAULT 0,
    rejetees        INT          NOT NULL DEFAULT 0,
    deja_connues    INT          NOT NULL DEFAULT 0,
    rapport         TEXT         NULL,
    cree_par        VARCHAR(40)  NULL,
    created_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY ix_pointage_lot_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_pointage_modele (
    id              VARCHAR(40)  NOT NULL,
    marque          VARCHAR(60)  NOT NULL,
    col_badge       INT          NOT NULL DEFAULT 1,
    col_date        INT          NOT NULL DEFAULT 2,
    col_heure       INT          NOT NULL DEFAULT 3,
    col_sens        INT          NOT NULL DEFAULT 0,
    format_date     VARCHAR(40)  NOT NULL DEFAULT 'dd/MM/yyyy',
    format_heure    VARCHAR(40)  NOT NULL DEFAULT 'HH:mm',
    entete          TINYINT(1)   NOT NULL DEFAULT 1,
    valeurs_entree  VARCHAR(200) NULL,
    valeurs_sortie  VARCHAR(200) NULL,
    updated_at      DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_pointage_modele_marque (marque)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Modele de depart, modifiable : badge ; date ; heure ; sens (IN / OUT).
INSERT IGNORE INTO t_pointage_modele (id, marque, col_badge, col_date, col_heure, col_sens, format_date, format_heure, entete,
                                      valeurs_entree, valeurs_sortie, updated_at)
VALUES ('MODELE_GENERIQUE', 'Générique (badge ; date ; heure ; sens)', 1, 2, 3, 4, 'dd/MM/yyyy', 'HH:mm', 1,
        'ENTREE,IN,E,0,C/IN', 'SORTIE,OUT,S,1,C/OUT', NOW());
