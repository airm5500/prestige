-- =============================================================================
-- REPRODUCTION du probleme "Stock = 204" sur la FICHE DES MOUVEMENTS DE L'ARTICLE
-- =============================================================================
-- A jouer sur une base de TEST uniquement (jamais la production).
--
-- Contexte : un produit detail (vendu a l'unite) dont la vente declenche un
-- deconditionnement automatique d'une boite. Le bug d'ecriture (corrige dans
-- MvtProduitServiceImpl / MouvementProduitImpl) historisait la ligne de
-- deconditionnement (typeMvt='05') avec un qteDebut et un qteFinale gonfles du
-- nombre de details deconditionnes : au lieu de 4 -> 104, la ligne portait
-- 104 -> 204. Comme la fiche des mouvements recopie la qteFinale du dernier
-- mouvement du jour et que la ligne decon partage l'horodatage (a la seconde)
-- de la vente qui la declenche, le rapport pouvait afficher 204 au lieu de 99.
--
-- Adapter les 3 variables ci-dessous a un produit detail reel de la base de test.
-- =============================================================================

SET @fam   = '050404522400544';           -- lg_FAMILLE_ID du produit DETAIL
SET @empl  = '1';                          -- lg_EMPLACEMENT_ID (officine)
SET @usr   = '14111218823703825750';       -- lg_USER_ID d'un operateur existant

-- Repartir propre sur la periode de demonstration
DELETE FROM hmvtproduit
 WHERE lg_FAMILLE_ID = @fam
   AND mvtdate IN ('2026-08-19','2026-08-20','2026-08-21');

-- Journee du 19 : une vente banale, stock 18 -> 11
INSERT INTO hmvtproduit
  (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug)
VALUES
  ('REPRO-204-19-V1', b'1', '2026-08-19 10:00:00', '2026-08-19', 'REPRO', 100, 200, 18, 11, 7, 0, @empl, @fam, @usr, '02', 0);

-- Journee du 20 : vente de 7 (11 -> 4), puis vente de 5 qui declenche le
-- deconditionnement automatique d'une boite de 100 details. La ligne decon est
-- ecrite CORROMPUE, comme sur l'installation client : qteDebut 104 (au lieu de 4),
-- qteFinale 204 (au lieu de 104). Les deux mouvements de 18:42:07 partagent la
-- meme seconde.
INSERT INTO hmvtproduit
  (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug)
VALUES
  ('REPRO-204-20-V1', b'1', '2026-08-20 09:12:33', '2026-08-20', 'REPRO', 100, 200, 11,   4,   7, 0, @empl, @fam, @usr, '02', 0),
  ('REPRO-204-20-D1', b'1', '2026-08-20 18:42:07', '2026-08-20', 'REPRO', 100, 200, 104, 204, 100, 0, @empl, @fam, @usr, '05', 0),
  ('REPRO-204-20-V2', b'1', '2026-08-20 18:42:07', '2026-08-20', 'REPRO', 100, 200, 4,   99,   5, 0, @empl, @fam, @usr, '02', 0);

-- Journee du 21 : la chaine reelle est bien repartie a 99 -> 92
INSERT INTO hmvtproduit
  (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug)
VALUES
  ('REPRO-204-21-V1', b'1', '2026-08-21 11:05:00', '2026-08-21', 'REPRO', 100, 200, 99, 92, 7, 0, @empl, @fam, @usr, '02', 0);

-- Verification : la ligne decon corrompue est visible (204), la chaine reelle donne 99
SELECT typeMvt, qteMvt, qteDebut, qteFinale, createdAt
  FROM hmvtproduit
 WHERE uuid LIKE 'REPRO-204-%'
 ORDER BY createdAt, typeMvt;

-- Attendu dans la FICHE DES MOUVEMENTS DE L'ARTICLE, periode 19->21/08/2026 :
--   * sur l'ancien WAR (sans le correctif de lecture) : le 20/08 pouvait afficher Stock = 204
--   * sur le WAR corrige : le 20/08 affiche Stock = 99 (la vente prime sur la ligne decon
--     a horodatage egal), chaine coherente 18 -> 11 -> 99 -> 92.
--
-- Pour NETTOYER apres la demonstration :
--   DELETE FROM hmvtproduit WHERE uuid LIKE 'REPRO-204-%';
