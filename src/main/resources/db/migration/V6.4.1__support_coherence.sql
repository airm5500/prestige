-- =====================================================================
-- Centre de Support - Veilleur de coherence (cont(0)les SQL parametrables)
-- ---------------------------------------------------------------------
-- Table t_support_controle : catalogue de requetes SQL de controle.
-- Chaque requete renvoie les LIGNES FAUTIVES (1ere colonne = id, 2e = contexte).
-- Le scheduler quotidien (et le bouton manuel) execute les controles actifs
-- et, pour chaque controle non "dry_run" ayant des anomalies, cree un ticket
-- de synthese via le mecanisme existant du Centre de Support.
--
-- dry_run = 1 : les anomalies sont journalisees (Diagnostic & bugs) SANS ticket
--               automatique (mode rodage / calibration).
-- dry_run = 0 : anomalies journalisees + 1 ticket de synthese par controle.
-- actif   = 0 : controle desactive (present mais non execute).
--
-- IMPORTANT : ces requetes sont en LECTURE SEULE (SELECT). Le moteur refuse
-- toute requete qui ne commence pas par SELECT.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `t_support_controle` (
    `id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `modified_at` DATETIME NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `code` VARCHAR(60) NOT NULL,
    `libelle` VARCHAR(255) NOT NULL,
    `module` VARCHAR(50) NULL,
    `requete_sql` TEXT NOT NULL,
    `dry_run` TINYINT(1) NOT NULL DEFAULT 1,
    `actif` TINYINT(1) NOT NULL DEFAULT 1,
    `ordre` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_support_controle_code` (`code`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Contro(les 1 a 5 : ORPHELINS (en-tete sans ligne) -> directs (dry_run=0)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-01', NOW(), NOW(), 'ENABLE', 'BL_SANS_DETAIL', 'Bon de livraison sans ligne de detail', 'BL', 0, 1, 1,
'SELECT b.lg_BON_LIVRAISON_ID AS id, b.str_STATUT AS ctx FROM t_bon_livraison b LEFT JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID WHERE b.str_STATUT IN (''enable'',''is_Closed'') AND d.lg_BON_LIVRAISON_DETAIL IS NULL');

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-02', NOW(), NOW(), 'ENABLE', 'FACTURE_SANS_DETAIL', 'Facture sans ligne de detail', 'FACTURATION', 0, 1, 2,
'SELECT f.lg_FACTURE_ID AS id, f.str_STATUT AS ctx FROM t_facture f LEFT JOIN t_facture_detail d ON d.lg_FACTURE_ID = f.lg_FACTURE_ID AND d.str_STATUT <> ''delete'' WHERE f.str_STATUT <> ''delete'' AND f.template = 0 AND d.lg_FACTURE_DETAIL_ID IS NULL');

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-03', NOW(), NOW(), 'ENABLE', 'SUGGESTION_SANS_DETAIL', 'Suggestion de commande sans ligne de detail', 'COMMANDE', 0, 1, 3,
'SELECT s.lg_SUGGESTION_ORDER_ID AS id, s.str_STATUT AS ctx FROM t_suggestion_order s LEFT JOIN t_suggestion_order_details d ON d.lg_SUGGESTION_ORDER_ID = s.lg_SUGGESTION_ORDER_ID AND d.str_STATUT <> ''delete'' WHERE s.str_STATUT <> ''delete'' AND d.lg_SUGGESTION_ORDER_DETAILS_ID IS NULL');

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-04', NOW(), NOW(), 'ENABLE', 'COMMANDE_SANS_DETAIL', 'Commande (order) sans ligne de detail', 'COMMANDE', 0, 1, 4,
'SELECT o.lg_ORDER_ID AS id, o.str_STATUT AS ctx FROM t_order o LEFT JOIN t_order_detail d ON d.lg_ORDER_ID = o.lg_ORDER_ID AND d.str_STATUT <> ''delete'' WHERE d.lg_ORDERDETAIL_ID IS NULL');

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-05', NOW(), NOW(), 'ENABLE', 'DOSSIER_REGLEMENT_SANS_DETAIL', 'Dossier de reglement sans ligne de detail', 'REGLEMENT', 0, 1, 5,
'SELECT dr.lg_DOSSIER_REGLEMENT_ID AS id, dr.str_STATUT AS ctx FROM t_dossier_reglement dr LEFT JOIN t_dossier_reglement_detail d ON d.lg_DOSSIER_REGLEMENT_ID = dr.lg_DOSSIER_REGLEMENT_ID WHERE dr.str_STATUT <> ''delete'' AND d.lg_DOSSIER_REGLEMENT_DETAIL_ID IS NULL');

