-- Dedoublonnage des attributions de privileges aux roles.
--
-- La migration V6.3.0 attribuait 'Evolution Stock' avec un SELECT DISTINCT
-- inoperant (UUID() change a chaque ligne) : un role ayant N sous-menus de
-- gestion du stock a recu N attributions identiques, qui apparaissaient en
-- doublon dans l'ecran d'attribution des privileges.
--
-- On garde une seule ligne par couple (role, privilege) : celle au plus petit
-- identifiant.
DELETE rp FROM t_role_privelege rp
JOIN t_role_privelege garde
  ON garde.lg_ROLE_ID = rp.lg_ROLE_ID
 AND garde.lg_PRIVILEGE_ID = rp.lg_PRIVILEGE_ID
 AND garde.lg_ROLE_PRIVILEGE < rp.lg_ROLE_PRIVILEGE;

-- Un index unique empeche les doublons de se reformer : une insertion en
-- double echoue desormais au lieu de passer silencieusement.
ALTER TABLE t_role_privelege
  ADD UNIQUE KEY uq_role_privilege (lg_ROLE_ID, lg_PRIVILEGE_ID);
