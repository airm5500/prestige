-- Privilege du bouton « Mise a jour selective » de l'ecran Gestion des tiers payants.
--
-- Ce bouton ouvre un ecran qui applique une meme valeur (code d'edition du bordereau, nombre de
-- bons par page, taille de police) a TOUS les tiers payants coches. C'est une operation en masse :
-- elle merite un droit a part, et le controle est fait des deux cotes, ecran ET serveur.
--
-- Le droit n'est donne qu'aux profils d'administration. Ce n'est pas une regression : le bouton
-- n'existait pas. Les autres profils l'obtiennent depuis Gestion des roles / privileges.

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260816', 'P_BTN_MAJ_SELECTIVE_TIERS_PAYANT', 'CUSTOMER',
            'Autorisation de mise à jour sélectives tiers payants', NULL, NOW(), NULL, NOW(), NULL, 'enable');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260816', NOW(), NOW()
FROM t_role r
WHERE (r.str_TYPE = 'ADMIN' OR r.str_NAME LIKE 'Administrateur%' OR r.str_NAME LIKE 'Super Administrateur%')
  AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp
                  WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND rp.lg_PRIVILEGE_ID = '20260816');
