-- Historique des analyses Posos (demandes serveur des applications mobiles, point 35).
-- Trace de l'usage du service (payant) : qui, quand, sur quoi (vente, ordonnance ou saisie libre), combien de
-- produits et d'alertes, la gravite la plus haute. Ni les noms de produits ni le contexte clinique du patient ne sont
-- gardes ici.
CREATE TABLE IF NOT EXISTS t_posos_analyse (
    id VARCHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    lg_USER_ID VARCHAR(40) NULL,
    source VARCHAR(12) NOT NULL COMMENT 'VENTE, ORDONNANCE, LIBRE ou UNITAIRE',
    reference VARCHAR(60) NULL COMMENT 'Reference de la vente ou de l''ordonnance analysee',
    nb_produits INT NOT NULL,
    nb_alertes INT NOT NULL,
    gravite_max VARCHAR(60) NULL,
    mode VARCHAR(15) NOT NULL COMMENT 'POSOS ou DEMONSTRATION',
    disponible TINYINT(1) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_posos_analyse_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
