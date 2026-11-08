-- =====================================================================
-- Plan du 08/11, point 15.6 : P_ACTIVITE_ANOMALIES, « Voir l'onglet Anomalies de l'activité des équipes ».
-- Sans ce droit, l'onglet est cache et les routes activite-equipes/anomalies refusent (403), meme avec le menu.
-- Donne aux profils pharmacien et administrateur (regle des droits nouveaux). Rejouable.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_ACTIVITE_ANOMALIES', 'CUSTOMER', 'ACTIVITÉ DES ÉQUIPES - Voir l''onglet Anomalies', NULL,
       NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_ACTIVITE_ANOMALIES');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_ACTIVITE_ANOMALIES'
 WHERE r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
