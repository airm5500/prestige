-- Demande du 24/10 : « Campagnes SMS / WhatsApp » (20261014) et « Ressources humaines » (20261006) avaient la meme
-- priorite : leur ordre dans le menu pouvait s'inverser d'un chargement a l'autre. Campagnes garde sa priorite,
-- Ressources humaines passe juste apres, et les modules suivants (hors Centre de support, 99) sont decales d'un cran
-- pour garder leur ordre. Rien n'est change si les deux priorites ne sont plus egales (deja reglees a la main).
SET @ca = (SELECT int_PRIORITY FROM t_menu WHERE lg_MENU_ID = '20261014');
SET @rh = (SELECT int_PRIORITY FROM t_menu WHERE lg_MENU_ID = '20261006');

UPDATE t_menu SET int_PRIORITY = int_PRIORITY + 1, dt_UPDATED = NOW()
 WHERE @ca IS NOT NULL AND @ca = @rh AND int_PRIORITY > @ca AND int_PRIORITY < 99;

UPDATE t_menu SET int_PRIORITY = @ca + 1, dt_UPDATED = NOW()
 WHERE lg_MENU_ID = '20261006' AND @ca IS NOT NULL AND @ca = @rh;
