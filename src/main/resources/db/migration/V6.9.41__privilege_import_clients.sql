-- =====================================================================
-- Evolution 5, point 3 : import de clients sous privilege
-- ---------------------------------------------------------------------
-- L'import de clients lisait les colonnes par leur POSITION, figee dans
-- le code (tabString[0] a tabString[9]), sans aucun controle : un
-- fichier dont les colonnes etaient dans un autre ordre etait soit
-- refuse par une erreur de conversion, soit importe de travers, et une
-- seule ligne fautive faisait echouer le lot entier. Le nouvel import
-- fait designer les colonnes par l'operateur et rend un rapport ligne a
-- ligne AVANT d'ecrire.
--
-- Creer des clients en masse reste une operation lourde : elle est
-- reservee aux profils qui portent ce privilege. L'ancien import reste
-- en place et n'est pas touche.
-- =====================================================================

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260916', 'P_IMPORT_CLIENTS', 'CUSTOMER',
            'Importer des clients depuis un fichier (choix des colonnes et controle des lignes)',
            NULL, NOW(), NULL, NOW(), NULL, 'enable');

-- Attribue aux seuls roles d'administration : l'import cree des clients en masse.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260916', NOW(), NOW()
  FROM t_role r
 WHERE UPPER(r.str_NAME) LIKE '%ADMIN%'
   AND r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260916');
