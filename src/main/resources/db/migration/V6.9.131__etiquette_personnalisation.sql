-- Personnalisation des etiquettes (Etiquettage Pro, onglet « Personnalisation ») : une disposition par type de code
-- (code-barres, QR, DataMatrix, QR+, DataMatrix+) et par dimension d'etiquette. Sans disposition enregistree, les
-- etiquettes existantes gardent leur dessin d'avant.
-- Droit P_SM_ETIQUETTE_PERSO (modifier les dispositions), donne au seul administrateur par defaut.

CREATE TABLE IF NOT EXISTS t_etiquette_disposition (
    cle         VARCHAR(40)   NOT NULL,
    type_code   VARCHAR(20)   NOT NULL,
    largeur_mm  DECIMAL(6, 1) NOT NULL,
    hauteur_mm  DECIMAL(6, 1) NOT NULL,
    contenu     TEXT          NOT NULL,
    modifie_par VARCHAR(100)  NULL,
    dt_UPDATED  DATETIME      NOT NULL,
    PRIMARY KEY (cle)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_ETIQUETTE_PERSO', 'CUSTOMER',
       'Personnaliser les etiquettes (disposition des informations et du code)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_ETIQUETTE_PERSO');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT ru.lg_ROLE_ID
          FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_ETIQUETTE_PERSO'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
