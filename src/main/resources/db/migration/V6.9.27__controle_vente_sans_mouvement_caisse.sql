-- =====================================================================
-- Controle de coherence : ventes terminees sans mouvement de caisse
-- ---------------------------------------------------------------------
-- Une vente terminee doit avoir un mouvement de caisse (mvttransaction,
-- pkey = identifiant de la vente) : c'est lui qui alimente la caisse, les
-- statistiques et le recapitulatif du ticket. Constate en officine : une
-- cloture interrompue par une exception entre le passage de la vente en
-- « terminee » et la creation du mouvement laissait la vente terminee sans
-- mouvement -> ticket impossible (NullPointerException a l'impression et a
-- la reimpression), caisse et stock incomplets.
-- L'application n'enregistre plus de cloture incomplete (transaction
-- annulee) ; ce controle detecte les cas deja presents et ceux qui
-- viendraient d'une autre origine, sur les 90 derniers jours.
-- Controle en DRY-RUN (detection seule) : alimente le journal du Centre de
-- Support avec la reference, la date, le montant et le caissier, sans rien
-- modifier. Index utilises : idx_preenr_statut_date (statut + date) et
-- indexMvtpkey (mvttransaction.pkey).
-- =====================================================================

INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-21', NOW(), NOW(), 'ENABLE', 'VENTE_TERMINEE_SANS_MVT_CAISSE', 'Vente terminée sans mouvement de caisse (ticket impossible, caisse incomplète)', 'VENTE', 1, 1, 21,
'SELECT p.lg_PREENREGISTREMENT_ID AS id, CONCAT(''Vente '', IFNULL(p.str_REF, ''?''), '' | '', IFNULL(DATE_FORMAT(p.dt_UPDATED, ''%d/%m/%Y %H:%i''), ''?''), '' | montant: '', IFNULL(p.int_PRICE, 0), '' | statut: '', IFNULL(p.str_STATUT_VENTE, ''?''), '' | caissier: '', IFNULL(u.str_LOGIN, ''?'')) AS ctx FROM t_preenregistrement p LEFT JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_CAISSIER_ID WHERE p.str_STATUT = ''is_Closed'' AND p.dt_UPDATED >= DATE_SUB(NOW(), INTERVAL 90 DAY) AND m.pkey IS NULL ORDER BY p.dt_UPDATED DESC');
