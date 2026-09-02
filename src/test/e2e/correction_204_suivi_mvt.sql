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
