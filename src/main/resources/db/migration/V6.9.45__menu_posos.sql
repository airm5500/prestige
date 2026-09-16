-- =====================================================================
-- Evolution 5, point 9 : menu « Analyse Posos »
-- ---------------------------------------------------------------------
-- L'ecran interroge Posos a travers le serveur (v1/posos/status et
-- v1/posos/analyse). Aucun identifiant Posos ne transite par le
-- navigateur et aucun ne se saisit depuis l'ecran : l'adresse et les
-- identifiants sont renseignes cote serveur, hors du depot de code
-- (variables d'environnement, proprietes systeme, ou le fichier
-- /opt/CONF/LABOREX/CONF/posos.properties a cote de la configuration du
-- site).
--
-- Le sous-menu se place dans « SERVICE CLIENT » et n'apparait qu'aux
-- profils portant son privilege : c'est la vue
-- v_getallsousmenubyconnecteduser qui l'exige, en joignant P_KEY au nom
-- du privilege.
-- =====================================================================

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260919', 'P_SM_POSOS', 'CUSTOMER',
            'Analyse Posos : interactions, contre-indications et posologies d une ordonnance',
            NULL, NOW(), NULL, NOW(), NULL, 'enable');

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `icon_CLASS`)
    VALUES ('20260919', 'Analyse Posos', 'vente',
            'Interactions, contre-indications et posologies d une ordonnance',
            'pososmanager', '9', 4, '', 'enable', 'P_SM_POSOS', NOW(), 'fa fa-stethoscope');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260919', NOW(), NOW()
  FROM t_role r
 WHERE UPPER(r.str_NAME) LIKE '%ADMIN%'
   AND r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260919');
