-- ============================================================================
-- SCRIPT DE DIAGNOSTIC DE LA GESTION DES DIFFERES
-- ============================================================================
-- Script en LECTURE SEULE : aucune modification de données.
-- Dialecte : MySQL / MariaDB.
--
-- Contexte : des clients apparaissent comme devant encore de l'argent alors
-- que des reglements ont ete effectues. Chaque section ci-dessous teste une
-- cause possible. Executer les sections une par une et noter celles qui
-- retournent des lignes.
--
-- Rappel du modele :
--   t_preenregistrement_compte_client (o) = une ligne de dette par vente differee
--       int_PRICE       = montant mis en differe a la vente
--       int_PRICE_RESTE = reste a payer (0 = solde)
--       str_STATUT      = 'is_Closed' (normal), 'is_Process' (copie de
--                         modification de vente), 'delete' (annule)
--   t_preenregistrement (p) = la vente ; b_IS_CANCEL = 1 si annulee
--   t_dossier_reglement (d) + t_dossier_reglement_detail (dd) = un reglement
--       de differe et sa repartition sur les dettes (dd.str_REF pointe vers
--       o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID)
--   MvtTransaction (m) = l'encaissement en caisse (typeMvtCaisseId = '2'
--       pour les reglements de differes, m.pkey = id du dossier)
-- ============================================================================


-- ============================================================================
-- SECTION 1 : LES DIFFERENTS "SOLDES" D'UN MEME CLIENT
-- ----------------------------------------------------------------------------
-- L'application calcule le solde differemment selon l'ecran :
--   * fiche client            : somme de TOUS les restes (aucun filtre)
--   * ecran de reglement      : restes > 0, statut cloture, vente non annulee
--   * onglet LISTE REGLEMENTS : restes des ventes non annulees de prix > 0
-- Cette requete met les calculs cote a cote. Toute ligne retournee est un
-- client dont le solde affiche depend de l'ecran consulte => explication
-- directe du "client qui doit encore".
-- ============================================================================
SELECT t.*
FROM (
    SELECT cl.lg_CLIENT_ID                                        AS client_id,
           CONCAT(cl.str_FIRST_NAME, ' ', cl.str_LAST_NAME)       AS client,
           SUM(o.int_PRICE_RESTE)                                 AS solde_fiche_client,
           SUM(CASE WHEN o.str_STATUT = 'is_Closed'
                     AND p.b_IS_CANCEL = 0
                     AND o.int_PRICE_RESTE > 0
                    THEN o.int_PRICE_RESTE ELSE 0 END)            AS solde_reglable_ecran_reglement,
           SUM(CASE WHEN p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
                    THEN o.int_PRICE_RESTE ELSE 0 END)            AS solde_onglet_liste_reglements,
           SUM(CASE WHEN o.str_STATUT <> 'is_Closed'
                    THEN o.int_PRICE_RESTE ELSE 0 END)            AS restes_sur_lignes_non_cloturees,
           SUM(CASE WHEN p.b_IS_CANCEL = 1
                    THEN o.int_PRICE_RESTE ELSE 0 END)            AS restes_sur_ventes_annulees
    FROM t_preenregistrement_compte_client o
    JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
    JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
    JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
    GROUP BY cl.lg_CLIENT_ID, client
) t
WHERE t.solde_fiche_client <> t.solde_reglable_ecran_reglement
   OR t.restes_sur_lignes_non_cloturees <> 0
   OR t.restes_sur_ventes_annulees <> 0
ORDER BY ABS(t.solde_fiche_client - t.solde_reglable_ecran_reglement) DESC;


-- ============================================================================
-- SECTION 2 : DETTES FANTOMES (reste > 0 mais insoldables)
-- ----------------------------------------------------------------------------
-- Lignes de dette avec un reste positif que l'ecran "Faire un reglement" ne
-- montrera JAMAIS (statut non cloture ou vente annulee). Elles gonflent le
-- solde du client sans pouvoir etre reglees.
--   * anomalie = 'COPIE MODIFICATION DE VENTE' : ligne creee par la fonction
--     "modifier une vente cloturee" et restee orpheline (modification jamais
--     finalisee) => dette comptee en double.
--   * anomalie = 'VENTE ANNULEE' : le reste n'a pas ete remis a zero lors de
--     l'annulation.
-- ============================================================================
SELECT CONCAT(cl.str_FIRST_NAME, ' ', cl.str_LAST_NAME)       AS client,
       o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID                AS ligne_dette_id,
       p.str_REF                                              AS ref_vente,
       o.str_STATUT                                           AS statut_ligne,
       p.b_IS_CANCEL                                          AS vente_annulee,
       p.lg_PARENT_ID                                         AS vente_parente_id,
       o.int_PRICE                                            AS montant_differe,
       o.int_PRICE_RESTE                                      AS reste,
       o.dt_CREATED                                           AS creee_le,
       o.dt_UPDATED                                           AS modifiee_le,
       CASE
           WHEN o.str_STATUT = 'is_Process' THEN 'COPIE MODIFICATION DE VENTE'
           WHEN p.b_IS_CANCEL = 1           THEN 'VENTE ANNULEE'
           ELSE CONCAT('STATUT INATTENDU: ', o.str_STATUT)
       END                                                    AS anomalie
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE o.int_PRICE_RESTE > 0
  AND (o.str_STATUT <> 'is_Closed' OR p.b_IS_CANCEL = 1)
