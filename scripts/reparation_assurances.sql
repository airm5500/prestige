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


-- ============================================================================
-- ETAPE 4 — DOUBLONS MEME (COMPTE, TIERS-PAYANT)
-- ============================================================================
-- Cas observe (COULIBALY) : deux liens actifs vers le MEME tiers-payant
-- (MUGEF x2). On conserve, par (compte, tiers-payant), le lien actif le plus
-- utile (RO d'abord, puis le plus recemment mis a jour) et on desactive les
-- autres. Les ventes deja rattachees aux liens desactives restent lisibles.
-- ----------------------------------------------------------------------------
-- 4a — APERCU (LECTURE SEULE) : ce qui SERA desactive
-- ----------------------------------------------------------------------------
SELECT a.lg_COMPTE_CLIENT_ID                                     AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)            AS client,
       tp.str_NAME                                               AS assurance,
       a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID                        AS lien_a_desactiver,
       a.int_POURCENTAGE, a.b_IS_RO, a.dt_CREATED
FROM t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
     AND b.str_STATUT = 'enable'
     AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID <> a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     AND ( b.b_IS_RO > COALESCE(a.b_IS_RO,0)
           OR ( COALESCE(b.b_IS_RO,0) = COALESCE(a.b_IS_RO,0)
                AND ( COALESCE(b.dt_UPDATED,b.dt_CREATED) > COALESCE(a.dt_UPDATED,a.dt_CREATED)
                      OR ( COALESCE(b.dt_UPDATED,b.dt_CREATED) = COALESCE(a.dt_UPDATED,a.dt_CREATED)
                           AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) ) ) )
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
WHERE a.str_STATUT = 'enable'
ORDER BY a.lg_COMPTE_CLIENT_ID;

-- ----------------------------------------------------------------------------
-- 4b — REPARATION (ECRITURE) : decommenter apres sauvegarde
-- ----------------------------------------------------------------------------
-- START TRANSACTION;
--
-- UPDATE t_compte_client_tiers_payant a
-- JOIN t_compte_client_tiers_payant b
--       ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
--      AND b.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
--      AND b.str_STATUT = 'enable'
--      AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID <> a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
--      AND ( b.b_IS_RO > COALESCE(a.b_IS_RO,0)
--            OR ( COALESCE(b.b_IS_RO,0) = COALESCE(a.b_IS_RO,0)
--                 AND ( COALESCE(b.dt_UPDATED,b.dt_CREATED) > COALESCE(a.dt_UPDATED,a.dt_CREATED)
--                       OR ( COALESCE(b.dt_UPDATED,b.dt_CREATED) = COALESCE(a.dt_UPDATED,a.dt_CREATED)
--                            AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) ) ) )
-- SET a.str_STATUT = 'delete', a.int_PRIORITY = -1, a.dt_UPDATED = NOW()
-- WHERE a.str_STATUT = 'enable';
--
-- -- COMMIT;   (ou ROLLBACK;)


-- ============================================================================
-- ETAPE 5 — LIENS SANS AUCUNE VENTE (LECTURE SEULE, arbitrage manuel)
-- ============================================================================
-- Cas observe : FADIGA LANCINE INDIVIDUEL rattache a des clients sans aucune
-- vente. Un lien actif sans vente peut etre une contamination (a desactiver)
-- MAIS AUSSI une souscription recente legitime : NE PAS desactiver en masse.
-- Cette requete liste les candidats ; decision au cas par cas.
-- ----------------------------------------------------------------------------
SELECT ccl.lg_COMPTE_CLIENT_ID                                   AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)            AS client,
       tp.str_NAME                                               AS assurance,
       cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID                     AS lien,
       cctp.b_IS_RO, cctp.int_PRIORITY, cctp.int_POURCENTAGE,
       cctp.dt_CREATED                                           AS lien_cree_le
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
  AND NOT EXISTS (
      SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent pcctp
      WHERE pcctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID )
ORDER BY tp.str_NAME, cctp.dt_CREATED DESC;

-- ----------------------------------------------------------------------------
-- 5b — SOUS-ENSEMBLE SUR : parasites quasi certains parmi les liens sans vente
-- ----------------------------------------------------------------------------
-- Un lien RO sans aucune vente, alors que le MEME compte possede un AUTRE lien
-- RO actif qui, lui, a deja servi a des ventes : l'ancien RO n'a jamais servi
-- et un RO plus recent travaille a sa place => desactivable sans risque.
-- (Ces cas sont aussi couverts par la reparation multi-RO des etapes 1-2 ;
--  cette requete sert de contre-verification.)
-- ----------------------------------------------------------------------------
SELECT ccl.lg_COMPTE_CLIENT_ID                                   AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)            AS client,
       tp.str_NAME                                               AS ro_sans_vente,
       cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID                     AS lien,
       cctp.dt_CREATED                                           AS lien_cree_le,
       tp2.str_NAME                                              AS ro_qui_travaille
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
JOIN t_compte_client_tiers_payant autre
      ON autre.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
     AND autre.lg_COMPTE_CLIENT_TIERS_PAYANT_ID <> cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     AND autre.str_STATUT = 'enable' AND autre.b_IS_RO = 1
JOIN t_tiers_payant tp2  ON tp2.lg_TIERS_PAYANT_ID = autre.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
  AND cctp.b_IS_RO = 1
  AND NOT EXISTS (
      SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent pcctp
      WHERE pcctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID )
  AND EXISTS (
      SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent pcctp2
      WHERE pcctp2.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = autre.lg_COMPTE_CLIENT_TIERS_PAYANT_ID )
ORDER BY cctp.dt_CREATED DESC;
