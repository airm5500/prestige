 DELETE FROM  t_role_privelege  WHERE t_role_privelege.lg_ROLE_PRIVILEGE IN (SELECT rp.lg_ROLE_PRIVILEGE FROM  t_sous_menu s JOIN t_privilege
 p ON s.P_KEY=p.str_NAME JOIN t_role_privelege rp ON p.lg_PRIVELEGE_ID=rp.lg_PRIVILEGE_ID AND s.lg_SOUS_MENU_ID='77');
 
 DELETE FROM  t_privilege  WHERE t_privilege.lg_PRIVELEGE_ID='77';
 DELETE FROM  t_sous_menu  WHERE t_sous_menu.lg_SOUS_MENU_ID='77';