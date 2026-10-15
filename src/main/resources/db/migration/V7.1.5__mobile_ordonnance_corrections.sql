-- O4 (Prestige Mobile) : apprentissage par correction des ordonnances, partage entre terminaux.
-- Une ligne par validation du pharmacien : « segment medicament lu → produit » (segment filtre par le telephone :
-- nom, dosage, forme du medicament seulement ; jamais le texte lu complet ni donnee patient).
-- La cle primaire sur cle (generee par le telephone) rend l'envoi idempotent (INSERT IGNORE).
-- Script rejouable (CREATE TABLE IF NOT EXISTS) ; aucune table existante n'est modifiee.
CREATE TABLE IF NOT EXISTS mobile_ordonnance_correction (
    cle           VARCHAR(64)  NOT NULL,
    segment       VARCHAR(60)  NOT NULL,
    lg_FAMILLE_ID VARCHAR(40)  NOT NULL,
    cip           VARCHAR(20)  NULL,
    nom           VARCHAR(100) NULL,
    lg_USER_ID    VARCHAR(40)  NULL,
    valide_le     DATETIME     NULL,
    recu_le       DATETIME     NOT NULL,
    PRIMARY KEY (cle),
    KEY idx_mobile_ordo_corr_recu (recu_le, cle),
    KEY idx_mobile_ordo_corr_segment (segment)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;
