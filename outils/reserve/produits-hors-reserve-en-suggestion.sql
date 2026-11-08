-- Produits presents dans une suggestion de reserve OUVERTE (A_TRAITER ou EN_COURS) alors que la case
-- « Cet article aura-t-il un stock reserve ? » de la fiche article (t_famille.bool_RESERVE) n'est pas cochee.
-- LECTURE SEULE. Aucune colonne nominative.
--
-- chemin :
--   DECOCHE_APRES : le produit a ete gere en reserve (stock reserve > 0 a la creation de la ligne, ou au
--                   moins un mouvement de reserve) : la case a ete decochee alors que la ligne etait ouverte ;
--   AUCUNE_TRACE  : aucune trace de reserve : ajout d'un produit non gere en reserve, ou case cochee puis
--                   decochee sans aucun mouvement entre les deux (la fiche ne garde pas l'historique de la case).
SELECT f.int_CIP                                   AS cip,
       f.str_NAME                                  AS produit,
       s.str_REF                                   AS suggestion,
       s.str_ORIGINE                               AS origine,
       s.str_STATUT                                AS statut_suggestion,
       d.str_ETAT                                  AS etat_ligne,
       COALESCE(d.str_CODE_ECHEC, '')              AS code_echec,
       d.dt_CREATED                                AS ligne_creee_le,
       d.int_STOCK_RESERVE                         AS reserve_a_la_creation,
       (SELECT MAX(m.dt_CREATED) FROM t_mouvement_reserve m
         WHERE m.lg_FAMILLE_ID = f.lg_FAMILLE_ID)  AS dernier_mvt_reserve,
       (SELECT COUNT(*) FROM t_type_stock_famille t
         WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2') AS type_reserve_present,
       CASE WHEN COALESCE(d.int_STOCK_RESERVE, 0) > 0
                 OR EXISTS (SELECT 1 FROM t_mouvement_reserve m
                             WHERE m.lg_FAMILLE_ID = f.lg_FAMILLE_ID)
            THEN 'DECOCHE_APRES' ELSE 'AUCUNE_TRACE' END AS chemin
  FROM t_suggestion_reserve_detail d
  JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID
  JOIN t_famille f            ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
 WHERE COALESCE(f.bool_RESERVE, 0) = 0
   AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS')
 ORDER BY chemin, f.str_NAME, s.str_REF;
