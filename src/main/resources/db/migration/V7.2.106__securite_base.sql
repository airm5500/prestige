-- =====================================================================
-- Cas 4, lot 4.A (sécurité du stockage du mot de passe de la base) : paramètre KEY_SECURITE_BASE.
--  - 0 (défaut) : rien ne change. La sauvegarde Java et la valorisation lisent l'accès à la base dans domain.xml ;
--    les anciens écrans (jconnexion) se connectent par la configuration XML.
--  - 1 : la sauvegarde et la valorisation lisent le compte dédié prestige_sauvegarde dans le fichier d'identifiants
--    chiffré (DPAPI) de outils/officine/2-configurer-mariadb.ps1 -CreerCompte, et les anciens écrans se connectent
--    par le pool JNDI jdbc/__laborex_pool (plus d'URL JDBC avec le mot de passe).
--  - KEY_SECURITE_FICHIER_IDENTIFIANTS (facultatif) : chemin du fichier chiffré, par défaut
--    C:\ProgramData\Prestige\sauvegarde.cnf (Windows) ou /etc/prestige/sauvegarde.cnf.
-- Rejouable ; aucune table créée.
-- =====================================================================

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED)
SELECT 'KEY_SECURITE_BASE', '0',
       'Sécurité de la base : 1 = sauvegarde par le compte dédié (fichier chiffré) et anciens écrans par le pool ; 0 = comme avant',
       'SYSTEME', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters p WHERE p.str_KEY = 'KEY_SECURITE_BASE');
