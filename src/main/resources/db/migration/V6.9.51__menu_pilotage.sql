-- =====================================================================
-- Evolution 6, point 1 : MENU DE PILOTAGE.
--
-- « On ne touche pas au dashboard existant, tout est neuf, un menu a
--   part entiere de pilotage. »
--
-- Ce menu est donc AJOUTE a cote du tableau de bord actuel, qui n'est
-- modifie ni dans son contenu, ni dans son menu, ni dans ses services.
-- Ce que le nouveau menu apporte et qui n'existait pas : chaque mois est
-- isole et COMPARABLE a un autre, sans exporter quoi que ce soit.
--
-- Il est place dans ANALYSE DE GESTION (id 3), ou vivent deja le compte
-- d'exploitation, les statistiques de rayons et le tableau du
-- pharmacien : c'est la qu'on va chercher les chiffres de l'officine.
--
-- Un SEUL privilege pour tout le menu, et non un par onglet : le besoin
-- ne demande pas de cloisonner, et decouper a la place de l'officine
-- reviendrait a lui imposer une repartition que personne n'a demandee.
-- Les onglets d'un menu de pilotage parlent tous de la meme chose - qui
-- peut voir le chiffre d'affaires peut voir la marge.
--
-- Rejouable : privilege cree PAR SON NOM avec un identifiant tire au
-- sort, attributions gardees par NOT EXISTS, sous-menu cree une seule
-- fois.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_PILOTAGE', 'CUSTOMER',
       'ANALYSE DE GESTION - Pilotage de l''officine', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_PILOTAGE');

-- ---------------------------------------------------------------------
-- A qui l'attribuer au depart ?
--
-- A ceux qui voient deja le compte d'exploitation (P_SM_COMPTE_EXPLOIT
-- s'il existe sur ce site), c'est-a-dire aux memes personnes que les
-- chiffres de gestion. Et TOUJOURS au role du compte administrateur,
-- sans condition : c'est la lecon des onglets des depots et des
-- ordonnances - un privilege attribue d'apres un modele que
-- l'administrateur ne detient pas n'est pas attribue du tout, et le menu
-- reste invisible pour celui-la meme qui doit le distribuer.
-- ---------------------------------------------------------------------
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_COMPTE_EXPLOIT'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_SM_PILOTAGE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_PILOTAGE'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- ---------------------------------------------------------------------
-- Le sous-menu. Libelle court (regle de l'officine : 25 caracteres au
-- plus pour le libelle, 30 pour la description) : les menus longs sont
-- tronques dans l'arbre de navigation.
-- ---------------------------------------------------------------------
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Pilotage', NULL, 'Pilotage de l''officine',
       'pilotage', '3', 0, NULL, 'enable', 'P_SM_PILOTAGE', NOW(), NOW(), ''
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'pilotage');