ORDER BY client, o.dt_UPDATED;


-- ============================================================================
-- SECTION 3 : DETTES EN DOUBLE (vente d'origine + sa copie, toutes deux dues)
-- ----------------------------------------------------------------------------
-- La modification d'une vente cloturee cree une copie de la vente et de sa
-- ligne de dette. Si l'original ET la copie ont un reste > 0, la dette est
-- comptee deux fois sur la fiche client.
-- ============================================================================
SELECT CONCAT(cl.str_FIRST_NAME, ' ', cl.str_LAST_NAME)       AS client,
       p1.str_REF                                             AS ref_vente_origine,
       o1.int_PRICE_RESTE                                     AS reste_origine,
       o1.str_STATUT                                          AS statut_origine,
       p2.str_REF                                             AS ref_vente_copie,
       o2.int_PRICE_RESTE                                     AS reste_copie,
       o2.str_STATUT                                          AS statut_copie,
       o2.dt_CREATED                                          AS copie_creee_le
FROM t_preenregistrement p1
JOIN t_preenregistrement_compte_client o1 ON o1.lg_PREENREGISTREMENT_ID = p1.lg_PREENREGISTREMENT_ID
JOIN t_preenregistrement p2 ON p2.lg_PARENT_ID = p1.lg_PREENREGISTREMENT_ID
JOIN t_preenregistrement_compte_client o2 ON o2.lg_PREENREGISTREMENT_ID = p2.lg_PREENREGISTREMENT_ID
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o1.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
WHERE o1.int_PRICE_RESTE > 0
  AND o2.int_PRICE_RESTE > 0;


-- ============================================================================
-- SECTION 4 : CLIENTS AVEC PLUSIEURS COMPTES CLIENTS
-- ----------------------------------------------------------------------------
-- Le reglement global choisit UN compte du client de facon arbitraire
-- (requete sans ORDER BY, premier resultat). Si un client a plusieurs
-- comptes, les dettes des autres comptes ne sont jamais soldees alors que
-- l'encaissement, lui, est total => symptome exact du bug signale.
-- ============================================================================
SELECT cl.lg_CLIENT_ID                                        AS client_id,
       CONCAT(cl.str_FIRST_NAME, ' ', cl.str_LAST_NAME)       AS client,
       COUNT(*)                                               AS nb_comptes,
       SUM(CASE WHEN cp.str_STATUT = 'enable' THEN 1 ELSE 0 END) AS nb_comptes_actifs,
       GROUP_CONCAT(cp.lg_COMPTE_CLIENT_ID)                   AS comptes
FROM t_compte_client cp
JOIN t_client cl ON cl.lg_CLIENT_ID = cp.lg_CLIENT_ID
GROUP BY cl.lg_CLIENT_ID, client
HAVING COUNT(*) > 1;


-- ============================================================================
-- SECTION 5 : PAIEMENTS ENCAISSES MAIS NON IMPUTES (ou l'inverse)
-- ----------------------------------------------------------------------------
-- Pour chaque dossier de reglement de differe, compare le montant paye
-- (d.dbl_AMOUNT) a la somme reellement repartie sur les dettes
-- (somme des details).
--   * reliquat > 0 : de l'argent a ete encaisse mais n'a diminue aucune
--     dette (reliquat silencieux de la distribution, ou differes hors de la
--     fenetre de dates au moment du reglement) => LE client paye mais doit
--     encore. C'est la requete la plus importante pour votre probleme.
--   * reliquat < 0 : des dettes ont ete soldees pour plus que le montant
--     encaisse (reglement global qui remet tout a zero sans controle).
-- ============================================================================
SELECT t.*
FROM (
    SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
           d.str_ORGANISME_ID                                     AS client_id,
           CONCAT(cl.str_FIRST_NAME, ' ', cl.str_LAST_NAME)       AS client,
           d.dt_REGLEMENT                                         AS date_reglement,
           d.dt_CREATED                                           AS enregistre_le,
           d.dbl_AMOUNT                                           AS montant_paye,
           COALESCE(SUM(dd.dbl_AMOUNT), 0)                        AS montant_impute_aux_dettes,
           d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT), 0)         AS reliquat
    FROM t_dossier_reglement d
    LEFT JOIN t_dossier_reglement_detail dd
           ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    LEFT JOIN t_client cl ON cl.lg_CLIENT_ID = d.str_ORGANISME_ID
    WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
    GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID, client,
             d.dt_REGLEMENT, d.dt_CREATED, d.dbl_AMOUNT
) t
WHERE t.reliquat <> 0
ORDER BY t.enregistre_le DESC;


