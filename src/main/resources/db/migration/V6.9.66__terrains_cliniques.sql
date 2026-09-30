-- =====================================================================
-- Ordonnances clients, retour du 30/09 : TERRAINS CLINIQUES
-- PARAMETRABLES (diabete, hypertension...) et POIDS du patient.
--
-- t_terrain_clinique : la liste proposee dans la fiche, modifiable par
-- l'officine (ajout, libelle, ordre, desactivation). Un terrain deja
-- utilise ne se supprime pas : il se desactive, les ordonnances qui le
-- portent le gardent. str_CODE relie un terrain aux regles de l'analyse
-- (vide pour un terrain ajoute par l'officine : il est enregistre et
-- imprime, mais aucune regle ne le connait).
--
-- t_ordonnance_client_terrain : les terrains coches sur une ordonnance.
-- Rien n'identifie le patient : le lien au client est deja porte par
-- l'ordonnance.
--
-- Tables nouvelles + une colonne nullable. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_terrain_clinique (
    lg_TERRAIN_ID VARCHAR(40)  NOT NULL,
    str_CODE      VARCHAR(40)  NULL,
    str_LIBELLE   VARCHAR(80)  NOT NULL,
    int_ORDRE     INT          NOT NULL DEFAULT 100,
    bool_ACTIF    TINYINT(1)   NOT NULL DEFAULT 1,
    dt_CREATED    DATETIME     NOT NULL,
    dt_UPDATED    DATETIME     NULL,
    PRIMARY KEY (lg_TERRAIN_ID),
    UNIQUE KEY t_terrain_clinique_uk_libelle (str_LIBELLE),
    UNIQUE KEY t_terrain_clinique_uk_code (str_CODE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS t_ordonnance_client_terrain (
    lg_ORDONNANCE_ID VARCHAR(40) NOT NULL,
    lg_TERRAIN_ID    VARCHAR(40) NOT NULL,
    PRIMARY KEY (lg_ORDONNANCE_ID, lg_TERRAIN_ID),
    KEY t_ordonnance_client_terrain_ix (lg_TERRAIN_ID),
    CONSTRAINT t_ordonnance_client_terrain_fk_o FOREIGN KEY (lg_ORDONNANCE_ID)
        REFERENCES t_ordonnance_client (lg_ORDONNANCE_ID),
    CONSTRAINT t_ordonnance_client_terrain_fk_t FOREIGN KEY (lg_TERRAIN_ID)
        REFERENCES t_terrain_clinique (lg_TERRAIN_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE t_ordonnance_client ADD COLUMN IF NOT EXISTS int_POIDS_PATIENT INT NULL;

-- Liste de depart, acceptee le 30/09. Identifiants fixes : rejouable.
INSERT IGNORE INTO t_terrain_clinique (lg_TERRAIN_ID, str_CODE, str_LIBELLE, int_ORDRE, bool_ACTIF, dt_CREATED) VALUES
 ('TERRAIN_DIABETE', 'DIABETE', 'Diabète', 10, 1, NOW()),
 ('TERRAIN_HTA', 'HTA', 'Hypertension artérielle', 20, 1, NOW()),
 ('TERRAIN_INSUF_CARDIAQUE', 'INSUF_CARDIAQUE', 'Insuffisance cardiaque', 30, 1, NOW()),
 ('TERRAIN_ASTHME_BPCO', 'ASTHME_BPCO', 'Asthme / BPCO', 40, 1, NOW()),
 ('TERRAIN_ULCERE', 'ULCERE', 'Ulcère gastro-duodénal', 50, 1, NOW()),
 ('TERRAIN_EPILEPSIE', 'EPILEPSIE', 'Épilepsie', 60, 1, NOW()),
 ('TERRAIN_ANTICOAGULANT', 'ANTICOAGULANT', 'Sous anticoagulant', 70, 1, NOW()),
 ('TERRAIN_ALLERGIE_PENICILLINE', 'ALLERGIE_PENICILLINE', 'Allergie à la pénicilline', 80, 1, NOW()),
 ('TERRAIN_ALLERGIE_AINS', 'ALLERGIE_AINS', 'Allergie aux AINS', 90, 1, NOW()),
 ('TERRAIN_ALLERGIE_SULFAMIDES', 'ALLERGIE_SULFAMIDES', 'Allergie aux sulfamides', 100, 1, NOW());
