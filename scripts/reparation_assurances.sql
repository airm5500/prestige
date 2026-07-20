-- ============================================================================
-- REPARATION : PLUSIEURS RO ACTIFS SUR UN MEME COMPTE (mélange d'assurances)
-- ============================================================================
-- Regle metier : un client a UN SEUL RO (regime obligatoire) actif a la fois ;
-- les complementaires (RC) peuvent s'accumuler.
--
-- Ce script NE TOUCHE QUE les liens RO en trop. Il conserve, pour chaque compte,
-- le RO le plus RECENT (dt_CREATED, puis id en cas d'egalite) et desactive les
-- RO plus anciens (str_STATUT='delete', int_PRIORITY=-1) — exactement comme le
-- fait le code (desabledCompteClientTiersPayant). Les complementaires ne sont
-- jamais modifiees.
--
-- /!\  ECRITURE. A executer APRES deploiement du correctif applicatif et
--      APRES une SAUVEGARDE COMPLETE de la base :
--      mysqldump -u root -p tenena > sauvegarde_avant_reparation_assurances.sql
-- ============================================================================


-- ----------------------------------------------------------------------------
-- ETAPE 1 — APERCU (LECTURE SEULE) : ce qui SERA desactive
-- ----------------------------------------------------------------------------
-- Chaque ligne = un lien RO qui sera passe en 'delete' parce qu'un RO plus
-- recent existe sur le meme compte. Verifier avant d'appliquer l'etape 2.
-- ----------------------------------------------------------------------------
SELECT a.lg_COMPTE_CLIENT_ID                                     AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)            AS client,
       tp.str_NAME                                               AS assurance_ro_a_desactiver,
       a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID                        AS lien,
       a.dt_CREATED                                              AS cree_le
FROM t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.str_STATUT = 'enable' AND b.b_IS_RO = 1
     AND ( b.dt_CREATED > a.dt_CREATED
           OR ( b.dt_CREATED = a.dt_CREATED
                AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) )
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
WHERE a.str_STATUT = 'enable' AND a.b_IS_RO = 1
ORDER BY a.lg_COMPTE_CLIENT_ID, a.dt_CREATED;


-- ----------------------------------------------------------------------------
-- ETAPE 2 — REPARATION (ECRITURE) : desactive les RO en trop
-- ----------------------------------------------------------------------------
-- Decommenter et executer apres sauvegarde. Ideal : dans une transaction.
-- ----------------------------------------------------------------------------
-- START TRANSACTION;
--
-- UPDATE t_compte_client_tiers_payant a
-- JOIN t_compte_client_tiers_payant b
--       ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
--      AND b.str_STATUT = 'enable' AND b.b_IS_RO = 1
--      AND ( b.dt_CREATED > a.dt_CREATED
--            OR ( b.dt_CREATED = a.dt_CREATED
--                 AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) )
-- SET a.str_STATUT = 'delete', a.int_PRIORITY = -1, a.dt_UPDATED = NOW()
-- WHERE a.str_STATUT = 'enable' AND a.b_IS_RO = 1;
--
-- -- Verifier le nombre de lignes touchees, puis :
-- -- COMMIT;   (ou ROLLBACK; si le compte est incoherent)


-- ----------------------------------------------------------------------------
-- ETAPE 3 — CONTROLE (LECTURE SEULE) : plus aucun compte multi-RO
-- ----------------------------------------------------------------------------
-- Doit renvoyer 0 apres reparation.
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS nb_comptes_multi_ro_restants FROM (
  SELECT lg_COMPTE_CLIENT_ID
  FROM t_compte_client_tiers_payant
  WHERE str_STATUT = 'enable' AND b_IS_RO = 1
  GROUP BY lg_COMPTE_CLIENT_ID
  HAVING COUNT(*) > 1
) x;
