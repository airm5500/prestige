-- =====================================================================
-- Cas 4, lot 4.C (archives de sauvegarde chiffrées, S6, décision Q4.3 du 05/11/2026) : trois paramètres, aucune
-- valeur secrète (la clé des archives n'est jamais en base : elle est chez le pharmacien, et sur le serveur
-- seulement chiffrée par DPAPI dans C:\ProgramData\Prestige\archive.cnf).
--  - KEY_SECURITE_CLE_ARCHIVE_DATE : date de création de la clé (posée par outils/officine/7-cle-archive.ps1 ;
--    vide = jamais) ;
--  - KEY_SECURITE_DERNIER_ESSAI_RESTAURATION : date du dernier essai de restauration (6-essai-restauration.ps1) ;
--    l'onglet Sécurité rappelle l'essai quand il a plus d'un mois ou n'a jamais été fait ;
--  - KEY_SECURITE_DERNIER_ESSAI_RESULTAT : CONFORME, ECART ou ECHEC.
--  - KEY_SECURITE_FICHIER_CLE_ARCHIVE (facultatif, non créé ici) : chemin du fichier de la clé s'il n'est pas à
--    côté du fichier d'identifiants.
-- Tout reste inactif tant que KEY_SECURITE_BASE vaut 0. Rejouable ; aucune table créée.
-- =====================================================================

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED)
SELECT 'KEY_SECURITE_CLE_ARCHIVE_DATE', '',
       'Sécurité de la base : date de création de la clé des archives de sauvegarde (7-cle-archive.ps1 ; vide = jamais)',
       'SYSTEME', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters p WHERE p.str_KEY = 'KEY_SECURITE_CLE_ARCHIVE_DATE');

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED)
SELECT 'KEY_SECURITE_DERNIER_ESSAI_RESTAURATION', '',
       'Sécurité de la base : date du dernier essai de restauration (6-essai-restauration.ps1 ; vide = jamais ; rappel à 1 mois)',
       'SYSTEME', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters p WHERE p.str_KEY = 'KEY_SECURITE_DERNIER_ESSAI_RESTAURATION');

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED)
SELECT 'KEY_SECURITE_DERNIER_ESSAI_RESULTAT', '',
       'Sécurité de la base : résultat du dernier essai de restauration (CONFORME, ECART, ECHEC)',
       'SYSTEME', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters p WHERE p.str_KEY = 'KEY_SECURITE_DERNIER_ESSAI_RESULTAT');
