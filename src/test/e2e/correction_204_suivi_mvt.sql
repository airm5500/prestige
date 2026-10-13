-- =============================================================================
-- CORRECTION rejouable des lignes de deconditionnement gonflees (probleme "204")
-- =============================================================================
-- A jouer sur une base client APRES sauvegarde de la table hmvtproduit.
-- Idempotent : un second passage ne corrige plus rien.
--
-- Le correctif applicatif empeche de PRODUIRE de nouvelles lignes fausses et le
-- rapport neutralise deja l'affichage (la vente prime a horodatage egal). Ce
-- script remet en plus l'HISTORIQUE deja ecrit en base a sa vraie valeur, pour
-- les outils/exports qui liraient les lignes directement.
--
-- Signature du bug (100 % specifique, ne touche jamais un deconditionnement sain) :
--   une ligne decon positif (typeMvt='05') qui
--     - est interne-coherente : qteFinale = qteDebut + qteMvt (comme toute ligne),
--     - partage le createdAt (a la seconde) d'une VENTE (typeMvt='02') du meme
--       produit et du meme emplacement,
--     - dont le qteDebut vaut exactement le qteDebut de cette vente + qteMvt.
--   La correction retranche qteMvt au qteDebut ET au qteFinale de la ligne decon
--   (104 -> 4, 204 -> 104), ce qui restaure la vraie borne du deconditionnement.
--
-- Un deconditionnement MANUEL (sans vente a la meme seconde) ou une ligne deja
-- saine ne remplissent pas la condition de jointure : ils ne sont pas modifies.
-- =============================================================================

-- -------- 1) INVENTAIRE AVANT (aucune ecriture) : lignes qui seront corrigees ----------
SELECT d.uuid,
       d.lg_FAMILLE_ID,
       d.mvtdate,
       d.qteMvt,
       d.qteDebut  AS debut_actuel,
       d.qteFinale AS final_actuel,
       (d.qteDebut  - d.qteMvt) AS debut_corrige,
       (d.qteFinale - d.qteMvt) AS final_corrige
  FROM hmvtproduit d
  JOIN hmvtproduit v
    ON v.lg_FAMILLE_ID    = d.lg_FAMILLE_ID
   AND v.lg_EMPLACEMENT_ID = d.lg_EMPLACEMENT_ID
   AND v.createdAt        = d.createdAt
   AND v.typeMvt          = '02'
   AND v.qteDebut         = d.qteDebut - d.qteMvt
 WHERE d.typeMvt   = '05'
   AND d.qteFinale = d.qteDebut + d.qteMvt
 ORDER BY d.mvtdate, d.createdAt;

-- -------- 2) CORRECTION ---------------------------------------------------------------
-- (Decommenter apres avoir verifie l'inventaire ci-dessus et sauvegarde la table.)
--
-- UPDATE hmvtproduit d
--   JOIN hmvtproduit v
--     ON v.lg_FAMILLE_ID     = d.lg_FAMILLE_ID
--    AND v.lg_EMPLACEMENT_ID = d.lg_EMPLACEMENT_ID
--    AND v.createdAt         = d.createdAt
--    AND v.typeMvt           = '02'
--    AND v.qteDebut          = d.qteDebut - d.qteMvt
--    SET d.qteDebut  = d.qteDebut  - d.qteMvt,
--        d.qteFinale = d.qteFinale - d.qteMvt
--  WHERE d.typeMvt   = '05'
--    AND d.qteFinale = d.qteDebut + d.qteMvt;
--
-- SELECT ROW_COUNT() AS lignes_corrigees;

-- -------- 3) CONTROLE APRES : l'inventaire (etape 1) doit renvoyer 0 ligne -------------

-- =============================================================================
-- SUITE (13/10) : deux autres ecritures fausses de l'historique, corrigees dans
-- l'application le 13/10. A jouer APRES les etapes 1 a 3 ci-dessus, sur la meme
-- sauvegarde. Rejouable : un second passage ne corrige plus rien.
-- Le stock reel (t_famille_stock) n'est jamais modifie : seul l'historique l'est.
-- =============================================================================

