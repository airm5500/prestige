-- =====================================================================
-- Evolution 6, point 2 : GESTION DES ORDONNANCES CLIENTS (vague 1).
--
-- « Ajouter un menu Gestion Ordonnances clients permettant d'enregistrer
--   et de consulter les ordonnances de chaque client au fil du temps. »
--
-- Ce que ces tables sont, et ce qu'elles ne sont pas
-- ---------------------------------------------------------------------
-- Une ordonnance enregistree ici est un DOCUMENT rattache au dossier du
-- client. Elle ne cree aucune vente, ne bouge aucune unite de stock et
-- n'entre pas dans l'ordonnancier reglementaire : ces trois chaines
-- restent exactement ce qu'elles etaient. Le menu est un satellite.
--
-- C'est pour cela que RIEN n'est ajoute aux tables existantes : ni
-- t_client, ni t_medecin, ni t_preenregistrement, ni t_famille. Trois
-- tables neuves, qui ne peuvent rien casser de ce qui tourne.
--
-- Les pieces jointes (vague 2) ont leur table des maintenant : le schema
-- se pose une fois, et la migration de la vague 2 n'aura pas a revenir
-- sur des donnees deja saisies.
--
-- Rejouable : CREATE TABLE IF NOT EXISTS, privileges crees par leur NOM,
-- attributions gardees par NOT EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- L'ordonnance : l'en-tete du document.
--
-- str_NUMERO est le numero lisible (ORD-AAAAMM-0001) : c'est ce que
-- l'officine dit au telephone et ce qui s'imprime en tete de fiche. Un
-- identifiant technique de 40 caracteres ne se lit pas a voix haute.
--
-- lg_MEDECIN_ID est NULLABLE et str_ETABLISSEMENT est un texte : le
-- besoin dit « le prescripteur et l'etablissement de sante, SI
-- DISPONIBLES ». Une ordonnance dont on n'a pas su lire le tampon doit
-- pouvoir etre enregistree quand meme - sinon elle ne sera pas saisie du
-- tout, et c'est l'inverse du but.
--
-- str_STATUT vaut 'enable' ou 'annulee'. Il n'y a PAS de suppression :
-- une ordonnance fausse s'annule avec son motif et reste visible dans
-- l'historique. Un document de sante qui disparait sans trace, c'est une
-- tracabilite qui ne vaut rien.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `t_ordonnance_client` (
    `lg_ORDONNANCE_ID` VARCHAR(40) NOT NULL,
    `str_NUMERO` VARCHAR(30) NOT NULL,
    `lg_CLIENT_ID` VARCHAR(40) NOT NULL,
    `dt_ORDONNANCE` DATE NOT NULL,
    `lg_MEDECIN_ID` VARCHAR(40) NULL DEFAULT NULL,
    `str_ETABLISSEMENT` VARCHAR(100) NULL DEFAULT NULL,
    `str_OBSERVATIONS` TEXT NULL DEFAULT NULL,
    `str_STATUT` VARCHAR(20) NOT NULL DEFAULT 'enable',
    `str_MOTIF_ANNULATION` VARCHAR(200) NULL DEFAULT NULL,
    `lg_USER_CREATED` VARCHAR(40) NULL DEFAULT NULL,
    `dt_CREATED` DATETIME NOT NULL,
    `lg_USER_UPDATED` VARCHAR(40) NULL DEFAULT NULL,
    `dt_UPDATED` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`lg_ORDONNANCE_ID`),
    UNIQUE KEY `t_ordonnance_client_numero_un` (`str_NUMERO`),
    -- L'historique se lit « du plus recent au plus ancien », par client :
    -- c'est exactement cet index qui sert a chaque ouverture de fiche.
    KEY `t_ordonnance_client_ix_client` (`lg_CLIENT_ID`, `dt_ORDONNANCE`),
    KEY `t_ordonnance_client_ix_date` (`dt_ORDONNANCE`),
    KEY `t_ordonnance_client_ix_medecin` (`lg_MEDECIN_ID`),
    CONSTRAINT `t_ordonnance_client_fk_client` FOREIGN KEY (`lg_CLIENT_ID`)
        REFERENCES `t_client` (`lg_CLIENT_ID`),
    CONSTRAINT `t_ordonnance_client_fk_medecin` FOREIGN KEY (`lg_MEDECIN_ID`)
        REFERENCES `t_medecin` (`lg_MEDECIN_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ---------------------------------------------------------------------
-- Les produits prescrits.
--
-- lg_FAMILLE_ID est NULLABLE et str_LIBELLE est TOUJOURS rempli : le
-- produit vient du referentiel quand il y est, et se saisit librement
-- sinon. Une ordonnance reflete ce que le medecin a ecrit, pas ce que
-- l'officine tient en stock ; refuser un produit non reference
-- reviendrait a fausser le document.
--
-- Meme quand l'article est reference, on RECOPIE son libelle ici : le
-- referentiel evolue (renommage, retrait), le document ne doit pas
-- changer de sens des annees apres sa saisie.
--
-- Posologie et duree sont des textes : « 1 cp matin et soir », « 7
-- jours ». Toute tentative de les structurer se heurterait a la
-- premiere ordonnance manuscrite.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `t_ordonnance_client_detail` (
    `lg_DETAIL_ID` VARCHAR(40) NOT NULL,
    `lg_ORDONNANCE_ID` VARCHAR(40) NOT NULL,
    `lg_FAMILLE_ID` VARCHAR(40) NULL DEFAULT NULL,
    `str_LIBELLE` VARCHAR(150) NOT NULL,
    `int_QUANTITE` INT(11) NOT NULL DEFAULT 1,
    `str_POSOLOGIE` VARCHAR(150) NULL DEFAULT NULL,
    `str_DUREE` VARCHAR(50) NULL DEFAULT NULL,
    `int_ORDRE` INT(11) NOT NULL DEFAULT 1,
    PRIMARY KEY (`lg_DETAIL_ID`),
    KEY `t_ordonnance_client_detail_ix` (`lg_ORDONNANCE_ID`, `int_ORDRE`),
    KEY `t_ordonnance_client_detail_ix_art` (`lg_FAMILLE_ID`),
    CONSTRAINT `t_ordonnance_client_detail_fk` FOREIGN KEY (`lg_ORDONNANCE_ID`)
        REFERENCES `t_ordonnance_client` (`lg_ORDONNANCE_ID`) ON DELETE CASCADE,
    CONSTRAINT `t_ordonnance_client_detail_fk_art` FOREIGN KEY (`lg_FAMILLE_ID`)
        REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ---------------------------------------------------------------------
-- Les pieces justificatives (posee maintenant, servie en vague 2).
--
-- Seul le CHEMIN est en base, jamais le binaire : des scans dans
-- MariaDB, c'est une sauvegarde qui triple de volume et une base qui
-- ralentit pour tout le monde. Les fichiers vont sous la racine de
-- stockage que le logiciel utilise deja (util.StockageDisque).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `t_ordonnance_client_piece` (
    `lg_PIECE_ID` VARCHAR(40) NOT NULL,
    `lg_ORDONNANCE_ID` VARCHAR(40) NOT NULL,
    `str_NOM_ORIGINE` VARCHAR(150) NOT NULL,
    `str_TYPE_MIME` VARCHAR(100) NULL DEFAULT NULL,
    `int_TAILLE` BIGINT(20) NOT NULL DEFAULT 0,
    `str_CHEMIN` VARCHAR(255) NOT NULL,
    `lg_USER_ID` VARCHAR(40) NULL DEFAULT NULL,
    `dt_CREATED` DATETIME NOT NULL,
    PRIMARY KEY (`lg_PIECE_ID`),
    KEY `t_ordonnance_client_piece_ix` (`lg_ORDONNANCE_ID`),
    CONSTRAINT `t_ordonnance_client_piece_fk` FOREIGN KEY (`lg_ORDONNANCE_ID`)
        REFERENCES `t_ordonnance_client` (`lg_ORDONNANCE_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- =====================================================================
-- Privileges : « reserver la consultation et la modification des
-- ordonnances aux utilisateurs autorises ».
--
-- Deux privileges, pas un : consulter une ordonnance et la corriger ne
-- sont pas le meme geste. Une preparatrice peut avoir besoin de relire
-- une posologie sans pouvoir recrire le document.
--
-- Crees PAR LEUR NOM avec un identifiant tire au sort : un identifiant
-- ecrit en dur suivi d'un INSERT IGNORE s'est deja fait silencieusement
-- sauter sur ce projet (l'identifiant etait pris), la migration se
-- declarant reussie alors que le privilege n'existait pas.
-- =====================================================================
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), n.nom, 'CUSTOMER', n.libelle, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_ORDONNANCE_CLIENT' AS nom,
               'SERVICE CLIENT - Consulter les ordonnances clients' AS libelle
        UNION ALL SELECT 'P_ORDONNANCE_CLIENT_MAJ',
               'SERVICE CLIENT - Saisir et modifier les ordonnances clients') n
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = n.nom);

