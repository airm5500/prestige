-- REPRISE DES BONS TIERS PAYANT SANS « RESTE DU » (retour de recette CA-09, 28/10/2026)
--
-- Cause, corrigee dans l'application : la modification du tiers payant d'une vente terminee (« Ventes terminees »
-- > « Modifier info client ») recreait le bon avec un reste du vide (int_PRICE_RESTE NULL). Ce bon :
--   - n'entrait pas dans l'encours de l'ecran « Tiers-payants » (somme des restes) ;
--   - etait ecarte du reglement des factures.
--
-- Execution MANUELLE, hors application, par une personne habilitee, base par base, apres sauvegarde. Le script ne
-- touche que les bons dont int_PRICE_RESTE est NULL :
--   1. bon facture (« charged ») : reste du = reste de sa ligne de facture (t_facture_detail.dbl_MONTANT_RESTANT),
--      la regle suivie par tous les autres bons factures ;
--   2. bon non facture (« unpaid ») d'une vente valide : reste du = part du tiers payant (int_PRICE) ;
--   3. bon d'une vente annulee : reste du = 0, comme a l'annulation.
-- Sur la copie laborex_v1_db du 28/10 : 872, 179 et 15 bons.
--
-- Mode d'emploi : lancer d'abord la partie « 0. Constat » seule ; puis tout le script. La transaction ne se valide
-- que par le COMMIT final : en cas de doute sur les chiffres de la partie 4, remplacer COMMIT par ROLLBACK.

-- 0. Constat (lecture seule)
SELECT CASE WHEN v.b_IS_CANCEL = 1 OR p.str_STATUT = 'delete' THEN '3. vente annulee'
            WHEN p.str_STATUT_FACTURE = 'charged' THEN '1. facture'
            ELSE '2. non facture' END AS cas,
       COUNT(*) AS bons, SUM(p.int_PRICE) AS parts
FROM t_preenregistrement_compte_client_tiers_payent p
JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.int_PRICE_RESTE IS NULL
GROUP BY cas ORDER BY cas;

START TRANSACTION;

-- 1. bons factures : reste de la ligne de facture
UPDATE t_preenregistrement_compte_client_tiers_payent p
JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
JOIN t_facture_detail d ON d.str_REF = p.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID
SET p.int_PRICE_RESTE = ROUND(COALESCE(d.dbl_MONTANT_RESTANT, p.int_PRICE))
WHERE p.int_PRICE_RESTE IS NULL AND p.str_STATUT_FACTURE = 'charged'
  AND v.b_IS_CANCEL = 0 AND p.str_STATUT <> 'delete';

-- 2. bons non factures d'une vente valide : toute la part reste due
UPDATE t_preenregistrement_compte_client_tiers_payent p
JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
SET p.int_PRICE_RESTE = COALESCE(p.int_PRICE, 0)
WHERE p.int_PRICE_RESTE IS NULL AND p.str_STATUT_FACTURE = 'unpaid'
  AND v.b_IS_CANCEL = 0 AND p.str_STATUT <> 'delete';

-- 3. bons d'une vente annulee : plus rien de du
UPDATE t_preenregistrement_compte_client_tiers_payent p
JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
SET p.int_PRICE_RESTE = 0
WHERE p.int_PRICE_RESTE IS NULL AND (v.b_IS_CANCEL = 1 OR p.str_STATUT = 'delete');

-- 4. Controle : doit afficher 0 bon restant (un bon « charged » sans ligne de facture resterait ici, a examiner)
SELECT COUNT(*) AS bons_encore_sans_reste, IFNULL(GROUP_CONCAT(DISTINCT p.str_STATUT_FACTURE), '-') AS statuts
FROM t_preenregistrement_compte_client_tiers_payent p
WHERE p.int_PRICE_RESTE IS NULL;

COMMIT;
