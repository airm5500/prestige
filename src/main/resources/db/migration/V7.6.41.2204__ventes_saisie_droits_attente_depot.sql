-- Cahier des charges du 24/11, point 2, rattrapage de V7.6.41.2203 (aucune régression).
--
-- V2203 donne « mettre en attente » et « reprendre une vente en attente » aux profils qui ont l'écran de vente
-- (P_SM_CLOTURER_CAISSE) ou de vente en dépôt (P_SM_VENTEDEPOT). Elle oubliait ceux qui vendent seulement par l'onglet
-- de vente de « Gestion dépôts extensions » (P_VENTE_DEPOT_EXTENSION) : « Gestion du stock » sur appaul, « Chargé
-- Commande et Stock » sur laborex_v1_db. Avant la mise à jour, ils mettaient leurs ventes en attente et les
-- rappelaient ; après, refus « droit manquant ». Ils reçoivent ici les deux droits.
-- Test : src/test/e2e/vente/test-ventes-saisie-profil-depot-2411.js (échoue sans ce script).
--
-- Rejouable : n'ajoute que ce qui manque.

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE modele.str_NAME = 'P_VENTE_DEPOT_EXTENSION') src
  JOIN t_privilege cible ON cible.str_NAME IN ('P_VENTE_METTRE_EN_ATTENTE', 'P_VENTE_REPRENDRE_ATTENTE')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
