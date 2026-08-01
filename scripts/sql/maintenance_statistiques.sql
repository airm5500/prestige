-- Recalcul des statistiques d'optimisation - A REJOUER PERIODIQUEMENT.
--
-- POURQUOI
-- Les statistiques d'une table decrivent la repartition de ses valeurs. C'est sur elles que
-- l'optimiseur decide de l'ordre des jointures. Quand elles vieillissent, il se trompe : sur
-- l'ouverture d'une fiche d'inventaire, il partait de t_grossiste (huit lignes) et balayait toute
-- t_famille au lieu d'attaquer directement les lignes de l'inventaire demande.
--
-- Mesure sur le dump de production, requete inchangee : 980 ms avant, 85 ms apres.
--
-- QUAND LE REJOUER
--   - une fois par mois, hors heures de forte activite ;
--   - apres une creation d'inventaire volumineuse ;
--   - des qu'un ecran de liste redevient anormalement lent sans raison apparente.
--
-- Aucune donnee n'est modifiee. Le verrou pose est tres bref (lecture d'un echantillon de pages).

ANALYZE TABLE `t_inventaire_famille`;
ANALYZE TABLE `t_famille`;
ANALYZE TABLE `t_famille_grossiste`;
ANALYZE TABLE `t_famille_stock`;
ANALYZE TABLE `t_inventaire`;
ANALYZE TABLE `t_warehouse`;
ANALYZE TABLE `t_preenregistrement`;
ANALYZE TABLE `t_preenregistrement_detail`;
