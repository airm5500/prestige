-- =====================================================================
-- Retour du 17/09, points 4, 5 et 6 : les onglets de « Gestion depots
-- extensions » passent chacun sous son propre privilege, un onglet
-- « Point de caisse » s'ajoute, et le menu change de rubrique.
-- ---------------------------------------------------------------------
-- « AJOUTER UN PRIVILEGE SUR CHAQUE ONGLET DE SORTE A NE PAS PERMETTRE
--   QUE TOUT LE MONDE VOIT TOUT »
--
-- L'ecran reunit quatre choses de sensibilite tres differente : ce que
-- le depot detient, la saisie de ses ventes, son chiffre d'affaires, et
-- le point de caisse par caissiere. Un magasinier a besoin du premier ;
-- le chiffre d'affaires et le point de caisse, pas forcement.
--
-- Quatre privileges, un par onglet. Celui de la vente existe deja
-- (P_VENTE_DEPOT_EXTENSION, pose le 18/09 et jusqu'ici inutilise) : il
-- est repris tel quel plutot que double.
--
-- A QUI les attribuer au depart ? A TOUT LE MONDE, c'est-a-dire a tous
-- les roles qui peuvent deja ouvrir cet ecran (P_SM_DEPOT_EXTENSION).
--
-- Ce n'est pas un oubli, c'est le seul choix sans regression. La demande
-- est de POUVOIR restreindre, pas de restreindre a la place de
-- l'officine. Livrer l'ecran deja cloisonne, sur une repartition que
-- personne n'a demandee, ferait disparaitre des onglets sous les yeux
-- de gens qui les avaient hier - et cela s'appellerait une regression,
-- pas un privilege.
--
-- Une premiere version de cette migration faisait suivre a chaque
-- onglet le privilege de l'ecran comparable (balance depot pour le
-- chiffre d'affaires, point caisse depot pour le point de caisse).
-- Mesure au banc : le compte administrateur perdait AUSSITOT deux
-- onglets sur quatre, parce que ces deux privileges n'etaient detenus
-- que par un role, et pas le sien. L'administrateur n'aurait alors meme
-- plus eu le moyen de se les rendre.
--
-- C'est donc depuis l'ecran des roles que l'officine resserre,
-- privilege par privilege et role par role :
--
--   P_DEPOT_EXT_VALORISATION  onglet valorisation
--   P_VENTE_DEPOT_EXTENSION   onglet saisie de vente (existait deja)
--   P_DEPOT_EXT_CA            onglet chiffre d'affaires
--   P_DEPOT_EXT_POINT_CAISSE  onglet point de caisse
--
-- Rejouable sans effet de bord : rien n'est retire, tout est garde.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Les trois privileges, crees PAR LEUR NOM et avec un identifiant tire
-- au sort.
--
-- Et non avec un identifiant ecrit en dur suivi d'un INSERT IGNORE :
-- premiere version de cette migration, l'identifiant 20260919 etait
-- deja pris par P_SM_POSOS, et IGNORE a silencieusement saute la
-- creation. Le privilege n'existait pas, l'onglet restait invisible, et
-- la migration se declarait reussie. Un identifiant tire au sort ne
-- peut pas entrer en collision, et le NOT EXISTS porte sur le NOM,
-- c'est-a-dire sur ce qui identifie vraiment un privilege ici.
-- ---------------------------------------------------------------------
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), n.nom, 'CUSTOMER', n.libelle, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_DEPOT_EXT_VALORISATION' AS nom, 'Onglet valorisation du depot' AS libelle
        UNION ALL SELECT 'P_DEPOT_EXT_CA', 'Onglet chiffre affaires du depot'
        UNION ALL SELECT 'P_DEPOT_EXT_POINT_CAISSE', 'Onglet point de caisse du depot') n
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = n.nom);

-- ---------------------------------------------------------------------
-- Attribution : les quatre onglets sont ouverts a tous ceux qui peuvent
-- deja ouvrir l'ecran. Rien ne change pour personne aujourd'hui ; c'est
-- desormais possible de restreindre demain.
-- ---------------------------------------------------------------------
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_DEPOT_EXTENSION'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_DEPOT_EXT_VALORISATION'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_DEPOT_EXTENSION'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_DEPOT_EXT_CA'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_DEPOT_EXTENSION'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_DEPOT_EXT_POINT_CAISSE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Meme raisonnement pour l'onglet de vente, dont le privilege existait
-- deja mais n'etait pas encore lu : il etait attribue a 9 roles, la ou
-- 10 peuvent ouvrir l'ecran. En le lisant aujourd'hui, on retirerait
-- l'onglet a un role qui l'avait hier. On complete donc l'attribution
-- jusqu'a ceux qui ouvrent l'ecran, pour que la mise sous privilege ne
-- retire rien a personne le jour de la livraison.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_DEPOT_EXTENSION'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_VENTE_DEPOT_EXTENSION'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Filet de securite : si un privilege modele n'existe pas sur ce site
-- (installation ancienne, renommage), l'onglet correspondant serait
-- reste invisible pour tout le monde - y compris pour l'administrateur,
-- qui n'aurait alors aucun moyen de l'attribuer. On le rattache dans ce
-- cas au role du compte administrateur reellement utilise.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME IN ('P_DEPOT_EXT_VALORISATION', 'P_DEPOT_EXT_CA', 'P_DEPOT_EXT_POINT_CAISSE')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege q WHERE q.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID)
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- ---------------------------------------------------------------------
-- « Deplacer le menu gestion depot extension dans GESTION DES
--   TIERS-PAYANTS (id: 53251827585053722655) »
--
-- L'ecran ne parle plus seulement de stock : il porte la saisie de
-- vente, le chiffre d'affaires et le point de caisse du depot. Sa place
-- est donc avec les depots et les tiers payants.
--
-- Le sous-menu garde son identifiant, son libelle, son composant et son
-- privilege : seule sa rubrique change. Les attributions de roles, qui
-- portent sur le privilege et non sur la rubrique, sont intactes.
-- ---------------------------------------------------------------------
UPDATE t_sous_menu
   SET lg_MENU_ID = '53251827585053722655'
 WHERE str_COMPOSANT = 'depotextension'
   AND EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '53251827585053722655');
