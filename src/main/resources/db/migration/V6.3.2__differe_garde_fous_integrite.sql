-- ============================================================================
-- GARDE-FOUS D'INTEGRITE DES DIFFERES (defense en profondeur, cote base)
-- ============================================================================
-- Ces triggers protegent la dette differee (t_preenregistrement_compte_client)
-- quelle que soit la voie applicative (les 5 chemins d'annulation, present et
-- futur). Ils completent les controles applicatifs de la branche differe.
--
-- Regles garanties :
--   1. Un differe POSITIF ne peut jamais porter un reste NEGATIF (le trop-percu
--      est de la monnaie a rendre, pas un credit). Les avoirs (differe <= 0)
--      restent inchanges.
--   2. Quand une vente passe en ANNULEE (b_IS_CANCEL 0 -> 1), toutes ses lignes
--      de differe encore dues sont soldees (reste = 0, statut 'delete') : plus
--      de dette fantome sur vente annulee.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Regle 1 : pas de reste negatif sur un differe positif (INSERT)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pcc_reste_no_neg_ins;
DELIMITER @@
CREATE TRIGGER trg_pcc_reste_no_neg_ins
BEFORE INSERT ON t_preenregistrement_compte_client
FOR EACH ROW
BEGIN
    IF NEW.int_PRICE > 0 AND NEW.int_PRICE_RESTE < 0 THEN
        SET NEW.int_PRICE_RESTE = 0;
    END IF;
END @@
DELIMITER ;

-- ----------------------------------------------------------------------------
-- Regle 1 : pas de reste negatif sur un differe positif (UPDATE)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pcc_reste_no_neg_upd;
DELIMITER @@
CREATE TRIGGER trg_pcc_reste_no_neg_upd
BEFORE UPDATE ON t_preenregistrement_compte_client
FOR EACH ROW
BEGIN
    IF NEW.int_PRICE > 0 AND NEW.int_PRICE_RESTE < 0 THEN
        SET NEW.int_PRICE_RESTE = 0;
    END IF;
END @@
DELIMITER ;

-- ----------------------------------------------------------------------------
-- Regle 2 : l'annulation d'une vente solde ses differes (anti dette fantome)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_preenreg_cancel_clear_differe;
DELIMITER @@
CREATE TRIGGER trg_preenreg_cancel_clear_differe
AFTER UPDATE ON t_preenregistrement
FOR EACH ROW
BEGIN
    IF NEW.b_IS_CANCEL = 1 AND (OLD.b_IS_CANCEL = 0 OR OLD.b_IS_CANCEL IS NULL) THEN
        UPDATE t_preenregistrement_compte_client
        SET int_PRICE_RESTE = 0,
            str_STATUT = 'delete',
            dt_UPDATED = NOW()
        WHERE lg_PREENREGISTREMENT_ID = NEW.lg_PREENREGISTREMENT_ID
          AND int_PRICE_RESTE <> 0;
    END IF;
END @@
DELIMITER ;
