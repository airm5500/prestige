-- Liste des produits detailles : la recherche demandait pres de deux secondes pour une seule ligne.
--
-- La requete joint t_famille sur elle-meme par lg_FAMILLE_PARENT_ID (le detail rattache a sa boite),
-- et pose en plus une sous-requete EXISTS sur la meme colonne pour distinguer un detail jamais cree
-- d'un detail desactive. Or aucun index ne portait cette colonne : le plan montrait un balayage
-- complet de la table pour la jointure (join buffer, BNL) ET une DEPENDENT SUBQUERY rejouee POUR
-- CHAQUE LIGNE - c'est-a-dire un balayage complet de plus par produit du catalogue.
--
-- Avec l'index, la jointure passe en acces direct (ref) et la sous-requete est materialisee une
-- seule fois. Le cout cessant de croitre au carre du nombre de produits, le gain est d'autant plus
-- net que le catalogue est gros.
--
-- Aucun changement de requete ni de resultat : seul le chemin d'acces change.

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 't_famille'
                  AND INDEX_NAME = 'idx_famille_parent_decond');

SET @sql := IF(@existe = 0,
    'CREATE INDEX idx_famille_parent_decond ON t_famille (lg_FAMILLE_PARENT_ID, bool_DECONDITIONNE)',
    'SELECT ''idx_famille_parent_decond deja present''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
