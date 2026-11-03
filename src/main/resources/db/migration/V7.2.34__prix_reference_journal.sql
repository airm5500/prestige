-- Cas 2 du 03/11/2026 : prix et taux de reference par tiers-payant saisis a la caisse (decisions Q2.1 a Q2.6).
-- 1. Journal des prix de reference (Q2.6) : qui, quand, ancienne et nouvelle valeur, vente d'origine quand la saisie
--    vient de la caisse. Alimente par la fiche article ET par la caisse. Aucune donnee de patient.
-- 2. Parametre KEY_PRIX_REF_CAISSE, a 0 : les colonnes P.REF | TAUX ne sont pas creees dans la grille de vente et les
--    services de saisie a la caisse repondent 403. Rejouable (IF NOT EXISTS, insertion conditionnelle).
CREATE TABLE IF NOT EXISTS prix_reference_journal (
    id                VARCHAR(40)  NOT NULL,
    prix_reference_id VARCHAR(70)  NULL,
    produit_id        VARCHAR(70)  NOT NULL,
    tiers_payant_id   VARCHAR(70)  NOT NULL,
    action            VARCHAR(15)  NOT NULL COMMENT 'AJOUT, MODIFICATION ou SUPPRESSION',
    ancienne_valeur   INT          NULL,
    nouvelle_valeur   INT          NULL,
    ancien_taux       FLOAT        NULL,
    nouveau_taux      FLOAT        NULL,
    ancien_type       VARCHAR(20)  NULL,
    nouveau_type      VARCHAR(20)  NULL,
    utilisateur_id    VARCHAR(40)  NULL,
    utilisateur       VARCHAR(120) NULL,
    date_action       DATETIME     NOT NULL,
    vente_id          VARCHAR(40)  NULL COMMENT 'vente d''origine quand la saisie vient de la caisse',
    poste             VARCHAR(80)  NULL,
    PRIMARY KEY (id),
    KEY ix_prj_produit (produit_id, date_action)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_PRIX_REF_CAISSE', '0',
       'Vente assurance : prix et taux de reference saisissables dans la grille (colonnes par tiers-payant, ecriture dans la fiche article) ; 0 = grille inchangee',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_PRIX_REF_CAISSE');
