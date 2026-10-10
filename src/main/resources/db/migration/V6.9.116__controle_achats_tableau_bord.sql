-- Retours du 10/10 (Q7) : tableau de bord du controle des achats.
-- Delai de saisie d'un BL = date de saisie - date du BL du grossiste ; au plus ce seuil (jours) = dans le delai.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES
('KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS', '1', 'Controle des achats : delai de saisie des BL (jours) au-dela duquel le BL est en retard', 'SYSTEME', 'enable', NOW(), NOW());

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_CONTROLE_ACHAT_PARAMETRER', 'CUSTOMER', 'Controle des achats : modifier le delai de saisie des BL',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_CONTROLE_ACHAT_PARAMETRER');

-- au role du compte admin seulement ; les autres roles l'obtiennent par la gestion des roles
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_CONTROLE_ACHAT_PARAMETRER'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
