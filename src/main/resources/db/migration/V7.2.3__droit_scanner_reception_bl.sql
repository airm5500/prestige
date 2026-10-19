-- =====================================================================
-- Decision 12 du pharmacien (15/10, confirmee le 19/10) : P_BL_MOBILE_SCANNER verifie sur commande/add-lot et
-- commande/creerbl. « Donner ce droit a tous les profils qui ont le menu BL (rien ne doit etre bloque au poste) ».
-- Ces deux routes servent quatre ecrans du poste : Gestion des entrees (P_SM_BL), Commande en cours
-- (P_SM_COMMANDE_PROCESS), Fiche article (P_SM_FAMILLE) et Etat stock (P_SM_ETAT_STOCK) ; l'entree en stock
-- (P_ENTREE_EN_STOCK) est ajoutee. Tout role qui a l'un de ces droits recoit P_BL_MOBILE_SCANNER, ainsi que les
-- profils pharmacien et administrateur (regle des droits nouveaux). Rejouable.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_BL_MOBILE_SCANNER', 'CUSTOMER',
       'RECEPTION BL - Scanner et saisir les lots, creer un BL (poste et mobile)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_BL_MOBILE_SCANNER');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_BL_MOBILE_SCANNER'
 WHERE (r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
        OR EXISTS (SELECT 1 FROM t_role_privelege rp
                     JOIN t_privilege menu ON menu.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                    WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID
                      AND menu.str_NAME IN ('P_SM_BL', 'P_SM_COMMANDE_PROCESS', 'P_SM_FAMILLE', 'P_SM_ETAT_STOCK',
                                            'P_ENTREE_EN_STOCK')))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_BL_MOBILE_SCANNER'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
