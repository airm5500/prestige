-- Retours du 07/10 : monographies DS Pharmagora (VIDAL) - posologie, composition, contre-indications, interactions...
-- Le site est interroge par le SERVEUR seulement ; chaque fiche lue est gardee en base (30 jours par defaut) : la
-- vente n'attend jamais le site, et une fiche deja lue reste consultable s'il ne repond plus.

-- Article -> produit du site (trouve une fois par le CIP)
CREATE TABLE IF NOT EXISTS t_monographie_produit (
    lg_FAMILLE_ID  VARCHAR(40) NOT NULL,
    str_CIP        VARCHAR(20) NULL,
    str_PRODUIT    VARCHAR(20) NULL,
    str_STATUT     VARCHAR(12) NOT NULL,
    dt_RECHERCHE   DATETIME    NOT NULL,
    PRIMARY KEY (lg_FAMILLE_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fiches lues (une ligne par produit et par rubrique), contenu deja analyse (JSON)
CREATE TABLE IF NOT EXISTS t_monographie (
    str_PRODUIT    VARCHAR(20) NOT NULL,
    int_RUBRIQUE   INT         NOT NULL,
    str_TITRE      VARCHAR(200) NULL,
    txt_CONTENU    MEDIUMTEXT  NOT NULL,
    dt_LECTURE     DATETIME    NOT NULL,
    PRIMARY KEY (str_PRODUIT, int_RUBRIQUE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_MONOGRAPHIE_ACTIF', '1', 'Monographies (DS Pharmagora) : 1 = consultation depuis la fiche article et les interactions, 0 = coupe', 'SYSTEME', 'enable'),
('KEY_MONOGRAPHIE_URL', 'http://46.35.22.138/diivision/', 'Monographies : adresse du service DS Pharmagora', 'SYSTEME', 'enable'),
('KEY_MONOGRAPHIE_JOURS', '30', 'Monographies : une fiche lue est gardee ce nombre de jours avant d''etre relue', 'SYSTEME', 'enable'),
('KEY_MONOGRAPHIE_DELAI_SEC', '8', 'Monographies : delai maximal d''attente du service (secondes)', 'SYSTEME', 'enable'),
('KEY_INTERACTIONS_VENTE', '0', 'Interactions : 1 = alerte sur l''ecran de vente quand deux produits interagissent, 0 = non', 'SYSTEME', 'enable');
