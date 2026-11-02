-- =====================================================================
-- Demande du 02/11 : menu « Modèles de ticket » (PARAMETRAGES, à côté de « Gestion des imprimantes »).
--  - ticket_modele : réglages de chaque ticket de caisse (modèle ancien ou nouveau, options, disposition des blocs),
--    par largeur de papier ; aucune ligne = valeurs par défaut (nouveau modèle) ;
--  - t_imprimante.int_LARGEUR_PAPIER : largeur du rouleau de chaque imprimante de caisse, 80 ou 58 mm (80 par défaut,
--    la largeur des imprimantes actuelles) ;
--  - privilège P_SM_MODELES_TICKET (menu et modification), donné aux profils pharmacien et administrateur, aux rôles
--    qui gèrent déjà les imprimantes et au rôle du compte administrateur.
-- Rejouable.
-- =====================================================================

CREATE TABLE IF NOT EXISTS ticket_modele (
    ticket      VARCHAR(40)  NOT NULL,
    largeur     INT          NOT NULL,
    reglages    TEXT         NOT NULL,
    maj         DATETIME     NOT NULL,
    utilisateur VARCHAR(60)  NULL,
    PRIMARY KEY (ticket, largeur)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

ALTER TABLE t_imprimante ADD COLUMN IF NOT EXISTS int_LARGEUR_PAPIER INT NOT NULL DEFAULT 80;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_MODELES_TICKET', 'CUSTOMER', 'PARAMETRAGES - Modèles de ticket', NULL, NOW(), NULL,
       NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_MODELES_TICKET');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_MODELES_TICKET'
 WHERE (r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
        OR EXISTS (SELECT 1 FROM t_role_privelege rp
                     JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                    WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND m.str_NAME = 'P_SM_PRINTER'))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_MODELES_TICKET'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libellé court (règle : 25 caractères au plus), aide au survol dans str_VALUE.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Présentation des tickets de caisse : modèle, options, disposition, largeur du papier',
       NULL, 'Modèles de ticket', 'modelesticket', '10', 20, NULL, 'enable', 'P_SM_MODELES_TICKET',
       NOW(), NOW(), ''
  FROM DUAL
 WHERE EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '10')
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'modelesticket');