-- ---------------------------------------------------------------------
-- Contro(les 6 a 7 : COHERENCE TRANSACTION (comptant finalise) -> dry_run
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-06', NOW(), NOW(), 'ENABLE', 'VENTE_COMPTANT_SANS_MVT_CAISSE', 'Vente comptant finalisee sans mouvement de caisse (48h)', 'VENTE', 1, 1, 6,
'SELECT p.lg_PREENREGISTREMENT_ID AS id, p.completion_date AS ctx FROM t_preenregistrement p WHERE p.str_STATUT = ''is_Closed'' AND p.lg_TYPE_VENTE_ID = ''1'' AND (p.b_IS_CANCEL IS NULL OR p.b_IS_CANCEL = 0) AND p.lg_PREENGISTREMENT_ANNULE_ID IS NULL AND p.lg_PARENT_ID IS NULL AND p.completion_date >= (NOW() - INTERVAL 48 HOUR) AND NOT EXISTS (SELECT 1 FROM MvtTransaction m WHERE m.vente_id = p.lg_PREENREGISTREMENT_ID OR m.pkey = p.lg_PREENREGISTREMENT_ID)');

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-07', NOW(), NOW(), 'ENABLE', 'VENTE_COMPTANT_SANS_MVT_STOCK', 'Vente comptant finalisee sans mouvement de stock (48h)', 'VENTE', 1, 1, 7,
'SELECT p.lg_PREENREGISTREMENT_ID AS id, p.completion_date AS ctx FROM t_preenregistrement p WHERE p.str_STATUT = ''is_Closed'' AND p.lg_TYPE_VENTE_ID = ''1'' AND (p.b_IS_CANCEL IS NULL OR p.b_IS_CANCEL = 0) AND p.lg_PREENGISTREMENT_ANNULE_ID IS NULL AND p.lg_PARENT_ID IS NULL AND p.completion_date >= (NOW() - INTERVAL 48 HOUR) AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN HMvtProduit h ON h.lg_PREENREGISTREMENT_DETAIL_ID = d.lg_PREENREGISTREMENT_DETAIL_ID WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)');

-- ---------------------------------------------------------------------
-- Contro(les 8 a 9 : MAUVAIS RATTACHEMENT CLIENT (differe / tiers-payant) -> dry_run
-- Anomalie si le compte n'appartient ni au client de la vente ni au
-- titulaire de son ayant-droit.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-08', NOW(), NOW(), 'ENABLE', 'DIFFERE_MAUVAIS_COMPTE', 'Vente differee rattachee au compte d un autre client', 'VENTE', 1, 1, 8,
'SELECT p.lg_PREENREGISTREMENT_ID AS id, cc.lg_CLIENT_ID AS ctx FROM t_preenregistrement p JOIN t_preenregistrement_compte_client pcc ON pcc.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = pcc.lg_COMPTE_CLIENT_ID LEFT JOIN t_ayant_droit ad ON ad.lg_AYANTS_DROITS_ID = p.lg_AYANTS_DROITS_ID WHERE p.str_STATUT_VENTE = ''Differe'' AND (p.b_IS_CANCEL IS NULL OR p.b_IS_CANCEL = 0) AND cc.lg_CLIENT_ID <> p.lg_CLIENT_ID AND (ad.lg_CLIENT_ID IS NULL OR cc.lg_CLIENT_ID <> ad.lg_CLIENT_ID)');

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-09', NOW(), NOW(), 'ENABLE', 'TIERS_PAYANT_MAUVAIS_COMPTE', 'Vente tiers-payant rattachee au compte TP d un autre client', 'VENTE', 1, 1, 9,
'SELECT p.lg_PREENREGISTREMENT_ID AS id, cc.lg_CLIENT_ID AS ctx FROM t_preenregistrement p JOIN t_preenregistrement_compte_client_tiers_payent pct ON pct.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = pct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID LEFT JOIN t_ayant_droit ad ON ad.lg_AYANTS_DROITS_ID = p.lg_AYANTS_DROITS_ID WHERE (p.b_IS_CANCEL IS NULL OR p.b_IS_CANCEL = 0) AND cc.lg_CLIENT_ID <> p.lg_CLIENT_ID AND (ad.lg_CLIENT_ID IS NULL OR cc.lg_CLIENT_ID <> ad.lg_CLIENT_ID)');

-- ---------------------------------------------------------------------
-- Contro(le 10 : article actif sans stock -> DESACTIVE par defaut (fragile)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-10', NOW(), NOW(), 'ENABLE', 'ARTICLE_ACTIF_SANS_STOCK', 'Article actif sans aucune ligne de stock', 'ARTICLE', 1, 0, 10,
'SELECT f.lg_FAMILLE_ID AS id, f.str_STATUT AS ctx FROM t_famille f WHERE f.str_STATUT = ''enable'' AND NOT EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.str_STATUT = ''enable'')');
