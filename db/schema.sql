-- --------------------------------------------------------
-- Hôte:                         127.0.0.1
-- Version du serveur:           10.8.5-MariaDB - mariadb.org binary distribution
-- SE du serveur:                Win64
-- HeidiSQL Version:             12.20.0.7320
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Listage de la structure de table laborex_v1_db. annulation_recette
CREATE TABLE IF NOT EXISTS `annulation_recette` (
  `id` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(255) NOT NULL,
  `montantPaye` int(11) NOT NULL,
  `montantRegle` int(11) NOT NULL,
  `montantTiersPayant` int(11) NOT NULL,
  `montantVente` int(11) NOT NULL,
  `mvtDate` date NOT NULL,
  `caissier_id` varchar(40) NOT NULL,
  `user_id` varchar(40) NOT NULL,
  `preenregistrement_id` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKaqely0ia0jq2acutm6aphwysj` (`preenregistrement_id`),
  CONSTRAINT `FKaqely0ia0jq2acutm6aphwysj` FOREIGN KEY (`preenregistrement_id`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. annulation_snapshot
CREATE TABLE IF NOT EXISTS `annulation_snapshot` (
  `ID` varchar(255) NOT NULL,
  `created_At` datetime NOT NULL,
  `dateOp` date NOT NULL,
  `montant` int(11) NOT NULL,
  `montantPaye` int(11) NOT NULL,
  `montantTP` int(11) DEFAULT NULL,
  `remise` int(11) NOT NULL,
  `updated_At` datetime NOT NULL,
  `caissier` varchar(40) DEFAULT NULL,
  `emplacement` varchar(40) NOT NULL,
  `idVente` varchar(40) NOT NULL,
  `reglement` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `montantRestant` int(8) DEFAULT 0,
  PRIMARY KEY (`ID`),
  KEY `FK_annulation_snapshot_caissier` (`caissier`),
  KEY `FK_annulation_snapshot_lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `FK_annulation_snapshot_caissier` FOREIGN KEY (`caissier`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `FK_annulation_snapshot_lg_USER_ID` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. article
CREATE TABLE IF NOT EXISTS `article` (
  `cip` varchar(20) DEFAULT NULL,
  `ean` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. build_version
CREATE TABLE IF NOT EXISTS `build_version` (
  `build_date` varchar(50) NOT NULL,
  `builder` varchar(100) NOT NULL,
  `version` varchar(10) NOT NULL,
  `jdkVersion` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`build_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. categorie_notification
CREATE TABLE IF NOT EXISTS `categorie_notification` (
  `id` int(11) NOT NULL,
  `canal` varchar(18) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `UK_j4d9r6sbnrreitp39y1et12p1` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. caution
CREATE TABLE IF NOT EXISTS `caution` (
  `id` varchar(255) NOT NULL,
  `montant` int(11) NOT NULL,
  `mvt_date` datetime NOT NULL,
  `tiersPayant_id` varchar(40) NOT NULL,
  `user_id` varchar(40) NOT NULL,
  `conso` int(11) NOT NULL,
  `mvt_update` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `UK_3lpgnu10pl3uefrfbo8yroydf` (`tiersPayant_id`) USING BTREE,
  KEY `FK6gacmsgk048580yuqre8w73cy` (`user_id`) USING BTREE,
  CONSTRAINT `FK6gacmsgk048580yuqre8w73cy` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `FKnxak1kan7fuftickp4xqdor06` FOREIGN KEY (`tiersPayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. caution_historique
CREATE TABLE IF NOT EXISTS `caution_historique` (
  `id` varchar(100) NOT NULL,
  `montant` int(11) NOT NULL,
  `mvt_date` datetime NOT NULL,
  `caution_id` varchar(255) NOT NULL,
  `user_id` varchar(40) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FKlm5tlk7ca58rng2xcjpqp2d9q` (`caution_id`) USING BTREE,
  KEY `FK40fuhjajhcvvw35ignrqsr2ld` (`user_id`) USING BTREE,
  CONSTRAINT `FK40fuhjajhcvvw35ignrqsr2ld` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `FKlm5tlk7ca58rng2xcjpqp2d9q` FOREIGN KEY (`caution_id`) REFERENCES `caution` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. date_ouverture
CREATE TABLE IF NOT EXISTS `date_ouverture` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `mvtDate` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. doublon_hmvtproduit_table2
CREATE TABLE IF NOT EXISTS `doublon_hmvtproduit_table2` (
  `ID` varchar(100) NOT NULL,
  `createdAt` datetime NOT NULL,
  `pkey` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. doublon_hmvtransaction
CREATE TABLE IF NOT EXISTS `doublon_hmvtransaction` (
  `pkey` varchar(100) NOT NULL,
  `nb` bigint(21) NOT NULL,
  `createdAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. doublon_mvtransaction
CREATE TABLE IF NOT EXISTS `doublon_mvtransaction` (
  `pkey` varchar(100) NOT NULL,
  `nb` bigint(21) NOT NULL,
  `createdAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. doublon_mvtransaction_table2
CREATE TABLE IF NOT EXISTS `doublon_mvtransaction_table2` (
  `ID` varchar(100) NOT NULL,
  `createdAt` datetime NOT NULL,
  `pkey` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. flag
CREATE TABLE IF NOT EXISTS `flag` (
  `id` varchar(16) NOT NULL,
  `montant` int(11) NOT NULL,
  `date_start` int(8) NOT NULL,
  `date_end` int(8) NOT NULL,
  `periode_interval` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date_start_flag` (`date_start`),
  UNIQUE KEY `date_end_flag` (`date_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. flyway_schema_history
CREATE TABLE IF NOT EXISTS `flyway_schema_history` (
  `installed_rank` int(11) NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int(11) DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT current_timestamp(),
  `execution_time` int(11) NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. fne_invoice
CREATE TABLE IF NOT EXISTS `fne_invoice` (
  `id` varchar(70) NOT NULL,
  `mvt_date` datetime NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'SALE',
  `reference` varchar(70) DEFAULT NULL,
  `response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `facture_id` varchar(40) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FKh88avxjkq113wyni5q86wdkpq` (`facture_id`) USING BTREE,
  CONSTRAINT `FKh88avxjkq113wyni5q86wdkpq` FOREIGN KEY (`facture_id`) REFERENCES `t_facture` (`lg_FACTURE_ID`),
  CONSTRAINT `response` CHECK (json_valid(`response`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. gamme_produit
CREATE TABLE IF NOT EXISTS `gamme_produit` (
  `id` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_gxcny2jtftoegad78u3jirvoj` (`code`),
  UNIQUE KEY `UK_1r9jeo0jvdg5pjhyvl2gnf2do` (`libelle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. groupefournisseur
CREATE TABLE IF NOT EXISTS `groupefournisseur` (
  `id` int(3) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. hibernate_sequence
CREATE TABLE IF NOT EXISTS `hibernate_sequence` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. historique_importation
CREATE TABLE IF NOT EXISTS `historique_importation` (
  `id` varchar(40) NOT NULL,
  `createdAt` datetime NOT NULL,
  `mvtdate` date NOT NULL,
  `user` varchar(40) NOT NULL,
  `montant_achat` int(11) NOT NULL,
  `montant_vente` int(11) NOT NULL,
  `nbre_ligne` int(11) NOT NULL,
  `detail` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. hmvtproduit
CREATE TABLE IF NOT EXISTS `hmvtproduit` (
  `uuid` varchar(100) NOT NULL,
  `checked` bit(1) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `mvtdate` date NOT NULL,
  `pkey` varchar(100) NOT NULL,
  `prixAchat` int(11) NOT NULL,
  `prixUn` int(11) NOT NULL,
  `qteDebut` int(11) NOT NULL,
  `qteFinale` int(11) NOT NULL,
  `qteMvt` int(11) NOT NULL,
  `valeurTva` int(11) NOT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) NOT NULL,
  `typeMvt` varchar(255) NOT NULL,
  `ug` int(4) NOT NULL DEFAULT 0,
  `lg_PREENREGISTREMENT_DETAIL_ID` varchar(40) DEFAULT NULL,
  `cmu_price` int(8) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `HMvtProduit7` (`mvtdate`),
  KEY `HMvtPkey` (`pkey`),
  KEY `FKrl4x5wk4yimlrwgj8h0eooxyl` (`lg_EMPLACEMENT_ID`),
  KEY `FKhdol8dkhj42m8480qcocfkxl1` (`lg_FAMILLE_ID`),
  KEY `FKio42ffwvqj75spq3inr6qm4nc` (`lg_USER_ID`),
  KEY `FKf5w834aw2423wftknvgewj07y` (`typeMvt`),
  KEY `FKtkq9ekafqys2agl9afxhh92yb` (`lg_PREENREGISTREMENT_DETAIL_ID`),
  KEY `idx_hmvt_fam_empl_date` (`lg_FAMILLE_ID`,`lg_EMPLACEMENT_ID`,`mvtdate`),
  CONSTRAINT `FKtkq9ekafqys2agl9afxhh92yb` FOREIGN KEY (`lg_PREENREGISTREMENT_DETAIL_ID`) REFERENCES `t_preenregistrement_detail` (`lg_PREENREGISTREMENT_DETAIL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. invmaj
CREATE TABLE IF NOT EXISTS `invmaj` (
  `lg_FAMILLE_ID` varchar(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. laboratoire
CREATE TABLE IF NOT EXISTS `laboratoire` (
  `id` varchar(255) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ch0c4o3olc65u3yap006nxq0i` (`libelle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. licence
CREATE TABLE IF NOT EXISTS `licence` (
  `id` varchar(200) NOT NULL,
  `date_start` date NOT NULL,
  `date_end` date NOT NULL,
  `type_licence` int(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date_start_licence` (`date_start`),
  UNIQUE KEY `date_end_licence` (`date_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. ligne_resume_caisse
CREATE TABLE IF NOT EXISTS `ligne_resume_caisse` (
  `id` bigint(20) NOT NULL,
  `montant` bigint(20) NOT NULL,
  `type_ligne` int(11) NOT NULL,
  `resume_caisse_id` varchar(40) NOT NULL,
  `type_reglement_id` varchar(40) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `UKbojq4och1r2t7bm99b7n3ye9u_ligne_resume` (`type_reglement_id`,`resume_caisse_id`,`type_ligne`),
  KEY `FKb54xdmwt7tnf2g5q15ct3ixac` (`resume_caisse_id`) USING BTREE,
  KEY `FKh09kest51rqmfsdagoa7hprqu` (`type_reglement_id`) USING BTREE,
  CONSTRAINT `FKb54xdmwt7tnf2g5q15ct3ixac` FOREIGN KEY (`resume_caisse_id`) REFERENCES `t_resume_caisse` (`ld_CAISSE_ID`),
  CONSTRAINT `FKh09kest51rqmfsdagoa7hprqu` FOREIGN KEY (`type_reglement_id`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. medecin
CREATE TABLE IF NOT EXISTS `medecin` (
  `id` varchar(255) NOT NULL,
  `num_ordre` varchar(100) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `commentaire` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `MEDECIN_ch0c4o3olc65u3yap006nxq0i` (`num_ordre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. model_facture_dynamique
CREATE TABLE IF NOT EXISTS `model_facture_dynamique` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `str_NOM` varchar(100) NOT NULL,
  `str_DESCRIPTION` varchar(255) DEFAULT NULL,
  `str_MODE_TRI` varchar(30) NOT NULL DEFAULT 'TIERS_PAYANT',
  `str_STATUT` varchar(20) NOT NULL DEFAULT 'enable',
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `b_AFFICHER_ENTETE` tinyint(1) NOT NULL DEFAULT 1,
  `b_AFFICHER_PIED_PAGE` tinyint(1) NOT NULL DEFAULT 1,
  `b_DETAILLER_PRODUITS` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. model_facture_dynamique_colonne
CREATE TABLE IF NOT EXISTS `model_facture_dynamique_colonne` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model_id` int(11) NOT NULL,
  `str_CHAMP` varchar(50) NOT NULL,
  `str_LIBELLE` varchar(100) NOT NULL,
  `int_ORDRE` int(11) NOT NULL DEFAULT 0,
  `str_NIVEAU` varchar(10) NOT NULL DEFAULT 'BON',
  PRIMARY KEY (`id`),
  KEY `idx_mfd_colonne_model` (`model_id`),
  CONSTRAINT `fk_mfd_colonne_model` FOREIGN KEY (`model_id`) REFERENCES `model_facture_dynamique` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. motif_ajustement
CREATE TABLE IF NOT EXISTS `motif_ajustement` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(250) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_motif_ajustement` (`libelle`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. motif_reglement
CREATE TABLE IF NOT EXISTS `motif_reglement` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `motif_reglement_libelle_uniq` (`libelle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. motif_retour_carnet
CREATE TABLE IF NOT EXISTS `motif_retour_carnet` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(250) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_motif_retout_carnet` (`libelle`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. motif_suggestion_reserve
CREATE TABLE IF NOT EXISTS `motif_suggestion_reserve` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(250) NOT NULL,
  `categorie` varchar(10) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_motif_suggestion_reserve_libelle` (`libelle`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. mvttransaction
CREATE TABLE IF NOT EXISTS `mvttransaction` (
  `uuid` varchar(100) NOT NULL,
  `avoidAmount` int(11) DEFAULT NULL,
  `categorie` int(11) NOT NULL,
  `checked` bit(1) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `marge` int(11) DEFAULT NULL,
  `montant` int(11) DEFAULT NULL,
  `montantCredit` int(11) DEFAULT NULL,
  `montantNet` int(11) DEFAULT NULL,
  `montantPaye` int(11) DEFAULT NULL,
  `montantRegle` int(11) DEFAULT NULL,
  `montantRemise` int(11) DEFAULT NULL,
  `montantRestant` int(11) DEFAULT NULL,
  `montantTva` int(11) DEFAULT NULL,
  `montantVerse` int(11) DEFAULT NULL,
  `mvtdate` date NOT NULL,
  `pkey` varchar(100) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `typeTransaction` int(11) NOT NULL,
  `caisse` varchar(40) NOT NULL,
  `grossisteId` varchar(40) DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) NOT NULL,
  `typeReglementId` varchar(40) DEFAULT NULL,
  `typeMvtCaisseId` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) NOT NULL,
  `organisme` varchar(100) DEFAULT NULL,
  `montantAcc` int(10) NOT NULL DEFAULT 0,
  `margeug` int(8) NOT NULL DEFAULT 0,
  `montantttcug` int(8) NOT NULL DEFAULT 0,
  `montantnetug` int(8) NOT NULL DEFAULT 0,
  `montanttvaug` int(8) NOT NULL DEFAULT 0,
  `vente_id` varchar(40) DEFAULT NULL,
  `flag_id` varchar(16) DEFAULT NULL,
  `flag` bit(1) DEFAULT b'0',
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `pkey_unq` (`pkey`),
  KEY `indexMvtTranstionmvdate` (`mvtdate`),
  KEY `indexMvtTranstype` (`typeTransaction`),
  KEY `indexMvtpkey` (`pkey`),
  KEY `indexMvtchecked` (`checked`),
  KEY `indexMvtcategorie` (`categorie`),
  KEY `indexMvtRef` (`reference`),
  KEY `FKuexkrw2hgawujvv9vo4i6dwn` (`caisse`),
  KEY `FK6lv5o5akgq7danlitleaq9cqs` (`grossisteId`),
  KEY `FKvw5wh8ecb02thq9dirkfmtj7` (`lg_EMPLACEMENT_ID`),
  KEY `FKba0l8rx03twx6cp9s94esl2av` (`typeReglementId`),
  KEY `FKry0qq7ajuqv0m1my3dymecy39` (`typeMvtCaisseId`),
  KEY `FKnfo31ibba0bipr7582l5ubfxb` (`lg_USER_ID`),
  KEY `FKphgk3j16oxgdds9658fbb8eti` (`vente_id`),
  KEY `flag_fk` (`flag_id`),
  KEY `indexMvtEmplCreatedAt` (`lg_EMPLACEMENT_ID`,`createdAt`) USING BTREE,
  KEY `indexMvtEmplMvtdate` (`lg_EMPLACEMENT_ID`,`mvtdate`) USING BTREE,
  CONSTRAINT `flag_fk` FOREIGN KEY (`flag_id`) REFERENCES `flag` (`id`),
  CONSTRAINT `mvt_vent_id_foreign_key` FOREIGN KEY (`vente_id`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. notification
CREATE TABLE IF NOT EXISTS `notification` (
  `id` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `modfied_at` datetime NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `message` text NOT NULL DEFAULT '',
  `user_to` varchar(50) DEFAULT NULL,
  `statut` varchar(50) NOT NULL,
  `type_notification` int(11) NOT NULL,
  `number_attempt` int(4) DEFAULT 0,
  `entity_ref` varchar(255) DEFAULT NULL,
  `donnees` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKjdm55fpgk704xpi0lthj2wynp` (`type_notification`),
  CONSTRAINT `FKjdm55fpgk704xpi0lthj2wynp` FOREIGN KEY (`type_notification`) REFERENCES `categorie_notification` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. notification_client
CREATE TABLE IF NOT EXISTS `notification_client` (
  `id` varchar(50) NOT NULL,
  `notification_id` varchar(50) NOT NULL,
  `client_id` varchar(50) NOT NULL,
  `statut` varchar(20) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `resource_url` varchar(500) DEFAULT NULL,
  `delivery_status` varchar(40) DEFAULT NULL,
  `error_code` varchar(60) DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `last_http_status` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. prix_reference
CREATE TABLE IF NOT EXISTS `prix_reference` (
  `id` varchar(70) NOT NULL,
  `type_prix` varchar(20) NOT NULL,
  `valeur` int(8) NOT NULL,
  `produit_id` varchar(70) NOT NULL,
  `tiersPayant_id` varchar(70) NOT NULL,
  `enabled` bit(1) NOT NULL,
  `valeur_taux` float DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `UK2011lfmf4strqpfcqs6pdhfb1` (`tiersPayant_id`,`produit_id`) USING BTREE,
  KEY `FKpd7yhm20h1gx3g2odplau83qo` (`produit_id`) USING BTREE,
  CONSTRAINT `FKervvnnr98c5r74dhwmdll6r1` FOREIGN KEY (`tiersPayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `FKpd7yhm20h1gx3g2odplau83qo` FOREIGN KEY (`produit_id`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. reference
CREATE TABLE IF NOT EXISTS `reference` (
  `id` varchar(14) NOT NULL,
  `devis` bit(1) NOT NULL,
  `emplacement_id` varchar(50) NOT NULL,
  `reference` varchar(20) NOT NULL,
  `reference_temp` varchar(20) NOT NULL,
  `last_int_value` int(8) NOT NULL DEFAULT 0,
  `last_int_tmp_value` int(8) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Refch0c4o3olc65u3yap006nxq0i` (`id`,`emplacement_id`,`devis`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. reglement_carnet
CREATE TABLE IF NOT EXISTS `reglement_carnet` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(250) DEFAULT NULL,
  `montant_paye` int(11) NOT NULL,
  `montant_a_payer` int(11) NOT NULL,
  `montant_restant` int(11) NOT NULL,
  `reference` int(8) NOT NULL,
  `tierspayant_id` varchar(40) NOT NULL,
  `user_id` varchar(40) NOT NULL,
  `createdAt` datetime NOT NULL,
  `type_reglement_id` varchar(40) DEFAULT NULL,
  `id_dossier` varchar(60) DEFAULT NULL,
  `type_tiers_payant` varchar(30) DEFAULT NULL,
  `motifReglement_id` int(11) DEFAULT NULL,
  `type_reglement` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reglement_carnet_user_id_fk` (`user_id`),
  KEY `tierspayant_id_fk` (`tierspayant_id`),
  KEY `FKrymqow94nj2mibb37feyphbg6` (`type_reglement_id`),
  KEY `reglement_carnet_type_tiers_payant` (`type_tiers_payant`),
  KEY `FKas6vrogr3487l957ay651ot3bCUSM` (`motifReglement_id`),
  CONSTRAINT `FKas6vrogr3487l957ay651ot3bCUSM` FOREIGN KEY (`motifReglement_id`) REFERENCES `motif_reglement` (`id`),
  CONSTRAINT `FKrymqow94nj2mibb37feyphbg6` FOREIGN KEY (`type_reglement_id`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`),
  CONSTRAINT `reglement_carnet_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `tierspayant_id_fk` FOREIGN KEY (`tierspayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. retour_carnet
CREATE TABLE IF NOT EXISTS `retour_carnet` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(250) NOT NULL,
  `user_id` varchar(40) NOT NULL,
  `tierspayant_id` varchar(40) NOT NULL,
  `created_at` datetime NOT NULL,
  `status` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK1kuavf8xietwd64719uyvs89j` (`tierspayant_id`),
  KEY `FKi8n805f0245mh7m206md2mq9x` (`user_id`),
  CONSTRAINT `FK1kuavf8xietwd64719uyvs89j` FOREIGN KEY (`tierspayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `FKi8n805f0245mh7m206md2mq9x` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. retour_carnet_detail
CREATE TABLE IF NOT EXISTS `retour_carnet_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `motif_retour_carnet_id` int(11) NOT NULL,
  `retour_carnet_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `produit_id` varchar(40) NOT NULL,
  `stock_init` int(11) NOT NULL,
  `stock_final` int(11) NOT NULL,
  `qty_retour` int(11) NOT NULL,
  `prix_uni` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK8ymt9v9ag1r4jv3if15haajdg` (`motif_retour_carnet_id`),
  KEY `FK5mxijsvja9my2ooo7gmv8v4hg` (`produit_id`),
  KEY `FKnq3rnu7974fkr8hij9mgepc4h` (`retour_carnet_id`),
  CONSTRAINT `FK5mxijsvja9my2ooo7gmv8v4hg` FOREIGN KEY (`produit_id`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK8ymt9v9ag1r4jv3if15haajdg` FOREIGN KEY (`motif_retour_carnet_id`) REFERENCES `motif_retour_carnet` (`id`),
  CONSTRAINT `FKnq3rnu7974fkr8hij9mgepc4h` FOREIGN KEY (`retour_carnet_id`) REFERENCES `retour_carnet` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. rupture
CREATE TABLE IF NOT EXISTS `rupture` (
  `id` varchar(40) NOT NULL,
  `reference` varchar(70) NOT NULL,
  `statut` varchar(20) NOT NULL,
  `dtCreated` date DEFAULT NULL,
  `dtUpdated` date DEFAULT NULL,
  `grossisteId` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. rupture_detail
CREATE TABLE IF NOT EXISTS `rupture_detail` (
  `id` varchar(40) NOT NULL,
  `qty` int(8) NOT NULL,
  `prixAchat` int(10) NOT NULL,
  `prixVente` int(10) NOT NULL,
  `produitId` varchar(40) NOT NULL,
  `ruptureId` varchar(40) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. sms_token
CREATE TABLE IF NOT EXISTS `sms_token` (
  `id` varchar(16) NOT NULL,
  `access_token` varchar(2000) DEFAULT NULL,
  `expires_in` int(11) NOT NULL,
  `app_header` varchar(1000) NOT NULL,
  `create_date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sms_token_un` (`access_token`) USING HASH,
  KEY `sms_token_index` (`access_token`(1024))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. stock_daily_value
CREATE TABLE IF NOT EXISTS `stock_daily_value` (
  `id` int(11) NOT NULL,
  `valeur_achat` bigint(20) NOT NULL,
  `valeur_vente` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. stock_snapshot
CREATE TABLE IF NOT EXISTS `stock_snapshot` (
  `id` varchar(40) NOT NULL,
  `produit_id` varchar(40) NOT NULL,
  `stock_journalier` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_stock_snapshot_t_famille` (`produit_id`),
  CONSTRAINT `FK_stock_snapshot_t_famille` FOREIGN KEY (`produit_id`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_ajustement
CREATE TABLE IF NOT EXISTS `t_ajustement` (
  `lg_AJUSTEMENT_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(100) DEFAULT NULL,
  `str_COMMENTAIRE` varchar(200) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_ZONE` varchar(10) NOT NULL DEFAULT 'RAYON',
  PRIMARY KEY (`lg_AJUSTEMENT_ID`),
  KEY `FK_t_ajustement_t_user` (`lg_USER_ID`),
  CONSTRAINT `FK_t_ajustement_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_ajustement_detail
CREATE TABLE IF NOT EXISTS `t_ajustement_detail` (
  `lg_AJUSTEMENTDETAIL_ID` varchar(40) NOT NULL,
  `int_NUMBER` int(11) DEFAULT 0,
  `int_NUMBER_CURRENT_STOCK` int(11) DEFAULT 0,
  `int_NUMBER_AFTER_STOCK` int(11) DEFAULT 0,
  `lg_FAMILLE_ID` varchar(20) DEFAULT NULL,
  `lg_AJUSTEMENT_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `motif_ajustement_id` int(3) DEFAULT NULL,
  PRIMARY KEY (`lg_AJUSTEMENTDETAIL_ID`),
  KEY `FK_t_ajustement_detail_t_ajustement` (`lg_AJUSTEMENT_ID`),
  KEY `FK_t_ajustement_detail_t_famille` (`lg_FAMILLE_ID`),
  KEY `ajust_motif_id_fk` (`motif_ajustement_id`),
  CONSTRAINT `FK_t_ajustement_detail_t_ajustement` FOREIGN KEY (`lg_AJUSTEMENT_ID`) REFERENCES `t_ajustement` (`lg_AJUSTEMENT_ID`),
  CONSTRAINT `FK_t_ajustement_detail_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `ajust_motif_id_fk` FOREIGN KEY (`motif_ajustement_id`) REFERENCES `motif_ajustement` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_alert_event
CREATE TABLE IF NOT EXISTS `t_alert_event` (
  `dt_Date_Envoi` datetime DEFAULT NULL,
  `int_Max_Messages` int(11) DEFAULT NULL,
  `str_Event` varchar(40) NOT NULL,
  `b_IsCommand` tinyint(1) DEFAULT 0,
  `str_SMS_English_Text` mediumtext DEFAULT NULL,
  `dec_Num_Percent` decimal(15,6) DEFAULT NULL,
  `str_MAIL_English_Text` mediumtext DEFAULT NULL,
  `b_Row_Active` tinyint(1) DEFAULT 0,
  `str_SMS_French_Text` mediumtext DEFAULT NULL,
  `lg_UID_Who_New` varchar(20) DEFAULT NULL,
  `lg_UID_Who_Last_Update` varchar(20) DEFAULT NULL,
  `str_MAIL_French_Text` mediumtext DEFAULT NULL,
  `dt_Last_Enter_Date` datetime DEFAULT NULL,
  `str_ERROR_CODE` varchar(20) DEFAULT NULL,
  `str_DESCRIPTION` varchar(50) DEFAULT NULL,
  `str_FONCTION` varchar(40) DEFAULT NULL,
  `str_TYPE` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`str_Event`),
  UNIQUE KEY `str_Event` (`str_Event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=5461;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_alert_event_user_fone
CREATE TABLE IF NOT EXISTS `t_alert_event_user_fone` (
  `lg_ID` varchar(20) NOT NULL,
  `str_Event` varchar(40) DEFAULT NULL,
  `lg_USER_FONE_ID` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `str_Event` (`str_Event`),
  KEY `lg_USER_FONE_ID` (`lg_USER_FONE_ID`),
  CONSTRAINT `t_alert_event_user_fone_fk` FOREIGN KEY (`str_Event`) REFERENCES `t_alert_event` (`str_Event`),
  CONSTRAINT `t_alert_event_user_fone_fk1` FOREIGN KEY (`lg_USER_FONE_ID`) REFERENCES `t_user_fone` (`lg_USER_FONE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=2730;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_application_event
CREATE TABLE IF NOT EXISTS `t_application_event` (
  `id` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL,
  `last_seen_at` datetime NOT NULL,
  `module` varchar(100) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `niveau` varchar(20) NOT NULL DEFAULT 'ERROR',
  `signature` varchar(64) NOT NULL,
  `message_court` varchar(500) NOT NULL,
  `occurrences` int(11) NOT NULL DEFAULT 1,
  `utilisateur` varchar(255) DEFAULT NULL,
  `url_ou_ecran` varchar(255) DEFAULT NULL,
  `payload_json` varchar(4000) DEFAULT NULL,
  `log_ref` varchar(500) DEFAULT NULL,
  `ticket_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_application_event_signature` (`signature`),
  KEY `idx_application_event_last_seen` (`last_seen_at`),
  KEY `idx_application_event_niveau` (`niveau`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_application_event_occurrence
CREATE TABLE IF NOT EXISTS `t_application_event_occurrence` (
  `id` varchar(50) NOT NULL,
  `event_id` varchar(50) NOT NULL,
  `seen_at` datetime NOT NULL,
  `constate_par` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_occurrence_event` (`event_id`),
  KEY `idx_event_occurrence_seen` (`seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_ayant_droit
CREATE TABLE IF NOT EXISTS `t_ayant_droit` (
  `lg_AYANTS_DROITS_ID` varchar(40) NOT NULL,
  `lg_CATEGORIE_AYANTDROIT_ID` varchar(40) DEFAULT NULL,
  `lg_CLIENT_ID` varchar(40) DEFAULT NULL,
  `str_CODE_INTERNE` varchar(40) DEFAULT NULL,
  `str_FIRST_NAME` varchar(50) DEFAULT NULL,
  `str_NUMERO_SECURITE_SOCIAL` varchar(50) DEFAULT NULL,
  `str_LAST_NAME` varchar(50) DEFAULT NULL,
  `dt_NAISSANCE` datetime DEFAULT NULL,
  `str_SEXE` varchar(10) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `lg_RISQUE_ID` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_AYANTS_DROITS_ID`),
  KEY `lg_CATEGORIE_AYANTDROIT_ID` (`lg_CATEGORIE_AYANTDROIT_ID`),
  KEY `lg_CLIENT_ID` (`lg_CLIENT_ID`),
  KEY `str_CODE_INTERNE` (`str_CODE_INTERNE`),
  KEY `lg_VILLE_ID` (`lg_VILLE_ID`),
  KEY `lg_RISQUE_ID` (`lg_RISQUE_ID`),
  CONSTRAINT `t_ayant_droit_fk` FOREIGN KEY (`lg_VILLE_ID`) REFERENCES `t_ville` (`lg_VILLE_ID`),
  CONSTRAINT `t_ayant_droit_fk1` FOREIGN KEY (`lg_RISQUE_ID`) REFERENCES `t_risque` (`lg_RISQUE_ID`),
  CONSTRAINT `t_ayants_droits_Categorie_ayant_fk` FOREIGN KEY (`lg_CATEGORIE_AYANTDROIT_ID`) REFERENCES `t_categorie_ayantdroit` (`lg_CATEGORIE_AYANTDROIT_ID`),
  CONSTRAINT `t_ayants_droits_Client_fk` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_billetage
CREATE TABLE IF NOT EXISTS `t_billetage` (
  `lg_BILLETAGE_ID` varchar(40) NOT NULL,
  `ld_CAISSE_ID` varchar(40) NOT NULL,
  `int_AMOUNT` double(12,2) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_UPDATED_BY` varchar(20) DEFAULT NULL,
  `lg_CREATED_BY` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_BILLETAGE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_billetage_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_billetage_details
CREATE TABLE IF NOT EXISTS `t_billetage_details` (
  `lg_BILLETAGE_DETAILS_ID` varchar(40) NOT NULL,
  `lg_BILLETAGE_ID` varchar(40) NOT NULL,
  `int_NB_DIX_MIL` int(40) DEFAULT NULL,
  `int_NB_CINQ_MIL` int(40) DEFAULT NULL,
  `int_NB_DEUX_MIL` int(40) DEFAULT NULL,
  `int_NB_MIL` int(40) DEFAULT NULL,
  `int_NB_CINQ_CENT` int(40) DEFAULT NULL,
  `int_AUTRE` int(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_UPDATED_BY` varchar(20) DEFAULT NULL,
  `lg_CREATED_BY` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_BILLETAGE_DETAILS_ID`),
  KEY `lg_BILLETAGE_ID` (`lg_BILLETAGE_ID`),
  CONSTRAINT `t_billetage_details_fk` FOREIGN KEY (`lg_BILLETAGE_ID`) REFERENCES `t_billetage` (`lg_BILLETAGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_bon_livraison
CREATE TABLE IF NOT EXISTS `t_bon_livraison` (
  `lg_BON_LIVRAISON_ID` varchar(40) NOT NULL,
  `str_REF_LIVRAISON` varchar(20) DEFAULT NULL,
  `dt_DATE_LIVRAISON` datetime DEFAULT NULL,
  `int_MHT` int(11) DEFAULT NULL,
  `int_TVA` int(11) DEFAULT NULL,
  `int_HTTC` int(11) DEFAULT NULL,
  `lg_ORDER_ID` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT_FACTURE` varchar(40) DEFAULT 'unpaid',
  `lg_USER_ID` varchar(20) DEFAULT NULL,
  `bl_SELECTED` tinyint(1) DEFAULT 0,
  `STATUS` varchar(40) DEFAULT 'NON REGLE',
  `dt_REGLEMENT_DATE` datetime DEFAULT NULL,
  `int_MONTANT_REGLE` int(11) DEFAULT NULL,
  `int_MONTANT_RESTANT` int(11) DEFAULT NULL,
  `direct_import` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`lg_BON_LIVRAISON_ID`),
  KEY `lg_ORDER_ID` (`lg_ORDER_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `idx_bon_livraison_statut_dt_updated` (`str_STATUT`,`dt_UPDATED`) USING BTREE,
  CONSTRAINT `t_bon_livraison_fk` FOREIGN KEY (`lg_ORDER_ID`) REFERENCES `t_order` (`lg_ORDER_ID`),
  CONSTRAINT `t_bon_livraison_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_bon_livraison_detail
CREATE TABLE IF NOT EXISTS `t_bon_livraison_detail` (
  `lg_BON_LIVRAISON_DETAIL` varchar(40) NOT NULL,
  `lg_GROSSISTE_ID` varchar(40) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `lg_BON_LIVRAISON_ID` varchar(40) DEFAULT NULL,
  `int_QTE_CMDE` int(11) DEFAULT 0,
  `int_QTE_UG` int(11) DEFAULT 0,
  `int_QTE_RECUE` int(11) DEFAULT 0,
  `int_PRIX_REFERENCE` int(11) DEFAULT NULL,
  `str_LIVRAISON_ADP` varchar(20) DEFAULT NULL,
  `str_MANQUE_FORCES` varchar(20) DEFAULT NULL,
  `str_ETAT_ARTICLE` varchar(20) DEFAULT NULL,
  `int_PRIX_VENTE` int(11) DEFAULT NULL,
  `int_PAF` int(11) DEFAULT NULL,
  `int_PA_REEL` int(11) DEFAULT NULL,
  `lg_ZONE_GEO_ID` varchar(20) DEFAULT '0',
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_QTE_MANQUANT` int(11) DEFAULT 0,
  `int_QTE_RETURN` int(11) DEFAULT 0,
  `int_INITSTOCK` int(11) DEFAULT 0,
  `prixTarif` int(10) NOT NULL DEFAULT 0,
  `prixUni` int(8) DEFAULT NULL,
  `lots` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `checked` tinyint(1) DEFAULT 0,
  `quantite_controle` int(6) DEFAULT NULL,
  PRIMARY KEY (`lg_BON_LIVRAISON_DETAIL`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_BON_LIVRAISON_ID` (`lg_BON_LIVRAISON_ID`),
  KEY `lg_ZONE_GEO_ID` (`lg_ZONE_GEO_ID`),
  CONSTRAINT `t_bon_livraison_detail_fk` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_bon_livraison_detail_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_bon_livraison_detail_fk2` FOREIGN KEY (`lg_BON_LIVRAISON_ID`) REFERENCES `t_bon_livraison` (`lg_BON_LIVRAISON_ID`),
  CONSTRAINT `t_bon_livraison_detail_fk3` FOREIGN KEY (`lg_ZONE_GEO_ID`) REFERENCES `t_zone_geographique` (`lg_ZONE_GEO_ID`),
  CONSTRAINT `lots` CHECK (json_valid(`lots`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_bordereau
CREATE TABLE IF NOT EXISTS `t_bordereau` (
  `lg_BORDEREAU_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  `dbl_MONTANT` double(15,3) DEFAULT NULL,
  `int_nb_FACTURE` int(11) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_PAYE` int(11) DEFAULT NULL,
  `str_STATUT` varchar(60) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_BORDEREAU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_bordereau_detail
CREATE TABLE IF NOT EXISTS `t_bordereau_detail` (
  `lg_BORDEREAU_DETAIL_ID` varchar(40) NOT NULL,
  `lg_FACTURE_ID` varchar(40) DEFAULT NULL,
  `lg_BORDEREAU_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_BORDEREAU_DETAIL_ID`),
  KEY `lg_FACTURE_ID` (`lg_FACTURE_ID`),
  KEY `lg_BORDEREAU_ID` (`lg_BORDEREAU_ID`),
  CONSTRAINT `t_bordereau_detail_fk` FOREIGN KEY (`lg_FACTURE_ID`) REFERENCES `t_facture` (`lg_FACTURE_ID`),
  CONSTRAINT `t_bordereau_detail_fk1` FOREIGN KEY (`lg_BORDEREAU_ID`) REFERENCES `t_bordereau` (`lg_BORDEREAU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_caisse
CREATE TABLE IF NOT EXISTS `t_caisse` (
  `lg_CAISSE_ID` varchar(40) NOT NULL,
  `int_SOLDE` double(12,2) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_UPDATED_BY` varchar(20) DEFAULT NULL,
  `lg_CREATED_BY` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_CAISSE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_caisse_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_calendrier
CREATE TABLE IF NOT EXISTS `t_calendrier` (
  `lg_CALENDRIER_ID` varchar(40) NOT NULL,
  `lg_MONTH_ID` varchar(40) NOT NULL,
  `int_NUMBER_JOUR` int(11) DEFAULT 0,
  `int_ANNEE` int(11) DEFAULT 0,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_BEGIN` datetime DEFAULT NULL,
  `dt_END` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_day` date DEFAULT NULL,
  PRIMARY KEY (`lg_CALENDRIER_ID`),
  KEY `FK_t_calendrier_t_month` (`lg_MONTH_ID`),
  CONSTRAINT `FK_t_calendrier_t_month` FOREIGN KEY (`lg_MONTH_ID`) REFERENCES `t_month` (`lg_MONTH_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_cash_transaction
CREATE TABLE IF NOT EXISTS `t_cash_transaction` (
  `ID` varchar(40) NOT NULL,
  `str_TRANSACTION_REF` varchar(20) DEFAULT NULL,
  `int_AMOUNT` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `lg_CREATED_BY` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_UPDATED_BY` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(2000) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `int_AMOUNT_DEBIT` int(11) DEFAULT 0,
  `int_AMOUNT_CREDIT` int(11) DEFAULT 0,
  `str_REF_COMPTE_CLIENT` varchar(40) DEFAULT NULL,
  `str_NUMERO_COMPTE` varchar(20) DEFAULT '0000001',
  `int_AMOUNT_REMIS` int(11) DEFAULT 0,
  `int_AMOUNT_RECU` int(11) DEFAULT 0,
  `str_TASK` varchar(20) DEFAULT NULL,
  `lg_TYPE_REGLEMENT_ID` varchar(40) DEFAULT '1',
  `str_TYPE_VENTE` varchar(20) DEFAULT NULL,
  `lg_MOTIF_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `lg_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `str_REF_FACTURE` varchar(40) DEFAULT NULL,
  `str_RESSOURCE_REF` varchar(40) DEFAULT NULL,
  `str_TYPE` tinyint(1) DEFAULT 1,
  `bool_CHECKED` tinyint(1) DEFAULT 1,
  `int_AMOUNT2` int(11) DEFAULT 0,
  `int_ACCOUNT` int(11) DEFAULT 0,
  `lgUSERCAISSIERID` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `lg_TYPE_REGLEMENT_ID` (`lg_TYPE_REGLEMENT_ID`),
  KEY `lg_MOTIF_REGLEMENT_ID` (`lg_MOTIF_REGLEMENT_ID`),
  KEY `lg_REGLEMENT_ID` (`lg_REGLEMENT_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `fk_caissier_cashtransactionid` (`lgUSERCAISSIERID`),
  KEY `transac_type_vent` (`str_TYPE_VENTE`),
  KEY `transac_tash_vent` (`str_TASK`),
  CONSTRAINT `fk_caissier_cashtransactionid` FOREIGN KEY (`lgUSERCAISSIERID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_cash_transaction_fk` FOREIGN KEY (`lg_REGLEMENT_ID`) REFERENCES `t_reglement` (`lg_REGLEMENT_ID`),
  CONSTRAINT `t_cash_transaction_fk1` FOREIGN KEY (`lg_MOTIF_REGLEMENT_ID`) REFERENCES `t_motif_reglement` (`lg_MOTIF_REGLEMENT_ID`),
  CONSTRAINT `t_cash_transaction_fk2` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_categorie_ayantdroit
CREATE TABLE IF NOT EXISTS `t_categorie_ayantdroit` (
  `lg_CATEGORIE_AYANTDROIT_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(10) DEFAULT NULL,
  `str_LIBELLE_CATEGORIE_AYANTDROIT` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_CATEGORIE_AYANTDROIT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_category_client
CREATE TABLE IF NOT EXISTS `t_category_client` (
  `lg_CATEGORY_CLIENT_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(100) DEFAULT NULL,
  `str_DESCRIPTION` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`lg_CATEGORY_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_centre_payeur
CREATE TABLE IF NOT EXISTS `t_centre_payeur` (
  `lg_CENTRE_PAYEUR` varchar(40) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_LIBELLE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_CENTRE_PAYEUR`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_classe_abc
CREATE TABLE IF NOT EXISTS `t_classe_abc` (
  `lg_CLASSE_ABC_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(1) NOT NULL,
  `str_LIBELLE` varchar(100) NOT NULL,
  `int_Q1` int(11) NOT NULL,
  `int_Q2` int(11) NOT NULL,
  `str_UNITE_CALCUL` varchar(20) NOT NULL DEFAULT 'SEMAINE',
  `int_Q3` int(11) NOT NULL,
  `dbl_SEUIL_CUMUL_MIN` decimal(5,2) NOT NULL,
  `dbl_SEUIL_CUMUL_MAX` decimal(5,2) NOT NULL,
  `str_STATUT` varchar(20) NOT NULL DEFAULT 'enable',
  `dt_CREATED` datetime NOT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_CLASSE_ABC_ID`),
  UNIQUE KEY `uk_classe_abc_code` (`str_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_client
CREATE TABLE IF NOT EXISTS `t_client` (
  `lg_CLIENT_ID` varchar(40) NOT NULL,
  `str_CODE_INTERNE` varchar(40) DEFAULT NULL,
  `str_FIRST_NAME` varchar(50) DEFAULT NULL,
  `str_LAST_NAME` varchar(50) DEFAULT NULL,
  `str_NUMERO_SECURITE_SOCIAL` varchar(50) DEFAULT NULL,
  `dt_NAISSANCE` datetime DEFAULT NULL,
  `str_SEXE` varchar(10) DEFAULT NULL,
  `str_ADRESSE` varchar(50) DEFAULT NULL,
  `str_DOMICILE` varchar(50) DEFAULT NULL,
  `str_AUTRE_ADRESSE` varchar(50) DEFAULT NULL,
  `str_CODE_POSTAL` varchar(50) DEFAULT NULL,
  `str_COMMENTAIRE` varchar(100) DEFAULT NULL,
  `lg_TYPE_CLIENT_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `lg_CATEGORY_CLIENT_ID` varchar(40) DEFAULT NULL,
  `lg_COMPANY_ID` varchar(40) DEFAULT NULL,
  `remise` varchar(40) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`lg_CLIENT_ID`),
  KEY `lg_VILLE_ID` (`lg_VILLE_ID`),
  KEY `lg_TYPE_CLIENT_ID` (`lg_TYPE_CLIENT_ID`),
  KEY `fk_categoryclient` (`lg_CATEGORY_CLIENT_ID`),
  KEY `t_client_fk1` (`lg_COMPANY_ID`),
  KEY `t_client_fk1_remise` (`remise`),
  CONSTRAINT `fk_categoryclient` FOREIGN KEY (`lg_CATEGORY_CLIENT_ID`) REFERENCES `t_category_client` (`lg_CATEGORY_CLIENT_ID`),
  CONSTRAINT `t_client_fk` FOREIGN KEY (`lg_TYPE_CLIENT_ID`) REFERENCES `t_type_client` (`lg_TYPE_CLIENT_ID`),
  CONSTRAINT `t_client_fk1` FOREIGN KEY (`lg_COMPANY_ID`) REFERENCES `t_company` (`lg_COMPANY_ID`),
  CONSTRAINT `t_client_fk1_remise` FOREIGN KEY (`remise`) REFERENCES `t_remise` (`lg_REMISE_ID`),
  CONSTRAINT `t_client_fk2` FOREIGN KEY (`lg_VILLE_ID`) REFERENCES `t_ville` (`lg_VILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_code_acte
CREATE TABLE IF NOT EXISTS `t_code_acte` (
  `lg_CODE_ACTE_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  `str_LIBELLEE` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_CODE_ACTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_code_gestion
CREATE TABLE IF NOT EXISTS `t_code_gestion` (
  `lg_CODE_GESTION_ID` varchar(40) NOT NULL,
  `str_CODE_BAREME` varchar(3) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `int_JOURS_COUVERTURE_STOCK` int(11) DEFAULT NULL,
  `int_MOIS_HISTORIQUE_VENTE` int(11) DEFAULT NULL,
  `int_DATE_BUTOIR_ARTICLE` int(11) DEFAULT NULL,
  `int_DATE_LIMITE_EXTRAPOLATION` int(11) DEFAULT NULL,
  `bool_OPTIMISATION_SEUIL_CMDE` tinyint(1) DEFAULT NULL,
  `int_COEFFICIENT_PONDERATION` int(11) DEFAULT 1,
  `lg_OPTIMISATION_QUANTITE_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_CODE_GESTION_ID`),
  KEY `lg_OPTIMISATION_QUANTITE_ID` (`lg_OPTIMISATION_QUANTITE_ID`),
  KEY `FK_t_code_gestion_t_user` (`lg_USER_ID`),
  CONSTRAINT `FK_t_code_gestion_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_code_gestion_fk` FOREIGN KEY (`lg_OPTIMISATION_QUANTITE_ID`) REFERENCES `t_optimisation_quantite` (`lg_OPTIMISATION_QUANTITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_code_tva
CREATE TABLE IF NOT EXISTS `t_code_tva` (
  `lg_CODE_TVA_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(20) DEFAULT NULL,
  `int_VALUE` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_CODE_TVA_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_coefficient_ponderation
CREATE TABLE IF NOT EXISTS `t_coefficient_ponderation` (
  `lg_COEFFICIENT_PONDERATION_ID` varchar(40) NOT NULL,
  `int_COEFFICIENT_PONDERATION` int(11) DEFAULT 1,
  `int_INDICE_MONTH` int(11) DEFAULT 0,
  `lg_CODE_GESTION_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_COEFFICIENT_PONDERATION_ID`),
  KEY `FK_t_coefficient_ponderation_t_code_gestion` (`lg_CODE_GESTION_ID`),
  CONSTRAINT `FK_t_coefficient_ponderation_t_code_gestion` FOREIGN KEY (`lg_CODE_GESTION_ID`) REFERENCES `t_code_gestion` (`lg_CODE_GESTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_coffre_caisse
CREATE TABLE IF NOT EXISTS `t_coffre_caisse` (
  `ID_COFFRE_CAISSE` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `ld_CREATED_BY` varchar(40) DEFAULT NULL,
  `ld_UPDATED_BY` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`ID_COFFRE_CAISSE`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_coffre_caisse_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_company
CREATE TABLE IF NOT EXISTS `t_company` (
  `lg_COMPANY_ID` varchar(40) NOT NULL,
  `str_RAISONSOCIALE` varchar(100) DEFAULT NULL,
  `str_ADRESS` varchar(200) DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  `str_CEL` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_COMPANY_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_compte_client
CREATE TABLE IF NOT EXISTS `t_compte_client` (
  `lg_COMPTE_CLIENT_ID` varchar(40) NOT NULL,
  `str_CODE_COMPTE_CLIENT` varchar(40) DEFAULT NULL,
  `str_TYPE` varchar(40) DEFAULT 'CLIENT',
  `P_KEY` varchar(40) DEFAULT NULL,
  `dbl_QUOTA_CONSO_MENSUELLE` double(12,2) DEFAULT NULL,
  `dbl_CAUTION` double(12,2) DEFAULT NULL,
  `dec_Balance` double(12,2) DEFAULT 0.00,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `lg_CLIENT_ID` varchar(40) DEFAULT '1',
  `int_COUNTER_TRANSACTION` int(11) DEFAULT 0,
  `dec_balance_Disponible` int(11) DEFAULT 0,
  `dec_Balance_InDisponible` int(11) DEFAULT 0,
  `dt_effective` datetime DEFAULT NULL,
  `dbl_PLAFOND` double(12,2) DEFAULT 0.00,
  PRIMARY KEY (`lg_COMPTE_CLIENT_ID`),
  KEY `lg_CLIENT_ID` (`lg_CLIENT_ID`),
  CONSTRAINT `t_compte_client_fk` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_compte_client_tiers_payant
CREATE TABLE IF NOT EXISTS `t_compte_client_tiers_payant` (
  `lg_COMPTE_CLIENT_TIERS_PAYANT_ID` varchar(40) NOT NULL,
  `lg_COMPTE_CLIENT_ID` varchar(40) NOT NULL,
  `lg_TIERS_PAYANT_ID` varchar(40) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `int_POURCENTAGE` int(11) DEFAULT 100,
  `int_PRIORITY` int(11) DEFAULT 1,
  `b_IS_RO` tinyint(1) DEFAULT 0,
  `b_IS_RC1` tinyint(1) DEFAULT 0,
  `b_IS_RC2` tinyint(1) DEFAULT 0,
  `dbl_PLAFOND` double(11,0) DEFAULT 0,
  `dbl_QUOTA_CONSO_MENSUELLE` int(11) DEFAULT 0,
  `dbl_QUOTA_CONSO_VENTE` double(11,0) DEFAULT 0,
  `str_NUMERO_SECURITE_SOCIAL` varchar(50) DEFAULT '',
  `db_PLAFOND_ENCOURS` int(11) unsigned DEFAULT 0,
  `db_CONSOMMATION_MENSUELLE` int(11) DEFAULT 0,
  `b_IsAbsolute` tinyint(1) DEFAULT 0,
  `b_CANBEUSE` tinyint(1) DEFAULT 1 COMMENT 'On verifie si le plfond du client n''est pas atteint',
  `isCapped` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`),
  UNIQUE KEY `un_compte_client_tp` (`lg_COMPTE_CLIENT_ID`,`lg_TIERS_PAYANT_ID`),
  KEY `lg_TIERS_PAYANT_ID` (`lg_TIERS_PAYANT_ID`),
  KEY `lg_COMPTE_CLIENT_ID` (`lg_COMPTE_CLIENT_ID`),
  CONSTRAINT `t_client_tiers_payant_Tiers_payant_fk` FOREIGN KEY (`lg_TIERS_PAYANT_ID`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `t_compte_client_tiers_payant_fk` FOREIGN KEY (`lg_COMPTE_CLIENT_ID`) REFERENCES `t_compte_client` (`lg_COMPTE_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_contencieux
CREATE TABLE IF NOT EXISTS `t_contencieux` (
  `lg_CONTENCIEUX_ID` varchar(40) NOT NULL,
  `lg_TYPECONTENCIEUX_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(100) NOT NULL,
  `str_REF` varchar(100) NOT NULL,
  `str_DESCRIPTION` varchar(100) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_CONTENCIEUX_ID`),
  KEY `lg_TYPECONTENCIEUX_ID` (`lg_TYPECONTENCIEUX_ID`),
  CONSTRAINT `t_contencieux_fk` FOREIGN KEY (`lg_TYPECONTENCIEUX_ID`) REFERENCES `t_typecontencieux` (`lg_TYPECONTENCIEUX_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_contre_indication
CREATE TABLE IF NOT EXISTS `t_contre_indication` (
  `lg_CONTRE_INDICATION_ID` varchar(40) NOT NULL,
  `str_CODE_CONTRE_INDICATION` varchar(40) DEFAULT NULL,
  `str_LIBELLE_CONTRE_INDICATION` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_CONTRE_INDICATION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_dci
CREATE TABLE IF NOT EXISTS `t_dci` (
  `lg_DCI_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_DCI_ID`),
  UNIQUE KEY `str_CODE` (`str_CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_deconditionnement
CREATE TABLE IF NOT EXISTS `t_deconditionnement` (
  `lg_DECONDITIONNEMENT_ID` varchar(40) NOT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT 0,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) NOT NULL,
  PRIMARY KEY (`lg_DECONDITIONNEMENT_ID`),
  KEY `FK_t_deconditionnement_t_famille` (`lg_FAMILLE_ID`),
  KEY `FK_t_deconditionnement_t_user` (`lg_USER_ID`),
  CONSTRAINT `FK_t_deconditionnement_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_deconditionnement_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_depenses
CREATE TABLE IF NOT EXISTS `t_depenses` (
  `ID_DEPENSE` varchar(40) NOT NULL,
  `lg_TYPE_DEPENSE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `str_CREATED_BY` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_UPDATED_BY` varchar(40) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `str_DESCRIPTION` varchar(2000) DEFAULT NULL,
  `str_REF_FACTURE` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`ID_DEPENSE`),
  KEY `lg_TYPE_DEPENSE_ID` (`lg_TYPE_DEPENSE_ID`),
  CONSTRAINT `t_depenses_fk` FOREIGN KEY (`lg_TYPE_DEPENSE_ID`) REFERENCES `t_type_depense` (`lg_TYPE_DEPENSE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_devise
CREATE TABLE IF NOT EXISTS `t_devise` (
  `lg_DEVISE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT 'Fr',
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `int_TAUX` double DEFAULT 0,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_DEVISE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_dossier_facture
CREATE TABLE IF NOT EXISTS `t_dossier_facture` (
  `lg_DOSSIER_FACTURE_ID` varchar(40) NOT NULL,
  `str_NUM_DOSSIER` varchar(40) DEFAULT NULL,
  `dbl_MONTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_REGLE` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `str_TIERS_PAYANT` varchar(40) DEFAULT NULL,
  `int_NB_TRANSACT` int(11) DEFAULT NULL,
  `str_CUSTOMER` varchar(40) DEFAULT NULL,
  `str_LAST_REF_REGLEMENT_DOSSIER` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `dt_DATE` date DEFAULT NULL,
  `b_IS_CONFLIT` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`lg_DOSSIER_FACTURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_dossier_reglement
CREATE TABLE IF NOT EXISTS `t_dossier_reglement` (
  `lg_DOSSIER_REGLEMENT_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(40) DEFAULT NULL,
  `str_NATURE_DOSSIER` varchar(40) DEFAULT NULL,
  `dbl_AMOUNT` double(15,3) DEFAULT 0.000,
  `str_ORGANISME_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `lg_FACTURE_ID` varchar(20) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `dbl_MONTANT_ATTENDU` double(15,0) DEFAULT 0,
  `dt_REGLEMENT` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_DOSSIER_REGLEMENT_ID`),
  KEY `lg_FACTURE_ID` (`lg_FACTURE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `ix_dossier_reglement_dt_created` (`dt_CREATED`),
  CONSTRAINT `t_dossier_reglement_fk1` FOREIGN KEY (`lg_FACTURE_ID`) REFERENCES `t_facture` (`lg_FACTURE_ID`),
  CONSTRAINT `t_dossier_reglement_fk2` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_dossier_reglement_detail
CREATE TABLE IF NOT EXISTS `t_dossier_reglement_detail` (
  `lg_DOSSIER_REGLEMENT_DETAIL_ID` varchar(40) NOT NULL,
  `lg_DOSSIER_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `str_REF` varchar(40) DEFAULT NULL,
  `dbl_AMOUNT` double(15,3) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `lg_FACTURE_DETAIL_ID` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_DOSSIER_REGLEMENT_DETAIL_ID`),
  KEY `lg_DOSSIER_REGLEMENT_ID` (`lg_DOSSIER_REGLEMENT_ID`),
  KEY `lg_FACTURE_DETAIL_ID` (`lg_FACTURE_DETAIL_ID`),
  CONSTRAINT `t_dossier_reglement_detail_fk` FOREIGN KEY (`lg_DOSSIER_REGLEMENT_ID`) REFERENCES `t_dossier_reglement` (`lg_DOSSIER_REGLEMENT_ID`),
  CONSTRAINT `t_dossier_reglement_detail_fk1` FOREIGN KEY (`lg_FACTURE_DETAIL_ID`) REFERENCES `t_facture_detail` (`lg_FACTURE_DETAIL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_dossier_tiers_payant
CREATE TABLE IF NOT EXISTS `t_dossier_tiers_payant` (
  `lg_DOSSIER_TIERS_PAYANT_ID` varchar(40) NOT NULL,
  `str_NUMERO_TRI` varchar(40) DEFAULT NULL,
  `str_LIBELLE_DOSSIER` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_DOSSIER_TIERS_PAYANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_emplacement
CREATE TABLE IF NOT EXISTS `t_emplacement` (
  `lg_EMPLACEMENT_ID` varchar(40) NOT NULL,
  `lg_COMPTE_CLIENT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_DESCRIPTION` text DEFAULT NULL,
  `str_LOCALITE` text DEFAULT NULL,
  `str_FIRST_NAME` varchar(50) DEFAULT NULL,
  `str_LAST_NAME` varchar(50) DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `lg_TYPEDEPOT_ID` varchar(40) NOT NULL,
  `bool_SAME_LOCATION` tinyint(1) DEFAULT 0,
  `str_REF` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`lg_EMPLACEMENT_ID`),
  KEY `FK_t_emplacement_t_compte_client` (`lg_COMPTE_CLIENT_ID`),
  KEY `FK_t_emplacement_t_typedepot` (`lg_TYPEDEPOT_ID`),
  CONSTRAINT `FK_t_emplacement_t_compte_client` FOREIGN KEY (`lg_COMPTE_CLIENT_ID`) REFERENCES `t_compte_client` (`lg_COMPTE_CLIENT_ID`),
  CONSTRAINT `FK_t_emplacement_t_typedepot` FOREIGN KEY (`lg_TYPEDEPOT_ID`) REFERENCES `t_typedepot` (`lg_TYPEDEPOT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_escompte_societe
CREATE TABLE IF NOT EXISTS `t_escompte_societe` (
  `lg_ESCOMPTE_SOCIETE_ID` varchar(40) NOT NULL,
  `int_CODE_ESCOMPTE_SOCIETE` int(11) DEFAULT NULL,
  `str_LIBELLE_ESCOMPTE_SOCIETE` varchar(50) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_ESCOMPTE_SOCIETE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_escompte_societe_tranche
CREATE TABLE IF NOT EXISTS `t_escompte_societe_tranche` (
  `lg_ESCOMPTE_SOCIETE_TRANCHE_ID` varchar(40) NOT NULL,
  `lg_ESCOMPTE_SOCIETE_ID` varchar(40) DEFAULT NULL,
  `lg_TRANCHE_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_ESCOMPTE_SOCIETE_TRANCHE_ID`),
  KEY `lg_ESCOMPTE_SOCIETE_ID` (`lg_ESCOMPTE_SOCIETE_ID`),
  KEY `lg_TRANCHE_ID` (`lg_TRANCHE_ID`),
  CONSTRAINT `t_escompte_societe_tranche_fk` FOREIGN KEY (`lg_ESCOMPTE_SOCIETE_ID`) REFERENCES `t_escompte_societe` (`lg_ESCOMPTE_SOCIETE_ID`),
  CONSTRAINT `t_escompte_societe_tranche_fk1` FOREIGN KEY (`lg_TRANCHE_ID`) REFERENCES `t_tranche` (`lg_TRANCHE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_etat_article
CREATE TABLE IF NOT EXISTS `t_etat_article` (
  `lg_ETAT_ARTICLE_ID` varchar(20) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_LIBELLEE` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_ETAT_ARTICLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_etiquette
CREATE TABLE IF NOT EXISTS `t_etiquette` (
  `lg_ETIQUETTE_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(100) DEFAULT NULL,
  `str_NAME` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `int_NUMBER` varchar(40) DEFAULT '0/0',
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_TYPEETIQUETTE_ID` varchar(40) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `dt_PEROMPTION` datetime DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT '1',
  PRIMARY KEY (`lg_ETIQUETTE_ID`),
  KEY `lg_TYPEETIQUETTE_ID` (`lg_TYPEETIQUETTE_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `FK_t_etiquette_t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_etiquette_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `t_etiquette_fk` FOREIGN KEY (`lg_TYPEETIQUETTE_ID`) REFERENCES `t_typeetiquette` (`lg_TYPEETIQUETTE_ID`),
  CONSTRAINT `t_etiquette_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_evaluationoffreprix
CREATE TABLE IF NOT EXISTS `t_evaluationoffreprix` (
  `lg_EVALUATIONOFFREPRIX_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `int_NUMBER_GRATUIT` int(11) DEFAULT NULL,
  `int_PRICE_OFFRE` int(11) DEFAULT NULL,
  `int_MOIS_LIQUIDATION` int(11) DEFAULT NULL,
  `int_QTE_PRODUCT_VENDU` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_EVALUATIONOFFREPRIX_ID`),
  KEY `FK_t_evaluationoffreprix_t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_evaluationoffreprix_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_event_log
CREATE TABLE IF NOT EXISTS `t_event_log` (
  `lg_EVENT_LOG_ID` varchar(40) NOT NULL,
  `MATRICULE_ELEVE` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_DESCRIPTION` varchar(2000) DEFAULT NULL,
  `str_CREATED_BY` mediumtext DEFAULT NULL,
  `str_UPDATED_BY` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_TABLE_CONCERN` varchar(40) DEFAULT NULL,
  `str_MODULE_CONCERN` varchar(40) DEFAULT NULL,
  `str_TYPE_LOG` varchar(254) DEFAULT 'DEFAULT',
  `lg_USER_ID` varchar(20) DEFAULT NULL,
  `typeLog` int(2) DEFAULT NULL,
  `remote_host` varchar(200) DEFAULT NULL,
  `remote_addr` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`lg_EVENT_LOG_ID`),
  KEY `t_event_log_fk1` (`lg_USER_ID`),
  CONSTRAINT `t_event_log_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_fabriquant
CREATE TABLE IF NOT EXISTS `t_fabriquant` (
  `lg_FABRIQUANT_ID` varchar(20) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(100) DEFAULT NULL,
  `str_ADRESSE` varchar(40) DEFAULT NULL,
  `str_TELEPHONE` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_FABRIQUANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_facture
CREATE TABLE IF NOT EXISTS `t_facture` (
  `lg_FACTURE_ID` varchar(40) NOT NULL,
  `dt_DATE_FACTURE` datetime DEFAULT NULL,
  `dbl_MONTANT_CMDE` double(15,3) DEFAULT NULL,
  `str_CODE_FACTURE` varchar(40) DEFAULT NULL,
  `str_CODE_COMPTABLE` varchar(40) DEFAULT NULL,
  `dbl_MONTANT_PAYE` double(15,3) DEFAULT NULL,
  `dt_DEBUT_FACTURE` datetime DEFAULT NULL,
  `int_NB_DOSSIER` int(11) DEFAULT NULL,
  `dt_FIN_FACTURE` datetime DEFAULT NULL,
  `str_CUSTOMER` varchar(40) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_PERE` varchar(40) DEFAULT NULL,
  `lg_TYPE_FACTURE_ID` varchar(40) DEFAULT NULL,
  `dbl_MONTANT_REMISE` decimal(15,3) unsigned DEFAULT 0.000,
  `dbl_MONTANT_FOFETAIRE` decimal(15,3) unsigned DEFAULT 0.000,
  `dbl_MONTANT_Brut` decimal(15,3) DEFAULT 0.000,
  `template` bit(1) DEFAULT b'0',
  `tiersPayant` varchar(40) DEFAULT NULL,
  `montantTvaVente` int(10) DEFAULT 0,
  `montantRemiseVente` int(10) DEFAULT 0,
  `montantVente` int(10) DEFAULT 0,
  `type_facture` int(3) DEFAULT NULL,
  `type_facture_id` varchar(50) DEFAULT NULL,
  `groupeTp_id` mediumint(9) DEFAULT NULL,
  `fne_url` varchar(500) DEFAULT NULL,
  `fne_avoir_reference` varchar(70) DEFAULT NULL,
  `fne_avoir_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`lg_FACTURE_ID`),
  KEY `lg_TYPE_FACTURE_ID` (`lg_TYPE_FACTURE_ID`),
  KEY `fk_t_tiersPayant` (`tiersPayant`),
  KEY `idx_facture_dt_created` (`dt_CREATED`,`str_CODE_FACTURE`) USING BTREE,
  CONSTRAINT `fk_t_tiersPayant` FOREIGN KEY (`tiersPayant`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `t_facture_fk` FOREIGN KEY (`lg_TYPE_FACTURE_ID`) REFERENCES `t_type_facture` (`lg_TYPE_FACTURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_facture_detail
CREATE TABLE IF NOT EXISTS `t_facture_detail` (
  `lg_FACTURE_DETAIL_ID` varchar(40) NOT NULL,
  `str_REF` varchar(40) DEFAULT NULL,
  `str_REF_DESCRIPTION` text DEFAULT NULL,
  `dbl_MONTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_PAYE` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `lg_FACTURE_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `P_KEY` varchar(40) DEFAULT NULL,
  `str_FIRST_NAME_CUSTOMER` varchar(70) DEFAULT NULL,
  `str_LAST_NAME_CUSTOMER` varchar(70) DEFAULT NULL,
  `str_NUMERO_SECURITE_SOCIAL` varchar(50) DEFAULT NULL,
  `dbl_MONTANT_Brut` decimal(15,3) DEFAULT 0.000,
  `dbl_MONTANT_REMISE` decimal(15,3) unsigned DEFAULT 0.000,
  `str_CATEGORY_CLIENT` varchar(100) DEFAULT '',
  `lg_CLIENT_ID` varchar(40) DEFAULT NULL,
  `lg_AYANTS_DROITS_ID` varchar(40) DEFAULT NULL,
  `montantTvaVente` int(10) DEFAULT 0,
  `montantRemiseVente` int(10) DEFAULT 0,
  `montantVente` int(10) DEFAULT 0,
  `dateOperation` datetime DEFAULT NULL,
  `taux` int(3) DEFAULT NULL,
  PRIMARY KEY (`lg_FACTURE_DETAIL_ID`),
  KEY `lg_FACTURE_ID` (`lg_FACTURE_ID`),
  KEY `fk_t_facture_detail_ayant` (`lg_AYANTS_DROITS_ID`),
  KEY `fk_t_facture_detail_client` (`lg_CLIENT_ID`),
  CONSTRAINT `fk_t_facture_detail_ayant` FOREIGN KEY (`lg_AYANTS_DROITS_ID`) REFERENCES `t_ayant_droit` (`lg_AYANTS_DROITS_ID`),
  CONSTRAINT `fk_t_facture_detail_client` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`),
  CONSTRAINT `t_facture_detail_fk` FOREIGN KEY (`lg_FACTURE_ID`) REFERENCES `t_facture` (`lg_FACTURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille
CREATE TABLE IF NOT EXISTS `t_famille` (
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_PARENT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(60) DEFAULT NULL,
  `str_DESCRIPTION` varchar(60) DEFAULT NULL,
  `lg_CODE_ACTE_ID` varchar(20) DEFAULT '0',
  `lg_TYPEETIQUETTE_ID` varchar(40) DEFAULT NULL,
  `str_CODE_REMISE` varchar(2) DEFAULT NULL,
  `lg_CODE_GESTION_ID` varchar(40) DEFAULT NULL,
  `str_CODE_TAUX_REMBOURSEMENT` varchar(20) DEFAULT '0',
  `int_PRICE` int(11) DEFAULT 0,
  `int_PRICE_TIPS` int(11) DEFAULT 0,
  `int_TAUX_MARQUE` int(11) DEFAULT 0,
  `int_CIP` varchar(20) DEFAULT NULL,
  `int_CIP2` varchar(20) DEFAULT NULL,
  `int_CIP3` varchar(20) DEFAULT NULL,
  `int_CIP4` varchar(20) DEFAULT NULL,
  `int_EAN13` varchar(50) DEFAULT '0',
  `int_S` int(11) DEFAULT 0,
  `int_T` varchar(20) DEFAULT '',
  `int_PAF` int(11) DEFAULT 0,
  `int_PAT` int(11) DEFAULT 0,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `lg_FAMILLEARTICLE_ID` varchar(40) DEFAULT NULL,
  `lg_ZONE_GEO_ID` varchar(40) DEFAULT '0',
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_SEUIL_MIN` int(11) DEFAULT 0,
  `int_STOCK_REAPROVISONEMENT` int(11) DEFAULT 0,
  `int_SEUIL_MAX` int(11) DEFAULT 0,
  `int_DAY_HISTORY` int(11) DEFAULT 0,
  `lg_FORME_ID` varchar(20) DEFAULT '0',
  `lg_FABRIQUANT_ID` varchar(20) DEFAULT '0',
  `dbl_LAST_PRIX_ACHAT` double(15,2) DEFAULT 0.00,
  `dbl_MARGE` double(15,3) DEFAULT 0.000,
  `dbl_MARGE_BRUTE` double(15,3) DEFAULT 0.000,
  `dbl_TAUX_MARGE` double(15,3) DEFAULT 0.000,
  `dbl_PRIX_MOYEN_PONDERE` double(15,3) DEFAULT 0.000,
  `str_CODE_TABLEAU` varchar(20) DEFAULT NULL,
  `lg_ETAT_ARTICLE_ID` varchar(20) DEFAULT '0',
  `bool_RESERVE` tinyint(1) DEFAULT 0,
  `bool_ETIQUETTE` tinyint(4) DEFAULT 0,
  `bool_DECONDITIONNE` tinyint(4) DEFAULT 0,
  `bool_DECONDITIONNE_EXIST` tinyint(4) DEFAULT 0,
  `int_UNITE_ACHAT` int(11) DEFAULT 0,
  `dbl_CONTENANCE_1000` double(15,3) DEFAULT 0.000,
  `dt_PEREMPTION` datetime DEFAULT NULL,
  `int_COMPTEUR_PEREMPTION` int(11) DEFAULT 0,
  `dt_DATE_LAST_ENTREE` datetime DEFAULT NULL,
  `dt_DATE_LAST_SORTIE` datetime DEFAULT NULL,
  `int_SEUIL_RESERVE` int(11) DEFAULT 0,
  `int_NOMBRE_VENTES` int(11) DEFAULT 0,
  `int_QTE_MANQUANTE` int(11) DEFAULT 0,
  `int_QTE_RESERVEE` int(11) DEFAULT 0,
  `int_NUMBERDETAIL` int(11) DEFAULT 0,
  `int_SEUILDETAIL` int(11) DEFAULT 0,
  `int_UNITE_VENTE` int(11) DEFAULT 0,
  `dbl_COEF_SECURITE` double(15,3) DEFAULT 0.000,
  `int_QTE_REAPPROVISIONNEMENT` int(11) DEFAULT 0,
  `lg_INDICATEUR_REAPPROVISIONNEMENT_ID` varchar(20) DEFAULT '0',
  `int_DATE_BUTOIR` int(11) DEFAULT 0,
  `int_DELAI_REAPPRO` int(11) DEFAULT 0,
  `int_CONSO_MOIS` int(11) DEFAULT 0,
  `int_NBRE_UNITE_LAST_VENTE` int(11) DEFAULT 0,
  `int_NBRE_SORTIE` int(11) DEFAULT 0,
  `int_QTE_SORTIE` int(11) DEFAULT 0,
  `int_MOY_VENTE` int(11) DEFAULT 0,
  `lg_CODE_TVA_ID` varchar(40) DEFAULT '0',
  `dt_LAST_INVENTAIRE` datetime DEFAULT NULL,
  `lg_REMISE_ID` varchar(40) DEFAULT '1',
  `int_IDS` int(11) DEFAULT 1,
  `bl_PROMOTED` tinyint(1) DEFAULT 0,
  `bool_CHECKEXPIRATIONDATE` tinyint(1) DEFAULT 1,
  `dt_LAST_UPDATE_SEUILREAPPRO` datetime DEFAULT NULL,
  `dt_LAST_MOUVEMENT` datetime DEFAULT NULL,
  `b_CODEINDICATEUR` smallint(1) DEFAULT 0 COMMENT '- si le code 0 : le produit n''est pas dans une suggession donc on peut le suggerer a nouveau.\r\n- Si 1 : le produit est deja dans une suggession donc ne doit pas ?┬¼tre prit en compte dans la suggestion auto',
  `int_ORERSTATUS` smallint(1) unsigned DEFAULT 0,
  `bool_ACCOUNT` tinyint(1) DEFAULT 1,
  `VERSION` int(11) DEFAULT 0,
  `gamme_id` varchar(255) DEFAULT NULL,
  `laboratoire_id` varchar(255) DEFAULT NULL,
  `is_scheduled` tinyint(1) DEFAULT 0,
  `cmu_price` int(8) DEFAULT NULL,
  `code_ean_fabriquant` varchar(40) DEFAULT NULL,
  `int_SEUIL_MINI_RAYON` int(11) DEFAULT NULL,
  `lg_CLASSE_ABC_ID` varchar(40) DEFAULT NULL,
  `str_CODE_GEO_ARTICLE` varchar(50) DEFAULT NULL,
  `dt_UPDATED_CLASSE_ABC` datetime DEFAULT NULL,
  `bool_CALCUL_SEUIL` tinyint(1) DEFAULT 1,
  `bool_SUGGERABLE` tinyint(1) DEFAULT 1,
  `bool_REMISE` tinyint(1) DEFAULT 1,
  `int_Q1_SEUIL_REAPPRO` int(11) DEFAULT NULL,
  `int_Q2_QTE_REAPPRO` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_FAMILLE_ID`),
  UNIQUE KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_FAMILLEARTICLE_ID` (`lg_FAMILLEARTICLE_ID`),
  KEY `lg_CODE_ACTE_ID` (`lg_CODE_ACTE_ID`),
  KEY `lg_CODE_GESTION_ID` (`lg_CODE_GESTION_ID`),
  KEY `lg_ZONE_GEO_ID` (`lg_ZONE_GEO_ID`),
  KEY `lg_FORME_ID` (`lg_FORME_ID`),
  KEY `lg_FABRIQUANT_ID` (`lg_FABRIQUANT_ID`),
  KEY `lg_INDICATEUR_REAPPROVISIONNEMENT_ID` (`lg_INDICATEUR_REAPPROVISIONNEMENT_ID`),
  KEY `lg_TYPEETIQUETTE_ID` (`lg_TYPEETIQUETTE_ID`),
  KEY `lg_REMISE_ID` (`lg_REMISE_ID`),
  KEY `FK_t_famille_t_code_tva` (`lg_CODE_TVA_ID`),
  KEY `t_famille_Str_name` (`str_NAME`) USING BTREE,
  KEY `t_famille_int_CIP` (`int_CIP`) USING BTREE,
  KEY `t_famille_str_Desc` (`str_DESCRIPTION`) USING BTREE,
  KEY `t_famille_intEAN` (`int_EAN13`) USING BTREE,
  KEY `FKm9t4vnhaxp6colb0896x9humg` (`gamme_id`),
  KEY `FKs6egbrcb35ecmnmclm1tly2qo` (`laboratoire_id`),
  KEY `idx_tf_famillearticle` (`lg_FAMILLEARTICLE_ID`),
  KEY `idx_famille_eval_vente_cip` (`str_STATUT`,`int_CIP`,`lg_FAMILLE_ID`) USING BTREE,
  KEY `idx_famille_eval_vente_famille_article` (`str_STATUT`,`lg_FAMILLEARTICLE_ID`,`str_NAME`,`lg_FAMILLE_ID`) USING BTREE,
  KEY `idx_famille_eval_vente_name` (`str_STATUT`,`str_NAME`,`lg_FAMILLE_ID`) USING BTREE,
  KEY `idx_famille_eval_vente_zone_geo` (`str_STATUT`,`lg_ZONE_GEO_ID`,`str_NAME`,`lg_FAMILLE_ID`) USING BTREE,
  CONSTRAINT `FK_t_famille_t_code_tva` FOREIGN KEY (`lg_CODE_TVA_ID`) REFERENCES `t_code_tva` (`lg_CODE_TVA_ID`),
  CONSTRAINT `FKm9t4vnhaxp6colb0896x9humg` FOREIGN KEY (`gamme_id`) REFERENCES `gamme_produit` (`id`),
  CONSTRAINT `FKs6egbrcb35ecmnmclm1tly2qo` FOREIGN KEY (`laboratoire_id`) REFERENCES `laboratoire` (`id`),
  CONSTRAINT `t_famille_fk` FOREIGN KEY (`lg_CODE_ACTE_ID`) REFERENCES `t_code_acte` (`lg_CODE_ACTE_ID`),
  CONSTRAINT `t_famille_fk1` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_famille_fk2` FOREIGN KEY (`lg_FAMILLEARTICLE_ID`) REFERENCES `t_famillearticle` (`lg_FAMILLEARTICLE_ID`),
  CONSTRAINT `t_famille_fk3` FOREIGN KEY (`lg_CODE_GESTION_ID`) REFERENCES `t_code_gestion` (`lg_CODE_GESTION_ID`),
  CONSTRAINT `t_famille_fk4` FOREIGN KEY (`lg_ZONE_GEO_ID`) REFERENCES `t_zone_geographique` (`lg_ZONE_GEO_ID`),
  CONSTRAINT `t_famille_fk5` FOREIGN KEY (`lg_FORME_ID`) REFERENCES `t_forme_article` (`lg_FORME_ARTICLE_ID`),
  CONSTRAINT `t_famille_fk6` FOREIGN KEY (`lg_FABRIQUANT_ID`) REFERENCES `t_fabriquant` (`lg_FABRIQUANT_ID`),
  CONSTRAINT `t_famille_fk7` FOREIGN KEY (`lg_TYPEETIQUETTE_ID`) REFERENCES `t_typeetiquette` (`lg_TYPEETIQUETTE_ID`),
  CONSTRAINT `t_famille_fk8` FOREIGN KEY (`lg_REMISE_ID`) REFERENCES `t_remise` (`lg_REMISE_ID`),
  CONSTRAINT `t_famille_fk9` FOREIGN KEY (`lg_INDICATEUR_REAPPROVISIONNEMENT_ID`) REFERENCES `t_indicateur_reapprovisionnement` (`lg_INDICATEUR_REAPPROVISIONNEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 STATS_SAMPLE_PAGES=64 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille_dci
CREATE TABLE IF NOT EXISTS `t_famille_dci` (
  `lg_FAMILLE_DCI_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `lg_DCI_ID` varchar(40) NOT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_FAMILLE_DCI_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `t_famille_dci_fk1` (`lg_DCI_ID`),
  CONSTRAINT `t_famille_dci_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_famille_dci_fk1` FOREIGN KEY (`lg_DCI_ID`) REFERENCES `t_dci` (`lg_DCI_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille_grossiste
CREATE TABLE IF NOT EXISTS `t_famille_grossiste` (
  `lg_FAMILLE_GROSSISTE_ID` varchar(40) NOT NULL,
  `lg_GROSSISTE_ID` varchar(40) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `str_CODE_ARTICLE` varchar(20) DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT NULL,
  `bl_RUPTURE` tinyint(1) DEFAULT 0,
  `dt_RUPTURE` datetime DEFAULT NULL,
  `int_NBRE_RUPTURE` int(11) DEFAULT 0,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_PAF` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_FAMILLE_GROSSISTE_ID`),
  UNIQUE KEY `un_gros_ci` (`lg_FAMILLE_ID`,`str_CODE_ARTICLE`,`lg_GROSSISTE_ID`),
  KEY `FK_t_famille_grossiste_t_grossiste` (`lg_GROSSISTE_ID`),
  KEY `FK_t_famille_grossiste_t_famille` (`lg_FAMILLE_ID`),
  KEY `t_famille_grossiste_str_STATUT` (`str_STATUT`) USING BTREE,
  CONSTRAINT `FK_t_famille_grossiste_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_famille_grossiste_t_grossiste` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 STATS_SAMPLE_PAGES=64;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille_history
CREATE TABLE IF NOT EXISTS `t_famille_history` (
  `lg_ID` int(11) NOT NULL AUTO_INCREMENT,
  `lg_FAMILLE_ID` varchar(30) NOT NULL,
  `int_PRICE` int(11) DEFAULT NULL,
  `int_PRICE_TIPS` int(11) DEFAULT NULL,
  `int_PAF` int(11) DEFAULT NULL,
  `int_PAT` int(11) DEFAULT NULL,
  `int_TAUX_MARQUE` int(11) DEFAULT NULL,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  UNIQUE KEY `lg_ID` (`lg_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=1051073 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille_stock
CREATE TABLE IF NOT EXISTS `t_famille_stock` (
  `lg_FAMILLE_STOCK_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_NUMBER` int(11) DEFAULT 0,
  `int_NUMBER_AVAILABLE` int(11) DEFAULT 0,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_UG` int(6) unsigned DEFAULT 0,
  `VERSION` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_FAMILLE_STOCK_ID`),
  UNIQUE KEY `un_stock_emp` (`lg_FAMILLE_ID`,`lg_EMPLACEMENT_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `FK_t_famille_stock_t_emplacement` (`lg_EMPLACEMENT_ID`),
  KEY `t_famille_stock_idx1` (`str_STATUT`),
  KEY `idx_famille_stock_famille_emplacement` (`lg_FAMILLE_ID`,`lg_EMPLACEMENT_ID`) USING BTREE,
  KEY `idx_famille_stock_eval_vente` (`lg_FAMILLE_ID`,`lg_EMPLACEMENT_ID`,`str_STATUT`,`int_NUMBER_AVAILABLE`) USING BTREE,
  CONSTRAINT `FK_t_famille_stock_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `t_famille_stock_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 STATS_SAMPLE_PAGES=64 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille_stockretrocession
CREATE TABLE IF NOT EXISTS `t_famille_stockretrocession` (
  `lg_FAMILLE_STOCKRETROCESSION_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `int_NUMBER_AVAILABLE` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_FAMILLE_STOCKRETROCESSION_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_famille_stockretrocession_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famille_zonegeo
CREATE TABLE IF NOT EXISTS `t_famille_zonegeo` (
  `lg_FAMILLE_ZONEGEO_ID` varchar(40) NOT NULL,
  `lg_ZONE_GEO_ID` varchar(40) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_FAMILLE_ZONEGEO_ID`),
  KEY `FK_t_famille_zonegeo_t_zone_geographique` (`lg_ZONE_GEO_ID`),
  KEY `FK_t_famille_zonegeo_t_famille` (`lg_FAMILLE_ID`),
  KEY `FK_t_famille_zonegeo_t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_famille_zonegeo_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_famille_zonegeo_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_famille_zonegeo_t_zone_geographique` FOREIGN KEY (`lg_ZONE_GEO_ID`) REFERENCES `t_zone_geographique` (`lg_ZONE_GEO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_famillearticle
CREATE TABLE IF NOT EXISTS `t_famillearticle` (
  `lg_FAMILLEARTICLE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(50) DEFAULT NULL,
  `str_CODE_FAMILLE` varchar(40) DEFAULT NULL,
  `str_COMMENTAIRE` text DEFAULT NULL,
  `lg_GROUPE_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_FAMILLEARTICLE_ID`),
  UNIQUE KEY `lg_ARTICLE_ID` (`lg_FAMILLEARTICLE_ID`),
  UNIQUE KEY `lg_FAMILLEARTICLE_ID` (`lg_FAMILLEARTICLE_ID`),
  UNIQUE KEY `lg_FAMILLEARTICLE_ID_2` (`lg_FAMILLEARTICLE_ID`),
  KEY `lg_GROUPE_FAMILLE_ID` (`lg_GROUPE_FAMILLE_ID`),
  KEY `idx_tfa_code_libelle` (`str_CODE_FAMILLE`,`str_LIBELLE`),
  CONSTRAINT `t_famillearticle_fk` FOREIGN KEY (`lg_GROUPE_FAMILLE_ID`) REFERENCES `t_groupe_famille` (`lg_GROUPE_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_fiche_societe
CREATE TABLE IF NOT EXISTS `t_fiche_societe` (
  `lg_FICHE_SOCIETE_ID` varchar(40) NOT NULL,
  `str_CODE_INTERNE` varchar(40) DEFAULT NULL,
  `str_LIBELLE_ENTREPRISE` varchar(100) DEFAULT NULL,
  `str_TYPE_SOCIETE` varchar(100) DEFAULT NULL,
  `str_CODE_REGROUPEMENT` varchar(40) DEFAULT NULL,
  `str_CONTACTS_TELEPHONIQUES` varchar(50) DEFAULT NULL,
  `str_COMPTE_COMPTABLE` varchar(50) DEFAULT NULL,
  `dbl_CHIFFRE_AFFAIRE` double(13,3) DEFAULT NULL,
  `str_DOMICIALIATION_BANCAIRE` varchar(50) DEFAULT NULL,
  `str_RIB_SOCIETE` varchar(50) DEFAULT NULL,
  `str_CODE_EXONERATION_TVA` varchar(40) DEFAULT NULL,
  `str_CODE_REMISE` varchar(40) DEFAULT NULL,
  `bool_CLIENT_EN_COMPTE` tinyint(1) DEFAULT NULL,
  `bool_LIVRE` tinyint(1) DEFAULT NULL,
  `dbl_REMISE_SUPPLEMENTAIRE` double(13,3) DEFAULT NULL,
  `dbl_MONTANT_PORT` double(13,3) DEFAULT NULL,
  `int_ECHEANCE_PAIEMENT` int(10) DEFAULT NULL,
  `bool_EDIT_FACTION_FIN_VENTE` tinyint(1) DEFAULT NULL,
  `str_CODE_FACTURE` varchar(40) DEFAULT NULL,
  `str_CODE_BON_LIVRAISON` varchar(40) DEFAULT NULL,
  `str_RAISON_SOCIALE` varchar(50) DEFAULT NULL,
  `str_ADRESSE_PRINCIPALE` varchar(50) DEFAULT NULL,
  `str_AUTRE_ADRESSE` varchar(50) DEFAULT NULL,
  `str_CODE_POSTAL` varchar(50) DEFAULT NULL,
  `str_BUREAU_DISTRIBUTEUR` varchar(100) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `lg_ESCOMPTE_SOCIETE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_FICHE_SOCIETE_ID`),
  KEY `lg_VILLE_ID` (`lg_VILLE_ID`),
  KEY `lg_ESCOMPTE_SOCIETE_ID` (`lg_ESCOMPTE_SOCIETE_ID`),
  CONSTRAINT `t_fiche_societe_fk` FOREIGN KEY (`lg_VILLE_ID`) REFERENCES `t_ville` (`lg_VILLE_ID`),
  CONSTRAINT `t_fiche_societe_fk1` FOREIGN KEY (`lg_ESCOMPTE_SOCIETE_ID`) REFERENCES `t_escompte_societe` (`lg_ESCOMPTE_SOCIETE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_forme_article
CREATE TABLE IF NOT EXISTS `t_forme_article` (
  `lg_FORME_ARTICLE_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_LIBELLE` varchar(30) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_FORME_ARTICLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_grille_remise
CREATE TABLE IF NOT EXISTS `t_grille_remise` (
  `lg_GRILLE_REMISE_ID` varchar(40) NOT NULL,
  `str_CODE_GRILLE` int(11) DEFAULT NULL,
  `str_DESCRIPTION` text DEFAULT NULL,
  `dbl_TAUX` double(15,3) DEFAULT 0.000,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `lg_REMISE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_GRILLE_REMISE_ID`),
  KEY `lg_REMISE_ID` (`lg_REMISE_ID`),
  CONSTRAINT `t_grille_remise_fk` FOREIGN KEY (`lg_REMISE_ID`) REFERENCES `t_remise` (`lg_REMISE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_grossiste
CREATE TABLE IF NOT EXISTS `t_grossiste` (
  `lg_GROSSISTE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(50) DEFAULT NULL,
  `str_CODE` varchar(50) DEFAULT NULL,
  `str_DESCRIPTION` varchar(50) DEFAULT NULL,
  `str_ADRESSE_RUE_1` varchar(40) DEFAULT NULL,
  `str_ADRESSE_RUE_2` varchar(40) DEFAULT NULL,
  `str_CODE_POSTAL` varchar(20) DEFAULT NULL,
  `str_BUREAU_DISTRIBUTEUR` varchar(20) DEFAULT NULL,
  `str_MOBILE` varchar(20) DEFAULT NULL,
  `str_TELEPHONE` varchar(20) DEFAULT NULL,
  `int_DELAI_REGLEMENT_AUTORISE` int(11) unsigned zerofill DEFAULT 00000000000,
  `int_DELAI_REAPPROVISIONNEMENT` int(11) DEFAULT 0,
  `int_COEF_SECURITY` int(11) DEFAULT 1,
  `int_DATE_BUTOIR_ARTICLE` int(11) DEFAULT 0,
  `dbl_CHIFFRE_DAFFAIRE` double(15,2) DEFAULT NULL,
  `lg_TYPE_REGLEMENT_ID` varchar(20) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `str_URL_EXTRANET` varchar(100) DEFAULT NULL,
  `str_URL_PHARMAML` varchar(100) DEFAULT NULL,
  `str_IP_GROSSISTE` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `bool_USE_PHARMA` tinyint(1) DEFAULT NULL,
  `str_CODE_RECEPTEUR_PHARMA` varchar(2) DEFAULT '28',
  `str_ID_RECEPTEUR_PHARMA` varchar(8) DEFAULT '142800',
  `str_EMETTEUR_ID` varchar(40) DEFAULT NULL,
  `str_CLE_RECEPTEUR` varchar(10) DEFAULT NULL,
  `str_OFFICINE_ID` varchar(40) DEFAULT '00',
  `str_URL_RECEPTEUR` varchar(50) DEFAULT NULL,
  `groupeId` int(3) DEFAULT NULL,
  `idrepartiteur` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`lg_GROSSISTE_ID`),
  UNIQUE KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `LG_VILLE_ID` (`lg_VILLE_ID`),
  KEY `lg_TYPE_REGLEMENT_ID` (`lg_TYPE_REGLEMENT_ID`),
  KEY `t_grossiste_str_LIBELLE` (`str_LIBELLE`) USING BTREE,
  KEY `t_grossiste_Description` (`str_DESCRIPTION`) USING BTREE,
  KEY `FK_groupeId` (`groupeId`),
  CONSTRAINT `FK_groupeId` FOREIGN KEY (`groupeId`) REFERENCES `groupefournisseur` (`id`),
  CONSTRAINT `t_grossiste_fk` FOREIGN KEY (`lg_TYPE_REGLEMENT_ID`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`),
  CONSTRAINT `t_grossiste_fk1` FOREIGN KEY (`lg_VILLE_ID`) REFERENCES `t_ville` (`lg_VILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_groupe_factures
CREATE TABLE IF NOT EXISTS `t_groupe_factures` (
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `int_AMOUNT` int(11) unsigned DEFAULT 0,
  `lg_GROUPE_ID` mediumint(9) unsigned DEFAULT NULL,
  `lg_FACTURES_ID` varchar(40) DEFAULT NULL,
  `dt_DEBUT_FACTURE` datetime DEFAULT NULL,
  `dt_FIN_FACTURE` datetime DEFAULT NULL,
  `int_NB_DOSSIER` smallint(6) DEFAULT NULL,
  `str_CODE_FACTURE` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_PAYE` int(11) DEFAULT 0,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `t_groupe_tierspayant_idx1` (`ID`),
  KEY `lg_GROUPE_ID` (`lg_GROUPE_ID`),
  KEY `lg_TIERS_PAYANT_ID` (`lg_FACTURES_ID`),
  CONSTRAINT `t_groupe_factures_fk1` FOREIGN KEY (`lg_GROUPE_ID`) REFERENCES `t_groupe_tierspayant` (`lg_GROUPE_ID`),
  CONSTRAINT `t_groupe_factures_fk2` FOREIGN KEY (`lg_FACTURES_ID`) REFERENCES `t_facture` (`lg_FACTURE_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2481 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_groupe_famille
CREATE TABLE IF NOT EXISTS `t_groupe_famille` (
  `lg_GROUPE_FAMILLE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(80) DEFAULT NULL,
  `str_COMMENTAIRE` mediumtext DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_CODE_GROUPE_FAMILLE` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_GROUPE_FAMILLE_ID`),
  UNIQUE KEY `lg_GROUPE_FAMILLE_ID` (`lg_GROUPE_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_groupe_tierspayant
CREATE TABLE IF NOT EXISTS `t_groupe_tierspayant` (
  `lg_GROUPE_ID` mediumint(9) unsigned NOT NULL AUTO_INCREMENT,
  `str_LIBELLE` varchar(100) NOT NULL,
  `str_ADRESSE` varchar(100) DEFAULT NULL,
  `str_TELEPHONE` varchar(200) DEFAULT NULL,
  `str_MODE_TRI_FACTURE` varchar(30) NOT NULL DEFAULT 'ALPHABETIQUE',
  PRIMARY KEY (`lg_GROUPE_ID`),
  UNIQUE KEY `t_groupe_tierspayant_idx1` (`lg_GROUPE_ID`) USING BTREE,
  UNIQUE KEY `str_LIBELLE` (`str_LIBELLE`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_historypreenregistrement
CREATE TABLE IF NOT EXISTS `t_historypreenregistrement` (
  `lg_HISTORYPREENREGISTREMENT_ID` varchar(40) NOT NULL,
  `int_LAST_NUMBER` int(11) NOT NULL DEFAULT 0,
  `str_REF` varchar(40) NOT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT '1',
  PRIMARY KEY (`lg_HISTORYPREENREGISTREMENT_ID`),
  KEY `FK_t_historypreenregistrement_t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_historypreenregistrement_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_imprimante
CREATE TABLE IF NOT EXISTS `t_imprimante` (
  `lg_IMPRIMANTE_ID` varchar(40) NOT NULL,
  `str_NAME` text DEFAULT NULL,
  `str_DESCRIPTION` text DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `int_BEGIN` int(11) DEFAULT 0,
  `int_COLUMN1` int(11) DEFAULT 0,
  `int_COLUMN2` int(11) DEFAULT 0,
  `int_COLUMN3` int(11) DEFAULT 0,
  `int_COLUMN4` int(11) DEFAULT 0,
  `int_FONT` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_IMPRIMANTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_inboud_message
CREATE TABLE IF NOT EXISTS `t_inboud_message` (
  `lg_INBOUND_MESSAGE_ID` varchar(30) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_MESSAGE` mediumtext NOT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_INBOUND_MESSAGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_indicateur_reapprovisionnement
CREATE TABLE IF NOT EXISTS `t_indicateur_reapprovisionnement` (
  `lg_INDICATEUR_REAPPROVISIONNEMENT_ID` varchar(40) NOT NULL,
  `str_CODE_INDICATEUR` varchar(40) DEFAULT NULL,
  `str_LIBELLE_INDICATEUR` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_INDICATEUR_REAPPROVISIONNEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_inventaire
CREATE TABLE IF NOT EXISTS `t_inventaire` (
  `lg_INVENTAIRE_ID` varchar(40) NOT NULL DEFAULT '',
  `str_NAME` varchar(100) DEFAULT NULL,
  `str_DESCRIPTION` varchar(200) DEFAULT NULL,
  `str_TYPE` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_USER_ID` varchar(40) NOT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT '1',
  PRIMARY KEY (`lg_INVENTAIRE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `t_inventaire_fk1` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `t_inventaire_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_inventaire_fk1` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 STATS_SAMPLE_PAGES=64;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_inventaire_famille
CREATE TABLE IF NOT EXISTS `t_inventaire_famille` (
  `lg_INVENTAIRE_FAMILLE_ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `lg_INVENTAIRE_ID` varchar(40) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT 0,
  `int_NUMBER_INIT` int(11) DEFAULT 0,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `bool_INVENTAIRE` tinyint(1) DEFAULT 1,
  `str_UPDATED_ID` varchar(40) DEFAULT '',
  `lg_FAMILLE_STOCK_ID` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`lg_INVENTAIRE_FAMILLE_ID`),
  KEY `lg_INVENTAIRE_ID` (`lg_INVENTAIRE_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `t_inventaire_famille_fk2` (`lg_FAMILLE_STOCK_ID`),
  CONSTRAINT `t_inventaire_famille_fk` FOREIGN KEY (`lg_INVENTAIRE_ID`) REFERENCES `t_inventaire` (`lg_INVENTAIRE_ID`),
  CONSTRAINT `t_inventaire_famille_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_inventaire_famille_fk2` FOREIGN KEY (`lg_FAMILLE_STOCK_ID`) REFERENCES `t_famille_stock` (`lg_FAMILLE_STOCK_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=330253 DEFAULT CHARSET=utf8mb3 STATS_SAMPLE_PAGES=64;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_language
CREATE TABLE IF NOT EXISTS `t_language` (
  `lg_Language_ID` varchar(40) NOT NULL,
  `str_Local_Cty` varchar(20) DEFAULT 'fr',
  `str_Local_Lg` varchar(20) DEFAULT 'FR',
  `str_Code` varchar(50) DEFAULT 'ml_French',
  `str_Description` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_Language_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_litige
CREATE TABLE IF NOT EXISTS `t_litige` (
  `lg_LITIGE_ID` varchar(40) NOT NULL,
  `lg_TYPELITIGE_ID` varchar(40) NOT NULL,
  `lg_TIERS_PAYANT_ID` varchar(40) NOT NULL,
  `str_CLIENT_NAME` varchar(20) NOT NULL,
  `str_REFERENCE_VENTE_LITIGE` varchar(40) NOT NULL,
  `str_LIBELLE_LITIGE` varchar(40) NOT NULL,
  `str_ETAT_LITIGE` varchar(40) NOT NULL,
  `str_COMMENTAIRE_LITIGE` varchar(100) DEFAULT '',
  `str_CONSEQUENCE_LITIGE` varchar(100) NOT NULL,
  `int_AMOUNT_TOTAL_LITIGE` int(11) DEFAULT 0,
  `int_AMOUNT_DUS_LITIGE` int(11) DEFAULT 0,
  `int_AMOUNT_PAYE_LITIGE` int(11) DEFAULT 0,
  `str_DESCRIPTION_LITIGE` varchar(100) NOT NULL,
  `dt_CREATED_LITIGE` datetime DEFAULT NULL,
  `dt_UPDATED_LITIGE` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_LITIGE_ID`),
  KEY `TLITIGE_TTYPELITIGE_ID_FK` (`lg_TYPELITIGE_ID`),
  KEY `TLITIGE_TIERSPAYANT_ID_FK` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `TLITIGE_TIERSPAYANT_ID_FK` FOREIGN KEY (`lg_TIERS_PAYANT_ID`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `TLITIGE_TTYPELITIGE_ID_FK` FOREIGN KEY (`lg_TYPELITIGE_ID`) REFERENCES `t_typelitige` (`lg_TYPELITIGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_lot
CREATE TABLE IF NOT EXISTS `t_lot` (
  `lg_LOT_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(30) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_NUM_LOT` varchar(40) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `str_REF_LIVRAISON` varchar(50) DEFAULT NULL,
  `dt_SORTIE_USINE` datetime DEFAULT NULL,
  `dt_PEREMPTION` datetime DEFAULT NULL,
  `int_NUMBER_GRATUIT` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_REF_ORDER` varchar(20) DEFAULT NULL,
  `lg_TYPEETIQUETTE_ID` varchar(20) DEFAULT NULL,
  `int_QTY_VENDUE` int(8) DEFAULT NULL,
  `current_stock` int(6) DEFAULT NULL,
  PRIMARY KEY (`lg_LOT_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_TYPEETIQUETTE_ID` (`lg_TYPEETIQUETTE_ID`),
  KEY `t_lot_idx1` (`str_REF_LIVRAISON`),
  KEY `dt_PEREMPTION` (`dt_PEREMPTION`) USING BTREE,
  KEY `idx_lot_dt_created` (`dt_CREATED`) USING BTREE,
  KEY `idx_lot_peremption_stock` (`dt_PEREMPTION`,`current_stock`) USING BTREE,
  CONSTRAINT `t_lot_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_lot_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_lot_fk2` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_lot_fk3` FOREIGN KEY (`lg_TYPEETIQUETTE_ID`) REFERENCES `t_typeetiquette` (`lg_TYPEETIQUETTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_medecin
CREATE TABLE IF NOT EXISTS `t_medecin` (
  `lg_MEDECIN_ID` varchar(40) NOT NULL,
  `str_CODE_INTERNE` varchar(40) DEFAULT NULL,
  `str_FIRST_NAME` varchar(40) DEFAULT NULL,
  `str_LAST_NAME` varchar(40) DEFAULT NULL,
  `str_ADRESSE` varchar(40) DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  `str_MAIL` varchar(40) DEFAULT NULL,
  `str_SEXE` varchar(10) DEFAULT NULL,
  `str_Commentaire` varchar(100) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `lg_SPECIALITE_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_MEDECIN_ID`),
  KEY `lg_VILLE_ID` (`lg_VILLE_ID`),
  KEY `lg_SPECIALITE_ID` (`lg_SPECIALITE_ID`),
  CONSTRAINT `t_medecin_fk` FOREIGN KEY (`lg_VILLE_ID`) REFERENCES `t_ville` (`lg_VILLE_ID`),
  CONSTRAINT `t_medecin_fk1` FOREIGN KEY (`lg_SPECIALITE_ID`) REFERENCES `t_specialite` (`lg_SPECIALITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_medecin_client
CREATE TABLE IF NOT EXISTS `t_medecin_client` (
  `lg_MEDECIN_CLIENT_ID` varchar(40) NOT NULL,
  `lg_MEDECIN_ID` varchar(40) DEFAULT NULL,
  `lg_CLIENT_ID` varchar(40) DEFAULT NULL,
  `str_SOINS` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_MEDECIN_CLIENT_ID`),
  KEY `lg_MEDECIN_ID` (`lg_MEDECIN_ID`),
  KEY `lg_CLIENT_ID` (`lg_CLIENT_ID`),
  CONSTRAINT `t_medecin_client_fk` FOREIGN KEY (`lg_MEDECIN_ID`) REFERENCES `t_medecin` (`lg_MEDECIN_ID`),
  CONSTRAINT `t_medecin_client_fk1` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_medecin_specialite
CREATE TABLE IF NOT EXISTS `t_medecin_specialite` (
  `lg_MEDECIN_SPECIALITE_ID` varchar(40) NOT NULL,
  `lg_MEDECIN_ID` varchar(40) NOT NULL,
  `lg_SPECIALITE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(50) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_MEDECIN_SPECIALITE_ID`),
  KEY `lg_MEDECIN_ID` (`lg_MEDECIN_ID`),
  KEY `lg_SPECIALITE_ID` (`lg_SPECIALITE_ID`),
  CONSTRAINT `t_medecin_specialite_ibfk_1` FOREIGN KEY (`lg_MEDECIN_ID`) REFERENCES `t_medecin` (`lg_MEDECIN_ID`) ON UPDATE CASCADE,
  CONSTRAINT `t_medecin_specialite_ibfk_2` FOREIGN KEY (`lg_SPECIALITE_ID`) REFERENCES `t_specialite` (`lg_SPECIALITE_ID`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_menu
CREATE TABLE IF NOT EXISTS `t_menu` (
  `lg_MENU_ID` varchar(40) NOT NULL,
  `str_VALUE` varchar(30) DEFAULT NULL,
  `str_IMAGE_CSS` varchar(30) DEFAULT NULL,
  `str_DESCRIPTION` varchar(200) DEFAULT NULL,
  `int_PRIORITY` int(11) DEFAULT 0,
  `str_Status` varchar(20) DEFAULT NULL,
  `P_KEY` varchar(100) DEFAULT NULL,
  `lg_MODULE_ID` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `icon_CLASS` varchar(50) DEFAULT '',
  PRIMARY KEY (`lg_MENU_ID`),
  UNIQUE KEY `lg_MENU_ID` (`lg_MENU_ID`),
  KEY `lg_MODULE_ID` (`lg_MODULE_ID`),
  CONSTRAINT `t_menu_fk` FOREIGN KEY (`lg_MODULE_ID`) REFERENCES `t_module` (`lg_MODULE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_mode_reglement
CREATE TABLE IF NOT EXISTS `t_mode_reglement` (
  `lg_MODE_REGLEMENT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `lg_TYPE_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `qr_code` mediumblob DEFAULT NULL,
  PRIMARY KEY (`lg_MODE_REGLEMENT_ID`),
  UNIQUE KEY `lg_MODE_REGLEMENT` (`lg_MODE_REGLEMENT_ID`),
  KEY `lg_TYPE_REGLEMENT_ID` (`lg_TYPE_REGLEMENT_ID`),
  CONSTRAINT `t_mode_reglement_fk` FOREIGN KEY (`lg_TYPE_REGLEMENT_ID`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_model_facture
CREATE TABLE IF NOT EXISTS `t_model_facture` (
  `lg_MODEL_FACTURE_ID` varchar(40) NOT NULL,
  `str_VALUE` varchar(20) DEFAULT NULL,
  `str_DESCRIPTION` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `nomFichier` varchar(100) NOT NULL,
  `nomFichierRemiseTierspayant` varchar(100) NOT NULL,
  `typeConnexion` tinyint(1) DEFAULT NULL,
  `typeAffichage` varchar(100) DEFAULT NULL,
  `model_facture_dynamique_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_MODEL_FACTURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_module
CREATE TABLE IF NOT EXISTS `t_module` (
  `lg_MODULE_ID` varchar(40) NOT NULL,
  `str_VALUE` varchar(30) DEFAULT NULL,
  `str_DESCRIPTION` varchar(200) DEFAULT NULL,
  `int_PRIORITY` int(11) DEFAULT 0,
  `str_Status` varchar(20) DEFAULT NULL,
  `P_KEY` varchar(100) DEFAULT NULL,
  `str_Link` varchar(100) DEFAULT NULL,
  `str_Icone` varchar(100) DEFAULT NULL,
  `str_Icone_hover` varchar(100) DEFAULT NULL,
  `str_Icone_out` varchar(100) DEFAULT NULL,
  `str_Link_default` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_MODULE_ID`),
  UNIQUE KEY `lg_MODULE_ID` (`lg_MODULE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_month
CREATE TABLE IF NOT EXISTS `t_month` (
  `lg_MONTH_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) NOT NULL,
  `int_MOIS` int(11) DEFAULT 0,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_MONTH_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_motif_reglement
CREATE TABLE IF NOT EXISTS `t_motif_reglement` (
  `lg_MOTIF_REGLEMENT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_MOTIF_REGLEMENT_ID`),
  UNIQUE KEY `lg_MOTIF_REGLEMENT_ID` (`lg_MOTIF_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_motif_retour
CREATE TABLE IF NOT EXISTS `t_motif_retour` (
  `lg_MOTIF_RETOUR` varchar(40) NOT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  `str_LIBELLE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_MOTIF_RETOUR`),
  KEY `lg_MOTIF_RETOUR` (`lg_MOTIF_RETOUR`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_mouvement
CREATE TABLE IF NOT EXISTS `t_mouvement` (
  `lg_MOUVEMENT_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(50) DEFAULT NULL,
  `lg_USER_ID` varchar(40) NOT NULL,
  `P_KEY` varchar(40) NOT NULL,
  `str_TYPE_ACTION` varchar(40) NOT NULL,
  `str_ACTION` varchar(40) NOT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT 0,
  `int_NUMBERTRANSACTION` int(11) DEFAULT 0,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT '1',
  PRIMARY KEY (`lg_MOUVEMENT_ID`),
  KEY `FK_t_mouvement_t_famille` (`lg_FAMILLE_ID`),
  KEY `FK_t_mouvement_t_user` (`lg_USER_ID`),
  KEY `FK_t_mouvement_t_emplacement` (`lg_EMPLACEMENT_ID`),
  KEY `t_mouvement_dt_CREATED` (`dt_CREATED`) USING BTREE,
  CONSTRAINT `FK_t_mouvement_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_mouvement_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_mouvement_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_mouvement_reserve
CREATE TABLE IF NOT EXISTS `t_mouvement_reserve` (
  `lg_MOUVEMENT_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT NULL,
  `str_TYPE` varchar(20) DEFAULT NULL,
  `int_QTE` int(11) DEFAULT NULL,
  `int_STOCK_RAYON_AVANT` int(11) DEFAULT NULL,
  `int_STOCK_RESERVE_AVANT` int(11) DEFAULT NULL,
  `int_STOCK_RAYON_APRES` int(11) DEFAULT NULL,
  `int_STOCK_RESERVE_APRES` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `lg_MOUVEMENT_SOURCE_ID` varchar(40) DEFAULT NULL,
  `str_MOTIF_ANNULATION` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`lg_MOUVEMENT_ID`) USING BTREE,
  KEY `idx_mvt_reserve_famille` (`lg_FAMILLE_ID`) USING BTREE,
  KEY `idx_mvt_reserve_date` (`dt_CREATED`) USING BTREE,
  KEY `idx_mvt_reserve_source` (`lg_MOUVEMENT_SOURCE_ID`),
  KEY `idx_mvt_reserve_empl_fam_date` (`lg_EMPLACEMENT_ID`,`lg_FAMILLE_ID`,`dt_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_mouvement_snapshot
CREATE TABLE IF NOT EXISTS `t_mouvement_snapshot` (
  `lg_MOUVEMENT_SNAPSHOT_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(50) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_STOCK_JOUR` int(11) DEFAULT 0,
  `int_STOCK_DEBUT` int(11) DEFAULT 0,
  `int_NUMBERTRANSACTION` int(11) DEFAULT 0,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT '1',
  PRIMARY KEY (`lg_MOUVEMENT_SNAPSHOT_ID`),
  KEY `FK_t_mouvement_snapshot_t_famille` (`lg_FAMILLE_ID`),
  KEY `FK_t_mouvement_snapshot_t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_mouvement_snapshot_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_mouvement_snapshot_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_mouvementprice
CREATE TABLE IF NOT EXISTS `t_mouvementprice` (
  `lg_MOUVEMENTPRICE_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(50) DEFAULT NULL,
  `lg_USER_ID` varchar(40) NOT NULL,
  `str_ACTION` varchar(40) NOT NULL,
  `str_REF` varchar(40) NOT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_PRICE_OLD` int(11) DEFAULT 0,
  `int_PRICE_NEW` int(11) DEFAULT 0,
  `int_ECART` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_MOUVEMENTPRICE_ID`),
  KEY `FK_t_mouvementprice_t_famille` (`lg_FAMILLE_ID`),
  KEY `FK_t_mouvementprice_t_user` (`lg_USER_ID`),
  CONSTRAINT `FK_t_mouvementprice_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_mouvementprice_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_mvt_caisse
CREATE TABLE IF NOT EXISTS `t_mvt_caisse` (
  `lg_MVT_CAISSE_ID` varchar(40) NOT NULL,
  `lg_TYPE_MVT_CAISSE_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_NUM_COMPTE` varchar(100) DEFAULT NULL,
  `str_NUM_PIECE_COMPTABLE` text DEFAULT NULL,
  `str_COMMENTAIRE` text DEFAULT NULL,
  `lg_MODE_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `dt_DATE_MVT` datetime DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_CREATED_BY` varchar(40) DEFAULT NULL,
  `str_UPDATED_BY` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `P_KEY` varchar(20) DEFAULT NULL,
  `str_REF_TICKET` varchar(10) DEFAULT '''''',
  `bool_CHECKED` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`lg_MVT_CAISSE_ID`),
  KEY `lg_TYPE_MVT_CAISSE_ID` (`lg_TYPE_MVT_CAISSE_ID`),
  KEY `lg_MODE_REGLEMENT_ID` (`lg_MODE_REGLEMENT_ID`),
  KEY `str_CREATED_BY` (`str_CREATED_BY`),
  KEY `idx_mvt_caisse_dt_created` (`dt_CREATED`) USING BTREE,
  CONSTRAINT `t_mvt_caisse_fk` FOREIGN KEY (`lg_TYPE_MVT_CAISSE_ID`) REFERENCES `t_type_mvt_caisse` (`lg_TYPE_MVT_CAISSE_ID`),
  CONSTRAINT `t_mvt_caisse_fk1` FOREIGN KEY (`lg_MODE_REGLEMENT_ID`) REFERENCES `t_mode_reglement` (`lg_MODE_REGLEMENT_ID`),
  CONSTRAINT `t_mvt_caisse_fk2` FOREIGN KEY (`str_CREATED_BY`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_nature_reglement
CREATE TABLE IF NOT EXISTS `t_nature_reglement` (
  `lg_NATURE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT 'enable',
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_NATURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_nature_vente
CREATE TABLE IF NOT EXISTS `t_nature_vente` (
  `lg_NATURE_VENTE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_NATURE_VENTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_notification
CREATE TABLE IF NOT EXISTS `t_notification` (
  `lg_ID` varchar(40) NOT NULL,
  `lg_USER_ID_IN` varchar(30) DEFAULT NULL,
  `lg_USER_ID_OUT` varchar(30) DEFAULT NULL,
  `str_DESCRIPTION` varchar(200) DEFAULT NULL,
  `str_CONTENT` mediumtext DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_TYPE` varchar(40) DEFAULT NULL,
  `str_REF_RESSOURCE` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_USER_ID_IN` (`lg_USER_ID_IN`),
  KEY `lg_USER_ID_OUT` (`lg_USER_ID_OUT`),
  CONSTRAINT `t_notification_fk` FOREIGN KEY (`lg_USER_ID_IN`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_notification_fk1` FOREIGN KEY (`lg_USER_ID_OUT`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_officine
CREATE TABLE IF NOT EXISTS `t_officine` (
  `lg_OFFICINE_ID` varchar(40) NOT NULL,
  `str_NOM_ABREGE` text DEFAULT NULL,
  `str_NOM_COMPLET` text DEFAULT NULL,
  `str_ADRESSSE_POSTALE` text DEFAULT NULL,
  `lg_MEDECIN_ID` varchar(50) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `str_FIRST_NAME` varchar(70) DEFAULT NULL,
  `str_LAST_NAME` varchar(70) DEFAULT NULL,
  `str_PHONE` varchar(100) DEFAULT NULL,
  `str_COMMENTAIRE1` text DEFAULT NULL,
  `str_COMMENTAIRE2` text DEFAULT NULL,
  `str_ENTETE` text DEFAULT NULL,
  `str_COMPTE_CONTRIBUABLE` text DEFAULT NULL,
  `str_REGISTRE_COMMERCE` text DEFAULT NULL,
  `str_REGISTRE_IMPOSITION` text DEFAULT NULL,
  `str_CENTRE_IMPOSITION` text DEFAULT NULL,
  `str_NUM_COMPTABLE` text DEFAULT NULL,
  `str_COMMENTAIREOFFICINE` text DEFAULT NULL,
  `str_COMPTE_BANCAIRE` varchar(100) DEFAULT NULL,
  `str_AUTRESPHONES` varchar(100) DEFAULT '',
  PRIMARY KEY (`lg_OFFICINE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_optimisation_quantite
CREATE TABLE IF NOT EXISTS `t_optimisation_quantite` (
  `lg_OPTIMISATION_QUANTITE_ID` varchar(40) NOT NULL,
  `str_CODE_OPTIMISATION` varchar(40) DEFAULT NULL,
  `str_LIBELLE_OPTIMISATION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_OPTIMISATION_QUANTITE_ID`),
  UNIQUE KEY `lg_OPTIMISATION_QUANTITE_ID` (`lg_OPTIMISATION_QUANTITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_order
CREATE TABLE IF NOT EXISTS `t_order` (
  `lg_ORDER_ID` varchar(20) NOT NULL,
  `str_REF_ORDER` varchar(20) DEFAULT NULL,
  `int_LINE` int(11) DEFAULT 0,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `lg_USER_ID` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT 0,
  `recu` tinyint(1) DEFAULT 0,
  `direct_import` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`lg_ORDER_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_order_fk` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_order_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_order_detail
CREATE TABLE IF NOT EXISTS `t_order_detail` (
  `lg_ORDERDETAIL_ID` varchar(20) NOT NULL,
  `lg_ORDER_ID` varchar(20) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(20) NOT NULL,
  `lg_GROSSISTE_ID` varchar(20) NOT NULL,
  `int_NUMBER` int(11) DEFAULT 0,
  `int_PRICE` int(11) DEFAULT 0,
  `int_PAF_DETAIL` int(11) DEFAULT 0,
  `int_PRICE_DETAIL` int(11) DEFAULT 0,
  `int_QTE_MANQUANT` int(11) DEFAULT 0,
  `int_QTE_REP_GROSSISTE` int(11) DEFAULT 0,
  `bool_BL` tinyint(1) DEFAULT 0,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_ORERSTATUS` smallint(1) unsigned DEFAULT 0,
  `prixUnitaire` int(8) DEFAULT NULL,
  `prixAchat` int(8) DEFAULT NULL,
  `ug` int(5) DEFAULT 0,
  `lots` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `checked` tinyint(1) DEFAULT 0,
  `quantite_controle` int(6) DEFAULT NULL,
  PRIMARY KEY (`lg_ORDERDETAIL_ID`),
  KEY `lg_ORDER_ID` (`lg_ORDER_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `t_order_detailIdex` (`str_STATUT`),
  CONSTRAINT `t_order_detail_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_order_detail_fk1` FOREIGN KEY (`lg_ORDER_ID`) REFERENCES `t_order` (`lg_ORDER_ID`),
  CONSTRAINT `t_order_detail_fk2` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `lots` CHECK (json_valid(`lots`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_outboud_message
CREATE TABLE IF NOT EXISTS `t_outboud_message` (
  `lg_OUTBOUND_MESSAGE_ID` varchar(30) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_MESSAGE` mediumtext NOT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  `str_REF` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_OUTBOUND_MESSAGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_parameters
CREATE TABLE IF NOT EXISTS `t_parameters` (
  `str_KEY` varchar(50) NOT NULL,
  `str_VALUE` varchar(254) DEFAULT NULL,
  `str_DESCRIPTION` varchar(254) DEFAULT NULL,
  `str_TYPE` varchar(50) DEFAULT 'SYSTEME',
  `str_STATUT` varchar(20) DEFAULT 'enable',
  `str_IS_EN_KRYPTED` varchar(50) DEFAULT NULL,
  `str_SECTION_KEY` varchar(50) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`str_KEY`),
  UNIQUE KEY `str_KEY` (`str_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_preenregistrement
CREATE TABLE IF NOT EXISTS `t_preenregistrement` (
  `lg_PREENREGISTREMENT_ID` varchar(40) NOT NULL,
  `str_REF` varchar(30) DEFAULT NULL,
  `str_REF_TICKET` varchar(10) DEFAULT '0',
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT 0,
  `int_PRICE_REMISE` int(11) DEFAULT 0,
  `int_CUST_PART` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_NATURE_VENTE_ID` varchar(20) DEFAULT NULL,
  `str_MEDECIN` varchar(100) DEFAULT NULL,
  `str_REF_BON` varchar(80) DEFAULT NULL,
  `str_ORDONNANCE` varchar(40) DEFAULT NULL,
  `lg_PARENT_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED_ORDONNANCE` datetime DEFAULT NULL,
  `str_INFOS_CLT` varchar(200) DEFAULT NULL,
  `str_STATUT_VENTE` varchar(20) DEFAULT NULL,
  `lg_TYPE_VENTE_ID` varchar(20) DEFAULT '1',
  `str_TYPE_VENTE` varchar(40) DEFAULT NULL,
  `lg_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `lg_REMISE_ID` varchar(40) DEFAULT NULL,
  `int_SENDTOSUGGESTION` int(11) DEFAULT 0,
  `b_IS_CANCEL` tinyint(1) DEFAULT 0,
  `lg_USER_VENDEUR_ID` varchar(20) DEFAULT '52141743589144800410',
  `lg_USER_CAISSIER_ID` varchar(20) DEFAULT '52141743589144800410',
  `str_FIRST_NAME_CUSTOMER` varchar(70) DEFAULT '',
  `str_LAST_NAME_CUSTOMER` varchar(70) DEFAULT '',
  `str_NUMERO_SECURITE_SOCIAL` varchar(50) DEFAULT '',
  `str_PHONE_CUSTOME` varchar(20) DEFAULT '',
  `lg_PREENGISTREMENT_ANNULE_ID` varchar(40) DEFAULT NULL,
  `dt_ANNULER` datetime DEFAULT NULL,
  `b_IS_AVOIR` tinyint(1) NOT NULL DEFAULT 0,
  `b_WITHOUT_BON` tinyint(1) NOT NULL DEFAULT 0,
  `int_PRICE_OTHER` int(11) DEFAULT 0,
  `int_ACCOUNT` int(11) DEFAULT 0,
  `int_REMISE_PARA` int(8) DEFAULT 0,
  `PK_BRAND` varchar(20) DEFAULT NULL COMMENT 'Id du depot auquel on a fait cette vente.Uniquement pour les vente depot',
  `remise` varchar(40) DEFAULT NULL,
  `lg_CLIENT_ID` varchar(40) DEFAULT NULL,
  `lg_AYANTS_DROITS_ID` varchar(40) DEFAULT NULL,
  `montantTva` int(10) DEFAULT 0,
  `checked` tinyint(1) DEFAULT 1,
  `copy` tinyint(1) DEFAULT 0,
  `medecin_id` varchar(255) DEFAULT NULL,
  `imported` tinyint(1) DEFAULT 0,
  `margeug` int(8) NOT NULL DEFAULT 0,
  `montantttcug` int(8) NOT NULL DEFAULT 0,
  `montantnetug` int(8) NOT NULL DEFAULT 0,
  `montanttvaug` int(8) NOT NULL DEFAULT 0,
  `completion_date` datetime DEFAULT NULL,
  `caution_id` varchar(255) DEFAULT NULL,
  `has_price_option` bit(1) DEFAULT NULL,
  `b_HAS_AVOIR` bit(1) NOT NULL DEFAULT b'0',
  `dt_CLOTURE_AVOIR` datetime DEFAULT NULL,
  `str_TYPE_REGLEMENT_ATTENTE` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`lg_PREENREGISTREMENT_ID`),
  UNIQUE KEY `lg_PREENREGISTREMENT_ID` (`lg_PREENREGISTREMENT_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `lg_NATURE_VENTE_ID` (`lg_NATURE_VENTE_ID`),
  KEY `lg_TYPE_VENTE_ID` (`lg_TYPE_VENTE_ID`),
  KEY `lg_USER_VENDEUR_ID` (`lg_USER_VENDEUR_ID`),
  KEY `lg_USER_CAISSIER_ID` (`lg_USER_CAISSIER_ID`),
  KEY `lg_REGLEMENT_ID` (`lg_REGLEMENT_ID`),
  KEY `t_preenregistrement_str_REF_BON` (`str_REF_BON`) USING BTREE,
  KEY `t_preenregistrement_str_REF` (`str_REF`) USING BTREE,
  KEY `t_preenregistrement_ticket` (`str_REF_TICKET`) USING BTREE,
  KEY `t_preenregistrement_lgREGLEMENT_ID` (`lg_REGLEMENT_ID`) USING BTREE,
  KEY `t_preenregistrement_dtUPDATE` (`dt_UPDATED`) USING BTREE,
  KEY `t_preenregistrement_str_STATUT` (`str_STATUT`) USING BTREE,
  KEY `fk_remise_preenregistrementid` (`remise`),
  KEY `fk_client_preenregistrementid` (`lg_CLIENT_ID`),
  KEY `fk_ayantdroiy_preenregistrementid` (`lg_AYANTS_DROITS_ID`),
  KEY `FKMEDECIN_ch0c4o3olc65u3yap006nxq0i` (`medecin_id`),
  KEY `FK37vi39vy91lmj4v1u6wsqiyrq` (`caution_id`) USING BTREE,
  KEY `idx_preenregistrement_articles_vendus` (`str_STATUT`,`b_IS_CANCEL`,`dt_UPDATED`,`int_PRICE`,`lg_USER_ID`) USING BTREE,
  KEY `idx_tp_ca_statut_cancel_price` (`str_STATUT`,`b_IS_CANCEL`,`int_PRICE`,`lg_PREENREGISTREMENT_ID`),
  KEY `idx_preenregistrement_dt_updated` (`dt_UPDATED`) USING BTREE,
  KEY `idx_preenregistrement_stat_operateur` (`str_STATUT`,`b_IS_CANCEL`,`dt_CREATED`,`lg_USER_VENDEUR_ID`,`int_PRICE`) USING BTREE,
  KEY `idx_preenregistrement_eval_vente` (`str_STATUT`,`b_IS_CANCEL`,`dt_UPDATED`,`lg_PREENREGISTREMENT_ID`,`int_PRICE`) USING BTREE,
  KEY `idx_preenr_cloture_avoir` (`b_HAS_AVOIR`,`dt_CLOTURE_AVOIR`),
  KEY `idx_preenr_avoir_date` (`b_IS_AVOIR`,`dt_UPDATED`) USING BTREE,
  KEY `idx_preenr_statut_date` (`str_STATUT`,`dt_UPDATED`) USING BTREE,
  KEY `ix_preenreg_dt_created` (`dt_CREATED`),
  CONSTRAINT `FK37vi39vy91lmj4v1u6wsqiyrq` FOREIGN KEY (`caution_id`) REFERENCES `caution` (`id`),
  CONSTRAINT `FKMEDECIN_ch0c4o3olc65u3yap006nxq0i` FOREIGN KEY (`medecin_id`) REFERENCES `medecin` (`id`),
  CONSTRAINT `fk_ayantdroiy_preenregistrementid` FOREIGN KEY (`lg_AYANTS_DROITS_ID`) REFERENCES `t_ayant_droit` (`lg_AYANTS_DROITS_ID`),
  CONSTRAINT `fk_client_preenregistrementid` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`),
  CONSTRAINT `fk_remise_preenregistrementid` FOREIGN KEY (`remise`) REFERENCES `t_remise` (`lg_REMISE_ID`),
  CONSTRAINT `t_preenregistrement_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_preenregistrement_fk1` FOREIGN KEY (`lg_NATURE_VENTE_ID`) REFERENCES `t_nature_vente` (`lg_NATURE_VENTE_ID`),
  CONSTRAINT `t_preenregistrement_fk2` FOREIGN KEY (`lg_TYPE_VENTE_ID`) REFERENCES `t_type_vente` (`lg_TYPE_VENTE_ID`),
  CONSTRAINT `t_preenregistrement_fk3` FOREIGN KEY (`lg_USER_VENDEUR_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_preenregistrement_fk4` FOREIGN KEY (`lg_USER_CAISSIER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_preenregistrement_fk5` FOREIGN KEY (`lg_REGLEMENT_ID`) REFERENCES `t_reglement` (`lg_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_preenregistrement_compte_client
CREATE TABLE IF NOT EXISTS `t_preenregistrement_compte_client` (
  `lg_PREENREGISTREMENT_COMPTE_CLIENT_ID` varchar(40) NOT NULL,
  `lg_PREENREGISTREMENT_ID` varchar(40) DEFAULT 'NULL',
  `lg_COMPTE_CLIENT_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT 0,
  `int_PRICE_RESTE` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_PREENREGISTREMENT_COMPTE_CLIENT_ID`),
  UNIQUE KEY `lg_PREENREGISTREMENT_COMPTE_CLIENT_ID` (`lg_PREENREGISTREMENT_COMPTE_CLIENT_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `lg_PREENREGISTREMENT_ID` (`lg_PREENREGISTREMENT_ID`),
  KEY `lg_COMPTE_CLIENT_ID` (`lg_COMPTE_CLIENT_ID`),
  CONSTRAINT `t_preenregistrement_compte_client_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_preenregistrement_compte_client_fk1` FOREIGN KEY (`lg_PREENREGISTREMENT_ID`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_preenregistrement_compte_client_tiers_payent
CREATE TABLE IF NOT EXISTS `t_preenregistrement_compte_client_tiers_payent` (
  `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` varchar(40) NOT NULL,
  `lg_PREENREGISTREMENT_ID` varchar(40) DEFAULT NULL,
  `lg_COMPTE_CLIENT_TIERS_PAYANT_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_PERCENT` int(11) DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT 0,
  `int_PRICE_RESTE` int(11) DEFAULT 0,
  `str_LAST_TRANSACTION` varchar(40) DEFAULT NULL,
  `str_STATUT_FACTURE` varchar(40) DEFAULT 'unpaid',
  `str_REF_BON` varchar(80) DEFAULT NULL,
  `dbl_QUOTA_CONSO_VENTE` double(12,2) DEFAULT 0.00,
  PRIMARY KEY (`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`),
  UNIQUE KEY `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` (`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`),
  UNIQUE KEY `un_vente_tp` (`lg_PREENREGISTREMENT_ID`,`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `lg_PREENREGISTREMENT_ID` (`lg_PREENREGISTREMENT_ID`),
  KEY `lg_COMPTE_CLIENT_TIERS_PAYANT_ID` (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`),
  KEY `ix_pcctp_statut_facture` (`str_STATUT_FACTURE`),
  KEY `ix_pcctp_statuts_preenreg` (`str_STATUT_FACTURE`,`str_STATUT`,`lg_PREENREGISTREMENT_ID`),
  CONSTRAINT `t_preenregistrement_compte_client_tiers_payent_fk` FOREIGN KEY (`lg_PREENREGISTREMENT_ID`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`),
  CONSTRAINT `t_preenregistrement_compte_client_tiers_payent_fk1` FOREIGN KEY (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`) REFERENCES `t_compte_client_tiers_payant` (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`),
  CONSTRAINT `t_preenregistrement_compte_client_tiers_payent_fk2` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=4096 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_preenregistrement_detail
CREATE TABLE IF NOT EXISTS `t_preenregistrement_detail` (
  `lg_PREENREGISTREMENT_DETAIL_ID` varchar(40) NOT NULL,
  `lg_PREENREGISTREMENT_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `int_QUANTITY` int(11) DEFAULT 0,
  `int_QUANTITY_SERVED` int(11) DEFAULT 0,
  `int_AVOIR` int(11) DEFAULT 0,
  `int_AVOIR_SERVED` int(11) DEFAULT 0,
  `int_PRICE` int(11) DEFAULT 0,
  `int_PRICE_UNITAIR` int(11) DEFAULT 0,
  `int_NUMBER` int(11) DEFAULT 0,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_GRILLE_REMISE_ID` varchar(40) DEFAULT NULL,
  `int_PRICE_REMISE` int(11) DEFAULT 0,
  `b_IS_AVOIR` tinyint(1) NOT NULL DEFAULT 0,
  `int_FREE_PACK_NUMBER` int(4) DEFAULT 0,
  `int_PRICE_OTHER` int(11) DEFAULT 0,
  `int_PRICE_DETAIL_OTHER` int(11) DEFAULT 0,
  `int_UG` int(6) DEFAULT 0,
  `bool_ACCOUNT` tinyint(1) DEFAULT 1,
  `montantTva` int(10) DEFAULT 0,
  `valeurTva` int(3) NOT NULL DEFAULT 0,
  `prixAchat` int(8) NOT NULL,
  `montanttvaug` int(8) NOT NULL DEFAULT 0,
  `calculation_base_price` int(8) DEFAULT NULL,
  `int_AVOIR_INITIAL` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`lg_PREENREGISTREMENT_DETAIL_ID`),
  UNIQUE KEY `lg_PREENREGISTREMENT_DETAIL_ID` (`lg_PREENREGISTREMENT_DETAIL_ID`),
  UNIQUE KEY `un_vente_produit` (`lg_FAMILLE_ID`,`lg_PREENREGISTREMENT_ID`),
  KEY `lg_PREENREGISTREMENT_ID` (`lg_PREENREGISTREMENT_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `idx_preenregistrement_detail_vente_famille` (`lg_PREENREGISTREMENT_ID`,`lg_FAMILLE_ID`) USING BTREE,
  KEY `idx_tpd_ca_famille_date_vente` (`dt_CREATED`,`lg_PREENREGISTREMENT_ID`,`lg_FAMILLE_ID`),
  KEY `idx_tpd_vente_famille_quantite` (`lg_PREENREGISTREMENT_ID`,`lg_FAMILLE_ID`,`int_QUANTITY`) USING BTREE,
  CONSTRAINT `t_preenregistrement_detail_fk` FOREIGN KEY (`lg_PREENREGISTREMENT_ID`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`),
  CONSTRAINT `t_preenregistrement_detail_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_privilege
CREATE TABLE IF NOT EXISTS `t_privilege` (
  `lg_PRIVELEGE_ID` varchar(50) NOT NULL,
  `str_NAME` varchar(80) DEFAULT NULL,
  `str_TYPE` varchar(50) DEFAULT 'CUSTOMER',
  `str_DESCRIPTION` mediumtext DEFAULT NULL,
  `lg_PRIVELEGE_ID_DEP` varchar(50) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `lg_CREATED_BY` varchar(20) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_UPDATED_BY` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_PRIVELEGE_ID`),
  UNIQUE KEY `lg_PRIVELEGE_ID` (`lg_PRIVELEGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=180 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_promo
CREATE TABLE IF NOT EXISTS `t_promo` (
  `lg_PROMO_ID` varchar(40) NOT NULL,
  `lg_TYPE_PROMO_ID` varchar(40) NOT NULL,
  `lg_WORKFLOW_PROMO_ID` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_PROMO_ID`),
  UNIQUE KEY `lg_PROMO_ID` (`lg_PROMO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_promo_details
CREATE TABLE IF NOT EXISTS `t_promo_details` (
  `lg_PROMO_DETAILS_ID` varchar(40) NOT NULL,
  `lg_PROMO_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_PROMO_DETAILS_ID`),
  UNIQUE KEY `lg_PROMO_DETAILS_ID` (`lg_PROMO_DETAILS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_promotion
CREATE TABLE IF NOT EXISTS `t_promotion` (
  `lg_CODE_PROMOTION_ID` int(10) NOT NULL AUTO_INCREMENT,
  `dt_START_DATE` datetime NOT NULL,
  `dt_END_DATE` datetime NOT NULL,
  `str_TYPE` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_CODE_PROMOTION_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_promotion_history
CREATE TABLE IF NOT EXISTS `t_promotion_history` (
  `lg_CODE_PROMOTION_HISTORY` int(15) NOT NULL AUTO_INCREMENT,
  `lg_CODE_PROMOTION_ID` int(10) NOT NULL,
  `int_CIP` varchar(20) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(60) DEFAULT NULL,
  `dt_PROMOTED_DATE` datetime NOT NULL,
  `dt_START_DATE` datetime DEFAULT NULL,
  `dt_END_DATE` datetime DEFAULT NULL,
  `str_TYPE` varchar(40) DEFAULT NULL,
  `int_DISCOUNT` int(10) DEFAULT 0,
  `bl_MODE` tinyint(1) DEFAULT NULL,
  `int_PACK_NUMBER` int(10) DEFAULT 0,
  `int_ACTIVE_AT` int(10) DEFAULT 0,
  `db_PRICE` double DEFAULT NULL,
  PRIMARY KEY (`lg_CODE_PROMOTION_HISTORY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_promotion_product
CREATE TABLE IF NOT EXISTS `t_promotion_product` (
  `lg_PROMOTION_PRODUCT_ID` int(10) NOT NULL AUTO_INCREMENT,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `lg_CODE_PROMOTION_ID` int(10) NOT NULL,
  `int_DISCOUNT` int(3) DEFAULT NULL,
  `bl_MODE` tinyint(1) DEFAULT NULL,
  `int_PACK_NUMBER` int(2) DEFAULT NULL,
  `db_PRICE` double(8,2) DEFAULT NULL,
  `int_ACTIVE_AT` int(10) DEFAULT NULL,
  `dt_PROMOTED_DATE` datetime NOT NULL,
  PRIMARY KEY (`lg_PROMOTION_PRODUCT_ID`),
  KEY `TPROMOTION_LG_FAMILLE_ID_FK` (`lg_FAMILLE_ID`),
  KEY `TPROMOTION_lg_CODE_PROMOTION_ID_FK` (`lg_CODE_PROMOTION_ID`),
  CONSTRAINT `TPROMOTION_LG_FAMILLE_ID_FK` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `TPROMOTION_lg_CODE_PROMOTION_ID_FK` FOREIGN KEY (`lg_CODE_PROMOTION_ID`) REFERENCES `t_promotion` (`lg_CODE_PROMOTION_ID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_quinzaine
CREATE TABLE IF NOT EXISTS `t_quinzaine` (
  `lg_QUINZAINE_ID` varchar(40) NOT NULL,
  `dt_DATE_START` datetime NOT NULL,
  `dt_DATE_END` datetime NOT NULL,
  `lg_GROSSISTE_ID` varchar(40) NOT NULL,
  PRIMARY KEY (`lg_QUINZAINE_ID`),
  KEY `TQUINZAINE_LG_GROSSISTE_ID_FK` (`lg_GROSSISTE_ID`),
  CONSTRAINT `TQUINZAINE_LG_GROSSISTE_ID_FK` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_recettes
CREATE TABLE IF NOT EXISTS `t_recettes` (
  `ID_RECETTE` varchar(40) NOT NULL,
  `lg_TYPE_RECETTE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `str_CREATED_BY` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_UPDATED_BY` varchar(40) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `str_DESCRIPTION` varchar(2000) DEFAULT NULL,
  `str_REF_FACTURE` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`ID_RECETTE`),
  KEY `lg_TYPE_RECETTE_ID` (`lg_TYPE_RECETTE_ID`),
  KEY `t_recettes_t_user_lg_USER_ID_fk` (`lg_USER_ID`),
  CONSTRAINT `t_recettes_fk` FOREIGN KEY (`lg_TYPE_RECETTE_ID`) REFERENCES `t_type_recette` (`lg_TYPE_RECETTE_ID`),
  CONSTRAINT `t_recettes_t_user_lg_USER_ID_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_regime_caisse
CREATE TABLE IF NOT EXISTS `t_regime_caisse` (
  `lg_REGIMECAISSE_ID` varchar(40) NOT NULL,
  `str_CODEREGIMECAISSE` varchar(40) DEFAULT NULL,
  `str_LIBELLEREGIMECAISSE` varchar(40) DEFAULT NULL,
  `bool_CONTROLEMATRICULE` tinyint(1) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_REGIMECAISSE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_reglement
CREATE TABLE IF NOT EXISTS `t_reglement` (
  `lg_REGLEMENT_ID` varchar(40) NOT NULL,
  `str_REF_RESSOURCE` varchar(40) DEFAULT NULL,
  `str_BANQUE` varchar(100) DEFAULT NULL,
  `str_LIEU` varchar(100) DEFAULT NULL,
  `str_CODE_MONNAIE` varchar(100) DEFAULT NULL,
  `int_TAUX` int(11) DEFAULT NULL,
  `str_COMMENTAIRE` varchar(200) DEFAULT NULL,
  `lg_MODE_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `b_IS_FACTURE` tinyint(1) DEFAULT 0,
  `str_FIRST_LAST_NAME` text DEFAULT NULL,
  `dt_REGLEMENT` datetime DEFAULT NULL,
  `lg_USER_ID` varchar(20) DEFAULT NULL,
  `bool_CHECKED` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`lg_REGLEMENT_ID`),
  KEY `lg_MODE_REGLEMENT` (`lg_MODE_REGLEMENT_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `ix_reglement_ref_ressource` (`str_REF_RESSOURCE`),
  CONSTRAINT `t_reglement_fk` FOREIGN KEY (`lg_MODE_REGLEMENT_ID`) REFERENCES `t_mode_reglement` (`lg_MODE_REGLEMENT_ID`),
  CONSTRAINT `t_reglement_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_reglement_bordereau
CREATE TABLE IF NOT EXISTS `t_reglement_bordereau` (
  `lg_REGLEMENT_BORDEREAU_ID` varchar(40) NOT NULL,
  `str_REF_RESSOURCE` varchar(40) DEFAULT NULL,
  `dbl_MONTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_PAYE` double(15,3) DEFAULT NULL,
  `str_STATUT` varchar(80) DEFAULT NULL,
  `b_IS_PARTIEL` tinyint(4) DEFAULT 0,
  `lg_MODE_REGLEMENT` varchar(40) DEFAULT NULL,
  `str_BANQUE` varchar(40) DEFAULT NULL,
  `dt_DATE_REGLEMENT` datetime DEFAULT NULL,
  `str_PERE_REGLEMENT_BRDEREAU` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_REGLEMENT_BORDEREAU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_reglement_dossier
CREATE TABLE IF NOT EXISTS `t_reglement_dossier` (
  `lg_REGLEMENT_DOSSIER_ID` varchar(40) NOT NULL,
  `str_REF_RESSOURCE` varchar(40) DEFAULT NULL,
  `dbl_MONTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_PAYE` double(15,3) DEFAULT NULL,
  `str_STATUT` varchar(80) DEFAULT NULL,
  `b_IS_PARTIEL` tinyint(4) DEFAULT 0,
  `lg_MODE_REGLEMENT` varchar(40) DEFAULT NULL,
  `str_BANQUE` varchar(40) DEFAULT NULL,
  `dt_DATE_REGLEMENT` datetime DEFAULT NULL,
  `str_PERE_REGLEMENT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_REGLEMENT_DOSSIER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_reglement_transaction
CREATE TABLE IF NOT EXISTS `t_reglement_transaction` (
  `lg_REGLEMENT_TRANSACTION_ID` varchar(40) NOT NULL,
  `str_REF_RESSOURCE` varchar(40) DEFAULT NULL,
  `dbl_MONTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_RESTANT` double(15,3) DEFAULT NULL,
  `dbl_MONTANT_PAYE` double(15,3) DEFAULT NULL,
  `str_STATUT` varchar(80) DEFAULT NULL,
  `b_IS_PARTIEL` tinyint(4) DEFAULT 0,
  `lg_MODE_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `str_BANQUE` varchar(40) DEFAULT NULL,
  `dt_DATE_REGLEMENT` datetime DEFAULT NULL,
  `str_PERE_REGLEMENT` varchar(40) DEFAULT NULL,
  `lg_TYPE_REGLEMENT_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_REGLEMENT_TRANSACTION_ID`),
  KEY `lg_MODE_REGLEMENT_ID` (`lg_MODE_REGLEMENT_ID`),
  KEY `lg_TYPE_REGLEMENT_ID` (`lg_TYPE_REGLEMENT_ID`),
  CONSTRAINT `t_reglement_transaction_fk` FOREIGN KEY (`lg_MODE_REGLEMENT_ID`) REFERENCES `t_mode_reglement` (`lg_MODE_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_remise
CREATE TABLE IF NOT EXISTS `t_remise` (
  `lg_REMISE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `dbl_TAUX` double(5,2) DEFAULT NULL,
  `str_IDS` int(1) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_TYPE_REMISE_ID` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_REMISE_ID`),
  KEY `t_remise_fk` (`lg_TYPE_REMISE_ID`),
  CONSTRAINT `t_remise_fk` FOREIGN KEY (`lg_TYPE_REMISE_ID`) REFERENCES `t_type_remise` (`lg_TYPE_REMISE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_resume_caisse
CREATE TABLE IF NOT EXISTS `t_resume_caisse` (
  `ld_CAISSE_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `int_SOLDE_MATIN` int(11) DEFAULT NULL,
  `int_SOLDE_SOIR` int(11) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `lg_CREATED_BY` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_UPDATED_BY` varchar(40) DEFAULT NULL,
  `ID_COFFRE_CAISSE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`ld_CAISSE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `ID_COFFRE_CAISSE` (`ID_COFFRE_CAISSE`),
  CONSTRAINT `t_resume_caisse_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_resume_caisse_fk2` FOREIGN KEY (`ID_COFFRE_CAISSE`) REFERENCES `t_coffre_caisse` (`ID_COFFRE_CAISSE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_retour_fournisseur
CREATE TABLE IF NOT EXISTS `t_retour_fournisseur` (
  `lg_RETOUR_FRS_ID` varchar(40) NOT NULL,
  `str_REF_RETOUR_FRS` varchar(20) DEFAULT NULL,
  `lg_BON_LIVRAISON_ID` varchar(40) DEFAULT NULL,
  `lg_GROSSISTE_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `dt_DATE` datetime DEFAULT NULL,
  `str_REPONSE_FRS` text DEFAULT NULL,
  `str_COMMENTAIRE` varchar(255) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dl_AMOUNT` double(15,0) DEFAULT 0,
  PRIMARY KEY (`lg_RETOUR_FRS_ID`),
  KEY `lg_BON_LIVRAISON_ID` (`lg_BON_LIVRAISON_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_retour_fournisseur_fk` FOREIGN KEY (`lg_BON_LIVRAISON_ID`) REFERENCES `t_bon_livraison` (`lg_BON_LIVRAISON_ID`),
  CONSTRAINT `t_retour_fournisseur_fk1` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_retour_fournisseur_fk2` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_retour_fournisseur_detail
CREATE TABLE IF NOT EXISTS `t_retour_fournisseur_detail` (
  `lg_RETOUR_FRS_DETAIL` varchar(40) NOT NULL,
  `lg_RETOUR_FRS_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `lg_MOTIF_RETOUR` varchar(40) DEFAULT NULL,
  `int_NUMBER_RETURN` int(11) DEFAULT NULL,
  `str_RPSE_FRS` varchar(20) DEFAULT NULL,
  `int_STOCK` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_NUMBER_ANSWER` int(11) DEFAULT 0,
  `int_PAF` int(11) DEFAULT 0,
  `bonLivraisonDetail_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`lg_RETOUR_FRS_DETAIL`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_MOTIF_RETOUR` (`lg_MOTIF_RETOUR`),
  KEY `lg_RETOUR_FRS_ID` (`lg_RETOUR_FRS_ID`),
  CONSTRAINT `t_retour_fournisseur_detail_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_retour_fournisseur_detail_fk1` FOREIGN KEY (`lg_MOTIF_RETOUR`) REFERENCES `t_motif_retour` (`lg_MOTIF_RETOUR`),
  CONSTRAINT `t_retour_fournisseur_detail_fk2` FOREIGN KEY (`lg_RETOUR_FRS_ID`) REFERENCES `t_retour_fournisseur` (`lg_RETOUR_FRS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_retourdepot
CREATE TABLE IF NOT EXISTS `t_retourdepot` (
  `lg_RETOURDEPOT_ID` varchar(40) NOT NULL,
  `dbl_AMOUNT` double NOT NULL DEFAULT 0,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_DESCRIPTION` text DEFAULT NULL,
  `str_COMMENTAIRE` varchar(50) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `bool_FLAG` tinyint(1) DEFAULT 0,
  `bool_pending` tinyint(1) DEFAULT 0,
  `PKEY` varchar(80) DEFAULT '',
  PRIMARY KEY (`lg_RETOURDEPOT_ID`),
  KEY `FK_t_retourdepot_t_emplacement` (`lg_EMPLACEMENT_ID`),
  KEY `FK_t_retourdepot_t_user` (`lg_USER_ID`),
  CONSTRAINT `FK_t_retourdepot_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_retourdepot_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_retourdepotdetail
CREATE TABLE IF NOT EXISTS `t_retourdepotdetail` (
  `lg_RETOURDEPOTDETAIL_ID` varchar(40) NOT NULL,
  `lg_RETOURDEPOT_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_STOCK` int(11) DEFAULT 0,
  `int_PRICE_DETAIL` int(11) DEFAULT 0,
  `int_PRICE` int(11) DEFAULT 0,
  `int_NUMBER_RETURN` int(11) DEFAULT 0,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_RETOURDEPOTDETAIL_ID`),
  KEY `FK_t_retourdepotdetail_t_retourdepot` (`lg_RETOURDEPOT_ID`),
  KEY `FK_t_retourdepotdetail_t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_retourdepotdetail_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_retourdepotdetail_t_retourdepot` FOREIGN KEY (`lg_RETOURDEPOT_ID`) REFERENCES `t_retourdepot` (`lg_RETOURDEPOT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_retrocession
CREATE TABLE IF NOT EXISTS `t_retrocession` (
  `lg_RETROCESSION_ID` varchar(20) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_REFERENCE` varchar(20) DEFAULT NULL,
  `str_COMMENTAIRE` varchar(100) DEFAULT NULL,
  `int_MONTANT_HT` int(11) DEFAULT NULL,
  `int_MONTANT_TTC` int(11) DEFAULT NULL,
  `lg_CLIENT_ID` varchar(20) DEFAULT NULL,
  `int_REMISE` int(11) DEFAULT NULL,
  `int_ESCOMPTE_SOCIETE` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_RETROCESSION_ID`),
  KEY `lg_CLIENT_ID` (`lg_CLIENT_ID`),
  KEY `lg_REMISE_ID` (`int_REMISE`),
  KEY `lg_ESCOMPTE_SOCIETE_ID` (`int_ESCOMPTE_SOCIETE`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_retrocession_fk` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`),
  CONSTRAINT `t_retrocession_fk4` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_retrocession_detail
CREATE TABLE IF NOT EXISTS `t_retrocession_detail` (
  `lg_RETROCESSIONDETAIL_ID` varchar(20) NOT NULL,
  `int_Qte_facture` int(11) DEFAULT NULL,
  `bool_T_F` tinyint(1) DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(20) DEFAULT NULL,
  `lg_RETROCESSION_ID` varchar(20) DEFAULT NULL,
  `int_REMISE` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_RETROCESSIONDETAIL_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_RETROCESSION_ID` (`lg_RETROCESSION_ID`),
  KEY `lg_REMISE_ID` (`int_REMISE`),
  CONSTRAINT `t_retrocession_detail_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_retrocession_detail_fk1` FOREIGN KEY (`lg_RETROCESSION_ID`) REFERENCES `t_retrocession` (`lg_RETROCESSION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_risque
CREATE TABLE IF NOT EXISTS `t_risque` (
  `lg_RISQUE_ID` varchar(40) NOT NULL,
  `str_CODE_RISQUE` varchar(40) DEFAULT NULL,
  `str_LIBELLE_RISQUE` varchar(40) DEFAULT NULL,
  `str_RISQUE_OFFICIEL` varchar(40) DEFAULT NULL,
  `lg_TYPERISQUE_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_RISQUE_ID`),
  KEY `lg_TYPERISQUE_ID` (`lg_TYPERISQUE_ID`),
  CONSTRAINT `t_risque_fk` FOREIGN KEY (`lg_TYPERISQUE_ID`) REFERENCES `t_type_risque` (`lg_TYPERISQUE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_role
CREATE TABLE IF NOT EXISTS `t_role` (
  `lg_ROLE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_DESIGNATION` varchar(50) DEFAULT NULL,
  `str_TYPE` varchar(20) DEFAULT 'CUSTOMER',
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_ROLE_ID`),
  UNIQUE KEY `lg_ROLE_ID` (`lg_ROLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_role_privelege
CREATE TABLE IF NOT EXISTS `t_role_privelege` (
  `lg_ROLE_PRIVILEGE` varchar(40) NOT NULL,
  `lg_ROLE_ID` varchar(40) DEFAULT NULL,
  `lg_PRIVILEGE_ID` varchar(50) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `str_CREATED_BY` varchar(20) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_UPDATED_BY` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_ROLE_PRIVILEGE`),
  UNIQUE KEY `lg_ROLE_PRIVILEGE` (`lg_ROLE_PRIVILEGE`),
  KEY `lg_ROLE_ID` (`lg_ROLE_ID`),
  KEY `lg_PRIVILEGE_ID` (`lg_PRIVILEGE_ID`),
  CONSTRAINT `t_role_privelege_fk` FOREIGN KEY (`lg_ROLE_ID`) REFERENCES `t_role` (`lg_ROLE_ID`),
  CONSTRAINT `t_role_privelege_fk1` FOREIGN KEY (`lg_PRIVILEGE_ID`) REFERENCES `t_privilege` (`lg_PRIVELEGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=1638 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_role_user
CREATE TABLE IF NOT EXISTS `t_role_user` (
  `lg_USER_ROLE_ID` varchar(40) NOT NULL,
  `lg_ROLE_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_CREATED_BY` varchar(20) DEFAULT NULL,
  `str_UPDATED_BY` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_USER_ROLE_ID`),
  UNIQUE KEY `lg_USER_ROLE_ID` (`lg_USER_ROLE_ID`),
  KEY `lg_ROLE_ID` (`lg_ROLE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `t_role_user_fk` FOREIGN KEY (`lg_ROLE_ID`) REFERENCES `t_role` (`lg_ROLE_ID`),
  CONSTRAINT `t_role_user_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=4096 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_rupture_history
CREATE TABLE IF NOT EXISTS `t_rupture_history` (
  `lg_RUPTURE_HISTORY_ID` varchar(20) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `grossisteId` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_RUPTURE_HISTORY_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_rupture_history_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_sequencier
CREATE TABLE IF NOT EXISTS `t_sequencier` (
  `lg_SEQUENCIER_ID` varchar(20) NOT NULL,
  `int_SEQUENCE` int(11) DEFAULT 0,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_SEQUENCIER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 AVG_ROW_LENGTH=16384;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_skin
CREATE TABLE IF NOT EXISTS `t_skin` (
  `lg_SKIN_ID` varchar(40) NOT NULL,
  `str_RESOURCE` varchar(50) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `str_DETAIL_PATH` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`lg_SKIN_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_daly_recette
CREATE TABLE IF NOT EXISTS `t_snap_shop_daly_recette` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_TYPE_RECETTE_ID` varchar(50) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_TRANSACTION` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_TYPE_RECETTE_ID` (`lg_TYPE_RECETTE_ID`),
  CONSTRAINT `t_snap_shop_daly_recette_fk` FOREIGN KEY (`lg_TYPE_RECETTE_ID`) REFERENCES `t_type_recette` (`lg_TYPE_RECETTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_daly_recette_caisse
CREATE TABLE IF NOT EXISTS `t_snap_shop_daly_recette_caisse` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_CAISSE_ID` varchar(40) DEFAULT NULL,
  `lg_TYPE_VENTE_ID` varchar(40) DEFAULT NULL,
  `lg_TYPE_RECETTE_ID` varchar(50) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `int_AMOUNT_REMISE` double(15,3) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_VO` int(11) DEFAULT NULL,
  `int_NUMBER_VNO` int(11) DEFAULT NULL,
  `int_NUMBER_TRANSACTION` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_TYPE_RECETTE_ID` (`lg_TYPE_RECETTE_ID`),
  KEY `lg_CAISSE_ID` (`lg_CAISSE_ID`),
  KEY `lg_TYPE_VENTE_ID` (`lg_TYPE_VENTE_ID`),
  CONSTRAINT `t_snap_shop_daly_recette_caisse_fk` FOREIGN KEY (`lg_TYPE_RECETTE_ID`) REFERENCES `t_type_recette` (`lg_TYPE_RECETTE_ID`),
  CONSTRAINT `t_snap_shop_daly_recette_caisse_fk1` FOREIGN KEY (`lg_CAISSE_ID`) REFERENCES `t_caisse` (`lg_CAISSE_ID`),
  CONSTRAINT `t_snap_shop_daly_recette_caisse_fk2` FOREIGN KEY (`lg_TYPE_VENTE_ID`) REFERENCES `t_type_vente` (`lg_TYPE_VENTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_daly_sortie_famille
CREATE TABLE IF NOT EXISTS `t_snap_shop_daly_sortie_famille` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_FAMILLE_ID` varchar(50) DEFAULT NULL,
  `int_BALANCE` int(11) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_ENTREE` int(11) DEFAULT NULL,
  `int_NUMBER_SORTIE` int(11) DEFAULT NULL,
  `int_NUMBERTRANSACTION` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `t_snap_shop_daly_sortie_famille_idx1` (`str_STATUT`,`dt_CREATED`) USING BTREE,
  CONSTRAINT `t_snap_shop_daly_sortie_famille_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_daly_stat
CREATE TABLE IF NOT EXISTS `t_snap_shop_daly_stat` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_TYPE_VENTE_ID` varchar(50) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT 0.000,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_TRANSACTION` int(11) DEFAULT 0,
  `int_NUMBER` int(11) DEFAULT 0,
  `lg_TRANCHE_HORAIRE_ID` varchar(40) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `lg_USER_ID` varchar(40) DEFAULT NULL,
  `str_PKEY` char(40) NOT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_TYPE_VENTE_ID` (`lg_TYPE_VENTE_ID`),
  KEY `lg_TRANCHE_HORAIRE_ID` (`lg_TRANCHE_HORAIRE_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `FK_t_snap_shop_daly_stat_t_user` (`lg_USER_ID`),
  KEY `t_snap_shop_daly_stat_dt_CREATED` (`dt_CREATED`) USING BTREE,
  KEY `t_snap_shop_daly_stat_str_PKEY` (`str_PKEY`) USING BTREE,
  CONSTRAINT `FK_t_snap_shop_daly_stat_t_user` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_snap_shop_daly_stat_fk` FOREIGN KEY (`lg_TYPE_VENTE_ID`) REFERENCES `t_type_vente` (`lg_TYPE_VENTE_ID`),
  CONSTRAINT `t_snap_shop_daly_stat_fk1` FOREIGN KEY (`lg_TRANCHE_HORAIRE_ID`) REFERENCES `t_tranche_horaire` (`lg_TRANCHE_HORAIRE_ID`),
  CONSTRAINT `t_snap_shop_daly_stat_fk2` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_daly_stat_frequentation
CREATE TABLE IF NOT EXISTS `t_snap_shop_daly_stat_frequentation` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_TYPE_VENTE_ID` varchar(50) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_TRANSACTION` int(11) DEFAULT NULL,
  `lg_TRANCHE_HORAIRE_ID` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_TYPE_VENTE_ID` (`lg_TYPE_VENTE_ID`),
  KEY `lg_TRANCHE_HORAIRE_ID` (`lg_TRANCHE_HORAIRE_ID`),
  CONSTRAINT `t_snap_shop_daly_stat_frequentation_fk` FOREIGN KEY (`lg_TYPE_VENTE_ID`) REFERENCES `t_type_vente` (`lg_TYPE_VENTE_ID`),
  CONSTRAINT `t_snap_shop_daly_stat_frequentation_fk1` FOREIGN KEY (`lg_TRANCHE_HORAIRE_ID`) REFERENCES `t_tranche_horaire` (`lg_TRANCHE_HORAIRE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_daly_vente
CREATE TABLE IF NOT EXISTS `t_snap_shop_daly_vente` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_TYPE_VENTE_ID` varchar(50) DEFAULT NULL,
  `int_AMOUNT` double(15,3) DEFAULT NULL,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_TRANSACTION` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_TYPE_VENTE_ID` (`lg_TYPE_VENTE_ID`),
  CONSTRAINT `t_snap_shop_daly_vente_fk` FOREIGN KEY (`lg_TYPE_VENTE_ID`) REFERENCES `t_type_vente` (`lg_TYPE_VENTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_rupture_stock
CREATE TABLE IF NOT EXISTS `t_snap_shop_rupture_stock` (
  `lg_ID` varchar(50) NOT NULL,
  `lg_FAMILLE_ID` varchar(50) DEFAULT NULL,
  `int_QTY` int(11) DEFAULT 0,
  `int_QTY_PROPOSE` int(11) DEFAULT 0,
  `int_SEUI_PROPOSE` int(11) DEFAULT 0,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER_TRANSACTION` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_snap_shop_rupture_stock_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_vente_client
CREATE TABLE IF NOT EXISTS `t_snap_shop_vente_client` (
  `lg_ID` bigint(20) NOT NULL AUTO_INCREMENT,
  `lg_CLIENT_ID` varchar(40) NOT NULL,
  `int_AMOUNT_SALE` double(15,0) DEFAULT 0,
  `int_AMOUNT_AVOIR` double(15,0) DEFAULT 0,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `lg_CLIENT_ID` (`lg_CLIENT_ID`),
  CONSTRAINT `t_snap_shop_vente_client_fk1` FOREIGN KEY (`lg_CLIENT_ID`) REFERENCES `t_client` (`lg_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snap_shop_vente_societe
CREATE TABLE IF NOT EXISTS `t_snap_shop_vente_societe` (
  `lg_ID` bigint(20) NOT NULL AUTO_INCREMENT,
  `str_TIERS_PAYANT` varchar(100) DEFAULT NULL,
  `str_TYPE_TIERS_PAYANT` varchar(70) DEFAULT NULL,
  `int_AMOUNT_SALE` double(15,0) DEFAULT 0,
  `int_AMOUNT_ENCAIS` double(15,0) DEFAULT 0,
  `dt_DAY` date DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `CODEORGANISME` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`lg_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snapshot_famillesell
CREATE TABLE IF NOT EXISTS `t_snapshot_famillesell` (
  `lg_SNAPSHOT_PRODUCTSELL_ID` int(11) NOT NULL AUTO_INCREMENT,
  `int_NUMBER_JANUARY` int(11) DEFAULT 0,
  `int_NUMBER_FEBRUARY` int(11) DEFAULT 0,
  `int_NUMBER_MARCH` int(11) DEFAULT 0,
  `int_NUMBER_APRIL` int(11) DEFAULT 0,
  `int_NUMBER_MAY` int(11) DEFAULT 0,
  `int_NUMBER_JUNE` int(11) DEFAULT 0,
  `int_NUMBER_JULY` int(11) DEFAULT 0,
  `int_NUMBER_AUGUST` int(11) DEFAULT 0,
  `int_NUMBER_SEPTEMBER` int(11) DEFAULT 0,
  `int_NUMBER_OCTOBER` int(11) DEFAULT 0,
  `int_NUMBER_NOVEMBER` int(11) DEFAULT 0,
  `int_NUMBER_DECEMBER` int(11) DEFAULT 0,
  `int_YEAR` varchar(20) DEFAULT '0',
  `lg_FAMILLE_ID` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_SNAPSHOT_PRODUCTSELL_ID`),
  KEY `FK_t_snapshot_famillesell_t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `FK_t_snapshot_famillesell_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=16891 DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_snapshot_preenregistrement_compte_client_tiers_payent
CREATE TABLE IF NOT EXISTS `t_snapshot_preenregistrement_compte_client_tiers_payent` (
  `lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID` varchar(40) NOT NULL,
  `int_NUMBER_TRANSACTION` int(11) NOT NULL,
  `lg_COMPTE_CLIENT_TIERS_PAYANT_ID` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_REF` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT 0,
  PRIMARY KEY (`lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID`),
  KEY `lg_COMPTE_CLIENT_TIERS_PAYANT_ID` (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`),
  CONSTRAINT `t_snapshot_preenregistrement_compte_client_tiers_payent_fk` FOREIGN KEY (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`) REFERENCES `t_compte_client_tiers_payant` (`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_sous_menu
CREATE TABLE IF NOT EXISTS `t_sous_menu` (
  `lg_SOUS_MENU_ID` varchar(40) NOT NULL DEFAULT '',
  `str_VALUE` varchar(100) DEFAULT NULL,
  `str_IMAGE_CSS` varchar(30) DEFAULT NULL,
  `str_DESCRIPTION` varchar(200) DEFAULT NULL,
  `str_COMPOSANT` varchar(40) NOT NULL,
  `lg_MENU_ID` varchar(20) DEFAULT NULL,
  `int_PRIORITY` int(11) DEFAULT 0,
  `str_URL` varchar(50) DEFAULT NULL,
  `str_Status` varchar(20) DEFAULT NULL,
  `P_KEY` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `icon_CLASS` varchar(50) DEFAULT '',
  PRIMARY KEY (`lg_SOUS_MENU_ID`),
  UNIQUE KEY `lg_SOUS_MENU_ID` (`lg_SOUS_MENU_ID`),
  KEY `lg_MENU_ID` (`lg_MENU_ID`),
  CONSTRAINT `t_sous_menu_fk` FOREIGN KEY (`lg_MENU_ID`) REFERENCES `t_menu` (`lg_MENU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_specialite
CREATE TABLE IF NOT EXISTS `t_specialite` (
  `lg_SPECIALITE_ID` varchar(40) NOT NULL,
  `str_CODESPECIALITE` varchar(40) DEFAULT NULL,
  `str_LIBELLESPECIALITE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_SPECIALITE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_stock_snapshot
CREATE TABLE IF NOT EXISTS `t_stock_snapshot` (
  `id` date NOT NULL,
  `prixPaf` int(11) DEFAULT NULL,
  `magasin` varchar(40) NOT NULL,
  `prixTarif` int(11) DEFAULT NULL,
  `prixUni` int(11) DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `valeurTva` int(11) DEFAULT NULL,
  `familleId` varchar(40) NOT NULL,
  `prix_moyent_pondere` int(10) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`familleId`,`magasin`),
  KEY `IDX93ktdkly3egu5san5m6psvuff` (`magasin`),
  KEY `FKdo0lnera4sl0kyykbikiub714` (`familleId`),
  CONSTRAINT `FKdo0lnera4sl0kyykbikiub714` FOREIGN KEY (`familleId`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_suggestion_order
CREATE TABLE IF NOT EXISTS `t_suggestion_order` (
  `lg_SUGGESTION_ORDER_ID` varchar(40) NOT NULL,
  `str_REF` varchar(20) DEFAULT NULL,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT 'is_Process',
  PRIMARY KEY (`lg_SUGGESTION_ORDER_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_suggestion_order_fk1` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_suggestion_order_details
CREATE TABLE IF NOT EXISTS `t_suggestion_order_details` (
  `lg_SUGGESTION_ORDER_DETAILS_ID` varchar(40) NOT NULL,
  `lg_SUGGESTION_ORDER_ID` varchar(40) NOT NULL,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `int_PRICE` int(11) DEFAULT NULL,
  `int_PRICE_DETAIL` int(11) DEFAULT 0,
  `int_PAF_DETAIL` int(11) DEFAULT 0,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT 'is_Process',
  `b_falg` tinyint(1) DEFAULT 0 COMMENT '- Permet de verifier si le produit existe deja dans une suggestion.',
  PRIMARY KEY (`lg_SUGGESTION_ORDER_DETAILS_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_SUGGESTION_ORDER_ID` (`lg_SUGGESTION_ORDER_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `t_suggestion_order_detailsIdex` (`str_STATUT`),
  CONSTRAINT `t_suggestion_order_details_fk1` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_suggestion_order_details_fk2` FOREIGN KEY (`lg_SUGGESTION_ORDER_ID`) REFERENCES `t_suggestion_order` (`lg_SUGGESTION_ORDER_ID`),
  CONSTRAINT `t_suggestion_order_details_fk3` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_suggestion_reserve
CREATE TABLE IF NOT EXISTS `t_suggestion_reserve` (
  `lg_SUGGESTION_RESERVE_ID` varchar(40) NOT NULL,
  `str_REF` varchar(30) DEFAULT NULL,
  `str_CATEGORIE` varchar(10) NOT NULL,
  `str_ORIGINE` varchar(15) NOT NULL,
  `str_STATUT` varchar(15) NOT NULL,
  `motif_id` int(3) DEFAULT NULL,
  `str_COMMENTAIRE` varchar(500) DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT NULL,
  `lg_USER_CREATEUR_ID` varchar(40) DEFAULT NULL,
  `lg_USER_TRAITANT_ID` varchar(40) DEFAULT NULL,
  `lg_USER_CLOTURE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `dt_TRAITEE` datetime DEFAULT NULL,
  `dt_CLOTURE` datetime DEFAULT NULL,
  `lg_USER_VERROU_ID` varchar(40) DEFAULT NULL,
  `dt_VERROU` datetime DEFAULT NULL,
  `lg_USER_CONTROLE_ID` varchar(40) DEFAULT NULL,
  `dt_CONTROLE` datetime DEFAULT NULL,
  `str_OBSERVATION_CONTROLE` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`lg_SUGGESTION_RESERVE_ID`) USING BTREE,
  KEY `idx_sugg_reserve_statut` (`str_STATUT`) USING BTREE,
  KEY `idx_sugg_reserve_categorie` (`str_CATEGORIE`) USING BTREE,
  KEY `idx_sugg_reserve_date` (`dt_CREATED`) USING BTREE,
  KEY `idx_sugg_reserve_empl` (`lg_EMPLACEMENT_ID`) USING BTREE,
  KEY `idx_sugg_reserve_ouverte` (`lg_EMPLACEMENT_ID`,`str_CATEGORIE`,`str_ORIGINE`,`str_STATUT`) USING BTREE,
  KEY `idx_suggestion_reserve_controle` (`str_STATUT`,`dt_CONTROLE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_suggestion_reserve_detail
CREATE TABLE IF NOT EXISTS `t_suggestion_reserve_detail` (
  `lg_SUGGESTION_RESERVE_DETAIL_ID` varchar(40) NOT NULL,
  `lg_SUGGESTION_RESERVE_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `int_QTE_PROPOSEE` int(11) NOT NULL DEFAULT 0,
  `int_QTE_RETENUE` int(11) DEFAULT NULL,
  `int_QTE_DEPLACEE` int(11) NOT NULL DEFAULT 0,
  `int_STOCK_RAYON` int(11) DEFAULT NULL,
  `int_STOCK_RESERVE` int(11) DEFAULT NULL,
  `int_SEUIL_DECLENCHEUR` int(11) DEFAULT NULL,
  `int_CIBLE` int(11) DEFAULT NULL,
  `int_DISPONIBLE` int(11) DEFAULT NULL,
  `str_FORMULE` varchar(255) DEFAULT NULL,
  `str_ETAT` varchar(20) NOT NULL,
  `str_CODE_ECHEC` varchar(40) DEFAULT NULL,
  `str_MOTIF_LIGNE` varchar(255) DEFAULT NULL,
  `lg_MOUVEMENT_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_SUGGESTION_RESERVE_DETAIL_ID`) USING BTREE,
  KEY `idx_sugg_res_det_suggestion` (`lg_SUGGESTION_RESERVE_ID`) USING BTREE,
  KEY `idx_sugg_res_det_famille` (`lg_FAMILLE_ID`) USING BTREE,
  KEY `idx_sugg_res_det_etat` (`str_ETAT`) USING BTREE,
  KEY `idx_sugg_res_det_sugg_famille` (`lg_SUGGESTION_RESERVE_ID`,`lg_FAMILLE_ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_support_controle
CREATE TABLE IF NOT EXISTS `t_support_controle` (
  `id` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL,
  `code` varchar(60) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `module` varchar(50) DEFAULT NULL,
  `requete_sql` text NOT NULL,
  `dry_run` tinyint(1) NOT NULL DEFAULT 1,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `ordre` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_support_controle_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_support_demande
CREATE TABLE IF NOT EXISTS `t_support_demande` (
  `id` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL,
  `objet` varchar(255) NOT NULL,
  `message` varchar(4000) NOT NULL,
  `module_concerne` varchar(100) DEFAULT NULL,
  `urgence` varchar(20) NOT NULL DEFAULT 'MOYENNE',
  `nom_officine` varchar(255) DEFAULT NULL,
  `email_officine` varchar(255) DEFAULT NULL,
  `telephone` varchar(30) DEFAULT NULL,
  `cree_par` varchar(255) DEFAULT NULL,
  `statut_envoi` varchar(20) NOT NULL DEFAULT 'EN_COURS',
  `erreur_envoi` varchar(1000) DEFAULT NULL,
  `pieces_jointes` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_support_job
CREATE TABLE IF NOT EXISTS `t_support_job` (
  `id` varchar(50) NOT NULL,
  `code` varchar(60) NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `requete_sql` text NOT NULL,
  `max_age_minutes` int(11) NOT NULL DEFAULT 1800,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `ordre` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_support_job_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_support_job_run
CREATE TABLE IF NOT EXISTS `t_support_job_run` (
  `code` varchar(60) NOT NULL,
  `last_run_at` datetime NOT NULL,
  `hostname` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_support_ticket
CREATE TABLE IF NOT EXISTS `t_support_ticket` (
  `id` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `officine` varchar(255) DEFAULT NULL,
  `utilisateur` varchar(255) DEFAULT NULL,
  `module` varchar(100) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'INCIDENT',
  `priorite` varchar(20) NOT NULL DEFAULT 'MOYENNE',
  `sujet` varchar(255) NOT NULL,
  `description` varchar(4000) DEFAULT NULL,
  `statut_ticket` varchar(30) NOT NULL DEFAULT 'NOUVEAU',
  `affecte_a` varchar(255) DEFAULT NULL,
  `event_signature` varchar(64) DEFAULT NULL,
  `application_event_id` varchar(50) DEFAULT NULL,
  `pieces_jointes` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_support_ticket_numero` (`numero`),
  KEY `idx_support_ticket_statut` (`statut_ticket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_support_ticket_message
CREATE TABLE IF NOT EXISTS `t_support_ticket_message` (
  `id` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL,
  `ticket_id` varchar(50) NOT NULL,
  `auteur` varchar(255) DEFAULT NULL,
  `direction` varchar(20) NOT NULL DEFAULT 'OFFICINE',
  `message` varchar(4000) NOT NULL,
  `pieces_jointes` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_ticket_message_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_tableau
CREATE TABLE IF NOT EXISTS `t_tableau` (
  `lg_TABLEAU_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TABLEAU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_taux_marque
CREATE TABLE IF NOT EXISTS `t_taux_marque` (
  `lg_TAUX_MARQUE_ID` varchar(40) NOT NULL,
  `str_CODE` varchar(40) DEFAULT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TAUX_MARQUE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_taux_remboursement
CREATE TABLE IF NOT EXISTS `t_taux_remboursement` (
  `lg_TAUX_REMBOUR_ID` varchar(40) NOT NULL,
  `str_CODE_REMB` int(11) DEFAULT NULL,
  `str_LIBELLEE` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TAUX_REMBOUR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_taux_rembourssement
CREATE TABLE IF NOT EXISTS `t_taux_rembourssement` (
  `lg_TAUX_REMBOUR_ID` varchar(40) NOT NULL,
  `str_CODE_REMB` int(11) DEFAULT NULL,
  `str_LIBELLEE` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TAUX_REMBOUR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_tiers_payant
CREATE TABLE IF NOT EXISTS `t_tiers_payant` (
  `lg_TIERS_PAYANT_ID` varchar(40) NOT NULL,
  `lg_MODEL_FACTURE_ID` varchar(40) NOT NULL,
  `str_CODE_ORGANISME` varchar(255) DEFAULT NULL,
  `str_NAME` varchar(100) DEFAULT NULL,
  `str_FULLNAME` varchar(100) DEFAULT NULL,
  `str_ADRESSE` text DEFAULT NULL,
  `str_MOBILE` varchar(50) DEFAULT NULL,
  `str_TELEPHONE` varchar(50) DEFAULT NULL,
  `str_MAIL` varchar(100) DEFAULT NULL,
  `dbl_PLAFOND_CREDIT` double(12,2) DEFAULT NULL,
  `dbl_TAUX_REMBOURSEMENT` double(5,2) DEFAULT NULL,
  `str_NUMERO_CAISSE_OFFICIEL` varchar(40) DEFAULT NULL,
  `str_CENTRE_PAYEUR` varchar(50) DEFAULT NULL,
  `str_CODE_REGROUPEMENT` varchar(40) DEFAULT NULL,
  `dbl_SEUIL_MINIMUM` double(12,2) DEFAULT NULL,
  `bool_INTERDICTION` tinyint(1) DEFAULT NULL,
  `bool_IsACCOUNT` tinyint(1) DEFAULT 0,
  `str_CODE_COMPTABLE` varchar(40) DEFAULT NULL,
  `bool_PRENUM_FACT_SUBROGATOIRE` tinyint(1) DEFAULT NULL,
  `int_NUMERO_DECOMPTE` int(10) DEFAULT NULL,
  `str_CODE_PAIEMENT` varchar(40) DEFAULT NULL,
  `dt_DELAI_PAIEMENT` int(11) DEFAULT NULL,
  `dbl_POURCENTAGE_REMISE` double(5,2) DEFAULT NULL,
  `dbl_REMISE_FORFETAIRE` double(12,2) DEFAULT NULL,
  `str_CODE_EDIT_BORDEREAU` varchar(40) DEFAULT NULL,
  `int_NBRE_EXEMPLAIRE_BORD` int(10) DEFAULT NULL,
  `int_PERIODICITE_EDIT_BORD` int(10) DEFAULT NULL,
  `int_DATE_DERNIERE_EDITION` int(11) DEFAULT NULL,
  `str_NUMERO_IDF_ORGANISME` varchar(40) DEFAULT NULL,
  `dbl_MONTANT_F_CLIENT` double(12,2) DEFAULT NULL,
  `dbl_BASE_REMISE` double(12,2) DEFAULT NULL,
  `str_CODE_DOC_COMPTOIRE` varchar(40) DEFAULT NULL,
  `bool_ENABLED` tinyint(1) DEFAULT NULL,
  `lg_VILLE_ID` varchar(40) DEFAULT NULL,
  `lg_TYPE_TIERS_PAYANT_ID` varchar(40) DEFAULT NULL,
  `lg_TYPE_CONTRAT_ID` varchar(40) DEFAULT NULL,
  `lg_REGIME_CAISSE_ID` varchar(40) DEFAULT NULL,
  `lg_RISQUE_ID` varchar(40) DEFAULT NULL,
  `lg_SEQUENCIER_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `str_PHOTO` varchar(40) DEFAULT NULL,
  `str_REGISTRE_COMMERCE` varchar(100) DEFAULT NULL,
  `str_CODE_OFFICINE` varchar(100) DEFAULT NULL,
  `str_COMPTE_CONTRIBUABLE` varchar(100) DEFAULT NULL,
  `db_CONSOMMATION_MENSUELLE` int(11) DEFAULT 0,
  `b_IsAbsolute` tinyint(1) DEFAULT 0 COMMENT 'On verifie si le plafond credit est absolu ou relatif a la facturation',
  `b_CANBEUSE` tinyint(1) DEFAULT 1 COMMENT 'On verifie si le plfond du tierspayant n''est pas atteint',
  `lg_GROUPE_ID` mediumint(9) unsigned DEFAULT NULL,
  `int_NBREBONS` mediumint(9) DEFAULT -1,
  `int_MONTANTFAC` int(11) DEFAULT -1,
  `account` int(11) DEFAULT 0,
  `to_be_exclude` tinyint(1) DEFAULT 0,
  `is_depot` tinyint(1) DEFAULT 0,
  `grouping_by_taux` tinyint(1) DEFAULT 0,
  `regime_imposition` varchar(200) DEFAULT NULL,
  `str_MODE_TRI_FACTURE` varchar(30) NOT NULL DEFAULT 'ALPHABETIQUE',
  PRIMARY KEY (`lg_TIERS_PAYANT_ID`),
  KEY `lg_VILLE_ID` (`lg_VILLE_ID`),
  KEY `lg_TYPE_TIERS_PAYANT_ID` (`lg_TYPE_TIERS_PAYANT_ID`),
  KEY `lg_TYPE_CONTRAT_ID` (`lg_TYPE_CONTRAT_ID`),
  KEY `lg_REGIME_CAISSE_ID` (`lg_REGIME_CAISSE_ID`),
  KEY `lg_RISQUE_ID` (`lg_RISQUE_ID`),
  KEY `lg_SEQUENCIER_ID` (`lg_SEQUENCIER_ID`),
  KEY `FK_t_tiers_payant_t_model_facture` (`lg_MODEL_FACTURE_ID`),
  KEY `lg_GROUPE_ID` (`lg_GROUPE_ID`),
  CONSTRAINT `FK_t_tiers_payant_t_model_facture` FOREIGN KEY (`lg_MODEL_FACTURE_ID`) REFERENCES `t_model_facture` (`lg_MODEL_FACTURE_ID`),
  CONSTRAINT `t_tiers_payant_fk` FOREIGN KEY (`lg_VILLE_ID`) REFERENCES `t_ville` (`lg_VILLE_ID`),
  CONSTRAINT `t_tiers_payant_fk1` FOREIGN KEY (`lg_TYPE_TIERS_PAYANT_ID`) REFERENCES `t_type_tiers_payant` (`lg_TYPE_TIERS_PAYANT_ID`),
  CONSTRAINT `t_tiers_payant_fk2` FOREIGN KEY (`lg_TYPE_CONTRAT_ID`) REFERENCES `t_type_contrat` (`lg_TYPE_CONTRAT_ID`),
  CONSTRAINT `t_tiers_payant_fk3` FOREIGN KEY (`lg_REGIME_CAISSE_ID`) REFERENCES `t_regime_caisse` (`lg_REGIMECAISSE_ID`),
  CONSTRAINT `t_tiers_payant_fk4` FOREIGN KEY (`lg_RISQUE_ID`) REFERENCES `t_risque` (`lg_RISQUE_ID`),
  CONSTRAINT `t_tiers_payant_fk5` FOREIGN KEY (`lg_SEQUENCIER_ID`) REFERENCES `t_sequencier` (`lg_SEQUENCIER_ID`),
  CONSTRAINT `t_tiers_payant_fk6` FOREIGN KEY (`lg_GROUPE_ID`) REFERENCES `t_groupe_tierspayant` (`lg_GROUPE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_tranche
CREATE TABLE IF NOT EXISTS `t_tranche` (
  `lg_TRANCHE_ID` varchar(40) NOT NULL,
  `int_MONTANT_MIN` int(11) DEFAULT NULL,
  `int_MONTANT_MAX` int(11) DEFAULT NULL,
  `dbl_POURCENTAGE_TRANCHE` double(15,3) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TRANCHE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_tranche_horaire
CREATE TABLE IF NOT EXISTS `t_tranche_horaire` (
  `lg_TRANCHE_HORAIRE_ID` varchar(40) NOT NULL,
  `int_HEURE_MIN` int(11) DEFAULT NULL,
  `int_HEURE_MAX` int(11) DEFAULT NULL,
  `str_LIBELLE` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TRANCHE_HORAIRE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_transaction
CREATE TABLE IF NOT EXISTS `t_transaction` (
  `str_transaction_id` varchar(40) NOT NULL,
  `str_transaction_code_ID` varchar(20) NOT NULL,
  `dt_transaction_date` datetime DEFAULT NULL,
  `str_user_account_ID` varchar(20) DEFAULT NULL,
  `str_Description` varchar(200) DEFAULT NULL,
  `dec_Amount` double(40,3) DEFAULT NULL,
  `dt_date_created` datetime DEFAULT NULL,
  `str_transaction_number` varchar(200) DEFAULT NULL,
  `b_valide` tinyint(1) DEFAULT 0,
  `str_transaction_type_ID` varchar(50) DEFAULT NULL,
  `str_Motif_Transaction` varchar(500) DEFAULT NULL,
  `is_cancel` tinyint(1) DEFAULT 0,
  `dec_Balance_InDisponible` double(15,3) DEFAULT 0.000,
  `dec_Balance_Disponible` double(15,3) DEFAULT 0.000,
  PRIMARY KEY (`str_transaction_id`),
  UNIQUE KEY `str_transaction_id` (`str_transaction_id`),
  KEY `str_transaction_code_ID` (`str_transaction_code_ID`),
  KEY `str_transaction_type_ID` (`str_transaction_type_ID`),
  KEY `str_transaction_number` (`str_transaction_number`),
  KEY `str_user_account_ID` (`str_user_account_ID`),
  CONSTRAINT `t_transaction_acount_fk` FOREIGN KEY (`str_transaction_code_ID`) REFERENCES `t_transaction_code` (`str_transaction_code_ID`),
  CONSTRAINT `t_transaction_acount_fk1` FOREIGN KEY (`str_transaction_type_ID`) REFERENCES `t_transaction_type` (`str_transaction_type_ID`),
  CONSTRAINT `t_transaction_acount_fk2` FOREIGN KEY (`str_user_account_ID`) REFERENCES `t_compte_client` (`lg_COMPTE_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_transaction_code
CREATE TABLE IF NOT EXISTS `t_transaction_code` (
  `str_transaction_code_ID` varchar(20) NOT NULL,
  `str_description` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`str_transaction_code_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_transaction_type
CREATE TABLE IF NOT EXISTS `t_transaction_type` (
  `str_transaction_type_ID` varchar(20) NOT NULL,
  `str_Description` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`str_transaction_type_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_tva
CREATE TABLE IF NOT EXISTS `t_tva` (
  `lg_TVA_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(40) DEFAULT NULL,
  `dbl_TAUX` double(15,3) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TVA_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_bordereau
CREATE TABLE IF NOT EXISTS `t_type_bordereau` (
  `lg_TYPE_BORDEREAU_ID` varchar(40) NOT NULL,
  `str_NUMERO_ETAT` varchar(40) DEFAULT NULL,
  `str_LIBELLE_TYPE_BORDEREAU` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_BORDEREAU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_client
CREATE TABLE IF NOT EXISTS `t_type_client` (
  `lg_TYPE_CLIENT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_TYPE` varchar(50) DEFAULT 'OTHER',
  `str_DESCRIPTION` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_contrat
CREATE TABLE IF NOT EXISTS `t_type_contrat` (
  `lg_TYPE_CONTRAT_ID` varchar(40) NOT NULL,
  `str_CODE_TYPE_CONTRAT` varchar(40) DEFAULT NULL,
  `str_LIBELLE_TYPE_CONTRAT` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_CONTRAT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_depense
CREATE TABLE IF NOT EXISTS `t_type_depense` (
  `lg_TYPE_DEPENSE_ID` varchar(40) NOT NULL,
  `str_TYPE_DEPENSE` varchar(40) DEFAULT NULL,
  `str_NUMERO_COMPTE` varchar(20) DEFAULT NULL,
  `is_USE_TVA` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`lg_TYPE_DEPENSE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_facture
CREATE TABLE IF NOT EXISTS `t_type_facture` (
  `lg_TYPE_FACTURE_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_FACTURE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_mvt_caisse
CREATE TABLE IF NOT EXISTS `t_type_mvt_caisse` (
  `lg_TYPE_MVT_CAISSE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_CODE_COMPTABLE` varchar(30) DEFAULT NULL,
  `str_CODE_REGROUPEMENT` varchar(30) DEFAULT NULL,
  `categorie` int(2) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_MVT_CAISSE_ID`),
  UNIQUE KEY `lg_TYPE_MVT_CAISSE_ID` (`lg_TYPE_MVT_CAISSE_ID`),
  KEY `categorie_type_mvt` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_passation
CREATE TABLE IF NOT EXISTS `t_type_passation` (
  `lg_TYPE_PASSATION_ID` varchar(20) NOT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  `str_LIBELLE` varchar(20) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_PASSATION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_promo
CREATE TABLE IF NOT EXISTS `t_type_promo` (
  `lg_TYPE_PROMO_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_PROMO_ID`),
  UNIQUE KEY `lg_TYPE_PROMO_ID` (`lg_TYPE_PROMO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_recette
CREATE TABLE IF NOT EXISTS `t_type_recette` (
  `lg_TYPE_RECETTE_ID` varchar(40) NOT NULL,
  `str_TYPE_RECETTE` varchar(40) DEFAULT NULL,
  `str_NUMERO_COMPTE` varchar(20) DEFAULT NULL,
  `is_USE_TVA` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`lg_TYPE_RECETTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_regime
CREATE TABLE IF NOT EXISTS `t_type_regime` (
  `lg_TYPE_REGIME_ID` varchar(40) NOT NULL,
  `str_LIBELLE` varchar(50) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_REGIME_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_reglement
CREATE TABLE IF NOT EXISTS `t_type_reglement` (
  `lg_TYPE_REGLEMENT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(20) DEFAULT NULL,
  `str_DESCRIPTION` varchar(20) DEFAULT NULL,
  `str_FLAG` varchar(1) DEFAULT '0',
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_remise
CREATE TABLE IF NOT EXISTS `t_type_remise` (
  `lg_TYPE_REMISE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_DESCRIPTION` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_REMISE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_risque
CREATE TABLE IF NOT EXISTS `t_type_risque` (
  `lg_TYPERISQUE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPERISQUE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_societe
CREATE TABLE IF NOT EXISTS `t_type_societe` (
  `lg_TYPE_SOCIETE` varchar(40) NOT NULL,
  `str_CODE_TYPE_SOCIETE` varchar(40) DEFAULT NULL,
  `str_LIBELLE_TYPE_SOCIETE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_SOCIETE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_stock
CREATE TABLE IF NOT EXISTS `t_type_stock` (
  `lg_TYPE_STOCK_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) NOT NULL,
  `str_DESCRIPTION` varchar(100) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_STOCK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_stock_famille
CREATE TABLE IF NOT EXISTS `t_type_stock_famille` (
  `lg_TYPE_STOCK_FAMILLE_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `lg_TYPE_STOCK_ID` varchar(40) NOT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) NOT NULL DEFAULT '1',
  `str_NAME` mediumtext NOT NULL,
  `str_DESCRIPTION` mediumtext NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_STOCK_FAMILLE_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_TYPE_STOCK_ID` (`lg_TYPE_STOCK_ID`),
  KEY `lg_EMPLACEMENT_ID` (`lg_EMPLACEMENT_ID`),
  KEY `idx_tsf_type_empl_statut` (`lg_TYPE_STOCK_ID`,`lg_EMPLACEMENT_ID`,`str_STATUT`) USING BTREE,
  CONSTRAINT `t_type_stock_famille_fk` FOREIGN KEY (`lg_TYPE_STOCK_ID`) REFERENCES `t_type_stock` (`lg_TYPE_STOCK_ID`),
  CONSTRAINT `t_type_stock_famille_fk1` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_type_stock_famille_fk2` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_tiers_payant
CREATE TABLE IF NOT EXISTS `t_type_tiers_payant` (
  `lg_TYPE_TIERS_PAYANT_ID` varchar(40) NOT NULL,
  `str_CODE_TYPE_TIERS_PAYANT` varchar(40) DEFAULT NULL,
  `str_LIBELLE_TYPE_TIERS_PAYANT` varchar(100) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_TIERS_PAYANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_type_vente
CREATE TABLE IF NOT EXISTS `t_type_vente` (
  `lg_TYPE_VENTE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_DESCRIPTION` varchar(100) DEFAULT NULL,
  `str_TYPE` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPE_VENTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_typecontencieux
CREATE TABLE IF NOT EXISTS `t_typecontencieux` (
  `lg_TYPECONTENCIEUX_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) NOT NULL,
  `str_DESCRIPTION` varchar(100) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPECONTENCIEUX_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_typedepot
CREATE TABLE IF NOT EXISTS `t_typedepot` (
  `lg_TYPEDEPOT_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(50) DEFAULT NULL,
  `str_DESCRIPTION` varchar(100) DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPEDEPOT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_typeetiquette
CREATE TABLE IF NOT EXISTS `t_typeetiquette` (
  `lg_TYPEETIQUETTE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) NOT NULL,
  `str_DESCRIPTION` varchar(100) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPEETIQUETTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_typelitige
CREATE TABLE IF NOT EXISTS `t_typelitige` (
  `lg_TYPELITIGE_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) NOT NULL,
  `str_DESCRIPTION` varchar(100) NOT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_TYPELITIGE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_typesuggestion
CREATE TABLE IF NOT EXISTS `t_typesuggestion` (
  `lg_TYPESUGGESTION_ID` varchar(40) NOT NULL DEFAULT '',
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_TYPESUGGESTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_user
CREATE TABLE IF NOT EXISTS `t_user` (
  `lg_USER_ID` varchar(40) NOT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) NOT NULL DEFAULT '1',
  `str_IDS` int(1) DEFAULT 0,
  `str_LOGIN` varchar(40) NOT NULL,
  `str_TYPE` varchar(50) NOT NULL DEFAULT 'CUSTOMER',
  `str_PASSWORD` varchar(40) DEFAULT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_CREATED_BY` varchar(20) DEFAULT NULL,
  `str_UPDATED_BY` varchar(20) DEFAULT NULL,
  `str_FIRST_NAME` mediumtext DEFAULT NULL,
  `str_LAST_NAME` mediumtext DEFAULT NULL,
  `str_LAST_CONNECTION_DATE` datetime DEFAULT NULL,
  `lg_Language_ID` varchar(20) DEFAULT '1',
  `lg_SKIN_ID` varchar(20) DEFAULT '1',
  `str_STATUT` varchar(40) DEFAULT NULL,
  `dt_LAST_ACTIVITY` datetime DEFAULT NULL,
  `str_FUNCTION` varchar(20) DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  `str_MAIL` varchar(20) DEFAULT NULL,
  `int_CONNEXION` int(11) DEFAULT 0,
  `b_CHANGE_PASSWORD` tinyint(1) DEFAULT 0,
  `b_is_connected` tinyint(1) DEFAULT 0,
  `str_PIC` varchar(50) DEFAULT 'default.png',
  PRIMARY KEY (`lg_USER_ID`),
  UNIQUE KEY `str_LOGIN_2` (`str_LOGIN`),
  UNIQUE KEY `str_LOGIN` (`str_LOGIN`),
  KEY `lg_Language_ID` (`lg_Language_ID`),
  KEY `lg_EMPLACEMENT_ID` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `t_user_fk` FOREIGN KEY (`lg_Language_ID`) REFERENCES `t_language` (`lg_Language_ID`),
  CONSTRAINT `t_user_fk1` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_user_account_snap_shot
CREATE TABLE IF NOT EXISTS `t_user_account_snap_shot` (
  `str_user_account_ID` varchar(40) DEFAULT NULL,
  `str_account_type_ID` varchar(200) DEFAULT NULL,
  `dec_Balance` double(15,3) DEFAULT 0.000,
  `dt_date_creation` datetime DEFAULT NULL,
  `dt_last_update` datetime DEFAULT NULL,
  `lg_customer_id` varchar(200) DEFAULT NULL,
  `b_active` tinyint(1) DEFAULT 0,
  `dt_effective` datetime DEFAULT NULL,
  `dec_Balance_Disponible` double(15,3) DEFAULT 0.000,
  `dec_Balance_InDisponible` double(15,3) DEFAULT 0.000,
  `lg_SNAP_SHOT_ID` varchar(50) NOT NULL,
  PRIMARY KEY (`lg_SNAP_SHOT_ID`),
  UNIQUE KEY `lg_SNAP_SHOT_ID` (`lg_SNAP_SHOT_ID`),
  KEY `str_user_account_ID` (`str_user_account_ID`),
  CONSTRAINT `t_user_account_snap_shot_fk` FOREIGN KEY (`str_user_account_ID`) REFERENCES `t_compte_client` (`lg_COMPTE_CLIENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT COMMENT='InnoDB free: 37888 kB;';

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_user_fone
CREATE TABLE IF NOT EXISTS `t_user_fone` (
  `lg_USER_FONE_ID` varchar(30) NOT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `str_PHONE` varchar(20) DEFAULT NULL,
  `lg_USER_ID` varchar(30) NOT NULL,
  PRIMARY KEY (`lg_USER_FONE_ID`),
  KEY `FK_t_user_fone_lg_USER_ID` (`lg_USER_ID`),
  CONSTRAINT `FK_t_user_fone_lg_USER_ID` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_user_imprimante
CREATE TABLE IF NOT EXISTS `t_user_imprimante` (
  `lg_USER_IMPRIMQNTE_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(30) NOT NULL,
  `lg_IMPRIMANTE_ID` varchar(40) NOT NULL,
  `str_NAME` text DEFAULT NULL,
  `str_DESCRIPTION` text DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_USER_IMPRIMQNTE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `lg_IMPRIMQNTE_ID` (`lg_IMPRIMANTE_ID`),
  CONSTRAINT `t_user_imprimante_fk` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_user_imprimante_fk1` FOREIGN KEY (`lg_IMPRIMANTE_ID`) REFERENCES `t_imprimante` (`lg_IMPRIMANTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_ville
CREATE TABLE IF NOT EXISTS `t_ville` (
  `lg_VILLE_ID` varchar(20) NOT NULL,
  `STR_NAME` varchar(100) DEFAULT NULL,
  `STR_CODE_POSTAL` varchar(50) DEFAULT NULL,
  `STR_BUREAU_DISTRIBUTEUR` varchar(200) DEFAULT NULL,
  `STR_STATUT` varchar(20) DEFAULT NULL,
  `DT_CREATED` datetime DEFAULT NULL,
  `DT_UPDATED` datetime DEFAULT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_VILLE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_warehouse
CREATE TABLE IF NOT EXISTS `t_warehouse` (
  `lg_WAREHOUSE_ID` varchar(40) NOT NULL,
  `lg_USER_ID` varchar(30) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) NOT NULL,
  `int_NUM_LOT` varchar(40) DEFAULT NULL,
  `int_NUMBER` int(11) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `lg_GROSSISTE_ID` varchar(20) DEFAULT NULL,
  `str_REF_LIVRAISON` varchar(50) DEFAULT NULL,
  `dt_SORTIE_USINE` datetime DEFAULT NULL,
  `dt_PEREMPTION` datetime DEFAULT NULL,
  `int_NUMBER_GRATUIT` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `str_REF_ORDER` varchar(20) DEFAULT NULL,
  `lg_TYPEETIQUETTE_ID` varchar(20) DEFAULT NULL,
  `str_CODE_ETIQUETTE` varchar(100) DEFAULT NULL,
  `int_NUMBER_DELETE` int(11) DEFAULT 0,
  `stock_initial` int(11) DEFAULT NULL,
  `stock_final` int(11) DEFAULT NULL,
  PRIMARY KEY (`lg_WAREHOUSE_ID`),
  KEY `lg_FAMILLE_ID` (`lg_FAMILLE_ID`),
  KEY `lg_USER_ID` (`lg_USER_ID`),
  KEY `lg_GROSSISTE_ID` (`lg_GROSSISTE_ID`),
  KEY `lg_TYPEETIQUETTE_ID` (`lg_TYPEETIQUETTE_ID`),
  KEY `idx_warehouse_statut_created` (`str_STATUT`,`dt_CREATED`) USING BTREE,
  KEY `idx_warehouse_statut_updated` (`str_STATUT`,`dt_UPDATED`) USING BTREE,
  CONSTRAINT `t_warehouse_fk` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_warehouse_fk1` FOREIGN KEY (`lg_USER_ID`) REFERENCES `t_user` (`lg_USER_ID`),
  CONSTRAINT `t_warehouse_fk2` FOREIGN KEY (`lg_GROSSISTE_ID`) REFERENCES `t_grossiste` (`lg_GROSSISTE_ID`),
  CONSTRAINT `t_warehouse_fk3` FOREIGN KEY (`lg_TYPEETIQUETTE_ID`) REFERENCES `t_typeetiquette` (`lg_TYPEETIQUETTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 PACK_KEYS=0 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_warehousedetail
CREATE TABLE IF NOT EXISTS `t_warehousedetail` (
  `lg_WAREHOUSEDETAIL_ID` varchar(40) NOT NULL,
  `lg_FAMILLE_ID` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_REF_LIVRAISON` varchar(50) DEFAULT NULL,
  `dt_PEREMPTION` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `lg_WAREHOUSE_ID` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`lg_WAREHOUSEDETAIL_ID`),
  KEY `FK_t_warehousedetail_t_famille` (`lg_FAMILLE_ID`),
  KEY `lg_WAREHOUSE_ID` (`lg_WAREHOUSE_ID`),
  CONSTRAINT `FK_t_warehousedetail_t_famille` FOREIGN KEY (`lg_FAMILLE_ID`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
  CONSTRAINT `t_warehousedetail_fk` FOREIGN KEY (`lg_WAREHOUSE_ID`) REFERENCES `t_warehouse` (`lg_WAREHOUSE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_workflow_promo
CREATE TABLE IF NOT EXISTS `t_workflow_promo` (
  `lg_WORKFLOW_PROMO_ID` varchar(40) NOT NULL,
  `str_NAME` varchar(40) DEFAULT NULL,
  `str_DESCRIPTION` varchar(40) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`lg_WORKFLOW_PROMO_ID`),
  UNIQUE KEY `lg_WORKFLOW_PROMO_ID` (`lg_WORKFLOW_PROMO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_workflow_remise_article
CREATE TABLE IF NOT EXISTS `t_workflow_remise_article` (
  `lg_WORKFLOW_REMISE_ARTICLE_ID` varchar(40) NOT NULL,
  `str_DESCRIPTION` text DEFAULT NULL,
  `str_CODE_REMISE_ARTICLE` varchar(2) DEFAULT NULL,
  `str_CODE_GRILLE_VO` int(11) DEFAULT NULL,
  `str_CODE_GRILLE_VNO` int(11) DEFAULT NULL,
  `str_STATUT` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  PRIMARY KEY (`lg_WORKFLOW_REMISE_ARTICLE_ID`),
  KEY `str_CODE_GRILLE_VO` (`str_CODE_GRILLE_VO`),
  KEY `str_CODE_GRILLE_VNO` (`str_CODE_GRILLE_VNO`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. t_zone_geographique
CREATE TABLE IF NOT EXISTS `t_zone_geographique` (
  `lg_ZONE_GEO_ID` varchar(40) NOT NULL,
  `str_LIBELLEE` varchar(40) DEFAULT NULL,
  `str_CODE` varchar(20) DEFAULT NULL,
  `dt_CREATED` datetime DEFAULT NULL,
  `dt_UPDATED` datetime DEFAULT NULL,
  `str_STATUT` varchar(40) DEFAULT NULL,
  `lg_EMPLACEMENT_ID` varchar(40) DEFAULT '1',
  `bool_ACCOUNT` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`lg_ZONE_GEO_ID`),
  KEY `FK_t_zone_geographique_t_emplacement` (`lg_EMPLACEMENT_ID`),
  CONSTRAINT `FK_t_zone_geographique_t_emplacement` FOREIGN KEY (`lg_EMPLACEMENT_ID`) REFERENCES `t_emplacement` (`lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. taux_produit
CREATE TABLE IF NOT EXISTS `taux_produit` (
  `id` varchar(70) NOT NULL,
  `compte_tiers_payant_id` varchar(70) NOT NULL,
  `sale_iem_id` varchar(70) NOT NULL,
  `taux` float NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. typemvtproduit
CREATE TABLE IF NOT EXISTS `typemvtproduit` (
  `ID` varchar(10) NOT NULL,
  `description` varchar(255) NOT NULL,
  `categorie` int(4) NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `categorieMvttype` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. vente_exclu
CREATE TABLE IF NOT EXISTS `vente_exclu` (
  `id` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `modified_at` datetime NOT NULL,
  `status` varchar(255) NOT NULL,
  `montant_client` int(11) NOT NULL,
  `montantPaye` int(11) NOT NULL,
  `montantRegle` int(11) NOT NULL,
  `montantRemise` int(11) DEFAULT NULL,
  `montantTiersPayant` int(11) NOT NULL,
  `montantVente` int(11) NOT NULL,
  `mvtDate` date NOT NULL,
  `mvt_transaction_key` varchar(255) NOT NULL,
  `type_tiers_payant` varchar(40) NOT NULL,
  `client_id` varchar(40) DEFAULT NULL,
  `preenregistrement_id` varchar(40) NOT NULL,
  `tiersPayant_id` varchar(40) NOT NULL,
  `type_reglement_id` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `VenteExclus_mvt_transaction_key` (`mvt_transaction_key`),
  KEY `FK9a6rvy6uanclf50fvv59jbmd6` (`client_id`),
  KEY `FKb3oruc73omm3jfqc1hrvxqv5b` (`preenregistrement_id`),
  KEY `FK5b9oib1pb7bwd1sm70pcs49s5` (`tiersPayant_id`),
  KEY `FK3rwtc6308eypgyewbfgsi94op` (`type_reglement_id`),
  CONSTRAINT `FK3rwtc6308eypgyewbfgsi94op` FOREIGN KEY (`type_reglement_id`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`),
  CONSTRAINT `FK5b9oib1pb7bwd1sm70pcs49s5` FOREIGN KEY (`tiersPayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
  CONSTRAINT `FK9a6rvy6uanclf50fvv59jbmd6` FOREIGN KEY (`client_id`) REFERENCES `t_client` (`lg_CLIENT_ID`),
  CONSTRAINT `FKb3oruc73omm3jfqc1hrvxqv5b` FOREIGN KEY (`preenregistrement_id`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. vente_reglement
CREATE TABLE IF NOT EXISTS `vente_reglement` (
  `id` varchar(50) NOT NULL,
  `flag_id` varchar(255) DEFAULT NULL,
  `flaged_amount` int(11) NOT NULL,
  `montant` int(11) NOT NULL,
  `montant_attentu` int(11) NOT NULL,
  `mvtDate` datetime NOT NULL,
  `vente_id` varchar(40) NOT NULL,
  `type_regelement` varchar(40) NOT NULL,
  `ug_amount` int(11) NOT NULL DEFAULT 0,
  `ug_amount_net` int(11) NOT NULL DEFAULT 0,
  `amount_non_ca` int(11) NOT NULL DEFAULT 0,
  `montant_verse` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `indexflag_idVenteReglement` (`flag_id`),
  KEY `FKk4o86jltu2s1xwnuoau226f61` (`vente_id`),
  KEY `FKs7aqbjxvu4ur8oqq1dbl8b62h` (`type_regelement`),
  CONSTRAINT `FKk4o86jltu2s1xwnuoau226f61` FOREIGN KEY (`vente_id`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`),
  CONSTRAINT `FKs7aqbjxvu4ur8oqq1dbl8b62h` FOREIGN KEY (`type_regelement`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de table laborex_v1_db. vente_suppression
CREATE TABLE IF NOT EXISTS `vente_suppression` (
  `id` varchar(50) NOT NULL,
  `type_suppression` varchar(10) NOT NULL,
  `vente_id` varchar(50) DEFAULT NULL,
  `vente_ref` varchar(70) DEFAULT NULL,
  `produit_id` varchar(50) DEFAULT NULL,
  `produit_cip` varchar(30) DEFAULT NULL,
  `produit_libelle` varchar(255) DEFAULT NULL,
  `quantite` int(11) NOT NULL DEFAULT 0,
  `user_id` varchar(50) DEFAULT NULL,
  `user_name` varchar(150) DEFAULT NULL,
  `mvt_date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vente_suppression_date` (`mvt_date`),
  KEY `idx_vente_suppression_user` (`user_id`),
  KEY `idx_vente_suppression_produit` (`produit_id`),
  KEY `idx_vente_suppression_cip` (`produit_cip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Les données exportées n'étaient pas sélectionnées.

-- Listage de la structure de vue laborex_v1_db. select t.lg_famille_id, t.str_description, t.int_cip, bd.int_paf
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `select t.lg_famille_id, t.str_description, t.int_cip, bd.int_paf` (
	`lg_FAMILLE_ID` INT(1) NOT NULL,
	`str_DESCRIPTION` INT(1) NOT NULL,
	`int_CIP` INT(1) NOT NULL,
	`int_PAF` INT(1) NOT NULL,
	`lg_GROSSISTE_ID` INT(1) NOT NULL,
	`int_EAN13` INT(1) NOT NULL,
	`lg_BON_LIVRAISON_ID` INT(1) NOT NULL,
	`str_REF_LIVRAISON` INT(1) NOT NULL,
	`str_STATUT` INT(1) NOT NULL,
	`str_CODE_ARTICLE` INT(1) NOT NULL
);

-- Listage de la structure de vue laborex_v1_db. v_article_recherche
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_article_recherche` (
	`int_NUMBER_AVAILABLE` INT(11) NULL,
	`int_NUMBER` INT(11) NULL,
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`bool_DECONDITIONNE` TINYINT(4) NULL,
	`bl_PROMOTED` TINYINT(1) NULL,
	`bool_DECONDITIONNE_EXIST` TINYINT(4) NULL,
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PAF` INT(11) NULL,
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_EMPLACEMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP2` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_ZONE_GEO_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLEE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_EMPLACEMENT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_GROSSISTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION_GROSSISTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_T` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_article_recherche_dci
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_article_recherche_dci` (
	`str_CODE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME_DCI` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`bool_DECONDITIONNE` TINYINT(4) NULL,
	`bl_PROMOTED` TINYINT(1) NULL,
	`bool_DECONDITIONNE_EXIST` TINYINT(4) NULL,
	`int_NUMBER` INT(11) NULL,
	`int_NUMBER_AVAILABLE` INT(11) NULL,
	`lg_EMPLACEMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP2` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PAF` INT(11) NULL,
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLEE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_EMPLACEMENT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_GROSSISTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION_GROSSISTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_T` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_ZONE_GEO_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_article_vendu
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_article_vendu` (
	`lg_FAMILLE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_AVOIR` INT(11) NULL,
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`bool_DECONDITIONNE` TINYINT(4) NULL,
	`bool_DECONDITIONNE_EXIST` TINYINT(4) NULL,
	`int_PRICE` INT(11) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_NATURE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_ORDONNANCE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_TYPE_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_TICKET` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_REGLEMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_REMISE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_UPDATED` DATETIME NULL,
	`str_REF_BON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_QUANTITY` INT(11) NULL,
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER` INT(11) NULL,
	`str_FIRST_LAST_NAME` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_EMPLACEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_GROSSISTE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_STOCK_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_PREENREGISTREMENT_DETAIL_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_balance_vente
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_balance_vente` (
	`str_TYPE_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`NB_VENTE` BIGINT(21) NOT NULL,
	`BRUT_TTC` DECIMAL(32,0) NULL,
	`REMISE` DECIMAL(32,0) NULL,
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_balance_vente_caisse
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_balance_vente_caisse` (
	`NET` DECIMAL(32,0) NULL,
	`NB` BIGINT(21) NOT NULL,
	`str_TYPE_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`PANIER` DECIMAL(36,4) NULL,
	`lg_TYPE_REGLEMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`DETETIERPAYS` DECIMAL(32,0) NULL,
	`RECEIVE` DECIMAL(32,0) NULL,
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_caisse
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_caisse` (
	`bool_CHECKED` TINYINT(1) NULL,
	`str_RESSOURCE_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_RESSOURCE_REF_BIS` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`ETAT_VENTE` INT(4) NULL,
	`str_TASK` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_AMOUNT` DECIMAL(33,0) NULL,
	`int_AMOUNT_OTHER` DECIMAL(33,0) NULL,
	`int_AMOUNT_DETTE_DIFFERE` DECIMAL(33,0) NULL,
	`str_FIRST_LAST_NAME` MEDIUMTEXT NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_REGLEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL,
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME_TYE_REGLEMENT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME_TYPE_MVT_CAISSE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_FIRST_LAST_NAME_CLIENT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NUMERO_COMPTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_EMPLACEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION_LIEU` TEXT NULL COLLATE 'utf8mb3_general_ci',
	`int_AMOUNT_DIFFERE` INT(11) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_chiffre_aff_famille_periode_encour
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_chiffre_aff_famille_periode_encour` (
	`str_code_groupe` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL,
	`int_montant` BIGINT(11) NULL,
	`groupe` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_chiffre_aff_famille_periode_encour_1
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_chiffre_aff_famille_periode_encour_1` (
	`str_code_groupe_1` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED_1` DATETIME NULL,
	`groupe_1` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_montant_1` BIGINT(11) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_entree_stock
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_entree_stock` (
	`BLDATE` DATETIME NULL,
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_QTE_CMDE` INT(11) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_QTE_RECUE` INT(11) NULL,
	`int_PA_REEL` INT(11) NULL,
	`int_PAF` INT(11) NULL,
	`int_PRIX_VENTE` INT(11) NULL,
	`int_QTE_UG` INT(11) NULL,
	`int_VALEUR_ACHAT` BIGINT(22) NULL,
	`int_VALEUR_VENTE` BIGINT(22) NULL,
	`int_NUMBER` BIGINT(12) NULL,
	`int_NUMBER_INIT` INT(11) NULL,
	`lg_EMPLACEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_BON_LIVRAISON_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLEE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_STOCK_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`dt_DATE_LIVRAISON` DATETIME NULL,
	`int_TVA` INT(11) NULL,
	`int_HTTC` INT(11) NULL,
	`str_FIRST_LAST_NAME` LONGTEXT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_etat_controle_achat
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_etat_controle_achat` (
	`str_REF_LIVRAISON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_HTTC` INT(11) NULL,
	`int_TVA` INT(11) NULL,
	`int_MHT` INT(11) NULL,
	`int_QTE_RECUE` INT(11) NULL,
	`int_QTE_CMDE` INT(11) NULL,
	`str_REF_ORDER` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`str_LIBELLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_GROSSISTE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`dt_DATE_LIVRAISON` DATETIME NULL,
	`lg_ORDER_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_FIRST_NAME` MEDIUMTEXT NULL COLLATE 'utf8mb3_general_ci',
	`str_LAST_NAME` MEDIUMTEXT NULL COLLATE 'utf8mb3_general_ci',
	`dt_UPDATED` DATETIME NULL,
	`str_FIRST_LAST_NAME` LONGTEXT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_facture_subrogatoire
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_facture_subrogatoire` (
	`str_REF_BON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`b_WITHOUT_BON` TINYINT(1) NOT NULL,
	`dt_UPDATED` DATETIME NULL,
	`str_FIRST_NAME_CUSTOMER` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_LAST_NAME_CUSTOMER` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_FIRST_LAST_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE_TOTAL` INT(11) NULL,
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_FULLNAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE_TP` INT(11) NULL,
	`int_PERCENT` INT(11) NULL,
	`tp_percent` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_EMPLACEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_TICKET` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_TYPE_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`b_IS_CANCEL` TINYINT(1) NULL,
	`str_TYPE_TIERS_PAYANT` VARCHAR(1) NULL COLLATE 'cp850_general_ci',
	`str_NUMERO_SECURITE_SOCIAL` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_FIRST_LAST_NAME_CAISSIER` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE_REMISE` INT(11) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TIERS_PAYANT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_BON_BASE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_famille_dci
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_famille_dci` (
	`lg_FAMILLE_DCI_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_DCI_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dci_str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_famille_retour
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_famille_retour` (
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PAF` INT(11) NULL,
	`lg_GROSSISTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_BON_LIVRAISON_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_LIVRAISON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_frequentation_officine
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_frequentation_officine` (
	`str_FIRST_LAST_NAME` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`dt_DAY` DATE NULL,
	`TOTAL_MONTANT` DOUBLE(20,3) NULL,
	`TOTAL_COUNT` DECIMAL(54,0) NULL,
	`TOTAL_REFERENCE` DECIMAL(54,0) NULL,
	`TOTAL_PAN_MOY` DOUBLE(17,0) NULL,
	`UN_MONTANT` DOUBLE(20,3) NULL,
	`DEUX_MONTANT` DOUBLE(20,3) NULL,
	`TROIS_MONTANT` DOUBLE(20,3) NULL,
	`QUATRE_MONTANT` DOUBLE(20,3) NULL,
	`CINQ_MONTANT` DOUBLE(20,3) NULL,
	`SIX_MONTANT` DOUBLE(20,3) NULL,
	`SEPT_MONTANT` DOUBLE(20,3) NULL,
	`HUIT_MONTANT` DOUBLE(20,3) NULL,
	`NEUF_MONTANT` DOUBLE(20,3) NULL,
	`DIX_MONTANT` DOUBLE(20,3) NULL,
	`UN_COUNT` DECIMAL(54,0) NULL,
	`DEUX_COUNT` DECIMAL(54,0) NULL,
	`TROIS_COUNT` DECIMAL(54,0) NULL,
	`QUATRE_COUNT` DECIMAL(54,0) NULL,
	`CINQ_COUNT` DECIMAL(54,0) NULL,
	`SIX_COUNT` DECIMAL(54,0) NULL,
	`SEPT_COUNT` DECIMAL(54,0) NULL,
	`HUIT_COUNT` DECIMAL(54,0) NULL,
	`NEUF_COUNT` DECIMAL(54,0) NULL,
	`DIX_COUNT` DECIMAL(54,0) NULL,
	`UN_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`DEUX_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`TROIS_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`QUATRE_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`CINQ_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`SIX_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`SEPT_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`HUIT_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`NEUF_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`DIX_REFERNCEVALUE` DECIMAL(54,0) NULL,
	`PAN_MOY_UN` DOUBLE(17,0) NULL,
	`PAN_MOY_DEUX` DOUBLE(17,0) NULL,
	`PAN_MOY_TROIS` DOUBLE(17,0) NULL,
	`PAN_MOY_QUATRE` DOUBLE(17,0) NULL,
	`PAN_MOY_CINQ` DOUBLE(17,0) NULL,
	`PAN_MOY_SIX` DOUBLE(17,0) NULL,
	`PAN_MOY_SEPT` DOUBLE(17,0) NULL,
	`PAN_MOY_HUIT` DOUBLE(17,0) NULL,
	`PAN_MOY_NEUF` DOUBLE(17,0) NULL,
	`PAN_MOY_DIX` DOUBLE(17,0) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_getallsousmenubyconnecteduser
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_getallsousmenubyconnecteduser` (
	`str_VALUE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`icon_CLASS` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRIORITY` INT(11) NULL,
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_MENU_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_COMPOSANT` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_getmenubyconnecteduser
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_getmenubyconnecteduser` (
	`str_VALUE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_MENU_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`icon_CLASS` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_PRIORITY` INT(11) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_last_pre
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_last_pre` (
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_last_preenregistrement_compte_client
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_last_preenregistrement_compte_client` (
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_COMPTE_CLIENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_liste_dossier_reglement_detail
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_liste_dossier_reglement_detail` (
	`lg_DOSSIER_REGLEMENT_DETAIL_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_DOSSIER_REGLEMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dbl_AMOUNT` DOUBLE(15,3) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_UPDATED` DATETIME NULL,
	`dt_CREATED` DATETIME NULL,
	`lg_FACTURE_DETAIL_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_FACTURE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_COMPTABLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_BON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CUSTOMER` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NUMERO_SECURITE_SOCIAL` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_FIRST_LAST_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_liste_vente_annule
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_liste_vente_annule` (
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PRICE_REMISE` INT(11) NULL,
	`str_TYPE_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_UPDATED` DATETIME NULL,
	`str_FIRST_LAST_NAME_VENDEUR` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`str_FIRST_LAST_NAME_CAISSIER` LONGTEXT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_livraison
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_livraison` (
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PAF` INT(11) NULL,
	`int_PAT` INT(11) NULL,
	`int_NUM_LOT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER` INT(11) NULL,
	`str_REF_LIVRAISON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER_STOCK` INT(11) NULL,
	`str_LIBELLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_GROSSISTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dbl_PRIX_MOYEN_PONDERE` DOUBLE(15,3) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_mouvement_suivi_article
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_mouvement_suivi_article` (
	`lg_MOUVEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`P_KEY` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_TYPE_ACTION` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_ACTION` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`dt_DAY` DATE NULL,
	`dt_CREATED` DATETIME NULL,
	`dt_UPDATED` DATETIME NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER` INT(11) NULL,
	`int_NUMBERTRANSACTION` INT(11) NULL,
	`int_NUMBER_STOCK` INT(11) NULL,
	`lg_ARTICLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLEARTICLE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_ZONE_GEO_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_FABRIQUANT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_EMPLACEMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_perime
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_perime` (
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUM_LOT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER` INT(11) NULL,
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_PEREMPTION` DATETIME NULL,
	`lg_WAREHOUSE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_RESTE` BIGINT(21) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_FISRT_LAST_NAME` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`dt_UPDATED` DATETIME NULL,
	`ecart_date` INT(7) NULL,
	`str_LIBELLE_FAMILLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLEE_EMPLACEMENT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_FAMILLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_EMPLACEMENT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_GROSSISTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PAF` INT(11) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_perime_remove_stock
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_perime_remove_stock` (
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PAF` INT(11) NULL,
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLEE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUM_LOT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER_DELETE` INT(11) NULL,
	`dt_UPDATED` DATETIME NULL,
	`dt_PEREMPTION` DATETIME NULL,
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_recap_mouvement_article
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_recap_mouvement_article` (
	`dt_DAY` DATE NULL,
	`int_STOCK_DEBUT` INT(11) NULL,
	`int_STOCK_JOUR` INT(11) NULL,
	`lg_FAMILLE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_DESCRIPTION_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_EAN13` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PAF` INT(11) NULL,
	`lg_GROSSISTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLEARTICLE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_ZONE_GEO_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`CIP_ARTICLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER_VENTE` DECIMAL(32,0) NULL,
	`int_NUMBER_DECONDITIONNEMENT_OUT` DECIMAL(32,0) NULL,
	`int_NUMBER_DECONDITIONNEMENT_IN` DECIMAL(32,0) NULL,
	`int_NUMBER_RETOURFOURNISSEUR` DECIMAL(32,0) NULL,
	`int_NUMBER_PERIME` DECIMAL(32,0) NULL,
	`int_NUMBER_AJUSTEMENT_OUT` DECIMAL(32,0) NULL,
	`int_NUMBER_AJUSTEMENT_IN` DECIMAL(32,0) NULL,
	`int_NUMBER_ENTREESTOCK` DECIMAL(32,0) NULL,
	`int_NUMBER_INVENTAIRE` DECIMAL(32,0) NULL,
	`lg_MOUVEMENT_SNAPSHOT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_rp_frequentation_pharmacie
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_rp_frequentation_pharmacie` (
	`int_AMOUNT` DOUBLE(20,3) NULL,
	`dt_DAY` DATE NULL,
	`lg_TRANCHE_HORAIRE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER_TRANSACTION` DECIMAL(32,0) NULL,
	`int_NUMBER` DECIMAL(32,0) NULL,
	`str_FIRST_LAST_NAME` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`str_LIBELLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_HEURE_MIN` INT(11) NULL,
	`int_HEURE_MAX` INT(11) NULL,
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_rp_panier_moyen
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_rp_panier_moyen` (
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_AMOUNT` DOUBLE(19,7) NULL,
	`dt_DAY` DATE NULL,
	`lg_TRANCHE_HORAIRE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER_TRANSACTION` INT(11) NULL,
	`str_LIBELLE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_rp_rupture_stock
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_rp_rupture_stock` (
	`int_QTY` INT(11) NULL,
	`int_QTY_PROPOSE` INT(11) NULL,
	`int_SEUI_PROPOSE` INT(11) NULL,
	`int_NUMBER_TRANSACTION` INT(11) NULL,
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_CODE_BAREME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_SEUIL_MIN` INT(11) NULL,
	`int_QTE_REAPPROVISIONNEMENT` INT(11) NULL,
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_stat_vente_anne
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_stat_vente_anne` (
	`nbr_client` BIGINT(22) NOT NULL,
	`montant_brute_ttc` INT(11) NULL,
	`montant_remise` INT(11) NULL,
	`montant_net_ttc` BIGINT(12) NULL,
	`pan_moy_ord` DECIMAL(15,4) NULL,
	`pan_moy_nord` DECIMAL(15,4) NULL,
	`vente_ord` INT(11) NULL,
	`vente_non_ord` INT(11) NULL,
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_stat_vente_ordonnance_pay_op
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_stat_vente_ordonnance_pay_op` (
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_codeOp` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_nbr_clt` BIGINT(21) NOT NULL,
	`int_mont_brut_ttc` DECIMAL(32,0) NULL,
	`int_remise` DECIMAL(32,0) NULL,
	`int_mont_net_ttc` DECIMAL(33,0) NULL,
	`int_pan_moy` DECIMAL(37,4) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_stat_vente_sans_ordonnance_op
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_stat_vente_sans_ordonnance_op` (
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_codeOp` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_nbr_clt` BIGINT(21) NOT NULL,
	`int_mont_brut_ttc` DECIMAL(32,0) NULL,
	`int_remise` DECIMAL(32,0) NULL,
	`int_mont_net_ttc` DECIMAL(33,0) NULL,
	`int_pan_moy` DECIMAL(37,4) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_stat_vente_tp_op
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_stat_vente_tp_op` (
	`lg_USER_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_codeOp` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_nbr_clt` BIGINT(21) NOT NULL,
	`int_mont_brut_ttc` DECIMAL(32,0) NULL,
	`int_remise` DECIMAL(32,0) NULL,
	`int_mont_net_ttc` DECIMAL(33,0) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_tiers_payant_by_vente
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_tiers_payant_by_vente` (
	`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL,
	`dt_UPDATED` DATETIME NULL,
	`int_PERCENT` INT(11) NULL,
	`int_PRICE` INT(11) NULL,
	`str_LAST_TRANSACTION` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT_FACTURE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRIORITY` INT(11) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_vente_comptant
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_vente_comptant` (
	`id_famille` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`qte_serv` DECIMAL(32,0) NULL,
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_vente_credit
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_vente_credit` (
	`id_famille` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_NAME` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`qte_serv` DECIMAL(32,0) NULL,
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL
);

-- Listage de la structure de vue laborex_v1_db. v_vente_famille_periode_encour
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_vente_famille_periode_encour` (
	`str_code_groupe` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL,
	`int_montant` BIGINT(11) NULL,
	`groupe` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_vente_famille_periode_encour_1
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_vente_famille_periode_encour_1` (
	`str_code_groupe_1` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED_1` DATETIME NULL,
	`groupe_1` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_montant_1` BIGINT(11) NULL
);

-- Listage de la structure de vue laborex_v1_db. v_vente_nord
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_vente_nord` (
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PRICE_REMISE` INT(11) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL,
	`dt_UPDATED` DATETIME NULL,
	`lg_NATURE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_MEDECIN` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_BON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_ORDONNANCE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_PARENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED_ORDONNANCE` DATETIME NULL,
	`str_INFOS_CLT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_vente_ord
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_vente_ord` (
	`lg_PREENREGISTREMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`str_REF` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_USER_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_PRICE` INT(11) NULL,
	`int_PRICE_REMISE` INT(11) NULL,
	`str_STATUT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED` DATETIME NULL,
	`dt_UPDATED` DATETIME NULL,
	`lg_NATURE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_MEDECIN` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_REF_BON` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_ORDONNANCE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_PARENT_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`dt_CREATED_ORDONNANCE` DATETIME NULL,
	`str_INFOS_CLT` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`str_STATUT_VENTE` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_TYPE_VENTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci'
);

-- Listage de la structure de vue laborex_v1_db. v_ventes_par_produit
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `v_ventes_par_produit` (
	`sale_date` DATE NULL,
	`lg_EMPLACEMENT_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLE_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`product_name` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_FAMILLEARTICLE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`article_family` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_ZONE_GEO_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`rayon` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`lg_GROSSISTE_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`grossiste` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`total_quantity` DECIMAL(32,0) NULL,
	`total_price_ttc` DECIMAL(32,0) NULL,
	`total_price_ht` DECIMAL(34,0) NULL,
	`total_cost_price` DECIMAL(42,0) NULL
);

-- Listage de la structure de vue laborex_v1_db. vw_listeproduits_stockanormal
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `vw_listeproduits_stockanormal` (
	`lg_Famille_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_NUMBER_AVAILABLE` INT(11) NULL,
	`int_NUMBER` INT(11) NULL,
	`QuantiteReelle` DECIMAL(56,0) NULL
);

-- Listage de la structure de vue laborex_v1_db. vw_mouvementspararticle
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `vw_mouvementspararticle` (
	`Lg_famille_ID` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`Quantite` DECIMAL(33,0) NULL
);

-- Listage de la structure de vue laborex_v1_db. vwquantiteparjourprod
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `vwquantiteparjourprod` (
	`LG_famille_id` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`int_CIP` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`DT_day` DATE NULL,
	`quantite` DECIMAL(33,0) NULL
);

-- Listage de la structure de vue laborex_v1_db. vwstockinitialparproduit
-- Création d'une table temporaire pour palier aux erreurs de dépendances de VIEW
CREATE TABLE `vwstockinitialparproduit` (
	`Lg_famille_ID` VARCHAR(1) NULL COLLATE 'utf8mb3_general_ci',
	`int_stock_debut` INT(11) NULL
);

-- Listage de la structure de procédure laborex_v1_db. analyse_20_80_par_ca
DELIMITER //
CREATE PROCEDURE `analyse_20_80_par_ca`(
    IN p_dt_start DATE,
    IN p_dt_end DATE,
    IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100),
    IN p_code_rayon VARCHAR(100),
    IN p_code_grossiste VARCHAR(100)
)
BEGIN
    WITH VentesFiltrees AS (
        SELECT
            f.lg_FAMILLE_ID,
            f.str_NAME AS product_name,
            fa.str_LIBELLE AS article_family,
            f.int_CIP,
            g.lg_GROSSISTE_ID,
            SUM(pd.int_QUANTITY) AS agg_total_quantity,
            SUM(pd.int_PRICE) AS agg_total_price_ttc,
            (SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva)
                - SUM(pd.prixAchat * pd.int_QUANTITY)) AS agg_marge
        FROM t_preenregistrement p
        JOIN t_user u
            ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd
            ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f
            ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        LEFT JOIN t_famillearticle fa
            ON f.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_grossiste g
            ON f.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID
        WHERE
            p.dt_UPDATED >= p_dt_start
            AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
            AND p.str_STATUT = 'is_Closed'
            AND p.b_IS_CANCEL = 0
            AND p.int_PRICE > 0
            AND p.lg_TYPE_VENTE_ID <> '5'
            AND u.lg_EMPLACEMENT_ID = p_emplacement_id
            AND f.str_STATUT = 'enable'
            AND (p_code_famille IS NULL OR p_code_famille = '' OR f.lg_FAMILLEARTICLE_ID = p_code_famille)
            AND (p_code_rayon IS NULL OR p_code_rayon = '' OR f.lg_ZONE_GEO_ID = p_code_rayon)
            AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR f.lg_GROSSISTE_ID = p_code_grossiste)
        GROUP BY
            f.lg_FAMILLE_ID, f.str_NAME, fa.str_LIBELLE, f.int_CIP, g.lg_GROSSISTE_ID
    ),
    AnalyseCumulative AS (
        SELECT
            vf.*,
            SUM(vf.agg_total_price_ttc) OVER () AS grand_total_price,
            SUM(vf.agg_total_price_ttc) OVER (
                ORDER BY vf.agg_total_price_ttc DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_price
        FROM VentesFiltrees vf
    )
    SELECT
        ac.int_CIP,
        ac.product_name,
        ac.agg_total_price_ttc AS total_price_ttc,
        ac.agg_total_quantity AS total_quantity,
        ac.lg_FAMILLE_ID,
        ac.lg_GROSSISTE_ID,
        ac.article_family,
        ac.agg_marge AS marge,
        (
            SELECT fs.int_NUMBER_AVAILABLE
            FROM t_famille_stock fs
            WHERE fs.lg_FAMILLE_ID = ac.lg_FAMILLE_ID
              AND fs.lg_EMPLACEMENT_ID = p_emplacement_id
              AND fs.str_STATUT = 'enable'
            LIMIT 1
        ) AS stock_disponible
    FROM AnalyseCumulative ac
    WHERE ac.cumulative_price <= (ac.grand_total_price * 0.8)
    ORDER BY ac.agg_total_price_ttc DESC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. analyse_20_80_par_marge
DELIMITER //
CREATE PROCEDURE `analyse_20_80_par_marge`(
    IN p_dt_start DATE,
    IN p_dt_end DATE,
    IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100),
    IN p_code_rayon VARCHAR(100),
    IN p_code_grossiste VARCHAR(100)
)
BEGIN
    WITH VentesFiltrees AS (
        SELECT
            f.lg_FAMILLE_ID,
            f.str_NAME AS product_name,
            fa.str_LIBELLE AS article_family,
            f.int_CIP,
            g.lg_GROSSISTE_ID,
            SUM(pd.int_QUANTITY) AS agg_total_quantity,
            SUM(pd.int_PRICE) AS agg_total_price_ttc,
            (SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva)
                - SUM(pd.prixAchat * pd.int_QUANTITY)) AS agg_marge
        FROM t_preenregistrement p
        JOIN t_user u
            ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd
            ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f
            ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        LEFT JOIN t_famillearticle fa
            ON f.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_grossiste g
            ON f.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID
        WHERE
            p.dt_UPDATED >= p_dt_start
            AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
            AND p.str_STATUT = 'is_Closed'
            AND p.b_IS_CANCEL = 0
            AND p.int_PRICE > 0
            AND p.lg_TYPE_VENTE_ID <> '5'
            AND u.lg_EMPLACEMENT_ID = p_emplacement_id
            AND f.str_STATUT = 'enable'
            AND (p_code_famille IS NULL OR p_code_famille = '' OR f.lg_FAMILLEARTICLE_ID = p_code_famille)
            AND (p_code_rayon IS NULL OR p_code_rayon = '' OR f.lg_ZONE_GEO_ID = p_code_rayon)
            AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR f.lg_GROSSISTE_ID = p_code_grossiste)
        GROUP BY
            f.lg_FAMILLE_ID, f.str_NAME, fa.str_LIBELLE, f.int_CIP, g.lg_GROSSISTE_ID
    ),
    AnalyseCumulative AS (
        SELECT
            vf.*,
            SUM(vf.agg_marge) OVER () AS grand_total_marge,
            SUM(vf.agg_marge) OVER (
                ORDER BY vf.agg_marge DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_marge
        FROM VentesFiltrees vf
    )
    SELECT
        ac.int_CIP,
        ac.product_name,
        ac.agg_total_price_ttc AS total_price_ttc,
        ac.agg_total_quantity AS total_quantity,
        ac.lg_FAMILLE_ID,
        ac.lg_GROSSISTE_ID,
        ac.article_family,
        ac.agg_marge AS marge,
        (
            SELECT fs.int_NUMBER_AVAILABLE
            FROM t_famille_stock fs
            WHERE fs.lg_FAMILLE_ID = ac.lg_FAMILLE_ID
              AND fs.lg_EMPLACEMENT_ID = p_emplacement_id
              AND fs.str_STATUT = 'enable'
            LIMIT 1
        ) AS stock_disponible
    FROM AnalyseCumulative ac
    WHERE ac.cumulative_marge <= (ac.grand_total_marge * 0.8)
    ORDER BY ac.agg_marge DESC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. analyse_20_80_par_quantite
DELIMITER //
CREATE PROCEDURE `analyse_20_80_par_quantite`(
    IN p_dt_start DATE,
    IN p_dt_end DATE,
    IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100),
    IN p_code_rayon VARCHAR(100),
    IN p_code_grossiste VARCHAR(100)
)
BEGIN
    WITH VentesFiltrees AS (
        SELECT
            f.lg_FAMILLE_ID,
            f.str_NAME AS product_name,
            fa.str_LIBELLE AS article_family,
            f.int_CIP,
            g.lg_GROSSISTE_ID,
            SUM(pd.int_QUANTITY) AS agg_total_quantity,
            SUM(pd.int_PRICE) AS agg_total_price_ttc,
            (SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva)
                - SUM(pd.prixAchat * pd.int_QUANTITY)) AS agg_marge
        FROM t_preenregistrement p
        JOIN t_user u
            ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd
            ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f
            ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        LEFT JOIN t_famillearticle fa
            ON f.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_grossiste g
            ON f.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID
        WHERE
            p.dt_UPDATED >= p_dt_start
            AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
            AND p.str_STATUT = 'is_Closed'
            AND p.b_IS_CANCEL = 0
            AND p.int_PRICE > 0
            AND p.lg_TYPE_VENTE_ID <> '5'
            AND u.lg_EMPLACEMENT_ID = p_emplacement_id
            AND f.str_STATUT = 'enable'
            AND (p_code_famille IS NULL OR p_code_famille = '' OR f.lg_FAMILLEARTICLE_ID = p_code_famille)
            AND (p_code_rayon IS NULL OR p_code_rayon = '' OR f.lg_ZONE_GEO_ID = p_code_rayon)
            AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR f.lg_GROSSISTE_ID = p_code_grossiste)
        GROUP BY
            f.lg_FAMILLE_ID, f.str_NAME, fa.str_LIBELLE, f.int_CIP, g.lg_GROSSISTE_ID
    ),
    AnalyseCumulative AS (
        SELECT
            vf.*,
            SUM(vf.agg_total_quantity) OVER () AS grand_total_quantity,
            SUM(vf.agg_total_quantity) OVER (
                ORDER BY vf.agg_total_quantity DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_quantity
        FROM VentesFiltrees vf
    )
    SELECT
        ac.int_CIP,
        ac.product_name,
        ac.agg_total_price_ttc AS total_price_ttc,
        ac.agg_total_quantity AS total_quantity,
        ac.lg_FAMILLE_ID,
        ac.lg_GROSSISTE_ID,
        ac.article_family,
        ac.agg_marge AS marge,
        (
            SELECT fs.int_NUMBER_AVAILABLE
            FROM t_famille_stock fs
            WHERE fs.lg_FAMILLE_ID = ac.lg_FAMILLE_ID
              AND fs.lg_EMPLACEMENT_ID = p_emplacement_id
              AND fs.str_STATUT = 'enable'
            LIMIT 1
        ) AS stock_disponible
    FROM AnalyseCumulative ac
    WHERE ac.cumulative_quantity <= (ac.grand_total_quantity * 0.8)
    ORDER BY ac.agg_total_quantity DESC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. analyse_abc_par_ca
DELIMITER //
CREATE PROCEDURE `analyse_abc_par_ca`(
    IN p_dt_start DATE, IN p_dt_end DATE, IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100), IN p_code_rayon VARCHAR(100), IN p_code_grossiste VARCHAR(100)
)
BEGIN
    DECLARE v_max_a DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_max_b DECIMAL(5,2) DEFAULT 95.00;
    SET v_max_a = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'A' AND str_STATUT = 'enable' LIMIT 1), 80.00);
    SET v_max_b = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'B' AND str_STATUT = 'enable' LIMIT 1), 95.00);

    WITH base AS (
        SELECT
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id,
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN 1 ELSE 0 END AS is_detail,
            pd.int_QUANTITY AS qty, pd.int_PRICE AS price,
            ((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat * pd.int_QUANTITY)) AS marge_line
        FROM t_preenregistrement p
        JOIN t_user u ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        WHERE p.dt_UPDATED >= p_dt_start AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
          AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
          AND p.lg_TYPE_VENTE_ID <> '5'
          AND (p_emplacement_id IS NULL OR p_emplacement_id = '' OR u.lg_EMPLACEMENT_ID = p_emplacement_id)
    ),
    VentesFiltrees AS (
        SELECT ef.lg_FAMILLE_ID, ef.str_NAME AS product_name, ef.int_CIP, ef.int_EAN13,
            fa.str_LIBELLE AS article_family, zg.str_LIBELLEE AS rayon, ef.str_CODE_GEO_ARTICLE AS code_geo,
            ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN AS seuil_mini, ef.int_QTE_REAPPROVISIONNEMENT AS qte_reappro,
            (SUM(CASE WHEN b.is_detail = 0 THEN b.qty ELSE 0 END)
             + CEIL(SUM(CASE WHEN b.is_detail = 1 THEN b.qty ELSE 0 END) / COALESCE(NULLIF(ef.int_NUMBERDETAIL, 0), 1))) AS agg_total_quantity,
            SUM(b.price) AS agg_total_price_ttc, SUM(b.marge_line) AS agg_marge
        FROM base b
        JOIN t_famille ef ON ef.lg_FAMILLE_ID = b.eff_id
        LEFT JOIN t_famillearticle fa ON ef.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_zone_geographique zg ON ef.lg_ZONE_GEO_ID = zg.lg_ZONE_GEO_ID
        WHERE ef.str_STATUT = 'enable'
          AND (p_code_famille   IS NULL OR p_code_famille   = '' OR ef.lg_FAMILLEARTICLE_ID = p_code_famille)
          AND (p_code_rayon     IS NULL OR p_code_rayon     = '' OR ef.lg_ZONE_GEO_ID       = p_code_rayon)
          AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR ef.lg_GROSSISTE_ID      = p_code_grossiste)
        GROUP BY ef.lg_FAMILLE_ID, ef.str_NAME, ef.int_CIP, ef.int_EAN13, fa.str_LIBELLE, zg.str_LIBELLEE,
                 ef.str_CODE_GEO_ARTICLE, ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN, ef.int_QTE_REAPPROVISIONNEMENT, ef.int_NUMBERDETAIL
    ),
    AnalyseCumulative AS (
        SELECT vf.*, SUM(vf.agg_total_price_ttc) OVER () AS grand_total,
            SUM(vf.agg_total_price_ttc) OVER (
                ORDER BY vf.agg_total_price_ttc DESC, vf.agg_total_quantity DESC, vf.lg_FAMILLE_ID ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative
        FROM VentesFiltrees vf
    ),
    Classified AS (
        SELECT ac.*,
            CASE WHEN (ac.cumulative - ac.agg_total_price_ttc) < (ac.grand_total * v_max_a / 100) THEN 'A'
                 WHEN (ac.cumulative - ac.agg_total_price_ttc) < (ac.grand_total * v_max_b / 100) THEN 'B'
                 ELSE 'C' END AS classe_abc
        FROM AnalyseCumulative ac
    )
    SELECT c.int_CIP, c.int_EAN13 AS ean, c.product_name, c.classe_abc, c.article_family, c.rayon, c.code_geo,
        (SELECT fs.int_NUMBER_AVAILABLE FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID = c.lg_FAMILLE_ID
           AND fs.lg_EMPLACEMENT_ID = p_emplacement_id AND fs.str_STATUT = 'enable' LIMIT 1) AS stock_disponible,
        c.seuil_mini, c.qte_reappro, c.agg_total_quantity AS total_quantity, c.agg_total_price_ttc AS total_price_ttc,
        c.agg_marge AS marge,
        ROUND(c.agg_total_price_ttc / NULLIF(c.grand_total, 0) * 100, 2) AS part_pourcentage,
        ROUND(c.cumulative / NULLIF(c.grand_total, 0) * 100, 2) AS cumul_pourcentage,
        c.lg_FAMILLE_ID, c.lg_GROSSISTE_ID, ca.int_Q1 AS q1, ca.int_Q2 AS q2, ca.int_Q3 AS q3, ca.str_UNITE_CALCUL AS unite
    FROM Classified c
    LEFT JOIN t_classe_abc ca ON ca.str_CODE = c.classe_abc
    ORDER BY c.agg_total_price_ttc DESC, c.agg_total_quantity DESC, c.lg_FAMILLE_ID ASC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. analyse_abc_par_marge
DELIMITER //
CREATE PROCEDURE `analyse_abc_par_marge`(
    IN p_dt_start DATE, IN p_dt_end DATE, IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100), IN p_code_rayon VARCHAR(100), IN p_code_grossiste VARCHAR(100)
)
BEGIN
    DECLARE v_max_a DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_max_b DECIMAL(5,2) DEFAULT 95.00;
    SET v_max_a = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'A' AND str_STATUT = 'enable' LIMIT 1), 80.00);
    SET v_max_b = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'B' AND str_STATUT = 'enable' LIMIT 1), 95.00);

    WITH base AS (
        SELECT
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id,
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN 1 ELSE 0 END AS is_detail,
            pd.int_QUANTITY AS qty, pd.int_PRICE AS price,
            ((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat * pd.int_QUANTITY)) AS marge_line
        FROM t_preenregistrement p
        JOIN t_user u ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        WHERE p.dt_UPDATED >= p_dt_start AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
          AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
          AND p.lg_TYPE_VENTE_ID <> '5'
          AND (p_emplacement_id IS NULL OR p_emplacement_id = '' OR u.lg_EMPLACEMENT_ID = p_emplacement_id)
    ),
    VentesFiltrees AS (
        SELECT ef.lg_FAMILLE_ID, ef.str_NAME AS product_name, ef.int_CIP, ef.int_EAN13,
            fa.str_LIBELLE AS article_family, zg.str_LIBELLEE AS rayon, ef.str_CODE_GEO_ARTICLE AS code_geo,
            ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN AS seuil_mini, ef.int_QTE_REAPPROVISIONNEMENT AS qte_reappro,
            (SUM(CASE WHEN b.is_detail = 0 THEN b.qty ELSE 0 END)
             + CEIL(SUM(CASE WHEN b.is_detail = 1 THEN b.qty ELSE 0 END) / COALESCE(NULLIF(ef.int_NUMBERDETAIL, 0), 1))) AS agg_total_quantity,
            SUM(b.price) AS agg_total_price_ttc, SUM(b.marge_line) AS agg_marge
        FROM base b
        JOIN t_famille ef ON ef.lg_FAMILLE_ID = b.eff_id
        LEFT JOIN t_famillearticle fa ON ef.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_zone_geographique zg ON ef.lg_ZONE_GEO_ID = zg.lg_ZONE_GEO_ID
        WHERE ef.str_STATUT = 'enable'
          AND (p_code_famille   IS NULL OR p_code_famille   = '' OR ef.lg_FAMILLEARTICLE_ID = p_code_famille)
          AND (p_code_rayon     IS NULL OR p_code_rayon     = '' OR ef.lg_ZONE_GEO_ID       = p_code_rayon)
          AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR ef.lg_GROSSISTE_ID      = p_code_grossiste)
        GROUP BY ef.lg_FAMILLE_ID, ef.str_NAME, ef.int_CIP, ef.int_EAN13, fa.str_LIBELLE, zg.str_LIBELLEE,
                 ef.str_CODE_GEO_ARTICLE, ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN, ef.int_QTE_REAPPROVISIONNEMENT, ef.int_NUMBERDETAIL
    ),
    AnalyseCumulative AS (
        SELECT vf.*, SUM(vf.agg_marge) OVER () AS grand_total,
            SUM(vf.agg_marge) OVER (
                ORDER BY vf.agg_marge DESC, vf.agg_total_quantity DESC, vf.lg_FAMILLE_ID ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative
        FROM VentesFiltrees vf
    ),
    Classified AS (
        SELECT ac.*,
            CASE WHEN (ac.cumulative - ac.agg_marge) < (ac.grand_total * v_max_a / 100) THEN 'A'
                 WHEN (ac.cumulative - ac.agg_marge) < (ac.grand_total * v_max_b / 100) THEN 'B'
                 ELSE 'C' END AS classe_abc
        FROM AnalyseCumulative ac
    )
    SELECT c.int_CIP, c.int_EAN13 AS ean, c.product_name, c.classe_abc, c.article_family, c.rayon, c.code_geo,
        (SELECT fs.int_NUMBER_AVAILABLE FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID = c.lg_FAMILLE_ID
           AND fs.lg_EMPLACEMENT_ID = p_emplacement_id AND fs.str_STATUT = 'enable' LIMIT 1) AS stock_disponible,
        c.seuil_mini, c.qte_reappro, c.agg_total_quantity AS total_quantity, c.agg_total_price_ttc AS total_price_ttc,
        c.agg_marge AS marge,
        ROUND(c.agg_marge / NULLIF(c.grand_total, 0) * 100, 2) AS part_pourcentage,
        ROUND(c.cumulative / NULLIF(c.grand_total, 0) * 100, 2) AS cumul_pourcentage,
        c.lg_FAMILLE_ID, c.lg_GROSSISTE_ID, ca.int_Q1 AS q1, ca.int_Q2 AS q2, ca.int_Q3 AS q3, ca.str_UNITE_CALCUL AS unite
    FROM Classified c
    LEFT JOIN t_classe_abc ca ON ca.str_CODE = c.classe_abc
    ORDER BY c.agg_marge DESC, c.agg_total_quantity DESC, c.lg_FAMILLE_ID ASC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. analyse_abc_par_quantite
DELIMITER //
CREATE PROCEDURE `analyse_abc_par_quantite`(
    IN p_dt_start DATE, IN p_dt_end DATE, IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100), IN p_code_rayon VARCHAR(100), IN p_code_grossiste VARCHAR(100)
)
BEGIN
    DECLARE v_max_a DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_max_b DECIMAL(5,2) DEFAULT 95.00;
    SET v_max_a = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'A' AND str_STATUT = 'enable' LIMIT 1), 80.00);
    SET v_max_b = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'B' AND str_STATUT = 'enable' LIMIT 1), 95.00);

    WITH base AS (
        SELECT
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id,
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN 1 ELSE 0 END AS is_detail,
            pd.int_QUANTITY AS qty, pd.int_PRICE AS price,
            ((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat * pd.int_QUANTITY)) AS marge_line
        FROM t_preenregistrement p
        JOIN t_user u ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        WHERE p.dt_UPDATED >= p_dt_start AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
          AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
          AND p.lg_TYPE_VENTE_ID <> '5'
          AND (p_emplacement_id IS NULL OR p_emplacement_id = '' OR u.lg_EMPLACEMENT_ID = p_emplacement_id)
    ),
    VentesFiltrees AS (
        SELECT ef.lg_FAMILLE_ID, ef.str_NAME AS product_name, ef.int_CIP, ef.int_EAN13,
            fa.str_LIBELLE AS article_family, zg.str_LIBELLEE AS rayon, ef.str_CODE_GEO_ARTICLE AS code_geo,
            ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN AS seuil_mini, ef.int_QTE_REAPPROVISIONNEMENT AS qte_reappro,
            (SUM(CASE WHEN b.is_detail = 0 THEN b.qty ELSE 0 END)
             + CEIL(SUM(CASE WHEN b.is_detail = 1 THEN b.qty ELSE 0 END) / COALESCE(NULLIF(ef.int_NUMBERDETAIL, 0), 1))) AS agg_total_quantity,
            SUM(b.price) AS agg_total_price_ttc, SUM(b.marge_line) AS agg_marge
        FROM base b
        JOIN t_famille ef ON ef.lg_FAMILLE_ID = b.eff_id
        LEFT JOIN t_famillearticle fa ON ef.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_zone_geographique zg ON ef.lg_ZONE_GEO_ID = zg.lg_ZONE_GEO_ID
        WHERE ef.str_STATUT = 'enable'
          AND (p_code_famille   IS NULL OR p_code_famille   = '' OR ef.lg_FAMILLEARTICLE_ID = p_code_famille)
          AND (p_code_rayon     IS NULL OR p_code_rayon     = '' OR ef.lg_ZONE_GEO_ID       = p_code_rayon)
          AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR ef.lg_GROSSISTE_ID      = p_code_grossiste)
        GROUP BY ef.lg_FAMILLE_ID, ef.str_NAME, ef.int_CIP, ef.int_EAN13, fa.str_LIBELLE, zg.str_LIBELLEE,
                 ef.str_CODE_GEO_ARTICLE, ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN, ef.int_QTE_REAPPROVISIONNEMENT, ef.int_NUMBERDETAIL
    ),
    AnalyseCumulative AS (
        SELECT vf.*, SUM(vf.agg_total_quantity) OVER () AS grand_total,
            SUM(vf.agg_total_quantity) OVER (
                ORDER BY vf.agg_total_quantity DESC, vf.agg_total_price_ttc DESC, vf.lg_FAMILLE_ID ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative
        FROM VentesFiltrees vf
    ),
    Classified AS (
        SELECT ac.*,
            CASE WHEN (ac.cumulative - ac.agg_total_quantity) < (ac.grand_total * v_max_a / 100) THEN 'A'
                 WHEN (ac.cumulative - ac.agg_total_quantity) < (ac.grand_total * v_max_b / 100) THEN 'B'
                 ELSE 'C' END AS classe_abc
        FROM AnalyseCumulative ac
    )
    SELECT c.int_CIP, c.int_EAN13 AS ean, c.product_name, c.classe_abc, c.article_family, c.rayon, c.code_geo,
        (SELECT fs.int_NUMBER_AVAILABLE FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID = c.lg_FAMILLE_ID
           AND fs.lg_EMPLACEMENT_ID = p_emplacement_id AND fs.str_STATUT = 'enable' LIMIT 1) AS stock_disponible,
        c.seuil_mini, c.qte_reappro, c.agg_total_quantity AS total_quantity, c.agg_total_price_ttc AS total_price_ttc,
        c.agg_marge AS marge,
        ROUND(c.agg_total_quantity / NULLIF(c.grand_total, 0) * 100, 2) AS part_pourcentage,
        ROUND(c.cumulative / NULLIF(c.grand_total, 0) * 100, 2) AS cumul_pourcentage,
        c.lg_FAMILLE_ID, c.lg_GROSSISTE_ID, ca.int_Q1 AS q1, ca.int_Q2 AS q2, ca.int_Q3 AS q3, ca.str_UNITE_CALCUL AS unite
    FROM Classified c
    LEFT JOIN t_classe_abc ca ON ca.str_CODE = c.classe_abc
    ORDER BY c.agg_total_quantity DESC, c.agg_total_price_ttc DESC, c.lg_FAMILLE_ID ASC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. ChiffreAffaireProcedure
DELIMITER //
CREATE PROCEDURE `ChiffreAffaireProcedure`(
        IN `periode_deb` VARCHAR(10),
        IN `periode_fin` VARCHAR(10)
    )
BEGIN
 	CREATE TEMPORARY TABLE Temp_chiffreAffaire 
	(dt_CREATED DATETIME  NULL
     , lg_PREENREGISTREMENT_ID VARCHAR(40) NULL
     , int_PRICE_cpt INTEGER(11)  NULL DEFAULT 0
     , int_PRICE_REMISE_cpt INTEGER(11)  NULL DEFAULT 0
     , int_PRICE_crd INTEGER(11)  NULL DEFAULT 0
     , int_PRICE_REMISE_crd INTEGER(11)  NULL DEFAULT 0
     ,int_montant_ach_laborx INTEGER(11) NULL DEFAULT 0
     ,int_montant_ach_autre INTEGER(11) NULL DEFAULT 0
     ,int_nbreClt INTEGER  DEFAULT 0);     
     
INSERT INTO Temp_chiffreAffaire
(select DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) AS dt_CREATED,
 p.lg_PREENREGISTREMENT_ID lg_PREENREGISTREMENT_ID,SUM( p.int_PRICE) int_PRICE_cpt,
	SUM(p.int_PRICE_REMISE) int_PRICE_REMISE_cpt,0,0,0,0,0
	from t_preenregistrement p 
    WHERE p.lg_TYPE_VENTE_ID = 1 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin 
    GROUP BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d'))
	ORDER BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d'))) ;    

INSERT INTO Temp_chiffreAffaire
(select DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) AS dt_CREATED, 
	p.lg_PREENREGISTREMENT_ID lg_PREENREGISTREMENT_ID,0,0,SUM(p.int_PRICE) int_PRICE_crd,
	SUM(p.int_PRICE_REMISE) int_PRICE_REMISE_crd,0,0,0
	from t_preenregistrement p 
	WHERE p.lg_TYPE_VENTE_ID <> 1 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
	GROUP BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d'))
	ORDER BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d')));
    
INSERT INTO Temp_chiffreAffaire
(select DATE(DATE_FORMAT(bd.dt_CREATED, '%Y-%m-%d')) AS dt_CREATED,NULL,0,0,0,0,
 SUM(bd.int_QTE_RECUE*bd.int_PAF) AS int_montant_ach_laborx,0,0 
from t_bon_livraison_detail bd JOIN t_grossiste gr on gr.lg_GROSSISTE_ID = bd.lg_GROSSISTE_ID
WHERE bd.lg_GROSSISTE_ID = 54301147309848335360 AND bd.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(bd.dt_CREATED, '%Y-%m-%d')));

INSERT INTO Temp_chiffreAffaire
(select DATE(DATE_FORMAT(bd.dt_CREATED, '%Y-%m-%d')) AS dt_CREATED,NULL,0,0,0,0,0,
 SUM(bd.int_QTE_RECUE*bd.int_PAF) AS int_montant_ach_autre,0 
from t_bon_livraison_detail bd JOIN t_grossiste gr on gr.lg_GROSSISTE_ID = bd.lg_GROSSISTE_ID
WHERE bd.lg_GROSSISTE_ID <> 54301147309848335360 AND bd.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(bd.dt_CREATED, '%Y-%m-%d')));

INSERT INTO Temp_chiffreAffaire
(select DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) AS dt_CREATED,NULL,0,0,0,0,0,0,
 COUNT(lg_PREENREGISTREMENT_ID) int_nbreClt
from t_preenregistrement p
WHERE p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d'))
ORDER BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d')));

  SELECT DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d')) AS dt_CREATED,
  SUM(int_PRICE_cpt) int_PRICE_cpt,
  SUM(int_PRICE_REMISE_cpt+int_PRICE_REMISE_crd) AS int_remise,
  SUM(int_PRICE_crd) int_PRICE_crd,SUM(int_montant_ach_laborx) int_montant_ach_laborx,
  SUM(int_montant_ach_autre) int_montant_ach_autre,SUM(int_nbreClt) int_nbreClt
  from Temp_chiffreAffaire
  GROUP BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d'))
  ORDER BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d')) DESC;
  
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. correctPriceTarif
DELIMITER //
CREATE PROCEDURE `correctPriceTarif`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(40);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.lg_FAMILLE_ID FROM t_famille t WHERE t.int_PAF < t.int_PAT
AND t.str_STATUT = 'enable';

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 	 UPDATE t_famille t SET t.int_PAT = t.int_PAF WHERE t.lg_FAMILLE_ID = LGFAMILLEID;

END LOOP bl_loop;
 CLOSE curbl;

COMMIT;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. create_snap_shot
DELIMITER //
CREATE PROCEDURE `create_snap_shot`(
        IN `lg_COMPTE_CLIENT_ID_param` VARCHAR(100),
        IN `lg_SNAP_SHOT_ID_Param` VARCHAR(100)
    )
BEGIN
declare val int default 0;
declare str_account_type_ID_param VARCHAR(20);
declare dec_Balance_param VARCHAR(20);
declare dt_date_creation_param VARCHAR(20);
declare dt_last_update_param VARCHAR(20);
declare lg_customer_id_param VARCHAR(20);
declare b_active_param VARCHAR(20);
declare dt_effective_param VARCHAR(20);
declare dec_Balance_Disponible_param VARCHAR(20);
declare dec_Balance_InDisponible_param VARCHAR(20);
declare int_COUNTER_TRANSACTION_param VARCHAR(20);
select int_COUNTER_TRANSACTION from `t_compte_client` where lg_COMPTE_CLIENT_ID
 = lg_COMPTE_CLIENT_ID_Param
INTO val;
if val = 39 THEN
SELECT

        dec_Balance,
        dt_CREATED,
        dt_UPDATED,
        lg_CLIENT_ID,
        dec_Balance_Disponible,
        dec_Balance_InDisponible,
        int_COUNTER_TRANSACTION
FROM t_compte_client
WHERE lg_COMPTE_CLIENT_ID = lg_COMPTE_CLIENT_ID_Param
INTO
        dec_Balance_Param,
        dt_date_creation_Param,
        dt_last_update_Param,
        lg_customer_id_Param,
        dec_Balance_Disponible_Param,
        dec_Balance_InDisponible_Param,
        int_COUNTER_TRANSACTION_Param;
INSERT INTO `t_user_account_snap_shot` (
lg_SNAP_SHOT_ID,
  `str_user_account_ID`,
  `str_account_type_ID`,
  `dec_Balance`,
  `dt_date_creation`,
  `dt_last_update`,
  `lg_customer_id`,
  `b_active`,
  `dt_effective`,
  `dec_Balance_Disponible`,
  `dec_Balance_InDisponible`) VALUES
  (     lg_SNAP_SHOT_ID_Param,
        lg_COMPTE_CLIENT_ID_Param,
        str_account_type_ID_Param,
        dec_Balance_Param,
        dt_date_creation_Param,
        dt_last_update_Param,
        lg_customer_id_Param,
        b_active_Param,
        dt_effective_Param,
        dec_Balance_Disponible_Param,
        dec_Balance_InDisponible_Param
   );
      update `t_compte_client` set
int_COUNTER_TRANSACTION = 0
where lg_COMPTE_CLIENT_ID=lg_COMPTE_CLIENT_ID_Param ;
ELSE
   update `t_compte_client` set
int_COUNTER_TRANSACTION = int_COUNTER_TRANSACTION +1
where lg_COMPTE_CLIENT_ID=lg_COMPTE_CLIENT_ID_Param ;
   END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. create_transaction_proc
DELIMITER //
CREATE PROCEDURE `create_transaction_proc`(
        IN `str_transaction_id_param` VARCHAR(50),
        IN `str_transaction_id_param2` VARCHAR(50),
        IN `str_transaction_code_param` VARCHAR(20),
        IN `dt_transaction_date_param` TIMESTAMP,
        IN `str_Emetteur_Phone_param` VARCHAR(20),
        IN `str_Beneficiare_Phone_param` VARCHAR(20),
        IN `dec_Amount_param` DOUBLE,
        IN `b_valide_param` TINYINT(1),
        IN `str_Emetteur_Pin_Param` VARCHAR(200),
        OUT `error_message` VARCHAR(200),
        OUT `transaction_number_param` VARCHAR(200),
        IN `str_Motif_Transaction_param` VARCHAR(500),
        IN `str_transaction_number_Param` VARCHAR(100)
    )
    DETERMINISTIC
BEGIN

declare str_Origine_Phone varchar(200) default '';

declare str_Destination_Phone varchar(200) default '';

declare emetteur_balance double default 0;

declare deb_emetteur_balance_Disponible  double default 0;

declare deb_emetteur_balance_InDisponible  double default 0;

declare emetteur_balance_Disponible double default 0;

declare emetteur_balance_Temp double default 0;

declare emetteur_balance_InDisponible double default 0;

declare emetteur_acc_type varchar(20) default '';

declare emetteur_acc_pin varchar(200) default '';

declare str_branch varchar(5000) default "";

declare str_old_last  varchar(5000) default "";

declare lg_Id_Param varchar(5000) default "";

declare old_last bigint(40) default 0;

declare res int default 0;

declare do_next int default 1;

set str_branch=getParameterValue("str_Branch_Code");

set old_last=getParameterValue("last_transaction_id");

set lg_Id_Param=CONCAT(str_branch,old_last);

set emetteur_balance=`getAccountBalance`(str_Emetteur_Phone_param);

set emetteur_balance_Disponible =`getAccountBalance_Disponible`(str_Emetteur_Phone_param);

set emetteur_balance_InDisponible = `getAccountBalance_InDisponible`(str_Emetteur_Phone_param);

set emetteur_acc_type="0";

set emetteur_acc_pin="";

set lg_Id_Param = str_transaction_number_Param;

set do_next = 1;

if(str_Motif_Transaction_param = 'PARIS') THEN

 

 IF(dec_Amount_param <= emetteur_balance_InDisponible) THEN

  set  deb_emetteur_balance_InDisponible = dec_Amount_param;

  set  deb_emetteur_balance_Disponible = 0;

 ELSE

  set  deb_emetteur_balance_InDisponible = emetteur_balance_InDisponible;

  set  deb_emetteur_balance_Disponible = dec_Amount_param -emetteur_balance_InDisponible;

 END IF;

END IF;

if( (emetteur_balance_InDisponible<dec_Amount_param) and (emetteur_acc_type<>'pmu_agent')) THEN

if(emetteur_balance<dec_Amount_param) THEN

set error_message='balance insuffisante';

ELSE

set emetteur_balance_Temp = dec_Amount_param - emetteur_balance_InDisponible;

insert into `t_transaction`(

str_transaction_ID,

str_transaction_code_ID,

dt_transaction_date,

str_user_account_ID,

str_Description,

dec_Amount,

b_valide,

str_transaction_type_ID,

str_transaction_number,

str_Motif_Transaction,

dec_Balance_InDisponible,

dec_Balance_Disponible

)

values(

str_transaction_id_param ,

str_transaction_code_param ,

dt_transaction_date_param ,

str_Emetteur_Phone_param ,

str_Beneficiare_Phone_param ,

-1*dec_Amount_param ,

b_valide_param,

'debit',

lg_Id_Param,

str_Motif_Transaction_param,

-1*deb_emetteur_balance_InDisponible,

-1*deb_emetteur_balance_Disponible

);

set error_message='success';

set transaction_number_param='no value';

insert into `t_transaction`(

str_transaction_ID,

str_transaction_code_ID,

dt_transaction_date,

str_user_account_ID,

str_Description,

dec_Amount,

b_valide,

str_transaction_type_ID,

str_transaction_number,

str_Motif_Transaction,

dec_Balance_InDisponible,

dec_Balance_Disponible

)

values(

str_transaction_id_param2 ,

str_transaction_code_param ,

dt_transaction_date_param ,

str_Beneficiare_Phone_param ,

str_Emetteur_Phone_param ,

dec_Amount_param ,

b_valide_param,

'credit',lg_Id_Param,

str_Motif_Transaction_param,

0,

dec_Amount_param

);

if(str_Motif_Transaction_param ='GAIN') THEN

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='RECHARGE') THEN

update `t_compte_client` set

dec_balance_InDisponible = dec_balance_InDisponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='TRANSFERT') THEN

update `t_compte_client` set

dec_balance_InDisponible = dec_balance_InDisponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='REMBOURSEMENT') THEN

update `t_compte_client` set

dec_balance_InDisponible = dec_balance_InDisponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSE

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

END IF;

update `t_compte_client` set

dec_balance=dec_balance - dec_Amount_param,

dec_balance_Disponible = dec_balance_Disponible - emetteur_balance_Temp,

dec_Balance_InDisponible=0.0

where lg_COMPTE_CLIENT_ID=str_Emetteur_Phone_param;

set old_last=old_last+1;

set str_branch=concat(old_last,'');

set res=setParameterValue('last_transaction_id',str_branch);

set error_message='success';

set transaction_number_param=lg_Id_Param;

END IF;

ELSE

if(str_Motif_Transaction_param ='TRANSFERT') THEN

if(emetteur_balance_InDisponible<dec_Amount_param) THEN

set error_message='balance insuffisante';

set do_next = 0;

ELSE

set do_next = 1;

END IF;

END IF;

if(do_next=1) THEN

insert into `t_transaction`(

str_transaction_ID,

str_transaction_code_ID,

dt_transaction_date,

str_user_account_ID,

str_Description,

dec_Amount,

b_valide,

str_transaction_type_ID,

str_transaction_number,

str_Motif_Transaction,

dec_Balance_InDisponible,

dec_Balance_Disponible

)

values(

str_transaction_id_param ,

str_transaction_code_param ,

dt_transaction_date_param ,

str_Emetteur_Phone_param ,

str_Beneficiare_Phone_param ,

-1*dec_Amount_param ,

b_valide_param,'debit',lg_Id_Param,

str_Motif_Transaction_param,

-1*deb_emetteur_balance_InDisponible,

-1*deb_emetteur_balance_Disponible

);

set error_message='success';

set transaction_number_param='no value';

insert into `t_transaction`(

str_transaction_ID,

str_transaction_code_ID,

dt_transaction_date,

str_user_account_ID,

str_Description,

dec_Amount,

b_valide,

str_transaction_type_ID,

str_transaction_number,

str_Motif_Transaction,

dec_Balance_InDisponible,

dec_Balance_Disponible

)

values(

str_transaction_id_param2 ,

str_transaction_code_param ,

dt_transaction_date_param ,

str_Beneficiare_Phone_param ,

str_Emetteur_Phone_param ,

dec_Amount_param ,

b_valide_param,

'credit',lg_Id_Param,

str_Motif_Transaction_param,

0,

dec_Amount_param

);





if(str_Motif_Transaction_param ='ORANGE_MONEY_DEP') THEN

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='ORANGE_MONEY_WITHDRAWAL') THEN

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible -dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Emetteur_Phone_param;

ELSEIF (str_Motif_Transaction_param ='GAIN') THEN

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='RECHARGE') THEN

update `t_compte_client` set

dec_balance_InDisponible = dec_balance_InDisponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='TRANSFERT') THEN

update `t_compte_client` set

dec_balance_InDisponible = dec_balance_InDisponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSEIF (str_Motif_Transaction_param ='REMBOURSEMENT') THEN

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSE

update `t_compte_client` set

dec_balance_Disponible = dec_balance_Disponible +dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

END IF;

if (str_Motif_Transaction_param ='ORANGE_MONEY_WITHDRAWAL') THEN

update `t_compte_client`

set dec_Balance_InDisponible=dec_Balance_InDisponible -dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Beneficiare_Phone_param;

ELSE

update `t_compte_client`

set dec_Balance_InDisponible=dec_Balance_InDisponible -dec_Amount_param

where lg_COMPTE_CLIENT_ID=str_Emetteur_Phone_param;

END IF;

set old_last=old_last+1;

set str_branch=concat(old_last,'');

set res=setParameterValue('last_transaction_id',str_branch);

set error_message='success';

set transaction_number_param=lg_Id_Param;

END IF;

end if;

CALL create_snap_shot(str_Emetteur_Phone_param,str_transaction_id_param);

CALL create_snap_shot(str_Beneficiare_Phone_param,str_transaction_id_param2);

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. GetMonthSales
DELIMITER //
CREATE PROCEDURE `GetMonthSales`(
        IN `lg_FAMILLE_ID` VARCHAR(40)
    )
BEGIN
        SELECT COUNT(p.int_NUMBER) AS int_SOLD_PRODUCTS_PER_MONTH, 
	   EXTRACT(MONTH FROM p.dt_UPDATED) AS CREATED_MONTH , 
           EXTRACT(YEAR FROM p.dt_UPDATED) AS CREATED_YEAR, p.int_CIP
        FROM v_article_vendu p
        WHERE p.lg_FAMILLE_ID LIKE lg_FAMILLE_ID   
        GROUP BY EXTRACT(MONTH FROM p.dt_UPDATED) 
        ORDER BY EXTRACT(YEAR FROM p.dt_UPDATED); 
    END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. pro_avoir_fournisseurs
DELIMITER //
CREATE PROCEDURE `pro_avoir_fournisseurs`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100),
        IN `lg_grossiste` VARCHAR(50)
    )
    MODIFIES SQL DATA
BEGIN 
DECLARE dt_bl DATE;
DECLARE LIBELLE VARCHAR(50);
DECLARE GROSSISTE VARCHAR(100);
DECLARE MONTANTFACTURE NUMERIC(15);
DECLARE MONTANTAVOIR NUMERIC(15);
DECLARE TVA NUMERIC(15);
DECLARE dt_echeance INT;
DECLARE done INT DEFAULT 0;


DECLARE curavoir CURSOR FOR 
SELECT SUM(d.`int_NUMBER_ANSWER`*d.`int_PAF`) AS AVOIR ,g.`str_LIBELLE` AS LIBGROSSISTE,
d.`dt_CREATED` AS DATEAVOIR,
CONCAT('Avoir  No',': ',f.`str_REF_RETOUR_FRS`) AS LIBAVOIR
FROM t_retour_fournisseur_detail d,t_retour_fournisseur f,t_famille fa,t_grossiste g 
WHERE f.`lg_RETOUR_FRS_ID`=d.`lg_RETOUR_FRS_ID` AND fa.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID`
AND g.`lg_GROSSISTE_ID`=fa.`lg_GROSSISTE_ID`
AND d.`dt_CREATED`>=dt_start AND DATE(d.`dt_CREATED`) <=dt_end
AND g.`str_LIBELLE` LIKE searchvalue AND g.`lg_GROSSISTE_ID` LIKE lg_grossiste
GROUP BY f.`lg_RETOUR_FRS_ID` ,g.`str_LIBELLE`;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_facturefournisseur
 (new_CREATED DATE, new_LIBELLE VARCHAR(50),new_GROSSISTE VARCHAR(100),
 new_MONTANTFACTURE NUMERIC(15),
new_MONTANTAVOIR NUMERIC(15),
new_TVA NUMERIC(15),new_ECHEANCE INT DEFAULT 0,
new_BL_AVOIR CHAR(7)
);
OPEN curavoir;
avoir_loop:LOOP
FETCH curavoir INTO MONTANTAVOIR,GROSSISTE,dt_bl,LIBELLE;
IF done=1 THEN 
 LEAVE avoir_loop;
 END IF;
INSERT INTO emp_facturefournisseur (new_CREATED,new_LIBELLE,new_GROSSISTE,new_MONTANTFACTURE,new_MONTANTAVOIR,new_TVA,new_ECHEANCE,new_BL_AVOIR)
 VALUES (dt_bl,LIBELLE,GROSSISTE,0,MONTANTAVOIR,0,0,'AVOIR');
END LOOP avoir_loop;
 CLOSE curavoir;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. pro_factures_fournisseurs
DELIMITER //
CREATE PROCEDURE `pro_factures_fournisseurs`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100),
        IN `lg_grossiste` VARCHAR(50)
    )
    MODIFIES SQL DATA
BEGIN 
DECLARE dt_bl DATE;
DECLARE LIBELLE VARCHAR(50);
DECLARE GROSSISTE VARCHAR(100);
DECLARE MONTANTFACTURE NUMERIC(15);
DECLARE MONTANTAVOIR NUMERIC(15);
DECLARE TVA NUMERIC(15);
DECLARE dt_echeance INT;
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT CONCAT('Facture du BL No',': ',b.`str_REF_LIVRAISON`) AS LIBELLEBL ,
b.`dt_UPDATED` AS DATEBL ,
b.`int_MHT` ,b.`int_TVA`,g.`str_LIBELLE`,g.`int_DELAI_REGLEMENT_AUTORISE`
FROM t_bon_livraison b,t_grossiste g,t_order o WHERE 
b.`lg_ORDER_ID`=o.`lg_ORDER_ID` 
AND g.`lg_GROSSISTE_ID`=o.`lg_GROSSISTE_ID` AND
b.`dt_UPDATED` >=dt_start AND DATE(b.`dt_UPDATED`) <=dt_end AND b.`str_STATUT`='is_Closed'
 AND o.`lg_GROSSISTE_ID` LIKE lg_grossiste AND g.`str_LIBELLE` LIKE searchvalue
;
DECLARE curavoir CURSOR FOR 
SELECT SUM(d.`int_NUMBER_RETURN`*fa.`int_PAF`) AS AVOIR ,g.`str_LIBELLE` AS LIBGROSSISTE,
d.`dt_CREATED` AS DATEAVOIR,
CONCAT('Avoir  No',': ',f.`str_REF_RETOUR_FRS`) AS LIBAVOIR
FROM t_retour_fournisseur_detail d,t_retour_fournisseur f,t_famille fa,t_grossiste g 
WHERE f.`lg_RETOUR_FRS_ID`=d.`lg_RETOUR_FRS_ID` AND fa.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID`
AND g.`lg_GROSSISTE_ID`=fa.`lg_GROSSISTE_ID`
AND d.`dt_CREATED`>=dt_start AND d.`dt_CREATED`<=dt_end
AND g.`str_LIBELLE` LIKE searchvalue AND g.`lg_GROSSISTE_ID` LIKE lg_grossiste
GROUP BY f.`lg_RETOUR_FRS_ID` ,g.`str_LIBELLE`;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP  TEMPORARY TABLE IF EXISTS emp_facturefournisseur;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_facturefournisseur
 (new_CREATED DATE, new_LIBELLE VARCHAR(50),new_GROSSISTE VARCHAR(100),
 new_MONTANTFACTURE NUMERIC(15),
new_MONTANTAVOIR NUMERIC(15),
new_TVA NUMERIC(15),new_ECHEANCE INT DEFAULT 0,
new_BL_AVOIR CHAR(7)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LIBELLE, dt_bl, MONTANTFACTURE,TVA,GROSSISTE,dt_echeance;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_facturefournisseur (new_CREATED,new_LIBELLE,new_GROSSISTE,new_MONTANTFACTURE,new_MONTANTAVOIR,new_TVA,new_ECHEANCE,new_BL_AVOIR)
 VALUES (dt_bl,LIBELLE,GROSSISTE,MONTANTFACTURE,0,TVA,dt_echeance,'FACTURE');
END LOOP bl_loop;
 CLOSE curbl;
call `pro_avoir_fournisseurs`(dt_start,dt_end,searchvalue,lg_grossiste);

SELECT DATE_FORMAT(new_CREATED,'%d/%m/%Y') AS new_CREATED,new_LIBELLE,new_GROSSISTE,new_MONTANTFACTURE,new_MONTANTAVOIR,new_TVA,new_ECHEANCE,new_BL_AVOIR FROM emp_facturefournisseur
ORDER BY new_CREATED ,new_GROSSISTE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_add_to_cash_transaction
DELIMITER //
CREATE PROCEDURE `proc_add_to_cash_transaction`(
        IN `ID` VARCHAR(40),
        IN `str_TRANSACTION_REF` VARCHAR(40),
        IN `int_AMOUNT` INTEGER(11),
        IN `lg_CREATED_BY` VARCHAR(20),
        IN `ID_ANNEE_SCOLAIRE` VARCHAR(40),
        IN `str_DESCRIPTION` VARCHAR(2000),
        IN `lg_USER_ID` VARCHAR(40),
        IN `str_NUMERO_COMPTE` VARCHAR(40),
        IN `int_AMOUNT_REMIS` INTEGER(11),
        IN `int_AMOUNT_RECU` INTEGER(11),
        IN `str_RESSOURCE_REF` VARCHAR(40),
        IN `str_REF_FACTURE` VARCHAR(40),
        IN `str_TASK` VARCHAR(20),
        IN `str_TYPE_VENTE` VARCHAR(20),
        IN `lg_REGLEMENT_ID` VARCHAR(40),
        IN `str_REF_COMPTE_CLIENT` VARCHAR(40),
        IN `lg_MOTIF_REGLEMENT_ID` VARCHAR(40),
        IN `lg_TYPE_REGLEMENT_ID` VARCHAR(40)
    )
BEGIN



IF str_TRANSACTION_REF ='D' THEN



SET int_AMOUNT = (-1) * int_AMOUNT;



END IF;



INSERT INTO `t_cash_transaction` (`ID`, `str_TRANSACTION_REF`, `int_AMOUNT`, `lg_CREATED_BY`, `str_DESCRIPTION`,`lg_USER_ID`,`str_NUMERO_COMPTE`,`int_AMOUNT_REMIS`,`int_AMOUNT_RECU`,`lg_TYPE_REGLEMENT_ID`,`str_RESSOURCE_REF`,`str_REF_FACTURE`,`str_TASK`,`str_TYPE_VENTE`,`lg_REGLEMENT_ID`,`str_REF_COMPTE_CLIENT`,`lg_MOTIF_REGLEMENT_ID`) VALUES



  (ID, str_TRANSACTION_REF, int_AMOUNT, lg_CREATED_BY,  str_DESCRIPTION,lg_USER_ID,str_NUMERO_COMPTE,int_AMOUNT_REMIS,int_AMOUNT_RECU,lg_TYPE_REGLEMENT_ID,str_RESSOURCE_REF,str_REF_FACTURE,str_TASK,str_TYPE_VENTE,lg_REGLEMENT_ID,str_REF_COMPTE_CLIENT,lg_MOTIF_REGLEMENT_ID);



END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_add_to_cash_transaction2
DELIMITER //
CREATE PROCEDURE `proc_add_to_cash_transaction2`(
        IN `ID` VARCHAR(40),
        IN `str_TRANSACTION_REF` VARCHAR(40),
        IN `int_AMOUNT` INTEGER(11),
        IN `lg_CREATED_BY` VARCHAR(20),
        IN `str_DESCRIPTION` VARCHAR(200),
        IN `lg_USER_ID` VARCHAR(40),
        IN `str_NUMERO_COMPTE` VARCHAR(40),
        IN `int_AMOUNT_REMIS` INTEGER(11),
        IN `int_AMOUNT_RECU` INTEGER(11),
        IN `str_RESSOURCE_REF` VARCHAR(40),
        IN `str_REF_FACTURE` VARCHAR(40),
        IN `str_TASK` VARCHAR(20),
        IN `str_TYPE_VENTE` VARCHAR(20),
        IN `lg_REGLEMENT_ID` VARCHAR(40),
        IN `str_REF_COMPTE_CLIENT` VARCHAR(40),
        IN `lg_MOTIF_REGLEMENT_ID` VARCHAR(40),
        IN `lg_TYPE_REGLEMENT_ID` VARCHAR(40),
        IN `dtCREATED` DATETIME,
        IN `int_ACCOUNT` INTEGER(8),
        IN `intAMOUNT` INTEGER(8)
    )
BEGIN
IF str_TRANSACTION_REF ='D' THEN
SET int_AMOUNT = (-1) * int_AMOUNT;
SET int_ACCOUNT = (-1) * int_ACCOUNT;
SET intAMOUNT = (-1) * intAMOUNT;
END IF;
INSERT INTO `t_cash_transaction` (`ID`, `str_TRANSACTION_REF`, `int_AMOUNT`, `lg_CREATED_BY`, `str_DESCRIPTION`,`lg_USER_ID`,`str_NUMERO_COMPTE`,`int_AMOUNT_REMIS`,`int_AMOUNT_RECU`,`lg_TYPE_REGLEMENT_ID`,`str_RESSOURCE_REF`,`str_REF_FACTURE`,`str_TASK`,`str_TYPE_VENTE`,`lg_REGLEMENT_ID`,`str_REF_COMPTE_CLIENT`,`lg_MOTIF_REGLEMENT_ID`,dt_CREATED,dt_UPDATED,str_TYPE,bool_CHECKED,int_AMOUNT2,int_ACCOUNT) VALUES
 (ID, str_TRANSACTION_REF, int_AMOUNT, lg_CREATED_BY, str_DESCRIPTION,lg_USER_ID,str_NUMERO_COMPTE,int_AMOUNT_REMIS,int_AMOUNT_RECU,lg_TYPE_REGLEMENT_ID,str_RESSOURCE_REF,str_REF_FACTURE,str_TASK,str_TYPE_VENTE,lg_REGLEMENT_ID,str_REF_COMPTE_CLIENT,lg_MOTIF_REGLEMENT_ID,dtCREATED,dtCREATED,1,1,intAMOUNT,int_ACCOUNT);

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_analyseventestock
DELIMITER //
CREATE PROCEDURE `proc_analyseventestock`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100)
    )
BEGIN 
DECLARE str_FAmille VARCHAR(200);
DECLARE str_CODE_FAMILLE VARCHAR(50);
DECLARE MONTANTVENTE NUMERIC(15);
DECLARE QTEVENDUE NUMERIC(12);
DECLARE NBRESORTIE NUMERIC(12);
DECLARE UNITEMOYVENTE NUMERIC(12);
DECLARE SEUIL_REAPP INT;
DECLARE SEUIL_ACTUEL INT;
DECLARE QTEREAPP INT;
DECLARE QTESTOCK INT;
DECLARE NBREVO NUMERIC(12);
DECLARE TOTALNBFAMILLE NUMERIC(12);
DECLARE NBREVNO NUMERIC(12);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT SUM(d.`int_QUANTITY`) AS QTYVENDU,
COUNT(p.`lg_PREENREGISTREMENT_ID`) AS QTYSORTIE,
SUM(CASE WHEN p.`str_TYPE_VENTE`='VNO' THEN (d.`int_QUANTITY`) ELSE 0 END) AS NB_VNO,
SUM(CASE WHEN p.`str_TYPE_VENTE`='VO' THEN (d.`int_QUANTITY`) ELSE 0 END) AS NB_VO,
fa.`str_LIBELLE`, fa.`str_CODE_FAMILLE`,
SUM(s.`int_NUMBER_AVAILABLE`) AS STOCK,
SUM(f.`int_SEUIL_MIN`)AS SEUILACT,
SUM(f.`int_STOCK_REAPROVISONEMENT`)AS SEUILREAP,
SUM(f.`int_QTE_REAPPROVISIONNEMENT`)AS QTEREAPP,
(SELECT SUM(l.`int_QUANTITY`) FROM t_preenregistrement_detail l,t_preenregistrement op,t_famille fam ,
t_famillearticle far,t_famille_stock st WHERE op.`lg_PREENREGISTREMENT_ID`=l.`lg_PREENREGISTREMENT_ID`
AND far.`lg_FAMILLEARTICLE_ID`=fam.`lg_FAMILLEARTICLE_ID` AND fam.`lg_FAMILLE_ID`=l.`lg_FAMILLE_ID`
AND far.`lg_FAMILLEARTICLE_ID`=fa.`lg_FAMILLEARTICLE_ID` AND
 op.`str_STATUT` ='is_Closed' AND op.`dt_CREATED`>=dt_start AND fam.`lg_FAMILLE_ID`=st.`lg_FAMILLE_ID` AND st.`lg_EMPLACEMENT_ID`='1'
AND DATE(op.`dt_CREATED`) <=dt_end AND op.`int_PRICE` >0 AND op.`b_IS_CANCEL`=0 )AS TOTALNBFAMILLE,
ROUND(SUM(d.`int_QUANTITY`)/COUNT(p.`lg_PREENREGISTREMENT_ID`))AS UNITMOY,
 SUM(d.`int_PRICE`)-SUM(CASE WHEN d.`int_PRICE_REMISE`!= NULL THEN
 d.`int_PRICE_REMISE` ELSE 0 END ) AS MONTANT
 FROM t_preenregistrement_detail d,
t_famille f,
t_famillearticle fa,
t_preenregistrement p,
t_famille_stock s
WHERE
 p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` AND
f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND
fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID`
AND f.`lg_FAMILLE_ID`=s.`lg_FAMILLE_ID`
AND p.`str_STATUT` ='is_Closed' AND p.`b_IS_CANCEL`=0 AND p.`dt_CREATED`>=dt_start AND s.`lg_EMPLACEMENT_ID`='1'
AND DATE(p.`dt_CREATED`)<= dt_end AND p.`int_PRICE` >0 AND (fa.`str_LIBELLE` LIKE searchvalue OR fa.`str_CODE_FAMILLE` LIKE searchvalue)
GROUP BY fa.`str_LIBELLE`,
fa.`str_CODE_FAMILLE` ORDER BY fa.`str_CODE_FAMILLE` ,fa.`str_LIBELLE` ASC;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_analysevente_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_analysevente_table
 (new_FAmille VARCHAR(200),
 new_CODE_FAMILLE VARCHAR(50),
new_MONTANTVENTE NUMERIC(15),
new_QTEVENDUE NUMERIC(15),
new_NBRESORTIE NUMERIC(15),
new_UNITEMOYVENTE NUMERIC(15),
new_SEUIL_REAPP INT,
new_SEUIL_ACTUEL INT,
new_QTEREAPP INT,
new_QTESTOCK INT,
new_NBREVO NUMERIC(12),
new_TOTALNBFAMILLE NUMERIC(12),
new_NBREVNO NUMERIC(12)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO QTEVENDUE, NBRESORTIE, NBREVNO,NBREVO,str_FAmille,str_CODE_FAMILLE,QTESTOCK,SEUIL_ACTUEL,SEUIL_REAPP,QTEREAPP,TOTALNBFAMILLE,UNITEMOYVENTE,MONTANTVENTE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_analysevente_table (new_FAmille,new_CODE_FAMILLE,new_MONTANTVENTE,
new_QTEVENDUE,new_NBRESORTIE,new_UNITEMOYVENTE,new_SEUIL_REAPP,new_SEUIL_ACTUEL,new_QTEREAPP,new_QTESTOCK,new_NBREVO,new_TOTALNBFAMILLE,new_NBREVNO)
 VALUES (str_FAmille,str_CODE_FAMILLE,MONTANTVENTE,QTEVENDUE,NBRESORTIE,UNITEMOYVENTE,SEUIL_REAPP,SEUIL_ACTUEL,QTEREAPP,QTESTOCK,NBREVO,TOTALNBFAMILLE,NBREVNO);

END LOOP bl_loop;
 CLOSE curbl;

SELECT new_FAmille,new_CODE_FAMILLE,new_MONTANTVENTE,new_QTEVENDUE,new_NBRESORTIE,new_UNITEMOYVENTE,new_SEUIL_REAPP,new_SEUIL_ACTUEL,new_QTEREAPP,new_QTESTOCK,new_NBREVO,new_TOTALNBFAMILLE,new_NBREVNO FROM emp_analysevente_table
ORDER BY new_FAmille ,new_CODE_FAMILLE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_article_vendu
DELIMITER //
CREATE PROCEDURE `proc_article_vendu`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGTYPESTOCKID` VARCHAR(40),
        IN `DTBEGIN` DATETIME,
        IN `DTEND` DATETIME,
        IN `SEARCH` TEXT,
        IN `LGUSERID` VARCHAR(40),
        IN `PARAMSTART` INTEGER,
        IN `PARAMLIMIT` INTEGER,
        IN `ISPAGINATION` TINYINT
    )
BEGIN

IF(ISPAGINATION) THEN

select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC LIMIT PARAMSTART,PARAMLIMIT;

ELSE 



select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID`

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_article_vendu_equal
DELIMITER //
CREATE PROCEDURE `proc_article_vendu_equal`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGTYPESTOCKID` VARCHAR(40),
        IN `DTBEGIN` DATETIME,
        IN `DTEND` DATETIME,
        IN `SEARCH` TEXT,
        IN `LGUSERID` VARCHAR(40),
        IN `PARAMSTART` INTEGER,
        IN `PARAMLIMIT` INTEGER,
        IN `ISPAGINATION` TINYINT,
        IN `INTNUMBER` INTEGER
    )
BEGIN

IF(ISPAGINATION) THEN

select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER = INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC LIMIT PARAMSTART,PARAMLIMIT;

ELSE 



select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID`

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER = INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_article_vendu_less
DELIMITER //
CREATE PROCEDURE `proc_article_vendu_less`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGTYPESTOCKID` VARCHAR(40),
        IN `DTBEGIN` DATETIME,
        IN `DTEND` DATETIME,
        IN `SEARCH` TEXT,
        IN `LGUSERID` VARCHAR(40),
        IN `PARAMSTART` INTEGER,
        IN `PARAMLIMIT` INTEGER,
        IN `ISPAGINATION` TINYINT,
        IN `INTNUMBER` INTEGER
    )
BEGIN

IF(ISPAGINATION) THEN

select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER < INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC LIMIT PARAMSTART,PARAMLIMIT;

ELSE 



select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID`

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER < INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_article_vendu_lessequal
DELIMITER //
CREATE PROCEDURE `proc_article_vendu_lessequal`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGTYPESTOCKID` VARCHAR(40),
        IN `DTBEGIN` DATETIME,
        IN `DTEND` DATETIME,
        IN `SEARCH` TEXT,
        IN `LGUSERID` VARCHAR(40),
        IN `PARAMSTART` INTEGER,
        IN `PARAMLIMIT` INTEGER,
        IN `ISPAGINATION` TINYINT,
        IN `INTNUMBER` INTEGER
    )
BEGIN

IF(ISPAGINATION) THEN

select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER <= INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC LIMIT PARAMSTART,PARAMLIMIT;

ELSE 



select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID`

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER <= INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_article_vendu_more
DELIMITER //
CREATE PROCEDURE `proc_article_vendu_more`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGTYPESTOCKID` VARCHAR(40),
        IN `DTBEGIN` DATETIME,
        IN `DTEND` DATETIME,
        IN `SEARCH` TEXT,
        IN `LGUSERID` VARCHAR(40),
        IN `PARAMSTART` INTEGER,
        IN `PARAMLIMIT` INTEGER,
        IN `ISPAGINATION` TINYINT,
        IN `INTNUMBER` INTEGER
    )
BEGIN

IF(ISPAGINATION) THEN

select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER > INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC LIMIT PARAMSTART,PARAMLIMIT;

ELSE 



select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID`

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER > INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_article_vendu_moreequal
DELIMITER //
CREATE PROCEDURE `proc_article_vendu_moreequal`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGTYPESTOCKID` VARCHAR(40),
        IN `DTBEGIN` DATETIME,
        IN `DTEND` DATETIME,
        IN `SEARCH` TEXT,
        IN `LGUSERID` VARCHAR(40),
        IN `PARAMSTART` INTEGER,
        IN `PARAMLIMIT` INTEGER,
        IN `ISPAGINATION` TINYINT,
        IN `INTNUMBER` INTEGER
    )
BEGIN

IF(ISPAGINATION) THEN

select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER >= INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC LIMIT PARAMSTART,PARAMLIMIT;

ELSE 



select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,
`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,
`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID`

from (((((`t_preenregistrement` 
join `t_preenregistrement_detail` on((`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`))) 
join `t_famille` on((`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`))) 
join `t_type_stock_famille` on((`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`))) 
join `t_user` on((`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`))) 
join `t_grossiste` on((`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`))) 

where ((`t_preenregistrement`.`str_STATUT` = 'is_closed') and (`t_preenregistrement`.`int_PRICE` >= 0)
and (`t_preenregistrement`.`b_IS_CANCEL` = 0) 
AND (`t_preenregistrement_detail`.`lg_FAMILLE_ID` like LGFAMILLEID)
AND (`t_user`.`lg_EMPLACEMENT_ID` LIKE LGEMPLACEMENTID) 
AND (`t_preenregistrement`.`dt_UPDATED` >= DTBEGIN
AND `t_preenregistrement`.`dt_UPDATED` <= DTEND)
AND (`t_famille`.int_CIP LIKE SEARCH OR `t_famille`.int_EAN13 LIKE SEARCH 
OR `t_famille`.str_DESCRIPTION LIKE SEARCH OR `t_preenregistrement`.str_REF LIKE SEARCH
OR `t_preenregistrement`.str_REF_TICKET LIKE SEARCH)
AND (`t_user`.lg_USER_ID LIKE LGUSERID) AND (`t_type_stock_famille`.int_NUMBER >= INTNUMBER) AND (`t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE LGTYPESTOCKID))

GROUP BY `t_preenregistrement_detail`.lg_PREENREGISTREMENT_DETAIL_ID  
order by `t_preenregistrement`.dt_UPDATED ASC;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_BalanceAgeeDetaille
DELIMITER //
CREATE PROCEDURE `Proc_BalanceAgeeDetaille`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN
	SELECT
	DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-%d')) AS dt_CREATED
	,tp.str_NUMERO_IDF_ORGANISME
	,tp.str_CODE_ORGANISME
    ,tp.str_NAME,fd.str_REF
	,fd.dbl_MONTANT_RESTANT
	FROM t_facture_detail fd
	JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = fd.str_REF
	JOIN t_compte_client_tiers_payant ctp on ctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = ptp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
	JOIN t_tiers_payant tp on tp.lg_TIERS_PAYANT_ID = ctp.lg_TIERS_PAYANT_ID
	WHERE fd.dt_CREATED BETWEEN periode_deb AND periode_fin
	ORDER BY tp.str_CODE_ORGANISME ASC,fd.dt_CREATED;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_BalanceAgeeGenerale
DELIMITER //
CREATE PROCEDURE `Proc_BalanceAgeeGenerale`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN
	SELECT
	DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-01')) AS dt_CREATED
	,SUM(fd.dbl_MONTANT_RESTANT) dbl_montant
	FROM t_facture_detail fd
	WHERE fd.dt_CREATED BETWEEN periode_deb AND periode_fin
	GROUP BY DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-01'))
	ORDER BY DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-01'));
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_BalanceAgeeOrganism
DELIMITER //
CREATE PROCEDURE `Proc_BalanceAgeeOrganism`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN
	SELECT
	DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-01')) AS dt_CREATED
	,tp.str_NUMERO_IDF_ORGANISME
	,tp.str_CODE_ORGANISME,tp.str_NAME,fd.str_REF
	,SUM(fd.dbl_MONTANT_RESTANT) dbl_montant
	FROM t_facture_detail fd
	JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = fd.str_REF
	JOIN t_compte_client_tiers_payant ctp on ctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = ptp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
	JOIN t_tiers_payant tp on tp.lg_TIERS_PAYANT_ID = ctp.lg_TIERS_PAYANT_ID
	WHERE fd.dt_CREATED BETWEEN periode_deb AND periode_fin
	GROUP BY tp.str_CODE_ORGANISME,DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-01'))
	ORDER BY tp.str_CODE_ORGANISME ASC,DATE(DATE_FORMAT(fd.dt_CREATED, '%Y-%m-01'));
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_balanceVenteCaisse
DELIMITER //
CREATE PROCEDURE `Proc_balanceVenteCaisse`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN

CREATE TEMPORARY TABLE Temp_balanceVenteCaisse 
	(dt_CREATED DATETIME  NULL
     , int_nbre_vente INTEGER(11) NULL
     , int_montan_brut_ttc INTEGER(11) NULL
     , int_remise INTEGER(11) NULL
     , int_montan_net_ttc INTEGER(11) NULL
     , int_pan_moy INTEGER(11) NULL
     , int_price_espece INTEGER(40) NULL
     , int_price_cheq INTEGER(40) NULL
     , int_price_cart_banq INTEGER(40) NULL
     , int_price_devise INTEGER(40) NULL
     , int_price_differe INTEGER(40) NULL
     , int_price_tp INTEGER(40) NULL
     , int_price_cpt_clt INTEGER(40) NULL
     , int_price_acompte INTEGER(40) NULL
     , str_type_vente VARCHAR(10) NULL);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,COUNT(p.lg_PREENREGISTREMENT_ID) int_nbre_vente
,SUM(p.int_PRICE) int_montan_brut_ttc
,SUM(p.int_PRICE_REMISE) int_remise
,CASE WHEN (p.int_PRICE - p.int_PRICE_REMISE) IS NULL THEN SUM(p.int_PRICE) ELSE SUM(p.int_PRICE - p.int_PRICE_REMISE) END as int_montan_net_ttc
,CASE WHEN (p.int_PRICE - p.int_PRICE_REMISE) IS NULL THEN SUM(p.int_PRICE)/COUNT(p.lg_PREENREGISTREMENT_ID) ELSE SUM(p.int_PRICE - p.int_PRICE_REMISE)/COUNT(p.lg_PREENREGISTREMENT_ID) END int_pan_moy
,0,0,0,0,0,0,0,0,"ord_tp" str_type_vente
FROM t_preenregistrement p
WHERE p.str_STATUT like 'is_Closed' 
AND p.lg_PARENT_ID is NULL
AND (lg_TYPE_VENTE_ID = 2 OR lg_TYPE_VENTE_ID = 3)
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')));



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,COUNT(p.lg_PREENREGISTREMENT_ID) int_nbre_vente
,SUM(p.int_PRICE) int_montan_brut_ttc
,SUM(p.int_PRICE_REMISE) int_remise
,CASE WHEN (p.int_PRICE - p.int_PRICE_REMISE) IS NULL THEN SUM(p.int_PRICE) ELSE SUM(p.int_PRICE - p.int_PRICE_REMISE) END as int_montan_net_ttc
,CASE WHEN (p.int_PRICE - p.int_PRICE_REMISE) IS NULL THEN SUM(p.int_PRICE)/COUNT(p.lg_PREENREGISTREMENT_ID) ELSE SUM(p.int_PRICE - p.int_PRICE_REMISE)/COUNT(p.lg_PREENREGISTREMENT_ID) END int_pan_moy
,0,0,0,0,0,0,0,0,"ord_stp" str_type_vente
FROM t_preenregistrement p
WHERE p.str_STATUT like 'is_Closed' 
AND p.lg_PARENT_ID is NULL
AND (lg_TYPE_VENTE_ID =4  OR lg_TYPE_VENTE_ID =5 )
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);

 
INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,COUNT(p.lg_PREENREGISTREMENT_ID) int_nbre_vente
,SUM(p.int_PRICE) int_montan_brut_ttc
,SUM(p.int_PRICE_REMISE) int_remise
,CASE WHEN (p.int_PRICE - p.int_PRICE_REMISE) IS NULL THEN SUM(p.int_PRICE) ELSE SUM(p.int_PRICE - p.int_PRICE_REMISE) END as int_montan_net_ttc
,CASE WHEN (p.int_PRICE - p.int_PRICE_REMISE) IS NULL THEN SUM(p.int_PRICE)/COUNT(p.lg_PREENREGISTREMENT_ID) ELSE SUM(p.int_PRICE - p.int_PRICE_REMISE)/COUNT(p.lg_PREENREGISTREMENT_ID) END int_pan_moy
,0,0,0,0,0,0,0,0,"non_ord" str_type_vente
FROM t_preenregistrement p
WHERE p.str_STATUT like 'is_Closed' 
AND p.lg_PARENT_ID is NULL
AND (lg_TYPE_VENTE_ID = 1 )
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);




INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0
,SUM(p.int_PRICE) int_price_espece
,0,0,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_tp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 2 OR p.lg_TYPE_VENTE_ID = 3)
AND tr.lg_TYPE_REGLEMENT_ID = 1 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')));



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0
,SUM(p.int_PRICE) int_price_espece
,0,0,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_stp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 4 OR p.lg_TYPE_VENTE_ID = 5)
AND tr.lg_TYPE_REGLEMENT_ID = 1 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')));



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0
,SUM(p.int_PRICE) int_price_espece
,0,0,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"non_ord" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND p.lg_TYPE_VENTE_ID = 1
AND tr.lg_TYPE_REGLEMENT_ID = 1 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')));



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,SUM(p.int_PRICE) int_price_cheq,0,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_tp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 2 OR p.lg_TYPE_VENTE_ID = 3)
AND tr.lg_TYPE_REGLEMENT_ID = 2 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,SUM(p.int_PRICE) int_price_cheq,0,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_stp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 4 OR p.lg_TYPE_VENTE_ID = 5)
AND tr.lg_TYPE_REGLEMENT_ID = 2 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);

 
INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,SUM(p.int_PRICE) int_price_cheq,0,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"non_ord" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND p.lg_TYPE_VENTE_ID = 1
AND tr.lg_TYPE_REGLEMENT_ID = 2 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);




INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,SUM(p.int_PRICE) int_price_cart_banq,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_tp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 2 OR p.lg_TYPE_VENTE_ID = 3)
AND tr.lg_TYPE_REGLEMENT_ID = 3 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,SUM(p.int_PRICE) int_price_cart_banq,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_stp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 4 OR p.lg_TYPE_VENTE_ID = 5)
AND tr.lg_TYPE_REGLEMENT_ID = 3 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,SUM(p.int_PRICE) int_price_cart_banq,0,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"non_ord" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND p.lg_TYPE_VENTE_ID = 1
AND tr.lg_TYPE_REGLEMENT_ID = 3 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,0,0,SUM(p.int_PRICE) int_price_differe
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_tp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 2 OR p.lg_TYPE_VENTE_ID = 3)
AND tr.lg_TYPE_REGLEMENT_ID = 4 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,0,0,SUM(p.int_PRICE) int_price_differe
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_stp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND (p.lg_TYPE_VENTE_ID = 4 OR p.lg_TYPE_VENTE_ID = 5)
AND tr.lg_TYPE_REGLEMENT_ID = 4 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);


INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,0,0,SUM(p.int_PRICE) int_price_differe
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"non_ord" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL 
AND p.lg_TYPE_VENTE_ID = 1
AND tr.lg_TYPE_REGLEMENT_ID = 4 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,0,SUM(p.int_PRICE) int_price_devise,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_tp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL
AND (p.lg_TYPE_VENTE_ID = 2 OR p.lg_TYPE_VENTE_ID = 3) 
AND tr.lg_TYPE_REGLEMENT_ID = 5 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,0,SUM(p.int_PRICE) int_price_devise,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"ord_stp" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL
AND (p.lg_TYPE_VENTE_ID = 4 OR p.lg_TYPE_VENTE_ID = 5) 
AND tr.lg_TYPE_REGLEMENT_ID = 5 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);



INSERT INTO Temp_balanceVenteCaisse
(
SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
,0,0,0,0,0,0
,0,0,SUM(p.int_PRICE) int_price_devise,0
,SUM(ptp.int_PRICE) dbl_part_tp
,SUM(pcl.int_PRICE) dbl_part_clt,0,"non_ord" str_type_vente
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL
AND p.lg_TYPE_VENTE_ID = 1 
AND tr.lg_TYPE_REGLEMENT_ID = 5 
AND p.dt_CREATED BETWEEN periode_deb AND periode_fin
GROUP BY DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d'))
);

SELECT
CASE str_type_vente 
WHEN "ord_tp" THEN "VO av TP"
WHEN "ord_stp" THEN "VO ss TP"
WHEN "n_ord" THEN "VNO" 
ELSE ""
END AS str_type_vente  
,dt_CREATED
	,SUM(int_nbre_vente) int_nbre_vente
     , SUM(int_montan_brut_ttc) int_montan_brut_ttc
     , SUM(int_remise) int_remise
     , SUM(int_montan_net_ttc) int_montan_net_ttc
     , SUM(int_pan_moy) int_pan_moy
     , SUM(int_price_espece) int_price_espece
     , SUM(int_price_cheq) int_price_cheq
     , SUM(int_price_cart_banq) int_price_cart_banq
     , SUM(int_price_devise) int_price_devise
     , SUM(int_price_differe) int_price_differe
     , SUM(int_price_tp) int_price_tp
     , SUM(int_price_cpt_clt) int_price_cpt_clt
     , SUM(int_price_acompte) int_price_acompte
 FROM Temp_balanceVenteCaisse
 GROUP BY str_type_vente,dt_CREATED;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_calcul_marge
DELIMITER //
CREATE PROCEDURE `proc_calcul_marge`(
        IN `dt_BEGIN` DATE,
        IN `dt_END` DATE
    )
BEGIN 
DECLARE TOTALVENTE DOUBLE(12,2);
DECLARE TOTALVENTEOTHER DOUBLE(12,2);
DECLARE MVTFALSE NUMERIC(15);
DECLARE TOTALACHAT DOUBLE(12,2);
DECLARE RATIO DOUBLE(12,2);
DECLARE RATIOOTHER DOUBLE(12,2);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT (CASE WHEN SUM(t.int_PRICE) IS NOT NULL THEN SUM(t.int_PRICE) ELSE 0 END) - SUM(t.int_PRICE_REMISE) AS int_PRICE, 
(CASE WHEN SUM(t.int_PRICE_OTHER) IS NOT NULL THEN SUM(t.int_PRICE_OTHER) ELSE 0 END) - SUM(t.int_PRICE_REMISE) AS int_PRICE_OTHER
FROM t_preenregistrement t, t_user u
WHERE t.lg_USER_CAISSIER_ID = u.lg_USER_ID
AND (DATE(t.dt_UPDATED) >= dt_BEGIN 
AND DATE(t.dt_UPDATED) <= dt_END)
AND u.lg_EMPLACEMENT_ID LIKE '%%' AND t.str_STATUT = 'is_Closed' 
AND t.int_PRICE > 0 AND t.b_IS_CANCEL = false AND t.lg_TYPE_VENTE_ID NOT LIKE '5';

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_calculmarge_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_calculmarge_table
(
f_KEY VARCHAR(20) PRIMARY KEY,
f_TOTALVENTE DOUBLE DEFAULT 0,
f_TOTALVENTEOTHER DOUBLE DEFAULT 0,
f_MVTFALSE NUMERIC(15) DEFAULT 0,
f_TOTALACHAT DOUBLE DEFAULT 0,
f_MARGE DOUBLE DEFAULT 0,
f_MARGEOTHER DOUBLE DEFAULT 0,
f_RATIO DOUBLE DEFAULT 0,
f_RATIOOTHER DOUBLE DEFAULT 0);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO TOTALVENTE,TOTALVENTEOTHER;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT (CASE WHEN SUM(t.int_HTTC) IS NOT NULL THEN SUM(t.int_HTTC) ELSE 0 END) INTO TOTALACHAT FROM t_bon_livraison t, t_order o 
WHERE t.lg_ORDER_ID = o.lg_ORDER_ID AND o.lg_GROSSISTE_ID LIKE '%%' 
AND (DATE(t.dt_DATE_LIVRAISON) >= dt_BEGIN AND DATE(t.dt_DATE_LIVRAISON) <= dt_END) AND t.str_STATUT = 'is_Closed';

SELECT (CASE WHEN SUM(t.int_AMOUNT) IS NOT NULL THEN SUM(t.int_AMOUNT) ELSE 0 END) INTO MVTFALSE FROM t_mvt_caisse t 
WHERE (DATE(t.dt_CREATED) >= dt_BEGIN AND DATE(t.dt_CREATED) <= dt_END) AND t.bool_CHECKED = false;
 
SET RATIOOTHER = TOTALVENTEOTHER/TOTALACHAT;
SET RATIO = TOTALVENTE/TOTALACHAT;

INSERT INTO emp_calculmarge_table (f_KEY,f_TOTALVENTE,f_TOTALVENTEOTHER,f_MVTFALSE,f_TOTALACHAT,f_MARGE,f_MARGEOTHER, f_RATIO, f_RATIOOTHER)
 VALUES ("1",TOTALVENTE,TOTALVENTEOTHER,MVTFALSE,TOTALACHAT,TOTALVENTE-TOTALACHAT,TOTALVENTEOTHER-TOTALACHAT,RATIO, RATIOOTHER);
END LOOP bl_loop;
 CLOSE curbl;

SELECT * FROM emp_calculmarge_table;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_clientavoirdata
DELIMITER //
CREATE PROCEDURE `proc_clientavoirdata`(
        IN `MOIS` VARCHAR(2)
    )
BEGIN 
DECLARE LGCLIENT VARCHAR(40);
DECLARE MONTANTAVOIR NUMERIC(15);
DECLARE DATEOPE DATE;
DECLARE NOMBRE INT;
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT c.`lg_CLIENT_ID`,SUM(DISTINCT d.`int_PRICE_UNITAIR`*d.`int_AVOIR`) AVOIRMONTANT,DATE(p.`dt_CREATED`) AS DATEOP
FROM t_preenregistrement p,t_preenregistrement_compte_client_tiers_payent pr,t_preenregistrement_detail d,
t_compte_client cl,t_compte_client_tiers_payant cp,t_client c
WHERE
p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID` AND 
p.`lg_PREENREGISTREMENT_ID` =d.`lg_PREENREGISTREMENT_ID`
AND c.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID` AND pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` =cp.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`
AND cl.`lg_COMPTE_CLIENT_ID`=cp.`lg_COMPTE_CLIENT_ID` AND
 p.`b_IS_AVOIR`=1 AND d.`b_IS_AVOIR`=1 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE`>0 
 AND p.`str_STATUT`='is_Closed' AND MONTH(p.`dt_CREATED`)=`MOIS`
 GROUP BY c.`lg_CLIENT_ID`
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGCLIENT,MONTANTAVOIR,DATEOPE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM `t_snap_shop_vente_client` WHERE MONTH(t_snap_shop_vente_client.`dt_DAY`)=`MOIS` 
 AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_client SET int_AMOUNT_AVOIR=int_AMOUNT_AVOIR+MONTANTAVOIR,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_client.`dt_DAY`)=`MOIS` AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT;
ELSE
INSERT INTO `t_snap_shop_vente_client` 
 (lg_CLIENT_ID,int_AMOUNT_AVOIR,dt_DAY,dt_CREATED)
 VALUES(LGCLIENT,MONTANTAVOIR,DATEOPE,NOW() );
END IF;

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_clientavoirtrigger
DELIMITER //
CREATE PROCEDURE `proc_clientavoirtrigger`(
        IN `LGCOMPTECLIENT` VARCHAR(50),
        IN `MONTANTAVOIR` DECIMAL(10,0)
    )
BEGIN 
DECLARE LGCLIENT VARCHAR(40);
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT DISTINCT t.`lg_CLIENT_ID`  from 
t_compte_client c,
t_client t
WHERE 
 t.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND c.`lg_COMPTE_CLIENT_ID`=`LGCOMPTECLIENT`
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGCLIENT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM `t_snap_shop_vente_client` WHERE MONTH(t_snap_shop_vente_client.`dt_DAY`)=MONTH(CURDATE()) 
 AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_client SET int_AMOUNT_AVOIR=int_AMOUNT_AVOIR+MONTANTAVOIR,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_client.`dt_DAY`)=`MOIS` AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT;
ELSE
INSERT INTO `t_snap_shop_vente_client` 
 (lg_CLIENT_ID,int_AMOUNT_AVOIR,dt_DAY,dt_CREATED)
 VALUES(LGCLIENT,MONTANTAVOIR,CURDATE(),NOW() );
END IF;

END LOOP bl_loop;
 CLOSE curbl;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_clientvente
DELIMITER //
CREATE PROCEDURE `proc_clientvente`(
        IN `MOIS` VARCHAR(2)
    )
BEGIN 
DECLARE LGCLIENT VARCHAR(40);
DECLARE MONTANTVENTE NUMERIC(15);
DECLARE DATEOPE DATE;
DECLARE NOMBRE INT;
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`lg_CLIENT_ID`,p.`int_CUST_PART`,DATE(p.dt_CREATED) from 
t_preenregistrement_compte_client_tiers_payent pr,
t_preenregistrement p,
t_compte_client c,t_compte_client_tiers_payant cl,
t_client t
WHERE p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID`
AND c.`lg_COMPTE_CLIENT_ID`=cl.`lg_COMPTE_CLIENT_ID`
AND cl.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`
AND t.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE`>0 
AND p.`str_STATUT`='is_Closed' AND p.`b_IS_AVOIR`=0 AND MONTH(p.`dt_CREATED`)=`MOIS`
GROUP BY t.`lg_CLIENT_ID`
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGCLIENT,MONTANTVENTE,DATEOPE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM `t_snap_shop_vente_client` WHERE MONTH(t_snap_shop_vente_client.`dt_DAY`)=`MOIS` 
 AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_client SET int_AMOUNT_SALE=int_AMOUNT_SALE+MONTANTVENTE,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_client.`dt_DAY`)=`MOIS` AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT;
ELSE
INSERT INTO `t_snap_shop_vente_client` 
 (lg_CLIENT_ID,int_AMOUNT_SALE,dt_DAY,dt_CREATED)
 VALUES(LGCLIENT,MONTANTVENTE,DATEOPE,NOW() );
END IF;

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_clientventetrigger
DELIMITER //
CREATE PROCEDURE `proc_clientventetrigger`(
        IN `IDCOMPTECLIENT` VARCHAR(50),
        IN `IDPREENREGISTREMENT` VARCHAR(50)
    )
BEGIN 
DECLARE LGCLIENT VARCHAR(40);
DECLARE MONTANTVENTE NUMERIC(15);
DECLARE done INT DEFAULT 0;
DECLARE NOMBRE INT;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`lg_CLIENT_ID`, (CASE WHEN p.`lg_TYPE_VENTE_ID`='3' THEN p.`int_PRICE`  ELSE p.`int_CUST_PART` END ) AS MONTANT from 
t_compte_client c,t_preenregistrement p,
t_client t
WHERE 
t.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND 
p.`lg_PREENREGISTREMENT_ID`=`IDPREENREGISTREMENT`
AND c.`lg_COMPTE_CLIENT_ID`=`IDCOMPTECLIENT`
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGCLIENT,MONTANTVENTE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM `t_snap_shop_vente_client` WHERE MONTH(t_snap_shop_vente_client.`dt_DAY`)=MONTH(CURDATE()) 
 AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_client SET int_AMOUNT_SALE=int_AMOUNT_SALE+MONTANTVENTE,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_client.`dt_DAY`)=MONTH(CURDATE()) AND t_snap_shop_vente_client.`lg_CLIENT_ID`=LGCLIENT;
ELSE
INSERT INTO `t_snap_shop_vente_client` 
 (lg_CLIENT_ID,int_AMOUNT_SALE,dt_DAY,dt_CREATED)
 VALUES(LGCLIENT,MONTANTVENTE,CURDATE(),NOW() );
END IF;

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
CALL proc_updateteclientpreenregistrementavoir(LGCLIENT,`IDPREENREGISTREMENT`);
SELECT NOMBRE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_clotureinentaire
DELIMITER //
CREATE PROCEDURE `proc_clotureinentaire`(
        IN `lg_TYPE_STOCK_ID` VARCHAR(50),
        IN `lg_USER_ID` VARCHAR(50),
        IN `lgINVENTAIREID` VARCHAR(50),
        IN `lgEMPLACEMENTID` VARCHAR(50)
    )
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK NUMERIC(12);
DECLARE STOCKDEBUT NUMERIC(12);
DECLARE lgINVENTAIREFAMILLEID BIGINT(20);
DECLARE lgFAMILLESTOCKID VARCHAR(50);
DECLARE lgTYPESTOCKFAMILLEID VARCHAR(50);
DECLARE lgMOUVEMENTID VARCHAR(50);
DECLARE lgMOUVEMENTSNAPSHOTID VARCHAR(50);
DECLARE NOMBRE NUMERIC(12);
DECLARE CheckExists INT DEFAULT 0;
DECLARE CheckMVTExists INT DEFAULT 0;
DECLARE compteur NUMERIC(12) DEFAULT 0;
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT 
  
  `t_inventaire_famille`.`lg_INVENTAIRE_FAMILLE_ID`,

  `t_inventaire_famille`.`int_NUMBER`,
  `t_inventaire_famille`.`lg_FAMILLE_ID`,
  `t_inventaire_famille`.`lg_FAMILLE_STOCK_ID`,
`t_type_stock_famille`.`lg_TYPE_STOCK_FAMILLE_ID`,
`t_inventaire_famille`.`int_NUMBER_INIT`
FROM
  `t_inventaire_famille`
  INNER JOIN `t_inventaire` ON (`t_inventaire_famille`.`lg_INVENTAIRE_ID` = `t_inventaire`.`lg_INVENTAIRE_ID`)
  INNER JOIN `t_famille` ON (`t_inventaire_famille`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`)
  INNER JOIN `t_type_stock_famille` ON (`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`)
 
WHERE
  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` = `lg_TYPE_STOCK_ID` AND `t_inventaire`.`lg_INVENTAIRE_ID`=`lgINVENTAIREID` AND 
`t_type_stock_famille`.`lg_TYPE_STOCK_ID`=`lg_TYPE_STOCK_ID` AND `t_inventaire_famille`.`bool_INVENTAIRE`=1
  AND  `t_inventaire_famille`.`int_NUMBER` <>  `t_inventaire_famille`.`int_NUMBER_INIT`;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgINVENTAIREFAMILLEID,STOCK,LGFAMILLEID,lgFAMILLESTOCKID,lgTYPESTOCKFAMILLEID,STOCKDEBUT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE `t_inventaire_famille`
 SET `str_STATUT`='is_Closed',`dt_UPDATED`=NOW() WHERE `lg_INVENTAIRE_FAMILLE_ID`=lgINVENTAIREFAMILLEID;
UPDATE t_famille_stock SET `int_NUMBER`=STOCK,`int_NUMBER_AVAILABLE`=STOCK,`dt_UPDATED`=NOW() WHERE `lg_FAMILLE_STOCK_ID`=lgFAMILLESTOCKID;
UPDATE t_type_stock_famille SET `int_NUMBER`=STOCK,`dt_UPDATED`=NOW() WHERE `lg_TYPE_STOCK_FAMILLE_ID`=lgTYPESTOCKFAMILLEID;
UPDATE t_famille SET `dt_LAST_INVENTAIRE`=NOW() WHERE `lg_FAMILLE_ID`=LGFAMILLEID;
SELECT COUNT(*),m.`lg_MOUVEMENT_ID` INTO CheckExists,lgMOUVEMENTID  FROM t_mouvement m WHERE DATE(m.`dt_DAY`)=DATE(NOW()) AND m.`lg_FAMILLE_ID`=LGFAMILLEID AND m.`lg_USER_ID`=`lg_USER_ID` AND m.`str_ACTION`='INVENTAIRE' AND m.`lg_EMPLACEMENT_ID`=`lgEMPLACEMENTID` LIMIT 1;
IF(CheckExists>0)THEN 
UPDATE t_mouvement SET `int_NUMBERTRANSACTION`=`int_NUMBERTRANSACTION`+1 ,`int_NUMBER`=`int_NUMBER`+STOCK WHERE `lg_MOUVEMENT_ID`=lgMOUVEMENTID;
ELSE
INSERT INTO t_mouvement (lg_MOUVEMENT_ID,lg_FAMILLE_ID,lg_USER_ID,P_KEY,str_TYPE_ACTION,str_ACTION,dt_DAY,dt_CREATED,str_STATUT,int_NUMBER,int_NUMBERTRANSACTION,`lg_EMPLACEMENT_ID`)
 VALUES (DATE_FORMAT(NOW(),'%d%m%Y%h%i%s')+compteur,LGFAMILLEID,`lg_USER_ID`,'','OTHER','INVENTAIRE',DATE(NOW()),NOW(),'enable',STOCK,1,`lgEMPLACEMENTID`);
END IF;
SELECT COUNT(*),m.`lg_MOUVEMENT_SNAPSHOT_ID` INTO CheckMVTExists,lgMOUVEMENTSNAPSHOTID  FROM t_mouvement_snapshot m WHERE DATE(m.`dt_DAY`)=DATE(NOW()) AND m.`lg_FAMILLE_ID`=LGFAMILLEID AND m.`lg_EMPLACEMENT_ID`=`lgEMPLACEMENTID` LIMIT 1;
IF(CheckMVTExists>0)THEN 
UPDATE t_mouvement_snapshot SET `int_NUMBERTRANSACTION`=`int_NUMBERTRANSACTION`+1 ,`dt_UPDATED`=NOW() ,int_STOCK_JOUR =STOCK WHERE `lg_MOUVEMENT_SNAPSHOT_ID`=lgMOUVEMENTSNAPSHOTID;
ELSE
INSERT INTO t_mouvement_snapshot (lg_MOUVEMENT_SNAPSHOT_ID,lg_FAMILLE_ID,dt_DAY,dt_CREATED,str_STATUT,int_NUMBERTRANSACTION,lg_EMPLACEMENT_ID,int_STOCK_JOUR,int_STOCK_DEBUT)
 VALUES (DATE_FORMAT(NOW(),'%d%m%Y%h%i%s')+compteur,LGFAMILLEID,DATE(NOW()),NOW(),'enable',1,`lgEMPLACEMENTID`,STOCK,STOCKDEBUT);
END IF;

SET NOMBRE=NOMBRE+1;
SET compteur=compteur+1;
END LOOP bl_loop;
 CLOSE curbl;
IF(NOMBRE>0)THEN
UPDATE t_inventaire SET `str_STATUT`='is_Closed',dt_UPDATED=now() WHERE `lg_INVENTAIRE_ID`=`lgINVENTAIREID`;
COMMIT;
END IF;
SELECT  NOMBRE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_createventestatsocietetable
DELIMITER //
CREATE PROCEDURE `proc_createventestatsocietetable`()
BEGIN 
DROP TEMPORARY TABLE IF EXISTS tmp_updateventetable;
CREATE TEMPORARY TABLE tmp_updateventetable(
id INT,
VALEUR VARCHAR(2) );
INSERT INTO tmp_updateventetable VALUES (1,'1'),(2,'2'),(3,'3'),(4,'4'),(5,'5'),(6,'6'),(7,'7');
SELECT * FROM tmp_updateventetable;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_delete_evaluationoffreprix
DELIMITER //
CREATE PROCEDURE `proc_delete_evaluationoffreprix`()
BEGIN 
DELETE FROM t_evaluationoffreprix;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_delete_inventory
DELIMITER //
CREATE PROCEDURE `proc_delete_inventory`(
        IN `lg_INVENTAIRE_ID` VARCHAR(40),
        IN `str_STATUT` VARCHAR(20),
        IN `str_STATUT_UPDATE` VARCHAR(20),
        IN `lg_USER_ID` VARCHAR(40)
    )
BEGIN 
DECLARE LGINVENTAIREFAMILLEID VARCHAR(40);
DECLARE COUNTER NUMERIC(12);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.lg_INVENTAIRE_FAMILLE_ID FROM t_inventaire_famille t WHERE t.lg_INVENTAIRE_ID = lg_INVENTAIRE_ID
AND t.str_STATUT = str_STATUT;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

SET COUNTER=0;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGINVENTAIREFAMILLEID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 	 UPDATE t_inventaire_famille t SET t.str_STATUT = str_STATUT_UPDATE, t.dt_UPDATED = NOW() WHERE t.lg_INVENTAIRE_FAMILLE_ID = LGINVENTAIREFAMILLEID;
SET COUNTER=COUNTER+1;
END LOOP bl_loop;
 CLOSE curbl;
 UPDATE t_inventaire t SET t.str_STATUT = str_STATUT_UPDATE, t.dt_UPDATED = NOW(), t.lg_USER_ID = lg_USER_ID WHERE t.lg_INVENTAIRE_ID = lg_INVENTAIRE_ID;
COMMIT;

SELECT COUNTER;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_delete_stock_doublon
DELIMITER //
CREATE PROCEDURE `proc_delete_stock_doublon`(
IN lgEMPLACEMENTID VARCHAR(80)
)
BEGIN 
DECLARE lgFAMILLESTOCKID VARCHAR(80);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT s.`lg_FAMILLE_ID`  FROM t_famille_stock s
 WHERE s.`lg_EMPLACEMENT_ID`=lgEMPLACEMENTID
GROUP BY s.`lg_FAMILLE_ID`,s.`lg_EMPLACEMENT_ID`  HAVING COUNT(s.`lg_FAMILLE_ID`)>1
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLESTOCKID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
DELETE FROM t_famille_stock WHERE t_famille_stock.`lg_FAMILLE_ID` =lgFAMILLESTOCKID AND t_famille_stock.`lg_EMPLACEMENT_ID`=lgEMPLACEMENTID;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_depot_mouvement
DELIMITER //
CREATE PROCEDURE `proc_depot_mouvement`(
        IN `qtyVendu` INTEGER,
        IN `idFAMILLE` VARCHAR(20),
        IN `idEmplacement` VARCHAR(20),
        IN `idUSER` VARCHAR(20),
        IN `idVENTE` VARCHAR(20)
    )
BEGIN
declare nbligne int default 0;
DECLARE compteur int(8) DEFAULT 0;
UPDATE  t_mouvement set int_NUMBERTRANSACTION=int_NUMBERTRANSACTION+1, int_NUMBER=int_NUMBER+qtyVendu,dt_UPDATED=now()
WHERE date(dt_DAY) =current_date()  AND lg_FAMILLE_ID=`idFAMILLE` AND str_TYPE_ACTION='ADD' AND str_ACTION='ENTREESTOCK' ;
 
SELECT row_count() into nbligne;
IF nbligne=0 then
INSERT INTO t_mouvement (lg_MOUVEMENT_ID,lg_FAMILLE_ID,lg_USER_ID,P_KEY,str_TYPE_ACTION,str_ACTION,dt_DAY,dt_CREATED,dt_UPDATED,str_STATUT,int_NUMBER,int_NUMBERTRANSACTION,lg_EMPLACEMENT_ID)
VALUES(REPLACE(UUID(),'-',''),idFAMILLE,idUSER,'','ADD','ENTREESTOCK',current_date() ,now(),now(),'enable',qtyVendu,1,idEmplacement);
END IF ;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_depot_vente
DELIMITER //
CREATE PROCEDURE `proc_depot_vente`(
        IN `idVENTE` VARCHAR(20),
        IN `lgEMPLACEMENTID` VARCHAR(20)
    )
BEGIN
DECLARE done INT DEFAULT 0;
DECLARE lgFAMILLEID VARCHAR(20);
DECLARE lgUSERID VARCHAR(20);
DECLARE lgPREENREGISTREMENTDETAILID VARCHAR(20);
DECLARE qty int(8);
DECLARE curbl CURSOR FOR  

SELECT 
  `t_preenregistrement_detail`.`lg_FAMILLE_ID`,
  `t_preenregistrement_detail`.`int_QUANTITY_SERVED`,
  `t_user`.`lg_USER_ID`, `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID`

FROM
  `t_emplacement`
  INNER JOIN `t_user` ON (`t_emplacement`.`lg_EMPLACEMENT_ID` = `t_user`.`lg_EMPLACEMENT_ID`)
  INNER JOIN `t_preenregistrement` ON (`t_user`.`lg_USER_ID` = `t_preenregistrement`.`lg_USER_ID`)
  INNER JOIN `t_preenregistrement_detail` ON (`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`)
WHERE
  `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = idVENTE;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID,qty,lgUSERID,lgPREENREGISTREMENTDETAILID;
IF done=1 THEN 

 LEAVE bl_loop;
 END IF;

    CALL `proc_depot_mouvement`(qty,lgFAMILLEID,lgEMPLACEMENTID,lgUSERID,lgPREENREGISTREMENTDETAILID);
     CALL proc_mouvement(qty,lgFAMILLEID,'1',lgUSERID,lgPREENREGISTREMENTDETAILID);
   
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_do_activity
DELIMITER //
CREATE PROCEDURE `proc_do_activity`(
        IN `lg_USER_ID` VARCHAR(20)
    )
BEGIN

UPDATE T_USER

SET T_USER.dt_LAST_ACTIVITY  = NOW()

WHERE T_USER.lg_USER_ID  = lg_USER_ID;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_do_event_log
DELIMITER //
CREATE PROCEDURE `proc_do_event_log`(
        IN `lg_EVENT_LOG_ID` VARCHAR(40),
        IN `MATRICULE_ELEVE` VARCHAR(40),
        IN `str_DESCRIPTION` VARCHAR(2000),
        IN `str_TABLE_CONCERN` VARCHAR(20),
        IN `str_MODULE_CONCERN` VARCHAR(40),
        IN `str_CREATED_BY` VARCHAR(40),
        IN `str_STATUT` VARCHAR(40),
        IN `ID_ANNEE_SCOLAIRE` VARCHAR(20)
    )
BEGIN

INSERT INTO `t_event_log` (`lg_EVENT_LOG_ID`,

  `str_DESCRIPTION`, `str_CREATED_BY`, `str_STATUT`, `str_TABLE_CONCERN`,

  `str_MODULE_CONCERN`) VALUES

  (lg_EVENT_LOG_ID, str_DESCRIPTION, str_CREATED_BY,

  str_TABLE_CONCERN, str_MODULE_CONCERN,str_STATUT);

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_dossierAttenteEdition
DELIMITER //
CREATE PROCEDURE `Proc_dossierAttenteEdition`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN
 	select f.str_CODE_FACTURE code_facture,
	f.dbl_MONTANT_CMDE montantFacture,tp.lg_TIERS_PAYANT_ID code_org,
	tp.str_NAME assurance,cl.str_CODE_INTERNE code_clt,cl.str_FIRST_NAME nom_clt,cl.str_LAST_NAME prenom_clt
	from t_preenregistrement_compte_client_tiers_payent ptp 
	JOIN t_preenregistrement p on p.lg_PREENREGISTREMENT_ID = ptp.lg_PREENREGISTREMENT_ID
	JOIN t_compte_client_tiers_payant cct ON cct.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = ptp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
	JOIN t_tiers_payant tp on tp.lg_TIERS_PAYANT_ID = cct.lg_TIERS_PAYANT_ID 
	JOIN t_compte_client cclt on cclt.lg_COMPTE_CLIENT_ID = cct.lg_COMPTE_CLIENT_ID
	JOIN t_client cl ON cl.lg_CLIENT_ID = cclt.lg_CLIENT_ID
	JOIN t_facture_detail fd on fd.str_REF = ptp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID
	JOIN t_facture f on f.lg_FACTURE_ID = fd.lg_FACTURE_ID
	WHERE str_STATUT_FACTURE like 'unpaid' and f.lg_TYPE_FACTURE_ID = 1
	AND ptp.dt_CREATED BETWEEN periode_deb AND periode_fin
	ORDER BY tp.lg_TIERS_PAYANT_ID;
 END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_famille_stock_doublon
DELIMITER //
CREATE PROCEDURE `proc_famille_stock_doublon`()
BEGIN 
DECLARE lgEMPLACEMENTID VARCHAR(80);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT e.`lg_EMPLACEMENT_ID` FROM t_emplacement e WHERE e.`lg_EMPLACEMENT_ID` <>1

;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgEMPLACEMENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
CALL proc_delete_stock_doublon(lgEMPLACEMENTID);
END LOOP bl_loop;
 CLOSE curbl;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_gestioncaisse
DELIMITER //
CREATE PROCEDURE `proc_gestioncaisse`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `lgUSERID` VARCHAR(60)
    )
BEGIN 
DECLARE FONDCAISSE NUMERIC(15);
DECLARE TOTALCAISSE NUMERIC(15);
DECLARE USERNAME VARCHAR(200);
DECLARE dtCREATED DATE;
DECLARE dtUPDATED DATE;
DECLARE SOLDE NUMERIC(15);
DECLARE USERID  VARCHAR(60); 
DECLARE vRESUMECAISSE  VARCHAR(60); 

DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT CONCAT(u.`str_FIRST_NAME`,' ',u.`str_LAST_NAME`) ,
rm.`int_SOLDE_MATIN` ,
rm.`int_SOLDE_SOIR` ,
rm.`dt_CREATED`
,rm.`dt_UPDATED`,
(CASE WHEN rm.`str_STATUT`<>'is_Using'  THEN (rm.`int_SOLDE_SOIR`-rm.`int_SOLDE_MATIN`) ELSE rm.`int_SOLDE_SOIR` END )
,u.`lg_USER_ID`,rm.`ld_CAISSE_ID`
FROM t_resume_caisse rm, t_user u
WHERE
 rm.`lg_USER_ID`=u.`lg_USER_ID`
AND DATE(rm.`dt_CREATED`)BETWEEN  DATE(`dt_start`) AND DATE(`dt_end`) AND rm.`str_STATUT`<>'is_Using' 
AND (u.`lg_USER_ID` LIKE `lgUSERID`) GROUP BY u.`lg_USER_ID`,rm.`ld_CAISSE_ID`  ORDER BY DATE(rm.`dt_CREATED`) DESC 
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP  TEMPORARY TABLE IF EXISTS emp_gestioncaisse_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_gestioncaisse_table
(
USERNAME VARCHAR(200),
FONDCAISSE NUMERIC (15) DEFAULT 0,
TOTALCAISSE NUMERIC (15) DEFAULT 0,
dt_CREATED DATE,
dt_UPDATED DATE,
SOLDE NUMERIC (15) DEFAULT 0,
BILLETAGE NUMERIC (15) DEFAULT 0,
ECART NUMERIC (15) DEFAULT 0,
lg_USER_ID VARCHAR(60),
RESUMECAISSE VARCHAR(60)

);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO USERNAME,FONDCAISSE,TOTALCAISSE,dtCREATED,dtUPDATED,SOLDE,USERID,vRESUMECAISSE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 INSERT INTO emp_gestioncaisse_table (USERNAME,FONDCAISSE,TOTALCAISSE,dt_CREATED,dt_UPDATED,SOLDE,BILLETAGE,ECART,lg_USER_ID,RESUMECAISSE)
 VALUES (USERNAME,FONDCAISSE,TOTALCAISSE,dtCREATED,dtUPDATED,SOLDE,0,0,USERID,vRESUMECAISSE);

END LOOP bl_loop;
 CLOSE curbl;
 CALL proc_gestioncaissebilletage(`dt_start`,`dt_end`);
SELECT * FROM emp_gestioncaisse_table ORDER BY dt_CREATED DESC;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_gestioncaissebilletage
DELIMITER //
CREATE PROCEDURE `proc_gestioncaissebilletage`(
        IN `dt_start` DATE,
        IN `dt_end` DATE
    )
BEGIN 
DECLARE vBILLETAGE NUMERIC(15);
DECLARE USERID VARCHAR(60);
DECLARE dtCREATED DATE;
DECLARE CAISSE  VARCHAR(60); 


DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
  SELECT b.`int_AMOUNT`,b.`lg_USER_ID`,DATE(b.`dt_CREATED`),b.`ld_CAISSE_ID` FROM `t_billetage` b WHERE
 DATE(b.`dt_CREATED`)  BETWEEN DATE(`dt_start`) AND DATE(`dt_end`)
ORDER BY DATE(b.`dt_CREATED`) DESC 
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO vBILLETAGE,USERID,dtCREATED,CAISSE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE emp_gestioncaisse_table SET BILLETAGE=vBILLETAGE,ECART=vBILLETAGE-TOTALCAISSE WHERE lg_USER_ID=USERID AND RESUMECAISSE=CAISSE;
 
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_getprivilege_user_for_product
DELIMITER //
CREATE PROCEDURE `proc_getprivilege_user_for_product`(
        IN `LGUSERID` VARCHAR(40)
    )
BEGIN 
DECLARE P_BT_DELETE TINYINT(1);
DECLARE P_BT_UPDATE TINYINT(1);
DECLARE P_UPDATE_PAF TINYINT(1);
DECLARE P_UPDATE_PRIXVENTE TINYINT(1);
DECLARE P_UPDATE_CODETABLEAU TINYINT(1);
DECLARE P_UPDATE_CODEREMISE TINYINT(1);
DECLARE P_UPDATE_CIP TINYINT(1);
DECLARE P_UPDATE_DESIGNATION TINYINT(1);

DROP TEMPORARY TABLE IF EXISTS privilegeuser;
 CREATE TEMPORARY TABLE IF NOT EXISTS privilegeuser
(
f_KEY VARCHAR(5) PRIMARY KEY,
f_P_BT_DELETE TINYINT(1) DEFAULT 0,
f_P_BT_UPDATE TINYINT(1) DEFAULT 0,
f_P_UPDATE_PAF TINYINT(1) DEFAULT 0,
f_P_UPDATE_PRIXVENTE TINYINT(1) DEFAULT 0,
f_P_UPDATE_CODETABLEAU TINYINT(1) DEFAULT 0,
f_P_UPDATE_CODEREMISE TINYINT(1) DEFAULT 0,
f_P_UPDATE_CIP TINYINT(1) DEFAULT 0,
f_P_UPDATE_DESIGNATION TINYINT(1) DEFAULT 0);

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_BT_DELETE 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_BT_DELETE' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_BT_UPDATE 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_BT_UPDATE' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_UPDATE_PAF 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_UPDATE_PAF' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_UPDATE_PRIXVENTE 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_UPDATE_PRIXVENTE' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_UPDATE_CODETABLEAU 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_UPDATE_CODETABLEAU' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_UPDATE_CODEREMISE 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_UPDATE_CODEREMISE' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_UPDATE_CIP 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_UPDATE_CIP' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';

SELECT (CASE WHEN COUNT(`t_privilege`.`str_NAME`) = 0 THEN 0 ELSE 1 END) INTO P_UPDATE_DESIGNATION 
FROM `t_role_user` 
INNER JOIN `t_user` 
ON (`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`) 
INNER JOIN `t_role` ON (`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`) 
INNER JOIN `t_role_privelege` ON (`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`) 
INNER JOIN `t_privilege` ON (`t_role_privelege`.`lg_PRIVILEGE_ID` = `t_privilege`.`lg_PRIVELEGE_ID`) 
WHERE `t_privilege`.`str_NAME` = 'P_UPDATE_DESIGNATION' 
AND `t_user`.`lg_USER_ID` = LGUSERID AND `t_privilege`.`str_STATUT`='enable';
 

INSERT INTO privilegeuser (f_KEY,f_P_BT_DELETE,f_P_BT_UPDATE,f_P_UPDATE_PAF,f_P_UPDATE_PRIXVENTE,f_P_UPDATE_CODETABLEAU,
f_P_UPDATE_CODEREMISE, f_P_UPDATE_CIP, f_P_UPDATE_DESIGNATION)
 VALUES ("1",P_BT_DELETE,P_BT_UPDATE,P_UPDATE_PAF,P_UPDATE_PRIXVENTE,P_UPDATE_CODETABLEAU,P_UPDATE_CODEREMISE,P_UPDATE_CIP, P_UPDATE_DESIGNATION);
 
SELECT * FROM privilegeuser;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_indicateur_sugges
DELIMITER //
CREATE PROCEDURE `proc_indicateur_sugges`(
        IN `lgFAMILLEID` VARCHAR(20)
    )
BEGIN 
DECLARE CheckExists INT DEFAULT 0;
SELECT COUNT(*) INTO CheckExists FROM `t_order_detail` WHERE str_STATUT='passed' AND lg_FAMILLE_ID=`lgFAMILLEID`;
  IF(CheckExists>0)THEN 
	UPDATE t_famille SET int_ORERSTATUS = 3, b_CODEINDICATEUR =2 WHERE lg_FAMILLE_ID =`lgFAMILLEID` ;	
ELSE 
SELECT COUNT(*) INTO CheckExists FROM `t_order_detail` WHERE str_STATUT='is_Process' AND lg_FAMILLE_ID=`lgFAMILLEID`;
 IF(CheckExists>0)THEN 	
UPDATE t_famille SET int_ORERSTATUS = 2, b_CODEINDICATEUR =1 WHERE lg_FAMILLE_ID =`lgFAMILLEID` ;
ELSE
SELECT COUNT(*) INTO CheckExists FROM `t_order_detail` WHERE str_STATUT='ENTREE_STOCK' AND lg_FAMILLE_ID=`lgFAMILLEID`;
IF(CheckExists>1)THEN 	
UPDATE t_famille SET int_ORERSTATUS = 4, b_CODEINDICATEUR =2 WHERE lg_FAMILLE_ID =`lgFAMILLEID` ;
ELSE
SELECT COUNT(*) INTO CheckExists FROM `t_suggestion_order_details` WHERE str_STATUT='is_Process' AND lg_FAMILLE_ID=`lgFAMILLEID`;
IF(CheckExists>0)THEN 
UPDATE t_famille SET int_ORERSTATUS = 1, b_CODEINDICATEUR =1 WHERE lg_FAMILLE_ID =`lgFAMILLEID` ;
ELSE
UPDATE t_famille SET int_ORERSTATUS = 0, b_CODEINDICATEUR =0 WHERE lg_FAMILLE_ID =`lgFAMILLEID` ;
END IF;		
END IF;
END IF;	
END IF;	
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inentaireZZ
DELIMITER //
CREATE PROCEDURE `proc_inentaireZZ`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK INT(4);
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT i.`lg_FAMILLE_ID`,i.`int_NUMBER` FROM t_inventaire_famille i WHERE i.`lg_INVENTAIRE_ID`='71222209285695633601' AND 
i.`int_NUMBER` <> i.`int_NUMBER_INIT`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID,STOCK;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE t_famille_stock SET `int_NUMBER`=STOCK ,`int_NUMBER_AVAILABLE` =STOCK WHERE `lg_FAMILLE_ID`=LGFAMILLEID AND `lg_EMPLACEMENT_ID`='1' AND `str_STATUT`='enable';
SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inentaireZZZ
DELIMITER //
CREATE PROCEDURE `proc_inentaireZZZ`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK INT(4) DEFAULT 0;
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT i.`lg_FAMILLE_ID` FROM t_inventaire_famille i WHERE i.`lg_INVENTAIRE_ID`='71222209285695633601' AND 
i.`int_NUMBER` <> i.`int_NUMBER_INIT`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT SUM(d.`int_QTE_RECUE`) INTO STOCK FROM t_bon_livraison_detail d , t_bon_livraison b WHERE 
b.`lg_BON_LIVRAISON_ID`=d.`lg_BON_LIVRAISON_ID` AND b.`str_STATUT`='is_Closed' 
AND DATE(b.`dt_UPDATED`)>'2017-12-22' AND d.`lg_FAMILLE_ID`=LGFAMILLEID;
IF STOCK > 0 THEN
UPDATE t_famille_stock SET `int_NUMBER`=`int_NUMBER`+STOCK ,`int_NUMBER_AVAILABLE` =`int_NUMBER_AVAILABLE`+STOCK WHERE `lg_FAMILLE_ID`=LGFAMILLEID AND `lg_EMPLACEMENT_ID`='1' AND `str_STATUT`='enable';
SET NOMBRE=NOMBRE+1;
END IF;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inentaireZZZZ
DELIMITER //
CREATE PROCEDURE `proc_inentaireZZZZ`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK INT(4) DEFAULT 0;
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT i.`lg_FAMILLE_ID` FROM t_inventaire_famille i WHERE i.`lg_INVENTAIRE_ID`='71222209285695633601' AND 
i.`int_NUMBER` <> i.`int_NUMBER_INIT`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT SUM(d.`int_QUANTITY`) INTO STOCK FROM t_preenregistrement_detail d,t_preenregistrement p WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`
AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 AND p.`str_STATUT`='is_Closed' AND DATE(p.`dt_UPDATED`)>'2017-12-22' AND d.`lg_FAMILLE_ID`=LGFAMILLEID;
IF STOCK > 0 THEN
UPDATE t_famille_stock SET `int_NUMBER`=`int_NUMBER`-STOCK ,`int_NUMBER_AVAILABLE` =`int_NUMBER_AVAILABLE`-STOCK WHERE `lg_FAMILLE_ID`=LGFAMILLEID AND `lg_EMPLACEMENT_ID`='1' AND `str_STATUT`='enable';
SET NOMBRE=NOMBRE+1;
END IF;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_insert_product_in_snapshot_famillesell
DELIMITER //
CREATE PROCEDURE `proc_insert_product_in_snapshot_famillesell`(
        IN `lg_FAMILLE_ID` VARCHAR(40),
        IN `int_QUANTITY` INTEGER,
        IN `int_MONTH` INTEGER,
        IN `int_YEAR` INTEGER
    )
BEGIN
	IF int_MONTH = 1 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_JANUARY`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 2 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_FEBRUARY`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 3 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_MARCH`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 4 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_APRIL`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 5 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_MAY`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 6 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_JUNE`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 7 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_JULY`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 8 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_AUGUST`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 9 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_SEPTEMBER`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 10 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_OCTOBER`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 11 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_NOVEMBER`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	ELSEIF int_MONTH = 12 THEN
		INSERT INTO t_snapshot_famillesell (`int_NUMBER_DECEMBER`, `lg_FAMILLE_ID`, `int_YEAR`, `dt_CREATED`) 
		VALUES (int_QUANTITY, lg_FAMILLE_ID, int_YEAR, NOW());
	END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inventaire
DELIMITER //
CREATE PROCEDURE `proc_inventaire`(
    IN `LG_FAMILLE_ID` VARCHAR(50),
    IN `LG_EMPLACEMENT_ID` VARCHAR(50),
    IN `lg_GROSSISTE_ID` VARCHAR(50),
    IN `lg_FAMILLEARTICLE_ID` VARCHAR(50),
    IN `lg_TYPE_STOCK_ID` VARCHAR(50),
    IN `lg_ZONE_GEO_ID` VARCHAR(50),
    IN `lg_INVENTAIRE_ID` VARCHAR(50),
    IN `boolINVENTAIRE` INT,
    IN `stockFilter` VARCHAR(50),
    IN `stockProduit` int
)
BEGIN
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK NUMERIC(12);
DECLARE lgFAMILLESTOCKID VARCHAR(50);
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR
SELECT
  `t_famille`.`lg_FAMILLE_ID`,
  `t_famille_stock`.`int_NUMBER_AVAILABLE`,
  `t_famille_stock`.`lg_FAMILLE_STOCK_ID`
FROM
  `t_famille`
  INNER JOIN `t_famille_stock` ON (`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)
  INNER JOIN `t_famillearticle` ON (`t_famille`.`lg_FAMILLEARTICLE_ID` = `t_famillearticle`.`lg_FAMILLEARTICLE_ID`)
  INNER JOIN `t_zone_geographique` ON (`t_famille`.`lg_ZONE_GEO_ID` = `t_zone_geographique`.`lg_ZONE_GEO_ID`)
WHERE
  `t_famille_stock`.`lg_EMPLACEMENT_ID` = `LG_EMPLACEMENT_ID` AND
  `t_famille`.`lg_FAMILLE_ID` LIKE `LG_FAMILLE_ID` AND
  `t_famille`.`lg_FAMILLEARTICLE_ID` LIKE `lg_FAMILLEARTICLE_ID` AND
  `t_famille`.`str_STATUT` = 'enable' AND `t_zone_geographique`.`lg_ZONE_GEO_ID` LIKE `lg_ZONE_GEO_ID`
AND `t_famille`.`lg_GROSSISTE_ID` LIKE `lg_GROSSISTE_ID`

AND(
CASE `stockFilter`

WHEN 'LESS_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <=`stockProduit`

WHEN 'LESS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <`stockProduit`
WHEN 'GREATHER_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >=`stockProduit`
WHEN 'GREATHER' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >`stockProduit`
WHEN 'NOT_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` !=`stockProduit`
WHEN 'ALL' THEN 1
END)=1
GROUP BY
  t_famille.lg_FAMILLE_ID;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID,STOCK,lgFAMILLESTOCKID;
IF done=1 THEN
 LEAVE bl_loop;
 END IF;
INSERT INTO t_inventaire_famille
(`lg_INVENTAIRE_ID`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`str_STATUT`,`dt_CREATED`,`bool_INVENTAIRE`,`lg_FAMILLE_STOCK_ID`)
VALUES(`lg_INVENTAIRE_ID`,LGFAMILLEID,STOCK,STOCK,'enable',NOW(),`boolINVENTAIRE`,lgFAMILLESTOCKID);

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inventaire_famille_twocriteria
DELIMITER //
CREATE PROCEDURE `proc_inventaire_famille_twocriteria`(
	IN `FIRSTCRITERIA` VARCHAR(50),
	IN `SECONDCRITERIA` VARCHAR(50),
	IN `LG_EMPLACEMENT_ID` VARCHAR(50),
	IN `lg_TYPE_STOCK_ID` VARCHAR(50),
	IN `lg_INVENTAIRE_ID` VARCHAR(50),
IN `stockFilter` VARCHAR(50),
IN `stockProduit` int 
)
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK NUMERIC(12);
DECLARE lgFAMILLESTOCKID VARCHAR(50);
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT 
  `t_famille`.`lg_FAMILLE_ID`,
 
  `t_famille_stock`.`int_NUMBER_AVAILABLE`,
`t_famille_stock`.`lg_FAMILLE_STOCK_ID`
 
FROM
  `t_famille`
  INNER JOIN `t_famille_stock` ON (`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)
 
  INNER JOIN `t_famillearticle` ON (`t_famille`.`lg_FAMILLEARTICLE_ID` = `t_famillearticle`.`lg_FAMILLEARTICLE_ID`)
  
WHERE
  `t_famille_stock`.`lg_EMPLACEMENT_ID` = `LG_EMPLACEMENT_ID` AND 
  `t_famille`.`lg_FAMILLE_ID` LIKE `LG_FAMILLE_ID` AND 

  `t_famille`.`str_STATUT` = 'enable' AND `t_famillearticle`.`str_CODE_FAMILLE` >= `FIRSTCRITERIA` AND `t_famillearticle`.`str_CODE_FAMILLE` <= `SECONDCRITERIA`
AND(
CASE `stockFilter`

WHEN 'LESS_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <=`stockProduit`

WHEN 'LESS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <`stockProduit`
WHEN 'GREATHER_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >=`stockProduit`
WHEN 'GREATHER' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >`stockProduit`
WHEN 'NOT_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` !=`stockProduit`
WHEN 'ALL' THEN 1
END)=1

GROUP BY
  t_famille.lg_FAMILLE_ID;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID,STOCK,lgFAMILLESTOCKID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO t_inventaire_famille 
(`lg_INVENTAIRE_ID`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`str_STATUT`,`dt_CREATED`,`bool_INVENTAIRE`,`lg_FAMILLE_STOCK_ID`)
VALUES(`lg_INVENTAIRE_ID`,LGFAMILLEID,STOCK,STOCK,'enable',NOW(),1,lgFAMILLESTOCKID);

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inventaire_grossiste_twocriteria
DELIMITER //
CREATE PROCEDURE `proc_inventaire_grossiste_twocriteria`(
	IN `FIRSTCRITERIA` VARCHAR(50),
	IN `SECONDCRITERIA` VARCHAR(50),
	IN `LG_EMPLACEMENT_ID` VARCHAR(50),
	IN `lg_TYPE_STOCK_ID` VARCHAR(50),
	IN `lg_INVENTAIRE_ID` VARCHAR(50),
IN `lg_GROSSISTE_ID` VARCHAR(50),
IN `stockFilter` VARCHAR(50),
IN `stockProduit` int 
)
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK NUMERIC(12);
DECLARE lgFAMILLESTOCKID VARCHAR(50);
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT 
  `t_famille`.`lg_FAMILLE_ID`,
  `t_famille_stock`.`int_NUMBER_AVAILABLE`,
`t_famille_stock`.`lg_FAMILLE_STOCK_ID`
FROM
  `t_famille`
  INNER JOIN `t_famille_stock` ON (`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)
 
  INNER JOIN `t_grossiste` ON (`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`)
WHERE
  `t_famille_stock`.`lg_EMPLACEMENT_ID` =`LG_EMPLACEMENT_ID` AND `t_famille`.`lg_GROSSISTE_ID` LIKE `lg_GROSSISTE_ID` AND

  `t_famille`.`str_STATUT` = 'enable'  AND `t_grossiste`.`str_CODE`>=`FIRSTCRITERIA` AND `t_grossiste`.`str_CODE`<=`SECONDCRITERIA`

AND(
CASE `stockFilter`

WHEN 'LESS_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <=`stockProduit`

WHEN 'LESS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <`stockProduit`
WHEN 'GREATHER_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >=`stockProduit`
WHEN 'GREATHER' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >`stockProduit`
WHEN 'NOT_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` !=`stockProduit`
WHEN 'ALL' THEN 1
END)=1
GROUP BY
  t_famille.lg_FAMILLE_ID;
  

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID,STOCK,lgFAMILLESTOCKID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO t_inventaire_famille 
(`lg_INVENTAIRE_ID`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`str_STATUT`,`dt_CREATED`,`bool_INVENTAIRE`,`lg_FAMILLE_STOCK_ID`)
VALUES(`lg_INVENTAIRE_ID`,LGFAMILLEID,STOCK,STOCK,'enable',NOW(),1,lgFAMILLESTOCKID);

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_inventaire_zone_twocriteria
DELIMITER //
CREATE PROCEDURE `proc_inventaire_zone_twocriteria`(
	IN `FIRSTCRITERIA` VARCHAR(50),
	IN `SECONDCRITERIA` VARCHAR(50),
	IN `LG_EMPLACEMENT_ID` VARCHAR(50),
	IN `lg_TYPE_STOCK_ID` VARCHAR(50),
	IN `lg_INVENTAIRE_ID` VARCHAR(50),IN `stockFilter` VARCHAR(50),
IN `stockProduit` int 
)
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE STOCK NUMERIC(12);
DECLARE lgFAMILLESTOCKID VARCHAR(50);
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT 
  `t_famille`.`lg_FAMILLE_ID`,
  `t_famille_stock`.`int_NUMBER_AVAILABLE`,
`t_famille_stock`.`lg_FAMILLE_STOCK_ID`
FROM
  `t_famille`
  INNER JOIN `t_famille_stock` ON (`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)
  
   INNER JOIN `t_zone_geographique` ON (`t_famille`.`lg_ZONE_GEO_ID` = `t_zone_geographique`.`lg_ZONE_GEO_ID`)
WHERE
  `t_famille_stock`.`lg_EMPLACEMENT_ID` =`LG_EMPLACEMENT_ID` AND 
 
  `t_famille`.`str_STATUT` = 'enable'  AND `t_zone_geographique`.`str_CODE`  >= `FIRSTCRITERIA` AND `t_zone_geographique`.`str_CODE`  <= `SECONDCRITERIA`

AND(
CASE `stockFilter`

WHEN 'LESS_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <=`stockProduit`

WHEN 'LESS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` <`stockProduit`
WHEN 'GREATHER_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >=`stockProduit`
WHEN 'GREATHER' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` >`stockProduit`
WHEN 'NOT_EQUALS' THEN `t_famille_stock`.`int_NUMBER_AVAILABLE` !=`stockProduit`
WHEN 'ALL' THEN 1
END)=1

GROUP BY
  t_famille.lg_FAMILLE_ID;
  


DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID,STOCK,lgFAMILLESTOCKID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO t_inventaire_famille 
(`lg_INVENTAIRE_ID`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`str_STATUT`,`dt_CREATED`,`bool_INVENTAIRE`,`lg_FAMILLE_STOCK_ID`)
VALUES(`lg_INVENTAIRE_ID`,LGFAMILLEID,STOCK,STOCK,'enable',NOW(),1,lgFAMILLESTOCKID);

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_ligne_achat_transaction
DELIMITER //
CREATE PROCEDURE `proc_ligne_achat_transaction`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE lgGROSSISTEID VARCHAR(40);
DECLARE strREFLIVRAISON VARCHAR(40);
DECLARE lgBONLIVRAISONID VARCHAR(40);
DECLARE intMHT NUMERIC(10);
DECLARE intTVA NUMERIC(10);
DECLARE intHTTC NUMERIC(10);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT b.str_REF_LIVRAISON, b.lg_USER_ID, b.lg_BON_LIVRAISON_ID ,b.dt_UPDATED  ,o.lg_GROSSISTE_ID,
b.int_MHT,b.int_TVA,b.int_HTTC
 FROM  t_bon_livraison  b,t_order o where b.str_STATUT='is_closed' 
AND b.lg_ORDER_ID=o.lg_ORDER_ID and b.lg_BON_LIVRAISON_ID  NOT IN (SELECT m.pkey FROM mvttransaction  m );
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO strREFLIVRAISON,lgUSERID,lgBONLIVRAISONID,dtUPDATED,lgGROSSISTEID,intMHT,intTVA,intHTTC;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

INSERT INTO `mvttransaction` (`uuid`, `avoidAmount`, `categorie`, `checked`, `createdAt`, `marge`, `montant`, `montantCredit`, `montantNet`, `montantPaye`, `montantRegle`, `montantRemise`, `montantRestant`, `montantTva`, `montantVerse`, `mvtdate`, `pkey`, `reference`, `typeTransaction`, `caisse`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantAcc`, `margeug`, `montantttcug`, `montantnetug`, `montanttvaug`) 
	VALUES (UUID(), 0, 1, b'1', dtUPDATED, 0, intHTTC, 0, intMHT, 0, 0, 0, 0, intTVA, 0, dtUPDATED, lgBONLIVRAISONID, strREFLIVRAISON, 2, lgUSERID, lgGROSSISTEID, '1', NULL, NULL, lgUSERID, 0, 0, 0, 0, 0);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_ligne_resume_caisse
DELIMITER //
CREATE PROCEDURE `proc_ligne_resume_caisse`()
BEGIN
    DECLARE resume_caisse_id VARCHAR(100);
    DECLARE itemCount INT ;
   DECLARE type_ligne INT;
   DECLARE type_reglement_id VARCHAR(100);
    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
   SELECT distinct l.resume_caisse_id, COUNT(l.resume_caisse_id)-1 as itemCount,l.type_reglement_id,l.type_ligne FROM  ligne_resume_caisse l  JOIN t_resume_caisse r 
ON r.ld_CAISSE_ID=l.resume_caisse_id JOIN t_type_reglement m ON m.lg_TYPE_REGLEMENT_ID=l.type_reglement_id
GROUP BY l.resume_caisse_id,l.type_reglement_id,l.type_ligne HAVING COUNT(l.resume_caisse_id)>1;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO resume_caisse_id,itemCount,type_reglement_id,type_ligne;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

DELETE l FROM  ligne_resume_caisse l JOIN(SELECT r.id FROM ligne_resume_caisse r where r.resume_caisse_id=resume_caisse_id AND r.type_reglement_id=type_reglement_id AND 
r.type_ligne=type_ligne LIMIT itemCount) ll ON l.id=ll.id;
       
       
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_listAbandon
DELIMITER //
CREATE PROCEDURE `Proc_listAbandon`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN
 	SELECT 
	p.dt_CREATED as dt_date
	,DATE_FORMAT(p.dt_CREATED, '%H:%i:%s') as dt_heure
	,p.lg_PARENT_ID
	,u.str_LOGIN int_cod_op
	,f.int_CIP int_code_cip
	,pd.int_QUANTITY int_qte_D,pd.int_QUANTITY_SERVED int_qte_S
	,f.int_PAT int_prix_unit
	 ,pd.int_PRICE int_prix_vente
	 ,f.str_NAME
	FROM t_preenregistrement p 
	JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PARENT_ID
	JOIN t_famille f ON f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID
	JOIN t_user u on u.lg_USER_ID = p.lg_USER_ID
	where p.lg_PARENT_ID IS NOT NULL AND p.dt_CREATED BETWEEN periode_deb AND periode_fin;
 END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_listCaisse
DELIMITER //
CREATE PROCEDURE `Proc_listCaisse`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN

CREATE TEMPORARY TABLE Temp_listeDeCaisse 
	(dt_CREATED DATETIME  NULL
     , str_reference VARCHAR(40) NULL
     , str_code_op VARCHAR(40) NULL
     , str_operateur_id VARCHAR(40) NULL
     , dt_heure VARCHAR(40) NULL
     , str_nom_libelle VARCHAR(40) NULL
     , int_prince_espece INTEGER(40) NULL
     , int_prince_cheq INTEGER(40) NULL
     , int_prince_cart_banq INTEGER(40) NULL
     , int_prince_devise INTEGER(40) NULL
     , int_prince_viremt INTEGER(40) NULL
     , int_prince_differe INTEGER(40) NULL
     , int_prince_tp INTEGER(40) NULL
     , int_prince_cpt_clt INTEGER(40) NULL
     , int_prince_acompte INTEGER(40) NULL
     ,str_type_op_caisse VARCHAR(40) NULL);

INSERT INTO Temp_listeDeCaisse
(SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED,
p.str_REF as str_reference
,u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id
,DATE_FORMAT(p.dt_CREATED, '%H:%i:%s') as dt_heure
,CONCAT(CONCAT(cl.str_LAST_NAME ,' ') ,cl.str_FIRST_NAME) as str_nom_libelle
,p.int_PRICE int_prince_espece,0,0,0,0,0
,pcl.int_PRICE dbl_part_clt
,ptp.int_PRICE dbl_part_tp,0
,CASE WHEN p.lg_TYPE_VENTE_ID = 1 THEN "Nord" ELSE "Ord" END str_type_op_caisse
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
JOIN t_user u on u.lg_USER_ID = p.lg_USER_ID
JOIN t_type_vente tv on tv.lg_TYPE_VENTE_ID = p.lg_TYPE_VENTE_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_compte_client ccl on ccl.lg_COMPTE_CLIENT_ID = pcl.lg_COMPTE_CLIENT_ID
LEFT JOIN t_client cl on cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL AND tr.lg_TYPE_REGLEMENT_ID = 1 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin);



INSERT INTO Temp_listeDeCaisse
(SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED,
p.str_REF as str_reference
,u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id,
DATE_FORMAT(p.dt_CREATED, '%H:%i:%s') as dt_heure
,CONCAT(CONCAT(cl.str_LAST_NAME ,' ') ,cl.str_FIRST_NAME) as str_nom_libelle
,0,p.int_PRICE int_prince_cheq,0,0,0,0
,pcl.int_PRICE dbl_part_clt
,ptp.int_PRICE dbl_part_tp,0
,CASE WHEN p.lg_TYPE_VENTE_ID = 1 THEN "Nord" ELSE "Ord" END str_type_op_caisse
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
JOIN t_user u on u.lg_USER_ID = p.lg_USER_ID
JOIN t_type_vente tv on tv.lg_TYPE_VENTE_ID = p.lg_TYPE_VENTE_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_compte_client ccl on ccl.lg_COMPTE_CLIENT_ID = pcl.lg_COMPTE_CLIENT_ID
LEFT JOIN t_client cl on cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL AND tr.lg_TYPE_REGLEMENT_ID = 2 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin);



INSERT INTO Temp_listeDeCaisse
(SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED,
p.str_REF as str_reference
,u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id,
DATE_FORMAT(p.dt_CREATED, '%H:%i:%s') as dt_heure
,CONCAT(CONCAT(cl.str_LAST_NAME,' ') ,cl.str_FIRST_NAME) as str_nom_libelle
,0,0,0,p.int_PRICE int_prince_devise,0,0
,pcl.int_PRICE dbl_part_clt
,ptp.int_PRICE dbl_part_tp,0
,CASE WHEN p.lg_TYPE_VENTE_ID = 1 THEN "Nord" ELSE "Ord" END str_type_op_caisse
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
JOIN t_user u on u.lg_USER_ID = p.lg_USER_ID
JOIN t_type_vente tv on tv.lg_TYPE_VENTE_ID = p.lg_TYPE_VENTE_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_compte_client ccl on ccl.lg_COMPTE_CLIENT_ID = pcl.lg_COMPTE_CLIENT_ID
LEFT JOIN t_client cl on cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL AND tr.lg_TYPE_REGLEMENT_ID = 5 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin);


INSERT INTO Temp_listeDeCaisse
(SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED,
p.str_REF as str_reference
,u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id,
DATE_FORMAT(p.dt_CREATED, '%H:%i:%s') as dt_heure
,CONCAT(CONCAT(cl.str_LAST_NAME," ") ,cl.str_FIRST_NAME) as str_nom_libelle
,0,0,p.int_PRICE int_prince_cart_banq,0,0,0
,pcl.int_PRICE dbl_part_clt
,ptp.int_PRICE dbl_part_tp,0
,CASE WHEN p.lg_TYPE_VENTE_ID = 1 THEN "Nord" ELSE "Ord" END str_type_op_caisse
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
JOIN t_user u on u.lg_USER_ID = p.lg_USER_ID
JOIN t_type_vente tv on tv.lg_TYPE_VENTE_ID = p.lg_TYPE_VENTE_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_compte_client ccl on ccl.lg_COMPTE_CLIENT_ID = pcl.lg_COMPTE_CLIENT_ID
LEFT JOIN t_client cl on cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL AND tr.lg_TYPE_REGLEMENT_ID = 3 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin);



INSERT INTO Temp_listeDeCaisse
(SELECT 
DATE(DATE_FORMAT(p.dt_CREATED, '%Y-%m-%d')) as dt_CREATED,
p.str_REF as str_reference
,u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id,
DATE_FORMAT(p.dt_CREATED, '%H:%i:%s') as dt_heure
,CONCAT(CONCAT(cl.str_LAST_NAME," ") ,cl.str_FIRST_NAME) as str_nom_libelle
,0,0,0
,0,0
,p.int_PRICE int_prince_differe
,pcl.int_PRICE dbl_part_clt
,ptp.int_PRICE dbl_part_tp,0
,CASE WHEN p.lg_TYPE_VENTE_ID = 1 THEN "Nord" ELSE "Ord" END str_type_op_caisse
FROM t_preenregistrement p
JOIN t_reglement r on r.lg_REGLEMENT_ID = p.lg_REGLEMENT_ID
JOIN t_mode_reglement mr on mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID
JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID
JOIN t_user u on u.lg_USER_ID = p.lg_USER_ID
JOIN t_type_vente tv on tv.lg_TYPE_VENTE_ID = p.lg_TYPE_VENTE_ID
LEFT JOIN t_preenregistrement_compte_client pcl ON pcl.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
LEFT JOIN t_compte_client ccl on ccl.lg_COMPTE_CLIENT_ID = pcl.lg_COMPTE_CLIENT_ID
LEFT JOIN t_client cl on cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
LEFT JOIN t_preenregistrement_compte_client_tiers_payent ptp on ptp.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.lg_PARENT_ID IS NULL AND tr.lg_TYPE_REGLEMENT_ID = 4 AND p.dt_CREATED BETWEEN periode_deb AND periode_fin);


INSERT INTO Temp_listeDeCaisse
(select
DATE(DATE_FORMAT(rc.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
 ,rc.ld_CAISSE_ID str_reference
 , u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id
 ,DATE_FORMAT(rc.dt_CREATED, '%H:%i:%s') as dt_heure,
 CONCAT("Fond de caisse : ",DATE(DATE_FORMAT(rc.dt_CREATED, '%Y-%m-%d'))),
 int_SOLDE_MATIN int_prince_espece,
 0,0,0,0,0,0,0,0
 ,"fondCaisse" str_type_op_caisse
 FROM t_resume_caisse rc
 JOIN t_user u on u.lg_USER_ID = rc.lg_USER_ID
 WHERE rc.dt_CREATED BETWEEN periode_deb AND periode_fin);



INSERT INTO Temp_listeDeCaisse
(select 
DATE(DATE_FORMAT(mc.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
 ,mc.lg_MVT_CAISSE_ID str_reference
 , u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id
 ,DATE_FORMAT(mc.dt_CREATED, '%H:%i:%s') as dt_heure,
 "Sortie de caisse",
 mc.int_AMOUNT,0,0,0,0,0,0,0,0
 ,"sortieCaisse" str_type_op_caisse
FROM t_mvt_caisse mc
JOIN t_type_mvt_caisse tm on tm.lg_TYPE_MVT_CAISSE_ID = mc.lg_TYPE_MVT_CAISSE_ID
JOIN t_user u on u.lg_USER_ID = mc.lg_USER_ID
WHERE mc.lg_TYPE_MVT_CAISSE_ID = 2 AND mc.dt_CREATED BETWEEN periode_deb AND periode_fin);


INSERT INTO Temp_listeDeCaisse
(
select 
DATE(DATE_FORMAT(mc.dt_CREATED, '%Y-%m-%d')) as dt_CREATED
 ,mc.lg_MVT_CAISSE_ID str_reference
 , u.str_LOGIN str_code_op,u.lg_USER_ID str_operateur_id
 ,DATE_FORMAT(mc.dt_CREATED, '%H:%i:%s') as dt_heure,
 "Entree de caisse",
 mc.int_AMOUNT,0,0,0,0,0,0,0,0
 ,"EntreeCaisse" str_type_op_caisse
FROM t_mvt_caisse mc
JOIN t_type_mvt_caisse tm on tm.lg_TYPE_MVT_CAISSE_ID = mc.lg_TYPE_MVT_CAISSE_ID
JOIN t_user u on u.lg_USER_ID = mc.lg_USER_ID
WHERE mc.lg_TYPE_MVT_CAISSE_ID = 1 AND mc.dt_CREATED BETWEEN periode_deb AND periode_fin);

SELECT * FROM Temp_listeDeCaisse
ORDER BY str_operateur_id,str_type_op_caisse DESC;

 	END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_load_vente_famille
DELIMITER //
CREATE PROCEDURE `proc_load_vente_famille`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(40);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.lg_FAMILLE_ID FROM t_famille t ORDER BY t.dt_CREATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
 CALL proc_update_snapshot_famillesell(LGFAMILLEID);
 
END LOOP bl_loop;
 CLOSE curbl;

COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_logfile
DELIMITER //
CREATE PROCEDURE `proc_logfile`(
        IN `lg_EVENT_LOG_ID` VARCHAR(40),
        IN `MATRICULE_ELEVE` VARCHAR(40),
        IN `str_DESCRIPTION` VARCHAR(254),
        IN `str_TABLE_CONCERN` VARCHAR(20),
        IN `str_MODULE_CONCERN` VARCHAR(40),
        IN `str_CREATED_BY` VARCHAR(100),
        IN `str_STATUT` VARCHAR(40),
        IN `str_TYPE_LOG` VARCHAR(254),
        IN `lg_USER_ID` VARCHAR(40)
    )
BEGIN

INSERT INTO `t_event_log` (`lg_EVENT_LOG_ID`,

  `str_DESCRIPTION`, `str_CREATED_BY`, `str_STATUT`, `str_TABLE_CONCERN`,

  `str_MODULE_CONCERN`,str_TYPE_LOG,lg_USER_ID) VALUES

  (lg_EVENT_LOG_ID, str_DESCRIPTION, str_CREATED_BY,

  str_TABLE_CONCERN, str_MODULE_CONCERN,str_STATUT,str_TYPE_LOG,lg_USER_ID);

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_migrer_regl_tiers_payant_mvtransaction
DELIMITER //
CREATE PROCEDURE `proc_migrer_regl_tiers_payant_mvtransaction`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE ORGANISMEID VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE lgTYPEVENTEID VARCHAR(40);
DECLARE lgTYPEREGLEMENTID VARCHAR(40);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE EMPLACEMENT VARCHAR(40);
DECLARE intPRICE NUMERIC(10);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT distinct d.lg_DOSSIER_REGLEMENT_ID,tr.lg_TYPE_REGLEMENT_ID,d.dbl_AMOUNT,d.str_ORGANISME_ID,d.dt_CREATED,d.lg_USER_ID,mv.str_REF_TICKET FROM t_dossier_reglement d,t_reglement r, t_mode_reglement m,t_type_reglement tr, t_type_mvt_caisse tm, t_mvt_caisse mv

where d.lg_DOSSIER_REGLEMENT_ID=r.str_REF_RESSOURCE AND r.lg_MODE_REGLEMENT_ID=m.lg_MODE_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID=m.lg_TYPE_REGLEMENT_ID
AND tm.lg_TYPE_MVT_CAISSE_ID=mv.lg_TYPE_MVT_CAISSE_ID AND m.lg_MODE_REGLEMENT_ID=mv.lg_MODE_REGLEMENT_ID 
AND tm.lg_TYPE_MVT_CAISSE_ID='3' AND d.lg_DOSSIER_REGLEMENT_ID NOT IN (SELECT h.pkey FROM mvttransaction h);
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,lgTYPEREGLEMENTID,intPRICE,ORGANISMEID,dtUPDATED,lgUSERID,strREF;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT IGNORE INTO mvttransaction (uuid, `avoidAmount`, categorie, `checked`, `createdAt`, marge, montant, `montantCredit`, `montantNet`, `montantPaye`, `montantRegle`, `montantRemise`, `montantRestant`, `montantTva`, `montantVerse`, mvtdate, pkey, reference, `typeTransaction`, caisse, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, organisme, `montantAcc`, margeug, montantttcug, montantnetug, montanttvaug) 
	VALUES (UUID(), 0, 1, true, dtUPDATED, 0, intPRICE, 0, intPRICE, intPRICE, intPRICE, 0, 0, 0, intPRICE, dtUPDATED, lgPREENREGISTREMENTID, strREF, 3, lgUSERID, NULL, '1', lgTYPEREGLEMENTID, '3', lgUSERID, NULL, 0, 0, 0, 0, 0);
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_migrer_vente_mvtransaction
DELIMITER //
CREATE PROCEDURE `proc_migrer_vente_mvtransaction`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE VENDEUR VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE lgTYPEVENTEID VARCHAR(40);
DECLARE lgTYPEREGLEMENTID VARCHAR(40);
DECLARE typeMvt VARCHAR(10);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE EMPLACEMENT VARCHAR(40);
DECLARE intPRICE NUMERIC(10);
DECLARE MONTANTPAYE NUMERIC(10);
DECLARE MONTANTRECU NUMERIC(10);
DECLARE MONTANTCREDIT NUMERIC(10);
DECLARE intPRICEREMISE NUMERIC(10);
DECLARE intCUSTPART NUMERIC(10);
DECLARE categorie INT(1) DEFAULT 1;
DECLARE typetransac INT(1);
DECLARE lgCLIENTID VARCHAR(40);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT distinct p.lg_PREENREGISTREMENT_ID,p.int_PRICE,p.int_PRICE_REMISE,p.int_CUST_PART,p.lg_TYPE_VENTE_ID,p.lg_USER_ID,p.lg_USER_VENDEUR_ID
,p.dt_UPDATED,p.str_REF,e.lg_EMPLACEMENT_ID,p.lg_CLIENT_ID
 FROM t_preenregistrement p,t_user u,t_emplacement e WHERE p.str_STATUT ='is_Closed' AND p.b_IS_CANCEL=FALSE AND p.int_PRICE >0 
  AND p.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=e.lg_EMPLACEMENT_ID AND (p.lg_TYPE_VENTE_ID ='2' OR '3') AND p.lg_PREENREGISTREMENT_ID NOT IN ( SELECT m.pkey FROM mvttransaction m) ;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,intPRICE,intPRICEREMISE,intCUSTPART,lgTYPEVENTEID,lgUSERID,VENDEUR,dtUPDATED,strREF,EMPLACEMENT,lgCLIENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
IF lgTYPEVENTEID ='1' || lgTYPEVENTEID='4' THEN 
SET typetransac=0;
SET typeMvt='9';
SET MONTANTCREDIT=0;
ELSE
SET typetransac=1;
SET typeMvt='8';
SET MONTANTCREDIT=intPRICE-(intCUSTPART-intPRICEREMISE);
IF lgTYPEVENTEID='3' THEN
SET MONTANTPAYE=0;
SET MONTANTRECU=0;
SET MONTANTCREDIT=intPRICE-intPRICEREMISE;
END IF;
END IF;

INSERT IGNORE INTO mvttransaction (uuid, `createdAt`, `MONTANT`, `MONTANTCREDIT`, `MONTANTREGLE`, `MONTANTRESTANT`, mvtdate, caisse, `typeTransaction`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantRemise`, `montantNet`, `MONTANTVERSE`, pkey, categorie, `avoidAmount`, `checked`, `montantPaye`, `montantTva`, marge, reference, organisme) 
	VALUES (UUID(), dtUPDATED, intPRICE, MONTANTCREDIT, intCUSTPART, 0, dtUPDATED, lgUSERID, typetransac, NULL, EMPLACEMENT, '1', typeMvt, lgUSERID, intPRICEREMISE, intPRICE-intPRICEREMISE, intCUSTPART, lgPREENREGISTREMENTID, 1, 0, true, intCUSTPART, 0, 0, strREF, lgCLIENTID);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_migrer_vente_sup_mvtransaction
DELIMITER //
CREATE PROCEDURE `proc_migrer_vente_sup_mvtransaction`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE VENDEUR VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE lgTYPEVENTEID VARCHAR(40);
DECLARE lgTYPEREGLEMENTID VARCHAR(40);
DECLARE typeMvt VARCHAR(10);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE EMPLACEMENT VARCHAR(40);
DECLARE intPRICE NUMERIC(10);
DECLARE MONTANTPAYE NUMERIC(10);
DECLARE MONTANTRECU NUMERIC(10);
DECLARE MONTANTCREDIT NUMERIC(10);
DECLARE intPRICEREMISE NUMERIC(10);
DECLARE intCUSTPART NUMERIC(10);
DECLARE categorie INT(1) DEFAULT 1;
DECLARE typetransac INT(1);
DECLARE lgCLIENTID VARCHAR(40);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT distinct p.lg_PREENREGISTREMENT_ID,p.int_PRICE,p.int_PRICE_REMISE,p.int_CUST_PART,p.lg_TYPE_VENTE_ID,p.lg_USER_ID,p.lg_USER_VENDEUR_ID
,p.dt_UPDATED,p.str_REF,e.lg_EMPLACEMENT_ID,p.lg_CLIENT_ID
 FROM t_preenregistrement p,t_user u,t_emplacement e WHERE p.str_STATUT ='is_Closed' AND p.b_IS_CANCEL=FALSE AND p.int_PRICE <0 
  AND p.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=e.lg_EMPLACEMENT_ID AND (p.lg_TYPE_VENTE_ID ='2' OR '3') AND p.lg_PREENREGISTREMENT_ID NOT IN ( SELECT m.pkey FROM mvttransaction m) ;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,intPRICE,intPRICEREMISE,intCUSTPART,lgTYPEVENTEID,lgUSERID,VENDEUR,dtUPDATED,strREF,EMPLACEMENT,lgCLIENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
IF lgTYPEVENTEID ='1' || lgTYPEVENTEID='4' THEN 
SET typetransac=0;
SET typeMvt='9';
SET MONTANTCREDIT=0;
ELSE
SET typetransac=1;
SET typeMvt='8';
SET MONTANTCREDIT=intPRICE-(intCUSTPART-intPRICEREMISE);
IF lgTYPEVENTEID='3' THEN
SET MONTANTPAYE=0;
SET MONTANTRECU=0;
SET MONTANTCREDIT=intPRICE-intPRICEREMISE;
END IF;
END IF;

INSERT IGNORE INTO mvttransaction (uuid, `createdAt`, `MONTANT`, `MONTANTCREDIT`, `MONTANTREGLE`, `MONTANTRESTANT`, mvtdate, caisse, `typeTransaction`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantRemise`, `montantNet`, `MONTANTVERSE`, pkey, categorie, `avoidAmount`, `checked`, `montantPaye`, `montantTva`, marge, reference, organisme) 
	VALUES (UUID(), dtUPDATED, intPRICE, MONTANTCREDIT, intCUSTPART, 0, dtUPDATED, lgUSERID, typetransac, NULL, EMPLACEMENT, '1', typeMvt, lgUSERID, intPRICEREMISE, intPRICE-intPRICEREMISE, intCUSTPART, lgPREENREGISTREMENTID, 1, 0, true, intCUSTPART, 0, 0, strREF, lgCLIENTID);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_misenumayant_droit
DELIMITER //
CREATE PROCEDURE `proc_misenumayant_droit`()
BEGIN 
DECLARE AYANTID VARCHAR(100);
DECLARE NUMEROCLIENT VARCHAR(250);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT a.lg_AYANTS_DROITS_ID AS AYANTID, c.str_NUMERO_SECURITE_SOCIAL AS NUMEROCLIENT
 FROM t_client c, t_ayant_droit a WHERE c.lg_CLIENT_ID=a.lg_CLIENT_ID
AND c.str_NUMERO_SECURITE_SOCIAL<> a.str_NUMERO_SECURITE_SOCIAL AND c.str_FIRST_NAME=a.str_FIRST_NAME AND c.str_LAST_NAME=a.str_LAST_NAME
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO AYANTID,NUMEROCLIENT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE t_ayant_droit a SET a.str_NUMERO_SECURITE_SOCIAL=NUMEROCLIENT WHERE a.lg_AYANTS_DROITS_ID=AYANTID ; 

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_mouvement
DELIMITER //
CREATE PROCEDURE `proc_mouvement`(IN qtyVendu int, IN idFAMILLE varchar(20), IN idEmplacement varchar(20),
                                IN idUSER   varchar(20), IN idVENTE varchar(20))
BEGIN
declare nbligne int default 0;
DECLARE compteur int(8) DEFAULT 0;
UPDATE  t_mouvement set int_NUMBERTRANSACTION=int_NUMBERTRANSACTION+1, int_NUMBER=int_NUMBER+qtyVendu,dt_UPDATED=now()
WHERE date(dt_DAY) =current_date()  AND lg_FAMILLE_ID=`idFAMILLE` AND str_TYPE_ACTION='REMOVE' AND str_ACTION='VENTE'
AND  lg_EMPLACEMENT_ID=idEmplacement;
 
SELECT row_count() into nbligne;
IF nbligne=0 then
INSERT INTO t_mouvement (lg_MOUVEMENT_ID,lg_FAMILLE_ID,lg_USER_ID,P_KEY,str_TYPE_ACTION,str_ACTION,dt_DAY,dt_CREATED,dt_UPDATED,str_STATUT,int_NUMBER,int_NUMBERTRANSACTION,lg_EMPLACEMENT_ID)
VALUES(REPLACE(UUID(),'-',''),idFAMILLE,idUSER,'','REMOVE','VENTE',current_date() ,now(),now(),'enable',qtyVendu,1,idEmplacement);
END IF ;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_mvt_snap
DELIMITER //
CREATE PROCEDURE `proc_mvt_snap`(
        IN `qty` INTEGER,
        IN `idFAMILLE` VARCHAR(20),
        IN `lgEMPLACEMENTID` VARCHAR(20),
        IN `idVENTE` VARCHAR(20)
    )
BEGIN
declare nbligne int default 0;

DECLARE qtyStock int(8);
UPDATE t_mouvement_snapshot set int_NUMBERTRANSACTION=int_NUMBERTRANSACTION+1, int_STOCK_JOUR=int_STOCK_JOUR-qty,dt_UPDATED=now()
WHERE date(dt_DAY) =current_date() AND lg_EMPLACEMENT_ID=lgEMPLACEMENTID AND lg_FAMILLE_ID=idFAMILLE ;

SELECT row_count() into nbligne;

IF nbligne=0 then 
SELECT 
 `t_famille_stock`.`int_NUMBER_AVAILABLE` INTO qtyStock
 
FROM
 `t_famille_stock`
WHERE
 `lg_FAMILLE_ID` = idFAMILLE AND lg_EMPLACEMENT_ID=lgEMPLACEMENTID AND str_STATUT='enable' limit 0,1;
INSERT INTO t_mouvement_snapshot (lg_MOUVEMENT_SNAPSHOT_ID,lg_FAMILLE_ID,dt_DAY,dt_CREATED,dt_UPDATED,str_STATUT,int_STOCK_JOUR,int_STOCK_DEBUT,int_NUMBERTRANSACTION,lg_EMPLACEMENT_ID)
VALUES(REPLACE(UUID(),'-',''),idFAMILLE,current_date() ,now(),now(),'enable',qtyStock-`qty`,qtyStock,1,lgEMPLACEMENTID);
END IF ;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_mvt_snap_depot
DELIMITER //
CREATE PROCEDURE `proc_mvt_snap_depot`(
        IN `qty` INTEGER,
        IN `idFAMILLE` VARCHAR(20),
        IN `lgEMPLACEMENTID` VARCHAR(20),
        IN `idVENTE` VARCHAR(20)
    )
BEGIN
declare nbligne int default 0;

DECLARE qtyStock int(8);
UPDATE t_mouvement_snapshot set int_NUMBERTRANSACTION=int_NUMBERTRANSACTION+1, int_STOCK_JOUR=int_STOCK_JOUR-qty,dt_UPDATED=now()
WHERE date(dt_DAY) =current_date() AND lg_EMPLACEMENT_ID=lgEMPLACEMENTID AND lg_FAMILLE_ID=idFAMILLE ;

SELECT row_count() into nbligne;

IF nbligne=0 then 
SELECT 
  `t_famille_stock`.`int_NUMBER_AVAILABLE` INTO qtyStock
 
FROM
 `t_famille_stock`
WHERE
 `lg_FAMILLE_ID` = idFAMILLE AND lg_EMPLACEMENT_ID=lgEMPLACEMENTID AND str_STATUT='enable' limit 0,1;
INSERT INTO t_mouvement_snapshot (lg_MOUVEMENT_SNAPSHOT_ID,lg_FAMILLE_ID,dt_DAY,dt_CREATED,dt_UPDATED,str_STATUT,int_STOCK_JOUR,int_STOCK_DEBUT,int_NUMBERTRANSACTION,lg_EMPLACEMENT_ID)
VALUES(REPLACE(UUID(),'-',''),idFAMILLE,current_date() ,now(),now(),'enable',qtyStock-`qty`,qtyStock,1,lgEMPLACEMENTID);
END IF ;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_mvtTicketZ
DELIMITER //
CREATE PROCEDURE `proc_mvtTicketZ`(
        IN `LGUSERID` VARCHAR(40),
        IN `DTOPERATION` DATE,
        OUT `ENTRESP` INTEGER(11),
        OUT `ENTRECH` INTEGER(11),
        OUT `ENTRECB` INTEGER(11),
        OUT `ENTREVIR` INTEGER(11),
        OUT `REGLTPESP` INTEGER(11),
        OUT `REGLTPCH` INTEGER(11),
        OUT `REGLTPCB` INTEGER(11),
        OUT `REGLTPVIR` INTEGER(11),
        OUT `SORTIEESP` INTEGER(11),
        OUT `SORTIECH` INTEGER(11),
        OUT `SORTIECB` INTEGER(11),
        OUT `SORTIEVIR` INTEGER(11)
    )
BEGIN

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO ENTRESP
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '2' OR 
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '5') AND 
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '1'  AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;


SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO ENTRECH
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '2' OR 
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '5') AND 
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '2' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO ENTRECB
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '2' OR 
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '5') AND 
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '3' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO ENTREVIR
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '2' OR 
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '5') AND 
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '6' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;



SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO REGLTPESP
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '3' AND
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '1'  AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;


SELECT 
 SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO REGLTPCH
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
 `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '3' AND
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '2' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO REGLTPCB
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '3' AND
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '3' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO REGLTPVIR
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '3' AND
  
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '6' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;





SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO SORTIEESP
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '4' AND
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '1'  AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;


SELECT 
 SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO SORTIECH
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
 `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '4' AND
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '2' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO SORTIECB
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '4' AND
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '3' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

SELECT 
  SUM(`t_mvt_caisse`.`int_AMOUNT`) INTO SORTIEVIR
FROM
  `t_mvt_caisse`
  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`)
  INNER JOIN `t_mode_reglement` ON (`t_mvt_caisse`.`lg_MODE_REGLEMENT_ID` = `t_mode_reglement`.`lg_MODE_REGLEMENT_ID`)
  INNER JOIN `t_type_reglement` ON (`t_mode_reglement`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)
WHERE
  `t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '4' AND
  
  `t_type_reglement`.`lg_TYPE_REGLEMENT_ID` = '6' AND `t_mvt_caisse`.`lg_USER_ID`=LGUSERID AND DATE( `t_mvt_caisse`.`dt_CREATED`) =DTOPERATION;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_pharmacistsdashboard
DELIMITER //
CREATE PROCEDURE `proc_pharmacistsdashboard`(IN dt_start date, IN dt_end date)
BEGIN 
DECLARE DATEOPERATION DATE;
DECLARE CACOMPTANT NUMERIC(15);
DECLARE CACOMPTANTOTHER NUMERIC(15);
DECLARE MVTFALSE NUMERIC(15);
DECLARE CACREDIT NUMERIC(15);
DECLARE CAREMISE NUMERIC(12);
DECLARE NOMBRE NUMERIC(8);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT COUNT(o.`lg_PREENREGISTREMENT_ID`) AS NOMBRE,DATE(o.`dt_UPDATED`)AS DATEOPERATION,
SUM(CASE WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VNO')  
THEN (o.`int_PRICE_OTHER`)  WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VO') THEN (o.`int_CUST_PART`)
WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' ) THEN (SELECT e.`int_PRICE` FROM t_preenregistrement_compte_client e WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
 ELSE 0 END) AS CACOMPTANT,
SUM(CASE 
	WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VNO')  
		THEN (o.`int_PRICE_OTHER`)  
	WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VO') 
		THEN (o.`int_CUST_PART`)
	WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' ) 
		THEN (SELECT e.`int_PRICE` FROM t_preenregistrement_compte_client e 
		WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
 	ELSE 0 END) AS CACOMPTANTOTHER,
SUM(CASE WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VO')  
THEN (o.`int_PRICE`-o.`int_CUST_PART`)  
WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' AND o.`str_TYPE_VENTE`='VNO' ) THEN 
(SELECT e.`int_PRICE_RESTE` FROM t_preenregistrement_compte_client e WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
 WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' AND o.`str_TYPE_VENTE`='VO' ) 
THEN (SELECT (o.`int_PRICE`-o.`int_CUST_PART`+e.`int_PRICE_RESTE`) 
FROM t_preenregistrement_compte_client e WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
ELSE 0 END) AS CACREDIT,
SUM(o.`int_PRICE_REMISE`) AS CAREMISE,
(SELECT CASE WHEN SUM(t.int_AMOUNT) IS NOT NULL THEN SUM(t.int_AMOUNT) ELSE 0 END FROM t_mvt_caisse t WHERE DATE(t.dt_DATE_MVT) = DATE(o.`dt_CREATED`) AND t.bool_CHECKED = false) AS MVTFALSE
FROM t_preenregistrement o WHERE o.`b_IS_CANCEL`=0 AND o.`str_STATUT`='is_Closed' AND o.`int_PRICE`>0 
AND DATE(o.`dt_UPDATED`)>=DATE(`dt_start`) AND DATE(o.`dt_UPDATED`)<=DATE(dt_end) AND o.lg_TYPE_VENTE_ID <> '5' 
GROUP BY DATE(o.`dt_UPDATED`);
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_tableaupharmacien_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_tableaupharmacien_table
(
f_DATEOPERATION DATE PRIMARY KEY,
f_CACOMPTANT NUMERIC(15) DEFAULT 0,
f_CACOMPTANTOTHER NUMERIC(15) DEFAULT 0,
f_CACREDIT NUMERIC(15) DEFAULT 0,
f_MVTFALSE NUMERIC(15) DEFAULT 0,
f_CAREMISE NUMERIC(12) DEFAULT 0,
f_NOMBRE NUMERIC(8)DEFAULT 0,
f_ACHATLABOREX NUMERIC(15) DEFAULT 0,
f_ACHATDPCI NUMERIC(15) DEFAULT 0,
f_ACHATCOPHARMED NUMERIC(15) DEFAULT 0,
f_ACHATTEDISPHARMA NUMERIC(15) DEFAULT 0,
f_ACHATAUTRES NUMERIC(15) DEFAULT 0,
f_VALEURACHAT NUMERIC(15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO NOMBRE,DATEOPERATION,CACOMPTANT,CACOMPTANTOTHER,CACREDIT,CAREMISE,MVTFALSE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_tableaupharmacien_table (f_DATEOPERATION,f_CACOMPTANT,f_CACOMPTANTOTHER,f_CACREDIT,f_CAREMISE,f_NOMBRE,f_MVTFALSE)
 VALUES (DATEOPERATION,CACOMPTANT,CACOMPTANTOTHER,CACREDIT,CAREMISE,NOMBRE,MVTFALSE);
END LOOP bl_loop;
 CLOSE curbl;
CALL proc_tableaupharmacieannulation(dt_start,dt_end);
CALL proc_tableaupharmacienachat(dt_start,dt_end);
CALL proc_tableaupharmacienavoir(dt_start,dt_end);
SELECT DATE_FORMAT(f_DATEOPERATION,'%d/%m/%Y')AS f_DATEOPERATIONFORMAT,f_CACOMPTANT,f_CACREDIT,f_CAREMISE,((f_CACOMPTANT+f_CACREDIT) - f_CAREMISE) AS CANET,f_NOMBRE,f_ACHATLABOREX,f_ACHATDPCI,f_ACHATCOPHARMED,f_ACHATTEDISPHARMA,f_ACHATAUTRES,f_VALEURACHAT,((f_ACHATLABOREX+f_ACHATDPCI+f_ACHATCOPHARMED+f_ACHATTEDISPHARMA+f_ACHATAUTRES)-f_VALEURACHAT) AS ACHATNETS,f_CACOMPTANTOTHER,f_MVTFALSE,((f_CACOMPTANTOTHER+f_CACREDIT) - f_CAREMISE) AS CANETOTHER
FROM emp_tableaupharmacien_table 
ORDER BY f_DATEOPERATION;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populateavoirclientdata
DELIMITER //
CREATE PROCEDURE `proc_populateavoirclientdata`()
BEGIN 
DECLARE MOIS VARCHAR(2);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT o.VALEUR FROM tmp_updateventetable o;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MOIS;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
CALL proc_clientavoirdata(MOIS);

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populateretourfounisseur
DELIMITER //
CREATE PROCEDURE `proc_populateretourfounisseur`()
BEGIN 
DECLARE AMOUNT NUMERIC(15);
 DECLARE LGRETOURID VARCHAR(50);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT f.`lg_RETOUR_FRS_ID` FROM t_retour_fournisseur f;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGRETOURID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT   SUM(d.`int_NUMBER_RETURN`*bt.`int_PAF`) INTO AMOUNT
FROM t_retour_fournisseur_detail d,t_retour_fournisseur f, t_bon_livraison b,t_bon_livraison_detail bt 
WHERE f.`lg_RETOUR_FRS_ID`=d.`lg_RETOUR_FRS_ID` AND b.`lg_BON_LIVRAISON_ID`=bt.`lg_BON_LIVRAISON_ID`
AND b.`lg_BON_LIVRAISON_ID`=f.`lg_BON_LIVRAISON_ID` AND d.`lg_RETOUR_FRS_ID`=LGRETOURID AND d.`lg_FAMILLE_ID`=bt.`lg_FAMILLE_ID`;
IF(AMOUNT >0)THEN 
UPDATE t_retour_fournisseur SET dl_AMOUNT=AMOUNT WHERE lg_RETOUR_FRS_ID=LGRETOURID;

END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populatestatistiqueregletable
DELIMITER //
CREATE PROCEDURE `proc_populatestatistiqueregletable`()
BEGIN 
DECLARE MOIS VARCHAR(2);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT o.VALEUR FROM tmp_updateventetable o;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MOIS;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
CALL proc_updatereglementsocietetable(MOIS);

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populatestatistiquetable
DELIMITER //
CREATE PROCEDURE `proc_populatestatistiquetable`()
BEGIN 
DECLARE MOIS VARCHAR(2);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT o.VALEUR FROM tmp_updateventetable o;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MOIS;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
CALL proc_populateventestatsocietetable(MOIS);

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populatestatreglementsociete
DELIMITER //
CREATE PROCEDURE `proc_populatestatreglementsociete`(
        IN `lg_DOSSIERREGLEMENTID` VARCHAR(50),
        IN `lg_FACTUREID` VARCHAR(50)
    )
BEGIN 
DECLARE FULNAME VARCHAR(100);
DECLARE lg_TYPE_TIERS_PAYANT VARCHAR(40);
DECLARE MONTANTREGLEMENT NUMERIC(15);
DECLARE v_CODEORGANISME VARCHAR(100);
DECLARE DATEOPE DATE;
DECLARE NOMBRE INT;
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`str_FULLNAME`, d.`dbl_AMOUNT`,p.`lg_TYPE_TIERS_PAYANT_ID` ,d.`dt_CREATED`,t.`str_CODE_ORGANISME` FROM t_dossier_reglement d,t_facture f,t_tiers_payant t,t_type_tiers_payant p
WHERE f.`lg_FACTURE_ID`=d.`lg_FACTURE_ID` AND t.`lg_TIERS_PAYANT_ID`=f.`str_CUSTOMER` AND p.`lg_TYPE_TIERS_PAYANT_ID`=t.`lg_TYPE_TIERS_PAYANT_ID`
AND d.`lg_DOSSIER_REGLEMENT_ID`=`lg_DOSSIERREGLEMENTID` AND f.`lg_FACTURE_ID`=`lg_FACTUREID`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULNAME,MONTANTREGLEMENT,lg_TYPE_TIERS_PAYANT,DATEOPE,v_CODEORGANISME;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM t_snap_shop_vente_societe WHERE MONTH(t_snap_shop_vente_societe.`dt_DAY`)=MONTH(CURDATE())
AND YEAR(t_snap_shop_vente_societe.`dt_DAY`)=YEAR(CURDATE()) AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_societe SET int_AMOUNT_ENCAIS=int_AMOUNT_ENCAIS+MONTANTREGLEMENT, dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_societe.`dt_DAY`)=MONTH(CURDATE()) AND YEAR(t_snap_shop_vente_societe.`dt_DAY`)=YEAR(CURDATE()) AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME;
ELSE
INSERT INTO `t_snap_shop_vente_societe` 
 (str_TIERS_PAYANT,str_TYPE_TIERS_PAYANT,int_AMOUNT_SALE,int_AMOUNT_ENCAIS,dt_DAY,CODEORGANISME,dt_CREATED)
 VALUES(FULNAME,lg_TYPE_TIERS_PAYANT,0,MONTANTREGLEMENT,DATEOPE,v_CODEORGANISME,NOW());
END IF;
SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populatestatventesociete
DELIMITER //
CREATE PROCEDURE `proc_populatestatventesociete`(
        IN `lg_PREENREGISTREMENT` VARCHAR(50)
    )
BEGIN 
DECLARE FULNAME VARCHAR(100);
DECLARE lg_TYPE_TIERS_PAYANT VARCHAR(40);
DECLARE MONTANTVENTE NUMERIC(15);
DECLARE v_CODEORGANISME VARCHAR(100);
DECLARE DATEOPE DATE;
DECLARE NOMBRE INT;
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`str_FULLNAME`,pr.`int_PRICE`,t.`lg_TYPE_TIERS_PAYANT_ID`,pr.dt_CREATED,t.`str_CODE_ORGANISME` from t_preenregistrement_compte_client_tiers_payent pr,
t_preenregistrement p,
t_compte_client c,t_compte_client_tiers_payant cl,
t_tiers_payant t,t_type_tiers_payant tp
WHERE p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID`
AND p.`lg_PREENREGISTREMENT_ID`=`lg_PREENREGISTREMENT`
AND c.`lg_COMPTE_CLIENT_ID`=cl.`lg_COMPTE_CLIENT_ID`
AND t.`lg_TYPE_TIERS_PAYANT_ID`=tp.`lg_TYPE_TIERS_PAYANT_ID`
AND cl.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`
AND t.`lg_TIERS_PAYANT_ID`=cl.`lg_TIERS_PAYANT_ID`
AND pr.str_STATUT = 'is_Closed';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULNAME,MONTANTVENTE,lg_TYPE_TIERS_PAYANT,DATEOPE,v_CODEORGANISME;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM t_snap_shop_vente_societe WHERE MONTH(t_snap_shop_vente_societe.`dt_DAY`)=MONTH(CURDATE())
AND YEAR(t_snap_shop_vente_societe.`dt_DAY`)=YEAR(CURDATE()) AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_societe SET int_AMOUNT_SALE=int_AMOUNT_SALE+MONTANTVENTE,dt_UPDATED= NOW() WHERE 
MONTH(t_snap_shop_vente_societe.`dt_DAY`)=MONTH(CURDATE()) AND YEAR(t_snap_shop_vente_societe.`dt_DAY`)=YEAR(CURDATE()) AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME;
ELSE
INSERT INTO `t_snap_shop_vente_societe` 
 (str_TIERS_PAYANT,str_TYPE_TIERS_PAYANT,int_AMOUNT_SALE,int_AMOUNT_ENCAIS,dt_DAY,CODEORGANISME)
 VALUES(FULNAME,lg_TYPE_TIERS_PAYANT,MONTANTVENTE,0,DATEOPE,v_CODEORGANISME);
END IF;

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT NOMBRE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populateventeclientdata
DELIMITER //
CREATE PROCEDURE `proc_populateventeclientdata`()
BEGIN 
DECLARE MOIS VARCHAR(2);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT o.VALEUR FROM tmp_updateventetable o;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MOIS;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
CALL proc_clientvente(MOIS);

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_populateventestatsocietetable
DELIMITER //
CREATE PROCEDURE `proc_populateventestatsocietetable`(
        IN `MOIS` VARCHAR(2)
    )
BEGIN 
DECLARE FULNAME VARCHAR(100);
DECLARE lg_TYPE_TIERS_PAYANT VARCHAR(40);
DECLARE MONTANTVENTE NUMERIC(15);
DECLARE v_CODEORGANISME VARCHAR(100);

DECLARE DATEOPE DATE;
DECLARE NOMBRE INT;
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`str_FULLNAME`,pr.`int_PRICE`,t.`lg_TYPE_TIERS_PAYANT_ID`,pr.dt_CREATED ,t.`str_CODE_ORGANISME` from t_preenregistrement_compte_client_tiers_payent pr,
t_preenregistrement p,
t_compte_client c,t_compte_client_tiers_payant cl,
t_tiers_payant t,t_type_tiers_payant tp
WHERE p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID`
AND MONTH(p.`dt_CREATED`)=`MOIS`
AND c.`lg_COMPTE_CLIENT_ID`=cl.`lg_COMPTE_CLIENT_ID`
AND t.`lg_TYPE_TIERS_PAYANT_ID`=tp.`lg_TYPE_TIERS_PAYANT_ID`
AND cl.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`
AND t.`lg_TIERS_PAYANT_ID`=cl.`lg_TIERS_PAYANT_ID` AND  p.`int_PRICE` >0 
 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULNAME,MONTANTVENTE,lg_TYPE_TIERS_PAYANT,DATEOPE,v_CODEORGANISME;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM t_snap_shop_vente_societe WHERE MONTH(t_snap_shop_vente_societe.`dt_DAY`)=`MOIS` 
 AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_societe SET int_AMOUNT_SALE=int_AMOUNT_SALE+MONTANTVENTE,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_societe.`dt_DAY`)=`MOIS` AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME;
ELSE
INSERT INTO `t_snap_shop_vente_societe` 
 (str_TIERS_PAYANT,str_TYPE_TIERS_PAYANT,int_AMOUNT_SALE,int_AMOUNT_ENCAIS,dt_DAY,CODEORGANISME,dt_CREATED)
 VALUES(FULNAME,lg_TYPE_TIERS_PAYANT,MONTANTVENTE,0,DATEOPE,v_CODEORGANISME,NOW() );
END IF;

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_rapport_gestion
DELIMITER //
CREATE PROCEDURE `proc_rapport_gestion`(IN dt_start date, IN dt_end date)
BEGIN 
DECLARE MONTANT NUMERIC(15);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT 
 SUM(d.`int_PRICE`)-SUM(CASE WHEN d.`int_PRICE_REMISE`!= NULL THEN
 d.`int_PRICE_REMISE` ELSE 0 END) AS MONTANTTTC
FROM t_preenregistrement_detail d,
 t_preenregistrement p,
t_famille f,t_famillearticle fa,t_code_tva v
WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`
AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID`
AND fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID`
AND v.`lg_CODE_TVA_ID`=f.`lg_CODE_TVA_ID`
AND p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND p.lg_TYPE_VENTE_ID <> '5'
 AND DATE(d.`dt_CREATED`)>=DATE(`dt_start`) AND DATE(d.`dt_CREATED`)<=DATE(dt_end)
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_rapport_gestion_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_gestion_table
(
f_LIBELLE VARCHAR(200),
 f_MONTANT NUMERIC(15) DEFAULT 0,
f_PRIORITY int DEFAULT 0,
f_TYPEMVT VARCHAR(50)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MONTANT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_rapport_gestion_table (f_LIBELLE,f_MONTANT,f_PRIORITY,f_TYPEMVT)
 VALUES ('CA TTC',MONTANT,0,'CHIFFRE d''AFFAIRES');
END LOOP bl_loop;
 CLOSE curbl;
CALL proc_rapport_gestion_ht(dt_start,dt_end);
CALL proc_rapport_gestion_achat(dt_start,dt_end);
CALL proc_rapport_gestion_depenses(dt_start,dt_end);
CALL proc_rapport_gestion_Marge(dt_start,dt_end);
CALL proc_rapport_gestion_reglement(dt_start,dt_end);

SELECT (CASE WHEN f_LIBELLE IS NOT NULL THEN f_LIBELLE ELSE '' END ) AS f_LIBELLE,
(CASE WHEN f_MONTANT IS NOT NULL THEN f_MONTANT ELSE 0 END ) AS f_MONTANT,f_PRIORITY ,f_TYPEMVT

 FROM emp_rapport_gestion_table 
ORDER BY f_PRIORITY ,f_LIBELLE DESC;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_rapport_gestion_achat
DELIMITER //
CREATE PROCEDURE `proc_rapport_gestion_achat`(
        IN `dt_start` DATE,
        IN `dt_end` DATE
    )
BEGIN 

DECLARE MONTANT NUMERIC(15);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT SUM(b.`int_MHT`) AS VALEURACHAT 
FROM t_bon_livraison b WHERE b.`str_STATUT`='is_Closed'
AND DATE(b.`dt_UPDATED`)>=DATE(`dt_start`) AND DATE(b.`dt_UPDATED`)<=DATE(dt_end)
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_gestion_table
(
f_LIBELLE VARCHAR(200),
 f_MONTANT NUMERIC(15) DEFAULT 0,
f_PRIORITY int DEFAULT 0,
f_TYPEMVT VARCHAR(50)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MONTANT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_rapport_gestion_table (f_LIBELLE,f_MONTANT,f_PRIORITY,f_TYPEMVT)
 VALUES ('ACHATS',MONTANT,1,'ACHATS');
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_rapport_gestion_depenses
DELIMITER //
CREATE PROCEDURE `proc_rapport_gestion_depenses`(
        IN `dt_start` DATE,
        IN `dt_end` DATE
    )
BEGIN 

DECLARE MONTANT NUMERIC(15);
DECLARE LIBELLE VARCHAR(200);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT SUM(m.`int_AMOUNT`) AS VALEURDEPENSES,t.`str_NAME` AS LIBELLE FROM t_mvt_caisse m,t_type_mvt_caisse t WHERE 
 t.`lg_TYPE_MVT_CAISSE_ID`=m.`lg_TYPE_MVT_CAISSE_ID` AND ( t.`lg_TYPE_MVT_CAISSE_ID` = '1' OR
 t.`lg_TYPE_MVT_CAISSE_ID` ='4') AND 
 DATE(m.`dt_CREATED`) >=DATE(`dt_start`) AND DATE(m.`dt_CREATED`)<=DATE(dt_end)
GROUP BY t.`str_NAME`
 ;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_gestion_table
(
f_LIBELLE VARCHAR(200),
 f_MONTANT NUMERIC(15) DEFAULT 0,
f_PRIORITY int DEFAULT 0,
f_TYPEMVT VARCHAR(50)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MONTANT,LIBELLE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_rapport_gestion_table (f_LIBELLE,f_MONTANT,f_PRIORITY,f_TYPEMVT)
 VALUES (LIBELLE,MONTANT,3,'DEPENSES');
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_rapport_gestion_ht
DELIMITER //
CREATE PROCEDURE `proc_rapport_gestion_ht`(IN dt_start date, IN dt_end date)
BEGIN 
 
DECLARE MONTANT NUMERIC(15);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT 
ROUND(SUM((d.`int_PRICE`-(CASE WHEN d.`int_PRICE_REMISE`!= NULL THEN
 d.`int_PRICE_REMISE` ELSE 0 END))/(1+(v.`int_VALUE`/100)))) AS MONTANTH
FROM t_preenregistrement_detail d,
 t_preenregistrement p,
t_famille f,t_famillearticle fa,t_code_tva v
WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`
AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID`
AND fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID`
AND v.`lg_CODE_TVA_ID`=f.`lg_CODE_TVA_ID`
AND p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed' AND p.lg_TYPE_VENTE_ID <> '5'
 AND DATE(d.`dt_CREATED`)>=DATE(`dt_start`) AND DATE(d.`dt_CREATED`)<=DATE(dt_end)
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_gestion_table
(
f_LIBELLE VARCHAR(200),
 f_MONTANT NUMERIC(15) DEFAULT 0,
f_PRIORITY int DEFAULT 0,
f_TYPEMVT VARCHAR(50)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MONTANT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_rapport_gestion_table (f_LIBELLE,f_MONTANT,f_PRIORITY,f_TYPEMVT)
 VALUES ('CA HT',MONTANT,0,'CHIFFRE d''AFFAIRES');
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_rapport_gestion_Marge
DELIMITER //
CREATE PROCEDURE `proc_rapport_gestion_Marge`(
        IN `dt_start` DATE,
        IN `dt_end` DATE
    )
BEGIN 

DECLARE MONTANT NUMERIC(15);
DECLARE NB NUMERIC(15);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT COUNT(t.`dt_DAY`), 
((SELECT 
ROUND( CASE WHEN SUM((d.`int_PRICE`-(CASE WHEN d.`int_PRICE_REMISE` IS NOT NULL THEN
 d.`int_PRICE_REMISE` ELSE 0 END))/(1+(v.`int_VALUE`/100))) IS NOT NULL THEN SUM((d.`int_PRICE`-(CASE WHEN d.`int_PRICE_REMISE` IS NOT NULL THEN
 d.`int_PRICE_REMISE` ELSE 0 END))/(1+(v.`int_VALUE`/100))) ELSE 0 END ) 
FROM t_preenregistrement_detail d,
 t_preenregistrement p,
t_famille f,t_famillearticle fa,t_code_tva v
WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`
AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID`
AND fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID`
AND v.`lg_CODE_TVA_ID`=f.`lg_CODE_TVA_ID`
AND p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'
 AND DATE(d.`dt_CREATED`)>=DATE(DATE(`dt_start`)) AND DATE(d.`dt_CREATED`)<=DATE(DATE(dt_end))) -
(SELECT (CASE WHEN SUM(b.`int_MHT`) IS NOT NULL THEN SUM(b.`int_MHT`) ELSE 0 END )
FROM t_bon_livraison b WHERE b.`str_STATUT`='is_Closed'
AND DATE(b.`dt_UPDATED`)>=DATE(DATE(`dt_start`)) AND DATE(b.`dt_UPDATED`)<=DATE(DATE(dt_end))))AS MARGE
FROM t_mouvement t WHERE DATE(t.`dt_DAY`)>=DATE(`dt_start`) AND DATE(t.`dt_DAY`)<=DATE(dt_end);

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_gestion_table
(
f_LIBELLE VARCHAR(200),
 f_MONTANT NUMERIC(15) DEFAULT 0,
f_PRIORITY int DEFAULT 0,
f_TYPEMVT VARCHAR(50)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO NB, MONTANT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_rapport_gestion_table (f_LIBELLE,f_MONTANT,f_PRIORITY,f_TYPEMVT)
 VALUES ('Marge',MONTANT,2,'MARGE');
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_rapport_gestion_reglement
DELIMITER //
CREATE PROCEDURE `proc_rapport_gestion_reglement`(
        IN `dt_start` DATE,
        IN `dt_end` DATE
    )
BEGIN 

DECLARE MONTANT NUMERIC(15);
DECLARE LIBELLE VARCHAR(200);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT SUM(m.`int_AMOUNT`) AS VALEURDEPENSES,t.`str_NAME` AS LIBELLE FROM t_mvt_caisse m,t_type_mvt_caisse t WHERE 
 t.`lg_TYPE_MVT_CAISSE_ID`=m.`lg_TYPE_MVT_CAISSE_ID` AND ( t.`lg_TYPE_MVT_CAISSE_ID` = '2' OR
 t.`lg_TYPE_MVT_CAISSE_ID` ='3' OR t.`lg_TYPE_MVT_CAISSE_ID` ='5' OR t.`lg_TYPE_MVT_CAISSE_ID` ='7' OR t.`lg_TYPE_MVT_CAISSE_ID` ='6') AND 
 DATE(m.`dt_CREATED`) >=DATE(`dt_start`) AND DATE(m.`dt_CREATED`)<=DATE(dt_end) GROUP BY t.`str_NAME`
 ;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_gestion_table
(
f_LIBELLE VARCHAR(200),
 f_MONTANT NUMERIC(15) DEFAULT 0,
f_PRIORITY int DEFAULT 0,
f_TYPEMVT VARCHAR(50)
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MONTANT,LIBELLE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_rapport_gestion_table (f_LIBELLE,f_MONTANT,f_PRIORITY,f_TYPEMVT)
 VALUES (LIBELLE,MONTANT,4,'REGLEMENTS');
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_recaptulatif_credit
DELIMITER //
CREATE PROCEDURE `proc_recaptulatif_credit`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `search_value` VARCHAR(100),
        IN `lgTIERSPAYANT` VARCHAR(50)
    )
BEGIN 
DECLARE MONTANTCREDIT NUMERIC(15);
DECLARE FULLNAME VARCHAR(200);
DECLARE LIBELLETYPE VARCHAR(100);
DECLARE CODEORGANISME VARCHAR(100);
DECLARE CODECOMPTABLE VARCHAR(100);
DECLARE NUMERODECOMPTE VARCHAR(100);
DECLARE CheckExists INT DEFAULT 0;
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`str_FULLNAME`,SUM(pr.`int_PRICE_RESTE`),tp.`str_LIBELLE_TYPE_TIERS_PAYANT` ,t.`str_CODE_ORGANISME`,
t.`str_CODE_COMPTABLE`,t.`int_NUMERO_DECOMPTE` 
from t_preenregistrement_compte_client_tiers_payent pr,
t_preenregistrement p,
t_compte_client c,t_compte_client_tiers_payant cl,
t_tiers_payant t,t_type_tiers_payant tp
WHERE p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID`
AND c.`lg_COMPTE_CLIENT_ID`=cl.`lg_COMPTE_CLIENT_ID`
AND t.`lg_TYPE_TIERS_PAYANT_ID`=tp.`lg_TYPE_TIERS_PAYANT_ID`
AND cl.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`
AND t.`lg_TIERS_PAYANT_ID`=cl.`lg_TIERS_PAYANT_ID` AND DATE(p.`dt_CREATED`) >=DATE(`dt_start`) AND DATE(p.`dt_CREATED`)<=DATE(`dt_end`)
AND (t.`str_FULLNAME` LIKE `search_value` OR tp.`str_LIBELLE_TYPE_TIERS_PAYANT` LIKE `search_value` ) AND t.`lg_TIERS_PAYANT_ID` LIKE `lgTIERSPAYANT`
AND pr.`int_PRICE_RESTE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed' AND p.`int_PRICE`
GROUP BY t.`str_FULLNAME` 
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

 CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_recap_table
(
f_FULLNAME VARCHAR(200),
f_LIBELLETYPE VARCHAR(100),
f_CODEORGANISME VARCHAR(100),
f_CODECOMPTABLE VARCHAR(100),
f_NUMERODECOMPTE VARCHAR(100),
f_MONTANT NUMERIC (15) DEFAULT 0,
f_CREDIT NUMERIC (15) DEFAULT 0,
f_SOLDE NUMERIC (15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULLNAME, MONTANTCREDIT,LIBELLETYPE,CODEORGANISME,CODECOMPTABLE,NUMERODECOMPTE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM emp_rapport_recap_table WHERE f_FULLNAME =FULLNAME;
IF(CheckExists>0)THEN 
UPDATE  emp_rapport_recap_table SET f_CREDIT=MONTANTCREDIT  WHERE f_FULLNAME =FULLNAME;
ELSE 
INSERT INTO emp_rapport_recap_table (f_FULLNAME,f_LIBELLETYPE,f_CODEORGANISME,f_CODECOMPTABLE,f_NUMERODECOMPTE,f_CREDIT)
 VALUES (FULLNAME,LIBELLETYPE,CODEORGANISME,CODECOMPTABLE,NUMERODECOMPTE,MONTANTCREDIT);
END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_recaptulatif_organisme
DELIMITER //
CREATE PROCEDURE `proc_recaptulatif_organisme`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `search_value` VARCHAR(100),
        IN `lgTIERSPAYANT` VARCHAR(50)
    )
BEGIN 
DECLARE MONTANT NUMERIC(15);
DECLARE FULLNAME VARCHAR(200);
DECLARE LIBELLETYPE VARCHAR(100);
DECLARE CODEORGANISME VARCHAR(100);
DECLARE CODECOMPTABLE VARCHAR(100);
DECLARE NUMERODECOMPTE VARCHAR(100);

DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT 
t.`str_FULLNAME`,SUM(d.`dbl_AMOUNT`),p.`str_LIBELLE_TYPE_TIERS_PAYANT` ,t.`str_CODE_ORGANISME`,
t.`str_CODE_COMPTABLE`,t.`int_NUMERO_DECOMPTE` 
 FROM t_dossier_reglement d,t_tiers_payant t,
t_type_tiers_payant p WHERE  t.`lg_TIERS_PAYANT_ID`=d.`str_ORGANISME_ID` 
 AND p.`lg_TYPE_TIERS_PAYANT_ID`=t.`lg_TYPE_TIERS_PAYANT_ID` 
AND DATE(d.`dt_CREATED`)>=DATE(`dt_start`) AND DATE(d.`dt_CREATED`) <=DATE(`dt_end`) 
AND t.`lg_TIERS_PAYANT_ID` LIKE `lgTIERSPAYANT` 
AND (t.`str_FULLNAME` LIKE `search_value` OR p.`str_LIBELLE_TYPE_TIERS_PAYANT` LIKE `search_value`) 
GROUP BY t.`str_FULLNAME` 
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP  TEMPORARY TABLE IF EXISTS emp_rapport_recap_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_recap_table
(
f_FULLNAME VARCHAR(200),
f_LIBELLETYPE VARCHAR(100),
f_CODEORGANISME VARCHAR(100),
f_CODECOMPTABLE VARCHAR(100),
f_NUMERODECOMPTE VARCHAR(100),
f_MONTANT NUMERIC (15) DEFAULT 0,
f_CREDIT NUMERIC (15) DEFAULT 0,
f_SOLDE NUMERIC (15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULLNAME, MONTANT,LIBELLETYPE,CODEORGANISME,CODECOMPTABLE,NUMERODECOMPTE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 INSERT INTO emp_rapport_recap_table (f_FULLNAME,f_LIBELLETYPE,f_CODEORGANISME,f_CODECOMPTABLE,f_NUMERODECOMPTE,f_MONTANT)
 VALUES (FULLNAME,LIBELLETYPE,CODEORGANISME,CODECOMPTABLE,NUMERODECOMPTE,MONTANT);

END LOOP bl_loop;
 CLOSE curbl;
 CALL proc_recaptulatif_credit(`dt_start`,`dt_end`,`search_value`,`lgTIERSPAYANT`);
CALL proc_recaptulatif_solde(`search_value`,`lgTIERSPAYANT`);
SELECT * FROM emp_rapport_recap_table ORDER BY f_MONTANT DESC,f_LIBELLETYPE ;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_recaptulatif_solde
DELIMITER //
CREATE PROCEDURE `proc_recaptulatif_solde`(
        IN `search_value` VARCHAR(100),
        IN `lgTIERSPAYANT` VARCHAR(50)
    )
BEGIN 
DECLARE MONTANTSOLDE NUMERIC(15);
DECLARE FULLNAME VARCHAR(200);
DECLARE LIBELLETYPE VARCHAR(100);
DECLARE CODEORGANISME VARCHAR(100);
DECLARE CODECOMPTABLE VARCHAR(100);
DECLARE NUMERODECOMPTE VARCHAR(100);
DECLARE CheckExists INT DEFAULT 0;
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`str_FULLNAME`,SUM(pr.`int_PRICE_RESTE`),tp.`str_LIBELLE_TYPE_TIERS_PAYANT`,t.`str_CODE_ORGANISME`,
t.`str_CODE_COMPTABLE`,t.`int_NUMERO_DECOMPTE` 
from t_preenregistrement_compte_client_tiers_payent pr,
t_preenregistrement p,
t_compte_client c,t_compte_client_tiers_payant cl,
t_tiers_payant t,t_type_tiers_payant tp
WHERE p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID`
AND c.`lg_COMPTE_CLIENT_ID`=cl.`lg_COMPTE_CLIENT_ID`
AND t.`lg_TYPE_TIERS_PAYANT_ID`=tp.`lg_TYPE_TIERS_PAYANT_ID`
AND cl.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`
AND t.`lg_TIERS_PAYANT_ID`=cl.`lg_TIERS_PAYANT_ID` 
AND (t.`str_FULLNAME` LIKE `search_value` OR tp.`str_LIBELLE_TYPE_TIERS_PAYANT` LIKE `search_value` ) AND t.`lg_TIERS_PAYANT_ID` LIKE `lgTIERSPAYANT`
AND pr.`int_PRICE_RESTE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'
GROUP BY t.`str_FULLNAME` 
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

 CREATE TEMPORARY TABLE IF NOT EXISTS emp_rapport_recap_table
(
f_FULLNAME VARCHAR(200),
f_LIBELLETYPE VARCHAR(100),
f_CODEORGANISME VARCHAR(100),
f_CODECOMPTABLE VARCHAR(100),
f_NUMERODECOMPTE VARCHAR(100),
f_MONTANT NUMERIC (15) DEFAULT 0,
f_CREDIT NUMERIC (15) DEFAULT 0,
f_SOLDE NUMERIC (15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULLNAME, MONTANTSOLDE,LIBELLETYPE,CODEORGANISME,CODECOMPTABLE,NUMERODECOMPTE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM emp_rapport_recap_table WHERE f_FULLNAME =FULLNAME;
IF(CheckExists>0)THEN 
UPDATE  emp_rapport_recap_table SET f_SOLDE=MONTANTSOLDE  WHERE f_FULLNAME =FULLNAME;
ELSE 
INSERT INTO emp_rapport_recap_table (f_FULLNAME,f_LIBELLETYPE,f_CODEORGANISME,f_CODECOMPTABLE,f_NUMERODECOMPTE,f_SOLDE)
 VALUES (FULLNAME,LIBELLETYPE,CODEORGANISME,CODECOMPTABLE,NUMERODECOMPTE,MONTANTSOLDE);
END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_recherche_article
DELIMITER //
CREATE PROCEDURE `proc_recherche_article`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `lgTYPESTOCKID` VARCHAR(10),
        IN `PEMPLACEMENT` VARCHAR(100),
        IN `P_SEARCH` VARCHAR(100),
        IN `OPTION` INTEGER,
        IN `intNUMBER` INTEGER
    )
BEGIN 
IF `OPTION`=0 THEN

select 
   `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
    `t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,
    `t_famille`.`str_NAME` AS `str_NAME`,
    `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
    `t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
    `t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
    `t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
    `t_preenregistrement`.`str_STATUT` AS `str_STATUT`,
    `t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,
    `t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,
    `t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,
    `t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
    `t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
    `t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,
    `t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,
    `t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,
    `t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
    `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
    `t_preenregistrement`.`str_REF` AS `str_REF`,
    `t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
    `t_famille`.`int_CIP` AS `int_CIP`,
    `t_famille`.`int_EAN13` AS `int_EAN13`,
    `t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
    concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',
`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
    `t_user`.`lg_USER_ID` AS `lg_USER_ID`,
    `t_type_stock_famille`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
    `t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
    `t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,
    `t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
    `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 
  from 
   `t_preenregistrement` , `t_preenregistrement_detail`,`t_famille`,
`t_type_stock_famille`,`t_user`,`t_grossiste`,`t_emplacement` 
  where 
t_preenregistrement.`lg_PREENREGISTREMENT_ID`=t_preenregistrement_detail.`lg_PREENREGISTREMENT_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_preenregistrement_detail.`lg_FAMILLE_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_type_stock_famille.`lg_FAMILLE_ID`
AND t_user.`lg_USER_ID`=t_preenregistrement.`lg_USER_ID`
AND t_emplacement.`lg_EMPLACEMENT_ID`=t_user.`lg_EMPLACEMENT_ID`
AND t_grossiste.`lg_GROSSISTE_ID`=t_famille.`lg_GROSSISTE_ID` AND
    `t_preenregistrement`.`str_STATUT` = 'is_closed'
 and `t_preenregistrement`.`int_PRICE` >= 0 
and `t_preenregistrement`.`b_IS_CANCEL` = 0   AND 
t_type_stock_famille.`lg_EMPLACEMENT_ID`=t_emplacement.`lg_EMPLACEMENT_ID`

AND  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE `lgTYPESTOCKID`
AND DATE(t_preenregistrement.`dt_UPDATED`) >=DATE(`dt_start`)
AND DATE(t_preenregistrement.`dt_UPDATED`) <=DATE(`dt_end`)
AND t_user.`lg_EMPLACEMENT_ID`=`PEMPLACEMENT` AND (t_famille.`int_CIP` LIKE `P_SEARCH`
OR t_famille.str_DESCRIPTION LIKE `P_SEARCH` OR t_famille.`int_EAN13` LIKE `P_SEARCH`)
 GROUP BY   t_famille.`lg_FAMILLE_ID`;

ELSEIF `OPTION`=1 THEN

select 
   `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
    `t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,
    `t_famille`.`str_NAME` AS `str_NAME`,
    `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
    `t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
    `t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
    `t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
    `t_preenregistrement`.`str_STATUT` AS `str_STATUT`,
    `t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,
    `t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,
    `t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,
    `t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
    `t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
    `t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,
    `t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,
    `t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,
    `t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
    `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
    `t_preenregistrement`.`str_REF` AS `str_REF`,
    `t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
    `t_famille`.`int_CIP` AS `int_CIP`,
    `t_famille`.`int_EAN13` AS `int_EAN13`,
    `t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
    concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',
`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
    `t_user`.`lg_USER_ID` AS `lg_USER_ID`,
    `t_type_stock_famille`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
    `t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
    `t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,
    `t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
    `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 
  from 
   `t_preenregistrement` , `t_preenregistrement_detail`,`t_famille`,
`t_type_stock_famille`,`t_user`,`t_grossiste`,`t_emplacement` 
  where 
t_preenregistrement.`lg_PREENREGISTREMENT_ID`=t_preenregistrement_detail.`lg_PREENREGISTREMENT_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_preenregistrement_detail.`lg_FAMILLE_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_type_stock_famille.`lg_FAMILLE_ID`
AND t_user.`lg_USER_ID`=t_preenregistrement.`lg_USER_ID`
AND t_emplacement.`lg_EMPLACEMENT_ID`=t_user.`lg_EMPLACEMENT_ID`
AND t_grossiste.`lg_GROSSISTE_ID`=t_famille.`lg_GROSSISTE_ID` AND
    `t_preenregistrement`.`str_STATUT` = 'is_closed'
 and `t_preenregistrement`.`int_PRICE` >= 0 
and `t_preenregistrement`.`b_IS_CANCEL` = 0   AND 
t_type_stock_famille.`lg_EMPLACEMENT_ID`=t_emplacement.`lg_EMPLACEMENT_ID`

AND  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE `lgTYPESTOCKID`
AND DATE(t_preenregistrement.`dt_UPDATED`) >=DATE(`dt_start`)
AND DATE(t_preenregistrement.`dt_UPDATED`) <=DATE(`dt_end`)
AND t_user.`lg_EMPLACEMENT_ID`=`PEMPLACEMENT` AND (t_famille.`int_CIP` LIKE `P_SEARCH`
OR t_famille.str_DESCRIPTION LIKE `P_SEARCH` OR t_famille.`int_EAN13` LIKE `P_SEARCH`)
AND `t_type_stock_famille`.`int_NUMBER`<`intNUMBER`
 GROUP BY   t_famille.`lg_FAMILLE_ID`;


ELSEIF `OPTION`=2 THEN
select 
   `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
    `t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,
    `t_famille`.`str_NAME` AS `str_NAME`,
    `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
    `t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
    `t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
    `t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
    `t_preenregistrement`.`str_STATUT` AS `str_STATUT`,
    `t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,
    `t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,
    `t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,
    `t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
    `t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
    `t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,
    `t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,
    `t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,
    `t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
    `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
    `t_preenregistrement`.`str_REF` AS `str_REF`,
    `t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
    `t_famille`.`int_CIP` AS `int_CIP`,
    `t_famille`.`int_EAN13` AS `int_EAN13`,
    `t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
    concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',
`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
    `t_user`.`lg_USER_ID` AS `lg_USER_ID`,
    `t_type_stock_famille`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
    `t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
    `t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,
    `t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
    `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 
  from 
   `t_preenregistrement` , `t_preenregistrement_detail`,`t_famille`,
`t_type_stock_famille`,`t_user`,`t_grossiste`,`t_emplacement` 
  where 
t_preenregistrement.`lg_PREENREGISTREMENT_ID`=t_preenregistrement_detail.`lg_PREENREGISTREMENT_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_preenregistrement_detail.`lg_FAMILLE_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_type_stock_famille.`lg_FAMILLE_ID`
AND t_user.`lg_USER_ID`=t_preenregistrement.`lg_USER_ID`
AND t_emplacement.`lg_EMPLACEMENT_ID`=t_user.`lg_EMPLACEMENT_ID`
AND t_grossiste.`lg_GROSSISTE_ID`=t_famille.`lg_GROSSISTE_ID` AND
    `t_preenregistrement`.`str_STATUT` = 'is_closed'
 and `t_preenregistrement`.`int_PRICE` >= 0 
and `t_preenregistrement`.`b_IS_CANCEL` = 0   AND 
t_type_stock_famille.`lg_EMPLACEMENT_ID`=t_emplacement.`lg_EMPLACEMENT_ID`

AND  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE `lgTYPESTOCKID`
AND DATE(t_preenregistrement.`dt_UPDATED`) >=DATE(`dt_start`)
AND DATE(t_preenregistrement.`dt_UPDATED`) <=DATE(`dt_end`)
AND t_user.`lg_EMPLACEMENT_ID`=`PEMPLACEMENT` AND (t_famille.`int_CIP` LIKE `P_SEARCH`
OR t_famille.str_DESCRIPTION LIKE `P_SEARCH` OR t_famille.`int_EAN13` LIKE `P_SEARCH`)
AND `t_type_stock_famille`.`int_NUMBER`>`intNUMBER`
 GROUP BY   t_famille.`lg_FAMILLE_ID`;
ELSEIF `OPTION`=3 THEN
select 
   `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
    `t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,
    `t_famille`.`str_NAME` AS `str_NAME`,
    `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
    `t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
    `t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
    `t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
    `t_preenregistrement`.`str_STATUT` AS `str_STATUT`,
    `t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,
    `t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,
    `t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,
    `t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
    `t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
    `t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,
    `t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,
    `t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,
    `t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
    `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
    `t_preenregistrement`.`str_REF` AS `str_REF`,
    `t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
    `t_famille`.`int_CIP` AS `int_CIP`,
    `t_famille`.`int_EAN13` AS `int_EAN13`,
    `t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
    concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',
`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
    `t_user`.`lg_USER_ID` AS `lg_USER_ID`,
    `t_type_stock_famille`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
    `t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
    `t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,
    `t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
    `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 
  from 
   `t_preenregistrement` , `t_preenregistrement_detail`,`t_famille`,
`t_type_stock_famille`,`t_user`,`t_grossiste`,`t_emplacement` 
  where 
t_preenregistrement.`lg_PREENREGISTREMENT_ID`=t_preenregistrement_detail.`lg_PREENREGISTREMENT_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_preenregistrement_detail.`lg_FAMILLE_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_type_stock_famille.`lg_FAMILLE_ID`
AND t_user.`lg_USER_ID`=t_preenregistrement.`lg_USER_ID`
AND t_emplacement.`lg_EMPLACEMENT_ID`=t_user.`lg_EMPLACEMENT_ID`
AND t_grossiste.`lg_GROSSISTE_ID`=t_famille.`lg_GROSSISTE_ID` AND
    `t_preenregistrement`.`str_STATUT` = 'is_closed'
 and `t_preenregistrement`.`int_PRICE` >= 0 
and `t_preenregistrement`.`b_IS_CANCEL` = 0   AND 
t_type_stock_famille.`lg_EMPLACEMENT_ID`=t_emplacement.`lg_EMPLACEMENT_ID`

AND  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE `lgTYPESTOCKID`
AND DATE(t_preenregistrement.`dt_UPDATED`) >=DATE(`dt_start`)
AND DATE(t_preenregistrement.`dt_UPDATED`) <=DATE(`dt_end`)
AND t_user.`lg_EMPLACEMENT_ID`=`PEMPLACEMENT` AND (t_famille.`int_CIP` LIKE `P_SEARCH`
OR t_famille.str_DESCRIPTION LIKE `P_SEARCH` OR t_famille.`int_EAN13` LIKE `P_SEARCH`)
AND `t_type_stock_famille`.`int_NUMBER`=`intNUMBER`
 GROUP BY   t_famille.`lg_FAMILLE_ID`;
ELSEIF `OPTION`=4 THEN
select 
   `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
    `t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,
    `t_famille`.`str_NAME` AS `str_NAME`,
    `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
    `t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
    `t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
    `t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
    `t_preenregistrement`.`str_STATUT` AS `str_STATUT`,
    `t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,
    `t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,
    `t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,
    `t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
    `t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
    `t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,
    `t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,
    `t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,
    `t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
    `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
    `t_preenregistrement`.`str_REF` AS `str_REF`,
    `t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
    `t_famille`.`int_CIP` AS `int_CIP`,
    `t_famille`.`int_EAN13` AS `int_EAN13`,
    `t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
    concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',
`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
    `t_user`.`lg_USER_ID` AS `lg_USER_ID`,
    `t_type_stock_famille`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
    `t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
    `t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,
    `t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
    `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 
  from 
   `t_preenregistrement` , `t_preenregistrement_detail`,`t_famille`,
`t_type_stock_famille`,`t_user`,`t_grossiste`,`t_emplacement` 
  where 
t_preenregistrement.`lg_PREENREGISTREMENT_ID`=t_preenregistrement_detail.`lg_PREENREGISTREMENT_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_preenregistrement_detail.`lg_FAMILLE_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_type_stock_famille.`lg_FAMILLE_ID`
AND t_user.`lg_USER_ID`=t_preenregistrement.`lg_USER_ID`
AND t_emplacement.`lg_EMPLACEMENT_ID`=t_user.`lg_EMPLACEMENT_ID`
AND t_grossiste.`lg_GROSSISTE_ID`=t_famille.`lg_GROSSISTE_ID` AND
    `t_preenregistrement`.`str_STATUT` = 'is_closed'
 and `t_preenregistrement`.`int_PRICE` >= 0 
and `t_preenregistrement`.`b_IS_CANCEL` = 0   AND 
t_type_stock_famille.`lg_EMPLACEMENT_ID`=t_emplacement.`lg_EMPLACEMENT_ID`

AND  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE `lgTYPESTOCKID`
AND DATE(t_preenregistrement.`dt_UPDATED`) >=DATE(`dt_start`)
AND DATE(t_preenregistrement.`dt_UPDATED`) <=DATE(`dt_end`)
AND t_user.`lg_EMPLACEMENT_ID`=`PEMPLACEMENT` AND (t_famille.`int_CIP` LIKE `P_SEARCH`
OR t_famille.str_DESCRIPTION LIKE `P_SEARCH` OR t_famille.`int_EAN13` LIKE `P_SEARCH`)
AND `t_type_stock_famille`.`int_NUMBER`<=`intNUMBER`
 GROUP BY   t_famille.`lg_FAMILLE_ID`;

ELSEIF `OPTION`=5 THEN
select 
   `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
    `t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,
    `t_famille`.`str_NAME` AS `str_NAME`,
    `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
    `t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,
    `t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,
    `t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,
    `t_preenregistrement`.`str_STATUT` AS `str_STATUT`,
    `t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,
    `t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,
    `t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,
    `t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,
    `t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,
    `t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,
    `t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,
    `t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,
    `t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,
    `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,
    `t_preenregistrement`.`str_REF` AS `str_REF`,
    `t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,
    `t_famille`.`int_CIP` AS `int_CIP`,
    `t_famille`.`int_EAN13` AS `int_EAN13`,
    `t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,
    concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',
`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,
    `t_user`.`lg_USER_ID` AS `lg_USER_ID`,
    `t_type_stock_famille`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
    `t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,
    `t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,
    `t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,
    `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` 
  from 
   `t_preenregistrement` , `t_preenregistrement_detail`,`t_famille`,
`t_type_stock_famille`,`t_user`,`t_grossiste`,`t_emplacement` 
  where 
t_preenregistrement.`lg_PREENREGISTREMENT_ID`=t_preenregistrement_detail.`lg_PREENREGISTREMENT_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_preenregistrement_detail.`lg_FAMILLE_ID` 
AND t_famille.`lg_FAMILLE_ID`=t_type_stock_famille.`lg_FAMILLE_ID`
AND t_user.`lg_USER_ID`=t_preenregistrement.`lg_USER_ID`
AND t_emplacement.`lg_EMPLACEMENT_ID`=t_user.`lg_EMPLACEMENT_ID`
AND t_grossiste.`lg_GROSSISTE_ID`=t_famille.`lg_GROSSISTE_ID` AND
    `t_preenregistrement`.`str_STATUT` = 'is_closed'
 and `t_preenregistrement`.`int_PRICE` >= 0 
and `t_preenregistrement`.`b_IS_CANCEL` = 0   AND 
t_type_stock_famille.`lg_EMPLACEMENT_ID`=t_emplacement.`lg_EMPLACEMENT_ID`

AND  `t_type_stock_famille`.`lg_TYPE_STOCK_ID` LIKE `lgTYPESTOCKID`
AND DATE(t_preenregistrement.`dt_UPDATED`) >=DATE(`dt_start`)
AND DATE(t_preenregistrement.`dt_UPDATED`) <=DATE(`dt_end`)
AND t_user.`lg_EMPLACEMENT_ID`=`PEMPLACEMENT` AND (t_famille.`int_CIP` LIKE `P_SEARCH`
OR t_famille.str_DESCRIPTION LIKE `P_SEARCH` OR t_famille.`int_EAN13` LIKE `P_SEARCH`)
AND `t_type_stock_famille`.`int_NUMBER`>=`intNUMBER`
 GROUP BY   t_famille.`lg_FAMILLE_ID`;


END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_save_product_in_snapsnot_famillesell
DELIMITER //
CREATE PROCEDURE `proc_save_product_in_snapsnot_famillesell`(
        IN `lg_FAMILLE_ID` VARCHAR(40),
        IN `int_QUANTITY` INTEGER,
        IN `int_MONTH` INTEGER,
        IN `int_YEAR` INTEGER
    )
BEGIN 
DECLARE COUNTER NUMERIC(12);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT COUNT(t.lg_FAMILLE_ID) FROM t_snapshot_famillesell t WHERE t.int_YEAR = int_YEAR
AND t.lg_FAMILLE_ID = lg_FAMILLE_ID;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO COUNTER;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
  		
 		IF COUNTER = 0 THEN
   		CALL proc_insert_product_in_snapshot_famillesell(lg_FAMILLE_ID, int_QUANTITY, int_MONTH, int_YEAR);
   	ELSE 
   		CALL proc_update_product_in_snapshot_famillesell(lg_FAMILLE_ID, int_QUANTITY, int_MONTH, int_YEAR);
   	END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_statachatfournisseur
DELIMITER //
CREATE PROCEDURE `proc_statachatfournisseur`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100)
    )
BEGIN 
DECLARE v_JANVIER NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER NUMERIC(15) DEFAULT 0;
DECLARE v_MARS NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL NUMERIC(15) DEFAULT 0;
DECLARE v_MAI NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT NUMERIC(15) DEFAULT 0;
DECLARE v_OCT NUMERIC(15) DEFAULT 0;
DECLARE v_NOV NUMERIC(15) DEFAULT 0;
DECLARE v_DEC NUMERIC(15) DEFAULT 0;

DECLARE v_JANVIER_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_MARS_AVOIR NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_MAI_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET_AVOIR NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_OCT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_NOV_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_DEC_AVOIR NUMERIC(15) DEFAULT 0;




DECLARE v_ANNEE CHAR(8);
DECLARE v_LIBELLE VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curavoir CURSOR FOR 
SELECT g.`str_LIBELLE` AS GROSSISTE, YEAR( b.`dt_UPDATED`) AS ANNEE,  
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='1' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATJANVIER,

(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='2' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATFEV,

(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='3' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATMARS,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='4' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATAVRIL,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='5' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATMAI,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='6' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATJUIN,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='7' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATJUIELLET,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='8' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATJAOUT,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='9' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATSEPT,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='10' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATOCT,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='11' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATNOV,
(SELECT SUM(b1.`int_MHT`) FROM t_bon_livraison b1,t_order o1,t_grossiste g1
WHERE  o1.`lg_ORDER_ID`=b1.`lg_ORDER_ID` AND 
g1.`lg_GROSSISTE_ID`=o1.`lg_GROSSISTE_ID` 
AND o1.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`  AND 
MONTH( b1.`dt_UPDATED`)='12' 
AND  YEAR( b1.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`)   AND b1.`str_STATUT`='is_Closed' 
)AS VALEURACHATDEC,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='1'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRJANVIER,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='2'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRFEV,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='3'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRMARS,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='4'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRAVRIL,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='5'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRMAI,
(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='6'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRJUIN,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='7'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRJUIELLET,
(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='8'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRAOUT,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='9'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRSEPT,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='10'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIROCT,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='11'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRNOV,

(SELECT SUM(r.`dl_AMOUNT`) FROM t_retour_fournisseur r,t_grossiste gr WHERE r.`str_REPONSE_FRS`<>''
AND r.`lg_GROSSISTE_ID`=gr.`lg_GROSSISTE_ID` AND MONTH(r.`dt_UPDATED`)='12'
 AND YEAR(r.`dt_UPDATED`)=YEAR(b.`dt_UPDATED`) 
AND gr.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND r.`str_STATUT`='enable'
GROUP BY gr.`lg_GROSSISTE_ID`)AS AVOIRDEC

FROM t_bon_livraison b,t_order o,t_grossiste g
WHERE  o.`lg_ORDER_ID`=b.`lg_ORDER_ID` AND 
g.`lg_GROSSISTE_ID`=o.`lg_GROSSISTE_ID`
 AND
YEAR( b.`dt_UPDATED`)>=YEAR(dt_start) AND  YEAR( b.`dt_UPDATED`)<=YEAR(dt_end)
  AND b.`str_STATUT`='is_Closed'  
AND g.`str_LIBELLE` LIKE searchvalue
 GROUP BY YEAR( b.`dt_UPDATED`),g.`lg_GROSSISTE_ID` ORDER BY YEAR( b.`dt_UPDATED`),g.`str_LIBELLE`;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_statachatfournisseur_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_statachatfournisseur_table
 (f_ANNEE CHAR(8),
f_LIBELLE VARCHAR(100),
 f_JANVIER NUMERIC(15) DEFAULT 0,
f_FEVRIER NUMERIC(15) DEFAULT 0,
f_MARS NUMERIC(15) DEFAULT 0,
f_AVRIL NUMERIC(15) DEFAULT 0,
f_MAI NUMERIC(15) DEFAULT 0,
f_JUIN NUMERIC(15) DEFAULT 0,
f_JUIELLET NUMERIC(15) DEFAULT 0,
f_AOUT NUMERIC(15) DEFAULT 0,
f_SEPT NUMERIC(15) DEFAULT 0,
f_OCT NUMERIC(15) DEFAULT 0,
f_NOV NUMERIC(15) DEFAULT 0,
f_DEC NUMERIC(15) DEFAULT 0,
 f_JANVIER_AVOIR NUMERIC(15) DEFAULT 0,
f_FEVRIER_AVOIR NUMERIC(15) DEFAULT 0,
f_MARS_AVOIR NUMERIC(15) DEFAULT 0,
f_AVRIL_AVOIR NUMERIC(15) DEFAULT 0,
f_MAI_AVOIR NUMERIC(15) DEFAULT 0,
f_JUIN_AVOIR NUMERIC(15) DEFAULT 0,
f_JUIELLET_AVOIR NUMERIC(15) DEFAULT 0,
f_AOUT_AVOIR NUMERIC(15) DEFAULT 0,
f_SEPT_AVOIR NUMERIC(15) DEFAULT 0,
f_OCT_AVOIR NUMERIC(15) DEFAULT 0,
f_NOV_AVOIR NUMERIC(15) DEFAULT 0,
f_DEC_AVOIR NUMERIC(15) DEFAULT 0
);
OPEN curavoir;
avoir_loop:LOOP
FETCH curavoir INTO v_LIBELLE,v_ANNEE,
v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC,
v_JANVIER_AVOIR,v_FEVRIER_AVOIR,v_MARS_AVOIR,v_AVRIL_AVOIR,v_MAI_AVOIR,v_JUIN_AVOIR,v_JUIELLET_AVOIR,v_AOUT_AVOIR,v_SEPT_AVOIR,v_OCT_AVOIR,v_NOV_AVOIR,v_DEC_AVOIR
;
IF done=1 THEN 
 LEAVE avoir_loop;
 END IF;
INSERT INTO emp_statachatfournisseur_table (f_ANNEE,
f_LIBELLE,
f_JANVIER,f_FEVRIER,f_MARS,f_AVRIL,f_MAI,
f_JUIN,f_JUIELLET,f_AOUT,
f_SEPT,f_OCT,f_NOV,f_DEC,
f_JANVIER_AVOIR,f_FEVRIER_AVOIR,f_MARS_AVOIR,f_AVRIL_AVOIR,f_MAI_AVOIR,
f_JUIN_AVOIR,f_JUIELLET_AVOIR,f_AOUT_AVOIR,
f_SEPT_AVOIR,f_OCT_AVOIR,f_NOV_AVOIR,f_DEC_AVOIR
)
 VALUES (v_ANNEE,v_LIBELLE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC, v_JANVIER_AVOIR,v_FEVRIER_AVOIR,v_MARS_AVOIR,v_AVRIL_AVOIR,v_MAI_AVOIR,v_JUIN_AVOIR,v_JUIELLET_AVOIR,v_AOUT_AVOIR,v_SEPT_AVOIR,v_OCT_AVOIR,v_NOV_AVOIR,v_DEC_AVOIR);
END LOOP avoir_loop;
 CLOSE curavoir;
SELECT f_ANNEE,f_LIBELLE, 
(CASE WHEN f_JANVIER IS NOT NULL THEN f_JANVIER ELSE 0 END ) AS f_JANVIER,
(CASE WHEN f_FEVRIER IS NOT NULL THEN f_FEVRIER ELSE 0 END ) AS f_FEVRIER,
(CASE WHEN f_MARS IS NOT NULL THEN f_MARS ELSE 0 END ) AS f_MARS,
(CASE WHEN f_AVRIL IS NOT NULL THEN f_AVRIL ELSE 0 END ) AS f_AVRIL,
(CASE WHEN f_MAI IS NOT NULL THEN f_MAI ELSE 0 END ) AS f_MAI,
(CASE WHEN f_JUIN IS NOT NULL THEN f_JUIN ELSE 0 END ) AS f_JUIN,
(CASE WHEN f_JUIELLET IS NOT NULL THEN f_JUIELLET ELSE 0 END ) AS f_JUIELLET,
(CASE WHEN f_AOUT IS NOT NULL THEN f_AOUT ELSE 0 END ) AS f_AOUT,
(CASE WHEN f_SEPT IS NOT NULL THEN f_SEPT ELSE 0 END ) AS f_SEPT,
(CASE WHEN f_OCT IS NOT NULL THEN f_OCT ELSE 0 END ) AS f_OCT,
(CASE WHEN f_NOV IS NOT NULL THEN f_NOV ELSE 0 END ) AS f_NOV,
(CASE WHEN f_DEC IS NOT NULL THEN f_DEC ELSE 0 END ) AS f_DEC,
(CASE WHEN f_JANVIER_AVOIR IS NOT NULL THEN f_JANVIER_AVOIR ELSE 0 END ) AS f_JANVIER_AVOIR,
(CASE WHEN f_FEVRIER_AVOIR IS NOT NULL THEN f_FEVRIER_AVOIR ELSE 0 END ) AS f_FEVRIER_AVOIR,
(CASE WHEN f_MARS_AVOIR IS NOT NULL THEN f_MARS_AVOIR ELSE 0 END ) AS f_MARS_AVOIR,
(CASE WHEN f_AVRIL_AVOIR IS NOT NULL THEN f_AVRIL_AVOIR ELSE 0 END ) AS f_AVRIL_AVOIR,
(CASE WHEN f_MAI_AVOIR IS NOT NULL THEN f_MAI_AVOIR ELSE 0 END ) AS f_MAI_AVOIR,
(CASE WHEN f_JUIN_AVOIR IS NOT NULL THEN f_JUIN_AVOIR ELSE 0 END ) AS f_JUIN_AVOIR,
(CASE WHEN f_JUIELLET_AVOIR IS NOT NULL THEN f_JUIELLET_AVOIR ELSE 0 END ) AS f_JUIELLET_AVOIR,
(CASE WHEN f_AOUT_AVOIR IS NOT NULL THEN f_AOUT_AVOIR ELSE 0 END ) AS f_AOUT_AVOIR,
(CASE WHEN f_SEPT_AVOIR IS NOT NULL THEN f_SEPT_AVOIR ELSE 0 END ) AS f_SEPT_AVOIR,
(CASE WHEN f_OCT_AVOIR IS NOT NULL THEN f_OCT_AVOIR ELSE 0 END ) AS f_OCT_AVOIR,
(CASE WHEN f_NOV_AVOIR IS NOT NULL THEN f_NOV_AVOIR ELSE 0 END ) AS f_NOV_AVOIR,
(CASE WHEN f_DEC_AVOIR IS NOT NULL THEN f_DEC_AVOIR ELSE 0 END ) AS f_DEC_AVOIR
 FROM emp_statachatfournisseur_table
ORDER BY f_ANNEE ,f_LIBELLE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_statachatsqty
DELIMITER //
CREATE PROCEDURE `proc_statachatsqty`(
        IN `annee` INTEGER,
        IN `search` VARCHAR(100)
    )
BEGIN 

DECLARE intCIP VARCHAR(15);
DECLARE lgFAMILLEID VARCHAR(20);
DECLARE strLIB VARCHAR(200);

DECLARE vJANV int(10) DEFAULT 0;
DECLARE vFEV int(10) DEFAULT 0;
DECLARE vMARS int(10) DEFAULT 0;
DECLARE vAVR int(10) DEFAULT 0;
DECLARE vMAI int(10) DEFAULT 0;
DECLARE vJUIN int(10) DEFAULT 0;
DECLARE vJUIL int(10) DEFAULT 0;
DECLARE vAOUT int(10) DEFAULT 0;
DECLARE vSEPT int(10) DEFAULT 0;
DECLARE vOCT int(10) DEFAULT 0;
DECLARE vNOV int(10) DEFAULT 0;
DECLARE vDECE int(10) DEFAULT 0;

DECLARE vJANVQTY int(6) DEFAULT 0;
DECLARE vFEVQTY int(6) DEFAULT 0;
DECLARE vMARSQTY int(6) DEFAULT 0;
DECLARE vAVRQTY int(6) DEFAULT 0;
DECLARE vMAIQTY int(6) DEFAULT 0;
DECLARE vJUINQTY int(6) DEFAULT 0;
DECLARE vJUILQTY int(6) DEFAULT 0;
DECLARE vAOUTQTY int(6) DEFAULT 0;
DECLARE vSEPTQTY int(6) DEFAULT 0;
DECLARE vOCTQTY int(6) DEFAULT 0;
DECLARE vNOVQTY int(6) DEFAULT 0;
DECLARE vDECEQTY int(6) DEFAULT 0;

DECLARE vJANVUG int(6) DEFAULT 0;
DECLARE vFEVUG int(6) DEFAULT 0;
DECLARE vMARSUG int(6) DEFAULT 0;
DECLARE vAVRUG int(6) DEFAULT 0;
DECLARE vMAIUG int(6) DEFAULT 0;
DECLARE vJUINUG int(6) DEFAULT 0;
DECLARE vJUILUG int(6) DEFAULT 0;
DECLARE vAOUTUG int(6) DEFAULT 0;
DECLARE vSEPTUG int(6) DEFAULT 0;
DECLARE vOCTUG int(6) DEFAULT 0;
DECLARE vNOVUG int(6) DEFAULT 0;
DECLARE vDECEUG int(6) DEFAULT 0;



DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT 
  `t_famille`.`str_NAME`,
  `t_famille`.`lg_FAMILLE_ID`,
  `t_famille`.`int_CIP`
FROM
  `t_bon_livraison_detail`
  INNER JOIN `t_bon_livraison` ON (`t_bon_livraison_detail`.`lg_BON_LIVRAISON_ID` = `t_bon_livraison`.`lg_BON_LIVRAISON_ID`)
  INNER JOIN `t_famille` ON (`t_bon_livraison_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`)
  WHERE `t_bon_livraison`.`str_STATUT`='is_Closed' AND YEAR(`t_bon_livraison`.`dt_CREATED`)=`annee`
  AND (`t_famille`.`str_NAME` LIKE `search` OR `t_famille`.`int_CIP` LIKE `search`) 
  GROUP BY `t_famille`.`lg_FAMILLE_ID`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_statachaqty_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_statachaqty_table
(
ID VARCHAR(20) PRIMARY KEY  ,
CIP VARCHAR(30),
strNAME VARCHAR(200) ,
JANV int(10) DEFAULT 0,
FEV int(10) DEFAULT 0,
MARS int(10) DEFAULT 0,
AVR int(10) DEFAULT 0,
MAI int(10) DEFAULT 0,
JUIN int(10) DEFAULT 0,
JUIL int(10) DEFAULT 0,
AOUT int(10) DEFAULT 0,
SEPT int(10) DEFAULT 0,
OCT int(10) DEFAULT 0,
NOV int(10) DEFAULT 0,
DECE int(10) DEFAULT 0,

JANVQTY int(6) DEFAULT 0,
FEVQTY int(6) DEFAULT 0,
MARSQTY int(6) DEFAULT 0,
AVRQTY int(6) DEFAULT 0,
MAIQTY int(6) DEFAULT 0,
JUINQTY int(6) DEFAULT 0,
JUILQTY int(6) DEFAULT 0,
AOUTQTY int(6) DEFAULT 0,
SEPTQTY int(6) DEFAULT 0,
OCTQTY int(6) DEFAULT 0,
NOVQTY int(6) DEFAULT 0,
DECEQTY int(6) DEFAULT 0,

JANVUG int(6) DEFAULT 0,
FEVUG int(6) DEFAULT 0,
MARSUG int(6) DEFAULT 0,
AVRUG int(6) DEFAULT 0,
MAIUG int(6) DEFAULT 0,
JUINUG int(6) DEFAULT 0,
JUILUG int(6) DEFAULT 0,
AOUTUG int(6) DEFAULT 0,
SEPTUG int(6) DEFAULT 0,
OCTUG int(6) DEFAULT 0,
NOVUG int(6) DEFAULT 0,
DECEUG int(6) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO strLIB, lgFAMILLEID, intCIP;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vJANVQTY,vJANVUG,vJANV FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=1 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vFEVQTY,vFEVUG,vFEV FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=2 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vMARSQTY,vMARSUG,vMARS FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=3 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vAVRQTY,vAVRUG,vAVR FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=4 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vMAIQTY,vMAIUG,vMAI FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=5 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vJUINQTY,vJUINUG,vJUIN FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=6 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vJUILQTY,vJUILUG,vJUIL FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=7 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vAOUTQTY,vAOUTUG,vAOUT FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=8 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vSEPTQTY,vSEPTUG,vSEPT FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=9 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vOCTQTY,vOCTUG,vOCT FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=10 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vNOVQTY,vNOVUG,vNOV FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=11 AND `lg_FAMILLE_ID` = lgFAMILLEID ;

SELECT  SUM(`int_QTE_RECUE`),SUM(`int_QTE_UG`), SUM(`int_QTE_RECUE`*`int_PAF`) INTO vDECEQTY,vDECEUG,vDECE FROM t_bon_livraison_detail 
WHERE  YEAR(`dt_CREATED`)=`annee` AND MONTH(`dt_CREATED`)=12 AND `lg_FAMILLE_ID` = lgFAMILLEID ;


INSERT INTO emp_statachaqty_table 
 VALUES (lgFAMILLEID,intCIP,strLIB,vJANV,vFEV,vMARS,vAVR,vMAI,vJUIN,vJUIL,vAOUT,vSEPT,vOCT,vNOV,vDECE,
vJANVQTY,vFEVQTY,vMARSQTY,vAVRQTY,vMAIQTY,vJUINQTY,vJUILQTY,vAOUTQTY,vSEPTQTY,vOCTQTY,vNOVQTY,vDECEQTY,
vJANVUG,vFEVUG,vMARSUG,vAVRUG,vMAIUG,vJUINUG,vJUILUG,vAOUTUG,vSEPTUG,vOCTUG,vNOVUG,vDECEUG
);



END LOOP bl_loop;
 CLOSE curbl;

SELECT * FROM emp_statachaqty_table  ORDER BY strLIB; 

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_statqty
DELIMITER //
CREATE PROCEDURE `proc_statqty`(
        IN `annee` INTEGER,
        IN `search` VARCHAR(100)
    )
BEGIN 

DECLARE intCIP VARCHAR(15);
DECLARE lgFAMILLEID VARCHAR(20);
DECLARE strLIB VARCHAR(200);

DECLARE vJANV int(6) DEFAULT 0;
DECLARE vFEV int(6) DEFAULT 0;
DECLARE vMARS int(6) DEFAULT 0;
DECLARE vAVR int(6) DEFAULT 0;
DECLARE vMAI int(6) DEFAULT 0;
DECLARE vJUIN int(6) DEFAULT 0;
DECLARE vJUIL int(6) DEFAULT 0;
DECLARE vAOUT int(6) DEFAULT 0;
DECLARE vSEPT int(6) DEFAULT 0;
DECLARE vOCT int(6) DEFAULT 0;
DECLARE vNOV int(6) DEFAULT 0;
DECLARE vDECE int(6) DEFAULT 0;




DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT 
`t_famille`.`lg_FAMILLE_ID`,
  `t_famille`.`str_NAME`,
  `t_famille`.`int_CIP`
FROM
  `t_preenregistrement`
  INNER JOIN `t_preenregistrement_detail` ON (`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`)
  INNER JOIN `t_famille` ON (`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`)
WHERE
  `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND (`t_famille`.`str_NAME` LIKE `search` OR `t_famille`.`int_CIP` LIKE `search`)
   GROUP BY `t_famille`.`lg_FAMILLE_ID`,`t_famille`.`str_NAME`,`t_famille`.`int_CIP`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_statqty_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_statqty_table
(
ID VARCHAR(20) PRIMARY KEY  ,
CIP VARCHAR(30),
strNAME VARCHAR(200) ,
JANV int(6) DEFAULT 0,
FEV int(6) DEFAULT 0,
MARS int(6) DEFAULT 0,
AVR int(6) DEFAULT 0,
MAI int(6) DEFAULT 0,
JUIN int(6) DEFAULT 0,
JUIL int(6) DEFAULT 0,
AOUT int(6) DEFAULT 0,
SEPT int(6) DEFAULT 0,
OCT int(6) DEFAULT 0,
NOV int(6) DEFAULT 0,
DECE int(6) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID,strLIB, intCIP;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vJANV
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=1
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;

SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vFEV
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=2
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;
SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vMARS
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=3
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;
SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vAVR
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=4
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;


SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vMAI
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=5
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;

SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vJUIN
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=6
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;


SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vJUIL
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=7
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;

SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vAOUT
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=8
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;


SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vSEPT
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=9
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;

SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vOCT
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=10
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;
SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vNOV
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=11
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;


SELECT 
 SUM( `t_preenregistrement_detail`.`int_QUANTITY`) INTO vDECE
FROM
  `t_preenregistrement_detail`
  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)
 WHERE
 `t_preenregistrement`.`int_PRICE` > 0 AND 
  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND 
  `t_preenregistrement`.`lg_TYPE_VENTE_ID` <> '5'
   
   AND `t_preenregistrement`.`str_STATUT`='is_Closed'
   AND YEAR(`t_preenregistrement`.`dt_CREATED`)=`annee` AND MONTH(`t_preenregistrement`.`dt_CREATED`)=12
   AND t_preenregistrement_detail.`lg_FAMILLE_ID`=lgFAMILLEID;


INSERT INTO emp_statqty_table 
 VALUES (lgFAMILLEID,intCIP,strLIB,vJANV,vFEV,vMARS,vAVR,vMAI,vJUIN,vJUIL,vAOUT,vSEPT,vOCT,vNOV,vDECE);



END LOOP bl_loop;
 CLOSE curbl;

SELECT * FROM emp_statqty_table  ORDER BY strNAME; 

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_statretrocession
DELIMITER //
CREATE PROCEDURE `proc_statretrocession`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100)
    )
BEGIN 
DECLARE v_JANVIER NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER NUMERIC(15) DEFAULT 0;
DECLARE v_MARS NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL NUMERIC(15) DEFAULT 0;
DECLARE v_MAI NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT NUMERIC(15) DEFAULT 0;
DECLARE v_OCT NUMERIC(15) DEFAULT 0;
DECLARE v_NOV NUMERIC(15) DEFAULT 0;
DECLARE v_DEC NUMERIC(15) DEFAULT 0;
DECLARE v_ANNEE CHAR(8);
DECLARE v_LIBELLE VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curavoir CURSOR FOR 
SELECT  CONCAT(c.`str_FIRST_NAME`,' ',c.`str_LAST_NAME`)AS LIBELLE ,YEAR(r.`dt_CREATED`),

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='1' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTJAN,

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='2' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
) AS MONTANTFEV,
(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='3' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATMARS,

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='4' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATAVRIL,

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='5' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATMAI,


(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='6' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATJUIN,

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='7' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATJUIELLET,

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='8' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATAOUT,
(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='9' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATSEPT,

(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='10' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATOCT,
(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='11' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATNOV,
(SELECT SUM(ro.`int_MONTANT_HT`-ro.`int_REMISE`) FROM  t_retrocession ro,t_client cl WHERE 
ro.`lg_CLIENT_ID`=cl.`lg_CLIENT_ID`  AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID`
 AND MONTH(ro.`dt_CREATED`)='12' AND YEAR(ro.`dt_CREATED`)=YEAR(r.`dt_CREATED`)
)AS MONTANTACHATDEC
FROM t_retrocession r,t_client c
WHERE
 c.`lg_CLIENT_ID`=r.`lg_CLIENT_ID`
AND YEAR(r.`dt_CREATED`)>=YEAR(dt_start) AND  YEAR(r.`dt_CREATED`)<=YEAR(dt_end)
AND (c.`str_FIRST_NAME` LIKE searchvalue OR c.`str_LAST_NAME` LIKE searchvalue)
GROUP BY c.`lg_CLIENT_ID`
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_statretrocession_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_statretrocession_table
 (f_ANNEE CHAR(8),
f_LIBELLE VARCHAR(100),
 f_JANVIER NUMERIC(15) DEFAULT 0,
f_FEVRIER NUMERIC(15) DEFAULT 0,
f_MARS NUMERIC(15) DEFAULT 0,
f_AVRIL NUMERIC(15) DEFAULT 0,
f_MAI NUMERIC(15) DEFAULT 0,
f_JUIN NUMERIC(15) DEFAULT 0,
f_JUIELLET NUMERIC(15) DEFAULT 0,
f_AOUT NUMERIC(15) DEFAULT 0,
f_SEPT NUMERIC(15) DEFAULT 0,
f_OCT NUMERIC(15) DEFAULT 0,
f_NOV NUMERIC(15) DEFAULT 0,
f_DEC NUMERIC(15) DEFAULT 0
);
OPEN curavoir;
avoir_loop:LOOP
FETCH curavoir INTO v_LIBELLE,v_ANNEE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC;
IF done=1 THEN 
 LEAVE avoir_loop;
 END IF;
INSERT INTO emp_statretrocession_table (f_ANNEE,f_LIBELLE,f_JANVIER,f_FEVRIER,f_MARS,f_AVRIL,f_MAI,f_JUIN,f_JUIELLET,f_AOUT,f_SEPT,f_OCT,f_NOV,f_DEC)
 VALUES (v_ANNEE,v_LIBELLE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC);
END LOOP avoir_loop;
 CLOSE curavoir;
SELECT f_ANNEE,f_LIBELLE, 
(CASE WHEN f_JANVIER IS NOT NULL THEN f_JANVIER ELSE 0 END ) AS f_JANVIER,
(CASE WHEN f_FEVRIER IS NOT NULL THEN f_FEVRIER ELSE 0 END ) AS f_FEVRIER,
(CASE WHEN f_MARS IS NOT NULL THEN f_MARS ELSE 0 END ) AS f_MARS,
(CASE WHEN f_AVRIL IS NOT NULL THEN f_AVRIL ELSE 0 END ) AS f_AVRIL,
(CASE WHEN f_MAI IS NOT NULL THEN f_MAI ELSE 0 END ) AS f_MAI,
(CASE WHEN f_JUIN IS NOT NULL THEN f_JUIN ELSE 0 END ) AS f_JUIN,
(CASE WHEN f_JUIELLET IS NOT NULL THEN f_JUIELLET ELSE 0 END ) AS f_JUIELLET,
(CASE WHEN f_AOUT IS NOT NULL THEN f_AOUT ELSE 0 END ) AS f_AOUT,
(CASE WHEN f_SEPT IS NOT NULL THEN f_SEPT ELSE 0 END ) AS f_SEPT,
(CASE WHEN f_OCT IS NOT NULL THEN f_OCT ELSE 0 END ) AS f_OCT,
(CASE WHEN f_NOV IS NOT NULL THEN f_NOV ELSE 0 END ) AS f_NOV,
(CASE WHEN f_DEC IS NOT NULL THEN f_DEC ELSE 0 END ) AS f_DEC
 FROM emp_statretrocession_table
ORDER BY f_ANNEE ,f_LIBELLE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Proc_statRupturStock
DELIMITER //
CREATE PROCEDURE `Proc_statRupturStock`(
        IN `periode_deb` VARCHAR(22),
        IN `periode_fin` VARCHAR(22)
    )
BEGIN
	SELECT 
	r.lg_FAMILLE_ID int_id
	,f.int_CIP,f.str_NAME
	,cg.str_CODE_BAREME int_code_gestion
	,f.int_QTE_REAPPROVISIONNEMENT int_qte_reapro
	,f.int_SEUIL_MIN int_seuil_reapro
	,COUNT(r.lg_FAMILLE_ID) int_nbre_de_foi_rupt
	FROM t_rupture_history r
	JOIN t_famille f on f.lg_FAMILLE_ID = r.lg_FAMILLE_ID
	JOIN t_code_gestion cg on cg.lg_CODE_GESTION_ID = f.lg_CODE_GESTION_ID
	WHERE r.dt_CREATED BETWEEN periode_deb AND periode_fin
	GROUP BY r.lg_FAMILLE_ID;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_statventeachat
DELIMITER //
CREATE PROCEDURE `proc_statventeachat`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100),
        IN `debut` INTEGER,
        IN `FINT` INTEGER
    )
BEGIN 
DECLARE v_JANVIER NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER NUMERIC(15) DEFAULT 0;
DECLARE v_MARS NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL NUMERIC(15) DEFAULT 0;
DECLARE v_MAI NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT NUMERIC(15) DEFAULT 0;
DECLARE v_OCT NUMERIC(15) DEFAULT 0;
DECLARE v_NOV NUMERIC(15) DEFAULT 0;
DECLARE v_DEC NUMERIC(15) DEFAULT 0;
DECLARE v_ANNEE CHAR(8);
DECLARE v_LIBELLE VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curavoir CURSOR FOR 
SELECT f.`str_NAME`,YEAR( d.`dt_UPDATED`)AS ANNEE,

(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='1' AND d3.`str_STATUT`='is_Closed' AND  
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATJANVIER,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='2' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATFEV,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='3' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATMARS,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='4' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATAVRIL,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='5' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATMAI,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='6' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATJUIN,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='7' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATJUIELLET,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='8' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATAOUT,


(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='9' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATSEPT,

(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='10' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATOCT,

(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='11' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATNOV,
(SELECT SUM(d3.`int_QTE_RECUE`*d3.`int_PAF`) FROM t_bon_livraison_detail d3,t_famille f3
WHERE f3.`lg_FAMILLE_ID`=d3.`lg_FAMILLE_ID` AND 
MONTH( d3.`dt_UPDATED`)='12' AND d3.`str_STATUT`='is_Closed' AND 
f3.`lg_FAMILLE_ID`=f.`lg_FAMILLE_ID` AND YEAR( d3.`dt_UPDATED`)=YEAR( d.`dt_UPDATED`)
)AS MONTANTACHATDEC
FROM t_bon_livraison_detail d,t_famille f
WHERE f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND  
YEAR( d.`dt_UPDATED`)>=YEAR(dt_start) AND  YEAR( d.`dt_UPDATED`)<=YEAR(dt_end)
  AND d.`str_STATUT`='is_Closed'  AND f.`str_NAME` LIKE searchvalue
GROUP BY f.`str_NAME` LIMIT `debut`,`FINT`;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_statventeachat_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_statventeachat_table
 (f_ANNEE CHAR(8),
f_LIBELLE VARCHAR(100),
 f_JANVIER NUMERIC(15) DEFAULT 0,
f_FEVRIER NUMERIC(15) DEFAULT 0,
f_MARS NUMERIC(15) DEFAULT 0,
f_AVRIL NUMERIC(15) DEFAULT 0,
f_MAI NUMERIC(15) DEFAULT 0,
f_JUIN NUMERIC(15) DEFAULT 0,
f_JUIELLET NUMERIC(15) DEFAULT 0,
f_AOUT NUMERIC(15) DEFAULT 0,
f_SEPT NUMERIC(15) DEFAULT 0,
f_OCT NUMERIC(15) DEFAULT 0,
f_NOV NUMERIC(15) DEFAULT 0,
f_DEC NUMERIC(15) DEFAULT 0
);
OPEN curavoir;
avoir_loop:LOOP
FETCH curavoir INTO v_LIBELLE,v_ANNEE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC;
IF done=1 THEN 
 LEAVE avoir_loop;
 END IF;
INSERT INTO emp_statventeachat_table (f_ANNEE,f_LIBELLE,f_JANVIER,f_FEVRIER,f_MARS,f_AVRIL,f_MAI,f_JUIN,f_JUIELLET,f_AOUT,f_SEPT,f_OCT,f_NOV,f_DEC)
 VALUES (v_ANNEE,v_LIBELLE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC);
END LOOP avoir_loop;
 CLOSE curavoir;
SELECT f_ANNEE,f_LIBELLE, 
(CASE WHEN f_JANVIER IS NOT NULL THEN f_JANVIER ELSE 0 END ) AS f_JANVIER,
(CASE WHEN f_FEVRIER IS NOT NULL THEN f_FEVRIER ELSE 0 END ) AS f_FEVRIER,
(CASE WHEN f_MARS IS NOT NULL THEN f_MARS ELSE 0 END ) AS f_MARS,
(CASE WHEN f_AVRIL IS NOT NULL THEN f_AVRIL ELSE 0 END ) AS f_AVRIL,
(CASE WHEN f_MAI IS NOT NULL THEN f_MAI ELSE 0 END ) AS f_MAI,
(CASE WHEN f_JUIN IS NOT NULL THEN f_JUIN ELSE 0 END ) AS f_JUIN,
(CASE WHEN f_JUIELLET IS NOT NULL THEN f_JUIELLET ELSE 0 END ) AS f_JUIELLET,
(CASE WHEN f_AOUT IS NOT NULL THEN f_AOUT ELSE 0 END ) AS f_AOUT,
(CASE WHEN f_SEPT IS NOT NULL THEN f_SEPT ELSE 0 END ) AS f_SEPT,
(CASE WHEN f_OCT IS NOT NULL THEN f_OCT ELSE 0 END ) AS f_OCT,
(CASE WHEN f_NOV IS NOT NULL THEN f_NOV ELSE 0 END ) AS f_NOV,
(CASE WHEN f_DEC IS NOT NULL THEN f_DEC ELSE 0 END ) AS f_DEC
 FROM emp_statventeachat_table
ORDER BY f_ANNEE ,f_LIBELLE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_stockmini
DELIMITER //
CREATE PROCEDURE `proc_stockmini`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(50);
DECLARE SEUILMIN NUMERIC(12);
DECLARE intSTOCKREAP NUMERIC(12);
DECLARE intSTOCKQTY NUMERIC(12);
DECLARE NOMBRE NUMERIC(12);
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT lg_FAMILLE_ID, int_SEUIL_MIN ,int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT FROM t_famille_copy ;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
SET NOMBRE=0;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID,SEUILMIN,intSTOCKREAP,intSTOCKQTY;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE t_famille SET int_SEUIL_MIN=SEUILMIN,int_STOCK_REAPROVISONEMENT=intSTOCKREAP,int_QTE_REAPPROVISIONNEMENT=intSTOCKQTY WHERE lg_FAMILLE_ID=LGFAMILLEID;

SET NOMBRE=NOMBRE+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;
SELECT  NOMBRE;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_supprimerproduit
DELIMITER //
CREATE PROCEDURE `proc_supprimerproduit`()
BEGIN 
DECLARE LG VARCHAR(20);
DECLARE myCOUNTER int(8) DEFAULT '0';
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT `lg_FAMILLE_ID` FROM t_famille  WHERE `str_STATUT`='delete'
;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LG;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;



 DELETE FROM t_famille_grossiste WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_preenregistrement_detail WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_grossiste WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_dci WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_history WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_stock WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_stockretrocession WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_zonegeo WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_ajustement_detail WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_bon_livraison_detail WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_etiquette WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_famille_stockretrocession WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_inventaire_famille WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_lot WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_mouvement WHERE `lg_FAMILLE_ID`=LG;
 DELETE FROM t_mouvement_snapshot WHERE `lg_FAMILLE_ID`=LG ;
 DELETE FROM t_mouvementprice WHERE `lg_FAMILLE_ID`=LG ;
 DELETE FROM t_order_detail WHERE `lg_FAMILLE_ID`=LG ;
  DELETE FROM t_promotion_product WHERE `lg_FAMILLE_ID`=LG ;
  DELETE FROM t_retour_fournisseur_detail WHERE `lg_FAMILLE_ID`=LG ;
   DELETE FROM t_retourdepotdetail WHERE `lg_FAMILLE_ID`=LG ;
    DELETE FROM t_retrocession_detail WHERE `lg_FAMILLE_ID`=LG ;
	 DELETE FROM t_rupture_history WHERE `lg_FAMILLE_ID`=LG ;
	DELETE FROM t_snap_shop_daly_sortie_famille WHERE `lg_FAMILLE_ID`=LG ;
	   DELETE FROM t_snap_shop_daly_stat WHERE `lg_FAMILLE_ID`=LG ;
	    DELETE FROM t_snap_shop_rupture_stock WHERE `lg_FAMILLE_ID`=LG ;
		DELETE FROM t_snapshot_famillesell WHERE `lg_FAMILLE_ID`=LG ;
		DELETE FROM t_suggestion_order_details WHERE `lg_FAMILLE_ID`=LG ;
		DELETE FROM t_type_stock_famille WHERE `lg_FAMILLE_ID`=LG;
		
		DELETE FROM t_warehousedetail WHERE `lg_FAMILLE_ID`=LG;
		DELETE FROM t_warehouse WHERE `lg_FAMILLE_ID`=LG;
		 DELETE FROM t_famille WHERE `lg_FAMILLE_ID`=LG;

SET myCOUNTER=myCOUNTER+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

SELECT  myCOUNTER;
 

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_tableaupharmacieannulation
DELIMITER //
CREATE PROCEDURE `proc_tableaupharmacieannulation`(IN dt_start date, IN dt_end date,IN emplacementid varchar(40))
BEGIN 
DECLARE DATEOPERATION DATE;
DECLARE CACOMPTANT NUMERIC(15);
DECLARE CACREDIT  NUMERIC(15);
DECLARE CAREMISE NUMERIC(15);
DECLARE CheckExists INT DEFAULT 0;  
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR
SELECT DATE(d.dateOp) AS DATEOPERATION,SUM(d.montantPaye) ,SUM(d.montantTP)-SUM(d.montantRestant),SUM(d.remise) FROM annulation_snapshot d WHERE
DATE(d.`dateOp`) BETWEEN dt_start AND dt_end AND d.`emplacement`=emplacementid
GROUP BY DATE(d.`dateOp`);

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_tableaupharmacien_table
(
f_DATEOPERATION DATE PRIMARY KEY,
 f_CACOMPTANT NUMERIC(15) DEFAULT 0,
 f_CACOMPTANTOTHER NUMERIC(15) DEFAULT 0,
 f_CACREDIT NUMERIC(15) DEFAULT 0,
f_CAREMISE NUMERIC(12) DEFAULT 0,
f_NOMBRE NUMERIC(8)DEFAULT 0,
f_ACHATLABOREX NUMERIC(15) DEFAULT 0,
f_ACHATDPCI NUMERIC(15) DEFAULT 0,
f_ACHATCOPHARMED NUMERIC(15) DEFAULT 0,
f_ACHATTEDISPHARMA NUMERIC(15) DEFAULT 0,
f_ACHATAUTRES NUMERIC(15) DEFAULT 0,
f_VALEURACHAT NUMERIC(15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO DATEOPERATION,CACOMPTANT,CACREDIT,CAREMISE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(*) INTO CheckExists FROM emp_tableaupharmacien_table WHERE f_DATEOPERATION=DATEOPERATION;
IF(CheckExists>0)THEN 
UPDATE emp_tableaupharmacien_table SET f_CACOMPTANT=f_CACOMPTANT-CACOMPTANT,f_CACREDIT=f_CACREDIT-CACREDIT,f_CAREMISE=f_CAREMISE-CAREMISE,f_CACOMPTANTOTHER=f_CACOMPTANTOTHER-CACOMPTANT WHERE f_DATEOPERATION=DATEOPERATION;
ELSE
INSERT INTO emp_tableaupharmacien_table (f_DATEOPERATION,f_CACOMPTANT,f_CACOMPTANTOTHER,f_CACREDIT,f_CAREMISE)
 VALUES (DATEOPERATION,-CACOMPTANT,-CACOMPTANT,-CACREDIT,-CAREMISE);
END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_tableaupharmacien
DELIMITER //
CREATE PROCEDURE `proc_tableaupharmacien`(IN dt_start date, IN dt_end date,IN emplacementid varchar(40))
BEGIN 
DECLARE DATEOPERATION DATE;
DECLARE CACOMPTANT NUMERIC(15);
DECLARE CACOMPTANTOTHER NUMERIC(15);
DECLARE MVTFALSE NUMERIC(15);
DECLARE CACREDIT NUMERIC(15);
DECLARE CAREMISE NUMERIC(12);
DECLARE NOMBRE NUMERIC(8);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT COUNT(o.`lg_PREENREGISTREMENT_ID`) AS NOMBRE,DATE(o.`dt_UPDATED`)AS DATEOPERATION,
SUM(CASE WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VNO')  
THEN (o.`int_PRICE`)  WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VO') THEN (o.`int_CUST_PART`)
WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' ) THEN (SELECT e.`int_PRICE` FROM t_preenregistrement_compte_client e WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
 ELSE 0 END) AS CACOMPTANT,
SUM(CASE 
	WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VNO')  
		THEN (o.`int_PRICE_OTHER`)  
	WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VO') 
		THEN (o.`int_CUST_PART`)
	WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' ) 
		THEN (SELECT e.`int_PRICE` FROM t_preenregistrement_compte_client e 
		WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
 	ELSE 0 END) AS CACOMPTANTOTHER,
SUM(CASE WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`<>'Differe' AND o.`str_TYPE_VENTE`='VO')  
THEN (o.`int_PRICE`-o.`int_CUST_PART`)  
WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' AND o.`str_TYPE_VENTE`='VNO' ) THEN 
(SELECT e.`int_PRICE_RESTE` FROM t_preenregistrement_compte_client e WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
 WHEN (o.`lg_TYPE_VENTE_ID`<> '5' AND o.`str_STATUT_VENTE`='Differe' AND o.`str_TYPE_VENTE`='VO' ) 
THEN (SELECT (o.`int_PRICE`-o.`int_CUST_PART`+e.`int_PRICE_RESTE`) 
FROM t_preenregistrement_compte_client e WHERE o.`lg_PREENREGISTREMENT_ID`=e.`lg_PREENREGISTREMENT_ID`)
ELSE 0 END) AS CACREDIT,
SUM(o.`int_PRICE_REMISE`) AS CAREMISE,
(SELECT CASE WHEN SUM(t.int_AMOUNT) IS NOT NULL THEN SUM(t.int_AMOUNT) ELSE 0 END FROM t_mvt_caisse t WHERE DATE(t.dt_DATE_MVT) = DATE(o.`dt_CREATED`) AND t.bool_CHECKED = false) AS MVTFALSE
FROM t_preenregistrement o,t_user tu WHERE o.`b_IS_CANCEL`=0 AND o.`str_STATUT`='is_Closed' AND o.`int_PRICE`>0 
AND DATE(o.`dt_UPDATED`)>=DATE(`dt_start`) AND DATE(o.`dt_UPDATED`)<=DATE(dt_end) AND o.lg_TYPE_VENTE_ID <> '5' 
AND o.lg_USER_ID=tu.lg_USER_ID AND tu.lg_EMPLACEMENT_ID=emplacementid
GROUP BY DATE(o.`dt_UPDATED`);
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_tableaupharmacien_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_tableaupharmacien_table
(
f_DATEOPERATION DATE PRIMARY KEY,
f_CACOMPTANT NUMERIC(15) DEFAULT 0,
f_CACOMPTANTOTHER NUMERIC(15) DEFAULT 0,
f_CACREDIT NUMERIC(15) DEFAULT 0,
f_MVTFALSE NUMERIC(15) DEFAULT 0,
f_CAREMISE NUMERIC(12) DEFAULT 0,
f_NOMBRE NUMERIC(8)DEFAULT 0,
f_ACHATLABOREX NUMERIC(15) DEFAULT 0,
f_ACHATDPCI NUMERIC(15) DEFAULT 0,
f_ACHATCOPHARMED NUMERIC(15) DEFAULT 0,
f_ACHATTEDISPHARMA NUMERIC(15) DEFAULT 0,
f_ACHATAUTRES NUMERIC(15) DEFAULT 0,
f_VALEURACHAT NUMERIC(15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO NOMBRE,DATEOPERATION,CACOMPTANT,CACOMPTANTOTHER,CACREDIT,CAREMISE,MVTFALSE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_tableaupharmacien_table (f_DATEOPERATION,f_CACOMPTANT,f_CACOMPTANTOTHER,f_CACREDIT,f_CAREMISE,f_NOMBRE,f_MVTFALSE)
 VALUES (DATEOPERATION,CACOMPTANT,CACOMPTANTOTHER,CACREDIT,CAREMISE,NOMBRE,MVTFALSE);
END LOOP bl_loop;
 CLOSE curbl;
CALL proc_tableaupharmacieannulation(dt_start,dt_end,emplacementid);
CALL proc_tableaupharmacienachat(dt_start,dt_end);
CALL proc_tableaupharmacienavoir(dt_start,dt_end);
SELECT DATE_FORMAT(f_DATEOPERATION,'%d/%m/%Y')AS f_DATEOPERATIONFORMAT,f_CACOMPTANT,f_CACREDIT,f_CAREMISE,((f_CACOMPTANT+f_CACREDIT) - f_CAREMISE) AS CANET,f_NOMBRE,f_ACHATLABOREX,f_ACHATDPCI,f_ACHATCOPHARMED,f_ACHATTEDISPHARMA,f_ACHATAUTRES,f_VALEURACHAT,((f_ACHATLABOREX+f_ACHATDPCI+f_ACHATCOPHARMED+f_ACHATTEDISPHARMA+f_ACHATAUTRES)-f_VALEURACHAT) AS ACHATNETS,f_CACOMPTANTOTHER,f_MVTFALSE,((f_CACOMPTANTOTHER+f_CACREDIT) - f_CAREMISE) AS CANETOTHER
FROM emp_tableaupharmacien_table 
ORDER BY f_DATEOPERATION;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_tableaupharmacienachat
DELIMITER //
CREATE PROCEDURE `proc_tableaupharmacienachat`(
	IN `dt_start` DATE,
	IN `dt_end` DATE
    
)
BEGIN 
DECLARE DATEOPERATION DATE;
DECLARE ACHATLABOREX NUMERIC(15);
DECLARE ACHATDPCI NUMERIC(15);
DECLARE ACHATCOPHARMED NUMERIC(15);
DECLARE ACHATTEDISPHARMA NUMERIC(15);
DECLARE ACHATAUTRES NUMERIC(15);
DECLARE CheckExists INT DEFAULT 0;  
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT DATE(b.`dt_DATE_LIVRAISON`)AS DATEOPERATION, SUM(CASE WHEN g.`str_LIBELLE` LIKE 'LABOREX%' THEN (b.`int_HTTC`) ELSE 0 END) AS ACHATLABOREX,
SUM(CASE WHEN g.`str_LIBELLE` LIKE 'DPCI%' THEN (b.`int_HTTC`) ELSE 0 END) AS ACHATDPCI,
SUM(CASE WHEN g.`str_LIBELLE` LIKE 'COPHARMED%' THEN (b.`int_HTTC`) ELSE 0 END) AS ACHATCOPHARMED,
SUM(CASE WHEN g.`str_LIBELLE` LIKE 'TEDIS PHARMA%' THEN (b.`int_HTTC`) ELSE 0 END) AS ACHATTEDISPHARMA,
SUM(CASE WHEN (g.`str_LIBELLE` NOT LIKE 'TEDIS PHARMA%' AND g.`str_LIBELLE` NOT LIKE 'COPHARMED%' AND g.`str_LIBELLE` NOT LIKE 'LABOREX%' AND g.`str_LIBELLE` NOT LIKE 'DPCI%') THEN (b.`int_MHT`) ELSE 0 END) AS ACHATAUTRES
FROM  t_bon_livraison b,t_order o,t_grossiste g  WHERE o.`lg_ORDER_ID`=b.`lg_ORDER_ID` AND  o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`
 AND  DATE(b.`dt_DATE_LIVRAISON`) >=DATE(`dt_start`) AND DATE(b.`dt_DATE_LIVRAISON`)<=DATE(dt_end) AND b.str_STATUT='is_Closed'  GROUP BY DATE(b.`dt_DATE_LIVRAISON`)
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_tableaupharmacien_table
(
f_DATEOPERATION DATE PRIMARY KEY,
 f_CACOMPTANT NUMERIC(15) DEFAULT 0,
 f_CACREDIT NUMERIC(15) DEFAULT 0,
f_CAREMISE NUMERIC(12) DEFAULT 0,
f_NOMBRE NUMERIC(8)DEFAULT 0,
f_ACHATLABOREX NUMERIC(15) DEFAULT 0,
f_ACHATDPCI NUMERIC(15) DEFAULT 0,
f_ACHATCOPHARMED NUMERIC(15) DEFAULT 0,
f_ACHATTEDISPHARMA NUMERIC(15) DEFAULT 0,
f_ACHATAUTRES NUMERIC(15) DEFAULT 0,
f_VALEURACHAT NUMERIC(15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO DATEOPERATION,ACHATLABOREX,ACHATDPCI,ACHATCOPHARMED,ACHATTEDISPHARMA,ACHATAUTRES;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT COUNT(*) INTO CheckExists FROM emp_tableaupharmacien_table WHERE f_DATEOPERATION=DATEOPERATION;
IF(CheckExists>0)THEN 
UPDATE emp_tableaupharmacien_table SET f_ACHATLABOREX=ACHATLABOREX,f_ACHATDPCI=ACHATDPCI, f_ACHATCOPHARMED=ACHATCOPHARMED, f_ACHATTEDISPHARMA=ACHATTEDISPHARMA,f_ACHATAUTRES=ACHATAUTRES WHERE f_DATEOPERATION=DATEOPERATION;
ELSE
INSERT INTO emp_tableaupharmacien_table (f_DATEOPERATION,f_ACHATLABOREX,f_ACHATDPCI,f_ACHATCOPHARMED,f_ACHATTEDISPHARMA,f_ACHATAUTRES)
 VALUES (DATEOPERATION,ACHATLABOREX,ACHATDPCI,ACHATCOPHARMED,ACHATTEDISPHARMA,ACHATAUTRES);
END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_tableaupharmacienavoir
DELIMITER //
CREATE PROCEDURE `proc_tableaupharmacienavoir`(
        IN `dt_start` DATE,
        IN `dt_end` DATE
    )
BEGIN 
DECLARE DATEOPERATION DATE;
DECLARE VALEURACHAT NUMERIC(15);
DECLARE CheckExists INT DEFAULT 0;  
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR
SELECT DATE(d.`dt_UPDATED`) AS DATEOPERATION,SUM(d.`dl_AMOUNT`) FROM t_retour_fournisseur d WHERE 
DATE(d.`dt_UPDATED`)>=  DATE(`dt_start`) AND DATE(d.`dt_UPDATED`) <=DATE(dt_end) AND d.`str_REPONSE_FRS` <>'' AND d.`str_STATUT`='enable'
GROUP BY DATE(d.`dt_UPDATED`);

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
CREATE TEMPORARY TABLE IF NOT EXISTS emp_tableaupharmacien_table
(
f_DATEOPERATION DATE PRIMARY KEY,
 f_CACOMPTANT NUMERIC(15) DEFAULT 0,
 f_CACREDIT NUMERIC(15) DEFAULT 0,
f_CAREMISE NUMERIC(12) DEFAULT 0,
f_NOMBRE NUMERIC(8)DEFAULT 0,
f_ACHATLABOREX NUMERIC(15) DEFAULT 0,
f_ACHATDPCI NUMERIC(15) DEFAULT 0,
f_ACHATCOPHARMED NUMERIC(15) DEFAULT 0,
f_ACHATTEDISPHARMA NUMERIC(15) DEFAULT 0,
f_ACHATAUTRES NUMERIC(15) DEFAULT 0,
f_VALEURACHAT NUMERIC(15) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO DATEOPERATION,VALEURACHAT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT COUNT(*) INTO CheckExists FROM emp_tableaupharmacien_table WHERE f_DATEOPERATION=DATEOPERATION;
IF(CheckExists>0)THEN 
UPDATE emp_tableaupharmacien_table SET f_VALEURACHAT=VALEURACHAT WHERE f_DATEOPERATION=DATEOPERATION;
ELSE
INSERT INTO emp_tableaupharmacien_table (f_DATEOPERATION,f_VALEURACHAT)
 VALUES (DATEOPERATION,VALEURACHAT);
END IF;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_ug
DELIMITER //
CREATE PROCEDURE `proc_ug`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `search` VARCHAR(100),
        IN `lgGrossiste` VARCHAR(100)
    )
BEGIN 
DECLARE DATEOPERATION DATE;
DECLARE CIP VARCHAR(15);
DECLARE _NAME VARCHAR(100);
DECLARE BLREF VARCHAR(30);
DECLARE ID VARCHAR(30);
DECLARE PRIXVENTE NUMERIC(8);
DECLARE GROSSISTE VARCHAR(120);
DECLARE PRIXACHAT NUMERIC(8);
DECLARE QTY NUMERIC(8);
DECLARE QTY2 NUMERIC(8);
DECLARE QTYF NUMERIC(8);
DECLARE MONTANT NUMERIC(12);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT f.`int_CIP`,f.`str_NAME`,SUM( bd.`int_QTE_UG`),b.`str_REF_LIVRAISON`,bd.`int_PRIX_VENTE`,b.`dt_UPDATED`,f.`lg_FAMILLE_ID`,g.`str_LIBELLE` , bd.`int_PAF`  FROM `t_bon_livraison_detail` bd,`t_bon_livraison` b,`t_order` o,`t_famille` f, `t_grossiste`  g  WHERE b.`lg_BON_LIVRAISON_ID`= bd.lg_BON_LIVRAISON_ID AND o.`lg_ORDER_ID`=b.`lg_ORDER_ID` AND f.`lg_FAMILLE_ID`=bd.`lg_FAMILLE_ID` AND g.`lg_GROSSISTE_ID`=o.`lg_GROSSISTE_ID`  AND (o.`str_REF_ORDER` LIKE `search` OR b.`str_REF_LIVRAISON`LIKE `search` OR f.`str_NAME` LIKE `search` OR f.`int_CIP` LIKE `search` ) AND bd.`lg_GROSSISTE_ID` LIKE `lgGrossiste` AND b.`str_STATUT` ='is_Closed' AND `bd`.`str_STATUT` ='is_Closed' AND  o.`str_STATUT`='is_Closed' AND `bd`.`int_QTE_UG` >0 AND DATE(b.`dt_UPDATED`)>=`dt_start` AND DATE(b.`dt_UPDATED`) <=`dt_end` GROUP BY f.`int_CIP`,f.`str_NAME`,b.`str_REF_LIVRAISON`;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_ug_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_ug_table
(
ID int PRIMARY KEY AUTO_INCREMENT ,
CIP VARCHAR(30),
f_NAME VARCHAR(200) DEFAULT 0,
  BLREF VARCHAR(30),
 PRIXVENTE NUMERIC(8) DEFAULT 0,

 VALEURVENTE NUMERIC(12) DEFAULT 0,
 QTY NUMERIC(8) DEFAULT 0,
 GROSSISTE VARCHAR(100),
QTYINI NUMERIC(8)DEFAULT 0,
VALEURQTYINI NUMERIC(12)DEFAULT 0,
VALEURACHAT NUMERIC(12)DEFAULT 0,
PRIXA NUMERIC(8) DEFAULT 0
);
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO CIP,_NAME,QTY,BLREF,PRIXVENTE,DATEOPERATION,ID,GROSSISTE,PRIXACHAT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT  IFNULL( SUM( d.`int_QUANTITY`),0) INTO QTY2  FROM t_preenregistrement_detail d,t_preenregistrement p WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`  
                    AND p.`lg_TYPE_VENTE_ID` <>'5' AND p.`lg_TYPE_VENTE_ID` <>'4' AND d.`lg_FAMILLE_ID` = ID
                   AND d.`dt_UPDATED`> DATEOPERATION;
IF(QTY-QTY2>0) THEN 
SET QTYF=QTY-QTY2;
SET MONTANT=(PRIXVENTE*(QTY-QTY2));
ELSE
SET QTYF=0;
SET MONTANT=0;
END IF;


INSERT INTO emp_ug_table (CIP,f_NAME,BLREF,PRIXVENTE,VALEURVENTE,QTY,GROSSISTE,QTYINI,VALEURQTYINI,VALEURACHAT,PRIXA)
 VALUES (CIP,_NAME,BLREF,PRIXVENTE,MONTANT,QTYF,GROSSISTE,QTY,PRIXVENTE*QTY,PRIXACHAT*QTY,PRIXACHAT);


END LOOP bl_loop;
 CLOSE curbl;

SELECT * FROM emp_ug_table ORDER BY GROSSISTE ASC,f_NAME ASC; 




END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_data_retourfournisseur
DELIMITER //
CREATE PROCEDURE `proc_update_data_retourfournisseur`()
BEGIN 
DECLARE LGBONLIVRAISONDETAIL VARCHAR(40);
DECLARE LGBONLIVRAISONID VARCHAR(40);
DECLARE LGFAMILLEID VARCHAR(40);
DECLARE INTPAF INT(11);
DECLARE INTNUMBERRETURN INT(11);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT bl.int_PAF, t.int_NUMBER_RETURN, bl.lg_BON_LIVRAISON_DETAIL, bl.lg_BON_LIVRAISON_ID, bl.lg_FAMILLE_ID
FROM t_retour_fournisseur_detail t, t_retour_fournisseur r, t_bon_livraison_detail bl
WHERE t.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND t.lg_FAMILLE_ID = bl.lg_FAMILLE_ID
AND r.str_REPONSE_FRS IS NOT NULL AND r.str_REPONSE_FRS NOT LIKE '';

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;


OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTPAF,INTNUMBERRETURN,LGBONLIVRAISONDETAIL,LGBONLIVRAISONID,LGFAMILLEID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 UPDATE t_bon_livraison_detail t SET t.int_QTE_RETURN = INTNUMBERRETURN;
 UPDATE t_retour_fournisseur_detail t, t_retour_fournisseur r SET t.int_PAF = INTPAF, t.int_NUMBER_ANSWER = INTNUMBERRETURN 
 WHERE t.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND r.lg_BON_LIVRAISON_ID = LGBONLIVRAISONID AND t.lg_FAMILLE_ID = LGFAMILLEID;
 
END LOOP bl_loop;
 CLOSE curbl;
 COMMIT;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_facture
DELIMITER //
CREATE PROCEDURE `proc_update_facture`()
BEGIN 
DECLARE LGFACTUREID VARCHAR(40) DEFAULT '';
DECLARE STRCODEFACTURE VARCHAR(80) DEFAULT '';
DECLARE STRVALUE VARCHAR(40) DEFAULT '';
DECLARE COUNTER INT(11) DEFAULT 0;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT t.lg_FACTURE_ID, t.str_CODE_FACTURE FROM t_facture t;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

SELECT pa.str_VALUE INTO STRVALUE FROM t_parameters pa WHERE pa.str_KEY = 'KEY_CODE_FACTURE';

DROP TEMPORARY TABLE IF EXISTS temp_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS temp_table
(
f_LGFACTUREID VARCHAR(40) PRIMARY KEY,
f_STRCODEFACTURE VARCHAR(80) DEFAULT '');

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFACTUREID,STRCODEFACTURE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT COUNT(f.lg_FACTURE_ID) INTO COUNTER FROM t_facture f WHERE f.str_CODE_FACTURE = STRCODEFACTURE AND f.lg_FACTURE_ID != LGFACTUREID;
IF(COUNTER > 0) THEN 

INSERT INTO temp_table VALUES (LGFACTUREID,STRCODEFACTURE);

CALL proc_update_facturedetail(LGFACTUREID,CAST(STRVALUE AS CHAR));

UPDATE t_parameters t SET t.str_VALUE = CAST(t.str_VALUE AS CHAR)+ 1 WHERE t.str_KEY = 'KEY_CODE_FACTURE';

COMMIT;

SELECT pa.str_VALUE INTO STRVALUE FROM t_parameters pa WHERE pa.str_KEY = 'KEY_CODE_FACTURE';

END IF;

END LOOP bl_loop;
 CLOSE curbl;
 
 SELECT * FROM temp_table;
 
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_facturedetail
DELIMITER //
CREATE PROCEDURE `proc_update_facturedetail`(
        IN `lgFACTUREID` VARCHAR(40),
        IN `strVALUE` INTEGER
    )
BEGIN 
DECLARE LGFACTURECHILDID VARCHAR(40) DEFAULT '';
DECLARE NOMBRE INT(11) DEFAULT 1;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT t.lg_FACTURE_ID FROM t_facture t WHERE t.str_PERE = lgFACTUREID;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFACTURECHILDID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

UPDATE t_facture t SET t.str_CODE_FACTURE = CONCAT(strVALUE,'/',NOMBRE) WHERE t.lg_FACTURE_ID = LGFACTURECHILDID;
SET NOMBRE = NOMBRE + 1;

END LOOP bl_loop;
 CLOSE curbl;
 

 
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_entreestock
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_entreestock`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGUSERID` VARCHAR(40),
        IN `lg_BON_LIVRAISON_ID` VARCHAR(40)
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(8);
DECLARE  lgFAMILLEID VARCHAR(40);
declare nbligne int default 0;


DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT d.lg_FAMILLE_ID,d.int_QTE_RECUE FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID=`lg_BON_LIVRAISON_ID`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID, INTQUANTITYSERVED;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = `LGUSERID`
	WHERE t.lg_FAMILLE_ID = lgFAMILLEID AND DATE(t.dt_DAY) = current_date()
	AND t.str_TYPE_ACTION = 'ADD' AND t.str_ACTION = 'ENTREESTOCK';
SELECT row_count() into nbligne;
IF nbligne=0 then 
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),lgFAMILLEID,`LGUSERID`,'',
	'ADD','ENTREESTOCK',current_date(),NOW(),NOW(),'enable', INTQUANTITYSERVED,1,`LGEMPLACEMENTID`);

END IF;
 
END LOOP bl_loop;
CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(40);
DECLARE INTCIP VARCHAR(20);
DECLARE STRDESCRIPTION TEXT;
DECLARE DTLASTMOUVEMENT DATETIME;
DECLARE LGEMPLACEMENTID VARCHAR(40);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.lg_FAMILLE_ID, t.int_CIP, t.str_DESCRIPTION, t.dt_LAST_MOUVEMENT, m.lg_EMPLACEMENT_ID
FROM t_famille t, t_mouvement_snapshot m WHERE t.lg_FAMILLE_ID = m.lg_FAMILLE_ID AND m.dt_DAY = DATE(NOW());

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;


OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID, INTCIP, STRDESCRIPTION, DTLASTMOUVEMENT,LGEMPLACEMENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 

CALL proc_update_mouvement_product_ajustement(LGEMPLACEMENTID, LGFAMILLEID, DTLASTMOUVEMENT);
CALL proc_update_mouvement_product_perime(LGEMPLACEMENTID, LGFAMILLEID, DTLASTMOUVEMENT);

CALL proc_update_mouvement_product_retourfournisseur('1', LGFAMILLEID, DTLASTMOUVEMENT);

 CALL proc_update_mouvement_product_retourdepot(LGEMPLACEMENTID, LGFAMILLEID, DTLASTMOUVEMENT);
 

END LOOP bl_loop;
 CLOSE curbl;
 

COMMIT;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_ajustement
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_ajustement`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_NUMBER, t.dt_UPDATED, p.lg_USER_ID
FROM t_ajustement_detail t, t_famille f, t_ajustement p, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.lg_AJUSTEMENT_ID = t.lg_AJUSTEMENT_ID 
AND t.lg_FAMILLE_ID = LGFAMILLEID AND p.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID = LGEMPLACEMENTID 
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'enable' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = (CASE WHEN INTQUANTITYSERVED < 0 THEN 'REMOVE' ELSE 'ADD' END)
AND t.str_ACTION = 'AJUSTEMENT';

IF COUNTER = 0 THEN 
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	(CASE WHEN INTQUANTITYSERVED < 0 THEN 'REMOVE' ELSE 'ADD' END),'AJUSTEMENT',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable',
	INTQUANTITYSERVED,1,LGEMPLACEMENTID);
		SET DOUPDATE = TRUE;
ELSE 
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = (CASE WHEN INTQUANTITYSERVED < 0 THEN 'REMOVE' ELSE 'ADD' END) AND t.str_ACTION = 'AJUSTEMENT';
		SET DOUPDATE = TRUE;
END IF;


 
END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_deconditionnement
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_deconditionnement`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE DECONDITIONNE TINYINT;
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_NUMBER, t.dt_CREATED, t.lg_USER_ID, f.bool_DECONDITIONNE
FROM t_deconditionnement t, t_famille f, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_FAMILLE_ID = LGFAMILLEID AND t.lg_USER_ID = u.lg_USER_ID 
AND u.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND t.dt_CREATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'enable' ORDER BY t.dt_CREATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID, DECONDITIONNE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = (CASE WHEN DECONDITIONNE = true THEN 'ADD' ELSE 'REMOVE' END)
AND t.str_ACTION = 'DECONDITIONNEMENT';

IF COUNTER = 0 THEN 
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	(CASE WHEN DECONDITIONNE = true THEN 'ADD' ELSE 'REMOVE' END),'DECONDITIONNEMENT',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable',
	INTQUANTITYSERVED,1,LGEMPLACEMENTID);
SET DOUPDATE = TRUE;
ELSE 
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = (CASE WHEN DECONDITIONNE = true THEN 'ADD' ELSE 'REMOVE' END) AND t.str_ACTION = 'DECONDITIONNEMENT';
	SET DOUPDATE = TRUE;
END IF;


END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_entreestock
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_entreestock`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_QTE_RECUE, t.dt_UPDATED, b.lg_USER_ID
FROM t_bon_livraison_detail t, t_famille f, t_bon_livraison b, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND b.lg_BON_LIVRAISON_ID = t.lg_BON_LIVRAISON_ID 
AND t.lg_FAMILLE_ID = LGFAMILLEID AND b.lg_USER_ID = u.lg_USER_ID 
AND u.lg_EMPLACEMENT_ID = LGEMPLACEMENTID 
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'is_Closed' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = 'ADD' AND t.str_ACTION = 'ENTREESTOCK';

IF COUNTER = 0 THEN 
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	'ADD','ENTREESTOCK',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable', INTQUANTITYSERVED,1,LGEMPLACEMENTID);
SET DOUPDATE = TRUE;
ELSE 
	
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = 'ADD' AND t.str_ACTION = 'ENTREESTOCK';
	SET DOUPDATE = TRUE;
END IF;


 
END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;



END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_entreestock_depot
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_entreestock_depot`(
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE LGEMPLACEMENTID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_QUANTITY_SERVED, t.dt_UPDATED, p.lg_USER_ID, e.lg_EMPLACEMENT_ID
FROM t_preenregistrement_detail t, t_famille f, t_preenregistrement p, t_cash_transaction c, t_emplacement e
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
AND p.lg_PREENREGISTREMENT_ID = c.str_RESSOURCE_REF AND e.lg_COMPTE_CLIENT_ID = c.str_REF_COMPTE_CLIENT
AND t.lg_FAMILLE_ID = LGFAMILLEID
AND p.lg_TYPE_VENTE_ID = '5' AND t.str_STATUT = 'is_Closed' 
AND t.dt_UPDATED >= DTLASTMOUVEMENT ORDER BY t.dt_UPDATED;


DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID, LGEMPLACEMENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = 'ADD' AND t.str_ACTION = 'ENTREESTOCK';

IF COUNTER = 0 THEN 
	
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'','ADD','ENTREESTOCK',DATE(DTUPDATED),DTUPDATED,DTUPDATED,
	'enable',INTQUANTITYSERVED,1,LGEMPLACEMENTID);
SET DOUPDATE = TRUE;
ELSE 
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = 'ADD' AND t.str_ACTION = 'ENTREESTOCK';
	SET DOUPDATE = TRUE;
END IF;

 
END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_perime
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_perime`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_NUMBER_DELETE, t.dt_UPDATED, t.lg_USER_ID
FROM t_warehouse t, t_famille f, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_FAMILLE_ID = LGFAMILLEID AND t.lg_USER_ID = u.lg_USER_ID 
AND u.lg_EMPLACEMENT_ID = LGEMPLACEMENTID 
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'delete' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = 'REMOVE' AND t.str_ACTION = 'PERIME';

IF COUNTER = 0 THEN 
	
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	'REMOVE','PERIME',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable', INTQUANTITYSERVED,1,LGEMPLACEMENTID);
SET DOUPDATE = TRUE;
ELSE 
	
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = 'REMOVE' AND t.str_ACTION = 'PERIME';
	SET DOUPDATE = TRUE;
END IF;

END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_retourdepot
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_retourdepot`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_NUMBER_RETURN, t.dt_UPDATED, r.lg_USER_ID
FROM t_retourdepotdetail t, t_famille f, t_retourdepot r, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_RETOURDEPOT_ID = r.lg_RETOURDEPOT_ID 
AND u.lg_USER_ID = r.lg_USER_ID AND t.lg_FAMILLE_ID = LGFAMILLEID AND r.lg_EMPLACEMENT_ID = LGEMPLACEMENTID
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'is_Closed' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = (CASE WHEN LGEMPLACEMENTID = 1 THEN 'ADD' ELSE 'REMOVE' END)  
AND t.str_ACTION = (CASE WHEN LGEMPLACEMENTID = 1 THEN 'ENTREESTOCK' ELSE 'RETOURFOURNISSEUR' END);

IF COUNTER = 0 THEN 
	
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	(CASE WHEN LGEMPLACEMENTID = 1 THEN 'ADD' ELSE 'REMOVE' END),
	(CASE WHEN LGEMPLACEMENTID = 1 THEN 'ENTREESTOCK' ELSE 'RETOURFOURNISSEUR' END),
	DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable', INTQUANTITYSERVED,1,LGEMPLACEMENTID);
SET DOUPDATE = TRUE;
ELSE 
	
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = (CASE WHEN LGEMPLACEMENTID = 1 THEN 'ADD' ELSE 'REMOVE' END) 
	AND t.str_ACTION = (CASE WHEN LGEMPLACEMENTID = 1 THEN 'ENTREESTOCK' ELSE 'RETOURFOURNISSEUR' END);
	SET DOUPDATE = TRUE;
END IF;
 
END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_retourfournisseur
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_retourfournisseur`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_NUMBER_RETURN, t.dt_UPDATED, r.lg_USER_ID
FROM t_retour_fournisseur_detail t, t_famille f, t_retour_fournisseur r
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND t.lg_FAMILLE_ID = LGFAMILLEID 
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'enable' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = 'REMOVE' AND t.str_ACTION = 'RETOURFOURNISSEUR';

IF COUNTER = 0 THEN 
	
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	'REMOVE','RETOURFOURNISSEUR',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable', INTQUANTITYSERVED,1,LGEMPLACEMENTID);
SET DOUPDATE = TRUE;
ELSE 
	
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = 'REMOVE' AND t.str_ACTION = 'RETOURFOURNISSEUR';
	SET DOUPDATE = TRUE;
END IF;

 
END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_vente
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_vente`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_QUANTITY_SERVED, t.dt_UPDATED, p.lg_USER_ID
FROM t_preenregistrement_detail t, t_famille f, t_preenregistrement p, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID 
AND t.lg_FAMILLE_ID = LGFAMILLEID AND p.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID = LGEMPLACEMENTID 
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'is_Closed' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = (CASE WHEN INTQUANTITYSERVED > 0 THEN 'REMOVE' ELSE 'ADD' END)
AND t.str_ACTION = 'VENTE';

IF COUNTER = 0 THEN 
	
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	(CASE WHEN INTQUANTITYSERVED > 0 THEN 'REMOVE' ELSE 'ADD' END),'VENTE',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable',
	INTQUANTITYSERVED,1,LGEMPLACEMENTID);
		SET DOUPDATE = TRUE;
ELSE 
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = (CASE WHEN INTQUANTITYSERVED > 0 THEN 'REMOVE' ELSE 'ADD' END) AND t.str_ACTION = 'VENTE';
	SET DOUPDATE = TRUE;
END IF;

END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_mouvement_product_vente2
DELIMITER //
CREATE PROCEDURE `proc_update_mouvement_product_vente2`(
        IN `LGEMPLACEMENTID` VARCHAR(40),
        IN `LGFAMILLEID` VARCHAR(40),
        IN `DTLASTMOUVEMENT` DATETIME
    )
BEGIN 
DECLARE INTQUANTITYSERVED INT(11);
DECLARE DTUPDATED DATETIME;
DECLARE LGUSERID VARCHAR(40);
DECLARE COUNTER INT(11);
DECLARE DOUPDATE TINYINT(4) DEFAULT FALSE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.int_QUANTITY_SERVED, t.dt_UPDATED, p.lg_USER_ID
FROM t_preenregistrement_detail t, t_famille f, t_preenregistrement p, t_user u
WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID 
AND t.lg_FAMILLE_ID = LGFAMILLEID AND p.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID = LGEMPLACEMENTID 
AND t.dt_UPDATED >= DTLASTMOUVEMENT AND t.str_STATUT = 'is_Closed' ORDER BY t.dt_UPDATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;



OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTQUANTITYSERVED, DTUPDATED, LGUSERID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
SELECT COUNT(t.lg_MOUVEMENT_ID) INTO COUNTER FROM t_mouvement t WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND t.str_STATUT = 'enable'
AND t.lg_EMPLACEMENT_ID = LGEMPLACEMENTID AND DATE(t.dt_DAY) = DATE(NOW()) 
AND t.str_TYPE_ACTION = (CASE WHEN INTQUANTITYSERVED > 0 THEN 'REMOVE' ELSE 'ADD' END)
AND t.str_ACTION = 'VENTE';

IF COUNTER = 0 THEN 
	
	INSERT INTO t_mouvement VALUES (REPLACE(UUID(),'-',''),LGFAMILLEID,LGUSERID,'',
	(CASE WHEN INTQUANTITYSERVED > 0 THEN 'REMOVE' ELSE 'ADD' END),'VENTE',DATE(DTUPDATED),DTUPDATED,DTUPDATED,'enable',
	INTQUANTITYSERVED,1,LGEMPLACEMENTID);
		SET DOUPDATE = TRUE;
ELSE 
	UPDATE t_mouvement t SET t.int_NUMBER = t.int_NUMBER + INTQUANTITYSERVED,t.int_NUMBERTRANSACTION = t.int_NUMBERTRANSACTION + 1, 
	t.dt_UPDATED = NOW(),t.lg_USER_ID = LGUSERID 
	WHERE t.lg_FAMILLE_ID = LGFAMILLEID AND DATE(t.dt_DAY) = DATE(DTUPDATED) 
	AND t.str_TYPE_ACTION = (CASE WHEN INTQUANTITYSERVED > 0 THEN 'REMOVE' ELSE 'ADD' END) AND t.str_ACTION = 'VENTE';
	SET DOUPDATE = TRUE;
END IF;

END LOOP bl_loop;
CLOSE curbl;

IF DOUPDATE = TRUE THEN
UPDATE t_famille t SET t.dt_LAST_MOUVEMENT = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
END IF;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_price_famillegrossiste
DELIMITER //
CREATE PROCEDURE `proc_update_price_famillegrossiste`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(40);
DECLARE INTPRICE INT(11) DEFAULT 0;
DECLARE INTPAF INT(11) DEFAULT 0;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT DISTINCT(t.lg_FAMILLE_ID), t.int_PRICE, t.int_PAF 
FROM t_famille t, t_famille_grossiste fg WHERE t.lg_FAMILLE_ID = fg.lg_FAMILLE_ID 
AND t.str_STATUT = 'enable'
ORDER BY t.str_DESCRIPTION;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGFAMILLEID, INTPRICE, INTPAF;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
UPDATE t_famille_grossiste t SET t.int_PRICE = INTPRICE, t.int_PAF = INTPAF
WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
 
END LOOP bl_loop;
CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_product_in_snapshot_famillesell
DELIMITER //
CREATE PROCEDURE `proc_update_product_in_snapshot_famillesell`(
        IN `lg_FAMILLE_ID` VARCHAR(40),
        IN `int_QUANTITY` INTEGER,
        IN `int_MONTH` INTEGER,
        IN `int_YEAR` INTEGER
    )
BEGIN
	IF int_MONTH = 1 THEN
		UPDATE t_snapshot_famillesell t SET t.int_NUMBER_JANUARY = t.int_NUMBER_JANUARY + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 2 THEN
	UPDATE t_snapshot_famillesell t SET t.int_NUMBER_FEBRUARY = t.int_NUMBER_FEBRUARY + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 3 THEN
		UPDATE t_snapshot_famillesell t SET t.int_NUMBER_MARCH = t.int_NUMBER_MARCH + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 4 THEN
		UPDATE t_snapshot_famillesell t SET t.int_NUMBER_APRIL = t.int_NUMBER_APRIL + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 5 THEN
UPDATE t_snapshot_famillesell t SET t.int_NUMBER_MAY = t.int_NUMBER_MAY + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 6 THEN
	UPDATE t_snapshot_famillesell t SET t.int_NUMBER_JUNE = t.int_NUMBER_JUNE + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 7 THEN
	UPDATE t_snapshot_famillesell t SET t.int_NUMBER_JULY = t.int_NUMBER_JULY + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 8 THEN
		UPDATE t_snapshot_famillesell t SET t.int_NUMBER_AUGUST = t.int_NUMBER_AUGUST + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 9 THEN
	UPDATE t_snapshot_famillesell t SET t.int_NUMBER_SEPTEMBER = t.int_NUMBER_SEPTEMBER + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 10 THEN
		UPDATE t_snapshot_famillesell t SET t.int_NUMBER_OCTOBER = t.int_NUMBER_OCTOBER + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 11 THEN
	UPDATE t_snapshot_famillesell t SET t.int_NUMBER_NOVEMBER = t.int_NUMBER_NOVEMBER + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	ELSEIF int_MONTH = 12 THEN
		UPDATE t_snapshot_famillesell t SET t.int_NUMBER_DECEMBER = t.int_NUMBER_DECEMBER + int_QUANTITY,
		t.dt_UPDATED = NOW() WHERE t.lg_FAMILLE_ID = lg_FAMILLE_ID AND t.int_YEAR = int_YEAR;
	END IF;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_ref_bon
DELIMITER //
CREATE PROCEDURE `proc_update_ref_bon`()
BEGIN 
DECLARE LGPREENREGISTREMENTID VARCHAR(40);
DECLARE STRREFBON VARCHAR(80);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT t.lg_PREENREGISTREMENT_ID, t.str_REF_BON 
FROM t_preenregistrement t, t_preenregistrement_compte_client_tiers_payent tp
WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND t.str_TYPE_VENTE = 'VO'
AND t.str_STATUT = 'is_Closed' AND tp.str_STATUT = 'is_Closed' AND tp.str_REF_BON = ''
GROUP BY t.lg_PREENREGISTREMENT_ID;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO LGPREENREGISTREMENTID, STRREFBON;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 	UPDATE t_preenregistrement_compte_client_tiers_payent t set t.str_REF_BON = STRREFBON 
   WHERE t.lg_PREENREGISTREMENT_ID = LGPREENREGISTREMENTID;
 
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_snapshot_daily_stat
DELIMITER //
CREATE PROCEDURE `proc_update_snapshot_daily_stat`()
BEGIN 
DECLARE PKEY VARCHAR(40);
DECLARE LG_USER_ID VARCHAR(40);
DECLARE DATEOPERATION DATE;
DECLARE VENDEUR VARCHAR(40);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT DATE_FORMAT(o.`dt_CREATED`,'%Y-%m/%d %H') AS DATEOP, o.`lg_PREENREGISTREMENT_ID`, o.`lg_USER_VENDEUR_ID`,o.`lg_USER_ID`  FROM t_preenregistrement o WHERE o.`int_PRICE` >0 AND o.`b_IS_CANCEL`=0 AND o.`str_STATUT`='is_Closed';

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO DATEOPERATION,PKEY,VENDEUR,LG_USER_ID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE t_snap_shop_daly_stat SET `str_PKEY`=PKEY,`lg_USER_ID`=VENDEUR WHERE DATE_FORMAT(`dt_CREATED`,'%Y-%m/%d %H')=DATEOPERATION AND `lg_USER_ID`=LG_USER_ID;
END LOOP bl_loop;
 CLOSE curbl;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_snapshot_famillesell
DELIMITER //
CREATE PROCEDURE `proc_update_snapshot_famillesell`(
        IN `lg_FAMILLE_ID` VARCHAR(40)
    )
BEGIN 
DECLARE INTYEAR NUMERIC(12);
DECLARE INTMONTH NUMERIC(12);
DECLARE INTQUANTITY NUMERIC(12);

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

SELECT YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED), SUM(int_QUANTITY_SERVED)
FROM t_preenregistrement_detail t, t_preenregistrement p 
WHERE t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND t.lg_FAMILLE_ID LIKE lg_FAMILLE_ID
AND p.str_STATUT = 'is_closed' AND p.int_PRICE >= 0 AND p.b_IS_CANCEL = 0
GROUP BY YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED)
ORDER BY YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED);

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO INTYEAR, INTMONTH, INTQUANTITY;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
 
 CALL proc_save_product_in_snapsnot_famillesell(lg_FAMILLE_ID,INTQUANTITY, INTMONTH, INTYEAR);
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;


END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_stock_hours
DELIMITER //
CREATE PROCEDURE `proc_update_stock_hours`()
BEGIN 

DECLARE familleId VARCHAR(40);
DECLARE magasin VARCHAR(40);
DECLARE prixPaf NUMERIC(10);
DECLARE prixTarif NUMERIC(10);
DECLARE prixUni NUMERIC(10);
DECLARE pmp NUMERIC(10);
DECLARE qty NUMERIC(6);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT s.lg_FAMILLE_ID,s.int_NUMBER_AVAILABLE,s.lg_EMPLACEMENT_ID,f.int_PRICE,f.int_PAF,f.int_PAT FROM t_famille_stock s,t_famille f WHERE 
s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND
DATE(s.dt_UPDATED) =CURRENT_DATE() AND MINUTE(s.dt_UPDATED) =
MINUTE(CURRENT_TIMESTAMP)-30 AND f.str_STATUT='enable' AND s.str_STATUT='enable';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO familleId,qty,magasin,prixUni,prixPaf,prixTarif;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE t_stock_snapshot SET `prixPaf`=prixPaf,`prixTarif`=prixTarif,`prixUni`=prixUni,`qty`=qty
WHERE `id` = CURRENT_DATE() AND `magasin`=magasin AND `familleId`=familleId;

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_stock_snaps
DELIMITER //
CREATE PROCEDURE `proc_update_stock_snaps`()
BEGIN 

DECLARE familleId VARCHAR(40);
DECLARE magasin VARCHAR(40);
DECLARE prixPaf NUMERIC(10);
DECLARE prixTarif NUMERIC(10);
DECLARE prixUni NUMERIC(10);
DECLARE pmp NUMERIC(10);
DECLARE qty NUMERIC(6);
DECLARE valeurTva NUMERIC(6);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT f.lg_FAMILLE_ID,c.int_VALUE,s.int_NUMBER_AVAILABLE,s.lg_EMPLACEMENT_ID,f.int_PRICE,
f.int_PAF,f.int_PAT,f.dbl_PRIX_MOYEN_PONDERE FROM t_famille f,t_famille_stock s,t_code_tva c,t_emplacement e WHERE f.lg_FAMILLE_ID=s.lg_FAMILLE_ID AND c.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID
AND e.lg_EMPLACEMENT_ID=s.lg_EMPLACEMENT_ID AND f.str_STATUT='enable' AND s.str_STATUT='enable';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO familleId,valeurTva,qty,magasin,prixUni,prixPaf,prixTarif,pmp;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT IGNORE INTO t_stock_snapshot (id, `prixPaf`, `magasin`,  `prixTarif`, `prixUni`, qty, valeurTva, `familleId`,`prix_moyent_pondere`) 
	VALUES (( CURRENT_DATE()),prixPaf,magasin,prixTarif,prixUni,qty,valeurTva,familleId,pmp);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_stock_vendu_aux_depots
DELIMITER //
CREATE PROCEDURE `proc_update_stock_vendu_aux_depots`(IN dateDebut date,IN dateFin date,IN depotsIds varchar(255), OUT nombreLigne int)
BEGIN
    DECLARE produitId VARCHAR(50);

    DECLARE quantity_on_hand INT(8);
    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
     SELECT  SUM(d.int_QUANTITY),d.lg_FAMILLE_ID FROM  t_preenregistrement p,t_preenregistrement_detail d
     WHERE p.PK_BRAND  =depotsIds
     AND p.lg_TYPE_VENTE_ID='5' AND p.str_STATUT='is_Closed' AND p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID
    AND date(p.dt_UPDATED) BETWEEN dateDebut AND dateFin GROUP BY  d.lg_FAMILLE_ID;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    SET nombreLigne = 0;
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO quantity_on_hand,produitId;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

        UPDATE t_famille_stock st
        SET st.int_NUMBER_AVAILABLE=st.int_NUMBER_AVAILABLE-quantity_on_hand,
            st.int_NUMBER=st.int_NUMBER_AVAILABLE,
           st.dt_CREATED= now()
        WHERE st.lg_FAMILLE_ID = produitId
          AND st.lg_EMPLACEMENT_ID = '1';
        SET nombreLigne = nombreLigne + 1;
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_update_vente_reglement_amount_non_ca
DELIMITER //
CREATE PROCEDURE `proc_update_vente_reglement_amount_non_ca`()
BEGIN
    DECLARE venteId VARCHAR(50);

    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
     SELECT distinct vr.vente_id from  vente_reglement vr  join t_preenregistrement_detail d on vr.vente_id=d.lg_PREENREGISTREMENT_ID join t_famille f on f.lg_FAMILLE_ID=d.lg_FAMILLE_ID WHERE d.bool_ACCOUNT IS FALSE AND f.bool_ACCOUNT IS FALSE;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO venteId;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

        UPDATE  vente_reglement vr set vr.amount_non_ca=  ( SELECT sum(p.int_PRICE) FROM t_preenregistrement_detail p where p.lg_PREENREGISTREMENT_ID=venteId AND p.bool_ACCOUNT IS FALSE) WHERE vr.vente_id=venteId;
       
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updateaccount_mvt
DELIMITER //
CREATE PROCEDURE `proc_updateaccount_mvt`(IN dtStart DATE, IN dtEnd DATE)
BEGIN 
DECLARE idMvt VARCHAR(40);
DECLARE montant NUMERIC(10);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

select g.uuid,g.montantNet from mvttransaction g 
where g.montantAcc =0 AND g.typeTransaction=0  AND g.typeReglementId='1' AND g.montantRemise=0
AND g.mvtdate BETWEEN dtStart and dtEnd;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO idMvt,montant;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE mvttransaction set montantAcc=montantNet WHERE uuid=idMvt;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updateAEN
DELIMITER //
CREATE PROCEDURE `proc_updateAEN`(
   

 )
BEGIN 
DECLARE vCIP VARCHAR(20);
DECLARE vAEN VARCHAR(20);
DECLARE myCOUNTER int(8) DEFAULT '0';
DECLARE isExits int(8) DEFAULT '0';
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT cip,ean FROM article;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO vCIP,vAEN;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO isExits FROM t_famille WHERE int_CIP=vCIP;
IF isExits >0 THEN

UPDATE  t_famille SET int_EAN13 =vAEN WHERE  int_CIP=vCIP;
SET myCOUNTER=myCOUNTER+1;
END IF;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

SELECT myCOUNTER;
 

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatemvtrans
DELIMITER //
CREATE PROCEDURE `proc_updatemvtrans`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE VENDEUR VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE lgTYPEVENTEID VARCHAR(40);
DECLARE lgTYPEREGLEMENTID VARCHAR(40);
DECLARE typeMvt VARCHAR(10);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE EMPLACEMENT VARCHAR(40);
DECLARE intPRICE NUMERIC(10);
DECLARE MONTANTPAYE NUMERIC(10);
DECLARE MONTANTRECU NUMERIC(10);
DECLARE MONTANTCREDIT NUMERIC(10);
DECLARE intPRICEREMISE NUMERIC(10);
DECLARE intCUSTPART NUMERIC(10);
DECLARE categorie INT(1) DEFAULT 1;
DECLARE typetransac INT(1);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT distinct p.lg_PREENREGISTREMENT_ID,p.int_PRICE,p.int_PRICE_REMISE,p.int_CUST_PART,p.lg_TYPE_VENTE_ID,p.lg_USER_ID,p.lg_USER_VENDEUR_ID
,p.dt_UPDATED,p.str_REF,c.lg_TYPE_REGLEMENT_ID,c.int_AMOUNT_CREDIT,c.int_AMOUNT_RECU,e.lg_EMPLACEMENT_ID
 FROM t_preenregistrement p,t_cash_transaction c,t_user u,t_emplacement e WHERE p.str_STATUT ='is_Closed' AND p.b_IS_CANCEL=FALSE AND p.int_PRICE >0 AND c.int_AMOUNT >=0
 AND c.str_RESSOURCE_REF=p.lg_PREENREGISTREMENT_ID AND c.lg_USER_ID=u.lg_USER_ID AND p.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=e.lg_EMPLACEMENT_ID AND p.lg_TYPE_VENTE_ID <>'5';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,intPRICE,intPRICEREMISE,intCUSTPART,lgTYPEVENTEID,lgUSERID,VENDEUR,dtUPDATED,strREF,lgTYPEREGLEMENTID,MONTANTPAYE,MONTANTRECU,EMPLACEMENT;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
IF lgTYPEVENTEID ='1' || lgTYPEVENTEID='4' THEN 
SET typetransac=0;
SET typeMvt='9';
SET MONTANTCREDIT=0;
ELSE
SET typetransac=1;
SET typeMvt='8';
SET MONTANTCREDIT=intPRICE-(intCUSTPART-intPRICEREMISE);
IF lgTYPEVENTEID='3' THEN
SET MONTANTPAYE=0;
SET MONTANTRECU=0;
SET MONTANTCREDIT=intPRICE-intPRICEREMISE;
END IF;
END IF;

INSERT IGNORE INTO mvttransaction (uuid, `createdAt`, `MONTANT`, `MONTANTCREDIT`, `MONTANTREGLE`, `MONTANTRESTANT`, mvtdate, caisse, `typeTransaction`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantRemise`, `montantNet`, `MONTANTVERSE`, pkey, categorie, `avoidAmount`, `checked`, `montantPaye`, `montantTva`, marge, reference, organisme) 
	VALUES (UUID(), dtUPDATED, intPRICE, MONTANTCREDIT, MONTANTPAYE, 0, dtUPDATED, lgUSERID, typetransac, NULL, EMPLACEMENT, lgTYPEREGLEMENTID, typeMvt, lgUSERID, intPRICEREMISE, intPRICE-intPRICEREMISE, MONTANTRECU, lgPREENREGISTREMENTID, 1, 0, true, MONTANTPAYE, 0, 0, strREF, NULL);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatemvtrans_bons
DELIMITER //
CREATE PROCEDURE `proc_updatemvtrans_bons`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE CODEORGANISME VARCHAR(40);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE MONTANTTTC NUMERIC(10);
DECLARE MONTANTHT NUMERIC(10);
DECLARE MONTANTTVA NUMERIC(10);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT b.`lg_BON_LIVRAISON_ID`,b.`lg_USER_ID`,b.`dt_UPDATED`,o.`lg_GROSSISTE_ID`,
b.`int_MHT`,b.`int_TVA`,b.`int_HTTC`,b.`str_REF_LIVRAISON`
 FROM t_bon_livraison b, t_order o WHERE b.`lg_ORDER_ID`=o.`lg_ORDER_ID` AND b.`str_STATUT`='is_Closed';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,lgUSERID,dtUPDATED,CODEORGANISME,MONTANTHT,MONTANTTVA,MONTANTTTC,strREF;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT IGNORE INTO mvttransaction (uuid, `createdAt`, `MONTANT`, `MONTANTCREDIT`, `MONTANTREGLE`, `MONTANTRESTANT`, mvtdate, caisse, `typeTransaction`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantRemise`, `montantNet`, `MONTANTVERSE`, pkey, categorie, `avoidAmount`, `checked`, `montantPaye`, `montantTva`, marge, reference, organisme) 
	VALUES (UUID(), dtUPDATED, MONTANTTTC, 0, 0, 0, dtUPDATED, lgUSERID, 2, CODEORGANISME, '1', NULL, NULL, lgUSERID, 0, MONTANTHT, 0, lgPREENREGISTREMENTID, 1, 0, true, 0, MONTANTTVA, 0, strREF, CODEORGANISME);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatemvtrans_fatures
DELIMITER //
CREATE PROCEDURE `proc_updatemvtrans_fatures`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE CODEORGANISME VARCHAR(40);
DECLARE lgTYPEREGLEMENTID VARCHAR(40);
DECLARE typeMvt VARCHAR(10);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE intPRICE NUMERIC(10);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT d.lg_DOSSIER_REGLEMENT_ID, d.dbl_AMOUNT, d.str_ORGANISME_ID,d.lg_USER_ID,d.dt_CREATED, m.str_REF_TICKET,
m.lg_TYPE_MVT_CAISSE_ID,t.lg_TYPE_REGLEMENT_ID FROM t_dossier_reglement d,t_mvt_caisse m,t_mode_reglement r,t_type_reglement t WHERE 
  d.lg_DOSSIER_REGLEMENT_ID=m.str_NUM_PIECE_COMPTABLE AND m.lg_MODE_REGLEMENT_ID=r.lg_MODE_REGLEMENT_ID AND r.lg_TYPE_REGLEMENT_ID=t.lg_TYPE_REGLEMENT_ID AND d.str_STATUT='is_Closed';

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,intPRICE,CODEORGANISME,lgUSERID,dtUPDATED,strREF,typeMvt,lgTYPEREGLEMENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT IGNORE INTO mvttransaction (uuid, `createdAt`, `MONTANT`, `MONTANTCREDIT`, `MONTANTREGLE`, `MONTANTRESTANT`, mvtdate, caisse, `typeTransaction`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantRemise`, `montantNet`, `MONTANTVERSE`, pkey, categorie, `avoidAmount`, `checked`, `montantPaye`, `montantTva`, marge, reference, organisme) 
	VALUES (UUID(), dtUPDATED, intPRICE, 0, intPRICE, 0, dtUPDATED, lgUSERID, 3, NULL, '1', lgTYPEREGLEMENTID, typeMvt, lgUSERID, 0, intPRICE, 0, lgPREENREGISTREMENTID, 1, 0, true, intPRICE, 0, 0, strREF, CODEORGANISME);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatemvtrans_marge
DELIMITER //
CREATE PROCEDURE `proc_updatemvtrans_marge`()
BEGIN 
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE PKEY VARCHAR(40);
DECLARE MONTANTMARGE NUMERIC(10);
DECLARE MONTANTTVA NUMERIC(10);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT m.uuid,m.pkey FROM mvttransaction m WHERE m.`typeTransaction`=0 OR m.`typeTransaction`=1 ;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,PKEY;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;

SELECT 
ROUND ( SUM((d.`int_PRICE`-
 d.`int_PRICE_REMISE`)/(1+(v.`int_VALUE`/100))))-SUM(d.int_QUANTITY * f.int_PAF),
SUM( d.`int_PRICE`- d.`int_PRICE_REMISE`)- ROUND ( SUM((d.`int_PRICE`- d.`int_PRICE_REMISE`)/(1+(v.`int_VALUE`/100))))
 INTO MONTANTMARGE,MONTANTTVA
FROM t_preenregistrement_detail d,
t_famille f,t_code_tva v
WHERE d.`lg_PREENREGISTREMENT_ID`=PKEY AND d.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND f.lg_CODE_TVA_ID=v.lg_CODE_TVA_ID GROUP BY d.`lg_PREENREGISTREMENT_ID`;

UPDATE mvttransaction SET marge=MONTANTMARGE,montantTva=MONTANTTVA WHERE uuid=lgPREENREGISTREMENTID;

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatemvtrans_mvts
DELIMITER //
CREATE PROCEDURE `proc_updatemvtrans_mvts`()
BEGIN 

DECLARE dtUPDATED DATETIME;
DECLARE lgUSERID VARCHAR(40);
DECLARE strREF VARCHAR(40);
DECLARE lgTYPEREGLEMENTID VARCHAR(40);
DECLARE typeMvt VARCHAR(10);
DECLARE lgPREENREGISTREMENTID VARCHAR(40);
DECLARE intPRICE NUMERIC(10);
DECLARE categorie INT(1) ;
DECLARE typetransac INT(1);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT m.lg_MVT_CAISSE_ID,m.lg_TYPE_MVT_CAISSE_ID,m.lg_USER_ID,m.int_AMOUNT,m.dt_CREATED,m.str_REF_TICKET,t.lg_TYPE_REGLEMENT_ID FROM t_mvt_caisse m,t_mode_reglement r,t_type_reglement t WHERE 
  m.lg_MODE_REGLEMENT_ID=r.lg_MODE_REGLEMENT_ID AND r.lg_TYPE_REGLEMENT_ID=t.lg_TYPE_REGLEMENT_ID AND m.lg_TYPE_MVT_CAISSE_ID <> '3' AND m.lg_TYPE_MVT_CAISSE_ID <> '8' AND m.lg_TYPE_MVT_CAISSE_ID <> '9';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgPREENREGISTREMENTID,typeMvt,lgUSERID,intPRICE,dtUPDATED,strREF,lgTYPEREGLEMENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
IF typeMvt ='1' || typeMvt='4' THEN 
SET typetransac=4;
SET categorie=0;
ELSE
SET typetransac=3;
SET categorie=1;
END IF;

INSERT IGNORE INTO mvttransaction (uuid, `createdAt`, `MONTANT`, `MONTANTCREDIT`, `MONTANTREGLE`, `MONTANTRESTANT`, mvtdate, caisse, `typeTransaction`, `grossisteId`, `lg_EMPLACEMENT_ID`, `typeReglementId`, `typeMvtCaisseId`, `lg_USER_ID`, `montantRemise`, `montantNet`, `MONTANTVERSE`, pkey, categorie, `avoidAmount`, `checked`, `montantPaye`, `montantTva`, marge, reference, organisme) 
	VALUES (UUID(), dtUPDATED, intPRICE, 0, intPRICE, 0, dtUPDATED, lgUSERID, typetransac, NULL, '1', lgTYPEREGLEMENTID, typeMvt, lgUSERID, 0, intPRICE, 0, lgPREENREGISTREMENTID, categorie, 0, true, intPRICE, 0, 0, strREF, NULL);

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updateNum
DELIMITER //
CREATE PROCEDURE `proc_updateNum`()
BEGIN 
DECLARE lgCOMPTECLIENTID VARCHAR(40);
DECLARE lgID VARCHAR(40);
DECLARE strNUMEROSECURITE VARCHAR(40);
DECLARE myCOUNTER int(8) DEFAULT 0;
DECLARE isExits int(8) DEFAULT 0;
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT `str_NUMERO_SECURITE_SOCIAL`,`lg_COMPTE_CLIENT_ID` FROM t_client,t_compte_client WHERE t_client.`lg_CLIENT_ID`=t_compte_client.`lg_CLIENT_ID` AND (str_NUMERO_SECURITE_SOCIAL IS NOT NULL  OR str_NUMERO_SECURITE_SOCIAL <>'');

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_num_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_num_table
(
flgCOMPTECLIENTID VARCHAR(70) PRIMARY KEY,
fstrNUMEROSECURITESOCIAL VARCHAR(70)
);

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO strNUMEROSECURITE,lgCOMPTECLIENTID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO emp_num_table VALUES(lgCOMPTECLIENTID,strNUMEROSECURITE) ; 

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updateNumIns
DELIMITER //
CREATE PROCEDURE `proc_updateNumIns`()
BEGIN 
DECLARE lgCOMPTECLIENTID VARCHAR(40);
DECLARE lgID VARCHAR(40);
DECLARE strNUMEROSECURITE VARCHAR(40);
DECLARE myCOUNTER int(8) DEFAULT 0;
DECLARE isExits int(8) DEFAULT 0;
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT * FROM emp_num_table;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;


OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgCOMPTECLIENTID,strNUMEROSECURITE;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE  t_compte_client_tiers_payant SET `str_NUMERO_SECURITE_SOCIAL`=strNUMEROSECURITE    WHERE  (str_NUMERO_SECURITE_SOCIAL IS NULL  OR str_NUMERO_SECURITE_SOCIAL ='') AND  `int_PRIORITY`=1 AND lg_COMPTE_CLIENT_ID= lgCOMPTECLIENTID;
SET myCOUNTER=myCOUNTER+1;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

SELECT myCOUNTER;
 

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatereglementsocietetable
DELIMITER //
CREATE PROCEDURE `proc_updatereglementsocietetable`(
        IN `MOIS` VARCHAR(2)
    )
BEGIN 
DECLARE FULNAME VARCHAR(100);
DECLARE lg_TYPE_TIERS_PAYANT VARCHAR(40);
DECLARE v_CODEORGANISME VARCHAR(100);
DECLARE MONTANTREGLEMENT NUMERIC(15);

DECLARE DATEOPE DATE;

DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT t.`str_FULLNAME`, d.`dbl_AMOUNT`,p.`lg_TYPE_TIERS_PAYANT_ID` ,d.`dt_CREATED`,t.`str_CODE_ORGANISME` FROM t_dossier_reglement d,t_facture f,t_tiers_payant t,t_type_tiers_payant p
WHERE f.`lg_FACTURE_ID`=d.`lg_FACTURE_ID` AND t.`lg_TIERS_PAYANT_ID`=f.`str_CUSTOMER` AND p.`lg_TYPE_TIERS_PAYANT_ID`=t.`lg_TYPE_TIERS_PAYANT_ID` AND
MONTH(d.`dt_CREATED`)=`MOIS`;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO FULNAME,MONTANTREGLEMENT,lg_TYPE_TIERS_PAYANT,DATEOPE,v_CODEORGANISME;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM t_snap_shop_vente_societe WHERE MONTH(t_snap_shop_vente_societe.`dt_DAY`)=MONTH(CURDATE())
AND YEAR(t_snap_shop_vente_societe.`dt_DAY`)=YEAR(CURDATE()) AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_societe SET int_AMOUNT_ENCAIS=int_AMOUNT_ENCAIS+MONTANTREGLEMENT,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_societe.`dt_DAY`)=MONTH(CURDATE()) AND YEAR(t_snap_shop_vente_societe.`dt_DAY`)=YEAR(CURDATE()) AND t_snap_shop_vente_societe.`str_TIERS_PAYANT`=FULNAME;
ELSE
INSERT INTO `t_snap_shop_vente_societe` 
 (str_TIERS_PAYANT,str_TYPE_TIERS_PAYANT,int_AMOUNT_SALE,int_AMOUNT_ENCAIS,dt_DAY,CODEORGANISME,dt_CREATED)
 VALUES(FULNAME,lg_TYPE_TIERS_PAYANT,0,MONTANTREGLEMENT,DATEOPE,v_CODEORGANISME,NOW());
END IF;

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatestock
DELIMITER //
CREATE PROCEDURE `proc_updatestock`(
        IN `idVENTE` VARCHAR(20)
    )
BEGIN 


UPDATE  t_preenregistrement_detail set str_STATUT='is_Closed' WHERE lg_PREENREGISTREMENT_ID=`idVENTE`;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updatestockfamille
DELIMITER //
CREATE PROCEDURE `proc_updatestockfamille`()
BEGIN 
DECLARE lgEMPLACEMENT VARCHAR(40);
DECLARE lgFAMILLEID VARCHAR(40);
DECLARE STOCK int(8) DEFAULT 0;
DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT f.`lg_FAMILLE_ID`,f.`lg_EMPLACEMENT_ID`,f.`int_NUMBER_AVAILABLE` FROM `t_famille_stock` f;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_num_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_num_table
(
flgCOMPTECLIENTID VARCHAR(70) PRIMARY KEY,
fstrNUMEROSECURITESOCIAL VARCHAR(70)
);

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID,lgEMPLACEMENT,STOCK;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
UPDATE `t_type_stock_famille` SET int_NUMBER=STOCK WHERE lg_FAMILLE_ID=lgFAMILLEID
 AND lg_EMPLACEMENT_ID =lgEMPLACEMENT AND  lg_TYPE_STOCK_ID='1';

END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_updateteclientpreenregistrementavoir
DELIMITER //
CREATE PROCEDURE `proc_updateteclientpreenregistrementavoir`(
        IN `IDCLIENT` VARCHAR(50),
        IN `IDPREENREGISTREMENT` VARCHAR(50)
    )
BEGIN 

DECLARE MONTANTAVOIR NUMERIC(15);
DECLARE done INT DEFAULT 0;
DECLARE CheckExists INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT SUM(d.`int_AVOIR`*d.`int_PRICE_UNITAIR`)AS AVOIRAMONT FROM t_preenregistrement p,t_preenregistrement_detail d
WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` AND d.`lg_PREENREGISTREMENT_ID`=`IDPREENREGISTREMENT`
;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO MONTANTAVOIR;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
SELECT COUNT(*) INTO CheckExists FROM `t_snap_shop_vente_client` WHERE MONTH(t_snap_shop_vente_client.`dt_DAY`)=MONTH(CURDATE()) 
 AND t_snap_shop_vente_client.`lg_CLIENT_ID`=`IDCLIENT`
;
IF(CheckExists>0)THEN 
UPDATE t_snap_shop_vente_client SET int_AMOUNT_AVOIR=int_AMOUNT_AVOIR+MONTANTAVOIR,dt_UPDATED=NOW() WHERE 
MONTH(t_snap_shop_vente_client.`dt_DAY`)=MONTH(CURDATE())  AND t_snap_shop_vente_client.`lg_CLIENT_ID`=`IDCLIENT`;
ELSE
INSERT INTO `t_snap_shop_vente_client` 
 (lg_CLIENT_ID,int_AMOUNT_AVOIR,dt_DAY,dt_CREATED)
 VALUES(LGCLIENT,MONTANTAVOIR,CURDATE(),NOW() );
END IF;
END LOOP bl_loop;
 CLOSE curbl;
COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_v_caisse
DELIMITER //
CREATE PROCEDURE `proc_v_caisse`(
        IN `dt_date_debut` VARCHAR(20),
        IN `dt_date_fin` VARCHAR(20),
        IN `h_debut` VARCHAR(20),
        IN `h_fin` VARCHAR(20),
        IN `lg_USER_PARAM_ID` VARCHAR(40),
        IN `lg_TYPE_REGLEMENT_PARAM_ID` VARCHAR(40),
        IN `lg_EMPLACEMENT_PARAM_ID` VARCHAR(40)
    )
select 
`t`.`bool_CHECKED` AS `bool_CHECKED`,
`t`.`str_RESSOURCE_REF` AS `str_RESSOURCE_REF`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select `p`.`str_REF` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) else `t`.`str_RESSOURCE_REF` end) AS `str_RESSOURCE_REF_BIS`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select `p`.`b_IS_CANCEL` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) else 0 end) AS `ETAT_VENTE`,
`t`.`str_TASK` AS `str_TASK`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(case 
			when (`t`.`str_TYPE_VENTE` = 'VO') then 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then (-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					else 
						`p`.`int_CUST_PART` end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) group by `t`.`str_RESSOURCE_REF`) 
			else 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					when (`p`.`int_PRICE` > 0) then 
						(`p`.`int_PRICE` - `p`.`int_PRICE_REMISE`) 
					else (`p`.`int_PRICE` + (-(1) * `p`.`int_PRICE_REMISE`)) end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) end) 
	else 
		(case 
			when (`t`.`str_TRANSACTION_REF` = 'C') then 
				`t`.`int_AMOUNT_CREDIT` 
			else (-(1) * `t`.`int_AMOUNT_DEBIT`) end) end) AS `int_AMOUNT`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(case 
			when (`t`.`str_TYPE_VENTE` = 'VO') then 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					else `p`.`int_CUST_PART` end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) group by `t`.`str_RESSOURCE_REF`) 
			else 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					when (`p`.`int_PRICE_OTHER` > 0) then 
						(`p`.`int_PRICE_OTHER` - `p`.`int_PRICE_REMISE`) 
					else (`p`.`int_PRICE_OTHER` + (-(1) * `p`.`int_PRICE_REMISE`)) end) from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) end) 
	else (case 
		when (`t`.`str_TRANSACTION_REF` = 'C') then 
			`t`.`int_AMOUNT_CREDIT` 
		else (-(1) * `t`.`int_AMOUNT_DEBIT`) end) end) AS `int_AMOUNT_OTHER`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(case 
			when (`t`.`str_TYPE_VENTE` = 'VO') then 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						(`p`.`int_CUST_PART` - sum(`t`.`int_AMOUNT_CREDIT`)) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(`p`.`int_CUST_PART` + sum(`t`.`int_AMOUNT_DEBIT`)) 
					else 0 end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) group by `t`.`str_RESSOURCE_REF`) 
			else 0 end) 
	else 0 end) AS `int_AMOUNT_DETTE_DIFFERE`,
(case 
	when (`t`.`str_NUMERO_COMPTE` = '10800000000') then 
		(select concat(ucase(substr(`u1`.`str_FIRST_NAME`,1,1)),'.',`u1`.`str_LAST_NAME`) from (`t_mvt_caisse` `mm` join `t_user` `u1`) where ((`mm`.`lg_USER_ID` = convert(`u1`.`lg_USER_ID` using utf8)) and (convert(`t`.`str_RESSOURCE_REF` using utf8) = `mm`.`lg_MVT_CAISSE_ID`))) 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select concat(ucase(substr(`u1`.`str_FIRST_NAME`,1,1)),'.',`u1`.`str_LAST_NAME`) from (`t_preenregistrement` `p` join `t_user` `u1`) where ((convert(`p`.`lg_USER_ID` using utf8) = convert(`u1`.`lg_USER_ID` using utf8)) and (convert(`t`.`str_RESSOURCE_REF` using utf8) = `p`.`lg_PREENREGISTREMENT_ID`))) 
	else concat(ucase(substr(`u`.`str_FIRST_NAME`,1,1)),'.',`u`.`str_LAST_NAME`) end) AS `str_FIRST_LAST_NAME`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		convert((select `p`.`lg_USER_ID` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) using utf8) 
	when (`t`.`str_TASK` = 'OTHER') then 
		(select `m`.`lg_USER_ID` from `t_mvt_caisse` `m` where (`m`.`lg_MVT_CAISSE_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) 
	else 
		convert(`t`.`lg_USER_ID` using utf8) end) AS `lg_USER_ID`,
`tr`.`lg_TYPE_REGLEMENT_ID` AS `lg_TYPE_REGLEMENT_ID`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select `p`.`dt_UPDATED` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) 
	when (`t`.`str_TASK` = 'OTHER') then 
		(select `m`.`dt_CREATED` from `t_mvt_caisse` `m` where (`m`.`lg_MVT_CAISSE_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) 
	else `t`.`dt_CREATED` end) AS `dt_CREATED`,
`m`.`str_NAME` AS `str_NAME`,
(case 
	when (`tr`.`str_NAME` = 'Differe') then 
		'Especes' 
	else `tr`.`str_NAME` end) AS `str_NAME_TYE_REGLEMENT`,
`mc`.`str_NAME` AS `str_NAME_TYPE_MVT_CAISSE`,
(select concat(`p`.`str_FIRST_NAME_CUSTOMER`,' ',`p`.`str_LAST_NAME_CUSTOMER`) from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) AS `str_FIRST_LAST_NAME_CLIENT`,
`t`.`str_NUMERO_COMPTE` AS `str_NUMERO_COMPTE`,
`u`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`e`.`str_DESCRIPTION` AS `str_DESCRIPTION_LIEU`,
(select `pc`.`int_PRICE_RESTE` from (`t_preenregistrement` `p` join `t_preenregistrement_compte_client` `pc`) where ((`p`.`lg_PREENREGISTREMENT_ID` = `pc`.`lg_PREENREGISTREMENT_ID`) and (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)))) AS `int_AMOUNT_DIFFERE` 
from ((((((`t_cash_transaction` `t` join `t_user` `u`) join `t_mode_reglement` `m`) join `t_reglement` `r`) join `t_type_reglement` `tr`) join `t_type_mvt_caisse` `mc`) join `t_emplacement` `e`) 
where ((`t`.`lg_USER_ID` = `u`.`lg_USER_ID`) and (`m`.`lg_MODE_REGLEMENT_ID` = `r`.`lg_MODE_REGLEMENT_ID`) and (`t`.`lg_REGLEMENT_ID` = `r`.`lg_REGLEMENT_ID`) and (`tr`.`lg_TYPE_REGLEMENT_ID` = `m`.`lg_TYPE_REGLEMENT_ID`) and (`mc`.`str_CODE_COMPTABLE` = convert(`t`.`str_NUMERO_COMPTE` using utf8)) and (`e`.`lg_EMPLACEMENT_ID` = `u`.`lg_EMPLACEMENT_ID`)) 
AND t.dt_CREATED >= CONCAT(dt_date_debut,' ',h_debut) AND t.dt_CREATED <= CONCAT(dt_date_fin,' ',h_fin) 
AND t.lg_USER_ID LIKE lg_USER_PARAM_ID AND tr.lg_TYPE_REGLEMENT_ID LIKE lg_TYPE_REGLEMENT_PARAM_ID AND u.lg_EMPLACEMENT_ID LIKE lg_EMPLACEMENT_PARAM_ID AND t.bool_CHECKED = true 
group by `t`.`str_RESSOURCE_REF` 
ORDER BY t.dt_CREATED//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_v_caisse_limit
DELIMITER //
CREATE PROCEDURE `proc_v_caisse_limit`(
        IN `dt_date_debut` VARCHAR(20),
        IN `dt_date_fin` VARCHAR(20),
        IN `h_debut` VARCHAR(20),
        IN `h_fin` VARCHAR(20),
        IN `lg_USER_PARAM_ID` VARCHAR(40),
        IN `lg_TYPE_REGLEMENT_PARAM_ID` VARCHAR(40),
        IN `lg_EMPLACEMENT_PARAM_ID` VARCHAR(40),
        IN `int_START` INTEGER,
        IN `int_LIMIT` INTEGER
    )
select 
`t`.`bool_CHECKED` AS `bool_CHECKED`,
`t`.`str_RESSOURCE_REF` AS `str_RESSOURCE_REF`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select `p`.`str_REF` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) else `t`.`str_RESSOURCE_REF` end) AS `str_RESSOURCE_REF_BIS`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select `p`.`b_IS_CANCEL` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) else 0 end) AS `ETAT_VENTE`,
`t`.`str_TASK` AS `str_TASK`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(case 
			when (`t`.`str_TYPE_VENTE` = 'VO') then 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then (-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					else 
						`p`.`int_CUST_PART` end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) group by `t`.`str_RESSOURCE_REF`) 
			else 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					when (`p`.`int_PRICE` > 0) then 
						(`p`.`int_PRICE` - `p`.`int_PRICE_REMISE`) 
					else (`p`.`int_PRICE` + (-(1) * `p`.`int_PRICE_REMISE`)) end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) end) 
	else 
		(case 
			when (`t`.`str_TRANSACTION_REF` = 'C') then 
				`t`.`int_AMOUNT_CREDIT` 
			else (-(1) * `t`.`int_AMOUNT_DEBIT`) end) end) AS `int_AMOUNT`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(case 
			when (`t`.`str_TYPE_VENTE` = 'VO') then 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					else `p`.`int_CUST_PART` end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) group by `t`.`str_RESSOURCE_REF`) 
			else 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						sum(`t`.`int_AMOUNT_CREDIT`) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(-(1) * sum(`t`.`int_AMOUNT_DEBIT`)) 
					when (`p`.`int_PRICE_OTHER` > 0) then 
						(`p`.`int_PRICE_OTHER` - `p`.`int_PRICE_REMISE`) 
					else (`p`.`int_PRICE_OTHER` + (-(1) * `p`.`int_PRICE_REMISE`)) end) from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) end) 
	else (case 
		when (`t`.`str_TRANSACTION_REF` = 'C') then 
			`t`.`int_AMOUNT_CREDIT` 
		else (-(1) * `t`.`int_AMOUNT_DEBIT`) end) end) AS `int_AMOUNT_OTHER`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(case 
			when (`t`.`str_TYPE_VENTE` = 'VO') then 
				(select (case 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` > 0)) then 
						(`p`.`int_CUST_PART` - sum(`t`.`int_AMOUNT_CREDIT`)) 
					when ((`p`.`str_STATUT_VENTE` = 'Differe') and (`p`.`int_PRICE` < 0)) then 
						(`p`.`int_CUST_PART` + sum(`t`.`int_AMOUNT_DEBIT`)) 
					else 0 end) 
				from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) group by `t`.`str_RESSOURCE_REF`) 
			else 0 end) 
	else 0 end) AS `int_AMOUNT_DETTE_DIFFERE`,
(case 
	when (`t`.`str_NUMERO_COMPTE` = '10800000000') then 
		(select concat(ucase(substr(`u1`.`str_FIRST_NAME`,1,1)),'.',`u1`.`str_LAST_NAME`) from (`t_mvt_caisse` `mm` join `t_user` `u1`) where ((`mm`.`lg_USER_ID` = convert(`u1`.`lg_USER_ID` using utf8)) and (convert(`t`.`str_RESSOURCE_REF` using utf8) = `mm`.`lg_MVT_CAISSE_ID`))) 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select concat(ucase(substr(`u1`.`str_FIRST_NAME`,1,1)),'.',`u1`.`str_LAST_NAME`) from (`t_preenregistrement` `p` join `t_user` `u1`) where ((convert(`p`.`lg_USER_ID` using utf8) = convert(`u1`.`lg_USER_ID` using utf8)) and (convert(`t`.`str_RESSOURCE_REF` using utf8) = `p`.`lg_PREENREGISTREMENT_ID`))) 
	else concat(ucase(substr(`u`.`str_FIRST_NAME`,1,1)),'.',`u`.`str_LAST_NAME`) end) AS `str_FIRST_LAST_NAME`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		convert((select `p`.`lg_USER_ID` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) using utf8) 
	when (`t`.`str_TASK` = 'OTHER') then 
		(select `m`.`lg_USER_ID` from `t_mvt_caisse` `m` where (`m`.`lg_MVT_CAISSE_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) 
	else 
		convert(`t`.`lg_USER_ID` using utf8) end) AS `lg_USER_ID`,
`tr`.`lg_TYPE_REGLEMENT_ID` AS `lg_TYPE_REGLEMENT_ID`,
(case 
	when ((`t`.`str_TASK` = 'VENTE') or (`t`.`str_TASK` = 'ANNULE_VENTE')) then 
		(select `p`.`dt_UPDATED` from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) 
	when (`t`.`str_TASK` = 'OTHER') then 
		(select `m`.`dt_CREATED` from `t_mvt_caisse` `m` where (`m`.`lg_MVT_CAISSE_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) 
	else `t`.`dt_CREATED` end) AS `dt_CREATED`,
`m`.`str_NAME` AS `str_NAME`,
(case 
	when (`tr`.`str_NAME` = 'Differe') then 
		'Especes' 
	else `tr`.`str_NAME` end) AS `str_NAME_TYE_REGLEMENT`,
`mc`.`str_NAME` AS `str_NAME_TYPE_MVT_CAISSE`,
(select concat(`p`.`str_FIRST_NAME_CUSTOMER`,' ',`p`.`str_LAST_NAME_CUSTOMER`) from `t_preenregistrement` `p` where (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8))) AS `str_FIRST_LAST_NAME_CLIENT`,
`t`.`str_NUMERO_COMPTE` AS `str_NUMERO_COMPTE`,
`u`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,
`e`.`str_DESCRIPTION` AS `str_DESCRIPTION_LIEU`,
(select `pc`.`int_PRICE_RESTE` from (`t_preenregistrement` `p` join `t_preenregistrement_compte_client` `pc`) where ((`p`.`lg_PREENREGISTREMENT_ID` = `pc`.`lg_PREENREGISTREMENT_ID`) and (`p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)))) AS `int_AMOUNT_DIFFERE` 
from ((((((`t_cash_transaction` `t` join `t_user` `u`) join `t_mode_reglement` `m`) join `t_reglement` `r`) join `t_type_reglement` `tr`) join `t_type_mvt_caisse` `mc`) join `t_emplacement` `e`) 
where ((`t`.`lg_USER_ID` = `u`.`lg_USER_ID`) and (`m`.`lg_MODE_REGLEMENT_ID` = `r`.`lg_MODE_REGLEMENT_ID`) and (`t`.`lg_REGLEMENT_ID` = `r`.`lg_REGLEMENT_ID`) and (`tr`.`lg_TYPE_REGLEMENT_ID` = `m`.`lg_TYPE_REGLEMENT_ID`) and (`mc`.`str_CODE_COMPTABLE` = convert(`t`.`str_NUMERO_COMPTE` using utf8)) and (`e`.`lg_EMPLACEMENT_ID` = `u`.`lg_EMPLACEMENT_ID`)) 
AND t.dt_CREATED >= CONCAT(dt_date_debut,' ',h_debut) AND t.dt_CREATED <= CONCAT(dt_date_fin,' ',h_fin) 
AND t.lg_USER_ID LIKE lg_USER_PARAM_ID AND tr.lg_TYPE_REGLEMENT_ID LIKE lg_TYPE_REGLEMENT_PARAM_ID AND u.lg_EMPLACEMENT_ID LIKE lg_EMPLACEMENT_PARAM_ID AND t.bool_CHECKED = true 
group by `t`.`str_RESSOURCE_REF` 
ORDER BY t.dt_CREATED
LIMIT int_START, int_LIMIT//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_vente
DELIMITER //
CREATE PROCEDURE `proc_vente`(
        IN `idVENTE` VARCHAR(20)
    )
BEGIN
DECLARE done INT DEFAULT 0;
DECLARE lgFAMILLEID VARCHAR(20);
DECLARE lgEMPLACEMENTID VARCHAR(20);
DECLARE lgUSERID VARCHAR(20);
DECLARE lgPREENREGISTREMENTDETAILID VARCHAR(20);
DECLARE qty int(8);
DECLARE curbl CURSOR FOR  

SELECT 
  `t_preenregistrement_detail`.`lg_FAMILLE_ID`,
  `t_preenregistrement_detail`.`int_QUANTITY_SERVED`,
  `t_user`.`lg_EMPLACEMENT_ID`,
  `t_user`.`lg_USER_ID`, `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID`

FROM
  `t_emplacement`
  INNER JOIN `t_user` ON (`t_emplacement`.`lg_EMPLACEMENT_ID` = `t_user`.`lg_EMPLACEMENT_ID`)
  INNER JOIN `t_preenregistrement` ON (`t_user`.`lg_USER_ID` = `t_preenregistrement`.`lg_USER_ID`)
  INNER JOIN `t_preenregistrement_detail` ON (`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`)
WHERE
  `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = idVENTE;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID,qty,lgEMPLACEMENTID,lgUSERID,lgPREENREGISTREMENTDETAILID;
IF done=1 THEN 

 LEAVE bl_loop;
 END IF;
CALL `updatefamillenbvente`(qty,lgFAMILLEID);
    CALL `proc_mouvement`(qty,lgFAMILLEID,lgEMPLACEMENTID,lgUSERID,lgPREENREGISTREMENTDETAILID);
    CALL `updatestockfamille`(qty,lgFAMILLEID,lgPREENREGISTREMENTDETAILID);
    CALL `proc_mvt_snap`(qty,lgFAMILLEID,lgEMPLACEMENTID,lgPREENREGISTREMENTDETAILID);
CALL updatecalendar();
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_vente_reglement_produit_exclus_ca
DELIMITER //
CREATE PROCEDURE `proc_vente_reglement_produit_exclus_ca`()
BEGIN
    DECLARE reglementVenteId VARCHAR(100);

    DECLARE montant INT(11);
    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
     SELECT SUM(d.int_PRICE) AS montant,v.id FROM  t_preenregistrement_detail d JOIN t_preenregistrement
  p ON d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID  JOIN vente_reglement v ON v.vente_id=p.lg_PREENREGISTREMENT_ID
WHERE d.bool_ACCOUNT=FALSE AND v.amount_non_ca =0  GROUP  BY p.lg_PREENREGISTREMENT_ID;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO montant,reglementVenteId;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

       UPDATE vente_reglement v SET v.amount_non_ca=montant WHERE v.id= reglementVenteId;
       
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_vente_stockfamille
DELIMITER //
CREATE PROCEDURE `proc_vente_stockfamille`(IN idVENTE varchar(20), IN lgEMPLACEMENTID varchar(40))
BEGIN
DECLARE done INT DEFAULT 0;
DECLARE lgFAMILLEID VARCHAR(20);

DECLARE qty int(8);
DECLARE curbl CURSOR FOR  

SELECT 
  `t_preenregistrement_detail`.`lg_FAMILLE_ID`,
  `t_preenregistrement_detail`.`int_QUANTITY_SERVED`
FROM
  `t_preenregistrement`
  INNER JOIN `t_preenregistrement_detail` ON (`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`)
WHERE
  `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = idVENTE;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID,qty;
IF done=1 THEN 
LEAVE bl_loop;
 END IF;
update t_famille_stock set int_NUMBER_AVAILABLE=int_NUMBER_AVAILABLE-qty,int_NUMBER=int_NUMBER-qty WHERE lg_FAMILLE_ID=lgFAMILLEID AND
lg_EMPLACEMENT_ID=lgEMPLACEMENTID AND str_STATUT='enable' ;
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_venteavoirclient
DELIMITER //
CREATE PROCEDURE `proc_venteavoirclient`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100),
        IN `DEBUT` INTEGER,
        IN `FIN` INTEGER
    )
BEGIN 
DECLARE v_JANVIER NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER NUMERIC(15) DEFAULT 0;
DECLARE v_MARS NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL NUMERIC(15) DEFAULT 0;
DECLARE v_MAI NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT NUMERIC(15) DEFAULT 0;
DECLARE v_OCT NUMERIC(15) DEFAULT 0;
DECLARE v_NOV NUMERIC(15) DEFAULT 0;
DECLARE v_DEC NUMERIC(15) DEFAULT 0;

DECLARE v_JANVIER_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_MARS_AVOIR NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_MAI_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET_AVOIR NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_OCT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_NOV_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_DEC_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_ANNEE CHAR(8);
DECLARE v_LIBELLE VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curavoir CURSOR FOR 
SELECT CONCAT(c.`str_FIRST_NAME`,' ',c.`str_LAST_NAME`), YEAR(o.`dt_DAY`), (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='1' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEJAN,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='1' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGJAN,
                 (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='2' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEFEV,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='2' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGFEV,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='3' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEMARS,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='3' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGMARS,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='4' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEAVRIL,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='4' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGAVRIL
                ,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='5' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEMAI,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='5' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGMAI
                ,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='6' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEJUIN,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='6' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGJUIN,
                
                
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='7' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEJUIL,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='7' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGJUIL,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='8' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEAOUT,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='8' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGAOUT,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='9' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTESET,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='9' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGSET
                ,
                
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='10' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEOCT,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='10' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGOCT,
                
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='11' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTENOV,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='11' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGNOV,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='12' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS VENTEDEC,
                (SELECT SUM(p.`int_AMOUNT_AVOIR`) FROM t_snap_shop_vente_client p WHERE MONTH (p.`dt_DAY`)='12' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`lg_CLIENT_ID`=o.`lg_CLIENT_ID`)  
                AS REGDEC
                FROM `t_snap_shop_vente_client` o,t_client c
 WHERE  YEAR(o.`dt_DAY`)>=YEAR(`dt_start`) AND YEAR(o.`dt_DAY`) <=YEAR(`dt_end`) AND c.`lg_CLIENT_ID`= o.`lg_CLIENT_ID` AND (c.`str_FIRST_NAME` LIKE `searchvalue` OR c.`str_LAST_NAME` LIKE `searchvalue`  OR c.`str_NUMERO_SECURITE_SOCIAL` LIKE `searchvalue`  ) 
                
 GROUP BY o.`lg_CLIENT_ID` ,YEAR(o.`dt_DAY`) ORDER BY YEAR(o.`dt_DAY`) DESC LIMIT DEBUT,FIN;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_ventesocietereglement_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_ventesocietereglement_table
 (f_ANNEE VARCHAR(15),
f_LIBELLE VARCHAR(100),
 f_JANVIER NUMERIC(15) DEFAULT 0,
f_FEVRIER NUMERIC(15) DEFAULT 0,
f_MARS NUMERIC(15) DEFAULT 0,
f_AVRIL NUMERIC(15) DEFAULT 0,
f_MAI NUMERIC(15) DEFAULT 0,
f_JUIN NUMERIC(15) DEFAULT 0,
f_JUIELLET NUMERIC(15) DEFAULT 0,
f_AOUT NUMERIC(15) DEFAULT 0,
f_SEPT NUMERIC(15) DEFAULT 0,
f_OCT NUMERIC(15) DEFAULT 0,
f_NOV NUMERIC(15) DEFAULT 0,
f_DEC NUMERIC(15) DEFAULT 0,
 f_JANVIER_AVOIR NUMERIC(15) DEFAULT 0,
f_FEVRIER_AVOIR NUMERIC(15) DEFAULT 0,
f_MARS_AVOIR NUMERIC(15) DEFAULT 0,
f_AVRIL_AVOIR NUMERIC(15) DEFAULT 0,
f_MAI_AVOIR NUMERIC(15) DEFAULT 0,
f_JUIN_AVOIR NUMERIC(15) DEFAULT 0,
f_JUIELLET_AVOIR NUMERIC(15) DEFAULT 0,
f_AOUT_AVOIR NUMERIC(15) DEFAULT 0,
f_SEPT_AVOIR NUMERIC(15) DEFAULT 0,
f_OCT_AVOIR NUMERIC(15) DEFAULT 0,
f_NOV_AVOIR NUMERIC(15) DEFAULT 0,
f_DEC_AVOIR NUMERIC(15) DEFAULT 0
);
OPEN curavoir;
avoir_loop:LOOP
FETCH curavoir INTO v_LIBELLE,v_ANNEE,
v_JANVIER,v_JANVIER_AVOIR,v_FEVRIER,v_FEVRIER_AVOIR,v_MARS,v_MARS_AVOIR,v_AVRIL,v_AVRIL_AVOIR,
v_MAI,v_MAI_AVOIR,v_JUIN,v_JUIN_AVOIR,v_JUIELLET,v_JUIELLET_AVOIR,v_AOUT,v_AOUT_AVOIR,v_SEPT,v_SEPT_AVOIR,v_OCT,v_OCT_AVOIR,v_NOV,v_NOV_AVOIR,v_DEC
,v_DEC_AVOIR
;
IF done=1 THEN 
 LEAVE avoir_loop;
 END IF;
INSERT INTO emp_ventesocietereglement_table (f_ANNEE,
f_LIBELLE,
f_JANVIER,f_FEVRIER,f_MARS,f_AVRIL,f_MAI,
f_JUIN,f_JUIELLET,f_AOUT,
f_SEPT,f_OCT,f_NOV,f_DEC,
f_JANVIER_AVOIR,f_FEVRIER_AVOIR,f_MARS_AVOIR,f_AVRIL_AVOIR,f_MAI_AVOIR,
f_JUIN_AVOIR,f_JUIELLET_AVOIR,f_AOUT_AVOIR,
f_SEPT_AVOIR,f_OCT_AVOIR,f_NOV_AVOIR,f_DEC_AVOIR
)
 VALUES (v_ANNEE,v_LIBELLE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC, v_JANVIER_AVOIR,v_FEVRIER_AVOIR,v_MARS_AVOIR,v_AVRIL_AVOIR,v_MAI_AVOIR,v_JUIN_AVOIR,v_JUIELLET_AVOIR,v_AOUT_AVOIR,v_SEPT_AVOIR,v_OCT_AVOIR,v_NOV_AVOIR,v_DEC_AVOIR);
END LOOP avoir_loop;
 CLOSE curavoir;
SELECT f_ANNEE,f_LIBELLE, 
(CASE WHEN f_JANVIER IS NOT NULL THEN f_JANVIER ELSE 0 END ) AS f_JANVIER,
(CASE WHEN f_FEVRIER IS NOT NULL THEN f_FEVRIER ELSE 0 END ) AS f_FEVRIER,
(CASE WHEN f_MARS IS NOT NULL THEN f_MARS ELSE 0 END ) AS f_MARS,
(CASE WHEN f_AVRIL IS NOT NULL THEN f_AVRIL ELSE 0 END ) AS f_AVRIL,
(CASE WHEN f_MAI IS NOT NULL THEN f_MAI ELSE 0 END ) AS f_MAI,
(CASE WHEN f_JUIN IS NOT NULL THEN f_JUIN ELSE 0 END ) AS f_JUIN,
(CASE WHEN f_JUIELLET IS NOT NULL THEN f_JUIELLET ELSE 0 END ) AS f_JUIELLET,
(CASE WHEN f_AOUT IS NOT NULL THEN f_AOUT ELSE 0 END ) AS f_AOUT,
(CASE WHEN f_SEPT IS NOT NULL THEN f_SEPT ELSE 0 END ) AS f_SEPT,
(CASE WHEN f_OCT IS NOT NULL THEN f_OCT ELSE 0 END ) AS f_OCT,
(CASE WHEN f_NOV IS NOT NULL THEN f_NOV ELSE 0 END ) AS f_NOV,
(CASE WHEN f_DEC IS NOT NULL THEN f_DEC ELSE 0 END ) AS f_DEC,
(CASE WHEN f_JANVIER_AVOIR IS NOT NULL THEN f_JANVIER_AVOIR ELSE 0 END ) AS f_JANVIER_AVOIR,
(CASE WHEN f_FEVRIER_AVOIR IS NOT NULL THEN f_FEVRIER_AVOIR ELSE 0 END ) AS f_FEVRIER_AVOIR,
(CASE WHEN f_MARS_AVOIR IS NOT NULL THEN f_MARS_AVOIR ELSE 0 END ) AS f_MARS_AVOIR,
(CASE WHEN f_AVRIL_AVOIR IS NOT NULL THEN f_AVRIL_AVOIR ELSE 0 END ) AS f_AVRIL_AVOIR,
(CASE WHEN f_MAI_AVOIR IS NOT NULL THEN f_MAI_AVOIR ELSE 0 END ) AS f_MAI_AVOIR,
(CASE WHEN f_JUIN_AVOIR IS NOT NULL THEN f_JUIN_AVOIR ELSE 0 END ) AS f_JUIN_AVOIR,
(CASE WHEN f_JUIELLET_AVOIR IS NOT NULL THEN f_JUIELLET_AVOIR ELSE 0 END ) AS f_JUIELLET_AVOIR,
(CASE WHEN f_AOUT_AVOIR IS NOT NULL THEN f_AOUT_AVOIR ELSE 0 END ) AS f_AOUT_AVOIR,
(CASE WHEN f_SEPT_AVOIR IS NOT NULL THEN f_SEPT_AVOIR ELSE 0 END ) AS f_SEPT_AVOIR,
(CASE WHEN f_OCT_AVOIR IS NOT NULL THEN f_OCT_AVOIR ELSE 0 END ) AS f_OCT_AVOIR,
(CASE WHEN f_NOV_AVOIR IS NOT NULL THEN f_NOV_AVOIR ELSE 0 END ) AS f_NOV_AVOIR,
(CASE WHEN f_DEC_AVOIR IS NOT NULL THEN f_DEC_AVOIR ELSE 0 END ) AS f_DEC_AVOIR
 FROM emp_ventesocietereglement_table
ORDER BY f_ANNEE ,f_LIBELLE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_ventedepot
DELIMITER //
CREATE PROCEDURE `proc_ventedepot`(IN idVENTE varchar(20), IN lgEMPLACEMENTID VARCHAR(20), IN lgUSERID VARCHAR(20))
BEGIN
DECLARE done INT DEFAULT 0;
DECLARE lgFAMILLEID VARCHAR(20);
DECLARE lgPREENREGISTREMENTDETAILID VARCHAR(20);
DECLARE qty int(8);
DECLARE curbl CURSOR FOR  

SELECT 
  `t_preenregistrement_detail`.`lg_FAMILLE_ID`,
  `t_preenregistrement_detail`.`int_QUANTITY_SERVED`,
  `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID`

FROM
t_preenregistrement_detail 
WHERE
  `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID` = idVENTE;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO lgFAMILLEID,qty,lgPREENREGISTREMENTDETAILID;
IF done=1 THEN 

 LEAVE bl_loop;
 END IF;
    CALL `proc_mouvement`(qty,lgFAMILLEID,lgEMPLACEMENTID,lgUSERID,lgPREENREGISTREMENTDETAILID);
    CALL `proc_mvt_snap`(qty,lgFAMILLEID,lgEMPLACEMENTID,lgPREENREGISTREMENTDETAILID);
CALL updatecalendar();
END LOOP bl_loop;
 CLOSE curbl;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. proc_ventesocietereglement
DELIMITER //
CREATE PROCEDURE `proc_ventesocietereglement`(
        IN `dt_start` DATE,
        IN `dt_end` DATE,
        IN `searchvalue` VARCHAR(100),
        IN `DEBUT` INTEGER,
        IN `FIN` INTEGER
    )
BEGIN 
DECLARE v_JANVIER NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER NUMERIC(15) DEFAULT 0;
DECLARE v_MARS NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL NUMERIC(15) DEFAULT 0;
DECLARE v_MAI NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT NUMERIC(15) DEFAULT 0;
DECLARE v_OCT NUMERIC(15) DEFAULT 0;
DECLARE v_NOV NUMERIC(15) DEFAULT 0;
DECLARE v_DEC NUMERIC(15) DEFAULT 0;

DECLARE v_JANVIER_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_FEVRIER_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_MARS_AVOIR NUMERIC(15) DEFAULT 0 ;
DECLARE v_AVRIL_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_MAI_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_JUIN_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_JUIELLET_AVOIR NUMERIC(15)DEFAULT 0;
DECLARE v_AOUT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_SEPT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_OCT_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_NOV_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_DEC_AVOIR NUMERIC(15) DEFAULT 0;
DECLARE v_ANNEE CHAR(8);
DECLARE v_LIBELLE VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curavoir CURSOR FOR 
SELECT o.`str_TIERS_PAYANT`, YEAR(o.`dt_DAY`), (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='1' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEJAN,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='1' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGJAN,
                 (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='2' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEFEV,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='2' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGFEV,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='3' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEMARS,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='3' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGMARS,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='4' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEAVRIL,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='4' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGAVRIL
                ,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='5' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEMAI,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='5' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGMAI
                ,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='6' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEJUIN,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='6' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGJUIN,
                
                
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='7' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEJUIL,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='7' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGJUIL,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='8' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEAOUT,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='8' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGAOUT,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='9' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTESET,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='9' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGSET
                ,
                
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='10' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEOCT,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='10' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGOCT,
                
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='11' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTENOV,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='11' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGNOV,
                (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='12' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS VENTEDEC,
                (SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='12' 
                AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  
                AS REGDEC
                FROM t_snap_shop_vente_societe o WHERE  YEAR(o.`dt_DAY`)>=YEAR(`dt_start`) AND YEAR(o.`dt_DAY`) <=YEAR(`dt_end`)  AND o.`str_TIERS_PAYANT` LIKE `searchvalue`
                 GROUP BY o.`str_TIERS_PAYANT` ,YEAR(o.`dt_DAY`) ORDER BY YEAR(o.`dt_DAY`) DESC LIMIT DEBUT,FIN;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
DROP TEMPORARY TABLE IF EXISTS emp_ventesocietereglement_table;
 CREATE TEMPORARY TABLE IF NOT EXISTS emp_ventesocietereglement_table
 (f_ANNEE VARCHAR(15),
f_LIBELLE VARCHAR(100),
 f_JANVIER NUMERIC(15) DEFAULT 0,
f_FEVRIER NUMERIC(15) DEFAULT 0,
f_MARS NUMERIC(15) DEFAULT 0,
f_AVRIL NUMERIC(15) DEFAULT 0,
f_MAI NUMERIC(15) DEFAULT 0,
f_JUIN NUMERIC(15) DEFAULT 0,
f_JUIELLET NUMERIC(15) DEFAULT 0,
f_AOUT NUMERIC(15) DEFAULT 0,
f_SEPT NUMERIC(15) DEFAULT 0,
f_OCT NUMERIC(15) DEFAULT 0,
f_NOV NUMERIC(15) DEFAULT 0,
f_DEC NUMERIC(15) DEFAULT 0,
 f_JANVIER_AVOIR NUMERIC(15) DEFAULT 0,
f_FEVRIER_AVOIR NUMERIC(15) DEFAULT 0,
f_MARS_AVOIR NUMERIC(15) DEFAULT 0,
f_AVRIL_AVOIR NUMERIC(15) DEFAULT 0,
f_MAI_AVOIR NUMERIC(15) DEFAULT 0,
f_JUIN_AVOIR NUMERIC(15) DEFAULT 0,
f_JUIELLET_AVOIR NUMERIC(15) DEFAULT 0,
f_AOUT_AVOIR NUMERIC(15) DEFAULT 0,
f_SEPT_AVOIR NUMERIC(15) DEFAULT 0,
f_OCT_AVOIR NUMERIC(15) DEFAULT 0,
f_NOV_AVOIR NUMERIC(15) DEFAULT 0,
f_DEC_AVOIR NUMERIC(15) DEFAULT 0
);
OPEN curavoir;
avoir_loop:LOOP
FETCH curavoir INTO v_LIBELLE,v_ANNEE,
v_JANVIER,v_JANVIER_AVOIR,v_FEVRIER,v_FEVRIER_AVOIR,v_MARS,v_MARS_AVOIR,v_AVRIL,v_AVRIL_AVOIR,
v_MAI,v_MAI_AVOIR,v_JUIN,v_JUIN_AVOIR,v_JUIELLET,v_JUIELLET_AVOIR,v_AOUT,v_AOUT_AVOIR,v_SEPT,v_SEPT_AVOIR,v_OCT,v_OCT_AVOIR,v_NOV,v_NOV_AVOIR,v_DEC
,v_DEC_AVOIR
;
IF done=1 THEN 
 LEAVE avoir_loop;
 END IF;
INSERT INTO emp_ventesocietereglement_table (f_ANNEE,
f_LIBELLE,
f_JANVIER,f_FEVRIER,f_MARS,f_AVRIL,f_MAI,
f_JUIN,f_JUIELLET,f_AOUT,
f_SEPT,f_OCT,f_NOV,f_DEC,
f_JANVIER_AVOIR,f_FEVRIER_AVOIR,f_MARS_AVOIR,f_AVRIL_AVOIR,f_MAI_AVOIR,
f_JUIN_AVOIR,f_JUIELLET_AVOIR,f_AOUT_AVOIR,
f_SEPT_AVOIR,f_OCT_AVOIR,f_NOV_AVOIR,f_DEC_AVOIR
)
 VALUES (v_ANNEE,v_LIBELLE,v_JANVIER,v_FEVRIER,v_MARS,v_AVRIL,v_MAI,v_JUIN,v_JUIELLET,v_AOUT,v_SEPT,v_OCT,v_NOV,v_DEC, v_JANVIER_AVOIR,v_FEVRIER_AVOIR,v_MARS_AVOIR,v_AVRIL_AVOIR,v_MAI_AVOIR,v_JUIN_AVOIR,v_JUIELLET_AVOIR,v_AOUT_AVOIR,v_SEPT_AVOIR,v_OCT_AVOIR,v_NOV_AVOIR,v_DEC_AVOIR);
END LOOP avoir_loop;
 CLOSE curavoir;
SELECT f_ANNEE,f_LIBELLE, 
(CASE WHEN f_JANVIER IS NOT NULL THEN f_JANVIER ELSE 0 END ) AS f_JANVIER,
(CASE WHEN f_FEVRIER IS NOT NULL THEN f_FEVRIER ELSE 0 END ) AS f_FEVRIER,
(CASE WHEN f_MARS IS NOT NULL THEN f_MARS ELSE 0 END ) AS f_MARS,
(CASE WHEN f_AVRIL IS NOT NULL THEN f_AVRIL ELSE 0 END ) AS f_AVRIL,
(CASE WHEN f_MAI IS NOT NULL THEN f_MAI ELSE 0 END ) AS f_MAI,
(CASE WHEN f_JUIN IS NOT NULL THEN f_JUIN ELSE 0 END ) AS f_JUIN,
(CASE WHEN f_JUIELLET IS NOT NULL THEN f_JUIELLET ELSE 0 END ) AS f_JUIELLET,
(CASE WHEN f_AOUT IS NOT NULL THEN f_AOUT ELSE 0 END ) AS f_AOUT,
(CASE WHEN f_SEPT IS NOT NULL THEN f_SEPT ELSE 0 END ) AS f_SEPT,
(CASE WHEN f_OCT IS NOT NULL THEN f_OCT ELSE 0 END ) AS f_OCT,
(CASE WHEN f_NOV IS NOT NULL THEN f_NOV ELSE 0 END ) AS f_NOV,
(CASE WHEN f_DEC IS NOT NULL THEN f_DEC ELSE 0 END ) AS f_DEC,
(CASE WHEN f_JANVIER_AVOIR IS NOT NULL THEN f_JANVIER_AVOIR ELSE 0 END ) AS f_JANVIER_AVOIR,
(CASE WHEN f_FEVRIER_AVOIR IS NOT NULL THEN f_FEVRIER_AVOIR ELSE 0 END ) AS f_FEVRIER_AVOIR,
(CASE WHEN f_MARS_AVOIR IS NOT NULL THEN f_MARS_AVOIR ELSE 0 END ) AS f_MARS_AVOIR,
(CASE WHEN f_AVRIL_AVOIR IS NOT NULL THEN f_AVRIL_AVOIR ELSE 0 END ) AS f_AVRIL_AVOIR,
(CASE WHEN f_MAI_AVOIR IS NOT NULL THEN f_MAI_AVOIR ELSE 0 END ) AS f_MAI_AVOIR,
(CASE WHEN f_JUIN_AVOIR IS NOT NULL THEN f_JUIN_AVOIR ELSE 0 END ) AS f_JUIN_AVOIR,
(CASE WHEN f_JUIELLET_AVOIR IS NOT NULL THEN f_JUIELLET_AVOIR ELSE 0 END ) AS f_JUIELLET_AVOIR,
(CASE WHEN f_AOUT_AVOIR IS NOT NULL THEN f_AOUT_AVOIR ELSE 0 END ) AS f_AOUT_AVOIR,
(CASE WHEN f_SEPT_AVOIR IS NOT NULL THEN f_SEPT_AVOIR ELSE 0 END ) AS f_SEPT_AVOIR,
(CASE WHEN f_OCT_AVOIR IS NOT NULL THEN f_OCT_AVOIR ELSE 0 END ) AS f_OCT_AVOIR,
(CASE WHEN f_NOV_AVOIR IS NOT NULL THEN f_NOV_AVOIR ELSE 0 END ) AS f_NOV_AVOIR,
(CASE WHEN f_DEC_AVOIR IS NOT NULL THEN f_DEC_AVOIR ELSE 0 END ) AS f_DEC_AVOIR
 FROM emp_ventesocietereglement_table
ORDER BY f_ANNEE ,f_LIBELLE;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. recompute_available_stock_all_products
DELIMITER //
CREATE PROCEDURE `recompute_available_stock_all_products`()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_product_id VARCHAR(60);
    DECLARE v_stock_actuel INT;
    DECLARE v_total_qty INT;
    DECLARE v_consumed INT;

    
    DECLARE cur_products CURSOR FOR
    
        
        SELECT f.lg_FAMILLE_ID,SUM(s.int_NUMBER_AVAILABLE+COALESCE (s.int_UG,0)) AS currentStock FROM  t_famille_stock s  JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID WHERE s.str_STATUT='enable' AND f.str_STATUT='enable' AND s.lg_EMPLACEMENT_ID='1'
 GROUP BY f.lg_FAMILLE_ID HAVING SUM(s.int_NUMBER_AVAILABLE+COALESCE (s.int_UG,0)) ;
        
        

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur_products;

    product_loop: LOOP
        FETCH cur_products INTO v_product_id, v_stock_actuel;
        IF done = 1 THEN
            LEAVE product_loop;
        END IF;

        
      
        SELECT IFNULL(SUM(l.int_NUMBER), 0)  INTO v_total_qty FROM t_lot l WHERE l.lg_FAMILLE_ID= v_product_id ;
        
        
        SET v_consumed = GREATEST(v_total_qty - v_stock_actuel, 0);

        
      SET @cum := 0;

        UPDATE t_lot l
        JOIN (
            SELECT
                lg_LOT_ID,
                int_NUMBER AS quantity,
                @cum := @cum + int_NUMBER  AS cumulative_qty,
                @cum_prev := @cum - int_NUMBER AS prev_cumulative
            FROM t_lot
            WHERE lg_FAMILLE_ID = v_product_id 
            ORDER BY dt_CREATED ASC
        ) c ON l.lg_LOT_ID = c.lg_LOT_ID
        SET l.current_stock =
            CASE
                WHEN v_consumed >= c.cumulative_qty THEN 0
                WHEN v_consumed <= c.prev_cumulative THEN c.quantity
                ELSE c.cumulative_qty - v_consumed
            END;

    END LOOP;

    CLOSE cur_products;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. statistiqFamilleArticleProcedure
DELIMITER //
CREATE PROCEDURE `statistiqFamilleArticleProcedure`(
        IN `periode_debut` VARCHAR(20),
        IN `periode_fin` VARCHAR(20)
    )
BEGIN
 	CREATE TEMPORARY TABLE Temp_statistiqFamilleArticle 
	(lg_FAMILLEARTICLE_ID VARCHAR(50)  DEFAULT ' '
     , str_LIBELLE VARCHAR(50) DEFAULT ' '
     , pr_vente INTEGER(11) DEFAULT 0
     , pr_vente_HT INTEGER(11) DEFAULT 0
     ,pr_achat INTEGER(11) DEFAULT 0
     , marge INTEGER(11) DEFAULT 0
     ,tauxMarge INTEGER(11) DEFAULT 0
     ,pr_vente_cumul INTEGER(11) DEFAULT 0
     , pr_vente_HT_cumul INTEGER(11) DEFAULT 0
     ,pr_achat_cumul INTEGER(11) DEFAULT 0);
     
     INSERT INTO Temp_statistiqFamilleArticle
     (select fa.lg_FAMILLEARTICLE_ID, fa.str_LIBELLE,SUM(pd.int_PRICE) pr_vente,
	(SUM(pd.int_PRICE) - SUM(tva.int_VALUE)) pr_vente_HT,
	SUM(f.int_PAT)* ABS(pd.int_QUANTITY_SERVED) pr_achat, 
	(SUM(pd.int_PRICE) - SUM(f.int_PAT)* ABS(pd.int_QUANTITY_SERVED)) marge,
	((SUM(pd.int_PRICE) - SUM(f.int_PAT)* ABS(pd.int_QUANTITY_SERVED))/SUM(pd.int_PRICE))*100 as tauxMarge,
    0,0,0
	FROM t_preenregistrement_detail pd
	JOIN t_famille f on f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID
 	JOIN t_famillearticle fa on fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID
 	JOIN t_code_tva tva on tva.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID
 	WHERE pd.str_STATUT like 'is_Closed' AND pd.dt_CREATED BETWEEN periode_debut and periode_fin
 	GROUP BY fa.lg_FAMILLEARTICLE_ID);
    
    INSERT INTO Temp_statistiqFamilleArticle
    (select fa.lg_FAMILLEARTICLE_ID, fa.str_LIBELLE,
     0,0,0,0,0,
    SUM(pd.int_PRICE) pr_vente,
	(SUM(pd.int_PRICE) - SUM(tva.int_VALUE)) pr_vente_HT,
	SUM(f.int_PAT)* ABS(pd.int_QUANTITY_SERVED) pr_achat
	FROM t_preenregistrement_detail pd
	JOIN t_famille f on f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID
 	JOIN t_famillearticle fa on fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID
 	JOIN t_code_tva tva on tva.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID
 	WHERE pd.str_STATUT like 'is_Closed' AND pd.dt_CREATED BETWEEN CONCAT(YEAR(CONVERT(periode_fin,DATE)),'/01/01') and periode_fin
 	GROUP BY fa.lg_FAMILLEARTICLE_ID);     
       
    select lg_FAMILLEARTICLE_ID, str_LIBELLE,SUM(pr_vente) pr_vente,
	(SUM(pr_vente_HT)) pr_vente_HT,
	SUM(pr_achat) pr_achat, 
	SUM(marge) marge,
	SUM(tauxMarge) as tauxMarge,
    SUM(pr_vente_cumul) pr_vente_cumul,
    SUM(pr_vente_HT_cumul) pr_vente_HT_cumul,
    SUM(pr_achat_cumul) pr_achat_cumul
	FROM Temp_statistiqFamilleArticle
 	GROUP BY lg_FAMILLEARTICLE_ID;
 	END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. StatistiqVenteProcedure
DELIMITER //
CREATE PROCEDURE `StatistiqVenteProcedure`(
        IN `p_annee` VARCHAR(4)
    )
BEGIN
 	CREATE TEMPORARY TABLE Temp_statistiqVente 
	(periode DATETIME  DEFAULT 0
     , nbr_client INTEGER(11) 
     , montant_brute_ttc_ord INTEGER(11) DEFAULT 0
     , montant_remise_ord INTEGER(11) DEFAULT 0
     ,montant_brute_ttc_nord INTEGER(11) DEFAULT 0
     , montant_remise_nord INTEGER(11) DEFAULT 0);
     
     INSERT INTO Temp_statistiqVente
     	(SELECT dt_CREATED AS periode,0,0,0,
    	int_PRICE AS montant_brute_ttc_nord,int_PRICE_REMISE AS montant_remise_nord 
  		from t_preenregistrement
  		WHERE lg_TYPE_VENTE_ID = 1 AND dt_CREATED BETWEEN CONCAT(p_annee, '/01/01') and CONCAT(p_annee, '/12/31'));
        
     INSERT INTO Temp_statistiqVente
     	(SELECT dt_CREATED AS periode,0,
    	int_PRICE AS montant_brute_ttc_ord,int_PRICE_REMISE AS montant_remise_ord,0,0 
        from t_preenregistrement
  		WHERE lg_TYPE_VENTE_ID <> 1 AND dt_CREATED BETWEEN CONCAT(p_annee, '/01/01') and CONCAT(p_annee, '/12/31')); 
        
     INSERT INTO Temp_statistiqVente
     	(SELECT dt_CREATED as periode, COUNT(lg_PREENREGISTREMENT_ID),
     	0,0,0,0 
     	from t_preenregistrement_compte_client
        WHERE dt_CREATED BETWEEN CONCAT(p_annee,'/01/01') and CONCAT(p_annee,'/12/31')
     	GROUP BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d %H:%i:%s'))
	 	ORDER BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-%d %H:%i:%s')));
        
        
         SELECT DATE(DATE_FORMAT(periode, '%Y-%m-01')) periode,
     SUM(nbr_client) nbr_client,
     (SUM(montant_brute_ttc_ord) + SUM(montant_brute_ttc_nord)) montant_brute_ttc,
     (SUM(montant_remise_ord)+SUM(montant_remise_nord)) montant_remise,
     ((SUM(montant_brute_ttc_ord) + SUM(montant_brute_ttc_nord)) - (SUM(montant_remise_ord)+SUM(montant_remise_nord))) montant_net_ttc,
     ROUND((SUM(montant_brute_ttc_ord)-SUM(montant_remise_ord))/(SELECT COUNT(lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID <> 1 AND dt_CREATED BETWEEN CONCAT(p_annee,'/01/01') and CONCAT(p_annee,'/12/31'))) pan_moy_ord,
     ROUND((SUM(montant_brute_ttc_nord)-SUM(montant_remise_nord))/(SELECT COUNT(lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID = 1 AND dt_CREATED BETWEEN CONCAT(p_annee,'/01/01') and CONCAT(p_annee,'/12/31'))) pan_moy_nord,
     SUM(montant_brute_ttc_ord) vente_ord,     
     SUM(montant_brute_ttc_nord) vente_non_ord
     from Temp_statistiqVente
     GROUP BY DATE(DATE_FORMAT(periode, '%Y-%m-01'))
	 ORDER BY DATE(DATE_FORMAT(periode, '%Y-%m-01')) DESC;
     END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. StoreProcTest
DELIMITER //
CREATE PROCEDURE `StoreProcTest`()
BEGIN
 SELECT * 
 FROM t_preenregistrement_detail;
 END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. suppresion_doublons_transacton_2hmvts
DELIMITER //
CREATE PROCEDURE `suppresion_doublons_transacton_2hmvts`()
BEGIN 

DECLARE ID VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT d.ID FROM doublon_hmvtproduit_table2 d;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO ID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
DELETE FROM  hmvtproduit  WHERE uuid=ID ;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. suppresion_doublons_transacton_2mvts
DELIMITER //
CREATE PROCEDURE `suppresion_doublons_transacton_2mvts`()
BEGIN 

DECLARE ID VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT d.ID FROM doublon_mvtransaction_table2 d;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO ID;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
DELETE FROM  mvttransaction  WHERE uuid=ID ;
END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. suppresion_doublons_transacton_hmvts
DELIMITER //
CREATE PROCEDURE `suppresion_doublons_transacton_hmvts`()
BEGIN 

DECLARE pkey VARCHAR(100);
DECLARE NB int(10);
DECLARE createdAt DATETIME;
DECLARE mvtuuid VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT d.pkey,d.nb,d.createdAt FROM DOUBLON_hMVTRANSACTION d;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO pkey,NB,createdAt;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO doublon_hmvtproduit_table2(ID,createdAt,pkey)  SELECT m.uuid,m.createdAt,m.pkey from  hmvtproduit m WHERE m.pkey=pkey LIMIT NB OFFSET 1;

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. suppresion_doublons_transacton_mvts
DELIMITER //
CREATE PROCEDURE `suppresion_doublons_transacton_mvts`()
BEGIN 

DECLARE pkey VARCHAR(100);
DECLARE NB int(10);
DECLARE createdAt DATETIME;
DECLARE mvtuuid VARCHAR(100);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT d.pkey,d.nb,d.createdAt FROM DOUBLON_MVTRANSACTION d;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO pkey,NB,createdAt;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT INTO doublon_mvtransaction_table2(ID,createdAt,pkey)  SELECT m.uuid,m.createdAt,m.pkey from  mvttransaction m WHERE m.pkey=pkey LIMIT NB OFFSET 1;

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. supprimer_cp_corrompus
DELIMITER //
CREATE PROCEDURE `supprimer_cp_corrompus`()
BEGIN 

DECLARE pkey VARCHAR(100);
DECLARE NB int(10);

DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT c.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` from t_preenregistrement_compte_client_tiers_payent c,t_preenregistrement p where c.`lg_USER_ID` IS NULL AND p.`lg_PREENREGISTREMENT_ID`=c.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed'
AND c.`str_STATUT`='is_Process';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO pkey;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
DELETE FROM t_preenregistrement_compte_client_tiers_payent where `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`=pkey;

END LOOP bl_loop;
 CLOSE curbl;

END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. Update_Stock_Journalier
DELIMITER //
CREATE PROCEDURE `Update_Stock_Journalier`()
BEGIN 
DECLARE Date_param varchar(15);
SELECT t.str_VALUE into Date_param from t_parameters t where t.str_KEY ='KEY_DAY';
  IF (Date_param <> CURRENT_DATE()) THEN
			update t_famille_stock t set t.int_NUMBER = t.int_NUMBER_AVAILABLE WHERE t.int_NUMBER <> t.int_NUMBER_AVAILABLE;	
			UPDATE t_parameters t set t.str_VALUE = CURRENT_DATE() where t.str_KEY ='KEY_DAY';
		END IF;
COMMIT;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. updatecalendar
DELIMITER //
CREATE PROCEDURE `updatecalendar`()
BEGIN
declare nbligne int default 0;

UPDATE  t_calendrier set int_NUMBER_JOUR=int_NUMBER_JOUR+1, dt_UPDATED=now(),dt_CREATED=now(),dt_BEGIN=now(),dt_END=now()
WHERE date(dt_UPDATED) <current_date()  AND MONTH(dt_CREATED)=MONTH(CURDATE()) ;

SELECT row_count() into nbligne;
IF nbligne=0 then
INSERT INTO t_calendrier (lg_CALENDRIER_ID,lg_MONTH_ID,int_NUMBER_JOUR,int_ANNEE,dt_CREATED,dt_BEGIN,dt_END,dt_UPDATED,str_STATUT)
VALUES(REPLACE(UUID(),'-',''),MONTH(CURDATE()),1,YEAR(CURDATE()) ,now(),now(),now(),now(),'enable');
END IF ;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. updatefamillenbvente
DELIMITER //
CREATE PROCEDURE `updatefamillenbvente`(
        IN `qty` INTEGER,
        IN `IDFAMILLEID` VARCHAR(20)
    )
BEGIN
UPDATE t_famille SET int_NOMBRE_VENTES=int_NOMBRE_VENTES+qty,dt_LAST_MOUVEMENT=now() WHERE lg_FAMILLE_ID=IDFAMILLEID;
UPDATE t_type_stock_famille SET int_NUMBER=int_NUMBER-qty WHERE lg_FAMILLE_ID=IDFAMILLEID AND 
lg_TYPE_STOCK_ID='1' AND lg_EMPLACEMENT_ID='1';
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. updatefamillenbventedepot
DELIMITER //
CREATE PROCEDURE `updatefamillenbventedepot`(
        IN `qty` INTEGER,
        IN `IDFAMILLEID` VARCHAR(20),
        IN `lgEMPLACEMENTID` VARCHAR(40)
    )
BEGIN

UPDATE t_type_stock_famille SET int_NUMBER=int_NUMBER-qty WHERE lg_FAMILLE_ID=IDFAMILLEID AND 
 lg_EMPLACEMENT_ID=lgEMPLACEMENTID;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. UpdateMouvement2
DELIMITER //
CREATE PROCEDURE `UpdateMouvement2`()
BEGIN
  DECLARE v_finished INTEGER DEFAULT 0;
        DECLARE quantite INTEGER DEFAULT 0;
        DECLARE v_counter INTEGER DEFAULT 0;
        DECLARE  v_max   INTEGER DEFAULT 0;
        DECLARE v_StockJourPasse INTEGER DEFAULT 0;
        DECLARE v_TamponStockJourPasse INTEGER DEFAULT 0;
        DECLARE  v_StockJourCourant   INTEGER DEFAULT 0;
        DECLARE FamilleProdID varchar(40);
        DECLARE MOUVEMENT_SNAPSHOT_ID varchar(40);
        DECLARE dt_past DATE;
        DECLARE dt_pastTampon DATE;
        DECLARE calculStock INTEGER DEFAULT 0;
  
 DEClARE StockCursor CURSOR FOR 
 SELECT lg_famille_ID, COUNT(*) AS nombre FROM t_mouvement_snapshot GROUP BY lg_famille_ID;
  
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN StockCursor;
 
 get_stock: LOOP
 
 FETCH StockCursor INTO FamilleProdID,quantite;
 
 IF v_finished = 1 THEN 
 LEAVE get_stock;
 END IF;

Set v_counter=0;
set v_TamponStockJourPasse=0;
SELECT 
    COUNT(*)
INTO v_max FROM
    t_mouvement_snapshot
WHERE
    lg_famille_ID = FamilleProdID;
while v_counter < v_max and v_max>1 do
    if v_counter=0  Then
		 select int_stock_Jour,dt_DAY into v_StockJourPasse,dt_past from t_mouvement_snapshot m where lg_famille_ID=FamilleProdID
         order by dt_day asc limit 1;
     end if;
   if v_counter>0  Then
      select int_stock_debut,dt_DAY,lg_MOUVEMENT_SNAPSHOT_ID,int_stock_Jour into v_StockJourCourant,dt_pastTampon,MOUVEMENT_SNAPSHOT_ID,v_TamponStockJourPasse from t_mouvement_snapshot m where lg_famille_ID=FamilleProdID and 
        dt_day>dt_past order by dt_day asc limit 1;
        set calculStock=v_TamponStockJourPasse;
	   if v_StockJourCourant<>v_StockJourPasse  then
       Set calculStock= v_StockJourPasse + v_TamponStockJourPasse - v_StockJourCourant;
       update t_mouvement_snapshot 
       set int_stock_debut=v_StockJourPasse,
           int_stock_jour= calculStock
       where lg_MOUVEMENT_SNAPSHOT_ID=MOUVEMENT_SNAPSHOT_ID;
       commit;
	  end if; 
      Set v_StockJourPasse=calculStock;
      Set dt_past=dt_pastTampon;
      set v_StockJourCourant=0;
     end if;
    set v_counter=v_counter+1;
  end while;
  commit;
 END LOOP get_stock;
 
 CLOSE StockCursor;
 
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. UpdateMouvementArticleAndStock
DELIMITER //
CREATE PROCEDURE `UpdateMouvementArticleAndStock`()
BEGIN

DECLARE lgFAMILLEID VARCHAR(40);
DECLARE done INT DEFAULT 0;
DECLARE STOCKFINAL INTEGER;
	
DECLARE curs1 CURSOR FOR 
SELECT t.lg_FAMILLE_ID FROM t_famille t WHERE t.str_STATUT = 'enable';


OPEN curs1;
LOOP
FETCH curs1 INTO lgFAMILLEID;
	BEGIN
		DECLARE lgMOUVEMENTSNAPSHOTID VARCHAR(40);
		DECLARE dtDAY DATE;
		DECLARE lgFAMILLEIDVIEW VARCHAR(40);
		DECLARE strDESCRIPTIONARTICLE TEXT;
		DECLARE intCIP VARCHAR(20);
		DECLARE intEAN13 VARCHAR(50);
		DECLARE intPRICE NUMERIC(12);
		DECLARE intPAF NUMERIC(12);
		DECLARE intSTOCKDEBUT NUMERIC(12);
		DECLARE intSTOCKJOUR NUMERIC(12);
		DECLARE intNUMBERVENTE NUMERIC(12);
		DECLARE intNUMBERDECONDITIONNEMENTOUT NUMERIC(12);
		DECLARE intNUMBERDECONDITIONNEMENTIN NUMERIC(12);
		DECLARE intNUMBERRETOURFOURNISSEUR NUMERIC(12);
		DECLARE intNUMBERPERIME NUMERIC(12);
		DECLARE intNUMBERAJUSTEMENTOUT NUMERIC(12);
		DECLARE intNUMBERAJUSTEMENTIN NUMERIC(12);
		DECLARE intNUMBERENTREESTOCK NUMERIC(12);
		DECLARE intNUMBERINVENTAIRE NUMERIC(12);
		DECLARE COMPTEUR INTEGER DEFAULT 1;
		
		DECLARE TOTAL NUMERIC(12);
		DECLARE STOCKTEMP NUMERIC(12);
		
		DECLARE curs2 CURSOR FOR 
		SELECT v.dt_DAY, v.int_STOCK_DEBUT, v.int_STOCK_JOUR, v.lg_FAMILLE_ID, v.str_DESCRIPTION_ARTICLE, v.int_CIP,
		v.int_EAN13, v.int_PRICE, v.int_PAF, v.lg_MOUVEMENT_SNAPSHOT_ID,
		(CASE WHEN v.int_NUMBER_VENTE IS NOT NULL THEN v.int_NUMBER_VENTE ELSE 0 END) AS int_NUMBER_VENTE,
		(CASE WHEN v.int_NUMBER_DECONDITIONNEMENT_OUT IS NOT NULL THEN v.int_NUMBER_DECONDITIONNEMENT_OUT ELSE 0 END) AS int_NUMBER_DECONDITIONNEMENT_OUT,
		(CASE WHEN v.int_NUMBER_DECONDITIONNEMENT_IN IS NOT NULL THEN v.int_NUMBER_DECONDITIONNEMENT_IN ELSE 0 END) AS int_NUMBER_DECONDITIONNEMENT_IN,
		(CASE WHEN v.int_NUMBER_RETOURFOURNISSEUR IS NOT NULL THEN v.int_NUMBER_RETOURFOURNISSEUR ELSE 0 END) AS int_NUMBER_RETOURFOURNISSEUR,
		(CASE WHEN v.int_NUMBER_PERIME IS NOT NULL THEN v.int_NUMBER_PERIME ELSE 0 END) AS int_NUMBER_PERIME,
		(CASE WHEN v.int_NUMBER_AJUSTEMENT_OUT IS NOT NULL THEN v.int_NUMBER_AJUSTEMENT_OUT ELSE 0 END) AS int_NUMBER_AJUSTEMENT_OUT,
		(CASE WHEN v.int_NUMBER_AJUSTEMENT_IN IS NOT NULL THEN v.int_NUMBER_AJUSTEMENT_IN ELSE 0 END) AS int_NUMBER_AJUSTEMENT_IN,
		(CASE WHEN v.int_NUMBER_ENTREESTOCK IS NOT NULL THEN v.int_NUMBER_ENTREESTOCK ELSE 0 END) AS int_NUMBER_ENTREESTOCK,
		(CASE WHEN v.int_NUMBER_INVENTAIRE IS NOT NULL THEN v.int_NUMBER_INVENTAIRE ELSE 0 END) AS int_NUMBER_INVENTAIRE
		FROM v_recap_mouvement_article v
		WHERE (v.dt_DAY >= '2016-02-01' AND v.dt_DAY <= '2016-04-24') AND v.lg_FAMILLE_ID LIKE lgFAMILLEID
		AND (v.int_CIP LIKE '%%' OR v.str_DESCRIPTION_ARTICLE LIKE '%%' OR v.int_EAN13 LIKE '%%')
		ORDER BY v.str_DESCRIPTION_ARTICLE, v.dt_DAY;
		
		OPEN curs2;
	
		LOOP
			FETCH curs2 INTO dtDAY,intSTOCKDEBUT,intSTOCKJOUR,lgFAMILLEIDVIEW,strDESCRIPTIONARTICLE,intCIP,intEAN13,intPRICE,intPAF,lgMOUVEMENTSNAPSHOTID,
			intNUMBERVENTE, intNUMBERDECONDITIONNEMENTOUT, intNUMBERDECONDITIONNEMENTIN, intNUMBERRETOURFOURNISSEUR, intNUMBERPERIME, intNUMBERAJUSTEMENTOUT,
			intNUMBERAJUSTEMENTIN, intNUMBERENTREESTOCK, intNUMBERINVENTAIRE;
			
				
			IF COMPTEUR = 1 THEN
				UPDATE t_mouvement_snapshot t SET t.int_STOCK_DEBUT = intSTOCKDEBUT WHERE t.lg_MOUVEMENT_SNAPSHOT_ID = lgMOUVEMENTSNAPSHOTID;
				SET STOCKTEMP = intSTOCKDEBUT;
			ELSE 
				IF intNUMBERINVENTAIRE = 0 THEN
					SET TOTAL = STOCKTEMP - intNUMBERVENTE - intNUMBERDECONDITIONNEMENTOUT - intNUMBERRETOURFOURNISSEUR - intNUMBERPERIME 
					+ intNUMBERDECONDITIONNEMENTIN + intNUMBERENTREESTOCK;		
				ELSE 
					SET TOTAL = intNUMBERINVENTAIRE;
				END IF;
				UPDATE t_mouvement_snapshot t SET t.int_STOCK_DEBUT = TOTAL WHERE t.lg_MOUVEMENT_SNAPSHOT_ID = lgMOUVEMENTSNAPSHOTID;
				SET STOCKTEMP = TOTAL;
			END IF;
			SET COMPTEUR=COMPTEUR+1;
			END LOOP;
			SET COMPTEUR = 1;
			SET STOCKFINAL = STOCKTEMP;
			UPDATE t_famille_stock t SET t.int_NUMBER_AVAILABLE = STOCKFINAL, t.int_NUMBER = STOCKFINAL WHERE t.lg_FAMILLE_ID = lgFAMILLEID;
			UPDATE t_type_stock_famille t SET t.int_NUMBER = STOCKFINAL WHERE t.lg_FAMILLE_ID = lgFAMILLEID;
			CLOSE curs2;
	END;
END LOOP;
CLOSE curs1;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. updatemouvementr
DELIMITER //
CREATE PROCEDURE `updatemouvementr`()
BEGIN 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_Quantitesnap INTEGER DEFAULT 0;
DECLARE v_QuantiteNormal INTEGER DEFAULT 0;
DECLARE FamilleID varchar(40);
DECLARE DT_past DATE;
DECLARE StockCursor CURSOR FOR 
Select v.lg_famille_id, v.DT_day, v.Quantite, int_stock_jour- f.int_stock_debut as QuantiteSnapshot from VwQuantiteParJourProd v, t_mouvement_snapshot f where f.LG_famille_id=v.LG_famille_id and v.DT_day=f.DT_day;
DECLARE CONTINUE HANDLER
FOR NOT FOUND SET v_finished=1;
Open StockCursor;
get_stock: LOOP 
FETCH StockCursor into familleid, DT_past,v_QuantiteNormal, v_Quantitesnap;
If v_finished =1 then 
Leave get_stock;
End if;
If v_QuantiteNormal<>v_Quantitesnap then
Update t_mouvement_snapshot 
Set int_stock_jour=int_stock_debut+v_QuantiteNormal 
Where lg_famille_id=familleid and DT_day=DT_past;
Commit;
End if ;
End loop get_stock;
CLOSE StockCursor;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. updatestockfamille
DELIMITER //
CREATE PROCEDURE `updatestockfamille`(
        IN `qtyVendu` INTEGER,
        IN `idFAMILLE` VARCHAR(20),
        IN `idVENTE` VARCHAR(20)
    )
BEGIN
declare nbligne int default 0;

UPDATE  t_snap_shop_daly_sortie_famille set int_BALANCE=int_BALANCE+qtyVendu, int_NUMBER_SORTIE=int_NUMBER_SORTIE+qtyVendu,int_NUMBERTRANSACTION=int_NUMBERTRANSACTION+1,dt_UPDATED=now()
WHERE date(dt_DAY) =current_date()  AND lg_FAMILLE_ID=`idFAMILLE` ;

SELECT row_count() into nbligne;
IF nbligne=0 then
INSERT INTO t_snap_shop_daly_sortie_famille (lg_ID,lg_FAMILLE_ID,int_BALANCE,dt_DAY,dt_CREATED,dt_UPDATED,str_STATUT,int_NUMBER_ENTREE,int_NUMBER_SORTIE,int_NUMBERTRANSACTION)
VALUES(REPLACE(UUID(),'-',''),idFAMILLE,qtyVendu,current_date() ,now(),now(),'enable',0,qtyVendu,1);
END IF ;
END//
DELIMITER ;

-- Listage de la structure de procédure laborex_v1_db. UpdateStockReapro
DELIMITER //
CREATE PROCEDURE `UpdateStockReapro`()
BEGIN 
DECLARE LGFAMILLEID VARCHAR(40);
DECLARE int_MONTH_LAST_SEUIL_UPDATE INT(11); 
DECLARE dt_LASTDAY_PREVIEW_MONTH VARCHAR(15); 
DECLARE dt_FIRSTDAY_3MONTH_AGO VARCHAR(15); 
DECLARE int_QTE_VENDUS DOUBLE; 
DECLARE int_QTE_JOUR DOUBLE; 
DECLARE intSEUILMINI DOUBLE; 
DECLARE intSEUILMAX DOUBLE; 
DECLARE intQUANTITEREAPPRO DOUBLE; 
DECLARE int_JOUR_STOCK DOUBLE; 
DECLARE int_DELAI_REAPPRO DOUBLE; 

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 
SELECT t.lg_FAMILLE_ID FROM t_famille t WHERE t.str_STATUT = 'enable'
AND t.bool_DECONDITIONNE = 0;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;


SELECT MONTH(t.str_VALUE) into int_MONTH_LAST_SEUIL_UPDATE from t_parameters t where t.str_KEY ='KEY_DAY_SEUIL_REAPPRO';
IF (int_MONTH_LAST_SEUIL_UPDATE <> MONTH(CURRENT_DATE())) THEN
	SELECT DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE()) DAY) into dt_LASTDAY_PREVIEW_MONTH;
	SELECT DATE_SUB(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY), INTERVAL 3 MONTH) into dt_FIRSTDAY_3MONTH_AGO;
	SELECT t.str_VALUE into int_JOUR_STOCK from t_parameters t where t.str_KEY ='KEY_DAY_STOCK';
	SELECT t.str_VALUE into int_DELAI_REAPPRO from t_parameters t where t.str_KEY ='KEY_DELAI_REAPPRO';
	OPEN curbl;
	bl_loop:LOOP
	FETCH curbl INTO LGFAMILLEID;
	IF done=1 THEN 
		LEAVE bl_loop;
	END IF;
	
	SELECT (CASE WHEN SUM(t.int_QUANTITY) IS NOT NULL THEN SUM(t.int_QUANTITY) ELSE 0 END) into int_QTE_VENDUS FROM t_preenregistrement_detail t, t_preenregistrement p 
	WHERE p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND p.str_STATUT = 'is_Closed' AND p.int_PRICE >= 0 AND p.`b_IS_CANCEL` = 0 
	AND DATE(p.dt_UPDATED) >= dt_FIRSTDAY_3MONTH_AGO AND DATE(p.dt_UPDATED) <= dt_LASTDAY_PREVIEW_MONTH AND t.lg_FAMILLE_ID = LGFAMILLEID; 
	
	SET int_QTE_JOUR = int_QTE_VENDUS / 84;
	SET intSEUILMINI = ceil(int_QTE_JOUR * int_JOUR_STOCK);
	SET intSEUILMAX = intSEUILMINI * int_JOUR_STOCK;
	SET intQUANTITEREAPPRO = ceil(int_QTE_JOUR * int_DELAI_REAPPRO);
	
	UPDATE t_famille t SET t.int_SEUIL_MIN = intSEUILMINI, t.int_SEUIL_MAX = intSEUILMAX, t.int_QTE_REAPPROVISIONNEMENT = intQUANTITEREAPPRO,
	t.dt_UPDATED = NOW(), t.dt_LAST_UPDATE_SEUILREAPPRO = NOW() WHERE t.lg_FAMILLE_ID = LGFAMILLEID;
	  		
	END LOOP bl_loop;
	CLOSE curbl;
	
	UPDATE t_parameters t set t.str_VALUE = CURRENT_DATE(), t.dt_UPDATED = NOW() WHERE t.str_KEY ='KEY_DAY_SEUIL_REAPPRO';
END IF;
END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. fct_getRESTANT
DELIMITER //
CREATE FUNCTION `fct_getRESTANT`(p_AMOUNT_RESTANT DOUBLE, p_AMOUNT_PAYE DOUBLE) RETURNS double
    DETERMINISTIC
BEGIN
    declare str_returned DOUBLE default 0; 
  SET str_returned = p_AMOUNT_RESTANT - p_AMOUNT_PAYE; 
  IF (str_returned >=0) THEN
          RETURN str_returned ;
  END IF;
    RETURN 0.0;
END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. fn_v_caisse
DELIMITER //
CREATE FUNCTION `fn_v_caisse`(`dt_date_debut` VARCHAR(20),
        `dt_date_fin` VARCHAR(20),
        `h_debut` VARCHAR(20),
        `h_fin` VARCHAR(20),
        `lg_USER_PARAM_ID` VARCHAR(40),
        `lg_TYPE_REGLEMENT_PARAM_ID` VARCHAR(40),
        `lg_EMPLACEMENT_PARAM_ID` VARCHAR(40)
    ) RETURNS double
BEGIN
DECLARE COUNTER DOUBLE;

DECLARE done INT DEFAULT 0;

DECLARE curbl CURSOR FOR 

select COUNT(DISTINCT(t.str_RESSOURCE_REF))
from ((((((`t_cash_transaction` `t` join `t_user` `u`) join `t_mode_reglement` `m`) join `t_reglement` `r`) join `t_type_reglement` `tr`) join `t_type_mvt_caisse` `mc`) join `t_emplacement` `e`) 
where ((`t`.`lg_USER_ID` = `u`.`lg_USER_ID`) and (`m`.`lg_MODE_REGLEMENT_ID` = `r`.`lg_MODE_REGLEMENT_ID`) and (`t`.`lg_REGLEMENT_ID` = `r`.`lg_REGLEMENT_ID`) and (`tr`.`lg_TYPE_REGLEMENT_ID` = `m`.`lg_TYPE_REGLEMENT_ID`) and (`mc`.`str_CODE_COMPTABLE` = convert(`t`.`str_NUMERO_COMPTE` using utf8)) and (`e`.`lg_EMPLACEMENT_ID` = `u`.`lg_EMPLACEMENT_ID`)) 
AND DATE(t.dt_CREATED) >= dt_date_debut AND DATE(t.dt_CREATED) <= dt_date_fin AND (TIME(t.dt_CREATED) >= h_debut and TIME(t.dt_CREATED) <= h_fin) 
AND t.lg_USER_ID LIKE lg_USER_PARAM_ID AND tr.lg_TYPE_REGLEMENT_ID LIKE lg_TYPE_REGLEMENT_PARAM_ID 
AND u.lg_EMPLACEMENT_ID LIKE lg_EMPLACEMENT_PARAM_ID AND t.bool_CHECKED = true 
ORDER BY t.dt_CREATED;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO COUNTER;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
END LOOP bl_loop;
 CLOSE curbl;
RETURN COUNTER;
END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getAccountBalance
DELIMITER //
CREATE FUNCTION `getAccountBalance`(strPhone VARCHAR(40)

    ) RETURNS double
    DETERMINISTIC
BEGIN

declare str_returned_value double default 0;

declare str_current double default 0;

DECLARE done INT DEFAULT 0;

DECLARE cur CURSOR FOR

select  dec_balance  from t_compte_client where lg_COMPTE_CLIENT_ID=strPhone;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

OPEN cur;

REPEAT

  FETCH cur INTO str_current;

  IF NOT done THEN

      set str_returned_value=str_current;

  END IF;

UNTIL done

END REPEAT;

  CLOSE cur;

RETURN str_returned_value;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getAccountBalance_Disponible
DELIMITER //
CREATE FUNCTION `getAccountBalance_Disponible`(strPhone VARCHAR(40)

    ) RETURNS double
    DETERMINISTIC
BEGIN

declare str_returned_value double default 0;

declare str_current double default 0;

DECLARE done INT DEFAULT 0;

DECLARE cur CURSOR FOR

select  dec_balance_Disponible  from t_compte_client where lg_COMPTE_CLIENT_ID=strPhone;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

OPEN cur;

REPEAT

  FETCH cur INTO str_current;

  IF NOT done THEN

      set str_returned_value=str_current;

  END IF;

UNTIL done

END REPEAT;

  CLOSE cur;

RETURN str_returned_value;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getAccountBalance_InDisponible
DELIMITER //
CREATE FUNCTION `getAccountBalance_InDisponible`(strPhone VARCHAR(40)

    ) RETURNS double
    DETERMINISTIC
BEGIN

declare str_returned_value double default 0;

declare str_current double default 0;

DECLARE done INT DEFAULT 0;

DECLARE cur CURSOR FOR

select  dec_balance_InDisponible  from t_compte_client where lg_COMPTE_CLIENT_ID=strPhone;

DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

OPEN cur;

REPEAT

  FETCH cur INTO str_current;

  IF NOT done THEN

      set str_returned_value=str_current;

  END IF;

UNTIL done

END REPEAT;

  CLOSE cur;

RETURN str_returned_value;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getLAST_PREENREGISTREMENT_COMPTE_CLIENT
DELIMITER //
CREATE FUNCTION `getLAST_PREENREGISTREMENT_COMPTE_CLIENT`(Olg_COMPTE_CLIENT VARCHAR(30)) RETURNS varchar(30) CHARSET utf8mb3
BEGIN
declare nb_result VARCHAR(30) default "";
   SELECT lg_PREENREGISTREMENT_ID FROM v_last_preenregistrement_compte_client WHERE v_last_preenregistrement_compte_client.lg_COMPTE_CLIENT_ID =  Olg_COMPTE_CLIENT  LIMIT 1
  INTO nb_result ;
  RETURN nb_result ;
END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getParameterValue
DELIMITER //
CREATE FUNCTION `getParameterValue`(str_key_param VARCHAR(40)
    ) RETURNS varchar(200) CHARSET latin1
BEGIN
declare str_returned_value varchar(5000) default "";
declare str_current varchar(5000) default "";
DECLARE done INT DEFAULT 0;
DECLARE cur CURSOR FOR
select  str_VALUE from t_parameters where str_KEY=str_key_param;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
OPEN cur;
REPEAT
  FETCH cur INTO str_current;
  IF NOT done THEN
      set str_returned_value=str_current;
  END IF;
UNTIL done
END REPEAT;
  CLOSE cur;
RETURN str_returned_value;
END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getSTATS_VENTE
DELIMITER //
CREATE FUNCTION `getSTATS_VENTE`(P_lg_PRODUCT_ITEM_ID VARCHAR(30), P_date_debut VARCHAR(30), P_date_fin VARCHAR(30)) RETURNS int(20)
    DETERMINISTIC
BEGIN

declare nb_result INT(20) default 0;

SELECT SUM( t_order_transaction.int_NUMBER )  FROM       t_order_transaction

WHERE t_order_transaction.lg_PRODUCT_ITEM_ID  = P_lg_PRODUCT_ITEM_ID

AND t_order_transaction.dt_CREATED between P_date_debut and P_date_fin

INTO nb_result ;



RETURN nb_result;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getTOTAL_VENTE
DELIMITER //
CREATE FUNCTION `getTOTAL_VENTE`(P_date_debut VARCHAR(30), P_date_fin VARCHAR(30)) RETURNS int(20)
    DETERMINISTIC
BEGIN

declare nb_result INT(20) default 0;

SELECT SUM( t_snap_shop_daly_recette_caisse.int_AMOUNT )  FROM   t_snap_shop_daly_recette_caisse

WHERE t_snap_shop_daly_recette_caisse.dt_DAY between P_date_debut and P_date_fin

INTO nb_result ;



RETURN nb_result;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getTOTAL_VENTE_CAISSE
DELIMITER //
CREATE FUNCTION `getTOTAL_VENTE_CAISSE`(P_date_debut VARCHAR(30), P_date_fin VARCHAR(30)) RETURNS int(20)
    DETERMINISTIC
BEGIN

declare nb_result INT(20) default 0;

SELECT SUM( t_resume_caisse.int_SOLDE_SOIR )  FROM   t_resume_caisse

WHERE t_resume_caisse.dt_CREATED between P_date_debut and P_date_fin

INTO nb_result ;



RETURN nb_result;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getTOTAL_VENTE_REMISE
DELIMITER //
CREATE FUNCTION `getTOTAL_VENTE_REMISE`(P_date_debut VARCHAR(30), P_date_fin VARCHAR(30)) RETURNS int(20)
    DETERMINISTIC
BEGIN

declare nb_result INT(20) default 0;

SELECT SUM( t_snap_shop_daly_recette_caisse.int_AMOUNT_REMISE )  FROM   t_snap_shop_daly_recette_caisse

WHERE t_snap_shop_daly_recette_caisse.dt_DAY between P_date_debut and P_date_fin

INTO nb_result ;



RETURN nb_result;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getTOTAL_VNO
DELIMITER //
CREATE FUNCTION `getTOTAL_VNO`(P_date_debut VARCHAR(30), P_date_fin VARCHAR(30)) RETURNS int(20)
    DETERMINISTIC
BEGIN

declare nb_result INT(20) default 0;

SELECT SUM( t_snap_shop_daly_recette_caisse.int_NUMBER_VNO )  FROM   t_snap_shop_daly_recette_caisse

WHERE t_snap_shop_daly_recette_caisse.dt_CREATED between P_date_debut and P_date_fin

INTO nb_result ;



RETURN nb_result;

END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. getTOTAL_VO
DELIMITER //
CREATE FUNCTION `getTOTAL_VO`(P_date_debut VARCHAR(30), P_date_fin VARCHAR(30)) RETURNS int(20)
    DETERMINISTIC
BEGIN
declare nb_result INT(20) default 0;
SELECT SUM( t_snap_shop_daly_recette_caisse.int_NUMBER_VO )  FROM   t_snap_shop_daly_recette_caisse
WHERE t_snap_shop_daly_recette_caisse.dt_DAY between P_date_debut and P_date_fin
INTO nb_result ;

RETURN nb_result;
END//
DELIMITER ;

-- Listage de la structure de fonction laborex_v1_db. setParameterValue
DELIMITER //
CREATE FUNCTION `setParameterValue`(str_key_param VARCHAR(40),

        str_value_param VARCHAR(200)

    ) RETURNS tinyint(10)
BEGIN

declare str_returned_value varchar(5000) default 0;

update t_parameters set str_VALUE=str_value_param where str_KEY=str_key_param;

set str_returned_value=1;

return str_returned_value;

END//
DELIMITER ;

-- Listage de la structure de déclencheur laborex_v1_db. _before_ins_tr2
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `_before_ins_tr2` BEFORE INSERT ON `t_compte_client_tiers_payant`
  FOR EACH ROW
BEGIN
set NEW.db_CONSOMMATION_MENSUELLE=0;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. _before_ins_tr3
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `_before_ins_tr3` BEFORE INSERT ON `t_tiers_payant`
  FOR EACH ROW
BEGIN
SET NEW.b_CANBEUSE=TRUE;
SET NEW.db_CONSOMMATION_MENSUELLE=0;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_bon_livraison_before_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_bon_livraison_before_insert` BEFORE INSERT ON `t_bon_livraison` FOR EACH ROW BEGIN
set NEW.STATUS = 'NON REGLE';
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_bon_livraison_detail_before_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_bon_livraison_detail_before_insert` BEFORE INSERT ON `t_bon_livraison_detail` FOR EACH ROW BEGIN
set NEW.int_QTE_UG = 0;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_cash_transaction_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_cash_transaction_before_ins_tr` BEFORE INSERT ON `t_cash_transaction` FOR EACH ROW BEGIN


SET NEW.dt_CREATED = NOW();

IF NEW.int_AMOUNT > 0 THEN

SET NEW.int_AMOUNT_CREDIT = NEW.int_AMOUNT ;

ELSE

SET NEW.int_AMOUNT_DEBIT = (-1*NEW.int_AMOUNT) ;

END IF;


 UPDATE t_caisse

        SET t_caisse.dt_UPDATED = NOW(),

               t_caisse.int_SOLDE = (
		  CASE 
		  WHEN (NEW.str_TRANSACTION_REF = 'C' AND NEW.str_TASK = 'VENTE') OR (NEW.str_TRANSACTION_REF = 'C' AND NEW.str_TASK = 'OTHER') THEN t_caisse.int_SOLDE + NEW.int_AMOUNT_CREDIT
		  		  WHEN  NEW.str_TRANSACTION_REF = 'C' AND NEW.str_TASK = 'ANNULE_VENTE' AND NEW.str_TYPE_VENTE = 'VO' THEN t_caisse.int_SOLDE
		  		 
			ELSE t_caisse.int_SOLDE - (NEW.int_AMOUNT_DEBIT + NEW.int_AMOUNT_CREDIT) 
		  END
)

        WHERE t_caisse.lg_USER_ID = NEW.lg_USER_ID;

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_cash_transaction_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_cash_transaction_before_upd_tr` BEFORE UPDATE ON `t_cash_transaction` FOR EACH ROW BEGIN

SET NEW.dt_UPDATED = NOW();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_compte_client_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER t_compte_client_before_ins_tr BEFORE INSERT ON `t_compte_client` FOR EACH ROW BEGIN

set NEW.dt_effective=now();

set NEW.dt_UPDATED=now();

set NEW.dt_CREATED=now();

set NEW.dec_Balance = NEW.dec_Balance_Disponible - NEW.dec_Balance_InDisponible;

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_compte_client_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER t_compte_client_before_upd_tr BEFORE UPDATE ON `t_compte_client` FOR EACH ROW BEGIN

set NEW.dt_effective=now();

if(NEW.dec_Balance<>OLD.dec_Balance) then
set NEW.dt_UPDATED=now();
end if;

set NEW.dec_Balance = NEW.dec_Balance_Disponible - NEW.dec_Balance_InDisponible;

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_emplacement_before_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_emplacement_before_insert` BEFORE INSERT ON `t_emplacement` FOR EACH ROW BEGIN
	SET NEW.str_REF = CONCAT('[{"int_last_code":"00000","str_last_date":"',DATE_FORMAT(NOW(),'%Y/%m/%d'),'"}]');
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_facture_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_facture_before_upd_tr` BEFORE UPDATE ON `t_facture` FOR EACH ROW BEGIN
      set new.dbl_MONTANT_RESTANT = fct_getRESTANT(NEW.dbl_MONTANT_CMDE, NEW.dbl_MONTANT_PAYE);

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_before_ins_tr` BEFORE INSERT ON `t_famille` FOR EACH ROW BEGIN
SET NEW.dt_LAST_MOUVEMENT = NOW();
SET NEW.dt_UPDATED = NOW();
set NEW.int_NOMBRE_VENTES = 0;
set NEW.int_NBRE_SORTIE = 0;
set NEW.int_QTE_SORTIE = 0;
set NEW.int_MOY_VENTE = 0;
set NEW.dbl_PRIX_MOYEN_PONDERE = 0;
set NEW.bl_PROMOTED = false;
set NEW.bool_ACCOUNT=true;
INSERT t_famille_history(lg_FAMILLE_ID,int_PRICE,int_PRICE_TIPS,int_TAUX_MARQUE,
int_PAF,int_PAT,lg_GROSSISTE_ID,dt_CREATED) 
VALUE (NEW.lg_FAMILLE_ID,NEW.int_PRICE,NEW.int_PRICE_TIPS,
NEW.int_TAUX_MARQUE,NEW.int_PAF,NEW.int_PAT,NEW.lg_GROSSISTE_ID,NOW() );
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_before_upd_tr` BEFORE UPDATE ON `t_famille` FOR EACH ROW BEGIN
SET NEW.dt_UPDATED = NOW();
INSERT t_famille_history(lg_FAMILLE_ID,int_PRICE,int_PRICE_TIPS,int_TAUX_MARQUE,
int_PAF,int_PAT,lg_GROSSISTE_ID,dt_CREATED) 
VALUE (NEW.lg_FAMILLE_ID,NEW.int_PRICE,NEW.int_PRICE_TIPS,
NEW.int_TAUX_MARQUE,NEW.int_PAF,NEW.int_PAT,NEW.lg_GROSSISTE_ID,NOW() );

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_dci_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_dci_before_ins_tr` BEFORE INSERT ON `t_famille_dci` FOR EACH ROW BEGIN


        set new.str_STATUT='enable';
        set new.dt_CREATED=NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_dci_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_dci_before_upd_tr` BEFORE UPDATE ON `t_famille_dci` FOR EACH ROW BEGIN



        set new.dt_UPDATED=NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_grossiste_before_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_grossiste_before_insert` BEFORE INSERT ON `t_famille_grossiste` FOR EACH ROW BEGIN
set NEW.bl_RUPTURE = TRUE;
set NEW.int_NBRE_RUPTURE= 0;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_stock_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_stock_before_ins_tr` BEFORE INSERT ON `t_famille_stock` FOR EACH ROW BEGIN

        set new.dt_CREATED=NOW();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_famille_stock_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_famille_stock_before_upd_tr` BEFORE UPDATE ON `t_famille_stock` FOR EACH ROW BEGIN

        set new.dt_UPDATED=NOW();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_mouvement_before_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_mouvement_before_update` BEFORE UPDATE ON `t_mouvement` FOR EACH ROW BEGIN

    set new.dt_UPDATED = NOW();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_mouvementprice_before_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_mouvementprice_before_insert` BEFORE INSERT ON `t_mouvementprice` FOR EACH ROW BEGIN
set NEW.int_ECART = NEW.int_PRICE_NEW - NEW.int_PRICE_OLD;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_mouvementprice_before_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_mouvementprice_before_update` BEFORE UPDATE ON `t_mouvementprice` FOR EACH ROW BEGIN
set NEW.int_ECART = NEW.int_PRICE_NEW - NEW.int_PRICE_OLD;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_order_details_indicateur
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_order_details_indicateur` AFTER INSERT ON `t_order_detail`
  FOR EACH ROW
BEGIN
IF NEW.str_STATUT='is_Process' THEN
UPDATE t_famille SET int_ORERSTATUS = 2, b_CODEINDICATEUR =1 WHERE lg_FAMILLE_ID = NEW.lg_FAMILLE_ID ;
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_order_details_indicateur_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_order_details_indicateur_update` AFTER UPDATE ON `t_order_detail`
FOR EACH ROW
BEGIN
IF NEW.str_STATUT='passed' THEN
UPDATE t_famille SET int_ORERSTATUS = 3, b_CODEINDICATEUR =1 WHERE lg_FAMILLE_ID = NEW.lg_FAMILLE_ID ;
ELSEIF  NEW.str_STATUT='ENTREE_STOCK' THEN
UPDATE t_famille SET int_ORERSTATUS = 4, b_CODEINDICATEUR =3 WHERE lg_FAMILLE_ID = NEW.lg_FAMILLE_ID ;
ELSEIF  NEW.str_STATUT='is_Process' THEN
UPDATE t_famille SET  int_ORERSTATUS = 2, b_CODEINDICATEUR =1 WHERE lg_FAMILLE_ID = NEW.lg_FAMILLE_ID ;
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_order_details_updateInd
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_order_details_updateInd` AFTER INSERT ON `t_warehouse`
  FOR EACH ROW
BEGIN
    IF NEW.str_STATUT='enable' THEN
CALL proc_indicateur_sugges(NEW.lg_FAMILLE_ID) ;
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_preenregistrement_compte_client_tiers_payent_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_preenregistrement_compte_client_tiers_payent_before_ins_tr` BEFORE INSERT ON `t_preenregistrement_compte_client_tiers_payent` FOR EACH ROW BEGIN
  SET NEW.str_STATUT_FACTURE ='unpaid';
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_preenregistrement_detail_before_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER t_preenregistrement_detail_before_insert
BEFORE INSERT ON t_preenregistrement_detail
FOR EACH ROW
BEGIN

set NEW.b_IS_AVOIR = false;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_preenregistrement_detail_before_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_preenregistrement_detail_before_update` BEFORE UPDATE ON `t_preenregistrement_detail` FOR EACH ROW BEGIN
IF NEW.str_STATUT = 'is_Closed' THEN
	CALL proc_save_product_in_snapsnot_famillesell(OLD.lg_FAMILLE_ID,NEW.int_AVOIR_SERVED, MONTH(NOW()), YEAR(NOW()));
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_recette_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_recette_before_ins_tr` BEFORE INSERT ON `t_snap_shop_daly_recette` FOR EACH ROW BEGIN

    set new.dt_CREATED = NOW();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_recette_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_recette_before_upd_tr` BEFORE UPDATE ON `t_snap_shop_daly_recette` FOR EACH ROW BEGIN

          set new.dt_UPDATED = NOW();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_recette_caisse_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_recette_caisse_before_ins_tr` BEFORE INSERT ON `t_snap_shop_daly_recette_caisse` FOR EACH ROW BEGIN



    set new.dt_CREATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_recette_caisse_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_recette_caisse_before_upd_tr` BEFORE UPDATE ON `t_snap_shop_daly_recette_caisse` FOR EACH ROW BEGIN



          set new.dt_UPDATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_sortie_famille_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_sortie_famille_before_ins_tr` BEFORE INSERT ON `t_snap_shop_daly_sortie_famille` FOR EACH ROW BEGIN



    set new.dt_CREATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_sortie_famille_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_sortie_famille_before_upd_tr` BEFORE UPDATE ON `t_snap_shop_daly_sortie_famille` FOR EACH ROW BEGIN



          set new.dt_UPDATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_stat_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_stat_before_ins_tr` BEFORE INSERT ON `t_snap_shop_daly_stat` FOR EACH ROW BEGIN



    set new.dt_CREATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_stat_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_stat_before_upd_tr` BEFORE UPDATE ON `t_snap_shop_daly_stat` FOR EACH ROW BEGIN



          set new.dt_UPDATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_stat_frequentation_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_stat_frequentation_ins_tr` BEFORE INSERT ON `t_snap_shop_daly_stat_frequentation` FOR EACH ROW BEGIN



    set new.dt_CREATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_stat_frequentation_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_stat_frequentation_upd_tr` BEFORE UPDATE ON `t_snap_shop_daly_stat_frequentation` FOR EACH ROW BEGIN



          set new.dt_UPDATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_vente_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_vente_before_ins_tr` BEFORE INSERT ON `t_snap_shop_daly_vente` FOR EACH ROW BEGIN



    set new.dt_CREATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_snap_shop_daly_vente_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_snap_shop_daly_vente_before_upd_tr` BEFORE UPDATE ON `t_snap_shop_daly_vente` FOR EACH ROW BEGIN



          set new.dt_UPDATED = NOW();



END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_sugesstion_indicateur
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_sugesstion_indicateur` AFTER INSERT ON `t_suggestion_order_details`
  FOR EACH ROW
BEGIN
UPDATE t_famille SET int_ORERSTATUS = 1 WHERE lg_FAMILLE_ID = NEW.lg_FAMILLE_ID ;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_tranche_horaire_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_tranche_horaire_before_ins_tr` BEFORE INSERT ON `t_tranche_horaire` FOR EACH ROW BEGIN
set new.dt_CREATED = NOW();
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_tranche_horaire_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_tranche_horaire_before_upd_tr` BEFORE UPDATE ON `t_tranche_horaire` FOR EACH ROW BEGIN
set new.dt_UPDATED = NOW();
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_transaction_acount_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_transaction_acount_before_ins_tr` BEFORE INSERT ON `t_transaction` FOR EACH ROW BEGIN

set NEW.dt_date_created=now();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_user_account_snap_shot_before_ins_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_user_account_snap_shot_before_ins_tr` BEFORE INSERT ON `t_user_account_snap_shot` FOR EACH ROW BEGIN

set NEW.dt_effective=now();

set NEW.dt_last_update=now();

set NEW.dt_date_creation=now();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. t_user_account_snap_shot_before_upd_tr
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `t_user_account_snap_shot_before_upd_tr` BEFORE UPDATE ON `t_user_account_snap_shot` FOR EACH ROW BEGIN

set NEW.dt_last_update=now();

END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. TrgCheckInsert_event_log
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `TrgCheckInsert_event_log` BEFORE INSERT ON `t_event_log` FOR EACH ROW SET NEW.dt_CREATED = NOW()//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Listage de la structure de déclencheur laborex_v1_db. TrgCheckUpdate_t_event_log
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `TrgCheckUpdate_t_event_log` BEFORE UPDATE ON `t_event_log` FOR EACH ROW SET NEW.dt_UPDATED = NOW()//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `select t.lg_famille_id, t.str_description, t.int_cip, bd.int_paf`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `select t.lg_famille_id, t.str_description, t.int_cip, bd.int_paf` AS select 1 AS `lg_FAMILLE_ID`,1 AS `str_DESCRIPTION`,1 AS `int_CIP`,1 AS `int_PAF`,1 AS `lg_GROSSISTE_ID`,1 AS `int_EAN13`,1 AS `lg_BON_LIVRAISON_ID`,1 AS `str_REF_LIVRAISON`,1 AS `str_STATUT`,1 AS `str_CODE_ARTICLE`
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_article_recherche`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_article_recherche` AS select distinct `t_famille_stock`.`int_NUMBER_AVAILABLE` AS `int_NUMBER_AVAILABLE`,`t_famille_stock`.`int_NUMBER` AS `int_NUMBER`,`t_famille`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,`t_famille`.`bl_PROMOTED` AS `bl_PROMOTED`,`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,`t_famille`.`str_NAME` AS `str_NAME`,`t_famille`.`int_PRICE` AS `int_PRICE`,`t_famille`.`int_PAF` AS `int_PAF`,`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille_stock`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_CIP2` AS `int_CIP2`,`t_famille`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID`,`t_famille`.`int_EAN13` AS `int_EAN13`,`t_famille`.`str_STATUT` AS `str_STATUT`,`t_famille_grossiste`.`str_CODE_ARTICLE` AS `str_CODE_ARTICLE`,`t_zone_geographique`.`str_LIBELLEE` AS `str_LIBELLEE`,`t_zone_geographique`.`str_CODE` AS `str_CODE_EMPLACEMENT`,`t_grossiste`.`str_CODE` AS `str_CODE_GROSSISTE`,`t_grossiste`.`str_DESCRIPTION` AS `str_DESCRIPTION_GROSSISTE`,`t_famille`.`int_T` AS `int_T` from ((((`t_famille` join `t_famille_stock` on(`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)) join `t_famille_grossiste` on(`t_famille`.`lg_FAMILLE_ID` = `t_famille_grossiste`.`lg_FAMILLE_ID`)) join `t_zone_geographique` on(`t_famille`.`lg_ZONE_GEO_ID` = `t_zone_geographique`.`lg_ZONE_GEO_ID`)) join `t_grossiste` on(`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_article_recherche_dci`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_article_recherche_dci` AS select `t_dci`.`str_CODE` AS `str_CODE`,`t_dci`.`str_NAME` AS `str_NAME_DCI`,`t_famille`.`str_NAME` AS `str_NAME`,`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,`t_famille`.`bl_PROMOTED` AS `bl_PROMOTED`,`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,`t_famille_stock`.`int_NUMBER` AS `int_NUMBER`,`t_famille_stock`.`int_NUMBER_AVAILABLE` AS `int_NUMBER_AVAILABLE`,`t_famille_stock`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_CIP2` AS `int_CIP2`,`t_famille`.`int_EAN13` AS `int_EAN13`,`t_famille`.`int_PRICE` AS `int_PRICE`,`t_famille`.`int_PAF` AS `int_PAF`,`t_famille`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t_famille`.`str_STATUT` AS `str_STATUT`,`t_zone_geographique`.`str_LIBELLEE` AS `str_LIBELLEE`,`t_zone_geographique`.`str_CODE` AS `str_CODE_EMPLACEMENT`,`t_grossiste`.`str_CODE` AS `str_CODE_GROSSISTE`,`t_grossiste`.`str_DESCRIPTION` AS `str_DESCRIPTION_GROSSISTE`,`t_famille`.`int_T` AS `int_T`,`t_famille`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID` from (((((`t_famille` join `t_famille_dci` on(`t_famille`.`lg_FAMILLE_ID` = `t_famille_dci`.`lg_FAMILLE_ID`)) join `t_dci` on(`t_famille_dci`.`lg_DCI_ID` = `t_dci`.`lg_DCI_ID`)) join `t_famille_stock` on(`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)) join `t_zone_geographique` on(`t_famille`.`lg_ZONE_GEO_ID` = `t_zone_geographique`.`lg_ZONE_GEO_ID`)) join `t_grossiste` on(`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_article_vendu`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_article_vendu` AS select `t_preenregistrement_detail`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t_preenregistrement_detail`.`int_AVOIR` AS `int_AVOIR`,`t_famille`.`str_NAME` AS `str_NAME`,`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`bool_DECONDITIONNE` AS `bool_DECONDITIONNE`,`t_famille`.`bool_DECONDITIONNE_EXIST` AS `bool_DECONDITIONNE_EXIST`,`t_preenregistrement_detail`.`int_PRICE` AS `int_PRICE`,`t_preenregistrement`.`str_STATUT` AS `str_STATUT`,`t_preenregistrement`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,`t_preenregistrement`.`str_ORDONNANCE` AS `str_ORDONNANCE`,`t_preenregistrement`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,`t_preenregistrement`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,`t_preenregistrement`.`str_REF_TICKET` AS `str_REF_TICKET`,`t_preenregistrement`.`lg_REGLEMENT_ID` AS `lg_REGLEMENT_ID`,`t_preenregistrement`.`lg_REMISE_ID` AS `lg_REMISE_ID`,`t_preenregistrement`.`dt_UPDATED` AS `dt_UPDATED`,`t_preenregistrement`.`str_REF_BON` AS `str_REF_BON`,`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`t_preenregistrement`.`str_REF` AS `str_REF`,`t_preenregistrement_detail`.`int_QUANTITY` AS `int_QUANTITY`,`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER`,concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_user`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_stock_famille`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,`t_preenregistrement_detail`.`lg_PREENREGISTREMENT_DETAIL_ID` AS `lg_PREENREGISTREMENT_DETAIL_ID` from (((((`t_preenregistrement` join `t_preenregistrement_detail` on(`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`)) join `t_famille` on(`t_preenregistrement_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`)) join `t_type_stock_famille` on(`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`)) join `t_user` on(`t_preenregistrement`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)) join `t_grossiste` on(`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`)) where `t_preenregistrement`.`str_STATUT` = 'is_closed' and `t_preenregistrement`.`int_PRICE` >= 0 and `t_preenregistrement`.`b_IS_CANCEL` = 0 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_balance_vente`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_balance_vente` AS select `t_cash_transaction`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,count(distinct `t_cash_transaction`.`str_REF_FACTURE`) AS `NB_VENTE`,sum(`t_preenregistrement`.`int_PRICE`) AS `BRUT_TTC`,sum(`t_preenregistrement`.`int_PRICE_REMISE`) AS `REMISE`,`t_type_reglement`.`str_NAME` AS `str_NAME`,`t_cash_transaction`.`dt_CREATED` AS `dt_CREATED` from ((`t_cash_transaction` join `t_preenregistrement` on(convert(`t_cash_transaction`.`str_RESSOURCE_REF` using utf8) = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)) join `t_type_reglement` on(`t_cash_transaction`.`lg_TYPE_REGLEMENT_ID` = `t_type_reglement`.`lg_TYPE_REGLEMENT_ID`)) where `t_cash_transaction`.`str_TYPE_VENTE` <> '' group by `t_cash_transaction`.`str_TYPE_VENTE` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_balance_vente_caisse`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_balance_vente_caisse` AS select sum(`t`.`int_PRICE`) AS `NET`,count(distinct `o`.`str_RESSOURCE_REF`) AS `NB`,`o`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,sum(`t`.`int_PRICE`) / count(distinct `o`.`str_RESSOURCE_REF`) AS `PANIER`,`o`.`lg_TYPE_REGLEMENT_ID` AS `lg_TYPE_REGLEMENT_ID`,`tr`.`str_DESCRIPTION` AS `str_DESCRIPTION`,sum(`o`.`int_AMOUNT_DEBIT`) AS `DETETIERPAYS`,sum(`o`.`int_AMOUNT_CREDIT`) AS `RECEIVE`,`o`.`dt_CREATED` AS `dt_CREATED` from ((`t_cash_transaction` `o` join `t_preenregistrement` `t`) join `t_type_reglement` `tr`) where `t`.`lg_PREENREGISTREMENT_ID` = convert(`o`.`str_RESSOURCE_REF` using utf8) and `o`.`lg_TYPE_REGLEMENT_ID` = `tr`.`lg_TYPE_REGLEMENT_ID` group by `o`.`str_TYPE_VENTE`,`o`.`lg_TYPE_REGLEMENT_ID` order by `o`.`str_TYPE_VENTE`,`tr`.`str_DESCRIPTION` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_caisse`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_caisse` AS select `t`.`bool_CHECKED` AS `bool_CHECKED`,`t`.`str_RESSOURCE_REF` AS `str_RESSOURCE_REF`,case when (`t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE') then (select `p`.`str_REF` from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) else `t`.`str_RESSOURCE_REF` end AS `str_RESSOURCE_REF_BIS`,case when (`t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE') then (select `p`.`b_IS_CANCEL` from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) else 0 end AS `ETAT_VENTE`,`t`.`str_TASK` AS `str_TASK`,case when `t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE' then case when `t`.`str_TYPE_VENTE` = 'VO' then (select case when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` > 0 then sum(`t`.`int_AMOUNT_CREDIT`) when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` < 0 then -1 * sum(`t`.`int_AMOUNT_DEBIT`) else `p`.`int_CUST_PART` end from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8) group by `t`.`str_RESSOURCE_REF`) else (select case when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` > 0 then sum(`t`.`int_AMOUNT_CREDIT`) when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` < 0 then -1 * sum(`t`.`int_AMOUNT_DEBIT`) when `p`.`int_PRICE` > 0 then `p`.`int_PRICE` - `p`.`int_PRICE_REMISE` else `p`.`int_PRICE` + -1 * `p`.`int_PRICE_REMISE` end from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) end else case when `t`.`str_TRANSACTION_REF` = 'C' then `t`.`int_AMOUNT_CREDIT` else -1 * `t`.`int_AMOUNT_DEBIT` end end AS `int_AMOUNT`,case when `t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE' then case when `t`.`str_TYPE_VENTE` = 'VO' then (select case when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` > 0 then sum(`t`.`int_AMOUNT_CREDIT`) when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` < 0 then -1 * sum(`t`.`int_AMOUNT_DEBIT`) else `p`.`int_CUST_PART` end from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8) group by `t`.`str_RESSOURCE_REF`) else (select case when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` > 0 then sum(`t`.`int_AMOUNT_CREDIT`) when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` < 0 then -1 * sum(`t`.`int_AMOUNT_DEBIT`) when `p`.`int_PRICE_OTHER` > 0 then `p`.`int_PRICE_OTHER` - `p`.`int_PRICE_REMISE` else `p`.`int_PRICE_OTHER` + -1 * `p`.`int_PRICE_REMISE` end from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) end else case when `t`.`str_TRANSACTION_REF` = 'C' then `t`.`int_AMOUNT_CREDIT` else -1 * `t`.`int_AMOUNT_DEBIT` end end AS `int_AMOUNT_OTHER`,case when `t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE' then case when `t`.`str_TYPE_VENTE` = 'VO' then (select case when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` > 0 then `p`.`int_CUST_PART` - sum(`t`.`int_AMOUNT_CREDIT`) when `p`.`str_STATUT_VENTE` = 'Differe' and `p`.`int_PRICE` < 0 then `p`.`int_CUST_PART` + sum(`t`.`int_AMOUNT_DEBIT`) else 0 end from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8) group by `t`.`str_RESSOURCE_REF`) else 0 end else 0 end AS `int_AMOUNT_DETTE_DIFFERE`,case when `t`.`str_NUMERO_COMPTE` = '10800000000' then (select concat(ucase(substr(`u1`.`str_FIRST_NAME`,1,1)),'.',`u1`.`str_LAST_NAME`) from (`t_mvt_caisse` `mm` join `t_user` `u1`) where `mm`.`lg_USER_ID` = convert(`u1`.`lg_USER_ID` using utf8) and convert(`t`.`str_RESSOURCE_REF` using utf8) = `mm`.`lg_MVT_CAISSE_ID`) when (`t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE') then (select concat(ucase(substr(`u1`.`str_FIRST_NAME`,1,1)),'.',`u1`.`str_LAST_NAME`) from (`t_preenregistrement` `p` join `t_user` `u1`) where convert(`p`.`lg_USER_ID` using utf8) = convert(`u1`.`lg_USER_ID` using utf8) and convert(`t`.`str_RESSOURCE_REF` using utf8) = `p`.`lg_PREENREGISTREMENT_ID`) else concat(ucase(substr(`u`.`str_FIRST_NAME`,1,1)),'.',`u`.`str_LAST_NAME`) end AS `str_FIRST_LAST_NAME`,case when (`t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE') then convert((select `p`.`lg_USER_ID` from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) using utf8) when `t`.`str_TASK` = 'OTHER' then (select `m`.`lg_USER_ID` from `t_mvt_caisse` `m` where `m`.`lg_MVT_CAISSE_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) else convert(`t`.`lg_USER_ID` using utf8) end AS `lg_USER_ID`,`tr`.`lg_TYPE_REGLEMENT_ID` AS `lg_TYPE_REGLEMENT_ID`,case when (`t`.`str_TASK` = 'VENTE' or `t`.`str_TASK` = 'ANNULE_VENTE') then (select `p`.`dt_UPDATED` from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) when `t`.`str_TASK` = 'OTHER' then (select `m`.`dt_CREATED` from `t_mvt_caisse` `m` where `m`.`lg_MVT_CAISSE_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) else `t`.`dt_CREATED` end AS `dt_CREATED`,`m`.`str_NAME` AS `str_NAME`,case when `tr`.`str_NAME` = 'Differe' then 'Especes' else `tr`.`str_NAME` end AS `str_NAME_TYE_REGLEMENT`,`mc`.`str_NAME` AS `str_NAME_TYPE_MVT_CAISSE`,(select concat(`p`.`str_FIRST_NAME_CUSTOMER`,' ',`p`.`str_LAST_NAME_CUSTOMER`) from `t_preenregistrement` `p` where `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) AS `str_FIRST_LAST_NAME_CLIENT`,`t`.`str_NUMERO_COMPTE` AS `str_NUMERO_COMPTE`,`u`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`e`.`str_DESCRIPTION` AS `str_DESCRIPTION_LIEU`,(select `pc`.`int_PRICE_RESTE` from (`t_preenregistrement` `p` join `t_preenregistrement_compte_client` `pc`) where `p`.`lg_PREENREGISTREMENT_ID` = `pc`.`lg_PREENREGISTREMENT_ID` and `p`.`lg_PREENREGISTREMENT_ID` = convert(`t`.`str_RESSOURCE_REF` using utf8)) AS `int_AMOUNT_DIFFERE` from ((((((`t_cash_transaction` `t` join `t_user` `u`) join `t_mode_reglement` `m`) join `t_reglement` `r`) join `t_type_reglement` `tr`) join `t_type_mvt_caisse` `mc`) join `t_emplacement` `e`) where `t`.`lg_USER_ID` = `u`.`lg_USER_ID` and `m`.`lg_MODE_REGLEMENT_ID` = `r`.`lg_MODE_REGLEMENT_ID` and `t`.`lg_REGLEMENT_ID` = `r`.`lg_REGLEMENT_ID` and `tr`.`lg_TYPE_REGLEMENT_ID` = `m`.`lg_TYPE_REGLEMENT_ID` and `mc`.`str_CODE_COMPTABLE` = convert(`t`.`str_NUMERO_COMPTE` using utf8) and `e`.`lg_EMPLACEMENT_ID` = `u`.`lg_EMPLACEMENT_ID` group by `t`.`str_RESSOURCE_REF` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_chiffre_aff_famille_periode_encour`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_chiffre_aff_famille_periode_encour` AS select `fa`.`str_CODE_FAMILLE` AS `str_code_groupe`,`pd`.`dt_CREATED` AS `dt_CREATED`,abs(`pd`.`int_PRICE`) AS `int_montant`,`fa`.`str_LIBELLE` AS `groupe` from ((`t_preenregistrement_detail` `pd` join `t_famille` `f` on(`f`.`lg_FAMILLE_ID` = `pd`.`lg_FAMILLE_ID`)) join `t_famillearticle` `fa` on(`fa`.`lg_FAMILLEARTICLE_ID` = `f`.`lg_FAMILLEARTICLE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_chiffre_aff_famille_periode_encour_1`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_chiffre_aff_famille_periode_encour_1` AS select `fa`.`str_CODE_FAMILLE` AS `str_code_groupe_1`,`pd`.`dt_CREATED` AS `dt_CREATED_1`,`fa`.`str_LIBELLE` AS `groupe_1`,abs(`pd`.`int_PRICE`) AS `int_montant_1` from ((`t_preenregistrement_detail` `pd` join `t_famille` `f` on(`f`.`lg_FAMILLE_ID` = `pd`.`lg_FAMILLE_ID`)) join `t_famillearticle` `fa` on(`fa`.`lg_FAMILLEARTICLE_ID` = `f`.`lg_FAMILLEARTICLE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_entree_stock`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_entree_stock` AS select `bld`.`dt_UPDATED` AS `BLDATE`,`f`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`f`.`int_CIP` AS `int_CIP`,`bld`.`int_QTE_CMDE` AS `int_QTE_CMDE`,`bld`.`str_STATUT` AS `str_STATUT`,`bld`.`int_QTE_RECUE` AS `int_QTE_RECUE`,`bld`.`int_PA_REEL` AS `int_PA_REEL`,`bld`.`int_PAF` AS `int_PAF`,`bld`.`int_PRIX_VENTE` AS `int_PRIX_VENTE`,`bld`.`int_QTE_UG` AS `int_QTE_UG`,(`bld`.`int_QTE_RECUE` - `bld`.`int_QTE_UG`) * `bld`.`int_PAF` AS `int_VALEUR_ACHAT`,(`bld`.`int_QTE_RECUE` - `bld`.`int_QTE_UG`) * `bld`.`int_PRIX_VENTE` AS `int_VALEUR_VENTE`,`bld`.`int_QTE_RECUE` + `bld`.`int_INITSTOCK` AS `int_NUMBER`,`bld`.`int_INITSTOCK` AS `int_NUMBER_INIT`,`tsf`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`bld`.`lg_BON_LIVRAISON_ID` AS `lg_BON_LIVRAISON_ID`,`z`.`str_LIBELLEE` AS `str_LIBELLEE`,`z`.`str_CODE` AS `str_CODE`,`tsf`.`lg_TYPE_STOCK_ID` AS `lg_TYPE_STOCK_ID`,`tbl`.`dt_DATE_LIVRAISON` AS `dt_DATE_LIVRAISON`,`tbl`.`int_TVA` AS `int_TVA`,`tbl`.`int_HTTC` AS `int_HTTC`,concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'. ',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME` from (((((`t_user` join `t_bon_livraison` `tbl`) join `t_bon_livraison_detail` `bld`) join `t_famille` `f`) join `t_type_stock_famille` `tsf`) join `t_zone_geographique` `z`) where `t_user`.`lg_USER_ID` = `tbl`.`lg_USER_ID` and `tbl`.`lg_BON_LIVRAISON_ID` = `bld`.`lg_BON_LIVRAISON_ID` and `bld`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID` and `f`.`lg_FAMILLE_ID` = `tsf`.`lg_FAMILLE_ID` and `z`.`lg_ZONE_GEO_ID` = `f`.`lg_ZONE_GEO_ID` order by `f`.`str_DESCRIPTION` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_etat_controle_achat`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_etat_controle_achat` AS select `t_bon_livraison`.`str_REF_LIVRAISON` AS `str_REF_LIVRAISON`,`t_bon_livraison`.`int_HTTC` AS `int_HTTC`,`t_bon_livraison`.`int_TVA` AS `int_TVA`,`t_bon_livraison`.`int_MHT` AS `int_MHT`,`t_bon_livraison_detail`.`int_QTE_RECUE` AS `int_QTE_RECUE`,`t_bon_livraison_detail`.`int_QTE_CMDE` AS `int_QTE_CMDE`,`t_order`.`str_REF_ORDER` AS `str_REF_ORDER`,`t_order`.`int_PRICE` AS `int_PRICE`,`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`int_CIP` AS `int_CIP`,`t_grossiste`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`t_famille`.`int_EAN13` AS `int_EAN13`,`t_famille`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t_bon_livraison`.`dt_DATE_LIVRAISON` AS `dt_DATE_LIVRAISON`,`t_bon_livraison`.`lg_ORDER_ID` AS `lg_ORDER_ID`,`t_user`.`str_FIRST_NAME` AS `str_FIRST_NAME`,`t_user`.`str_LAST_NAME` AS `str_LAST_NAME`,`t_bon_livraison`.`dt_UPDATED` AS `dt_UPDATED`,concat(`t_user`.`str_FIRST_NAME`,' ',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME` from (((((`t_bon_livraison` join `t_bon_livraison_detail` on(`t_bon_livraison`.`lg_BON_LIVRAISON_ID` = `t_bon_livraison_detail`.`lg_BON_LIVRAISON_ID`)) join `t_order` on(`t_bon_livraison`.`lg_ORDER_ID` = `t_order`.`lg_ORDER_ID`)) join `t_grossiste` on(`t_order`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`)) join `t_famille` on(`t_bon_livraison_detail`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`)) join `t_user` on(`t_bon_livraison`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_facture_subrogatoire`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_facture_subrogatoire` AS select `pcctp`.`str_REF_BON` AS `str_REF_BON`,`p`.`b_WITHOUT_BON` AS `b_WITHOUT_BON`,`p`.`dt_UPDATED` AS `dt_UPDATED`,`p`.`str_FIRST_NAME_CUSTOMER` AS `str_FIRST_NAME_CUSTOMER`,`p`.`str_LAST_NAME_CUSTOMER` AS `str_LAST_NAME_CUSTOMER`,concat(`p`.`str_FIRST_NAME_CUSTOMER`,' ',`p`.`str_LAST_NAME_CUSTOMER`) AS `str_FIRST_LAST_NAME`,`p`.`int_PRICE` AS `int_PRICE_TOTAL`,`tp`.`str_NAME` AS `str_NAME`,`tp`.`str_FULLNAME` AS `str_FULLNAME`,`pcctp`.`int_PRICE` AS `int_PRICE_TP`,`pcctp`.`int_PERCENT` AS `int_PERCENT`,concat(`tp`.`str_NAME`,'--',`pcctp`.`int_PERCENT`,'%') AS `tp_percent`,`u`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`p`.`str_REF` AS `str_REF`,`p`.`str_REF_TICKET` AS `str_REF_TICKET`,`p`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,`p`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,`p`.`int_PRICE` AS `int_PRICE`,`p`.`b_IS_CANCEL` AS `b_IS_CANCEL`,case when `tp`.`lg_TYPE_TIERS_PAYANT_ID` = '1' then 'S' else 'X' end AS `str_TYPE_TIERS_PAYANT`,case when `cctp`.`str_NUMERO_SECURITE_SOCIAL`  not like '' then `cctp`.`str_NUMERO_SECURITE_SOCIAL` else convert(`p`.`str_NUMERO_SECURITE_SOCIAL` using utf8) end AS `str_NUMERO_SECURITE_SOCIAL`,`p`.`lg_USER_ID` AS `lg_USER_ID`,`p`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,concat(`u`.`str_FIRST_NAME`,' ',`u`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME_CAISSIER`,`p`.`int_PRICE_REMISE` AS `int_PRICE_REMISE`,`p`.`str_STATUT` AS `str_STATUT`,`tp`.`lg_TIERS_PAYANT_ID` AS `lg_TIERS_PAYANT_ID`,`p`.`str_REF_BON` AS `str_REF_BON_BASE` from ((((`t_preenregistrement_compte_client_tiers_payent` `pcctp` join `t_preenregistrement` `p`) join `t_compte_client_tiers_payant` `cctp`) join `t_tiers_payant` `tp`) join `t_user` `u`) where `pcctp`.`lg_PREENREGISTREMENT_ID` = `p`.`lg_PREENREGISTREMENT_ID` and `pcctp`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `cctp`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` and `tp`.`lg_TIERS_PAYANT_ID` = `cctp`.`lg_TIERS_PAYANT_ID` and `p`.`lg_USER_CAISSIER_ID` = `u`.`lg_USER_ID` and `p`.`str_STATUT` = 'is_Closed' 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_famille_dci`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_famille_dci` AS select `t_famille_dci`.`lg_FAMILLE_DCI_ID` AS `lg_FAMILLE_DCI_ID`,`t_famille_dci`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t_famille_dci`.`lg_DCI_ID` AS `lg_DCI_ID`,`t_famille`.`str_NAME` AS `str_NAME`,`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`int_PRICE` AS `int_PRICE`,`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_EAN13` AS `int_EAN13`,`t_dci`.`str_CODE` AS `str_CODE`,`t_dci`.`str_NAME` AS `dci_str_NAME`,`t_famille_dci`.`str_STATUT` AS `str_STATUT` from ((`t_famille` join `t_famille_dci` on(`t_famille`.`lg_FAMILLE_ID` = `t_famille_dci`.`lg_FAMILLE_ID`)) join `t_dci` on(`t_famille_dci`.`lg_DCI_ID` = `t_dci`.`lg_DCI_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_famille_retour`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_famille_retour` AS select `t`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t`.`int_CIP` AS `int_CIP`,`bd`.`int_PAF` AS `int_PAF`,`t`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`t`.`int_EAN13` AS `int_EAN13`,`b`.`lg_BON_LIVRAISON_ID` AS `lg_BON_LIVRAISON_ID`,`b`.`str_REF_LIVRAISON` AS `str_REF_LIVRAISON`,`bd`.`str_STATUT` AS `str_STATUT`,`fg`.`str_CODE_ARTICLE` AS `str_CODE_ARTICLE` from (((`t_famille` `t` join `t_bon_livraison_detail` `bd`) join `t_bon_livraison` `b`) join `t_famille_grossiste` `fg`) where `t`.`lg_FAMILLE_ID` = `bd`.`lg_FAMILLE_ID` and `b`.`lg_BON_LIVRAISON_ID` = `bd`.`lg_BON_LIVRAISON_ID` and `t`.`lg_FAMILLE_ID` = `fg`.`lg_FAMILLE_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_frequentation_officine`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_frequentation_officine` AS select `o`.`str_FIRST_LAST_NAME` AS `str_FIRST_LAST_NAME`,`o`.`dt_DAY` AS `dt_DAY`,sum(`o`.`int_AMOUNT`) AS `TOTAL_MONTANT`,sum(`o`.`int_NUMBER_TRANSACTION`) AS `TOTAL_COUNT`,sum(`o`.`int_NUMBER`) AS `TOTAL_REFERENCE`,round(sum(`o`.`int_AMOUNT`) / sum(`o`.`int_NUMBER_TRANSACTION`),0) AS `TOTAL_PAN_MOY`,sum(case when (`o`.`int_HEURE_MIN` >= 7 and `o`.`int_HEURE_MAX` <= 9) then `o`.`int_AMOUNT` else 0 end) AS `UN_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 9 and `o`.`int_HEURE_MAX` <= 11) then `o`.`int_AMOUNT` else 0 end) AS `DEUX_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 11 and `o`.`int_HEURE_MAX` <= 14) then `o`.`int_AMOUNT` else 0 end) AS `TROIS_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 14 and `o`.`int_HEURE_MAX` <= 16) then `o`.`int_AMOUNT` else 0 end) AS `QUATRE_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 16 and `o`.`int_HEURE_MAX` <= 17) then `o`.`int_AMOUNT` else 0 end) AS `CINQ_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 17 and `o`.`int_HEURE_MAX` <= 18) then `o`.`int_AMOUNT` else 0 end) AS `SIX_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 18 and `o`.`int_HEURE_MAX` <= 19) then `o`.`int_AMOUNT` else 0 end) AS `SEPT_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 19 and `o`.`int_HEURE_MAX` <= 20) then `o`.`int_AMOUNT` else 0 end) AS `HUIT_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 20 and `o`.`int_HEURE_MAX` <= 24) then `o`.`int_AMOUNT` else 0 end) AS `NEUF_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 0 and `o`.`int_HEURE_MAX` <= 7) then `o`.`int_AMOUNT` else 0 end) AS `DIX_MONTANT`,sum(case when (`o`.`int_HEURE_MIN` >= 7 and `o`.`int_HEURE_MAX` <= 9) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `UN_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 9 and `o`.`int_HEURE_MAX` <= 11) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `DEUX_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 11 and `o`.`int_HEURE_MAX` <= 14) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `TROIS_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 14 and `o`.`int_HEURE_MAX` <= 16) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `QUATRE_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 16 and `o`.`int_HEURE_MAX` <= 17) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `CINQ_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 17 and `o`.`int_HEURE_MAX` <= 18) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `SIX_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 18 and `o`.`int_HEURE_MAX` <= 19) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `SEPT_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 19 and `o`.`int_HEURE_MAX` <= 20) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `HUIT_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 20 and `o`.`int_HEURE_MAX` <= 24) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `NEUF_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 0 and `o`.`int_HEURE_MAX` <= 7) then `o`.`int_NUMBER_TRANSACTION` else 0 end) AS `DIX_COUNT`,sum(case when (`o`.`int_HEURE_MIN` >= 7 and `o`.`int_HEURE_MAX` <= 9) then `o`.`int_NUMBER` else 0 end) AS `UN_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 9 and `o`.`int_HEURE_MAX` <= 11) then `o`.`int_NUMBER` else 0 end) AS `DEUX_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 11 and `o`.`int_HEURE_MAX` <= 14) then `o`.`int_NUMBER` else 0 end) AS `TROIS_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 14 and `o`.`int_HEURE_MAX` <= 16) then `o`.`int_NUMBER` else 0 end) AS `QUATRE_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 16 and `o`.`int_HEURE_MAX` <= 17) then `o`.`int_NUMBER` else 0 end) AS `CINQ_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 17 and `o`.`int_HEURE_MAX` <= 18) then `o`.`int_NUMBER` else 0 end) AS `SIX_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 18 and `o`.`int_HEURE_MAX` <= 19) then `o`.`int_NUMBER` else 0 end) AS `SEPT_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 19 and `o`.`int_HEURE_MAX` <= 20) then `o`.`int_NUMBER` else 0 end) AS `HUIT_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 20 and `o`.`int_HEURE_MAX` <= 24) then `o`.`int_NUMBER` else 0 end) AS `NEUF_REFERNCEVALUE`,sum(case when (`o`.`int_HEURE_MIN` >= 0 and `o`.`int_HEURE_MAX` <= 7) then `o`.`int_NUMBER` else 0 end) AS `DIX_REFERNCEVALUE`,round(sum(case when (`o`.`int_HEURE_MIN` >= 7 and `o`.`int_HEURE_MAX` <= 9) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 7 and `o`.`int_HEURE_MAX` <= 9) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_UN`,round(sum(case when (`o`.`int_HEURE_MIN` >= 9 and `o`.`int_HEURE_MAX` <= 11) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 9 and `o`.`int_HEURE_MAX` <= 11) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_DEUX`,round(sum(case when (`o`.`int_HEURE_MIN` >= 11 and `o`.`int_HEURE_MAX` <= 14) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 11 and `o`.`int_HEURE_MAX` <= 14) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_TROIS`,round(sum(case when (`o`.`int_HEURE_MIN` >= 14 and `o`.`int_HEURE_MAX` <= 16) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 14 and `o`.`int_HEURE_MAX` <= 16) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_QUATRE`,round(sum(case when (`o`.`int_HEURE_MIN` >= 16 and `o`.`int_HEURE_MAX` <= 17) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 16 and `o`.`int_HEURE_MAX` <= 17) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_CINQ`,round(sum(case when (`o`.`int_HEURE_MIN` >= 17 and `o`.`int_HEURE_MAX` <= 18) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 17 and `o`.`int_HEURE_MAX` <= 18) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_SIX`,round(sum(case when (`o`.`int_HEURE_MIN` >= 18 and `o`.`int_HEURE_MAX` <= 19) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 18 and `o`.`int_HEURE_MAX` <= 19) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_SEPT`,round(sum(case when (`o`.`int_HEURE_MIN` >= 19 and `o`.`int_HEURE_MAX` <= 20) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 19 and `o`.`int_HEURE_MAX` <= 20) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_HUIT`,round(sum(case when (`o`.`int_HEURE_MIN` >= 20 and `o`.`int_HEURE_MAX` <= 24) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 20 and `o`.`int_HEURE_MAX` <= 24) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_NEUF`,round(sum(case when (`o`.`int_HEURE_MIN` >= 0 and `o`.`int_HEURE_MAX` <= 7) then `o`.`int_AMOUNT` else 0 end) / sum(case when (`o`.`int_HEURE_MIN` >= 0 and `o`.`int_HEURE_MAX` <= 7) then `o`.`int_NUMBER_TRANSACTION` else 0 end),0) AS `PAN_MOY_DIX` from `v_rp_frequentation_pharmacie` `o` group by `o`.`lg_USER_ID`,`o`.`dt_DAY` order by `o`.`dt_DAY`,`o`.`str_FIRST_LAST_NAME` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_getallsousmenubyconnecteduser`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_getallsousmenubyconnecteduser` AS select distinct `t_sous_menu`.`str_VALUE` AS `str_VALUE`,`t_sous_menu`.`icon_CLASS` AS `icon_CLASS`,`t_sous_menu`.`int_PRIORITY` AS `int_PRIORITY`,`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_menu`.`lg_MENU_ID` AS `lg_MENU_ID`,`t_sous_menu`.`str_COMPOSANT` AS `str_COMPOSANT` from ((((((`t_sous_menu` join `t_menu` on(`t_sous_menu`.`lg_MENU_ID` = `t_menu`.`lg_MENU_ID`)) join `t_privilege` on(`t_sous_menu`.`P_KEY` = `t_privilege`.`str_NAME`)) join `t_role_privelege` on(`t_privilege`.`lg_PRIVELEGE_ID` = `t_role_privelege`.`lg_PRIVILEGE_ID`)) join `t_role` on(`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`)) join `t_role_user` on(`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`)) join `t_user` on(`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)) where `t_menu`.`str_Status` = 'enable' and `t_sous_menu`.`str_Status` = 'enable' 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_getmenubyconnecteduser`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_getmenubyconnecteduser` AS select distinct `t_menu`.`str_VALUE` AS `str_VALUE`,`t_menu`.`lg_MENU_ID` AS `lg_MENU_ID`,`t_menu`.`icon_CLASS` AS `icon_CLASS`,`t_user`.`lg_USER_ID` AS `lg_USER_ID`,`t_menu`.`int_PRIORITY` AS `int_PRIORITY` from ((((((`t_sous_menu` join `t_menu` on(`t_sous_menu`.`lg_MENU_ID` = `t_menu`.`lg_MENU_ID`)) join `t_privilege` on(`t_menu`.`P_KEY` = `t_privilege`.`str_NAME`)) join `t_role_privelege` on(`t_privilege`.`lg_PRIVELEGE_ID` = `t_role_privelege`.`lg_PRIVILEGE_ID`)) join `t_role` on(`t_role`.`lg_ROLE_ID` = `t_role_privelege`.`lg_ROLE_ID`)) join `t_role_user` on(`t_role`.`lg_ROLE_ID` = `t_role_user`.`lg_ROLE_ID`)) join `t_user` on(`t_role_user`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)) where `t_menu`.`str_Status` = 'enable' 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_last_pre`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_last_pre` AS select `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED` AS `dt_CREATED` from ((`t_preenregistrement_compte_client_tiers_payent` join `t_preenregistrement` on(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)) join `t_compte_client_tiers_payant` on(`t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)) order by `t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED` desc 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_last_preenregistrement_compte_client`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_last_preenregistrement_compte_client` AS select `t_preenregistrement`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_ID` AS `lg_COMPTE_CLIENT_ID` from ((`t_preenregistrement_compte_client_tiers_payent` join `t_preenregistrement` on(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`)) join `t_compte_client_tiers_payant` on(`t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)) order by `t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED` desc 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_liste_dossier_reglement_detail`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_liste_dossier_reglement_detail` AS select `d`.`lg_DOSSIER_REGLEMENT_DETAIL_ID` AS `lg_DOSSIER_REGLEMENT_DETAIL_ID`,`d`.`lg_DOSSIER_REGLEMENT_ID` AS `lg_DOSSIER_REGLEMENT_ID`,`d`.`str_REF` AS `str_REF`,`d`.`dbl_AMOUNT` AS `dbl_AMOUNT`,`d`.`str_STATUT` AS `str_STATUT`,`d`.`dt_UPDATED` AS `dt_UPDATED`,`d`.`dt_CREATED` AS `dt_CREATED`,`d`.`lg_FACTURE_DETAIL_ID` AS `lg_FACTURE_DETAIL_ID`,`f`.`str_CODE_FACTURE` AS `str_CODE_FACTURE`,`f`.`str_CODE_COMPTABLE` AS `str_CODE_COMPTABLE`,`p`.`str_REF_BON` AS `str_REF_BON`,`p`.`str_REF` AS `str_REF_VENTE`,`f`.`str_CUSTOMER` AS `str_CUSTOMER`,(select `a`.`str_NUMERO_SECURITE_SOCIAL` from `t_ayant_droit` `a` where `a`.`str_FIRST_NAME` = convert(`p`.`str_FIRST_NAME_CUSTOMER` using utf8) and `a`.`str_LAST_NAME` = convert(`p`.`str_LAST_NAME_CUSTOMER` using utf8) limit 1) AS `str_NUMERO_SECURITE_SOCIAL`,concat(ucase(substr(`p`.`str_FIRST_NAME_CUSTOMER`,1,1)),'.',`p`.`str_LAST_NAME_CUSTOMER`) AS `str_FIRST_LAST_NAME` from (((`t_facture_detail` `fd` join `t_facture` `f`) join `t_dossier_reglement_detail` `d`) join `t_preenregistrement` `p`) where `fd`.`lg_FACTURE_ID` = `f`.`lg_FACTURE_ID` and `d`.`lg_FACTURE_DETAIL_ID` = `fd`.`lg_FACTURE_DETAIL_ID` and `fd`.`P_KEY` = `p`.`lg_PREENREGISTREMENT_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_liste_vente_annule`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_liste_vente_annule` AS select `t`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`t`.`str_REF` AS `str_REF`,`t`.`int_PRICE` AS `int_PRICE`,`t`.`int_PRICE_REMISE` AS `int_PRICE_REMISE`,`t`.`str_TYPE_VENTE` AS `str_TYPE_VENTE`,`t`.`dt_UPDATED` AS `dt_UPDATED`,(select concat(`u1`.`str_FIRST_NAME`,' ',`u1`.`str_LAST_NAME`) from `t_user` `u1` where `u1`.`lg_USER_ID` = `t`.`lg_USER_VENDEUR_ID`) AS `str_FIRST_LAST_NAME_VENDEUR`,(select concat(`u2`.`str_FIRST_NAME`,' ',`u2`.`str_LAST_NAME`) from `t_user` `u2` where `u2`.`lg_USER_ID` = `t`.`lg_USER_CAISSIER_ID`) AS `str_FIRST_LAST_NAME_CAISSIER` from (`t_preenregistrement` `t` join `t_user` `u`) where `u`.`lg_USER_ID` = `t`.`lg_USER_VENDEUR_ID` and `u`.`lg_USER_ID` = `t`.`lg_USER_CAISSIER_ID` and `t`.`int_PRICE` >= 0 and `t`.`b_IS_CANCEL` = 1 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_livraison`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_livraison` AS select `t_famille`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t_famille`.`str_NAME` AS `str_NAME`,`t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t_famille`.`int_PRICE` AS `int_PRICE`,`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_PAF` AS `int_PAF`,`t_famille`.`int_PAT` AS `int_PAT`,`t_warehouse`.`int_NUM_LOT` AS `int_NUM_LOT`,`t_warehouse`.`int_NUMBER` AS `int_NUMBER`,`t_warehouse`.`str_REF_LIVRAISON` AS `str_REF_LIVRAISON`,`t_type_stock_famille`.`int_NUMBER` AS `int_NUMBER_STOCK`,`t_grossiste`.`str_LIBELLE` AS `str_LIBELLE`,`t_warehouse`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`t_famille`.`dbl_PRIX_MOYEN_PONDERE` AS `dbl_PRIX_MOYEN_PONDERE` from (((`t_famille` join `t_warehouse` on(`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)) join `t_type_stock_famille` on(`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`)) join `t_grossiste` on(`t_warehouse`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_mouvement_suivi_article`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_mouvement_suivi_article` AS select `t`.`lg_MOUVEMENT_ID` AS `lg_MOUVEMENT_ID`,`t`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`t`.`lg_USER_ID` AS `lg_USER_ID`,`t`.`P_KEY` AS `P_KEY`,`t`.`str_TYPE_ACTION` AS `str_TYPE_ACTION`,`t`.`str_ACTION` AS `str_ACTION`,`t`.`dt_DAY` AS `dt_DAY`,`t`.`dt_CREATED` AS `dt_CREATED`,`t`.`dt_UPDATED` AS `dt_UPDATED`,`t`.`str_STATUT` AS `str_STATUT`,`t`.`int_NUMBER` AS `int_NUMBER`,`t`.`int_NUMBERTRANSACTION` AS `int_NUMBERTRANSACTION`,`tf`.`int_NUMBER_AVAILABLE` AS `int_NUMBER_STOCK`,`f`.`lg_FAMILLE_ID` AS `lg_ARTICLE_ID`,`f`.`lg_FAMILLEARTICLE_ID` AS `lg_FAMILLEARTICLE_ID`,`f`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID`,`f`.`lg_FABRIQUANT_ID` AS `lg_FABRIQUANT_ID`,`f`.`int_CIP` AS `int_CIP`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`f`.`int_EAN13` AS `int_EAN13`,`fg`.`str_CODE_ARTICLE` AS `str_CODE_ARTICLE`,`t`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID` from ((((`t_mouvement` `t` join `t_famille_stock` `tf`) join `t_user` `u`) join `t_famille_grossiste` `fg`) join `t_famille` `f`) where `u`.`lg_USER_ID` = `t`.`lg_USER_ID` and `f`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `f`.`lg_FAMILLE_ID` = `tf`.`lg_FAMILLE_ID` and `f`.`lg_FAMILLE_ID` = `fg`.`lg_FAMILLE_ID` and `tf`.`lg_EMPLACEMENT_ID` = `t`.`lg_EMPLACEMENT_ID` and `f`.`str_STATUT` = 'enable' order by `f`.`str_DESCRIPTION`,`t`.`dt_UPDATED` desc 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_perime`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_perime` AS select `f`.`int_CIP` AS `int_CIP`,`f`.`int_EAN13` AS `int_EAN13`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION_ARTICLE`,`t`.`int_NUM_LOT` AS `int_NUM_LOT`,`t`.`int_NUMBER` AS `int_NUMBER`,`g`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`t`.`dt_PEREMPTION` AS `dt_PEREMPTION`,`t`.`lg_WAREHOUSE_ID` AS `lg_WAREHOUSE_ID`,(select count(`t1`.`lg_WAREHOUSE_ID`) from `t_warehousedetail` `t1` where `t1`.`lg_WAREHOUSE_ID` = `t`.`lg_WAREHOUSE_ID`) AS `int_RESTE`,`t`.`str_STATUT` AS `str_STATUT`,`t`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,concat(`u`.`str_FIRST_NAME`,' ',`u`.`str_LAST_NAME`) AS `str_FISRT_LAST_NAME`,`t`.`dt_UPDATED` AS `dt_UPDATED`,to_days(cast(`t`.`dt_PEREMPTION` as date)) - to_days(cast(current_timestamp() as date)) AS `ecart_date`,`fa`.`str_LIBELLE` AS `str_LIBELLE_FAMILLE`,`z`.`str_LIBELLEE` AS `str_LIBELLEE_EMPLACEMENT`,`fa`.`str_CODE_FAMILLE` AS `str_CODE_FAMILLE`,`z`.`str_CODE` AS `str_CODE_EMPLACEMENT`,`g`.`str_CODE` AS `str_CODE_GROSSISTE`,`f`.`int_PRICE` AS `int_PRICE`,`f`.`int_PAF` AS `int_PAF` from (((((`t_warehouse` `t` join `t_famille` `f`) join `t_grossiste` `g`) join `t_famillearticle` `fa`) join `t_zone_geographique` `z`) join `t_user` `u`) where `f`.`lg_FAMILLEARTICLE_ID` = `fa`.`lg_FAMILLEARTICLE_ID` and `f`.`lg_ZONE_GEO_ID` = `z`.`lg_ZONE_GEO_ID` and `t`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID` and `g`.`lg_GROSSISTE_ID` = `t`.`lg_GROSSISTE_ID` and `u`.`lg_USER_ID` = `t`.`lg_USER_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_perime_remove_stock`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_perime_remove_stock` AS select `f`.`int_CIP` AS `int_CIP`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`f`.`int_PRICE` AS `int_PRICE`,`f`.`int_PAF` AS `int_PAF`,`f`.`int_EAN13` AS `int_EAN13`,`z`.`str_LIBELLEE` AS `str_LIBELLEE`,`z`.`str_CODE` AS `str_CODE`,`t`.`str_STATUT` AS `str_STATUT`,`t`.`int_NUM_LOT` AS `int_NUM_LOT`,`t`.`int_NUMBER_DELETE` AS `int_NUMBER_DELETE`,`t`.`dt_UPDATED` AS `dt_UPDATED`,`t`.`dt_PEREMPTION` AS `dt_PEREMPTION`,`f`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`fg`.`str_CODE_ARTICLE` AS `str_CODE_ARTICLE` from (((`t_warehouse` `t` join `t_famille` `f`) join `t_famille_grossiste` `fg`) join `t_zone_geographique` `z`) where `t`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID` and `fg`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID` and `z`.`lg_ZONE_GEO_ID` = `f`.`lg_ZONE_GEO_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_recap_mouvement_article`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_recap_mouvement_article` AS select `t`.`dt_DAY` AS `dt_DAY`,`t`.`int_STOCK_DEBUT` AS `int_STOCK_DEBUT`,`t`.`int_STOCK_JOUR` AS `int_STOCK_JOUR`,`t`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION_ARTICLE`,`f`.`int_CIP` AS `int_CIP`,`f`.`int_EAN13` AS `int_EAN13`,`f`.`int_PRICE` AS `int_PRICE`,`f`.`int_PAF` AS `int_PAF`,`f`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`f`.`lg_FAMILLEARTICLE_ID` AS `lg_FAMILLEARTICLE_ID`,`f`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID`,concat(`f`.`int_CIP`,' ',`f`.`str_DESCRIPTION`) AS `CIP_ARTICLE`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'VENTE' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_VENTE`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'DECONDITIONNEMENT' and `m`.`str_TYPE_ACTION` = 'REMOVE' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_DECONDITIONNEMENT_OUT`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'DECONDITIONNEMENT' and `m`.`str_TYPE_ACTION` = 'ADD' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_DECONDITIONNEMENT_IN`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'RETOURFOURNISSEUR' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_RETOURFOURNISSEUR`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'PERIME' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_PERIME`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'AJUSTEMENT' and `m`.`str_TYPE_ACTION` = 'REMOVE' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_AJUSTEMENT_OUT`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'AJUSTEMENT' and `m`.`str_TYPE_ACTION` = 'ADD' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_AJUSTEMENT_IN`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'ENTREESTOCK' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_ENTREESTOCK`,(select sum(`m`.`int_NUMBER`) from `t_mouvement` `m` where `t`.`dt_DAY` = `m`.`dt_DAY` and `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` and `m`.`str_ACTION` = 'INVENTAIRE' group by `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_INVENTAIRE`,`t`.`lg_MOUVEMENT_SNAPSHOT_ID` AS `lg_MOUVEMENT_SNAPSHOT_ID` from (`t_mouvement_snapshot` `t` join `t_famille` `f`) where `t`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_rp_frequentation_pharmacie`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_rp_frequentation_pharmacie` AS select sum(`t_snap_shop_daly_stat`.`int_AMOUNT`) AS `int_AMOUNT`,`t_snap_shop_daly_stat`.`dt_DAY` AS `dt_DAY`,`t_snap_shop_daly_stat`.`lg_TRANCHE_HORAIRE_ID` AS `lg_TRANCHE_HORAIRE_ID`,sum(`t_snap_shop_daly_stat`.`int_NUMBER_TRANSACTION`) AS `int_NUMBER_TRANSACTION`,sum(`t_snap_shop_daly_stat`.`int_NUMBER`) AS `int_NUMBER`,concat(ucase(substr(`t_user`.`str_FIRST_NAME`,1,1)),'.',`t_user`.`str_LAST_NAME`) AS `str_FIRST_LAST_NAME`,`t_tranche_horaire`.`str_LIBELLE` AS `str_LIBELLE`,`t_tranche_horaire`.`int_HEURE_MIN` AS `int_HEURE_MIN`,`t_tranche_horaire`.`int_HEURE_MAX` AS `int_HEURE_MAX`,`t_user`.`lg_USER_ID` AS `lg_USER_ID` from ((`t_snap_shop_daly_stat` join `t_tranche_horaire` on(`t_snap_shop_daly_stat`.`lg_TRANCHE_HORAIRE_ID` = `t_tranche_horaire`.`lg_TRANCHE_HORAIRE_ID`)) join `t_user` on(`t_snap_shop_daly_stat`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)) group by `t_snap_shop_daly_stat`.`dt_DAY`,`t_snap_shop_daly_stat`.`lg_TRANCHE_HORAIRE_ID`,`t_tranche_horaire`.`str_LIBELLE`,`t_snap_shop_daly_stat`.`lg_USER_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_rp_panier_moyen`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_rp_panier_moyen` AS select `t_snap_shop_daly_stat`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,avg(`t_snap_shop_daly_stat`.`int_AMOUNT`) AS `int_AMOUNT`,`t_snap_shop_daly_stat`.`dt_DAY` AS `dt_DAY`,`t_snap_shop_daly_stat`.`lg_TRANCHE_HORAIRE_ID` AS `lg_TRANCHE_HORAIRE_ID`,`t_snap_shop_daly_stat`.`int_NUMBER_TRANSACTION` AS `int_NUMBER_TRANSACTION`,`t_tranche_horaire`.`str_LIBELLE` AS `str_LIBELLE`,`t_type_vente`.`str_NAME` AS `str_NAME` from ((`t_snap_shop_daly_stat` join `t_tranche_horaire` on(`t_snap_shop_daly_stat`.`lg_TRANCHE_HORAIRE_ID` = `t_tranche_horaire`.`lg_TRANCHE_HORAIRE_ID`)) join `t_type_vente` on(`t_snap_shop_daly_stat`.`lg_TYPE_VENTE_ID` = `t_type_vente`.`lg_TYPE_VENTE_ID`)) group by `t_snap_shop_daly_stat`.`lg_TYPE_VENTE_ID`,`t_snap_shop_daly_stat`.`lg_TRANCHE_HORAIRE_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_rp_rupture_stock`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_rp_rupture_stock` AS select `t_snap_shop_rupture_stock`.`int_QTY` AS `int_QTY`,`t_snap_shop_rupture_stock`.`int_QTY_PROPOSE` AS `int_QTY_PROPOSE`,`t_snap_shop_rupture_stock`.`int_SEUI_PROPOSE` AS `int_SEUI_PROPOSE`,`t_snap_shop_rupture_stock`.`int_NUMBER_TRANSACTION` AS `int_NUMBER_TRANSACTION`,`t_famille`.`str_NAME` AS `str_NAME`,`t_code_gestion`.`str_CODE_BAREME` AS `str_CODE_BAREME`,`t_famille`.`int_CIP` AS `int_CIP`,`t_famille`.`int_SEUIL_MIN` AS `int_SEUIL_MIN`,`t_famille`.`int_QTE_REAPPROVISIONNEMENT` AS `int_QTE_REAPPROVISIONNEMENT`,`t_snap_shop_rupture_stock`.`dt_CREATED` AS `dt_CREATED` from ((`t_snap_shop_rupture_stock` join `t_famille` on(`t_snap_shop_rupture_stock`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`)) left join `t_code_gestion` on(`t_famille`.`lg_CODE_GESTION_ID` = `t_code_gestion`.`lg_CODE_GESTION_ID`)) group by `t_famille`.`str_NAME`,`t_famille`.`int_CIP` order by `t_snap_shop_rupture_stock`.`dt_CREATED` desc 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_stat_vente_anne`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_stat_vente_anne` AS select count(distinct `c`.`lg_COMPTE_CLIENT_ID`) + count(distinct `ctp`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`) AS `nbr_client`,`p`.`int_PRICE` AS `montant_brute_ttc`,`p`.`int_PRICE_REMISE` AS `montant_remise`,`p`.`int_PRICE` - `p`.`int_PRICE_REMISE` AS `montant_net_ttc`,`p`.`int_PRICE` - `p`.`int_PRICE_REMISE` / count(`vo`.`lg_PREENREGISTREMENT_ID`) AS `pan_moy_ord`,`p`.`int_PRICE` - `p`.`int_PRICE_REMISE` / count(`vn`.`lg_PREENREGISTREMENT_ID`) AS `pan_moy_nord`,`vo`.`int_PRICE` AS `vente_ord`,`vn`.`int_PRICE` AS `vente_non_ord`,`p`.`dt_CREATED` AS `dt_CREATED` from ((((`t_preenregistrement` `p` join `t_preenregistrement_compte_client` `c`) join `t_preenregistrement_compte_client_tiers_payent` `ctp`) join `v_vente_ord` `vo`) join `v_vente_nord` `vn`) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_stat_vente_ordonnance_pay_op`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_stat_vente_ordonnance_pay_op` AS select `u`.`lg_USER_ID` AS `lg_USER_ID`,`u`.`str_CODE` AS `str_codeOp`,count(`p`.`lg_PREENREGISTREMENT_ID`) AS `int_nbr_clt`,sum(`p`.`int_PRICE`) AS `int_mont_brut_ttc`,sum(`p`.`int_PRICE_REMISE`) AS `int_remise`,case when sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`) is null then sum(`p`.`int_PRICE`) else sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`) end AS `int_mont_net_ttc`,(sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`)) / count(`p`.`lg_PREENREGISTREMENT_ID`) AS `int_pan_moy` from (`t_preenregistrement` `p` join `t_user` `u` on(`u`.`lg_USER_ID` = `p`.`lg_USER_ID`)) where `p`.`lg_TYPE_VENTE_ID` = 1 and `p`.`str_ORDONNANCE` is not null group by `u`.`str_CODE` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_stat_vente_sans_ordonnance_op`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_stat_vente_sans_ordonnance_op` AS select `u`.`lg_USER_ID` AS `lg_USER_ID`,`u`.`str_CODE` AS `str_codeOp`,count(`p`.`lg_PREENREGISTREMENT_ID`) AS `int_nbr_clt`,sum(`p`.`int_PRICE`) AS `int_mont_brut_ttc`,sum(`p`.`int_PRICE_REMISE`) AS `int_remise`,case when sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`) is null then sum(`p`.`int_PRICE`) else sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`) end AS `int_mont_net_ttc`,(sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`)) / count(`p`.`lg_PREENREGISTREMENT_ID`) AS `int_pan_moy` from (`t_preenregistrement` `p` join `t_user` `u` on(`u`.`lg_USER_ID` = `p`.`lg_USER_ID`)) where `p`.`lg_TYPE_VENTE_ID` = 1 and `p`.`str_ORDONNANCE` is null group by `u`.`str_CODE` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_stat_vente_tp_op`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_stat_vente_tp_op` AS select `u`.`lg_USER_ID` AS `lg_USER_ID`,`u`.`str_CODE` AS `str_codeOp`,count(`p`.`lg_PREENREGISTREMENT_ID`) AS `int_nbr_clt`,sum(`p`.`int_PRICE`) AS `int_mont_brut_ttc`,sum(`p`.`int_PRICE_REMISE`) AS `int_remise`,case when sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`) is null then sum(`p`.`int_PRICE`) else sum(`p`.`int_PRICE`) - sum(`p`.`int_PRICE_REMISE`) end AS `int_mont_net_ttc` from (`t_preenregistrement` `p` join `t_user` `u` on(`u`.`lg_USER_ID` = `p`.`lg_USER_ID`)) where `p`.`lg_TYPE_VENTE_ID` = 2 or `p`.`lg_TYPE_VENTE_ID` = 3 group by `u`.`str_CODE` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_tiers_payant_by_vente`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_tiers_payant_by_vente` AS select `t`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` AS `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`,`t`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`t`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` AS `lg_COMPTE_CLIENT_TIERS_PAYANT_ID`,`t`.`lg_USER_ID` AS `lg_USER_ID`,`t`.`str_STATUT` AS `str_STATUT`,`t`.`dt_CREATED` AS `dt_CREATED`,`t`.`dt_UPDATED` AS `dt_UPDATED`,`t`.`int_PERCENT` AS `int_PERCENT`,`t`.`int_PRICE` AS `int_PRICE`,`t`.`str_LAST_TRANSACTION` AS `str_LAST_TRANSACTION`,`t`.`str_STATUT_FACTURE` AS `str_STATUT_FACTURE`,`tp`.`str_NAME` AS `str_NAME`,`c`.`int_PRIORITY` AS `int_PRIORITY` from ((`t_preenregistrement_compte_client_tiers_payent` `t` join `t_compte_client_tiers_payant` `c`) join `t_tiers_payant` `tp`) where `t`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `c`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` and `c`.`lg_TIERS_PAYANT_ID` = `tp`.`lg_TIERS_PAYANT_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_vente_comptant`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_vente_comptant` AS select `f`.`lg_FAMILLE_ID` AS `id_famille`,`f`.`str_NAME` AS `str_NAME`,sum(abs(`pd`.`int_QUANTITY_SERVED`)) AS `qte_serv`,`p`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,`pd`.`dt_CREATED` AS `dt_CREATED` from ((`t_preenregistrement_detail` `pd` join `t_preenregistrement` `p` on(`p`.`lg_PREENREGISTREMENT_ID` = `pd`.`lg_PREENREGISTREMENT_ID`)) join `t_famille` `f` on(`f`.`lg_FAMILLE_ID` = `pd`.`lg_FAMILLE_ID`)) where `p`.`lg_TYPE_VENTE_ID` = 1 group by `f`.`lg_FAMILLE_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_vente_credit`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_vente_credit` AS select `f`.`lg_FAMILLE_ID` AS `id_famille`,`f`.`str_NAME` AS `str_NAME`,sum(abs(`pd`.`int_QUANTITY_SERVED`)) AS `qte_serv`,`p`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID`,`pd`.`dt_CREATED` AS `dt_CREATED` from ((`t_preenregistrement_detail` `pd` join `t_preenregistrement` `p` on(`p`.`lg_PREENREGISTREMENT_ID` = `pd`.`lg_PREENREGISTREMENT_ID`)) join `t_famille` `f` on(`f`.`lg_FAMILLE_ID` = `pd`.`lg_FAMILLE_ID`)) where `p`.`lg_TYPE_VENTE_ID` <> 1 group by `f`.`lg_FAMILLE_ID` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_vente_famille_periode_encour`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_vente_famille_periode_encour` AS select `fa`.`str_CODE_FAMILLE` AS `str_code_groupe`,`pd`.`dt_CREATED` AS `dt_CREATED`,abs(`pd`.`int_PRICE`) AS `int_montant`,`fa`.`str_LIBELLE` AS `groupe` from ((`t_preenregistrement_detail` `pd` join `t_famille` `f` on(`f`.`lg_FAMILLE_ID` = `pd`.`lg_FAMILLE_ID`)) join `t_famillearticle` `fa` on(`fa`.`lg_FAMILLEARTICLE_ID` = `f`.`lg_FAMILLEARTICLE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_vente_famille_periode_encour_1`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_vente_famille_periode_encour_1` AS select `fa`.`str_CODE_FAMILLE` AS `str_code_groupe_1`,`pd`.`dt_CREATED` AS `dt_CREATED_1`,`fa`.`str_LIBELLE` AS `groupe_1`,abs(`pd`.`int_PRICE`) AS `int_montant_1` from ((`t_preenregistrement_detail` `pd` join `t_famille` `f` on(`f`.`lg_FAMILLE_ID` = `pd`.`lg_FAMILLE_ID`)) join `t_famillearticle` `fa` on(`fa`.`lg_FAMILLEARTICLE_ID` = `f`.`lg_FAMILLEARTICLE_ID`)) 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_vente_nord`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_vente_nord` AS select `p`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`p`.`str_REF` AS `str_REF`,`p`.`lg_USER_ID` AS `lg_USER_ID`,`p`.`int_PRICE` AS `int_PRICE`,`p`.`int_PRICE_REMISE` AS `int_PRICE_REMISE`,`p`.`str_STATUT` AS `str_STATUT`,`p`.`dt_CREATED` AS `dt_CREATED`,`p`.`dt_UPDATED` AS `dt_UPDATED`,`p`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,`p`.`str_MEDECIN` AS `str_MEDECIN`,`p`.`str_REF_BON` AS `str_REF_BON`,`p`.`str_ORDONNANCE` AS `str_ORDONNANCE`,`p`.`lg_PARENT_ID` AS `lg_PARENT_ID`,`p`.`dt_CREATED_ORDONNANCE` AS `dt_CREATED_ORDONNANCE`,`p`.`str_INFOS_CLT` AS `str_INFOS_CLT`,`p`.`str_STATUT_VENTE` AS `str_STATUT_VENTE`,`p`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID` from `t_preenregistrement` `p` where `p`.`lg_TYPE_VENTE_ID` <> 1 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_vente_ord`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_vente_ord` AS select `p`.`lg_PREENREGISTREMENT_ID` AS `lg_PREENREGISTREMENT_ID`,`p`.`str_REF` AS `str_REF`,`p`.`lg_USER_ID` AS `lg_USER_ID`,`p`.`int_PRICE` AS `int_PRICE`,`p`.`int_PRICE_REMISE` AS `int_PRICE_REMISE`,`p`.`str_STATUT` AS `str_STATUT`,`p`.`dt_CREATED` AS `dt_CREATED`,`p`.`dt_UPDATED` AS `dt_UPDATED`,`p`.`lg_NATURE_VENTE_ID` AS `lg_NATURE_VENTE_ID`,`p`.`str_MEDECIN` AS `str_MEDECIN`,`p`.`str_REF_BON` AS `str_REF_BON`,`p`.`str_ORDONNANCE` AS `str_ORDONNANCE`,`p`.`lg_PARENT_ID` AS `lg_PARENT_ID`,`p`.`dt_CREATED_ORDONNANCE` AS `dt_CREATED_ORDONNANCE`,`p`.`str_INFOS_CLT` AS `str_INFOS_CLT`,`p`.`str_STATUT_VENTE` AS `str_STATUT_VENTE`,`p`.`lg_TYPE_VENTE_ID` AS `lg_TYPE_VENTE_ID` from `t_preenregistrement` `p` where `p`.`lg_TYPE_VENTE_ID` = 1 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `v_ventes_par_produit`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_ventes_par_produit` AS select cast(`p`.`dt_UPDATED` as date) AS `sale_date`,`u`.`lg_EMPLACEMENT_ID` AS `lg_EMPLACEMENT_ID`,`f`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`f`.`int_CIP` AS `int_CIP`,`f`.`str_NAME` AS `product_name`,`fa`.`lg_FAMILLEARTICLE_ID` AS `lg_FAMILLEARTICLE_ID`,`fa`.`str_LIBELLE` AS `article_family`,`z`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID`,`z`.`str_LIBELLEE` AS `rayon`,`g`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`g`.`str_LIBELLE` AS `grossiste`,sum(`pd`.`int_QUANTITY`) AS `total_quantity`,sum(`pd`.`int_PRICE`) AS `total_price_ttc`,sum(`pd`.`int_PRICE` - `pd`.`int_PRICE_REMISE` - `pd`.`montantTva`) AS `total_price_ht`,sum(`pd`.`prixAchat` * `pd`.`int_QUANTITY`) AS `total_cost_price` from ((((((`t_preenregistrement_detail` `pd` join `t_preenregistrement` `p` on(`pd`.`lg_PREENREGISTREMENT_ID` = `p`.`lg_PREENREGISTREMENT_ID`)) join `t_famille` `f` on(`pd`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID`)) join `t_user` `u` on(`p`.`lg_USER_ID` = `u`.`lg_USER_ID`)) left join `t_famillearticle` `fa` on(`f`.`lg_FAMILLEARTICLE_ID` = `fa`.`lg_FAMILLEARTICLE_ID`)) left join `t_zone_geographique` `z` on(`f`.`lg_ZONE_GEO_ID` = `z`.`lg_ZONE_GEO_ID`)) left join `t_grossiste` `g` on(`f`.`lg_GROSSISTE_ID` = `g`.`lg_GROSSISTE_ID`)) where `p`.`str_STATUT` = 'is_Closed' and `p`.`b_IS_CANCEL` = 0 and `p`.`int_PRICE` > 0 and `p`.`lg_TYPE_VENTE_ID` <> '5' and `f`.`str_STATUT` = 'enable' group by cast(`p`.`dt_UPDATED` as date),`u`.`lg_EMPLACEMENT_ID`,`f`.`lg_FAMILLE_ID`,`f`.`int_CIP`,`f`.`str_NAME`,`fa`.`lg_FAMILLEARTICLE_ID`,`fa`.`str_LIBELLE`,`z`.`lg_ZONE_GEO_ID`,`z`.`str_LIBELLEE`,`g`.`lg_GROSSISTE_ID`,`g`.`str_LIBELLE` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `vw_listeproduits_stockanormal`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_listeproduits_stockanormal` AS select `m`.`Lg_famille_ID` AS `lg_Famille_ID`,`m`.`int_CIP` AS `int_CIP`,`fs`.`int_NUMBER_AVAILABLE` AS `int_NUMBER_AVAILABLE`,`fs`.`int_NUMBER` AS `int_NUMBER`,sum(`m`.`Quantite` + `s`.`int_stock_debut`) AS `QuantiteReelle` from ((`vw_mouvementspararticle` `m` join `vwstockinitialparproduit` `s`) join `t_famille_stock` `fs`) where `m`.`Lg_famille_ID` = `s`.`Lg_famille_ID` and `fs`.`lg_FAMILLE_ID` = `s`.`Lg_famille_ID` and `fs`.`lg_FAMILLE_ID` = `m`.`Lg_famille_ID` group by `m`.`Lg_famille_ID`,`m`.`int_CIP`,`fs`.`int_NUMBER_AVAILABLE`,`fs`.`int_NUMBER` having sum(`m`.`Quantite` + `s`.`int_stock_debut`) <> `fs`.`int_NUMBER_AVAILABLE` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `vw_mouvementspararticle`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_mouvementspararticle` AS select `t`.`lg_FAMILLE_ID` AS `Lg_famille_ID`,`t`.`int_CIP` AS `int_CIP`,sum(case when (`m`.`str_ACTION` = 'AJUSTEMENT' or `m`.`str_ACTION` = 'RETOURFOURNISSEUR') then `m`.`int_NUMBER` else case when `m`.`str_TYPE_ACTION` = 'REMOVE' then -`m`.`int_NUMBER` else `m`.`int_NUMBER` end end) AS `Quantite` from (`t_mouvement` `m` join `t_famille` `t`) where `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` group by `t`.`lg_FAMILLE_ID`,`t`.`int_CIP` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `vwquantiteparjourprod`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vwquantiteparjourprod` AS select `t`.`lg_FAMILLE_ID` AS `LG_famille_id`,`t`.`int_CIP` AS `int_CIP`,`m`.`dt_DAY` AS `DT_day`,sum(case when (`m`.`str_ACTION` = 'AJUSTEMENT' or `m`.`str_ACTION` = 'RETOURFOURNISSEUR') then `m`.`int_NUMBER` else case when `m`.`str_TYPE_ACTION` = 'REMOVE' then -`m`.`int_NUMBER` else `m`.`int_NUMBER` end end) AS `quantite` from (`t_mouvement` `m` join `t_famille` `t`) where `m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID` group by `t`.`lg_FAMILLE_ID`,`t`.`int_CIP`,`m`.`dt_DAY` 
;

-- Suppression de la table temporaire et création finale de la structure de VIEW
DROP TABLE IF EXISTS `vwstockinitialparproduit`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vwstockinitialparproduit` AS select `m`.`lg_FAMILLE_ID` AS `Lg_famille_ID`,`m`.`int_STOCK_DEBUT` AS `int_stock_debut` from `t_mouvement_snapshot` `m` where `m`.`lg_MOUVEMENT_SNAPSHOT_ID` = (select `t_mouvement_snapshot`.`lg_MOUVEMENT_SNAPSHOT_ID` from `t_mouvement_snapshot` where `t_mouvement_snapshot`.`lg_FAMILLE_ID` = `m`.`lg_FAMILLE_ID` order by `t_mouvement_snapshot`.`dt_CREATED` limit 1) 
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
