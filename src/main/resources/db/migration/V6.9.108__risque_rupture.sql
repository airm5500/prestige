-- Retours du 09/10 (3) : onglet « Risque de rupture » de Commandes en cours (couverture = stock / ventes par jour,
-- comparee au delai du grossiste + jours de securite). Droit de l'onglet, donne aux memes roles que les autres onglets.

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_RISQUE_SECURITE_JOURS', '2', 'Risque de rupture : jours de securite ajoutes au delai du grossiste', 'SYSTEME', 'enable'),
('KEY_RISQUE_SURVEILLANCE_JOURS', '3', 'Risque de rupture : « a surveiller » si la couverture depasse le delai + securite de moins de N jours', 'SYSTEME', 'enable');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_CEC_RISQUE_RUPTURE', 'CUSTOMER', 'Commandes en cours : onglet Risque de rupture', NULL, NOW(), NULL,
       NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_CEC_RISQUE_RUPTURE');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT src.lg_ROLE_ID
          FROM t_role_privelege src
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
         WHERE modele.str_NAME IN ('P_SM_COMMANDE_PROCESS', 'P_SM_RUPTURE_PHARMAML')
        UNION
        SELECT ru.lg_ROLE_ID
          FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege cible ON cible.str_NAME = 'P_CEC_RISQUE_RUPTURE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
