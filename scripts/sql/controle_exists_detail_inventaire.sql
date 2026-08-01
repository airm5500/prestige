-- ---------------------------------------------------------------------------------------------
-- CONTROLE AVANT / APRES : remplacement de la jointure t_famille_grossiste par un EXISTS
-- dans les requetes d'ouverture d'une fiche d'inventaire.
--
-- A JOUER A LA MAIN, sur une base de test ou en lecture seule sur la production : ce script ne
-- fait que des SELECT, il ne modifie rien.
--
-- Objectif : prouver que l'ancienne forme (jointure + DISTINCT) et la nouvelle (EXISTS) rendent
-- EXACTEMENT le meme jeu de lignes. Si les trois controles renvoient 0 ecart, la transformation
-- est neutre et la fiche d'inventaire affichera les memes produits qu'avant.
--
-- MODE D'EMPLOI
--   1. Remplacer @inventaire par l'identifiant d'un inventaire dont vous connaissez le contenu.
--   2. Executer le script entier.
--   3. M'envoyer les resultats des trois controles.
--
-- Le parametre @recherche reproduit une recherche a vide, qui est le cas de l'ouverture d'une
-- fiche. Pour verifier aussi le comportement de la recherche par code article grossiste, rejouer
-- le script avec par exemple SET @recherche := '%ABC%';
-- ---------------------------------------------------------------------------------------------

SET @inventaire := 'A_REMPLACER_PAR_UN_LG_INVENTAIRE_ID';
SET @recherche  := '%%%%';          -- recherche vide, comme a l'ouverture de la fiche
SET @updated    := '%%';            -- filtre utilisateur, '%%' = tous

-- ------------------------------------------------------------------ 1. ANCIENNE FORME
-- Jointure sur t_famille_grossiste, dedoublonnee. C'est ce que faisait le code jusqu'ici.
SELECT 'ANCIENNE FORME (jointure + DISTINCT)' AS controle,
       COUNT(DISTINCT t.lg_INVENTAIRE_FAMILLE_ID) AS nb_lignes
  FROM t_inventaire_famille t
  JOIN t_famille f  ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID
  JOIN t_famille_grossiste g ON g.lg_FAMILLE_ID = t.lg_FAMILLE_ID
 WHERE t.lg_INVENTAIRE_ID = @inventaire
   AND t.bool_INVENTAIRE = TRUE
   AND t.str_UPDATED_ID LIKE @updated
   AND (f.str_DESCRIPTION LIKE @recherche
        OR f.int_CIP LIKE @recherche
        OR f.int_EAN13 LIKE @recherche
        OR g.str_CODE_ARTICLE LIKE @recherche);

-- ------------------------------------------------------------------ 2. NOUVELLE FORME
-- Deux EXISTS : le premier reproduit le filtre de la jointure (le produit doit avoir au moins
-- une ligne grossiste), le second porte la recherche par code article.
SELECT 'NOUVELLE FORME (EXISTS)' AS controle,
       COUNT(DISTINCT t.lg_INVENTAIRE_FAMILLE_ID) AS nb_lignes
  FROM t_inventaire_famille t
  JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID
 WHERE t.lg_INVENTAIRE_ID = @inventaire
   AND t.bool_INVENTAIRE = TRUE
   AND t.str_UPDATED_ID LIKE @updated
   AND EXISTS (SELECT 1 FROM t_famille_grossiste gx WHERE gx.lg_FAMILLE_ID = t.lg_FAMILLE_ID)
   AND (f.str_DESCRIPTION LIKE @recherche
        OR f.int_CIP LIKE @recherche
        OR f.int_EAN13 LIKE @recherche
        OR EXISTS (SELECT 1 FROM t_famille_grossiste gs
                    WHERE gs.lg_FAMILLE_ID = t.lg_FAMILLE_ID
                      AND gs.str_CODE_ARTICLE LIKE @recherche));

