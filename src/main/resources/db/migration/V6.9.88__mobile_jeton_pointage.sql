-- L13 (plan d'octobre, 0.3 et 3) : jeton signe des telephones, pointage mobile, photos depuis le telephone.
-- Les chemins mobiles existants (X-User-Info) ne changent pas : seuls les nouveaux chemins v1/mobile/* exigent le jeton.

-- Telephones autorises : un par utilisateur et par appareil ; revocable a tout moment depuis l'ecran RH.
CREATE TABLE IF NOT EXISTS t_mobile_terminal (
    id               VARCHAR(40)  NOT NULL,
    lg_USER_ID       VARCHAR(40)  NOT NULL,
    appareil         VARCHAR(80)  NOT NULL,
    nom              VARCHAR(80)  NULL,
    statut           VARCHAR(10)  NOT NULL DEFAULT 'ACTIF',
    created_at       DATETIME     NOT NULL,
    derniere_activite DATETIME    NULL,
    derniere_adresse VARCHAR(60)  NULL,
    revoque_par      VARCHAR(40)  NULL,
    revoque_le       DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_mobile_terminal (lg_USER_ID, appareil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Cle de signature des jetons : dans sa propre table (jamais dans t_parameters, que l'ecran des parametres affiche).
-- Creee au premier besoin par le serveur ; la regenerer invalide tous les jetons.
CREATE TABLE IF NOT EXISTS t_mobile_cle (
    id         VARCHAR(20) NOT NULL,
    valeur     VARCHAR(128) NOT NULL,
    created_at DATETIME    NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Position du telephone au moment du pointage (facultative)
ALTER TABLE t_pointage ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7) NULL;
ALTER TABLE t_pointage ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NULL;
ALTER TABLE t_pointage ADD COLUMN IF NOT EXISTS precision_m INT NULL;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_MOBILE_ACTIF', '1', 'Telephones : 1 = connexion des telephones autorisee (pointage, photos), 0 = refusee', 'SYSTEME', 'enable'),
('KEY_MOBILE_JETON_HEURES', '12', 'Telephones : duree de validite du jeton de connexion (heures)', 'SYSTEME', 'enable'),
('KEY_RH_MOBILE_POINTAGE', '1', 'Pointage mobile : 1 = autorise, 0 = refuse', 'SYSTEME', 'enable'),
('KEY_RH_MOBILE_QR', '1', 'Pointage mobile : 1 = scanner le QR code affiche a l''officine (change chaque minute)', 'SYSTEME', 'enable'),
('KEY_RH_MOBILE_GPS', '0', 'Pointage mobile : 1 = position du telephone exigee, dans le rayon autour de l''officine', 'SYSTEME', 'enable'),
('KEY_RH_MOBILE_LATITUDE', '', 'Pointage mobile : latitude de l''officine (ex. 5.3364)', 'SYSTEME', 'enable'),
('KEY_RH_MOBILE_LONGITUDE', '', 'Pointage mobile : longitude de l''officine (ex. -4.0267)', 'SYSTEME', 'enable'),
('KEY_RH_MOBILE_RAYON_M', '150', 'Pointage mobile : distance maximale a l''officine (metres)', 'SYSTEME', 'enable');