-- -------- 4) VENTES apres deconditionnement automatique -----------------------------
-- Signature : une ligne de vente (02 comptoir, 12 vente au depot) incoherente
-- (qteDebut - qteMvt <> qteFinale) qui partage l'horodatage d'un deconditionnement
-- positif (05) du meme produit et emplacement, dont le stock final (avant ou apres
-- correction 204) vaut exactement qteFinale + qteMvt de la vente. La vente partait
-- du stock d'AVANT l'ouverture de la boite : son vrai stock avant est qteFinale + qteMvt.
-- Une vente incoherente pour une autre raison n'est pas touchee.

-- 4a) INVENTAIRE AVANT (aucune ecriture)
SELECT v.uuid, v.lg_FAMILLE_ID, v.mvtdate, v.typeMvt, v.qteDebut AS debut_actuel, v.qteMvt, v.qteFinale,
       (v.qteFinale + v.qteMvt) AS debut_corrige
  FROM hmvtproduit v
  JOIN hmvtproduit d
    ON d.lg_FAMILLE_ID     = v.lg_FAMILLE_ID
   AND d.lg_EMPLACEMENT_ID = v.lg_EMPLACEMENT_ID
   AND d.createdAt         = v.createdAt
   AND d.typeMvt           = '05'
 WHERE v.typeMvt IN ('02', '12')
   AND v.qteDebut <> v.qteFinale + v.qteMvt
   AND (d.qteFinale = v.qteFinale + v.qteMvt OR d.qteFinale - d.qteMvt = v.qteFinale + v.qteMvt)
 ORDER BY v.mvtdate, v.createdAt;

-- 4b) CORRECTION (decommenter apres verification de 4a et sauvegarde)
--
-- UPDATE hmvtproduit v
--   JOIN hmvtproduit d
--     ON d.lg_FAMILLE_ID     = v.lg_FAMILLE_ID
--    AND d.lg_EMPLACEMENT_ID = v.lg_EMPLACEMENT_ID
--    AND d.createdAt         = v.createdAt
--    AND d.typeMvt           = '05'
--    SET v.qteDebut = v.qteFinale + v.qteMvt
--  WHERE v.typeMvt IN ('02', '12')
--    AND v.qteDebut <> v.qteFinale + v.qteMvt
--    AND (d.qteFinale = v.qteFinale + v.qteMvt OR d.qteFinale - d.qteMvt = v.qteFinale + v.qteMvt);
--
-- SELECT ROW_COUNT() AS ventes_corrigees;

-- -------- 5) ENTREES EN STOCK DU DEPOT ecrites a l'envers ----------------------------
-- Signature : une entree en stock (01) d'un DEPOT (emplacement different de '1')
-- historisee en baisse (qteFinale = qteDebut - qteMvt). Une entree en stock fait
-- toujours monter le stock : le vrai stock apres est qteDebut + qteMvt.

-- 5a) INVENTAIRE AVANT (aucune ecriture)
SELECT uuid, lg_FAMILLE_ID, lg_EMPLACEMENT_ID, mvtdate, qteDebut, qteMvt, qteFinale AS final_actuel,
       (qteDebut + qteMvt) AS final_corrige
  FROM hmvtproduit
 WHERE typeMvt = '01'
   AND lg_EMPLACEMENT_ID <> '1'
   AND qteMvt > 0
   AND qteFinale = qteDebut - qteMvt
 ORDER BY mvtdate, createdAt;

-- 5b) CORRECTION (decommenter apres verification de 5a et sauvegarde)
--
-- UPDATE hmvtproduit
--    SET qteFinale = qteDebut + qteMvt
--  WHERE typeMvt = '01'
--    AND lg_EMPLACEMENT_ID <> '1'
--    AND qteMvt > 0
--    AND qteFinale = qteDebut - qteMvt;
--
-- SELECT ROW_COUNT() AS entrees_depot_corrigees;

-- -------- 6) CONTROLE APRES : les inventaires 4a et 5a doivent renvoyer 0 ligne -----------