-- ------------------------------------------------- 3. ECART LIGNE A LIGNE (doit valoir 0)
-- Le controle qui compte vraiment : ce ne sont pas seulement les nombres qui doivent coincider,
-- ce sont les MEMES lignes. Toute ligne presente d'un seul cote ressort ici.
SELECT 'LIGNES PRESENTES D UN SEUL COTE (doit etre vide)' AS controle, cote, lg_INVENTAIRE_FAMILLE_ID
  FROM (
    SELECT 'ancienne seulement' AS cote, a.lg_INVENTAIRE_FAMILLE_ID
      FROM (SELECT DISTINCT t.lg_INVENTAIRE_FAMILLE_ID
              FROM t_inventaire_famille t
              JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID
              JOIN t_famille_grossiste g ON g.lg_FAMILLE_ID = t.lg_FAMILLE_ID
             WHERE t.lg_INVENTAIRE_ID = @inventaire AND t.bool_INVENTAIRE = TRUE
               AND t.str_UPDATED_ID LIKE @updated
               AND (f.str_DESCRIPTION LIKE @recherche OR f.int_CIP LIKE @recherche
                    OR f.int_EAN13 LIKE @recherche OR g.str_CODE_ARTICLE LIKE @recherche)) a
     WHERE NOT EXISTS (
           SELECT 1 FROM t_inventaire_famille t2
            JOIN t_famille f2 ON f2.lg_FAMILLE_ID = t2.lg_FAMILLE_ID
           WHERE t2.lg_INVENTAIRE_FAMILLE_ID = a.lg_INVENTAIRE_FAMILLE_ID
             AND t2.lg_INVENTAIRE_ID = @inventaire AND t2.bool_INVENTAIRE = TRUE
             AND t2.str_UPDATED_ID LIKE @updated
             AND EXISTS (SELECT 1 FROM t_famille_grossiste gx WHERE gx.lg_FAMILLE_ID = t2.lg_FAMILLE_ID)
             AND (f2.str_DESCRIPTION LIKE @recherche OR f2.int_CIP LIKE @recherche
                  OR f2.int_EAN13 LIKE @recherche
                  OR EXISTS (SELECT 1 FROM t_famille_grossiste gs
                              WHERE gs.lg_FAMILLE_ID = t2.lg_FAMILLE_ID
                                AND gs.str_CODE_ARTICLE LIKE @recherche)))
    UNION ALL
    SELECT 'nouvelle seulement' AS cote, b.lg_INVENTAIRE_FAMILLE_ID
      FROM (SELECT DISTINCT t.lg_INVENTAIRE_FAMILLE_ID
              FROM t_inventaire_famille t
              JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID
             WHERE t.lg_INVENTAIRE_ID = @inventaire AND t.bool_INVENTAIRE = TRUE
               AND t.str_UPDATED_ID LIKE @updated
               AND EXISTS (SELECT 1 FROM t_famille_grossiste gx WHERE gx.lg_FAMILLE_ID = t.lg_FAMILLE_ID)
               AND (f.str_DESCRIPTION LIKE @recherche OR f.int_CIP LIKE @recherche
                    OR f.int_EAN13 LIKE @recherche
                    OR EXISTS (SELECT 1 FROM t_famille_grossiste gs
                                WHERE gs.lg_FAMILLE_ID = t.lg_FAMILLE_ID
                                  AND gs.str_CODE_ARTICLE LIKE @recherche))) b
     WHERE NOT EXISTS (
           SELECT 1 FROM t_inventaire_famille t2
            JOIN t_famille f2 ON f2.lg_FAMILLE_ID = t2.lg_FAMILLE_ID
            JOIN t_famille_grossiste g2 ON g2.lg_FAMILLE_ID = t2.lg_FAMILLE_ID
           WHERE t2.lg_INVENTAIRE_FAMILLE_ID = b.lg_INVENTAIRE_FAMILLE_ID
             AND t2.lg_INVENTAIRE_ID = @inventaire AND t2.bool_INVENTAIRE = TRUE
             AND t2.str_UPDATED_ID LIKE @updated
             AND (f2.str_DESCRIPTION LIKE @recherche OR f2.int_CIP LIKE @recherche
                  OR f2.int_EAN13 LIKE @recherche OR g2.str_CODE_ARTICLE LIKE @recherche))
  ) ecarts;

-- ------------------------------------------------- 4. PRODUITS SANS LIGNE GROSSISTE
-- Information complementaire : ces produits appartiennent a l'inventaire mais n'apparaissent
-- PAS dans la fiche, ni avant ni apres, parce que la jointure les excluait deja. Si ce nombre
-- n'est pas nul, cela merite d'etre signale a part - c'est un defaut anterieur, pas une
-- consequence de la transformation.
SELECT 'PRODUITS DE L INVENTAIRE SANS LIGNE GROSSISTE (invisibles avant comme apres)' AS controle,
       COUNT(*) AS nb_lignes
  FROM t_inventaire_famille t
 WHERE t.lg_INVENTAIRE_ID = @inventaire
   AND t.bool_INVENTAIRE = TRUE
   AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste gx WHERE gx.lg_FAMILLE_ID = t.lg_FAMILLE_ID);
