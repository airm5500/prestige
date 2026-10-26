-- Demande mobile 57 (25/10) : borne de pointage sans compte (Prestige Pointage), enrolee une fois par un
-- administrateur. Le secret de la borne est garde chiffre (cle AES des secrets de badge) : le serveur recalcule la
-- signature de chaque appel. Une borne retiree ne se reactive pas.
CREATE TABLE IF NOT EXISTS t_borne_pointage (
    id                VARCHAR(40)  NOT NULL,
    nom               VARCHAR(60)  NOT NULL,
    empreinte         CHAR(64)     NOT NULL COMMENT 'SHA-256(ANDROID_ID:paquet), demande 56',
    secret            VARBINARY(256) NOT NULL COMMENT 'secret chiffre (AES-256-GCM, cle t_rh_badge_cle)',
    statut            VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE ou RETIREE',
    cree_par          VARCHAR(40)  NULL,
    cree_le           DATETIME     NOT NULL,
    retiree_par       VARCHAR(40)  NULL,
    retiree_le        DATETIME     NULL,
    derniere_activite DATETIME     NULL,
    derniere_adresse  VARCHAR(60)  NULL,
    PRIMARY KEY (id),
    KEY ix_borne_empreinte (empreinte)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- pointage fait par une borne : source 'BORNE', saisi_par vide, borne_id renseigne
ALTER TABLE t_pointage ADD COLUMN IF NOT EXISTS borne_id VARCHAR(40) NULL;

-- appels des bornes limites aux adresses de l'officine (1) ; 0 les ouvre a Internet
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_BORNE_POINTAGE_RESEAU_LOCAL', '1',
       'Bornes de pointage : 1 = appels acceptes seulement depuis le reseau de l''officine ; 0 = aussi depuis Internet',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_BORNE_POINTAGE_RESEAU_LOCAL');
