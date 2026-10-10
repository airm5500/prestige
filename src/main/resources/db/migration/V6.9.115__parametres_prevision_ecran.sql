-- Retours du 10/10 : parametres des previsions et du risque de rupture modifiables dans l'ecran.
-- Valeurs jusqu'ici figees dans le code (memes valeurs par defaut : aucun changement de calcul).
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES
('KEY_PREVISION_MOIS_TEST', '6', 'Previsions : mois d''essai des methodes (la moins fausse est retenue)', 'SYSTEME', 'enable', NOW(), NOW()),
('KEY_PREVISION_JOURS_EN_COURS', '45', 'Previsions et risque : age maximal (jours) d''une commande comptee en cours', 'SYSTEME', 'enable', NOW(), NOW()),
('KEY_PREVISION_PLAFOND_COUVERTURE', '365', 'Previsions : plafond (jours) de la couverture dans la moyenne du tableau de bord', 'SYSTEME', 'enable', NOW(), NOW()),
('KEY_PREVISION_SEUIL_PEU_FIABLE', '50', 'Previsions : fiabilite (%) en dessous de laquelle la prevision est peu fiable', 'SYSTEME', 'enable', NOW(), NOW()),
('KEY_RISQUE_SECURITE_JOURS', '2', 'Risque de rupture : marge de securite (jours) ajoutee au delai', 'SYSTEME', 'enable', NOW(), NOW()),
('KEY_RISQUE_SURVEILLANCE_JOURS', '3', 'Risque de rupture : marge de surveillance (jours)', 'SYSTEME', 'enable', NOW(), NOW()),
('KEY_RISQUE_JOURS_RUPTURE_FOURNISSEUR', '30', 'Risque de rupture : ruptures annoncees par les grossistes affichees (jours)', 'SYSTEME', 'enable', NOW(), NOW());

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_PREVISION_PARAMETRER', 'CUSTOMER', 'Previsions et risque de rupture : modifier les parametres de calcul',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_PREVISION_PARAMETRER');

-- au role du compte admin seulement ; les autres roles l'obtiennent par la gestion des roles
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_PREVISION_PARAMETRER'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
