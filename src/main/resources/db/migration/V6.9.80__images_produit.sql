-- Images produit (plan d'octobre, section 6) : les FICHIERS sont sur le disque (racine de stockage, dossier
-- images-produits/AAAA/MM), la base ne garde que le chemin relatif, la vignette et les metadonnees. Droit d'ajout /
-- modification dedie, attribue aux roles qui ont la fiche article et a l'admin. Rejouable, ajout pur.
CREATE TABLE IF NOT EXISTS `t_famille_image` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NOT NULL,
  `str_CHEMIN` VARCHAR(255) NOT NULL,
  `str_CHEMIN_VIGNETTE` VARCHAR(255) NULL,
  `str_TYPE` VARCHAR(10) NOT NULL,
  `int_TAILLE` BIGINT NOT NULL DEFAULT 0,
  `int_LARGEUR` INT NULL,
  `int_HAUTEUR` INT NULL,
  `bool_PRINCIPALE` TINYINT(1) NOT NULL DEFAULT 0,
  `int_ORDRE` INT NOT NULL DEFAULT 0,
  `lg_USER_ID` VARCHAR(40) NULL,
  `dt_CREATED` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_famille_image_produit` (`lg_FAMILLE_ID`, `bool_PRINCIPALE`, `int_ORDRE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_PRODUIT_IMAGES_MAJ', 'CUSTOMER', 'FICHE ARTICLE - Ajouter / modifier les images', NULL, NOW(),
       NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_PRODUIT_IMAGES_MAJ');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_FAMILLE'
  JOIN t_privilege cible ON cible.str_NAME = 'P_PRODUIT_IMAGES_MAJ'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_PRODUIT_IMAGES_MAJ'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