-- ============================================================================
-- SECTION 6 : DETAILS DE REGLEMENT INCOHERENTS
-- ----------------------------------------------------------------------------
-- 6a. Details qui pointent vers une dette d'un AUTRE client que celui du
--     dossier (aucun controle d'appartenance dans le reglement selectif).
-- ============================================================================
SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
       d.str_ORGANISME_ID                                     AS client_du_dossier,
       cl2.lg_CLIENT_ID                                       AS client_de_la_dette,
       CONCAT(cl2.str_FIRST_NAME, ' ', cl2.str_LAST_NAME)     AS nom_client_de_la_dette,
       dd.dbl_AMOUNT                                          AS montant_impute,
       dd.dt_CREATED                                          AS date_imputation
FROM t_dossier_reglement d
JOIN t_dossier_reglement_detail dd
     ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
JOIN t_preenregistrement_compte_client o
     ON o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = dd.str_REF
JOIN t_compte_client cp2 ON cp2.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl2        ON cl2.lg_CLIENT_ID        = cp2.lg_CLIENT_ID
WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  AND cl2.lg_CLIENT_ID <> d.str_ORGANISME_ID;

-- ============================================================================
-- 6b. Details orphelins : la reference ne correspond a aucune ligne de dette.
-- ============================================================================
SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
       d.str_ORGANISME_ID                                     AS client_id,
       dd.str_REF                                             AS reference_introuvable,
       dd.dbl_AMOUNT                                          AS montant_impute,
       dd.dt_CREATED                                          AS date_imputation
FROM t_dossier_reglement d
JOIN t_dossier_reglement_detail dd
     ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client o
     ON o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = dd.str_REF
WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  AND o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID IS NULL;


-- ============================================================================
-- SECTION 7 : CAISSE vs DOSSIERS DE REGLEMENT
-- ----------------------------------------------------------------------------
-- Compare l'encaissement en caisse (MvtTransaction, type '2' = reglement de
-- differes) au dossier correspondant. Un ecart signifie que la trace de
-- caisse et la trace de reglement racontent deux histoires differentes.
-- ============================================================================
SELECT t.*
FROM (
    SELECT m.pkey                                                 AS dossier_id,
           m.organisme                                            AS client_id,
           m.mvtdate                                              AS date_mvt,
           m.montantRegle                                         AS encaisse_en_caisse,
           d.dbl_AMOUNT                                           AS montant_du_dossier,
           COALESCE(SUM(dd.dbl_AMOUNT), 0)                        AS montant_impute_aux_dettes
    FROM mvttransaction m
    LEFT JOIN t_dossier_reglement d
           ON d.lg_DOSSIER_REGLEMENT_ID = m.pkey
    LEFT JOIN t_dossier_reglement_detail dd
           ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    WHERE m.typeMvtCaisseId = '2'
    GROUP BY m.pkey, m.organisme, m.mvtdate, m.montantRegle, d.dbl_AMOUNT
) t
WHERE t.encaisse_en_caisse <> t.montant_impute_aux_dettes
   OR t.montant_du_dossier IS NULL
ORDER BY t.date_mvt DESC;


-- ============================================================================
-- SECTION 8 : FICHE COMPLETE D'UN CLIENT DONNE
-- ----------------------------------------------------------------------------
-- Pour investiguer le cas precis d'un client qui s'est plaint : remplacer
-- 'XXXX' par son lg_CLIENT_ID (visible en section 1) puis executer les deux
-- requetes. La premiere liste toutes ses lignes de dette, la seconde tous
-- ses reglements de differes avec leur repartition.
-- ============================================================================
-- 8a. Toutes les lignes de dette du client
SELECT o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID                AS ligne_dette_id,
       p.str_REF                                              AS ref_vente,
       o.str_STATUT                                           AS statut_ligne,
       p.b_IS_CANCEL                                          AS vente_annulee,
       o.int_PRICE                                            AS montant_differe,
       o.int_PRICE_RESTE                                      AS reste,
       o.dt_CREATED                                           AS creee_le,
       o.dt_UPDATED                                           AS derniere_maj
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE cp.lg_CLIENT_ID = 'XXXX'
ORDER BY o.dt_CREATED;

-- 8b. Tous les reglements de differes du client et leur repartition
SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
       d.dt_REGLEMENT                                         AS date_reglement,
       d.dt_CREATED                                           AS enregistre_le,
       d.dbl_AMOUNT                                           AS montant_paye,
       dd.str_REF                                             AS ligne_dette_reglee,
       dd.dbl_AMOUNT                                          AS montant_impute
FROM t_dossier_reglement d
LEFT JOIN t_dossier_reglement_detail dd
       ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  AND d.str_ORGANISME_ID = 'XXXX'
ORDER BY d.dt_CREATED, dd.dt_CREATED;
