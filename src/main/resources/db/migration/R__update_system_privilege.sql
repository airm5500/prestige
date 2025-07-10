
INSERT INTO t_role_privelege(lg_ROLE_PRIVILEGE,lg_ROLE_ID,lg_PRIVILEGE_ID,dt_CREATED,dt_UPDATED) 
SELECT LEFT(UUID(), 40) AS id,'00',  d.lg_PRIVELEGE_ID,now(),now() FROM t_privilege d WHERE d.lg_PRIVELEGE_ID NOT IN (SELECT r.lg_ROLE_PRIVILEGE FROM t_role_privelege r WHERE r.lg_ROLE_ID='00') AND d.str_STATUT='enable';