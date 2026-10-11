-- Etiquettage Pro (version web) : base bd_etiquette.

-- Utilisateurs. Au premier lancement : admin / admin (cree par l'application, mot de passe chiffre BCrypt) ;
-- l'application propose ensuite de le changer.
CREATE TABLE utilisateur (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    login           VARCHAR(40)  NOT NULL,
    mot_de_passe    VARCHAR(100) NOT NULL,
    mdp_par_defaut  TINYINT(1)   NOT NULL DEFAULT 0,
    actif           TINYINT(1)   NOT NULL DEFAULT 1,
    cree_le         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_utilisateur_login (login)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Catalogue : un produit par CIP (cle de mise a jour). Les champs connus du moteur d'etiquettes ont leur colonne ; les
-- champs ajoutes par un import (« Rayon »...) sont gardes dans champs_libres (JSON), decrits par la table champ.
CREATE TABLE produit (
    cip             VARCHAR(13)   NOT NULL,
    designation     VARCHAR(100)  NOT NULL,
    prix            BIGINT        NULL,
    ean             VARCHAR(14)   NULL,
    grossiste       VARCHAR(60)   NULL,
    lot             VARCHAR(20)   NULL,
    peremption      DATE          NULL,
    code_geo        VARCHAR(30)   NULL,
    mention         VARCHAR(60)   NULL,
    nombre          INT           NOT NULL DEFAULT 1,
    champs_libres   LONGTEXT      NULL CHECK (champs_libres IS NULL OR JSON_VALID(champs_libres)),
    cree_le         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cree_par        VARCHAR(80)   NULL,
    modifie_le      DATETIME      NULL,
    modifie_par     VARCHAR(80)   NULL,
    PRIMARY KEY (cip),
    KEY ix_produit_designation (designation),
    KEY ix_produit_peremption (peremption),
    KEY ix_produit_modifie (modifie_le)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Description des champs du catalogue (fixes et ajoutes par import) : type, longueur, obligatoire, ordre d'affichage.
CREATE TABLE champ (
    nom             VARCHAR(40)   NOT NULL,
    libelle         VARCHAR(60)   NOT NULL,
    type            VARCHAR(12)   NOT NULL,
    longueur        INT           NULL,
    obligatoire     TINYINT(1)    NOT NULL DEFAULT 0,
    systeme         TINYINT(1)    NOT NULL DEFAULT 0,
    affiche         TINYINT(1)    NOT NULL DEFAULT 1,
    ordre           INT           NOT NULL DEFAULT 100,
    PRIMARY KEY (nom)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO champ (nom, libelle, type, longueur, obligatoire, systeme, affiche, ordre) VALUES
('cip', 'CIP', 'CODE', 13, 1, 1, 1, 1),
('designation', 'Désignation', 'TEXTE', 100, 1, 1, 1, 2),
('prix', 'Prix', 'PRIX', NULL, 0, 1, 1, 3),
('lot', 'Lot', 'TEXTE', 20, 0, 1, 1, 4),
('peremption', 'Péremption', 'DATE', NULL, 0, 1, 1, 5),
('ean', 'EAN', 'CODE', 14, 0, 1, 0, 6),
('grossiste', 'Grossiste', 'TEXTE', 60, 0, 1, 0, 7),
('code_geo', 'Code géo', 'TEXTE', 30, 0, 1, 0, 8),
('mention', 'Mention libre', 'TEXTE', 60, 0, 1, 0, 9),
('nombre', 'Nombre d''étiquettes', 'ENTIER', NULL, 0, 1, 0, 10);

-- Historique des modifications d'un produit (qui, quand, d'ou, quoi : ancien -> nouveau)
CREATE TABLE historique (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    cip             VARCHAR(13)   NOT NULL,
    quand           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    qui             VARCHAR(80)   NULL,
    source          VARCHAR(80)   NOT NULL,
    detail          TEXT          NULL,
    PRIMARY KEY (id),
    KEY ix_historique_cip (cip, quand)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Correspondance memorisee par format de fichier (signature des titres de colonnes)
CREATE TABLE modele_import (
    signature       VARCHAR(64)   NOT NULL,
    titres          TEXT          NOT NULL,
    correspondance  LONGTEXT      NOT NULL CHECK (JSON_VALID(correspondance)),
    utilise_le      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (signature)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Journal des imports
CREATE TABLE journal_import (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    quand           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    qui             VARCHAR(80)   NULL,
    fichier         VARCHAR(200)  NOT NULL,
    lignes          INT           NOT NULL,
    crees           INT           NOT NULL,
    mis_a_jour      INT           NOT NULL,
    inchanges       INT           NOT NULL,
    erreurs         INT           NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Codes propres aux etiquettes 2D (jamais redonnes) et reglages de l'application
CREATE TABLE code_etiquette (
    code            VARCHAR(12)   NOT NULL,
    cip             VARCHAR(13)   NULL,
    donne_le        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE reglage (
    cle             VARCHAR(60)   NOT NULL,
    valeur          TEXT          NULL,
    PRIMARY KEY (cle)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
