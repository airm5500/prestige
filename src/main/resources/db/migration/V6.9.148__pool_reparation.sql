-- Lot 4 (14/10) : reparation automatique du pool de connexions (connexions mortes apres un redemarrage de MariaDB ou
-- une coupure de courant). 1 = reparer (vider le pool quand MariaDB repond mais que le pool refuse de servir) ;
-- 0 = seulement signaler. Rejouable.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
 ('SUPPORT_POOL_REPARATION', '1', 'Réparation automatique du pool de connexions à la base (1 = réparer, 0 = signaler seulement)', 'SYSTEME', 'enable');
