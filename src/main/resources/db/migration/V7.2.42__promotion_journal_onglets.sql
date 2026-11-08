-- Plan du 06/11/2026, point 3.5 (demande du 07/11) : tout ce qui touche aux promotions est retrace.
-- t_promotion_history devient le journal des promotions : action, utilisateur, valeurs d'avant, vente concernee.
-- Actions : CREATION, MODIFICATION PROMOTION, CLOTURE (niveau promotion, sans produit : int_CIP et lg_FAMILLE_ID
-- vides), AJOUT, MODIFICATION, RETRAIT (produit), RETRAIT VENTE ASSURANCE (promotion retiree d'une ligne quand la
-- vente passe en assurance). Les lignes d'avant gardent une action vide (« Ajout ou modification »).
-- Rejouable (IF NOT EXISTS).
ALTER TABLE t_promotion_history
    ADD COLUMN IF NOT EXISTS str_ACTION VARCHAR(30) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS lg_USER_ID VARCHAR(40) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS str_AVANT VARCHAR(500) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS str_REF_VENTE VARCHAR(40) NULL DEFAULT NULL;
CREATE INDEX IF NOT EXISTS ix_promotion_history_date ON t_promotion_history (dt_PROMOTED_DATE);

-- Point 3.4 / demande du 07/11 : l'historique devient un onglet de l'ecran Promotions (avec « Ventes en promotion »
-- et « Analyse ») ; le menu Promotions ouvre l'ecran a onglets (App.ecranReel, sans changement du menu en base).
-- L'ancien menu Historique est desactive, sauf si un role l'a sans avoir le menu Promotions (il perdrait l'acces) :
-- dans ce cas, il reste en place.
UPDATE t_sous_menu SET str_Status = 'disable', dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'promotionhistorymanager'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                    WHERE p.str_NAME = 'P_SM_PROMOTION_History'
                      AND NOT EXISTS (SELECT 1 FROM t_role_privelege d JOIN t_privilege m ON m.lg_PRIVELEGE_ID = d.lg_PRIVILEGE_ID
                                       WHERE d.lg_ROLE_ID = rp.lg_ROLE_ID AND m.str_NAME = 'P_SM_PROMOTIONS'));
