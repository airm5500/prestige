-- Plan du 08/11, point 18 : motif obligatoire sur l'annulation et la modification d'une vente (pas la modification des
-- informations client ou tiers payant).
--  * t_motif_vente_annulation : liste des motifs, modifiable sans toucher au code ; « Autre » demande un texte.
--  * vente_motif : un motif par annulation ou modification. L'auteur de la vente d'origine (vendeur et caissier) y est
--    garde tel qu'il etait avant l'annulation (l'annulation remplace lg_USER_ID de la vente par l'annulateur), pour
--    les statistiques par auteur ; l'annulateur ou le modificateur est garde a part.
--    Modification : EN_COURS a l'ouverture de la copie, VALIDEE a sa cloture, retiree si la copie est abandonnee.
-- Rejouable.
CREATE TABLE IF NOT EXISTS t_motif_vente_annulation (
    id          varchar(40)  NOT NULL,
    libelle     varchar(100) NOT NULL,
    priorite    int(11)      NOT NULL DEFAULT 0,
    texte_libre tinyint(1)   NOT NULL DEFAULT 0,
    statut      varchar(20)  NOT NULL DEFAULT 'enable',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT IGNORE INTO t_motif_vente_annulation (id, libelle, priorite, texte_libre, statut) VALUES
  ('MVA_SAISIE',    'Erreur de saisie',      1, 0, 'enable'),
  ('MVA_PRODUIT',   'Confusion de produit',  2, 0, 'enable'),
  ('MVA_CLIENT',    'Erreur client',         3, 0, 'enable'),
  ('MVA_AUTRE',     'Autre',                 9, 1, 'enable');

CREATE TABLE IF NOT EXISTS vente_motif (
    id               varchar(40)  NOT NULL,
    type_operation   varchar(20)  NOT NULL,
    statut           varchar(20)  NOT NULL,
    vente_id         varchar(40)  NOT NULL,
    vente_ref        varchar(40)  DEFAULT NULL,
    nouvelle_vente_id varchar(40) DEFAULT NULL,
    motif_id         varchar(40)  NOT NULL,
    motif_libelle    varchar(100) NOT NULL,
    commentaire      varchar(255) DEFAULT NULL,
    montant          int(11)      NOT NULL DEFAULT 0,
    vendeur_id       varchar(40)  DEFAULT NULL,
    caissier_id      varchar(40)  DEFAULT NULL,
    operateur_id     varchar(40)  NOT NULL,
    date_vente       datetime     DEFAULT NULL,
    created_at       datetime     NOT NULL,
    updated_at       datetime     DEFAULT NULL,
    PRIMARY KEY (id),
    KEY ix_vente_motif_vente (vente_id, type_operation, statut),
    KEY ix_vente_motif_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
