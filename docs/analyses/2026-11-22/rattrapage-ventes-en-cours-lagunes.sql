-- =====================================================================
-- Rattrapage des ventes encaissées remises à l'état « en cours » (Lagunes).
--
-- Défaut de l'ancienne version : le bouton « Terminer la prévente », cliqué sur une prévente déjà encaissée par la
-- caisse, réécrit l'en-tête de la vente : état is_Process et utilisateur du poste. Les lignes, le stock, le mouvement
-- de caisse et le règlement restent ceux de l'encaissement. La vente est alors dans la caisse, mais elle sort de la
-- balance et du chiffre d'affaires.
--
-- Principe du rattrapage : on remet l'en-tête dans l'état de l'encaissement, rien d'autre.
--   état        -> is_Closed
--   utilisateur -> celui que le mouvement de caisse a enregistré à l'encaissement
-- Les dates de la vente ne sont pas touchées : chaque vente revient dans la balance de son jour d'origine.
--
-- Sont exclues, et seulement listées : les ventes où des produits ont été ajoutés après l'encaissement (lignes encore
-- is_Process, montant de la vente différent du montant encaissé). Elles demandent une décision au cas par cas.
--
-- À EXÉCUTER : une seule fois, Prestige arrêté, après une sauvegarde.
-- La création de la table de trace échoue si le script a déjà été joué : c'est voulu.
-- Tant que Prestige n'est pas mis à jour, le défaut peut se reproduire : rejouer alors le script sous un autre nom
-- de table de trace.
-- =====================================================================

-- 1. Table de trace : une ligne par vente encaissée dont l'en-tête est resté « en cours ».
CREATE TABLE rattrapage_ventes_en_cours_20261122 (
    lg_PREENREGISTREMENT_ID VARCHAR(40) NOT NULL PRIMARY KEY,
    reference               VARCHAR(100) NULL,
    jour_vente              DATE NULL,
    montant_vente           INT NOT NULL,
    montant_encaisse        INT NOT NULL,
    statut_avant            VARCHAR(20) NULL,
    utilisateur_avant       VARCHAR(40) NULL,
    utilisateur_encaissement VARCHAR(40) NOT NULL,
    lignes_non_cloturees    INT NOT NULL,
    exclu                   VARCHAR(80) NULL,
    dt_rattrapage           DATETIME NOT NULL
);

INSERT INTO rattrapage_ventes_en_cours_20261122
SELECT p.lg_PREENREGISTREMENT_ID, p.str_REF, DATE(p.dt_UPDATED), p.int_PRICE, m.montant, p.str_STATUT, p.lg_USER_ID,
       m.lg_USER_ID,
       (SELECT COUNT(*) FROM t_preenregistrement_detail d
        WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND d.str_STATUT <> 'is_Closed'),
       NULL, NOW()
FROM t_preenregistrement p
JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID AND m.typeTransaction IN (0, 1)
WHERE p.str_STATUT = 'is_Process'
  AND p.b_IS_CANCEL = 0
  AND EXISTS (SELECT 1 FROM vente_reglement vr WHERE vr.vente_id = p.lg_PREENREGISTREMENT_ID)
  AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d
              WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND d.str_STATUT = 'is_Closed');

UPDATE rattrapage_ventes_en_cours_20261122
SET exclu = 'produits ajoutes apres l''encaissement'
WHERE lignes_non_cloturees > 0 OR montant_vente <> montant_encaisse;

-- 2. Contrôle avant écriture (sur la copie du 21/11 : 22 ventes, 17 à corriger, 5 exclues).
SELECT COUNT(*) AS ventes, SUM(exclu IS NULL) AS a_corriger, SUM(exclu IS NOT NULL) AS exclues,
       SUM(IF(exclu IS NULL, montant_encaisse, 0)) AS montant_rendu_a_la_balance
FROM rattrapage_ventes_en_cours_20261122;

START TRANSACTION;

-- 3. En-tête remis dans l'état de l'encaissement. Les dates ne sont pas modifiées.
UPDATE t_preenregistrement p
JOIN rattrapage_ventes_en_cours_20261122 r ON r.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
SET p.str_STATUT = 'is_Closed',
    p.lg_USER_ID = r.utilisateur_encaissement
WHERE r.exclu IS NULL AND p.str_STATUT = 'is_Process';

COMMIT;

-- 4. Contrôle après écriture : « restees_en_cours » doit valoir 0.
SELECT COUNT(*) AS corrigees, SUM(p.str_STATUT <> 'is_Closed') AS restees_en_cours
FROM rattrapage_ventes_en_cours_20261122 r
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = r.lg_PREENREGISTREMENT_ID
WHERE r.exclu IS NULL;

-- 5. Ventes corrigées, par jour : la balance de chacun de ces jours augmente du montant indiqué.
SELECT jour_vente, COUNT(*) AS ventes, SUM(montant_encaisse) AS montant
FROM rattrapage_ventes_en_cours_20261122 WHERE exclu IS NULL GROUP BY jour_vente ORDER BY jour_vente;

-- 6. Ventes exclues, à traiter au cas par cas.
SELECT reference, jour_vente, montant_vente, montant_encaisse, montant_vente - montant_encaisse AS non_encaisse,
       lignes_non_cloturees
FROM rattrapage_ventes_en_cours_20261122 WHERE exclu IS NOT NULL ORDER BY jour_vente;

-- Retour arrière, si besoin :
--   UPDATE t_preenregistrement p JOIN rattrapage_ventes_en_cours_20261122 r
--     ON r.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
--   SET p.str_STATUT = r.statut_avant, p.lg_USER_ID = r.utilisateur_avant WHERE r.exclu IS NULL;
--   DROP TABLE rattrapage_ventes_en_cours_20261122;
