-- =====================================================================
-- Demandes serveur des applications mobiles (43) : EMPREINTES DES EMPLOYES PARTAGEES ENTRE TERMINAUX DE POINTAGE.
-- Le gabarit (modele) est chiffre (AES-GCM) ; la cle est conservee en base (decision du pharmacien, 15/10) : une
-- sauvegarde de la base est donc une donnee sensible. Jamais de modele dans les journaux ni les exports.
-- Fonction desactivee par defaut (KEY_EMPREINTES_PARTAGEES = 0). Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_employe_empreinte (
    id               VARCHAR(40)  NOT NULL,
    employe_id       VARCHAR(40)  NOT NULL,
    modele           BLOB         NULL,
    format           VARCHAR(40)  NOT NULL,
    capteur          VARCHAR(60)  NULL,
    doigt            VARCHAR(20)  NULL,
    consentement_le  DATETIME     NOT NULL,
    consentement_par VARCHAR(100) NOT NULL,
    cree_par         VARCHAR(40)  NULL,
    dt_creation      DATETIME     NOT NULL,
    dt_suppression   DATETIME     NULL,
    PRIMARY KEY (id),
    KEY idx_empreinte_employe (employe_id),
    KEY idx_empreinte_format_dates (format, dt_creation, dt_suppression)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb3;

CREATE TABLE IF NOT EXISTS t_empreinte_cle (
    id          INT          NOT NULL,
    cle         VARBINARY(64) NOT NULL,
    dt_creation DATETIME     NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB;

-- journal d'audit : qui a enrole, lu ou supprime, combien ; jamais le modele
CREATE TABLE IF NOT EXISTS t_empreinte_journal (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    horodatage  DATETIME     NOT NULL,
    action      VARCHAR(20)  NOT NULL,
    employe_id  VARCHAR(40)  NULL,
    utilisateur VARCHAR(40)  NULL,
    nombre      INT          NOT NULL DEFAULT 0,
    format      VARCHAR(40)  NULL,
    PRIMARY KEY (id),
    KEY idx_empreinte_journal_date (horodatage)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb3;

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_EMPREINTES_PARTAGEES', '0',
       'Empreintes des employés partagées entre terminaux de pointage (1 = activé). Donnée biométrique : déclaration ARTCI et consentement écrit requis.',
       'NUMBER', 'enable', NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES');
