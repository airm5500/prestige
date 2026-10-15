-- Photo de controle du pointage par badge (demandes serveur des applications mobiles, point 31).
-- Le terminal de pointage prend une photo (camera frontale) a chaque pointage par badge, pour qu'un employe ne pointe
-- pas avec le badge d'un collegue. Finalite unique ; acces reserve au droit P_SM_RH ; conservation limitee
-- (KEY_RH_PHOTO_RETENTION_JOURS) ; la photo seule est purgee, le pointage reste.

ALTER TABLE t_pointage
    ADD COLUMN IF NOT EXISTS photo_statut VARCHAR(10) NULL COMMENT 'AVEC, SANS ou ATTENDUE (pointage par badge)',
    ADD COLUMN IF NOT EXISTS photo_motif VARCHAR(60) NULL COMMENT 'Motif d''absence de photo donne par le terminal';

CREATE TABLE IF NOT EXISTS t_pointage_photo (
    pointage_id VARCHAR(40) NOT NULL,
    photo MEDIUMBLOB NOT NULL,
    taille INT NOT NULL,
    largeur INT NULL,
    hauteur INT NULL,
    prise_le DATETIME NULL COMMENT 'Heure de prise donnee par le terminal',
    recue_le DATETIME NOT NULL,
    recue_par VARCHAR(40) NULL,
    PRIMARY KEY (pointage_id),
    KEY ix_pointage_photo_recue (recue_le),
    CONSTRAINT fk_pointage_photo FOREIGN KEY (pointage_id) REFERENCES t_pointage (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RH_PHOTO_RETENTION_JOURS', '30',
        'Duree de conservation (jours, 7 a 90) des photos de controle des pointages par badge', 'SYSTEME', 'enable');
