-- Besoins du 11/10 (point 11) : RENTABILITE NETTE du Pilotage. Les charges de l'officine sont saisies par mois et par
-- categorie ; resultat net = marge brute - charges. Saisie reservee au droit P_PILOTAGE_CHARGES (administrateur par
-- defaut) ; la lecture suit le droit du Pilotage. Aucune donnee existante modifiee. Rejouable.
CREATE TABLE IF NOT EXISTS t_charge_mensuelle (
    mois       CHAR(7)     NOT NULL,
    categorie  VARCHAR(30) NOT NULL,
    montant    BIGINT      NOT NULL,
    updated_at DATETIME    NOT NULL,
    lg_USER_ID VARCHAR(40) NULL,
    PRIMARY KEY (mois, categorie)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_PILOTAGE_CHARGES' nom, 'PILOTAGE - Saisir les charges mensuelles (rentabilite nette)' description) x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege p ON p.str_NAME = 'P_PILOTAGE_CHARGES'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
