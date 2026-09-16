-- =====================================================================
-- Evolution 5 : corriger l'attribution des privileges des nouveaux ecrans
-- ---------------------------------------------------------------------
-- DEFAUT CORRIGE ICI. Les migrations V6.9.42, V6.9.43 et V6.9.45 ont
-- attribue leurs privileges aux seuls roles dont le NOM contient
-- « ADMIN ». C'est une supposition, et elle est fausse des que
-- l'officine a nomme ses roles autrement, ou que la personne se
-- connecte avec un role metier : les nouveaux menus n'apparaissent
-- alors nulle part, sans que rien ne l'explique.
--
-- Constat sur un site reel : P_SM_ETAT_STOCK est detenu par 10 roles et
-- P_SM_VENTEDEPOT par 9, tandis que les trois nouveaux privileges ne
-- l'etaient que par 2.
--
-- On ne devine plus : chaque nouveau privilege suit les roles qui
-- detiennent DEJA le privilege comparable, c'est-a-dire la
-- configuration que l'officine a elle-meme choisie.
--
--   P_SM_DEPOT_EXTENSION    (consulter le stock d'un depot)
--        suit  P_SM_ETAT_STOCK      (voir l'etat de stock)
--   P_VENTE_DEPOT_EXTENSION (vendre dans un depot)
--        suit  P_SM_VENTEDEPOT      (vente depot)
--   P_SM_POSOS              (analyse Posos)
--        suit  P_SM_VENTE           (ecran de vente)
--
-- Les attributions deja en place sont conservees : cette migration
-- ajoute, elle ne retire rien. Elle est rejouable sans effet de bord.
-- =====================================================================

-- P_SM_DEPOT_EXTENSION suit P_SM_ETAT_STOCK
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_ETAT_STOCK'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_SM_DEPOT_EXTENSION'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- P_VENTE_DEPOT_EXTENSION suit P_SM_VENTEDEPOT
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_VENTEDEPOT'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_VENTE_DEPOT_EXTENSION'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- P_SM_POSOS suit P_SM_VENTE
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_VENTE'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_SM_POSOS'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Filet de securite : si le privilege modele n'existe pas sur ce site
-- (installation ancienne, renommage), les nouveaux privileges seraient
-- restes sans role du tout. On les rattache alors au role du compte
-- administrateur reellement utilise, quel que soit son nom.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME IN ('P_SM_DEPOT_EXTENSION', 'P_VENTE_DEPOT_EXTENSION', 'P_SM_POSOS')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege q WHERE q.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID)
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
