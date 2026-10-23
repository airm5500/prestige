-- Controle de coherence SNAPSHOT_JOUR_MANQUANT (journal du poste caisse 3, 23/10) : il lisait t_stock_snapshot, que
-- plus rien n'alimente depuis le retrait de la procedure de nuit. Il signalait donc une absence chaque nuit, meme
-- quand le releve est desactive. Le releve est ecrit dans stock_snapshot_day a 00:05, a la date du jour (stock a la
-- cloture de la veille), et seulement si KEY_VALORISATION_JOURNALIERE vaut 1.
UPDATE t_support_controle
SET libelle = 'Releve de stock de la nuit absent',
    requete_sql = 'SELECT CAST(DATE_FORMAT(CURDATE(), ''%Y%m%d'') AS UNSIGNED) AS id, ''releve de stock de la nuit absent (stock a la cloture de la veille)'' AS ctx FROM DUAL WHERE EXISTS (SELECT 1 FROM t_parameters p WHERE p.str_KEY = ''KEY_VALORISATION_JOURNALIERE'' AND p.str_VALUE = ''1'') AND NOT EXISTS (SELECT 1 FROM stock_snapshot_day s WHERE s.stock_of_day = CAST(DATE_FORMAT(CURDATE(), ''%Y%m%d'') AS UNSIGNED))',
    modified_at = NOW()
WHERE code = 'SNAPSHOT_JOUR_MANQUANT';
