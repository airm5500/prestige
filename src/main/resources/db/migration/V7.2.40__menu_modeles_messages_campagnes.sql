-- Plan du 06/11, point 14 : « Modèles de messages » passe du menu SERVICE CLIENT au menu « Campagnes SMS / WhatsApp »
-- (20261014), juste après « Campagnes ». L'écran ne change pas, son droit (P_SM_MODELES_MESSAGES) non plus.
-- Chaque rôle qui a « Modèles de messages » reçoit aussi le droit du menu Campagnes (P_M_CAMPAGNES) : personne ne perd
-- l'accès. Rejouable : rien n'est décalé si le sous-menu est déjà sous Campagnes.
SET @deja = (SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT = 'modelemessagemanager' AND lg_MENU_ID = '20261014');
SET @apres = (SELECT MIN(int_PRIORITY) FROM t_sous_menu WHERE str_COMPOSANT = 'campagnes' AND lg_MENU_ID = '20261014');
SET @rang = IFNULL(@apres, 0) + 1;

UPDATE t_sous_menu SET int_PRIORITY = int_PRIORITY + 1, dt_UPDATED = NOW()
 WHERE @deja = 0 AND lg_MENU_ID = '20261014' AND str_COMPOSANT <> 'campagnes' AND int_PRIORITY >= @rang;

UPDATE t_sous_menu SET lg_MENU_ID = '20261014', int_PRIORITY = @rang, dt_UPDATED = NOW()
 WHERE @deja = 0 AND str_COMPOSANT = 'modelemessagemanager';

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, m.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE p.str_NAME = 'P_SM_MODELES_MESSAGES') r
  JOIN t_privilege m ON m.str_NAME = 'P_M_CAMPAGNES'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = m.lg_PRIVELEGE_ID);
