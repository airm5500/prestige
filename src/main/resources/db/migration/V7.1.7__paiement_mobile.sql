-- B3 (Prestige Mobile) : paiements mobile money par agrégateur (CinetPay, Wave Business, simulateur).
-- Une ligne par demande de paiement ; montant fixé par le serveur ; client_ref unique = création idempotente
-- (en-tête X-Client-Ref). Statuts : en_attente, paye, echoue, expire, annule, paye_apres_annulation (à régulariser).
-- Script rejouable (CREATE TABLE IF NOT EXISTS) ; aucune table existante n'est modifiée. Aucune clé secrète en base.
CREATE TABLE IF NOT EXISTS paiement_mobile (
    id               VARCHAR(40)  NOT NULL,
    client_ref       VARCHAR(64)  NULL,
    vente_id         VARCHAR(40)  NOT NULL,
    reference_vente  VARCHAR(40)  NULL,
    montant          INT          NOT NULL,
    devise           VARCHAR(3)   NOT NULL DEFAULT 'XOF',
    operateur        VARCHAR(10)  NOT NULL,
    type_reglement   VARCHAR(10)  NOT NULL,
    fournisseur      VARCHAR(20)  NOT NULL,
    statut           VARCHAR(30)  NOT NULL,
    ref_fournisseur  VARCHAR(100) NULL,
    lien             TEXT         NULL,
    cloture_auto     TINYINT(1)   NOT NULL DEFAULT 0,
    cloture          TINYINT(1)   NOT NULL DEFAULT 0,
    message          VARCHAR(255) NULL,
    user_id          VARCHAR(40)  NULL,
    created_at       DATETIME     NOT NULL,
    updated_at       DATETIME     NOT NULL,
    expire_at        DATETIME     NULL,
    paye_at          DATETIME     NULL,
    verifie_at       DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_paiement_mobile_client_ref (client_ref),
    KEY idx_paiement_mobile_vente (vente_id),
    KEY idx_paiement_mobile_statut (statut, expire_at),
    KEY idx_paiement_mobile_date (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;
