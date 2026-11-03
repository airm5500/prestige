-- Plan « clients assures et tiers-payants », etape 6, reprise (accord du 03/11) des donnees comptees par les controles
-- CLIENT_ASSURE_SANS_TP_ACTIF et LIEN_TP_ORGANISME_INACTIF (V7.2.30.40). Meme effet que la desactivation d'un organisme
-- (tierspayantManagement.enableOrDisableTierspayant) :
--  1. le lien actif vers un organisme absent ou inactif est desactive (il revient si l'organisme est reactive) ;
--  2. si le client garde des liens actifs sans principal (ni regime obligatoire, ni priorite 1), celui de plus petite
--     priorite passe en priorite 1, sans devenir regime obligatoire ;
--  3. le client assure ou carnet actif qui n'a plus de lien actif vers un organisme actif est desactive, avec son compte.
-- Rien n'est supprime. Seuls des identifiants techniques et des statuts sont lus.

CREATE TEMPORARY TABLE tmp_reprise_liens AS
SELECT l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS id, l.lg_COMPTE_CLIENT_ID AS compte
FROM t_compte_client_tiers_payant l
LEFT JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID
WHERE l.str_STATUT = 'enable' AND (t.lg_TIERS_PAYANT_ID IS NULL OR t.str_STATUT <> 'enable');

UPDATE t_compte_client_tiers_payant l
JOIN tmp_reprise_liens r ON r.id = l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
SET l.str_STATUT = 'disable', l.dt_UPDATED = NOW();

CREATE TEMPORARY TABLE tmp_reprise_promus AS
SELECT (SELECT l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant l
        WHERE l.lg_COMPTE_CLIENT_ID = c.compte AND l.str_STATUT = 'enable'
        ORDER BY CASE WHEN l.int_PRIORITY IS NULL OR l.int_PRIORITY < 1 THEN 2147483647 ELSE l.int_PRIORITY END,
                 l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
        LIMIT 1) AS id
FROM (SELECT DISTINCT compte FROM tmp_reprise_liens) c
WHERE EXISTS (SELECT 1 FROM t_compte_client_tiers_payant l
              WHERE l.lg_COMPTE_CLIENT_ID = c.compte AND l.str_STATUT = 'enable')
  AND NOT EXISTS (SELECT 1 FROM t_compte_client_tiers_payant l
                  WHERE l.lg_COMPTE_CLIENT_ID = c.compte AND l.str_STATUT = 'enable'
                    AND (l.b_IS_RO = 1 OR l.int_PRIORITY = 1));

UPDATE t_compte_client_tiers_payant l
JOIN tmp_reprise_promus p ON p.id = l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
SET l.int_PRIORITY = 1, l.dt_UPDATED = NOW();

CREATE TEMPORARY TABLE tmp_reprise_clients AS
SELECT c.lg_CLIENT_ID AS id
FROM t_client c
WHERE c.str_STATUT = 'enable' AND c.lg_TYPE_CLIENT_ID IN ('1', '2')
  AND NOT EXISTS (SELECT 1 FROM t_compte_client cc
                  JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID
                  JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID
                  WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND l.str_STATUT = 'enable' AND t.str_STATUT = 'enable');

UPDATE t_compte_client cc
JOIN tmp_reprise_clients r ON r.id = cc.lg_CLIENT_ID
SET cc.str_STATUT = 'disable', cc.dt_UPDATED = NOW()
WHERE cc.str_STATUT = 'enable';

UPDATE t_client c
JOIN tmp_reprise_clients r ON r.id = c.lg_CLIENT_ID
SET c.str_STATUT = 'disable', c.dt_UPDATED = NOW();

DROP TEMPORARY TABLE tmp_reprise_liens;
DROP TEMPORARY TABLE tmp_reprise_promus;
DROP TEMPORARY TABLE tmp_reprise_clients;
