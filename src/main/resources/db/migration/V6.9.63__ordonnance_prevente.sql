-- =====================================================================
-- Ordonnances clients, retour du 30/09 : PREVENTE creee depuis une
-- ordonnance.
--
-- La prevente elle-meme est une vente ordinaire (t_preenregistrement),
-- creee par les memes services que l'ecran de vente. Cette table ne fait
-- que garder le LIEN entre l'ordonnance et les preventes qui en sont
-- nees : pour les montrer sur la fiche, et pour prevenir avant d'en
-- creer une seconde.
--
-- Pas de cle etrangere vers t_preenregistrement, volontairement : la
-- suppression ou la purge d'une prevente par la caisse ne doit jamais
-- etre bloquee par une ordonnance. Un lien vers une vente disparue se
-- lit simplement comme « prevente supprimee ».
--
-- Table nouvelle, rien n'est modifie ailleurs. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_ordonnance_client_prevente (
    lg_LIEN_ID              VARCHAR(40)  NOT NULL,
    lg_ORDONNANCE_ID        VARCHAR(40)  NOT NULL,
    lg_PREENREGISTREMENT_ID VARCHAR(40)  NOT NULL,
    str_REF                 VARCHAR(40)  NULL,
    str_TYPE_VENTE          VARCHAR(10)  NOT NULL,
    int_NB_LIGNES           INT          NOT NULL DEFAULT 0,
    lg_USER_ID              VARCHAR(40)  NULL,
    dt_CREATED              DATETIME     NOT NULL,
    PRIMARY KEY (lg_LIEN_ID),
    KEY t_ordonnance_client_prevente_ix (lg_ORDONNANCE_ID, dt_CREATED),
    KEY t_ordonnance_client_prevente_ix_vente (lg_PREENREGISTREMENT_ID),
    CONSTRAINT t_ordonnance_client_prevente_fk FOREIGN KEY (lg_ORDONNANCE_ID)
        REFERENCES t_ordonnance_client (lg_ORDONNANCE_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
