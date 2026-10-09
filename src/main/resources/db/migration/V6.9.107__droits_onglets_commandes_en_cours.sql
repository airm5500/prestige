-- Retours du 09/10 (3) : droits des nouveaux onglets de « Commandes en cours » (Substitutions, Alertes,
-- Tableau de bord ; les Ruptures suivent le menu). Personne ne perd l'acces : les roles qui ont deja
-- « Commande en cours » ou « Liste des ruptures », et le role du compte admin, recoivent les trois droits.

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), d.nom, 'CUSTOMER', d.libelle, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_CEC_SUBSTITUTIONS' nom, 'Commandes en cours : onglet Substitutions' libelle
        UNION ALL SELECT 'P_CEC_ALERTES', 'Commandes en cours : onglet Alertes'
        UNION ALL SELECT 'P_CEC_TABLEAU_BORD', 'Commandes en cours : onglet Tableau de bord') d
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = d.nom);

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
  JOIN t_privilege cible ON cible.str_NAME IN ('P_CEC_SUBSTITUTIONS', 'P_CEC_ALERTES', 'P_CEC_TABLEAU_BORD')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
