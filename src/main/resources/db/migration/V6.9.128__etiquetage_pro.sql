-- Etiquetage Pro (retours du 10/10) : menu GESTION DU STOCK, a cote de « Gestion étiquette ». Etiquettes de produits
-- importes d'un fichier CSV / Excel ou saisis, en code-barres standard, DataMatrix ou QR code ; impression seule.
-- Droit P_SM_ETIQUETAGE_PRO, donne aux roles qui ont deja la gestion des etiquettes et a l'administrateur.

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_ETIQUETAGE_PRO', 'CUSTOMER',
       'Etiquetage Pro : etiquettes de produits importes (CSV, Excel) ou saisis', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_ETIQUETAGE_PRO');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT src.lg_ROLE_ID
          FROM t_role_privelege src
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
         WHERE modele.str_NAME = 'P_SM_ETIQUETTE'
        UNION
        SELECT ru.lg_ROLE_ID
          FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_ETIQUETAGE_PRO'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Étiquetage Pro', NULL,
       'Etiquettes de produits importes (CSV, Excel) ou saisis : code-barres, DataMatrix, QR code', 'etiquetagepro',
       s.lg_MENU_ID, s.int_PRIORITY, NULL, 'enable', 'P_SM_ETIQUETAGE_PRO', NOW(), NOW(), ''
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'etiquette'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'etiquetagepro')
 LIMIT 1;
