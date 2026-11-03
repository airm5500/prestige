-- Cas 1 du 03/11/2026 : ligne « au comptant » dans une vente assurance (une saisie, deux ventes, deux tickets).
-- 1. t_preenregistrement_detail.comptant : la ligne est cochee « C » a l'ecran de vente assurance ; elle sort du calcul
--    tiers-payant et, a la cloture, part dans une vente comptant liee. 0 partout : rien ne change.
-- 2. t_preenregistrement.lg_VENTE_LIEE_ID : lien reciproque entre la vente assurance et la vente comptant nees de la
--    meme saisie. Affichage seulement (detail de vente, ticket combine) : jamais un traitement couple (Q1.5).
-- 3. Parametre KEY_LIGNE_COMPTANT_VO, a 0 : la colonne n'est pas creee dans la grille, le service de cochage refuse,
--    la cloture et les tickets sont strictement ceux d'aujourd'hui. Rejouable (IF NOT EXISTS, insertion conditionnelle).
ALTER TABLE t_preenregistrement_detail ADD COLUMN IF NOT EXISTS comptant TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE t_preenregistrement ADD COLUMN IF NOT EXISTS lg_VENTE_LIEE_ID VARCHAR(40) NULL DEFAULT NULL;
ALTER TABLE t_preenregistrement ADD INDEX IF NOT EXISTS ix_vente_liee (lg_VENTE_LIEE_ID);

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_LIGNE_COMPTANT_VO', '0',
       'Vente assurance : lignes au comptant (colonne C) ; a la cloture, les lignes cochees forment une vente comptant liee ; 0 = ecran, calcul, cloture et tickets inchanges',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_LIGNE_COMPTANT_VO');
