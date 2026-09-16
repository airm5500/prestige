-- =====================================================================
-- Evolution 5 : raccourcir les libelles et descriptions des nouveaux menus
-- ---------------------------------------------------------------------
-- REGLE DE LA MAISON, a tenir pour tout menu a venir : le libelle et la
-- description d'un sous-menu sont AFFICHES dans la navigation de
-- Prestige, dans une place etroite. Une description longue est tronquee
-- ou deborde.
--
-- Mesure sur cette base, hors nouveaux menus : les descriptions de
-- sous-menus font 20 caracteres en moyenne, 57 au maximum ; les
-- libelles 19 en moyenne, 44 au maximum. Les trois descriptions posees
-- par l'evolution 5 faisaient 44, 62 et 71 caracteres - hors norme.
--
-- A viser desormais : libelle <= 25 caracteres, description <= 30.
-- Une description n'est pas le mode d'emploi de l'ecran : elle le
-- nomme. L'explication va dans le code, pas dans le menu.
-- =====================================================================

-- « Analyse Posos » -> « Analyse Posologie » (demande de l'officine)
UPDATE t_sous_menu
   SET str_VALUE = 'Analyse Posologie',
       str_DESCRIPTION = 'Analyse Posologie'
 WHERE lg_SOUS_MENU_ID = '20260919';

-- L'ecran des depots d'extension devient la gestion des depots.
UPDATE t_sous_menu
   SET str_VALUE = 'Gestion depots extensions',
       str_DESCRIPTION = 'Gestion depots extensions'
 WHERE lg_SOUS_MENU_ID = '20260917';

-- La vente en depot : un nom court, pas une phrase.
UPDATE t_sous_menu
   SET str_VALUE = 'Vente du depot',
       str_DESCRIPTION = 'Saisir vente du depot'
 WHERE lg_SOUS_MENU_ID = '20260918';

-- Les descriptions de privileges sont elles aussi affichees, dans
-- l'ecran d'attribution des privileges aux roles : meme regle.
UPDATE t_privilege SET str_DESCRIPTION = 'Gestion depots extensions'
 WHERE str_NAME = 'P_SM_DEPOT_EXTENSION';
UPDATE t_privilege SET str_DESCRIPTION = 'Vente du depot'
 WHERE str_NAME = 'P_VENTE_DEPOT_EXTENSION';
UPDATE t_privilege SET str_DESCRIPTION = 'Analyse Posologie'
 WHERE str_NAME = 'P_SM_POSOS';
