-- =====================================================================
-- Reception BL et retour fournisseur mobiles (prestige_vente_app, docs/ETAPE_D_SERVEUR_RECEPTION_RETOUR.md,
-- D10 a D16 et D18). Routes nouvelles sous la session habituelle (decision du pharmacien), aucune route existante
-- ne change de comportement.
-- =====================================================================

-- D10 : parametres servis au mobile
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RECEPTION_MOIS_PEREMPTION_COURTE', '6',
        'Reception mobile : en dessous de ce nombre de mois, une peremption est dite courte', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RECEPTION_MOTIF_PEREMPTION_COURTE', '1',
        'Reception mobile : motif obligatoire pour accepter un lot en peremption courte (1 = oui)', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RECEPTION_SCANS_REPETES', '1',
        'Reception mobile : un scan repete du meme lot ajoute une boite (1 = oui)', 'SYSTEME', 'enable');

-- Droits des fonctions nouvelles (D11, D12), donnes aux profils pharmacien et administrateur
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.libelle, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_BL_MOBILE_CORRIGER' AS nom,
               'RECEPTION MOBILE - Effacer un lot, corriger la saisie d''un autre utilisateur' AS libelle
        UNION ALL SELECT 'P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE',
               'RECEPTION MOBILE - Accepter un lot en peremption courte') x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME IN ('P_BL_MOBILE_CORRIGER', 'P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE')
 WHERE r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME IN ('P_BL_MOBILE_CORRIGER', 'P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- D12 : journal des peremptions courtes acceptees ou refusees
CREATE TABLE IF NOT EXISTS t_reception_peremption_courte (
    id VARCHAR(40) NOT NULL,
    lg_BON_LIVRAISON_ID VARCHAR(40) NOT NULL,
    lg_BON_LIVRAISON_DETAIL VARCHAR(40) NULL,
    lg_LOT_ID VARCHAR(40) NULL,
    num_lot VARCHAR(40) NULL,
    lg_FAMILLE_ID VARCHAR(40) NOT NULL,
    lg_GROSSISTE_ID VARCHAR(40) NULL,
    dt_peremption DATE NOT NULL,
    jours_restants INT NOT NULL,
    quantite INT NOT NULL,
    valeur BIGINT NOT NULL COMMENT 'PAF x quantite',
    decision VARCHAR(10) NOT NULL COMMENT 'ACCEPTE ou REFUSE',
    motif VARCHAR(250) NULL,
    statut VARCHAR(15) NOT NULL DEFAULT 'A_TRAITER' COMMENT 'A_TRAITER, RECLAME, AVOIR_RECU',
    lg_USER_ID VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY ix_rpc_date (created_at),
    KEY ix_rpc_bl (lg_BON_LIVRAISON_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- D13 : anomalies de reception
CREATE TABLE IF NOT EXISTS t_reception_anomalie (
    id VARCHAR(40) NOT NULL,
    lg_BON_LIVRAISON_ID VARCHAR(40) NOT NULL,
    lg_FAMILLE_ID VARCHAR(40) NULL,
    code_scanne VARCHAR(120) NULL COMMENT 'Code lu quand le produit est inconnu',
    type VARCHAR(40) NOT NULL,
    quantite INT NULL,
    commentaire VARCHAR(250) NULL,
    statut VARCHAR(15) NOT NULL DEFAULT 'OUVERTE',
    lg_USER_ID VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY ix_anomalie_bl (lg_BON_LIVRAISON_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- D14 : lot retourne
ALTER TABLE t_retour_fournisseur_detail
    ADD COLUMN IF NOT EXISTS num_lot VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS lg_LOT_ID VARCHAR(40) NULL;

-- D16 : presence sur un BL et verrou temporaire (ligne + lot)
CREATE TABLE IF NOT EXISTS t_reception_session (
    lg_BON_LIVRAISON_ID VARCHAR(40) NOT NULL,
    lg_USER_ID VARCHAR(40) NOT NULL,
    appareil VARCHAR(80) NOT NULL DEFAULT '',
    lg_BON_LIVRAISON_DETAIL VARCHAR(40) NULL,
    num_lot VARCHAR(40) NULL,
    depuis DATETIME NOT NULL,
    dernier_signal DATETIME NOT NULL,
    PRIMARY KEY (lg_BON_LIVRAISON_ID, lg_USER_ID, appareil),
    KEY ix_session_signal (dernier_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- D18 : numero de serie DataMatrix (AI 21) deja consomme
CREATE TABLE IF NOT EXISTS t_serie_consommee (
    gtin VARCHAR(20) NOT NULL,
    serie VARCHAR(40) NOT NULL,
    lg_BON_LIVRAISON_DETAIL VARCHAR(40) NULL,
    lg_USER_ID VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (gtin, serie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
