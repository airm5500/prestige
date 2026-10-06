-- =====================================================================
-- Plan d'octobre, section 3 (lot L11a) : RESSOURCES HUMAINES, socle.
--
-- t_employe     : matricule unique, badge unique (facultatif), lien
--                 facultatif et unique vers un utilisateur du logiciel.
-- t_planning    : planning PAR SEMAINE (une ligne par employe et par
--                 jour) : travail, garde ou repos, debut / fin / pause.
--                 Une fin avant le debut = fin le lendemain (garde de nuit).
-- t_absence     : conges, repos, maladie... demande -> valide / refuse.
-- t_session_utilisateur : connexion / deconnexion appariees (poste, IP).
--                 Aucune cloture par inactivite (decision Q-E) : la duree
--                 de session actuelle ne change pas.
-- Menu « RESSOURCES HUMAINES » donne aux roles SYSTEM_USER, Super
-- Administrateur, Administrateur, Pharmacien et au role du compte admin ;
-- la validation des conges a son propre droit (P_RH_VALIDER_CONGE).
-- Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_employe (
    id            VARCHAR(40)  NOT NULL,
    matricule     VARCHAR(30)  NOT NULL,
    badge         VARCHAR(40)  NULL,
    nom           VARCHAR(80)  NOT NULL,
    prenoms       VARCHAR(120) NULL,
    poste         VARCHAR(80)  NULL,
    telephone     VARCHAR(30)  NULL,
    dt_entree     DATE         NULL,
    dt_sortie     DATE         NULL,
    statut        VARCHAR(10)  NOT NULL DEFAULT 'ACTIF',
    lg_USER_ID    VARCHAR(40)  NULL,
    created_at    DATETIME     NOT NULL,
    updated_at    DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_employe_matricule (matricule),
    UNIQUE KEY uk_employe_badge (badge),
    UNIQUE KEY uk_employe_user (lg_USER_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_planning (
    id            VARCHAR(40)  NOT NULL,
    employe_id    VARCHAR(40)  NOT NULL,
    jour          DATE         NOT NULL,
    type          VARCHAR(10)  NOT NULL,
    debut         TIME         NULL,
    fin           TIME         NULL,
    pause_minutes INT          NOT NULL DEFAULT 0,
    commentaire   VARCHAR(200) NULL,
    updated_at    DATETIME     NULL,
    updated_by    VARCHAR(40)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_planning_jour (employe_id, jour),
    KEY ix_planning_jour (jour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_absence (
    id            VARCHAR(40)  NOT NULL,
    employe_id    VARCHAR(40)  NOT NULL,
    type          VARCHAR(10)  NOT NULL,
    debut         DATE         NOT NULL,
    fin           DATE         NOT NULL,
    demi_journee  VARCHAR(12)  NULL,
    motif         VARCHAR(250) NULL,
    statut        VARCHAR(10)  NOT NULL DEFAULT 'DEMANDE',
    demande_par   VARCHAR(40)  NULL,
    valide_par    VARCHAR(40)  NULL,
    dt_validation DATETIME     NULL,
    created_at    DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY ix_absence_periode (debut, fin),
    KEY ix_absence_employe (employe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_session_utilisateur (
    id            VARCHAR(40)  NOT NULL,
    lg_USER_ID    VARCHAR(40)  NOT NULL,
    session_http  VARCHAR(100) NULL,
    debut         DATETIME     NOT NULL,
    fin           DATETIME     NULL,
    fin_par       VARCHAR(20)  NULL,
    poste         VARCHAR(100) NULL,
    ip            VARCHAR(60)  NULL,
    PRIMARY KEY (id),
    KEY ix_session_user (lg_USER_ID, debut),
    KEY ix_session_http (session_http),
    KEY ix_session_debut (debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RH_TOLERANCE_RETARD', '5', 'Tolerance de retard (minutes) avant de compter un retard', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RH_JOURNEE_MAX', '12', 'Duree de presence (heures) au-dela de laquelle une journee est signalee anormale', 'SYSTEME', 'enable');

INSERT IGNORE INTO t_menu (`lg_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `int_PRIORITY`, `str_Status`, `P_KEY`, `lg_MODULE_ID`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
VALUES ('20261006', 'RESSOURCES HUMAINES', NULL, 'Ressources humaines', 12, 'enable', 'P_M_RH', '1', NOW(), NULL, '');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_M_RH' nom, 'RESSOURCES HUMAINES' description
        UNION ALL SELECT 'P_SM_RH', 'RESSOURCES HUMAINES - Employes, planning, conges, connexions'
        UNION ALL SELECT 'P_RH_VALIDER_CONGE', 'RESSOURCES HUMAINES - Valider ou refuser les conges et absences') x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Ressources humaines', NULL, 'Employes, planning de la semaine, conges et absences, connexions',
       'rhmanager', '20261006', 1, NULL, 'enable', 'P_SM_RH', NOW(), NOW(), ''
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'rhmanager');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r JOIN t_privilege p ON p.str_NAME IN ('P_M_RH', 'P_SM_RH', 'P_RH_VALIDER_CONGE')
 WHERE (r.str_NAME IN ('SYSTEM_USER', 'Super Administrateur', 'Administrateur', 'Pharmacien')
        OR r.lg_ROLE_ID IN (SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'admin'))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
