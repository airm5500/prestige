-- =====================================================================
-- Demande 60 (Prestige Mobile, plan du 08/11) : VOIR ET OUVRIR LES SUGGESTIONS DE RESERVE.
-- Aucun privilege ne controlait la LECTURE des suggestions de reserve (liste, cloche, detail, compte rendu) ni leur
-- ouverture. Elles exigent desormais P_RESERVE_SUGGESTION, sur le web (onglet SUGGESTIONS, cloche) et sur le mobile
-- (capacite « voirSuggestions » de GET v1/reserve/droits). La creation d'une suggestion reste permise sans ce droit
-- (decision du pharmacien du 08/11).
-- Personne ne perd ce qu'il voit aujourd'hui : le droit est donne aux roles qui ont le menu « Gestion des reserves »
-- (P_SM_RESERVE) et a ceux qui traitent la reserve (P_TRAITER_RESERVE, qui ouvraient les suggestions sur le mobile),
-- ainsi qu'au role du compte administrateur. Idempotent : une seconde execution n'ajoute rien.
-- =====================================================================
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_RESERVE_SUGGESTION', 'CUSTOMER',
       'RÉSERVE - Voir et ouvrir les suggestions de réserve (onglet Suggestions, mobile)',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_RESERVE_SUGGESTION');

-- roles qui ont le menu « Gestion des reserves » ou le droit de traiter la reserve
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID
          FROM t_role_privelege rp
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE modele.str_NAME IN ('P_SM_RESERVE', 'P_TRAITER_RESERVE')) src
  JOIN t_privilege cible ON cible.str_NAME = 'P_RESERVE_SUGGESTION'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- et au role du compte administrateur (sinon personne ne pourrait le distribuer)
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_RESERVE_SUGGESTION'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
