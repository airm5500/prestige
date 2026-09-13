-- Statistiques des tables de l'inventaire : remise a jour manuelle.
--
-- A QUOI CA SERT
-- L'ouverture d'une fiche d'inventaire peut devenir tres lente, jusqu'a depasser le delai
-- d'attente du navigateur (trois minutes) : l'ecran ne s'ouvre alors jamais et la console
-- affiche « can't access property "getStore", grid is undefined », la requete ayant ete
-- abandonnee en cours de route.
--
-- La cause n'est ni une requete mal ecrite, ni un index manquant : ce sont les STATISTIQUES des
-- tables qui sont perimees. Sans chiffres a jour sur la repartition des valeurs, l'optimiseur
-- MariaDB estime mal la selectivite des filtres et choisit un ordre de jointure absurde : au lieu
-- de partir des lignes de l'inventaire demande, il balaie la totalite de la table des produits
-- pour chacune d'elles.
--
-- QUAND LE REJOUER
--   - apres la creation d'un gros inventaire (c'est l'evenement qui degrade le plus les
--     statistiques : plusieurs milliers de lignes inserees d'un coup) ;
--   - une fois par mois en routine ;
--   - des que l'ouverture d'une fiche redevient lente.
--
-- CE QUE CA NE FAIT PAS
-- Aucune donnee n'est modifiee, aucun resultat d'ecran ne change. ANALYZE TABLE ne fait que
-- relire un echantillon pour recalculer des chiffres internes. L'operation pose un verrou tres
-- bref sur chaque table : a jouer de preference hors des heures de forte activite.
--
-- MESURES RELEVEES SUR UN DUMP DE PRODUCTION (memes donnees, meme machine)
--   avant ANALYZE : 980 ms      apres ANALYZE : 85 ms
--
-- Le meme contenu est applique automatiquement par la migration V6.5.22 lors d'une mise a jour.
-- Ce fichier sert a le rejouer ensuite, sans livraison.

-- 1. Echantillonnage porte a 64 pages (20 par defaut) : les chiffres restent representatifs
--    quand les tables grossissent.
ALTER TABLE `t_inventaire_famille` STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_famille`             STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_famille_grossiste`   STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_famille_stock`       STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_inventaire`          STATS_SAMPLE_PAGES=64;

-- 2. Recalcul des statistiques.
ANALYZE TABLE `t_inventaire_famille`;
ANALYZE TABLE `t_famille`;
ANALYZE TABLE `t_famille_grossiste`;
ANALYZE TABLE `t_famille_stock`;
ANALYZE TABLE `t_inventaire`;
