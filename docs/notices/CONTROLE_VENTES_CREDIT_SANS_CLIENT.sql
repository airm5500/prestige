-- Retours du 10/10 : ventes a credit (assurance, carnet) touchees par le bug « Cette vente n'a plus de client » /
-- « TPundefined ». LECTURE SEULE : rien n'est modifie. A passer en officine (HeidiSQL, MySQL Workbench...).
-- Pour chaque vente listee : la rouvrir a l'ecran de vente, rechercher le client (nom puis Entree), puis continuer.

-- 1. Ventes a credit EN COURS ou EN ATTENTE sans client, ou avec un etat des tiers payants incoherent
SELECT p.str_REF                                   AS reference,
       p.dt_CREATED                                AS creee_le,
       IF(p.lg_TYPE_VENTE_ID = '2', 'Assurance', 'Carnet') AS type_vente,
       p.str_STATUT                                AS statut,
       CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME) AS operateur,
       p.int_PRICE                                 AS montant,
       IFNULL(c.str_FIRST_NAME, '(AUCUN CLIENT)')  AS client,
       (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent x
         WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) AS lignes_tiers_payant,
       CASE
         WHEN p.lg_CLIENT_ID IS NULL AND EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent x
                                                  WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)
           THEN 'Sans client, ligne de tiers payant orpheline'
         WHEN p.lg_CLIENT_ID IS NULL THEN 'Sans client'
         ELSE 'Client sans ligne de tiers payant'
       END                                          AS anomalie
  FROM t_preenregistrement p
  LEFT JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID
  LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
 WHERE p.lg_TYPE_VENTE_ID IN ('2', '3')
   AND p.str_STATUT <> 'is_Closed'
   AND p.b_IS_CANCEL = 0
   AND p.dt_CREATED >= CURDATE() - INTERVAL 60 DAY
   AND (p.lg_CLIENT_ID IS NULL
        OR NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent x
                        WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID))
 ORDER BY p.dt_CREATED DESC;

-- 2. Ventes a credit CLOTUREES depuis 60 jours sans client (a verifier avec la facturation des tiers payants)
SELECT p.str_REF AS reference, p.dt_UPDATED AS cloturee_le,
       IF(p.lg_TYPE_VENTE_ID = '2', 'Assurance', 'Carnet') AS type_vente, p.int_PRICE AS montant,
       (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent x
         WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) AS lignes_tiers_payant
  FROM t_preenregistrement p
 WHERE p.lg_TYPE_VENTE_ID IN ('2', '3') AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0
   AND p.lg_CLIENT_ID IS NULL AND p.dt_UPDATED >= CURDATE() - INTERVAL 60 DAY
 ORDER BY p.dt_UPDATED DESC;
