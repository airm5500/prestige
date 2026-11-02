-- =====================================================================
-- Gestion de caisse G4 et G6 (notice MECANISMES_CODE_GESTION_CAISSE) : requetes de rapprochement, LECTURE SEULE.
-- A lancer sur la base de l'officine (ou sa copie) pour une journee : remplacer les deux dates de @jour.
-- Aucune ecriture. Aucune colonne nominative (clients, ayants droit) n'est lue.
-- =====================================================================

SET @jour := CURDATE();

-- ---------------------------------------------------------------------
-- 1. G4 : billetage et solde theorique, caisse par caisse (resumes ouverts le jour @jour).
--    solde_ventes : especes des ventes cloturees du caissier entre l'ouverture et la cloture (meme regle que
--    BilletageServiceImpl.SOLDE_SQL) ; solde_mvts : mouvements manuels (hors fond de caisse) ; ecart attendu : 0.
-- ---------------------------------------------------------------------
SELECT r.ld_CAISSE_ID, r.lg_USER_ID, r.str_STATUT, r.dt_CREATED AS ouverture, r.dt_UPDATED AS cloture,
       r.int_SOLDE_MATIN, r.int_SOLDE_SOIR,
       (SELECT COUNT(*) FROM t_billetage b WHERE b.ld_CAISSE_ID = r.ld_CAISSE_ID) AS nb_billetages,
       (SELECT SUM(b.int_AMOUNT) FROM t_billetage b WHERE b.ld_CAISSE_ID = r.ld_CAISSE_ID) AS billetage,
       IFNULL((SELECT SUM(v.montant) FROM vente_reglement v
                 JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = v.vente_id
                WHERE p.str_STATUT = 'is_Closed' AND p.lg_USER_CAISSIER_ID = r.lg_USER_ID
                  AND v.type_regelement = '1' AND p.dt_UPDATED BETWEEN r.dt_CREATED AND r.dt_UPDATED), 0) AS solde_ventes,
       IFNULL((SELECT SUM(m.int_AMOUNT) FROM t_mvt_caisse m
                 JOIN t_mode_reglement mr ON mr.lg_MODE_REGLEMENT_ID = m.lg_MODE_REGLEMENT_ID
                WHERE m.lg_USER_ID = r.lg_USER_ID AND mr.lg_TYPE_REGLEMENT_ID = '1'
                  AND m.lg_TYPE_MVT_CAISSE_ID <> '1' AND m.dt_CREATED BETWEEN r.dt_CREATED AND r.dt_UPDATED), 0) AS solde_mvts
  FROM t_resume_caisse r
 WHERE DATE(r.dt_CREATED) = @jour
 ORDER BY r.dt_CREATED;

-- ---------------------------------------------------------------------
-- 2. G1 (reprise) : resumes avec plusieurs billetages ; billetages dont le montant differe de la somme des coupures.
-- ---------------------------------------------------------------------
SELECT b.ld_CAISSE_ID, COUNT(*) AS nb_billetages, SUM(b.int_AMOUNT) AS total
  FROM t_billetage b GROUP BY b.ld_CAISSE_ID HAVING COUNT(*) > 1;

SELECT b.lg_BILLETAGE_ID, b.ld_CAISSE_ID, b.int_AMOUNT,
       d.int_NB_DIX_MIL * 10000 + d.int_NB_CINQ_MIL * 5000 + d.int_NB_DEUX_MIL * 2000 + d.int_NB_MIL * 1000
       + d.int_NB_CINQ_CENT * 500 + IFNULL(d.int_AUTRE, 0) AS somme_coupures
  FROM t_billetage b JOIN t_billetage_details d ON d.lg_BILLETAGE_ID = b.lg_BILLETAGE_ID
 WHERE b.int_AMOUNT <> d.int_NB_DIX_MIL * 10000 + d.int_NB_CINQ_MIL * 5000 + d.int_NB_DEUX_MIL * 2000
       + d.int_NB_MIL * 1000 + d.int_NB_CINQ_CENT * 500 + IFNULL(d.int_AUTRE, 0);

-- ---------------------------------------------------------------------
-- 3. G2 / G5 (reprise) : mouvements de caisse dont le signe contredit le type ; fonds de caisse <= 0.
--    (type '1' = fond de caisse ; type '4' = sortie de caisse, Constant.MVT_SORTIE_CAISSE, enregistree en negatif)
-- ---------------------------------------------------------------------
SELECT m.lg_MVT_CAISSE_ID, m.dt_CREATED, m.lg_TYPE_MVT_CAISSE_ID, t.str_DESCRIPTION, m.int_AMOUNT
  FROM t_mvt_caisse m JOIN t_type_mvt_caisse t ON t.lg_TYPE_MVT_CAISSE_ID = m.lg_TYPE_MVT_CAISSE_ID
 WHERE m.int_AMOUNT = 0
    OR (m.lg_TYPE_MVT_CAISSE_ID = '4' AND m.int_AMOUNT > 0)
    OR (m.lg_TYPE_MVT_CAISSE_ID <> '4' AND m.int_AMOUNT < 0)
 ORDER BY m.dt_CREATED DESC;

SELECT c.ID_COFFRE_CAISSE, c.lg_USER_ID, c.int_AMOUNT, c.dt_CREATED
  FROM t_coffre_caisse c WHERE c.int_AMOUNT <= 0 ORDER BY c.dt_CREATED DESC;

-- ---------------------------------------------------------------------
-- 4. G6 : recette et balance vente caisse, vente par vente (notice, requete de rapprochement) : chaque ligne dit
--    quelle composante est en ecart (montant ou date).
-- ---------------------------------------------------------------------
SELECT p.str_REF, r.int_AMOUNT AS recette, m.montantPaye, m.montantRegle, m.montantNet,
       m.mvtdate AS date_balance, DATE(r.dt_CREATED) AS date_recette,
       CASE WHEN r.int_AMOUNT <> m.montantPaye THEN 'montant' ELSE 'date' END AS ecart_sur
  FROM t_recettes r
  JOIN mvttransaction m      ON m.pkey = r.str_REF_FACTURE
  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = m.pkey
 WHERE (DATE(r.dt_CREATED) = @jour OR m.mvtdate = @jour)
   AND (r.int_AMOUNT <> m.montantPaye OR DATE(r.dt_CREATED) <> m.mvtdate)
 ORDER BY r.dt_CREATED DESC;

-- 5. G6 : totaux du jour, recette contre balance (montant paye) contre reglements especes ; ecarts attendus : 0.
SELECT @jour AS jour,
       (SELECT IFNULL(SUM(r.int_AMOUNT), 0) FROM t_recettes r WHERE DATE(r.dt_CREATED) = @jour) AS recette,
       (SELECT IFNULL(SUM(m.montantPaye), 0) FROM mvttransaction m
         WHERE m.mvtdate = @jour AND m.vente_id IS NOT NULL) AS balance_paye,
       (SELECT IFNULL(SUM(m.montantRegle), 0) FROM mvttransaction m
         WHERE m.mvtdate = @jour AND m.vente_id IS NOT NULL) AS balance_regle;
