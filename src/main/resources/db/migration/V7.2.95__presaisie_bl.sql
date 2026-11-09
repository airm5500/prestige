-- =====================================================================
-- Plan avoir du 08/11, point 6 : menu « Pré-saisie des BL » (GESTION DES COMMANDES, à côté de « Commande en cours »),
-- phase 1 (« pas encore actif ») : on préenregistre les BL reçus (grossiste, numéro, date, HT, TVA, séquence,
-- commande facultative) ; un BL pré-saisi est « À saisir » ; il passe à « Traité » quand le BL de même grossiste et de
-- même numéro est créé depuis « Commande en cours » (route commande/creerbl). La sélection d'un BL pré-saisi dans
-- « Commande en cours » est pour la phase 2.
--  - t_presaisie_bl : une ligne par BL pré-saisi ; la suppression (avec un motif) garde la ligne, état SUPPRIME ;
--  - unicité : un même grossiste et un même numéro ne sont pré-saisis qu'une fois (lignes supprimées exclues) ;
--    contrôlée par l'API (message clair) et garantie par l'index unique sur str_CLE_ACTIVE ;
--  - privilège P_SM_PRESAISIE_BL (menu, lecture et écriture), donné aux rôles qui peuvent créer un BL : la route
--    commande/creerbl exige P_BL_MOBILE_SCANNER (CommandeRessource.creerBl) ; plus les profils pharmacien et
--    administrateur et le rôle du compte administrateur (règle des droits nouveaux).
-- Rejouable.
-- =====================================================================

CREATE TABLE IF NOT EXISTS t_presaisie_bl (
    lg_PRESAISIE_BL_ID    VARCHAR(40)  NOT NULL,
    lg_GROSSISTE_ID       VARCHAR(40)  NOT NULL,
    str_NUMERO            VARCHAR(20)  NOT NULL,
    dt_DATE_BL            DATE         NOT NULL,
    int_MHT               INT          NOT NULL DEFAULT 0,
    int_TVA               INT          NOT NULL DEFAULT 0,
    int_TTC               INT          NOT NULL DEFAULT 0,
    str_SEQ_CLIENT        VARCHAR(20)  NULL,
    lg_ORDER_ID           VARCHAR(40)  NULL,
    str_ETAT              VARCHAR(12)  NOT NULL DEFAULT 'A_SAISIR',
    lg_CREE_PAR           VARCHAR(40)  NOT NULL,
    dt_CREE               DATETIME     NOT NULL,
    lg_MODIFIE_PAR        VARCHAR(40)  NULL,
    dt_MODIFIE            DATETIME     NULL,
    dt_TRAITE             DATETIME     NULL,
    lg_TRAITE_PAR         VARCHAR(40)  NULL,
    lg_BON_LIVRAISON_ID   VARCHAR(40)  NULL,
    dt_SUPPRIME           DATETIME     NULL,
    lg_SUPPRIME_PAR       VARCHAR(40)  NULL,
    str_MOTIF_SUPPRESSION VARCHAR(200) NULL,
    str_CLE_ACTIVE        VARCHAR(70)  AS (IF(str_ETAT = 'SUPPRIME', NULL,
                                              CONCAT(lg_GROSSISTE_ID, '|', str_NUMERO))) PERSISTENT,
    PRIMARY KEY (lg_PRESAISIE_BL_ID),
    UNIQUE KEY uk_presaisie_bl_active (str_CLE_ACTIVE),
    KEY ix_presaisie_bl_grossiste_numero (lg_GROSSISTE_ID, str_NUMERO),
    KEY ix_presaisie_bl_etat_date (str_ETAT, dt_DATE_BL)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_PRESAISIE_BL', 'CUSTOMER',
       'GESTION DES COMMANDES - Pré-saisie bon de livraison', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_PRESAISIE_BL');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_PRESAISIE_BL'
 WHERE (r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
        OR EXISTS (SELECT 1 FROM t_role_privelege rp
                     JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                    WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND m.str_NAME = 'P_BL_MOBILE_SCANNER'))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_PRESAISIE_BL'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libellé court (règle : 25 caractères au plus) ; le nom complet dans l'aide au survol (str_VALUE).
-- Priorité 1 : à côté de « Commande en cours ».
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40),
       'Pré-saisie bon de livraison : préenregistrer les BL reçus pour ne pas les saisir deux fois',
       NULL, 'Pré-saisie des BL', 'presaisiebl', '6', 1, NULL, 'enable', 'P_SM_PRESAISIE_BL', NOW(), NOW(), ''
  FROM DUAL
 WHERE EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '6')
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'presaisiebl');
