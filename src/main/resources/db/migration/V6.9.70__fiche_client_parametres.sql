-- =====================================================================
-- Ordonnances clients, retour du 30/09 : FICHE CLIENT (2e onglet).
--
-- 1. Terrains et ALLERGIES : la liste parametrable des terrains porte
--    desormais une categorie (terrain / allergie). Les allergies deja
--    livrees (penicilline, AINS, sulfamides) passent dans la categorie
--    allergie ; elles alimentent l'analyse comme les terrains.
--
-- 2. Le DOSSIER du client : ses terrains et allergies permanents
--    (t_client_terrain) et ses allergies en texte libre (t_client_dossier).
--    Une ordonnance reprend le dossier ; ce qu'on y coche l'enrichit.
--
-- 3. Les PARAMETRES suivis, parametrables (t_parametre_clinique) :
--    glycemie, tension (bras gauche / droit, systolique / diastolique),
--    poids, taille, temperature, saturation, frequence cardiaque. Leurs
--    NORMES par tranche d'age (t_parametre_norme) servent a l'analyse de
--    chaque mesure ; l'IMC (poids / taille) est calcule, pas saisi.
--
-- 4. Les MESURES du client (t_client_mesure), datees : plusieurs dans le
--    temps, d'ou la courbe d'evolution. Une mesure saisie sur une
--    ordonnance (le poids) garde le lien vers elle.
-- =====================================================================

ALTER TABLE t_terrain_clinique ADD COLUMN IF NOT EXISTS str_CATEGORIE VARCHAR(20) NOT NULL DEFAULT 'terrain' AFTER str_LIBELLE;
UPDATE t_terrain_clinique SET str_CATEGORIE = 'allergie' WHERE str_CODE LIKE 'ALLERGIE%';

