-- L12 (plan d'octobre, section 5) : menu « Analyse Suggestion / Commande » (GESTION DES COMMANDES).
-- Previsions par produit precalculees la nuit (et a la demande), quantite recommandee, alertes par ligne de
-- suggestion / commande, tableau de bord. Limite a la DECISION DE STOCK (Q14) : rien de clinique ici.

CREATE TABLE IF NOT EXISTS t_prevision_produit (
    lg_FAMILLE_ID      VARCHAR(40)  NOT NULL,
    lg_EMPLACEMENT_ID  VARCHAR(40)  NOT NULL,
    methode            VARCHAR(20)  NOT NULL,
    prevu_mois         DECIMAL(12,1) NOT NULL DEFAULT 0,
    ecart_type_mois    DECIMAL(12,2) NOT NULL DEFAULT 0,
    fiabilite          INT          NOT NULL DEFAULT 0,
    erreurs            VARCHAR(200) NULL,
    historique         VARCHAR(400) NULL COMMENT 'ventes des 24 derniers mois complets, du plus ancien au plus recent',
    ventes_12_mois     INT          NOT NULL DEFAULT 0,
    derniere_vente     DATETIME     NULL,
    stock              INT          NOT NULL DEFAULT 0 COMMENT 'rayon + reserve',
    en_cours           INT          NOT NULL DEFAULT 0 COMMENT 'commandes en cours ou passees, non recues',
    equivalents        INT          NOT NULL DEFAULT 0 COMMENT 'stock des equivalents DCI directs',
    delai_jours        INT          NOT NULL DEFAULT 0,
    couverture_jours   INT          NULL COMMENT 'jours de vente couverts par stock + en cours ; NULL si rien ne se vend',
    recommande         INT          NOT NULL DEFAULT 0,
    dt_CALCUL          DATETIME     NOT NULL,
    PRIMARY KEY (lg_FAMILLE_ID, lg_EMPLACEMENT_ID),
    KEY ix_prevision_emplacement (lg_EMPLACEMENT_ID, recommande)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Une ligne par calcul (nuit ou a la demande) : suivi de la fiabilite dans le temps et du dernier calcul.
CREATE TABLE IF NOT EXISTS t_prevision_calcul (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    lg_EMPLACEMENT_ID  VARCHAR(40)  NOT NULL,
    debut              DATETIME     NOT NULL,
    fin                DATETIME     NULL,
    produits           INT          NOT NULL DEFAULT 0,
    fiabilite_moyenne  INT          NULL,
    origine            VARCHAR(20)  NOT NULL DEFAULT 'NUIT',
    erreur             VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY ix_prevision_calcul (lg_EMPLACEMENT_ID, debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_PREVISION_DELAI_JOURS', '3', 'Analyse commande : delai de livraison (jours) quand le grossiste n''en a pas', 'SYSTEME', 'enable'),
('KEY_PREVISION_COUVERTURE_JOURS', '15', 'Analyse commande : couverture voulue apres livraison (jours de vente)', 'SYSTEME', 'enable'),
('KEY_PREVISION_SURSTOCK_JOURS', '90', 'Analyse commande : au-dela de cette couverture (jours), le produit est en surstock', 'SYSTEME', 'enable'),
('KEY_PREVISION_ROTATION_LENTE_JOURS', '180', 'Analyse commande : sans vente depuis ce nombre de jours, rotation lente', 'SYSTEME', 'enable'),
('KEY_PREVISION_ECART_ABERRANT', '3', 'Analyse commande : quantite aberrante si plus de N fois la recommandation (et 3 mois de ventes)', 'SYSTEME', 'enable'),
('KEY_PREVISION_PRIX_ECART', '15', 'Analyse commande : prix d''achat anormal si ecart de plus de N % avec le dernier achat', 'SYSTEME', 'enable'),
('KEY_PREVISION_ACTIF', '1', 'Analyse commande : calcul des previsions la nuit (1 = oui)', 'SYSTEME', 'enable');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_ANALYSE_COMMANDE', 'CUSTOMER', 'Analyse Suggestion / Commande (previsions, quantite recommandee)',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_ANALYSE_COMMANDE');

-- Meme population que la suggestion de reappro
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_SUGG_REAPPRO'
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_ANALYSE_COMMANDE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- et au role du compte admin
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_ANALYSE_COMMANDE'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Analyse Suggestion / Commande', NULL,
       'Previsions de ventes, quantite recommandee et alertes sur une suggestion ou une commande', 'analysecommande',
       s.lg_MENU_ID, s.int_PRIORITY, NULL, 'enable', 'P_SM_ANALYSE_COMMANDE', NOW(), NOW(), ''
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'i_sugg_manager'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'analysecommande')
 LIMIT 1;
