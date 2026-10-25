-- Retours du 25/10 (points 5 et 7) : le Centre de support, sauf « Me contacter », et l'audit sont reserves au super
-- administrateur. Leurs droits passent en type SYSTEME :
--  - le catalogue des droits ne les propose qu'au super administrateur (seul lui peut les accorder) ;
--  - a la connexion, un droit SYSTEME n'est charge que pour un super administrateur (UserServiceImpl.getAllPrivilege) :
--    menus masques et routes refusees pour les autres profils, meme si le droit leur a ete accorde avant.
-- « Centre de support » (le menu) et « Me contacter » restent ouverts aux autres profils (type inchange).
-- Les attributions existantes ne sont pas supprimees : remettre le type CUSTOMER suffit a revenir en arriere.
UPDATE t_privilege SET str_TYPE = 'SYSTEME'
WHERE str_NAME IN ('P_SM_SUPPORT_TICKETS', 'P_SM_SUPPORT_DIAGNOSTIC', 'P_SM_SUPPORT_SANTE', 'P_SM_SUPPORT_SERVEUR',
                   'P_SM_SUPPORT_HISTORIQUE', 'P_SM_SUPPORT_MAINTENANCE', 'P_SM_AUDIT', 'P_AUDIT_REGULARISER');
