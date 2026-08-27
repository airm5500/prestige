DROP DATABASE IF EXISTS prestige_test;
CREATE DATABASE prestige_test DEFAULT CHARSET=utf8mb3;
USE prestige_test;

-- Socle minimal : uniquement les colonnes utilisees par les requetes de valorisation.
CREATE TABLE t_code_tva (
  lg_CODE_TVA_ID varchar(40) NOT NULL PRIMARY KEY,
  int_VALUE int DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE t_zone_geographique (
  lg_ZONE_GEO_ID varchar(40) NOT NULL PRIMARY KEY,
  str_CODE varchar(20),
  str_LIBELLEE varchar(100)
) ENGINE=InnoDB;

CREATE TABLE t_grossiste (
  lg_GROSSISTE_ID varchar(40) NOT NULL PRIMARY KEY,
  str_CODE varchar(20),
  str_LIBELLE varchar(100)
) ENGINE=InnoDB;

CREATE TABLE t_famillearticle (
  lg_FAMILLEARTICLE_ID varchar(40) NOT NULL PRIMARY KEY,
  str_CODE_FAMILLE varchar(20),
  str_LIBELLE varchar(100)
) ENGINE=InnoDB;

CREATE TABLE t_famille (
  lg_FAMILLE_ID varchar(40) NOT NULL PRIMARY KEY,
  str_STATUT varchar(20) DEFAULT 'enable',
  int_PAF int DEFAULT 0,
  int_PRICE int DEFAULT 0,
  lg_ZONE_GEO_ID varchar(40),
  lg_GROSSISTE_ID varchar(40),
  lg_FAMILLEARTICLE_ID varchar(40),
  lg_CODE_TVA_ID varchar(40)
) ENGINE=InnoDB;

CREATE TABLE t_parameters (
  str_KEY varchar(50) NOT NULL PRIMARY KEY,
  str_VALUE varchar(254) DEFAULT NULL,
  str_DESCRIPTION varchar(254) DEFAULT NULL,
  str_TYPE varchar(50) DEFAULT 'SYSTEME',
  str_STATUT varchar(20) DEFAULT 'enable',
  str_IS_EN_KRYPTED varchar(50) DEFAULT NULL,
  str_SECTION_KEY varchar(50) DEFAULT NULL,
  dt_CREATED datetime DEFAULT NULL,
  dt_UPDATED datetime DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE t_support_job (
  id varchar(50) NOT NULL PRIMARY KEY,
  code varchar(60) NOT NULL,
  libelle varchar(255) NOT NULL,
  requete_sql text NOT NULL,
  max_age_minutes int NOT NULL DEFAULT 1800,
  actif tinyint(1) NOT NULL DEFAULT 1,
  ordre int NOT NULL DEFAULT 0,
  UNIQUE KEY uk_support_job_code (code)
) ENGINE=InnoDB;

CREATE TABLE t_support_job_run (
  code varchar(60) NOT NULL PRIMARY KEY,
  last_run_at datetime NOT NULL,
  hostname varchar(255) DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE stock_snapshot (
  id varchar(40) NOT NULL PRIMARY KEY,
  produit_id varchar(40) NOT NULL,
  stock_journalier longtext DEFAULT NULL
) ENGINE=InnoDB;

-- Etat d'avant migration : le controle de fraicheur pointe sur la table de transit.
INSERT INTO t_support_job (id, code, libelle, requete_sql, max_age_minutes, actif, ordre)
VALUES ('sjob-02', 'SNAPSHOT_STOCK', 'Snapshot de stock quotidien', 'SELECT MAX(id) FROM t_stock_snapshot', 1800, 1, 2);

-- Jeu d'essai : 3 produits, 2 rayons, 2 taux de TVA.
INSERT INTO t_code_tva VALUES ('tva18', 18), ('tva0', 0);
INSERT INTO t_zone_geographique VALUES ('zoneA', 'A01', 'Rayon A'), ('zoneB', 'B01', 'Rayon B');
INSERT INTO t_grossiste VALUES ('gr1', 'G01', 'Grossiste 1');
INSERT INTO t_famillearticle VALUES ('fam1', 'F01', 'Famille 1');
INSERT INTO t_famille VALUES
  ('p1', 'enable',  36, 100, 'zoneA', 'gr1', 'fam1', 'tva18'),
  ('p2', 'enable', 500, 900, 'zoneB', 'gr1', 'fam1', 'tva0'),
  ('p3', 'disable', 10,  20, 'zoneA', 'gr1', 'fam1', 'tva18');
