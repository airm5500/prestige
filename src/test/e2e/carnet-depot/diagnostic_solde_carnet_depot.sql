-- ===========================================================================
-- DIAGNOSTIC (LECTURE SEULE) : solde des carnets depot
--
-- Le solde d'un carnet depot n'est pas recalcule a l'affichage : il est STOCKE
-- dans t_tiers_payant.account et tenu par increments a chaque operation.
--   + credit  a l'enregistrement d'une vente
--   - debit   a l'annulation d'une vente, a un reglement, a un retour
--
-- L'annulation faite lors de la MODIFICATION d'une vente omettait le debit.
-- Le montant de la vente annulee restait donc acquis au solde : une vente de
-- 25 000 modifiee en 20 000 laissait 45 000 au lieu de 20 000.
--
-- Ces requetes ne modifient RIEN. A executer avant toute correction, pour
-- mesurer l'ampleur reelle sur les donnees de production.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. SYNTHESE : solde stocke contre solde recalcule, par carnet depot
--
-- C'est le chiffre qui fait foi : il compare ce que l'application affiche
-- (account) a ce que disent les ecritures, quelle que soit la cause de l'ecart.
-- ---------------------------------------------------------------------------
SELECT
    tp.lg_TIERS_PAYANT_ID                              AS carnet_id,
    tp.str_NAME                                        AS carnet,
    tp.account                                         AS solde_affiche,
    COALESCE(v.ventes, 0)                              AS ventes_actives,
    COALESCE(r.reglements, 0)                          AS reglements,
    COALESCE(rc.retours, 0)                            AS retours,
    COALESCE(v.ventes, 0) - COALESCE(r.reglements, 0)
                          - COALESCE(rc.retours, 0)    AS solde_recalcule,
    tp.account - (COALESCE(v.ventes, 0) - COALESCE(r.reglements, 0)
                                        - COALESCE(rc.retours, 0)) AS ecart
FROM t_tiers_payant tp
LEFT JOIN (
        -- ventes encore actives : ecriture vivante, vente cloturee et non annulee
        SELECT cc.lg_TIERS_PAYANT_ID AS tpid, SUM(cpl.int_PRICE) AS ventes
        FROM t_preenregistrement_compte_client_tiers_payent cpl
        JOIN t_compte_client_tiers_payant cc
          ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
        JOIN t_preenregistrement p
          ON p.lg_PREENREGISTREMENT_ID = cpl.lg_PREENREGISTREMENT_ID
        WHERE cpl.str_STATUT = 'is_Closed'
          AND p.str_STATUT   = 'is_Closed'
          AND p.b_IS_CANCEL  = 0
          AND p.int_PRICE    > 0
        GROUP BY cc.lg_TIERS_PAYANT_ID
    ) v  ON v.tpid  = tp.lg_TIERS_PAYANT_ID
LEFT JOIN (
        SELECT tierspayant_id AS tpid, SUM(montant_paye) AS reglements
        FROM reglement_carnet
        GROUP BY tierspayant_id
    ) r  ON r.tpid  = tp.lg_TIERS_PAYANT_ID
LEFT JOIN (
        SELECT rcc.tierspayant_id AS tpid, SUM(d.qty_retour * d.prix_uni) AS retours
        FROM retour_carnet rcc
        JOIN retour_carnet_detail d ON d.retour_carnet_id = rcc.id
        GROUP BY rcc.tierspayant_id
    ) rc ON rc.tpid = tp.lg_TIERS_PAYANT_ID
WHERE tp.is_depot = 1
  AND tp.account <> (COALESCE(v.ventes, 0) - COALESCE(r.reglements, 0)
                                           - COALESCE(rc.retours, 0))
ORDER BY ABS(tp.account - (COALESCE(v.ventes, 0) - COALESCE(r.reglements, 0)
                                                 - COALESCE(rc.retours, 0))) DESC;


-- ---------------------------------------------------------------------------
-- 2. DETAIL : les ventes modifiees qui pesent encore sur le solde
--
-- Une vente MODIFIEE se reconnait a ceci : la vente de remplacement porte la
-- MEME reference que l'originale (cloneVente recopie str_REF), alors qu'une
-- annulation simple en genere une nouvelle. C'est ce cas qui omettait le debit.
--
-- La somme de montant_non_debite par carnet doit expliquer l'ecart de la
-- requete 1. Si elle ne l'explique pas entierement, une autre cause coexiste :
-- ne pas corriger a l'aveugle, revenir vers l'editeur.
-- ---------------------------------------------------------------------------
SELECT
    tp.lg_TIERS_PAYANT_ID              AS carnet_id,
    tp.str_NAME                        AS carnet,
    origine.lg_PREENREGISTREMENT_ID    AS vente_origine_id,
    origine.str_REF                    AS reference,
    origine.int_PRICE                  AS montant_origine,
    remplacement.lg_PREENREGISTREMENT_ID AS vente_remplacement_id,
    remplacement.int_PRICE             AS montant_remplacement,
    cpl.int_PRICE                      AS montant_non_debite,
    origine.dt_ANNULER                 AS annulee_le
FROM t_preenregistrement origine
JOIN t_preenregistrement remplacement
      ON remplacement.lg_PREENGISTREMENT_ANNULE_ID = origine.lg_PREENREGISTREMENT_ID
     AND remplacement.str_REF = origine.str_REF          -- signature d'une MODIFICATION
JOIN t_preenregistrement_compte_client_tiers_payent cpl
      ON cpl.lg_PREENREGISTREMENT_ID = origine.lg_PREENREGISTREMENT_ID
JOIN t_compte_client_tiers_payant cc
      ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
JOIN t_tiers_payant tp
      ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID
WHERE tp.is_depot   = 1
  AND origine.b_IS_CANCEL = 1
  AND cpl.str_STATUT = 'delete'
ORDER BY tp.str_NAME, origine.dt_ANNULER DESC;


-- ---------------------------------------------------------------------------
-- 3. RAPPROCHEMENT : l'ecart s'explique-t-il entierement par les modifications ?
-- ---------------------------------------------------------------------------
SELECT
    tp.str_NAME                                AS carnet,
    COUNT(DISTINCT origine.lg_PREENREGISTREMENT_ID) AS nb_ventes_modifiees,
    SUM(cpl.int_PRICE)                         AS montant_total_non_debite
FROM t_preenregistrement origine
JOIN t_preenregistrement remplacement
      ON remplacement.lg_PREENGISTREMENT_ANNULE_ID = origine.lg_PREENREGISTREMENT_ID
     AND remplacement.str_REF = origine.str_REF
JOIN t_preenregistrement_compte_client_tiers_payent cpl
      ON cpl.lg_PREENREGISTREMENT_ID = origine.lg_PREENREGISTREMENT_ID
JOIN t_compte_client_tiers_payant cc
      ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
JOIN t_tiers_payant tp
      ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID
WHERE tp.is_depot   = 1
  AND origine.b_IS_CANCEL = 1
  AND cpl.str_STATUT = 'delete'
GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_NAME
ORDER BY montant_total_non_debite DESC;
