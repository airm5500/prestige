-- =====================================================================
-- Evolution 5, point 1 : menu « Dépôts d'extension »
-- ---------------------------------------------------------------------
-- Le stock d'un depot d'extension est t_famille_stock pour l'emplacement
-- du depot : la meme table que le stock de l'officine, distinguee par
-- son emplacement. Les donnees existaient donc deja, mais rien ne
-- permettait de les consulter depuis l'officine depot par depot, avec la
-- valorisation de ce que le depot detient.
--
-- Le sous-menu s'ajoute sous « GESTION DU STOCK », a cote de « Etat de
-- stock », et n'apparait qu'aux profils portant son privilege - c'est la
-- vue v_getallsousmenubyconnecteduser qui l'exige, en joignant P_KEY au
-- nom du privilege.
-- =====================================================================

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260917', 'P_SM_DEPOT_EXTENSION', 'CUSTOMER',
            'Depots d extension : consulter le stock et la valorisation d un depot',
            NULL, NOW(), NULL, NOW(), NULL, 'enable');

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `icon_CLASS`)
    VALUES ('20260917', 'Depots d''extension', 'stock', 'Stock et valorisation des depots d''extension',
            'depotextension', '55111546114940284023', 25, '', 'enable', 'P_SM_DEPOT_EXTENSION', NOW(),
            'fa fa-building-o');

-- Attribue aux roles d'administration, comme les autres ecrans de depot.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260917', NOW(), NOW()
  FROM t_role r
 WHERE UPPER(r.str_NAME) LIKE '%ADMIN%'
   AND r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260917');
