-- =====================================================================
-- Litiges tiers payant (audit 05 LI-01..08, notice MECANISMES_CODE_LITIGES L1..L5) : module porte en REST
-- (api/v1/litiges). Un litige est rattache a UN dossier tiers payant (ligne t_preenregistrement_compte_client_tiers_payent),
-- le sort de la facturation tant qu'il est ouvert (str_STATUT_FACTURE = 'is_Litige'), et se denoue par une cloture
-- avec ou sans remboursement, ou une annulation qui remet le dossier dans son etat d'avant. Rejouable.
-- =====================================================================

ALTER TABLE t_litige
    ADD COLUMN IF NOT EXISTS str_STATUT VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS str_STATUT_FACTURE_AVANT VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS int_ECART INT NULL,
    ADD COLUMN IF NOT EXISTS str_MOTIF_CLOTURE VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS dt_CLOTURE DATETIME NULL,
    ADD COLUMN IF NOT EXISTS lg_USER_ID VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS lg_USER_CLOTURE_ID VARCHAR(40) NULL;

CREATE INDEX IF NOT EXISTS idx_litige_dossier ON t_litige (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, str_STATUT);

-- Types de litige de depart (aucun ecran ne permettait d'en creer ; la creation d'un litige exige un type).
INSERT INTO t_typelitige (lg_TYPELITIGE_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT)
SELECT t.id, t.nom, t.description, NOW(), NOW(), 'enable'
  FROM (SELECT 'TL-BON-REFUSE' AS id, 'Bon refusé' AS nom, 'Bon refusé par l''organisme' AS description
        UNION ALL SELECT 'TL-MONTANT-CONTESTE', 'Montant contesté', 'Montant de la part organisme contesté'
        UNION ALL SELECT 'TL-ASSURE-INCONNU', 'Assuré non reconnu', 'Assuré inconnu ou droits fermés'
        UNION ALL SELECT 'TL-AUTRE', 'Autre', 'Autre motif de rejet') t
 WHERE NOT EXISTS (SELECT 1 FROM t_typelitige x WHERE x.lg_TYPELITIGE_ID = t.id OR x.str_NAME = t.nom);

-- Menu « Litiges tiers payant » dans le meme menu que la balance agee, privilege P_SM_LITIGES donne aux roles qui ont
-- la balance agee ou la facturation, aux profils pharmacien et administrateur, et au role du compte administrateur.
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_LITIGES', 'CUSTOMER', 'TIERS PAYANT - Litiges (dossiers contestés par l''organisme)',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_LITIGES');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_LITIGES'
 WHERE (r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
        OR EXISTS (SELECT 1 FROM t_role_privelege rp
                     JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                     JOIN t_sous_menu s ON s.P_KEY = m.str_NAME
                    WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID
                      AND s.str_COMPOSANT IN ('balanceagee', 'balanceagee_detail', 'facturemanager')))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_LITIGES'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libelle court (25 caracteres au plus), aide au survol dans str_VALUE. Un sous-menu 'litige' deja present est garde.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Dossiers tiers payant contestés par l''organisme : mise en litige, clôture, annulation',
       NULL, 'Litiges tiers payant', 'litige', ba.lg_MENU_ID, 1, NULL, 'enable', 'P_SM_LITIGES', NOW(), NOW(), ''
  FROM (SELECT s.lg_MENU_ID FROM t_sous_menu s
         WHERE s.str_COMPOSANT IN ('balanceagee', 'balanceagee_detail') AND s.lg_MENU_ID IS NOT NULL
         ORDER BY s.str_COMPOSANT LIMIT 1) ba
 WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'litige');
