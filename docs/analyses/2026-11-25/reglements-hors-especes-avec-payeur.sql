-- Règlements hors espèces d'une période, avec le payeur (lecture seule).
--
-- Deux corrections par rapport à la première version, constatées sur la base danane :
--  1. CONCAT_WS(' ', NULL, NULL) rend une chaîne vide, pas NULL : le COALESCE s'arrêtait là et n'allait jamais
--     chercher le nom du tiers payant. NULLIF(..., '') rend NULL quand le client n'est pas trouvé.
--  2. Les règlements de tiers payant saisis depuis un dossier de règlement n'ont pas d'organisme sur le mouvement
--     de caisse (m.organisme vide). Le tiers payant se retrouve par le dossier (m.pkey), puis par sa facture.

SET @debut = '2026-01-01';
SET @fin   = '2026-12-31';

SELECT
    m.mvtdate            AS date_reglement,
    m.createdAt          AS saisi_le,
    m.reference,
    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME)), ''),
             tp.str_NAME,
             tpd.str_NAME,
             tpf.str_NAME,
             'NON RENSEIGNE')                        AS payeur,
    m.montantPaye        AS montant_verse,
    tr.str_NAME          AS mode_reglement,
    CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME) AS operateur,
    m.typeMvtCaisseId    AS type_mouvement
FROM mvttransaction m
JOIN t_type_reglement tr
       ON tr.lg_TYPE_REGLEMENT_ID = m.typeReglementId
LEFT JOIN t_client c
       ON c.lg_CLIENT_ID = m.organisme
LEFT JOIN t_tiers_payant tp
       ON tp.lg_TIERS_PAYANT_ID = m.organisme
LEFT JOIN t_dossier_reglement dr
       ON dr.lg_DOSSIER_REGLEMENT_ID = m.pkey
LEFT JOIN t_tiers_payant tpd
       ON tpd.lg_TIERS_PAYANT_ID = dr.str_ORGANISME_ID
LEFT JOIN t_facture f
       ON f.lg_FACTURE_ID = dr.lg_FACTURE_ID
LEFT JOIN t_tiers_payant tpf
       ON tpf.lg_TIERS_PAYANT_ID = f.tiersPayant
LEFT JOIN t_user u
       ON u.lg_USER_ID = m.lg_USER_ID
WHERE m.typeTransaction = 3
  AND m.mvtdate >= @debut
  AND m.mvtdate <= @fin
  AND tr.str_NAME NOT LIKE '%esp%'
ORDER BY tr.str_NAME, m.createdAt;
