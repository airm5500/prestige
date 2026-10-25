-- Retours du 25/10 (point 2) : un droit pour chaque onglet « Paramètres » et « Analyse » de Fidélité clients.
-- Donnés aux rôles qui ont aujourd'hui le menu (ils voient déjà ces onglets) : rien ne disparaît ; on les retire
-- ensuite rôle par rôle dans la gestion des profils.
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), d.nom, 'CUSTOMER', d.descr, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_FIDELITE_ONGLET_PARAMETRES' nom, 'Fidelite clients : voir l''onglet Parametres' descr UNION ALL
        SELECT 'P_FIDELITE_ONGLET_ANALYSE', 'Fidelite clients : voir l''onglet Analyse') d
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = d.nom);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT src.lg_ROLE_ID
          FROM t_role_privelege src
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
         WHERE modele.str_NAME = 'P_SM_FIDELITE') r
  JOIN t_privilege cible ON cible.str_NAME IN ('P_FIDELITE_ONGLET_PARAMETRES', 'P_FIDELITE_ONGLET_ANALYSE')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
