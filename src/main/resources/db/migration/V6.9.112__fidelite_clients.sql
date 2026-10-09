-- Retours du 09/10 (6) : fidelite clients parametrable.
-- Les points sont tires des ventes cloturees (part payee par le client, produits eligibles), sans toucher au calcul de
-- la vente ; annules si la vente est annulee ou modifiee ; expirent ; paliers multiplicateurs. Desactivee par defaut.

CREATE TABLE IF NOT EXISTS t_fidelite_parametre (
    lg_PARAMETRE_ID     VARCHAR(20)  NOT NULL,
    bool_ACTIF          TINYINT(1)   NOT NULL DEFAULT 0,
    int_MONTANT_POINT   INT          NOT NULL DEFAULT 1000,
    int_VALEUR_POINT    INT          NOT NULL DEFAULT 5,
    int_SEUIL_UTILISATION INT        NOT NULL DEFAULT 100,
    int_EXPIRATION_MOIS INT          NOT NULL DEFAULT 12,
    bool_ASSURANCE      TINYINT(1)   NOT NULL DEFAULT 1,
    dt_DEBUT            DATE         NULL,
    dt_SYNCHRO          DATETIME     NULL,
    dt_UPDATED          DATETIME     NULL,
    lg_USER_ID          VARCHAR(40)  NULL,
    PRIMARY KEY (lg_PARAMETRE_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO t_fidelite_parametre (lg_PARAMETRE_ID, dt_UPDATED) VALUES ('FIDELITE', NOW());

-- Paliers : points acquis sur 12 mois glissants -> coefficient applique aux points gagnes
CREATE TABLE IF NOT EXISTS t_fidelite_palier (
    lg_PALIER_ID      VARCHAR(40)   NOT NULL,
    str_LIBELLE       VARCHAR(40)   NOT NULL,
    int_SEUIL_POINTS  INT           NOT NULL DEFAULT 0,
    dbl_COEFFICIENT   DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    dt_UPDATED        DATETIME      NULL,
    PRIMARY KEY (lg_PALIER_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO t_fidelite_palier (lg_PALIER_ID, str_LIBELLE, int_SEUIL_POINTS, dbl_COEFFICIENT, dt_UPDATED)
SELECT * FROM (SELECT 'FID-PALIER-1', 'Standard', 0, 1.00, NOW() UNION ALL
               SELECT 'FID-PALIER-2', 'Argent', 300, 1.25, NOW() UNION ALL
               SELECT 'FID-PALIER-3', 'Or', 1000, 1.50, NOW()) d
 WHERE NOT EXISTS (SELECT 1 FROM t_fidelite_palier);

-- Categories de produits (famille d'article) exclues des points (ex. medicaments)
CREATE TABLE IF NOT EXISTS t_fidelite_exclusion (
    lg_FAMILLEARTICLE_ID VARCHAR(40) NOT NULL,
    dt_CREATED           DATETIME    NULL,
    PRIMARY KEY (lg_FAMILLEARTICLE_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Registre des points : GAIN (une vente), ANNULATION (vente annulee / modifiee), EXPIRATION, UTILISATION, AJUSTEMENT
CREATE TABLE IF NOT EXISTS t_fidelite_mouvement (
    lg_MOUVEMENT_ID         VARCHAR(40)  NOT NULL,
    lg_CLIENT_ID            VARCHAR(40)  NOT NULL,
    str_TYPE                VARCHAR(12)  NOT NULL,
    int_POINTS              INT          NOT NULL,
    int_RESTANTS            INT          NOT NULL DEFAULT 0,
    int_BASE                BIGINT       NULL,
    dbl_COEFFICIENT         DECIMAL(5, 2) NULL,
    lg_PREENREGISTREMENT_ID VARCHAR(40)  NULL,
    str_REFERENCE           VARCHAR(60)  NULL,
    str_MOTIF               VARCHAR(150) NULL,
    int_VALEUR              INT          NULL,
    dt_MOUVEMENT            DATETIME     NOT NULL,
    dt_EXPIRATION           DATE         NULL,
    lg_USER_ID              VARCHAR(40)  NULL,
    dt_CREATED              DATETIME     NOT NULL,
    PRIMARY KEY (lg_MOUVEMENT_ID),
    UNIQUE KEY ux_fidelite_vente (lg_PREENREGISTREMENT_ID, str_TYPE),
    KEY ix_fidelite_client (lg_CLIENT_ID, dt_MOUVEMENT),
    KEY ix_fidelite_expiration (str_TYPE, dt_EXPIRATION, int_RESTANTS)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Droits : ecran (roles qui gerent les clients), utilisation / ajustement des points, parametrage
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), d.nom, 'CUSTOMER', d.descr, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_SM_FIDELITE' nom, 'Fidelite clients : consulter les points' descr UNION ALL
        SELECT 'P_FIDELITE_UTILISER', 'Fidelite clients : utiliser ou ajuster les points d''un client' UNION ALL
        SELECT 'P_FIDELITE_PARAMETRER', 'Fidelite clients : parametrage (taux, paliers, produits exclus)') d
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = d.nom);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT src.lg_ROLE_ID
          FROM t_role_privelege src
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
         WHERE modele.str_NAME = 'P_SM_CLIENT'
        UNION
        SELECT ru.lg_ROLE_ID
          FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege cible ON cible.str_NAME IN ('P_SM_FIDELITE', 'P_FIDELITE_UTILISER')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- parametrage : administrateur seulement (a donner ensuite par la gestion des roles)
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
  JOIN t_privilege cible ON cible.str_NAME = 'P_FIDELITE_PARAMETRER'
 WHERE u.str_LOGIN = 'admin'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Menu « Fidelite clients » dans SERVICE CLIENT (a cote des ordonnances clients)
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Fidélité clients', NULL,
       'Points de fidelite des clients : soldes, historique, utilisation, parametrage', 'fideliteclients',
       s.lg_MENU_ID, s.int_PRIORITY, NULL, 'enable', 'P_SM_FIDELITE', NOW(), NOW(), ''
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'ordonnanceclient'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'fideliteclients')
 LIMIT 1;