-- ---------------------------------------------------------------------
-- A qui les attribuer au depart ?
--
-- L'ecran est neuf : personne ne perd rien quel que soit le choix. On
-- suit donc l'usage, en les donnant a ceux qui tiennent deja
-- l'ordonnancier (P_SM_ORDONNANCIER) - ce sont les memes personnes qui
-- manipulent les ordonnances au comptoir. L'officine resserre ensuite
-- role par role depuis l'ecran des roles.
-- ---------------------------------------------------------------------
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_ORDONNANCIER'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_ORDONNANCE_CLIENT'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_ORDONNANCIER'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_ORDONNANCE_CLIENT_MAJ'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Et TOUJOURS au role du compte administrateur, sans condition.
--
-- Mesure au banc : suivre le seul P_SM_ORDONNANCIER laissait le compte
-- administrateur SANS le menu qu'il vient d'installer - le privilege
-- etant detenu par un autre role que le sien - et donc sans moyen de le
-- distribuer a qui que ce soit. Le meme piege avait deja ete rencontre
-- le 17/09 sur les onglets des depots : un privilege attribue d'apres un
-- modele que l'administrateur ne detient pas n'est pas attribue du tout.
--
-- Livrer un ecran que personne ne peut ouvrir, pas meme pour le confier
-- a d'autres, ce n'est pas une restriction : c'est une livraison morte.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME IN ('P_ORDONNANCE_CLIENT', 'P_ORDONNANCE_CLIENT_MAJ')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- =====================================================================
-- Le menu, dans SERVICE CLIENT (id 9) : c'est la que vivent deja
-- l'Ordonnancier et l'Analyse Posologie, donc la qu'on ira le chercher.
--
-- Libelle court (regle de l'officine : 25 caracteres au plus pour le
-- libelle, 30 pour la description) : les menus longs sont tronques dans
-- l'arbre de navigation.
-- =====================================================================
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Ordonnances clients', NULL, 'Ordonnances des clients',
       'ordonnanceclient', '9', 9, NULL, 'enable', 'P_ORDONNANCE_CLIENT', NOW(), NOW(), ''
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'ordonnanceclient');
