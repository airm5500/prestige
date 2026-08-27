-- =====================================================================
-- Valorisation historique : bascule de lecture, retention et purge
-- ---------------------------------------------------------------------
-- Trois parametres pilotent la fin de la migration. Tous se modifient en
-- base, sans redeploiement : c'est le mecanisme de retour arriere.
--
--  * KEY_VALORISATION_SOURCE (JSON par defaut)
--      JSON  : les ecrans et exports lisent l'archive stock_snapshot,
--              comportement d'origine.
--      TABLE : ils lisent le releve stock_snapshot_day.
--      A ne passer a TABLE qu'apres la reprise de l'historique ET la
--      comparaison des deux sources
--      (GET /api/v1/produit/valorisation/comparaison).
--
--  * KEY_VALORISATION_ECRITURE_JSON (1 par defaut)
--      Tant qu'il vaut 1, le traitement de nuit alimente les deux
--      sources. A ne passer a 0 qu'apres la periode de securite, la
--      lecture etant deja sur TABLE. C'est l'ecriture la plus couteuse
--      du traitement : chaque produit voit son historique complet relu
--      puis reecrit pour ajouter une seule journee.
--
--  * KEY_VALORISATION_RETENTION_JOURS (90)
--      Fenetre glissante conservee au jour le jour. En deca de 30 jours
--      la valeur est ignoree et 30 est applique.
-- =====================================================================

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
	VALUES ('KEY_VALORISATION_SOURCE', 'JSON', 'SOURCE DES VALORISATIONS HISTORIQUES : JSON OU TABLE', 'SYSTEME', 'enable', NULL, NULL, NULL, NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
	VALUES ('KEY_VALORISATION_ECRITURE_JSON', '1', 'ALIMENTER ENCORE L''ARCHIVE JSON LORS DU RELEVE QUOTIDIEN (1 = OUI, 0 = NON)', 'SYSTEME', 'enable', NULL, NULL, NULL, NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
	VALUES ('KEY_VALORISATION_RETENTION_JOURS', '90', 'JOURS DE RELEVE CONSERVES AU JOUR LE JOUR, EN PLUS DES CLOTURES DE MOIS', 'SYSTEME', 'enable', NULL, NULL, NULL, NULL);

-- ---------------------------------------------------------------------
-- Surveillance des deux nouveaux traitements. max_age_minutes est
-- dimensionne sur leur periodicite reelle :
--  * la reprise tourne chaque nuit tant qu'elle n'est pas terminee, puis
--    ne se declare plus : le controle reste inactif (actif = 0) et n'est
--    a activer que si l'on veut surveiller une reprise en cours.
--  * la purge est mensuelle : 45 jours de tolerance.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_support_job (id, code, libelle, requete_sql, max_age_minutes, actif, ordre)
VALUES ('sjob-05', 'REPRISE_SNAPSHOT_DAY', 'Reprise de l''historique de valorisation',
'SELECT last_run_at FROM t_support_job_run WHERE code = ''REPRISE_SNAPSHOT_DAY''', 2880, 0, 5);

INSERT IGNORE INTO t_support_job (id, code, libelle, requete_sql, max_age_minutes, actif, ordre)
VALUES ('sjob-06', 'PURGE_VALORISATION', 'Purge mensuelle du releve de valorisation (le 2 a 02:30)',
'SELECT last_run_at FROM t_support_job_run WHERE code = ''PURGE_VALORISATION''', 64800, 1, 6);

-- ---------------------------------------------------------------------
-- Retrait de l'archive JSON : DELIBEREMENT NON AUTOMATISE.
--
-- Renommer ou supprimer stock_snapshot est irreversible et ne doit pas
-- se declencher au deploiement d'une version. A executer a la main, une
-- fois seulement que : la lecture est sur TABLE depuis plusieurs
-- semaines, l'ecriture JSON est arretee, les comparaisons de dates
-- representatives sont sans ecart, et une sauvegarde restaurable existe.
--
--   RENAME TABLE stock_snapshot TO stock_snapshot_json_archive;
--
-- Conserver l'archive le temps convenu avec le metier, puis :
--
--   DROP TABLE stock_snapshot_json_archive;
--
-- La table de transit t_stock_snapshot, elle, n'est plus alimentee : la
-- procedure proc_update_stock_snaps() n'est plus appelee. Elle peut etre
-- retiree par la meme demarche, apres verification qu'elle est vide.
-- ---------------------------------------------------------------------
