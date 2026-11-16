-- =====================================================================
-- Plan du 14/11, point 2 : en-tête et pied de page propres à la pharmacie, sous forme d'images (scan du papier à
-- en-tête), apposés sur chaque page des factures après leur génération. Sans image, les factures ne changent pas.
--  - table t_entete_facture : une ligne par partie (ENTETE, PIED), image et hauteur de sa zone en millimètres ;
--  - privilège P_SM_ENTETE_FACTURE, donné aux rôles qui ont déjà un menu de modèle de facture et au rôle du compte
--    administrateur ;
--  - sous-menu « En-tête des factures » (FACTURATION), juste après « Modèle de facture ».
-- Rejouable ; aucune donnée existante modifiée.
-- =====================================================================

CREATE TABLE IF NOT EXISTS t_entete_facture (
    partie     VARCHAR(10)  NOT NULL,
    image      MEDIUMBLOB   NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    nom        VARCHAR(200) NULL,
    hauteur    INT          NOT NULL,
    created_at DATETIME     NOT NULL,
    lg_USER_ID VARCHAR(40)  NULL,
    PRIMARY KEY (partie)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_ENTETE_FACTURE', 'CUSTOMER', 'FACTURATION - En-tête des factures', NULL,
       NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_ENTETE_FACTURE');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_ENTETE_FACTURE'
 WHERE EXISTS (SELECT 1 FROM t_role_privelege rp
                 JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND m.str_NAME IN ('P_SM_MODEL_FACTURE', 'P_SM_MODEL_FACTURE_DYNAMIQUE'))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_ENTETE_FACTURE'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libellé court (25 caractères au plus), aide au survol dans str_VALUE.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Images d''en-tête et de pied de page imprimées sur les factures, à la place des leurs',
       NULL, 'En-tête des factures', 'entetefacture', s.lg_MENU_ID, s.int_PRIORITY + 1, NULL, 'enable',
       'P_SM_ENTETE_FACTURE', NOW(), NOW(), 'fa fa-picture-o'
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'modelfacture'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'entetefacture')
 LIMIT 1;
