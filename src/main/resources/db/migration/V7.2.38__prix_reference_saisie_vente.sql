-- Plan du 06/11/2026, point 5.1 : un prix ou un taux de reference saisi a la caisse reste sur la VENTE jusqu'a sa
-- cloture. Le calcul de la vente et la grille le lisent aussitot ; la fiche article (prix_reference) et le journal ne
-- sont ecrits qu'a la cloture. Une vente abandonnee ne touche plus la fiche. Une ligne retiree de la vente emporte ses
-- saisies (cle etrangere en cascade). Rejouable (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS prix_reference_saisie (
    id               VARCHAR(40) NOT NULL,
    vente_id         VARCHAR(40) NOT NULL,
    detail_id        VARCHAR(40) NOT NULL,
    produit_id       VARCHAR(70) NOT NULL,
    tiers_payant_id  VARCHAR(70) NOT NULL,
    type_prix        VARCHAR(20) NOT NULL,
    valeur           INT         NOT NULL,
    valeur_taux      FLOAT       NULL,
    utilisateur_id   VARCHAR(40) NULL,
    date_saisie      DATETIME    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_prs_ligne_tp (detail_id, tiers_payant_id),
    KEY ix_prs_vente (vente_id),
    CONSTRAINT fk_prs_detail FOREIGN KEY (detail_id) REFERENCES t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID)
        ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb3 COLLATE = utf8mb3_general_ci;
