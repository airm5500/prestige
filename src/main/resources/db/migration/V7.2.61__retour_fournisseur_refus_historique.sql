-- =====================================================================
-- Transmission du 07/11 : RETOURS FOURNISSEURS EN ATTENTE — refus, correction, remise en attente, abandon.
-- Statuts de t_retour_fournisseur.str_STATUT : is_Process (saisie), is_Waiting (en attente de validation),
-- is_Refused (refuse par un valideur, a corriger par son auteur), is_Abandoned (refus clos sans suite),
-- enable (valide). Aucun de ces changements d'etat ne touche le stock : seule la validation (enable) sort du stock.
-- Idempotente.
-- =====================================================================

-- Dernier refus (efface a la remise en attente ; l'historique le garde)
ALTER TABLE t_retour_fournisseur
    ADD COLUMN IF NOT EXISTS str_MOTIF_REFUS VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS dt_REFUS DATETIME NULL,
    ADD COLUMN IF NOT EXISTS lg_USER_REFUS VARCHAR(40) NULL;

-- Historique : qui, quand, action, motif (MISE_EN_ATTENTE, REFUS, REMISE_EN_ATTENTE, ABANDON, VALIDATION)
CREATE TABLE IF NOT EXISTS t_retour_fournisseur_historique (
    id                VARCHAR(40)  NOT NULL,
    lg_RETOUR_FRS_ID  VARCHAR(40)  NOT NULL,
    action            VARCHAR(30)  NOT NULL,
    motif             VARCHAR(500) NULL,
    lg_USER_ID        VARCHAR(40)  NULL,
    dt_ACTION         DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_retour_frs_historique (lg_RETOUR_FRS_ID, dt_ACTION)
) ENGINE = InnoDB DEFAULT CHARSET = utf8 COLLATE = utf8_general_ci; -- meme collation que t_retour_fournisseur

-- Compteur du valideur (GET v1/retourfournisseur/en-attente/nombre)
CREATE INDEX IF NOT EXISTS idx_retour_frs_statut ON t_retour_fournisseur (str_STATUT);
