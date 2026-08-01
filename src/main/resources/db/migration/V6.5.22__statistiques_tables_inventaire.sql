-- Statistiques d'optimisation des tables de l'inventaire.
--
-- CE QUI A ETE CONSTATE
-- L'ouverture d'une fiche d'inventaire coutait environ une seconde, quel que soit le nombre de
-- lignes (344 comme 8086). Le dump de production rejoue en local montre pourquoi : l'optimiseur
-- choisissait un ordre de jointure absurde. Au lieu de partir de t_inventaire_famille filtree sur
-- l'inventaire demande - quelques milliers de lignes sur trois cent mille - il partait de
-- t_grossiste (huit lignes) puis balayait la TOTALITE de t_famille, avant de chercher les lignes
-- d'inventaire correspondantes.
--
-- La cause n'est ni une requete mal ecrite, ni un index manquant : ce sont les STATISTIQUES des
-- tables qui etaient perimees. Sans chiffres a jour sur la repartition des valeurs, l'optimiseur
-- estime mal la selectivite de chaque filtre et se trompe d'ordre.
--
-- MESURES (memes donnees, meme machine, requete de page inchangee)
--   avant ANALYZE : 980 ms
--   apres ANALYZE :  85 ms
-- Sur l'inventaire de 344 lignes : 15 ms. Sur la requete de comptage : 72 ms.
-- Aucun index ajoute, aucune requete modifiee pour obtenir ce resultat.
--
-- CE QUE FAIT CE SCRIPT
--   1. Porte l'echantillonnage des statistiques a 64 pages (20 par defaut) sur les tables
--      concernees, pour que les chiffres restent representatifs quand les tables grossissent.
--   2. Recalcule les statistiques.
--
-- Aucune donnee n'est modifiee. ANALYZE TABLE pose un verrou tres bref sur la table le temps de
-- lire l'echantillon ; a jouer de preference hors des heures de forte activite.
--
-- A REJOUER PERIODIQUEMENT. Les statistiques se degradent a mesure que les tables evoluent :
-- c'est ce qui a produit la lenteur constatee. Un passage mensuel, ou apres une grosse creation
-- d'inventaire, evite qu'elle revienne. Le meme contenu est disponible dans
-- scripts/sql/maintenance_statistiques.sql pour un usage manuel.

ALTER TABLE `t_inventaire_famille` STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_famille`             STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_famille_grossiste`   STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_famille_stock`       STATS_SAMPLE_PAGES=64;
ALTER TABLE `t_inventaire`          STATS_SAMPLE_PAGES=64;

ANALYZE TABLE `t_inventaire_famille`;
ANALYZE TABLE `t_famille`;
ANALYZE TABLE `t_famille_grossiste`;
ANALYZE TABLE `t_famille_stock`;
ANALYZE TABLE `t_inventaire`;