CREATE TABLE IF NOT EXISTS t_client_dossier (
    lg_CLIENT_ID VARCHAR(40) NOT NULL,
    str_ALLERGIES TEXT NULL,
    dt_UPDATED DATETIME NOT NULL,
    lg_USER_ID VARCHAR(40) NULL,
    PRIMARY KEY (lg_CLIENT_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS t_client_terrain (
    lg_CLIENT_ID VARCHAR(40) NOT NULL,
    lg_TERRAIN_ID VARCHAR(40) NOT NULL,
    dt_CREATED DATETIME NOT NULL,
    PRIMARY KEY (lg_CLIENT_ID, lg_TERRAIN_ID),
    KEY t_client_terrain_ix_terrain (lg_TERRAIN_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS t_parametre_clinique (
    lg_PARAMETRE_ID VARCHAR(40) NOT NULL,
    str_CODE VARCHAR(40) NULL,
    str_LIBELLE VARCHAR(80) NOT NULL,
    str_UNITE VARCHAR(20) NULL,
    -- 'simple' : une valeur ; 'tension' : systolique / diastolique, bras gauche et / ou droit.
    str_GENRE VARCHAR(20) NOT NULL DEFAULT 'simple',
    int_DECIMALES INT NOT NULL DEFAULT 0,
    -- Bornes de SAISIE (au-dela : faute de frappe), pas des normes.
    dbl_SAISIE_MIN DOUBLE NULL,
    dbl_SAISIE_MAX DOUBLE NULL,
    int_ORDRE INT NOT NULL DEFAULT 100,
    bool_ACTIF TINYINT(1) NOT NULL DEFAULT 1,
    dt_CREATED DATETIME NOT NULL,
    dt_UPDATED DATETIME NULL,
    PRIMARY KEY (lg_PARAMETRE_ID),
    UNIQUE KEY t_parametre_clinique_uk_libelle (str_LIBELLE),
    UNIQUE KEY t_parametre_clinique_uk_code (str_CODE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS t_parametre_norme (
    lg_NORME_ID VARCHAR(40) NOT NULL,
    lg_PARAMETRE_ID VARCHAR(40) NOT NULL,
    -- Tranche d'age en annees revolues, bornes comprises ; NULL = sans borne.
    int_AGE_MIN INT NULL,
    int_AGE_MAX INT NULL,
    dbl_BAS DOUBLE NULL,
    dbl_HAUT DOUBLE NULL,
    -- Seconde valeur (diastolique pour la tension).
    dbl_BAS2 DOUBLE NULL,
    dbl_HAUT2 DOUBLE NULL,
    str_SOURCE VARCHAR(120) NULL,
    PRIMARY KEY (lg_NORME_ID),
    KEY t_parametre_norme_ix_parametre (lg_PARAMETRE_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS t_client_mesure (
    lg_MESURE_ID VARCHAR(40) NOT NULL,
    lg_CLIENT_ID VARCHAR(40) NOT NULL,
    lg_PARAMETRE_ID VARCHAR(40) NOT NULL,
    dbl_VALEUR DOUBLE NOT NULL,
    dbl_VALEUR2 DOUBLE NULL,
    -- Tension : 'G' (bras gauche), 'D' (bras droit) ; NULL sinon.
    str_COTE CHAR(1) NULL,
    dt_MESURE DATETIME NOT NULL,
    str_COMMENTAIRE VARCHAR(200) NULL,
    lg_ORDONNANCE_ID VARCHAR(40) NULL,
    lg_USER_ID VARCHAR(40) NULL,
    dt_CREATED DATETIME NOT NULL,
    PRIMARY KEY (lg_MESURE_ID),
    KEY t_client_mesure_ix_client (lg_CLIENT_ID, lg_PARAMETRE_ID, dt_MESURE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Parametres de depart (modifiables, desactivables ; l'officine en ajoute).
INSERT IGNORE INTO t_parametre_clinique (lg_PARAMETRE_ID, str_CODE, str_LIBELLE, str_UNITE, str_GENRE, int_DECIMALES,
    dbl_SAISIE_MIN, dbl_SAISIE_MAX, int_ORDRE, bool_ACTIF, dt_CREATED) VALUES
 ('PARAM_GLYCEMIE_JEUN', 'GLYCEMIE_JEUN', 'Glycémie à jeun', 'g/L', 'simple', 2, 0.2, 6, 10, 1, NOW()),
 ('PARAM_GLYCEMIE', 'GLYCEMIE', 'Glycémie (non à jeun)', 'g/L', 'simple', 2, 0.2, 6, 20, 1, NOW()),
 ('PARAM_TENSION', 'TENSION', 'Tension artérielle', 'mmHg', 'tension', 0, 40, 260, 30, 1, NOW()),
 ('PARAM_FC', 'FREQ_CARDIAQUE', 'Fréquence cardiaque', 'bpm', 'simple', 0, 20, 250, 40, 1, NOW()),
 ('PARAM_POIDS', 'POIDS', 'Poids', 'kg', 'simple', 1, 0.5, 400, 50, 1, NOW()),
 ('PARAM_TAILLE', 'TAILLE', 'Taille', 'cm', 'simple', 0, 30, 250, 60, 1, NOW()),
 ('PARAM_TEMPERATURE', 'TEMPERATURE', 'Température', '°C', 'simple', 1, 30, 45, 70, 1, NOW()),
 ('PARAM_SPO2', 'SPO2', 'Saturation en oxygène', '%', 'simple', 0, 50, 100, 80, 1, NOW());

-- Normes de depart : valeurs de reference usuelles (a faire valider par le pharmacien, comme les regles de
-- demonstration de l'analyse). Tension et frequence cardiaque par tranche d'age.
INSERT IGNORE INTO t_parametre_norme (lg_NORME_ID, lg_PARAMETRE_ID, int_AGE_MIN, int_AGE_MAX, dbl_BAS, dbl_HAUT, dbl_BAS2, dbl_HAUT2, str_SOURCE) VALUES
 ('NORME_GLY_JEUN', 'PARAM_GLYCEMIE_JEUN', NULL, NULL, 0.70, 1.10, NULL, NULL, 'Glycémie à jeun : 0,70 à 1,10 g/L ; diabète à partir de 1,26 g/L'),
 ('NORME_GLY', 'PARAM_GLYCEMIE', NULL, NULL, 0.70, 1.40, NULL, NULL, 'Glycémie non à jeun : moins de 1,40 g/L'),
 ('NORME_TA_ENFANT', 'PARAM_TENSION', 1, 12, 90, 115, 55, 75, 'Enfant 1-12 ans'),
 ('NORME_TA_ADO', 'PARAM_TENSION', 13, 17, 100, 129, 60, 80, 'Adolescent 13-17 ans'),
 ('NORME_TA_ADULTE', 'PARAM_TENSION', 18, NULL, 90, 139, 60, 89, 'Adulte : hypertension à partir de 140 / 90'),
 ('NORME_FC_NOURRISSON', 'PARAM_FC', 0, 0, 100, 160, NULL, NULL, 'Nourrisson (moins d''un an)'),
 ('NORME_FC_1_5', 'PARAM_FC', 1, 5, 80, 140, NULL, NULL, 'Enfant 1-5 ans'),
 ('NORME_FC_6_12', 'PARAM_FC', 6, 12, 70, 120, NULL, NULL, 'Enfant 6-12 ans'),
 ('NORME_FC_ADULTE', 'PARAM_FC', 13, NULL, 60, 100, NULL, NULL, 'À partir de 13 ans'),
 ('NORME_TEMPERATURE', 'PARAM_TEMPERATURE', NULL, NULL, 36.1, 37.5, NULL, NULL, 'Fièvre au-delà de 37,5 °C'),
 ('NORME_SPO2', 'PARAM_SPO2', NULL, NULL, 95, 100, NULL, NULL, 'Saturation normale : 95 % et plus');
