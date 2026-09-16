-- =====================================================================
-- Evolution 5, point 1 : menu « Vente en depot »
-- ---------------------------------------------------------------------
-- A ne pas confondre avec « Vente depot » (sous-menu 79, composant
-- ventedepot), qui est la vente A un depot : le depot y est le CLIENT,
-- le stock sort de l'officine et le depot est approvisionne.
--
-- Ici, la vente se joue DANS le depot : on choisit le depot, puis on
-- saisit ses ventes comme si l'on s'etait connecte sur place. Le stock
-- vendu est celui du depot, et l'encaissement tombe dans la caisse de
-- l'operateur connecte.
--
-- L'ecran est une DUPLICATION de l'ecran de vente de l'officine
-- (xtype doventeendepot), pour que l'ecran qui sert tous les jours ne
-- soit pas touche. Le privilege P_VENTE_DEPOT_EXTENSION a ete cree par
-- la migration V6.9.43.
--
-- Le sous-menu se place dans « SERVICE CLIENT », a cote de « Vente
-- depot », et n'apparait qu'aux profils portant le privilege : c'est la
-- vue v_getallsousmenubyconnecteduser qui l'exige, en joignant P_KEY au
-- nom du privilege.
-- =====================================================================

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `icon_CLASS`)
    VALUES ('20260918', 'Vente en depot', 'vente',
            'Saisir les ventes d un depot d extension comme si l on y etait connecte',
            'doventeendepot', '9', 3, '', 'enable', 'P_VENTE_DEPOT_EXTENSION', NOW(), 'fa fa-shopping-cart');
