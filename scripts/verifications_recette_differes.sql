-- ============================================================================
-- REQUETES DE VERIFICATION DU CAHIER DE RECETTE — GESTION DES DIFFERES
-- ============================================================================
-- Dialecte : MySQL / MariaDB. Requetes en LECTURE SEULE (aucune modification).
--
-- MODE D'EMPLOI
--   Avant de derouler une fiche, renseigner les variables ci-dessous avec les
--   identifiants du client / dossier / vente concernes par le test, puis
--   executer la requete portant le meme numero (CR-xx) que la fiche.
--
--   Pour retrouver un identifiant : voir la section "HELPERS" en bas du fichier.
--
--   Les scripts de la rubrique F (CR-15/16/17) sont fournis a part :
--     - scripts/diagnostic_differes.sql
--     - scripts/reparation_differes.sql
-- ============================================================================

-- ------- VARIABLES A RENSEIGNER (remplacer les valeurs) ---------------------
SET @CLIENT_ID   = 'REMPLACER_PAR_LG_CLIENT_ID';         -- client de test
SET @DOSSIER_ID  = 'REMPLACER_PAR_LG_DOSSIER_REGLEMENT'; -- un reglement precis
SET @VENTE_REF   = 'REMPLACER_PAR_STR_REF_VENTE';        -- reference d'une vente (ex: 260112_00140)


-- ============================================================================
-- REQUETE PIVOT : SOLDE REEL D'UN CLIENT (sert a CR-01,02,03,04,07,10,11,12)
-- ----------------------------------------------------------------------------
-- Le solde reglable = somme des restes positifs, sur differes clotures de
-- ventes non annulees. C'est le montant qui doit s'afficher partout.
-- ============================================================================
SELECT CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)                       AS client,
       COALESCE(SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                          AND o.int_PRICE_RESTE>0 THEN o.int_PRICE_RESTE ELSE 0 END),0) AS solde_reglable,
       COALESCE(SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                         THEN o.int_PRICE_RESTE ELSE 0 END),0)              AS solde_net_avec_avoirs,
       COUNT(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                   AND o.int_PRICE_RESTE>0 THEN 1 END)                      AS nb_differes_ouverts
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE cl.lg_CLIENT_ID = @CLIENT_ID;


-- ============================================================================
-- CR-01 / CR-02 — Reglement selectif : dossiers soldes + montant encaisse
-- ----------------------------------------------------------------------------
-- 1) Les dossiers du dernier reglement du client et le montant impute a chacun.
--    Apres CR-01 : 3 lignes a 1000, chaque dossier passe a reste 0.
-- ============================================================================
SELECT d.lg_DOSSIER_REGLEMENT_ID          AS dossier_id,
       d.dt_CREATED                       AS enregistre_le,
       d.dbl_AMOUNT                       AS montant_reglement,
       dd.str_REF                         AS ligne_differe,
       dd.dbl_AMOUNT                       AS montant_impute,
       o.int_PRICE_RESTE                  AS reste_apres
FROM t_dossier_reglement d
JOIN t_dossier_reglement_detail dd ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client o
       ON o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = dd.str_REF
WHERE d.str_NATURE_DOSSIER='DIFFERE' AND d.str_ORGANISME_ID = @CLIENT_ID
  AND d.dt_CREATED = (SELECT MAX(d2.dt_CREATED) FROM t_dossier_reglement d2
                      WHERE d2.str_NATURE_DOSSIER='DIFFERE' AND d2.str_ORGANISME_ID = @CLIENT_ID)
ORDER BY dd.dt_CREATED;

-- CR-02 (point cle) : le mouvement de caisse encaisse le MONTANT REGLE, pas le
-- montant recu. Doit valoir 3000 (et non 5000). montant_impute total = montant_regle.
SELECT m.pkey                    AS dossier_id,
       m.mvtdate                 AS date_mvt,
       m.montantRegle            AS encaisse_en_caisse,
       d.dbl_AMOUNT              AS montant_dossier,
       COALESCE(SUM(dd.dbl_AMOUNT),0) AS total_impute
FROM mvttransaction m
JOIN t_dossier_reglement d ON d.lg_DOSSIER_REGLEMENT_ID = m.pkey
LEFT JOIN t_dossier_reglement_detail dd ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
WHERE m.typeMvtCaisseId='2' AND d.str_ORGANISME_ID = @CLIENT_ID
GROUP BY m.pkey, m.mvtdate, m.montantRegle, d.dbl_AMOUNT
ORDER BY m.mvtdate DESC
LIMIT 5;


-- ============================================================================
-- CR-04 — Reglement partiel : la distribution respecte le montant paye
-- ----------------------------------------------------------------------------
-- Pour le dernier dossier du client : total impute = montant du dossier, et le
-- dossier le plus ancien de la selection est solde avant les suivants.
-- ============================================================================
SELECT d.dbl_AMOUNT                        AS montant_paye,
       COALESCE(SUM(dd.dbl_AMOUNT),0)      AS total_impute,
       d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT),0) AS reliquat_doit_etre_0
