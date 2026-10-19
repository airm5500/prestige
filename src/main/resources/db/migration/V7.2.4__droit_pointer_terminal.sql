-- =====================================================================
-- Demande 52 des applications mobiles (16/10) : P_RH_POINTER, « Pointer au terminal de pointage ».
-- Un compte « terminal » peut pointer sans P_SM_RH, qui ouvre toute la gestion RH (planning, absences, tableaux,
-- import, suppression de pointages). Routes ouvertes par ce droit (ou P_SM_RH) : rh/droits, rh/employes (lecture
-- seule : id, matricule, nom, prenoms, badge, statut), rh/pointages, rh/pointages/{id}/photo, rh/empreintes.
-- Donne aux profils pharmacien et administrateur (regle des droits nouveaux) ; a attribuer aux roles « terminal ».
-- Rejouable.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_RH_POINTER', 'CUSTOMER', 'RESSOURCES HUMAINES - Pointer au terminal de pointage', NULL,
       NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_RH_POINTER');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_RH_POINTER'
 WHERE r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
