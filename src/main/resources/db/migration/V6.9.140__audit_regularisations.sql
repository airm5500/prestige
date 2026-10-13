-- Besoins du 11/10 (point 6) : AUDIT & RAPPROCHEMENTS, onglet Regularisations. Chaque regularisation est proposee,
-- puis appliquee seulement apres validation d'un utilisateur ayant le droit P_AUDIT_REGULARISER (administrateur par
-- defaut), avec un commentaire obligatoire ; elle est inscrite au journal ci-dessous avec les valeurs d'avant.
-- Seules sont appliquees par l'ecran : les corrections d'historique des mouvements et la fermeture des caisses
-- oubliees. Le stock reel et l'argent restent corriges par leurs ecrans habituels. Rejouable.
CREATE TABLE IF NOT EXISTS t_audit_regularisation (
    id          VARCHAR(40)   NOT NULL,
    created_at  DATETIME      NOT NULL,
    lg_USER_ID  VARCHAR(40)   NULL,
    auteur      VARCHAR(150)  NULL,
    type        VARCHAR(40)   NOT NULL,
    cle         VARCHAR(200)  NOT NULL,
    libelle     VARCHAR(500)  NULL,
    commentaire VARCHAR(1000) NOT NULL,
    lignes      INT           NOT NULL DEFAULT 0,
    montant     BIGINT        NULL,
    avant       LONGTEXT      NULL,
    PRIMARY KEY (id),
    KEY idx_audit_regul_date (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_AUDIT_REGULARISER' nom,
               'AUDIT & RAPPROCHEMENTS - Valider les regularisations (historique des mouvements, caisses oubliees)' description) x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege p ON p.str_NAME = 'P_AUDIT_REGULARISER'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
