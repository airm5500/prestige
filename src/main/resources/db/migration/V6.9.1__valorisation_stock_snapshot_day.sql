-- =====================================================================
-- Valorisation historique du stock : releve journalier relationnel
-- ---------------------------------------------------------------------
-- Jusqu'ici l'historique vit dans stock_snapshot.stock_journalier, un
-- document JSON par produit contenant TOUTES les journees. La date
-- recherchee est donc a l'interieur du document et non dans une colonne
-- indexable : pour valoriser une date passee, le serveur doit lire et
-- analyser l'historique complet des ~22 000 produits (plusieurs centaines
-- de Mo), d'ou les ~13 s d'attente, qui augmentent chaque jour.
--
-- stock_snapshot_day porte une ligne par journee/magasin/produit : la
-- valorisation d'une date redevient une agregation indexee.
--
-- Choix assumes :
--  * stock_of_day au format entier yyyyMMdd, comme le champ stockOfDay
--    deja utilise dans le JSON (aucune conversion a la reprise).
--    Semantique : le releve est pris a 00:05, il decrit donc le stock a
--    la CLOTURE de la veille (la ligne du 01/05 = cloture du 30/04).
--  * PAS de cle etrangere vers t_famille : 22 000 insertions par nuit
--    poseraient autant de verrous partages sur les lignes produit, ce qui
--    est exactement le mecanisme qui bloquait les caisses a l'epoque de
--    t_stock_snapshot. La jointure sur t_famille se fait de toute facon
--    dans les requetes de valorisation.
--  * prix ET taux de TVA figes au jour du releve : une modification
--    ulterieure de la fiche produit ne doit pas modifier retroactivement
--    une valorisation deja publiee.
--  * un seul index secondaire (historique d'un produit) : chaque index
--    supplementaire ralentit l'ecriture de nuit sans servir aucun ecran.
--    La cle primaire couvre deja le filtre (journee, magasin).
-- =====================================================================

CREATE TABLE IF NOT EXISTS `stock_snapshot_day` (
    `stock_of_day` INT NOT NULL,
    `magasin_id` VARCHAR(40) NOT NULL,
    `produit_id` VARCHAR(40) NOT NULL,
    `qty` INT NOT NULL DEFAULT 0,
    `qty_reserve` INT NOT NULL DEFAULT 0,
    `prix_paf` INT NOT NULL DEFAULT 0,
    `prix_uni` INT NOT NULL DEFAULT 0,
    `prix_moyen_pondere` INT NOT NULL DEFAULT 0,
    `valeur_tva` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`stock_of_day`, `magasin_id`, `produit_id`),
    KEY `idx_snapshot_day_produit_date` (`produit_id`, `stock_of_day`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Suivi de la reprise de l'historique JSON vers stock_snapshot_day.
-- Une seule ligne (id = 1). Elle memorise le dernier produit traite pour
-- que la reprise puisse s'arreter et repartir la ou elle en etait, et
-- conserve le compte-rendu (documents lus/invalides, lignes importees).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_snapshot_backfill` (
    `id` INT NOT NULL,
    `dernier_produit_id` VARCHAR(40) NULL,
    `documents_lus` INT NOT NULL DEFAULT 0,
    `documents_invalides` INT NOT NULL DEFAULT 0,
    `lignes_importees` INT NOT NULL DEFAULT 0,
    `journees_retenues` TEXT NULL,
    `termine` TINYINT(1) NOT NULL DEFAULT 0,
    `started_at` DATETIME NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

INSERT IGNORE INTO `stock_snapshot_backfill` (`id`) VALUES (1);

-- ---------------------------------------------------------------------
-- Fausse alerte "Snapshot de stock quotidien : aucun passage trouve".
--
-- Le controle interrogeait t_stock_snapshot, qui n'est qu'une table de
-- TRANSIT : le traitement quotidien y verse ses lignes puis les supprime
-- apres migration. Une fois le job termine avec succes, elle est vide, et
-- le moniteur en concluait chaque heure que le job n'avait jamais tourne.
--
-- Le job declare desormais lui-meme son passage dans t_support_job_run
-- (comme PURGE_SUPPORT et COHERENCE_SUPPORT) ; le controle lit cette
-- declaration.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_support_job (id, code, libelle, requete_sql, max_age_minutes, actif, ordre)
VALUES ('sjob-02', 'SNAPSHOT_STOCK', 'Snapshot de stock quotidien',
'SELECT last_run_at FROM t_support_job_run WHERE code = ''SNAPSHOT_STOCK''', 1800, 1, 2);

UPDATE t_support_job
   SET requete_sql = 'SELECT last_run_at FROM t_support_job_run WHERE code = ''SNAPSHOT_STOCK'''
 WHERE code = 'SNAPSHOT_STOCK';
