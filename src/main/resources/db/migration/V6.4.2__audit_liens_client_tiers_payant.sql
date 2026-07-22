-- ============================================================================
-- PISTE D'AUDIT DES LIENS CLIENT <-> TIERS-PAYANT (attrape-processus)
-- ============================================================================
-- Contexte : des clients d'une assurance se retrouvent rattaches a une autre
-- (RO bascule, lien assurance desactive, carnet devenu RO) sans que l'on
-- sache quel ecran / quelle action l'a produit.
--
-- Cette migration cree une table d'audit + des triggers qui journalisent
-- CHAQUE creation et CHAQUE changement significatif d'un lien
-- t_compte_client_tiers_payant (statut, RO, priorite, tiers-payant, compte).
-- Quel que soit le chemin applicatif (modification de vente, modification du
-- tiers-payant, "modifier infos client", creation de carnet, ou un chemin non
-- identifie), la bascule sera datee et tracee ici, a correler avec les logs
-- serveur [TRACE_ASSURANCE] (qui donnent la pile d'appel Java).
--
-- Lecture type :
--   SELECT * FROM t_cctp_audit
--   WHERE lg_COMPTE_CLIENT_ID = '<compte du client>'
--   ORDER BY dt_EVENT;
-- ============================================================================

CREATE TABLE IF NOT EXISTS t_cctp_audit (
    id BIGINT NOT NULL AUTO_INCREMENT,
    dt_EVENT DATETIME NOT NULL,
    str_ACTION VARCHAR(10) NOT NULL,                      -- INSERT / UPDATE
    lg_COMPTE_CLIENT_TIERS_PAYANT_ID VARCHAR(255) NOT NULL,
    lg_COMPTE_CLIENT_ID VARCHAR(255) NULL,
    old_TIERS_PAYANT_ID VARCHAR(255) NULL,
    new_TIERS_PAYANT_ID VARCHAR(255) NULL,
    old_STATUT VARCHAR(50) NULL,
    new_STATUT VARCHAR(50) NULL,
    old_IS_RO TINYINT NULL,
    new_IS_RO TINYINT NULL,
    old_PRIORITY INT NULL,
    new_PRIORITY INT NULL,
    str_DB_USER VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY idx_cctp_audit_compte (lg_COMPTE_CLIENT_ID),
    KEY idx_cctp_audit_lien (lg_COMPTE_CLIENT_TIERS_PAYANT_ID),
    KEY idx_cctp_audit_date (dt_EVENT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------------------------------------------------------
-- Journalise toute creation de lien
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_cctp_audit_ins;
DELIMITER @@
CREATE TRIGGER trg_cctp_audit_ins
AFTER INSERT ON t_compte_client_tiers_payant
FOR EACH ROW
BEGIN
    INSERT INTO t_cctp_audit (dt_EVENT, str_ACTION, lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
        lg_COMPTE_CLIENT_ID, old_TIERS_PAYANT_ID, new_TIERS_PAYANT_ID,
        old_STATUT, new_STATUT, old_IS_RO, new_IS_RO, old_PRIORITY, new_PRIORITY, str_DB_USER)
    VALUES (NOW(), 'INSERT', NEW.lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
        NEW.lg_COMPTE_CLIENT_ID, NULL, NEW.lg_TIERS_PAYANT_ID,
        NULL, NEW.str_STATUT, NULL, NEW.b_IS_RO, NULL, NEW.int_PRIORITY, CURRENT_USER());
END @@
DELIMITER ;

-- ----------------------------------------------------------------------------
-- Journalise tout changement significatif (statut, RO, priorite, tiers-payant,
-- compte). Les updates sans changement de ces colonnes ne sont pas journalises
-- pour ne pas gonfler la table.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_cctp_audit_upd;
DELIMITER @@
CREATE TRIGGER trg_cctp_audit_upd
AFTER UPDATE ON t_compte_client_tiers_payant
FOR EACH ROW
BEGIN
    IF NOT (OLD.str_STATUT <=> NEW.str_STATUT)
       OR NOT (OLD.b_IS_RO <=> NEW.b_IS_RO)
       OR NOT (OLD.int_PRIORITY <=> NEW.int_PRIORITY)
       OR NOT (OLD.lg_TIERS_PAYANT_ID <=> NEW.lg_TIERS_PAYANT_ID)
       OR NOT (OLD.lg_COMPTE_CLIENT_ID <=> NEW.lg_COMPTE_CLIENT_ID) THEN
        INSERT INTO t_cctp_audit (dt_EVENT, str_ACTION, lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
            lg_COMPTE_CLIENT_ID, old_TIERS_PAYANT_ID, new_TIERS_PAYANT_ID,
            old_STATUT, new_STATUT, old_IS_RO, new_IS_RO, old_PRIORITY, new_PRIORITY, str_DB_USER)
        VALUES (NOW(), 'UPDATE', NEW.lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
            NEW.lg_COMPTE_CLIENT_ID, OLD.lg_TIERS_PAYANT_ID, NEW.lg_TIERS_PAYANT_ID,
            OLD.str_STATUT, NEW.str_STATUT, OLD.b_IS_RO, NEW.b_IS_RO,
            OLD.int_PRIORITY, NEW.int_PRIORITY, CURRENT_USER());
    END IF;
END @@
DELIMITER ;