FROM t_dossier_reglement d
LEFT JOIN t_dossier_reglement_detail dd ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
WHERE d.lg_DOSSIER_REGLEMENT_ID = @DOSSIER_ID
GROUP BY d.dbl_AMOUNT;


-- ============================================================================
-- CR-07 / CR-08 — Reglement global : total reel des differes de la periode
-- ----------------------------------------------------------------------------
-- Le "total reel" que le serveur recalcule (et compare au montant saisi).
-- Adapter les dates a la periode affichee a l'ecran.
-- ============================================================================
SET @DATE_DEBUT = '2015-01-01';
SET @DATE_FIN   = CURDATE();
SELECT COUNT(*)                       AS nb_differes,
       COALESCE(SUM(o.int_PRICE_RESTE),0) AS total_reel_a_regler
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE cp.lg_CLIENT_ID = @CLIENT_ID
  AND o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND o.int_PRICE_RESTE>0
  AND DATE(o.dt_UPDATED) BETWEEN @DATE_DEBUT AND @DATE_FIN;


-- ============================================================================
-- CR-09 — Une vente annulee n'apparait pas dans les differes a regler
-- ----------------------------------------------------------------------------
-- Doit renvoyer 0 ligne : aucune vente annulee avec un reste > 0.
-- ============================================================================
SELECT p.str_REF, o.int_PRICE_RESTE, p.b_IS_CANCEL, o.str_STATUT
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE cp.lg_CLIENT_ID = @CLIENT_ID AND p.b_IS_CANCEL = 1 AND o.int_PRICE_RESTE > 0;


-- ============================================================================
-- CR-10 / CR-11 — Annulation : aucune dette fantome ne subsiste
-- ----------------------------------------------------------------------------
-- Detail des lignes de la vente annulee : apres annulation, str_STATUT='delete'
-- et int_PRICE_RESTE=0. Renseigner @VENTE_REF avec la vente annulee.
-- ============================================================================
SELECT p.str_REF, p.b_IS_CANCEL AS annulee, o.str_STATUT, o.int_PRICE AS differe, o.int_PRICE_RESTE AS reste
FROM t_preenregistrement p
JOIN t_preenregistrement_compte_client o ON o.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.str_REF = @VENTE_REF;


-- ============================================================================
-- CR-12 — Coherence des soldes : les 4 modes de calcul cote a cote
-- ----------------------------------------------------------------------------
-- Les 4 colonnes doivent etre EGALES pour le client teste.
--   fiche_client       = ce qu'affiche la liste des clients (getDiffere corrige)
--   ecran_reglement    = ce que montre "Faire un reglement"
--   onglet_liste_diff  = total reste a payer de l'onglet "Liste des differes"
--   historique_solde   = solde affiche dans l'historique des reglements
-- ============================================================================
SELECT
  COALESCE(SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                    THEN o.int_PRICE_RESTE ELSE 0 END),0)                       AS fiche_client,
  COALESCE(SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                     AND o.int_PRICE_RESTE>0 THEN o.int_PRICE_RESTE ELSE 0 END),0) AS ecran_reglement,
  COALESCE(SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                     AND o.int_PRICE_RESTE>0 THEN o.int_PRICE_RESTE ELSE 0 END),0) AS onglet_liste_diff,
  COALESCE(SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
                    THEN o.int_PRICE_RESTE ELSE 0 END),0)                       AS historique_solde
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE cp.lg_CLIENT_ID = @CLIENT_ID;


-- ============================================================================
-- CR-13 / CR-14 — Onglet "Differes regles" : dossiers entierement soldes
-- ----------------------------------------------------------------------------
-- Reproduit ce que renvoie l'endpoint v1/reglement/liste-regles : reste=0,
-- vente cloturee non annulee, montant differe positif, sur la periode.
-- Un differe PARTIELLEMENT regle (reste>0) ne doit PAS apparaitre.
-- ============================================================================
SET @DATE_DEBUT = CURDATE();
SET @DATE_FIN   = CURDATE();
SELECT p.str_REF                                            AS reference,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)       AS client,
       (p.int_PRICE - p.int_PRICE_REMISE)                   AS montant_total_vente,
       o.int_PRICE                                          AS montant_paye,
       DATE(o.dt_UPDATED)                                   AS date_solde,
       TIME(o.dt_UPDATED)                                   AS heure
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0
  AND o.int_PRICE_RESTE=0 AND o.int_PRICE>0
  AND DATE(o.dt_UPDATED) BETWEEN @DATE_DEBUT AND @DATE_FIN
  AND (@CLIENT_ID = 'REMPLACER_PAR_LG_CLIENT_ID' OR cl.lg_CLIENT_ID = @CLIENT_ID)
ORDER BY o.dt_UPDATED DESC;


-- ============================================================================
-- CR-15 / CR-16 / CR-17 — Reparation des donnees (rubrique F)
-- ----------------------------------------------------------------------------
-- Executer d'abord scripts/diagnostic_differes.sql, puis
-- scripts/reparation_differes.sql. Ensuite, controler le rapport :
-- ============================================================================
-- Bilan du rapport de reparation
SELECT section, COUNT(*) AS nb, SUM(montant) AS total
FROM reparation_differes_rapport GROUP BY section;

