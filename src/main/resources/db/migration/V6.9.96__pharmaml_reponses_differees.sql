-- PharmaML (retours du 08/10) : reponse differee. DPCI repond a la commande par « FIN_SERVICE » (specification v4.8
-- § 4.1.2) : la commande est recue, la reponse (quantites livrees) sera a recuperer par une demande de VIDAGE, chaque
-- message recu etant ACQUITTE. Une ligne par envoi en attente ; la reponse est rattachee par EN_REPONSE_A = REF_MESSAGE.
CREATE TABLE IF NOT EXISTS t_pharmaml_attente (
    lg_ID            VARCHAR(40)  NOT NULL,
    lg_GROSSISTE_ID  VARCHAR(40)  NOT NULL,
    str_SOURCE       VARCHAR(10)  NOT NULL,   -- COMMANDE (t_order) ou RUPTURE (rupture)
    lg_SOURCE_ID     VARCHAR(40)  NULL,
    str_REF_MESSAGE  VARCHAR(40)  NULL,
    str_REF_CDE      VARCHAR(60)  NULL,
    str_VERSION      VARCHAR(10)  NULL,
    str_STATUT       VARCHAR(12)  NOT NULL,   -- EN_ATTENTE, TRAITEE, ERREUR, ORPHELINE
    str_DETAIL       VARCHAR(500) NULL,
    dt_ENVOI         DATETIME     NOT NULL,
    dt_REPONSE       DATETIME     NULL,
    PRIMARY KEY (lg_ID),
    KEY idx_pml_attente_statut (lg_GROSSISTE_ID, str_STATUT),
    KEY idx_pml_attente_source (lg_SOURCE_ID),
    KEY idx_pml_attente_ref (str_REF_MESSAGE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_PHARMAML_VIDAGE_AUTO', '1', 'PharmaML : 1 = recuperer automatiquement (toutes les 5 minutes) les reponses differees des grossistes, 0 = seulement a la demande', 'SYSTEME', 'enable');
