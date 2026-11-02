-- Plan « clients assures et tiers-payants », etape 6 : comptage, en lecture seule, des donnees anciennes que les
-- etapes 2 a 5 ne laissent plus se former. Deux controles de coherence en observation (dry_run = 1 : aucun ticket,
-- aucune correction). Ils ne lisent que des identifiants techniques et des statuts, aucune colonne nominative.
-- La reprise de ces donnees attend l'accord de l'officine.

-- Client assure (assurance ou carnet) actif sans lien actif vers un organisme actif : la vente ne le propose plus
-- (etape 5), mais il reste actif dans la gestion des clients.
INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-22', NOW(), NOW(), 'ENABLE', 'CLIENT_ASSURE_SANS_TP_ACTIF', 'Client assure actif sans tiers-payant actif', 'CLIENT', 1, 1, 22,
'SELECT c.lg_CLIENT_ID AS id, CONCAT(''type '', c.lg_TYPE_CLIENT_ID) AS ctx FROM t_client c WHERE c.str_STATUT = ''enable'' AND c.lg_TYPE_CLIENT_ID IN (''1'',''2'') AND NOT EXISTS (SELECT 1 FROM t_compte_client cc JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND l.str_STATUT = ''enable'' AND t.str_STATUT = ''enable'')');

-- Lien client / tiers-payant actif dont l'organisme est absent ou n'est plus actif.
INSERT IGNORE INTO t_support_controle (id, created_at, modified_at, status, code, libelle, module, dry_run, actif, ordre, requete_sql)
VALUES ('sctrl-23', NOW(), NOW(), 'ENABLE', 'LIEN_TP_ORGANISME_INACTIF', 'Tiers-payant de client actif sur un organisme absent ou inactif', 'CLIENT', 1, 1, 23,
'SELECT l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS id, COALESCE(CONCAT(''organisme '', t.str_STATUT), ''organisme absent'') AS ctx FROM t_compte_client_tiers_payant l LEFT JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID WHERE l.str_STATUT = ''enable'' AND (t.lg_TIERS_PAYANT_ID IS NULL OR t.str_STATUT <> ''enable'')');