-- Detail des montants a arbitrer manuellement (paiements d'avance et dettes effacees)
SELECT section, reference AS dossier_id, client_id, montant, commentaire
FROM reparation_differes_rapport
WHERE commentaire LIKE 'NON RE-IMPUTABLE%' OR section='S3'
ORDER BY section, montant DESC;

-- CR-16 : contre-diagnostic. Doit renvoyer 0 (plus aucune dette fantome).
SELECT COUNT(*) AS dettes_fantomes
FROM t_preenregistrement_compte_client o
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE o.int_PRICE_RESTE>0 AND p.b_IS_CANCEL=1;


-- ============================================================================
-- CR-18 — Vente differee standard : dette = montant differe, jamais negative
-- ----------------------------------------------------------------------------
-- Renseigner @VENTE_REF. La dette (int_PRICE_RESTE) ne doit jamais etre < 0
-- sur un differe positif.
-- ============================================================================
SELECT p.str_REF, o.int_PRICE AS montant_differe, o.int_PRICE_RESTE AS reste,
       CASE WHEN o.int_PRICE>0 AND o.int_PRICE_RESTE<0 THEN 'ANOMALIE: reste negatif'
            ELSE 'OK' END AS controle
FROM t_preenregistrement p
JOIN t_preenregistrement_compte_client o ON o.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.str_REF = @VENTE_REF;

-- Controle global : aucun reste negatif sur un differe positif (doit valoir 0)
SELECT COUNT(*) AS restes_negatifs_anormaux
FROM t_preenregistrement_compte_client
WHERE int_PRICE > 0 AND int_PRICE_RESTE < 0;


-- ============================================================================
-- CR-19 — Ticket et historique : coherence attendu / regle / restant
-- ----------------------------------------------------------------------------
-- Pour les reglements differes du client : montant attendu (solde avant),
-- montant regle et restant. montant_regle doit correspondre a l'encaisse reel.
-- ============================================================================
SELECT d.lg_DOSSIER_REGLEMENT_ID AS dossier_id, d.dt_CREATED AS le,
       d.dbl_MONTANT_ATTENDU     AS montant_attendu,
       d.dbl_AMOUNT              AS montant_regle,
       m.montantRegle            AS encaisse_caisse,
       m.montantRestant          AS restant_caisse
FROM t_dossier_reglement d
LEFT JOIN mvttransaction m ON m.pkey = d.lg_DOSSIER_REGLEMENT_ID AND m.typeMvtCaisseId='2'
WHERE d.str_NATURE_DOSSIER='DIFFERE' AND d.str_ORGANISME_ID = @CLIENT_ID
ORDER BY d.dt_CREATED DESC
LIMIT 10;


-- ============================================================================
-- CR-21 — Vente differee avec 2 modes de reglement
-- ----------------------------------------------------------------------------
-- La dette differee creee = part differee de la vente, sans double comptage
-- ni reste negatif. Renseigner @VENTE_REF avec la vente concernee.
-- ============================================================================
SELECT p.str_REF,
       p.int_PRICE            AS prix_vente,
       p.int_CUST_PART        AS part_client,
       p.int_PRICE_REMISE     AS remise,
       o.int_PRICE            AS differe_cree,
       o.int_PRICE_RESTE      AS reste,
       COUNT(*) OVER (PARTITION BY p.lg_PREENREGISTREMENT_ID) AS nb_lignes_differe
FROM t_preenregistrement p
JOIN t_preenregistrement_compte_client o ON o.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.str_REF = @VENTE_REF;


-- ============================================================================
-- HELPERS — retrouver les identifiants a mettre dans les variables
-- ============================================================================
-- Trouver le lg_CLIENT_ID par nom
SELECT lg_CLIENT_ID, CONCAT(str_FIRST_NAME,' ',str_LAST_NAME) AS client, str_CODE_INTERNE
FROM t_client
WHERE CONCAT(str_FIRST_NAME,' ',str_LAST_NAME) LIKE '%CLIENT RECETTE%';

-- Derniers reglements differes (pour recuperer un lg_DOSSIER_REGLEMENT_ID)
SELECT d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID AS client_id, d.dt_CREATED, d.dbl_AMOUNT
FROM t_dossier_reglement d
WHERE d.str_NATURE_DOSSIER='DIFFERE'
ORDER BY d.dt_CREATED DESC
LIMIT 20;

-- Dernieres ventes differees d'un client (pour recuperer une str_REF)
SELECT p.str_REF, p.dt_CREATED, p.int_PRICE, p.b_IS_CANCEL, o.int_PRICE_RESTE
FROM t_preenregistrement p
JOIN t_preenregistrement_compte_client o ON o.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
WHERE cp.lg_CLIENT_ID = @CLIENT_ID
ORDER BY p.dt_CREATED DESC
LIMIT 20;
