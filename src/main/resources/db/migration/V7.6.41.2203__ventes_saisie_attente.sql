-- Cahier des charges du 24/11, point 2 : mise en attente des ventes (vente et vente en dépôt).
--
-- 1. t_preenregistrement : état de la saisie, distinct du statut historique (str_STATUT reste is_Process tant que la
--    vente n'est ni clôturée ni abandonnée) : EN_COURS, EN_ATTENTE, INTERROMPUE, ABANDONNEE, CLOTUREE ; poste et
--    session qui tiennent la saisie, dernier signal de l'écran, cause d'une interruption ; marque « avant la mise à
--    jour » pour les ventes déjà en attente.
-- 2. vente_journal_saisie : journal de preuve. Chaque geste (mise en attente, Retour et choix fait, reprise,
--    interruption, abandon, refus d'un droit) avec utilisateur, poste, heure, numéro de vente, nombre de lignes,
--    montant. Chaque ligne porte l'empreinte de la précédente : une ligne retouchée ou retirée en base se voit.
--    L'application n'y fait jamais de modification ni de suppression.
-- 3. Quatre droits : mettre en attente et reprendre une vente en attente (donnés au départ à ceux qui ont l'écran de
--    vente ou de vente en dépôt : rien ne change pour eux), voir les ventes en cours de saisie et reprendre la saisie
--    interrompue d'un autre utilisateur (profils administrateur, super administrateur, pharmacien et compte admin).
-- 4. Deux sous-menus dans SERVICE CLIENT : « Ventes en cours de saisie et saisies interrompues » et « Journal des
--    ventes en saisie » (déclarés aussi dans correctifs-affichage.js).
-- 5. Mise à jour : les ventes du jour déjà « en attente » (ancien statut, au moins une ligne) restent en attente,
--    marquées « avant la mise à jour ».
--
-- Rejouable.

-- NE PAS SCINDER l'ALTER ci-dessous : t_preenregistrement est en ROW_FORMAT=COMPACT et frôle la taille de ligne
-- maximale d'InnoDB. Les colonnes ajoutées seules (ajout « instantané ») sont refusées (« Row size too large ») sur une
-- base d'officine réelle ; avec l'index dans la même instruction, la table est reconstruite et l'ajout passe. Essai du
-- 24/11 sur la copie d'officine appaul (2,1 millions de ventes) : 81 à 108 s au démarrage du serveur
-- (src/test/e2e/securite/test-migration-saisie-officine-2411.js).
SET @a := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement' AND COLUMN_NAME = 'etat_saisie');
SET @s := IF(@a = 0, 'ALTER TABLE t_preenregistrement
    ADD COLUMN etat_saisie VARCHAR(20) NULL,
    ADD COLUMN saisie_poste VARCHAR(100) NULL,
    ADD COLUMN saisie_session VARCHAR(64) NULL,
    ADD COLUMN saisie_signal DATETIME(3) NULL,
    ADD COLUMN saisie_interruption VARCHAR(40) NULL,
    ADD COLUMN saisie_avant_maj TINYINT NOT NULL DEFAULT 0,
    ADD KEY idx_preenregistrement_etat_saisie (etat_saisie, dt_UPDATED)', 'SELECT 1');
PREPARE q FROM @s;
EXECUTE q;
DEALLOCATE PREPARE q;

CREATE TABLE IF NOT EXISTS vente_journal_saisie (
    id BIGINT NOT NULL AUTO_INCREMENT,
    cree_le DATETIME(3) NOT NULL,
    vente_id VARCHAR(40) NOT NULL,
    numero VARCHAR(40) NULL,
    depot TINYINT NOT NULL DEFAULT 0,
    geste VARCHAR(40) NOT NULL,
    etat_avant VARCHAR(20) NULL,
    etat_apres VARCHAR(20) NULL,
    admis TINYINT NOT NULL,
    motif VARCHAR(255) NULL,
    cause VARCHAR(60) NULL,
    utilisateur_id VARCHAR(40) NULL,
    poste VARCHAR(100) NULL,
    nb_lignes INT NULL,
    montant INT NULL,
    empreinte_precedente CHAR(64) NOT NULL,
    empreinte CHAR(64) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_vente_journal_saisie_vente (vente_id),
    KEY idx_vente_journal_saisie_date (cree_le)
);

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), n.nom, 'CUSTOMER', n.libelle, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_VENTE_METTRE_EN_ATTENTE' nom, 'VENTE - Mettre une vente en attente' libelle
        UNION ALL SELECT 'P_VENTE_REPRENDRE_ATTENTE', 'VENTE - Reprendre une vente en attente'
        UNION ALL SELECT 'P_VENTE_VOIR_EN_COURS', 'VENTE - Voir les ventes en cours de saisie et les saisies interrompues'
        UNION ALL SELECT 'P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI', 'VENTE - Reprendre une saisie interrompue d''un autre utilisateur'
        UNION ALL SELECT 'P_SM_JOURNAL_SAISIE_VENTE', 'SERVICE CLIENT - Journal des ventes en saisie (preuve des gestes)') n
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = n.nom);

-- mettre en attente, reprendre : ceux qui ont l'écran de vente ou de vente en dépôt (comportement inchangé)
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE modele.str_NAME IN ('P_SM_CLOTURER_CAISSE', 'P_SM_VENTEDEPOT')) src
  JOIN t_privilege cible ON cible.str_NAME IN ('P_VENTE_METTRE_EN_ATTENTE', 'P_VENTE_REPRENDRE_ATTENTE')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- voir les ventes en cours, reprendre la saisie d'un autre, journal : profils administrateur, super administrateur,
-- pharmacien, et le compte admin
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE modele.str_NAME IN ('P_PROFIL_SUPER_ADMIN', 'P_PROFIL_ADMIN', 'P_PROFIL_PHARMACIEN')
        UNION
        SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') src
  JOIN t_privilege cible ON cible.str_NAME IN ('P_VENTE_VOIR_EN_COURS', 'P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI',
                                                'P_SM_JOURNAL_SAISIE_VENTE')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Ventes en cours de saisie sur les postes et saisies interrompues, en lecture seule',
       NULL, 'Ventes en cours de saisie et saisies interrompues', 'ventesencourssaisie', c.lg_MENU_ID, 98, NULL,
       'enable', 'P_VENTE_VOIR_EN_COURS', NOW(), NOW(), ''
  FROM t_sous_menu c
 WHERE c.str_COMPOSANT = 'suppressionsvente'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'ventesencourssaisie')
 LIMIT 1;

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Preuve des gestes sur les ventes en saisie : mise en attente, Retour, reprise, interruption ; export',
       NULL, 'Journal des ventes en saisie', 'journalsaisievente', c.lg_MENU_ID, 99, NULL,
       'enable', 'P_SM_JOURNAL_SAISIE_VENTE', NOW(), NOW(), ''
  FROM t_sous_menu c
 WHERE c.str_COMPOSANT = 'suppressionsvente'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'journalsaisievente')
 LIMIT 1;

-- ventes déjà en attente le jour de la mise à jour : gardées en attente, marquées
UPDATE t_preenregistrement p
   SET p.etat_saisie = 'EN_ATTENTE', p.saisie_avant_maj = 1
 WHERE p.etat_saisie IS NULL
   AND p.str_STATUT IN ('is_Process', 'pending')
   AND p.dt_UPDATED >= CURDATE()
   AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID);
