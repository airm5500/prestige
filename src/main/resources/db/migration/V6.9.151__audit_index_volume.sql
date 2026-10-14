-- Retour du 14/10 (lenteurs mesurees sur 3 ans de donnees : 420 000 ventes, 940 000 mouvements de stock).
--
-- 1. Controle « vente comptant sans mouvement de caisse » (Audit & rapprochements, controle de nuit) : la condition
--    « m.vente_id = p.id OR m.pkey = p.id » empechait l'usage des index, et toute la table des mouvements de caisse
--    etait relue pour chaque vente des dernieres 48 h : 62 s sur le banc, l'ecran Audit restait vide (delai de 30 s
--    depasse). Deux NOT EXISTS separes, chacun sur son index : meme resultat, 21 ms.
UPDATE t_support_controle SET requete_sql = 'SELECT p.lg_PREENREGISTREMENT_ID AS id, CONCAT(''Vente du '', COALESCE(p.completion_date,''?''), '' - '', COALESCE(cli.str_FIRST_NAME,''''), '' '', COALESCE(cli.str_LAST_NAME,'''')) AS ctx FROM t_preenregistrement p LEFT JOIN t_client cli ON cli.lg_CLIENT_ID = p.lg_CLIENT_ID WHERE p.str_STATUT = ''is_Closed'' AND p.lg_TYPE_VENTE_ID = ''1'' AND (p.b_IS_CANCEL IS NULL OR p.b_IS_CANCEL = 0) AND p.lg_PREENGISTREMENT_ANNULE_ID IS NULL AND p.lg_PARENT_ID IS NULL AND p.completion_date >= (NOW() - INTERVAL 48 HOUR) AND NOT EXISTS (SELECT 1 FROM MvtTransaction m WHERE m.vente_id = p.lg_PREENREGISTREMENT_ID) AND NOT EXISTS (SELECT 1 FROM MvtTransaction m WHERE m.pkey = p.lg_PREENREGISTREMENT_ID)', modified_at = NOW() WHERE code = 'VENTE_COMPTANT_SANS_MVT_CAISSE';

-- 2. Date de cloture des ventes : les controles des 48 dernieres heures la filtrent (1,1 s -> 21 ms).
--    Creation en ligne (la table reste utilisable) : 0,8 s pour 420 000 ventes sur le banc.
ALTER TABLE t_preenregistrement ADD INDEX IF NOT EXISTS idx_preenr_completion_date (completion_date), ALGORITHM = INPLACE, LOCK = NONE;

-- 3. Dernier mouvement de chaque produit par emplacement (Audit, stock reel / historique) : 3,5 s -> 0,11 s.
--    Creation en ligne : 2,2 s pour 940 000 mouvements sur le banc.
ALTER TABLE hmvtproduit ADD INDEX IF NOT EXISTS idx_hmvt_fam_empl_created (lg_FAMILLE_ID, lg_EMPLACEMENT_ID, createdAt), ALGORITHM = INPLACE, LOCK = NONE;
