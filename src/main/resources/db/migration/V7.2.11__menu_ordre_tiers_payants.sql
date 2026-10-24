-- Demande du 24/10 : « Gestion des tiers-payants » (53251827585053722655), « Menu pharmacien » (23052020) et
-- « Gestion des promotions » (50) avaient la meme priorite (3) : leur ordre dans le menu pouvait changer d'un
-- chargement a l'autre. Tiers-payants garde sa priorite, Menu pharmacien et Gestion des promotions passent juste apres,
-- dans cet ordre ; les modules suivants (hors Centre de support, 99) sont decales de deux crans pour garder leur ordre.
-- Rien n'est change si les trois priorites ne sont plus egales (deja reglees a la main).
SET @tp = (SELECT int_PRIORITY FROM t_menu WHERE lg_MENU_ID = '53251827585053722655');
SET @ph = (SELECT int_PRIORITY FROM t_menu WHERE lg_MENU_ID = '23052020');
SET @pr = (SELECT int_PRIORITY FROM t_menu WHERE lg_MENU_ID = '50');
SET @ok = (@tp IS NOT NULL AND @tp = @ph AND @tp = @pr);

UPDATE t_menu SET int_PRIORITY = int_PRIORITY + 2, dt_UPDATED = NOW()
 WHERE @ok AND int_PRIORITY > @tp AND int_PRIORITY < 99;

UPDATE t_menu SET int_PRIORITY = @tp + 1, dt_UPDATED = NOW() WHERE @ok AND lg_MENU_ID = '23052020';
UPDATE t_menu SET int_PRIORITY = @tp + 2, dt_UPDATED = NOW() WHERE @ok AND lg_MENU_ID = '50';
