-- Realignement de la copie du stock rayon (t_type_stock_famille, type 1).
--
-- A JOUER A LA MAIN. Ce script n'est volontairement PAS une migration Flyway : il ne part pas
-- au deploiement, c'est vous qui decidez quand l'executer. Le passer plusieurs fois est sans
-- danger, il ne touche que les lignes encore divergentes.
--
-- Marche a suivre :
--   1. sauvegarde de la base, comme pour toute ecriture en masse ;
--   2. requete de comptage ci-dessous, pour savoir combien de lignes sont concernees ;
--   3. l'UPDATE final, de preference hors heures de vente ;
--   4. la meme requete de comptage : elle doit renvoyer zero.
--
-- CONTEXTE
-- Le stock rayon existe a deux endroits : t_famille_stock.int_NUMBER_AVAILABLE, qui est la
-- valeur reelle et celle que la vente decremente, et t_type_stock_famille de type 1, qui n'en
-- est qu'une copie. La vente ne met pas la copie a jour : elle derive donc a chaque vente.
-- C'est ce qui a ete constate en test (stock 21, une unite vendue, t_famille_stock passe a 20
-- alors que t_type_stock_famille restait a 21).
--
-- PORTEE
-- Cette copie n'est lue par aucun ecran accessible : le seul code qui s'en sert pour decider
-- quelque chose est le destockage depuis la zone de depot interne, dont l'ecran n'est instancie
-- nulle part. Les mouvements de reserve, eux, la resynchronisent deja a chaque passage.
-- Ce script ne corrige donc pas un dysfonctionnement visible : il remet simplement des chiffres
-- coherents en base, une fois, pour que la donnee ne soit pas trompeuse si on la consulte.
--
-- CE QUI N'EST PAS TOUCHE
--   - le stock REEL du rayon (t_famille_stock) : lu, jamais ecrit ;
--   - le stock RESERVE (type 2) : c'est la valeur de reference de la reserve, mise a jour par
--     l'inventaire reserve et par les mouvements ; il n'a rien a voir avec ce realignement ;
--   - le stock de la zone DEPOT interne (type 3).
-- Seule la copie de type 1 est reecrite.
--
-- VERIFICATION AVANT / APRES
-- Pour compter les lignes divergentes, avant puis apres execution :
--
--   SELECT COUNT(*)
--     FROM t_type_stock_famille tsf
--     JOIN t_famille_stock fs
--       ON fs.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID
--      AND fs.lg_EMPLACEMENT_ID = tsf.lg_EMPLACEMENT_ID
--      AND fs.str_STATUT = 'enable'
--    WHERE tsf.lg_TYPE_STOCK_ID = '1'
--      AND tsf.int_NUMBER <> fs.int_NUMBER_AVAILABLE;
--
-- Le compte doit tomber a zero apres passage.

UPDATE t_type_stock_famille tsf
  JOIN t_famille_stock fs
    ON fs.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID
   AND fs.lg_EMPLACEMENT_ID = tsf.lg_EMPLACEMENT_ID
   AND fs.str_STATUT = 'enable'
   SET tsf.int_NUMBER = fs.int_NUMBER_AVAILABLE,
       tsf.dt_UPDATED = NOW()
 WHERE tsf.lg_TYPE_STOCK_ID = '1'
   AND tsf.int_NUMBER <> fs.int_NUMBER_AVAILABLE;
