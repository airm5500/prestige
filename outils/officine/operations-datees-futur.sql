-- OPERATIONS DATEES DANS LE FUTUR (cahier des charges du 24/11, point 1 : outil de support).
--
-- Quand l'horloge du serveur est partie dans le futur (ex. 2189, ou quelques jours d'avance) puis a été remise, les
-- opérations saisies pendant ce temps restent datées après aujourd'hui : elles faussent les états du jour, le ticket Z,
-- les relevés. Ce script les LISTE, table par table, sans rien modifier (lecture seule). Aucune colonne nominative :
-- identifiant, référence, montant, date, utilisateur.
--
-- Usage (sur le serveur de l'officine, base de l'officine) :
--   mariadb --defaults-extra-file=<fichier d'options hors du dépôt> <base> < operations-datees-futur.sql
-- Marge : 5 minutes après l'heure du serveur de base de données (MariaDB), qui doit elle-même être juste : contrôler
-- d'abord avec « SELECT NOW(); » et l'heure du téléphone.
--
-- La correction (re-dater ou annuler) se décide au cas par cas avec le pharmacien : jamais en masse par ce script.

SET @limite := NOW() + INTERVAL 5 MINUTE;

SELECT 'Résumé' AS partie, 'ventes' AS quoi, COUNT(*) AS nombre, MIN(dt_UPDATED) AS premiere, MAX(dt_UPDATED) AS derniere
  FROM t_preenregistrement WHERE dt_UPDATED > @limite OR dt_CREATED > @limite
UNION ALL SELECT 'Résumé', 'mouvements de caisse (mvttransaction)', COUNT(*), MIN(createdAt), MAX(createdAt)
  FROM mvttransaction WHERE createdAt > @limite OR mvtdate > DATE(@limite)
UNION ALL SELECT 'Résumé', 'règlements de vente (vente_reglement)', COUNT(*), MIN(mvtDate), MAX(mvtDate)
  FROM vente_reglement WHERE mvtDate > @limite
UNION ALL SELECT 'Résumé', 'règlements (t_reglement)', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_reglement WHERE dt_CREATED > @limite OR dt_REGLEMENT > @limite
UNION ALL SELECT 'Résumé', 'mouvements de caisse manuels (t_mvt_caisse)', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_mvt_caisse WHERE dt_CREATED > @limite OR dt_DATE_MVT > @limite
UNION ALL SELECT 'Résumé', 'recettes (t_recettes)', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_recettes WHERE dt_CREATED > @limite
UNION ALL SELECT 'Résumé', 'mouvements de stock (hmvtproduit)', COUNT(*), MIN(createdAt), MAX(createdAt)
  FROM hmvtproduit WHERE createdAt > @limite OR mvtdate > DATE(@limite)
UNION ALL SELECT 'Résumé', 'bons de livraison', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_bon_livraison WHERE dt_CREATED > @limite OR dt_UPDATED > @limite
UNION ALL SELECT 'Résumé', 'commandes', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_order WHERE dt_CREATED > @limite
UNION ALL SELECT 'Résumé', 'ajustements de stock', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_ajustement WHERE dt_CREATED > @limite
UNION ALL SELECT 'Résumé', 'inventaires', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_inventaire WHERE dt_CREATED > @limite
UNION ALL SELECT 'Résumé', 'dossiers de règlement (différés, tiers payants)', COUNT(*), MIN(dt_CREATED), MAX(dt_CREATED)
  FROM t_dossier_reglement WHERE dt_CREATED > @limite OR dt_REGLEMENT > @limite;

-- Détail des ventes datées dans le futur (200 au plus) : référence, statut, montant, dates, utilisateur
SELECT p.lg_PREENREGISTREMENT_ID AS vente, p.str_REF AS numero, p.str_STATUT AS statut, p.int_PRICE AS montant,
       p.dt_CREATED AS creee_le, p.dt_UPDATED AS modifiee_le, CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME) AS utilisateur
  FROM t_preenregistrement p LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
 WHERE p.dt_UPDATED > @limite OR p.dt_CREATED > @limite
 ORDER BY p.dt_UPDATED LIMIT 200;

-- Détail des mouvements de caisse datés dans le futur (200 au plus)
SELECT m.uuid AS id, m.reference, m.vente_id AS vente, m.typeTransaction AS type, m.montant, m.mvtdate AS jour, m.createdAt AS cree_le
  FROM mvttransaction m
 WHERE m.createdAt > @limite OR m.mvtdate > DATE(@limite)
 ORDER BY m.createdAt LIMIT 200;
