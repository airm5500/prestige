-- ============================================================================
-- SCRIPT DE REPARATION DES DONNEES DE DIFFERES
-- ============================================================================
-- A executer APRES avoir applique les correctifs applicatifs de la branche
-- "differe", sinon les memes anomalies se recreeront.
--
-- IMPORTANT :
--   1. FAIRE UNE SAUVEGARDE COMPLETE avant toute execution :
--        mysqldump -u root -p VOTRE_BASE > sauvegarde_avant_reparation.sql
--   2. Executer les sections dans l'ordre.
--   3. Chaque section ecrit son rapport dans la table `reparation_differes_rapport`
--      (creee ci-dessous) : verifier ce rapport avant de passer a la suite.
--
-- Ce script repare :
--   S1. Les dettes fantomes : restes > 0 sur des ventes annulees.
--   S2. Les paiements encaisses mais jamais/partiellement imputes (reliquats
--       positifs) : re-imputation FIFO sur les differes encore ouverts du client.
--   S3. (rapport seulement) Les dettes effacees au-dela du montant paye :
--       aucune reparation automatique, liste a arbitrer au cas par cas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reparation_differes_rapport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dt DATETIME DEFAULT CURRENT_TIMESTAMP,
    section VARCHAR(10),
    reference VARCHAR(64),
    client_id VARCHAR(64),
    montant DECIMAL(15,3),
    commentaire VARCHAR(255)
);

-- ============================================================================
-- SECTION 1 : DETTES FANTOMES SUR VENTES ANNULEES
-- Le reste est remis a zero et la ligne passe en statut 'delete', comme le
-- fait desormais l'annulation de vente corrigee.
-- ============================================================================
INSERT INTO reparation_differes_rapport (section, reference, client_id, montant, commentaire)
SELECT 'S1', o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, cp.lg_CLIENT_ID, o.int_PRICE_RESTE,
       CONCAT('Reste sur vente annulee ', p.str_REF, ' remis a zero')
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE o.int_PRICE_RESTE > 0 AND p.b_IS_CANCEL = 1;

UPDATE t_preenregistrement_compte_client o
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
SET o.int_PRICE_RESTE = 0,
    o.str_STATUT = 'delete',
    o.dt_UPDATED = NOW()
WHERE o.int_PRICE_RESTE > 0 AND p.b_IS_CANCEL = 1;

-- ============================================================================
-- SECTION 2 : RE-IMPUTATION DES PAIEMENTS ORPHELINS (reliquats positifs)
-- Pour chaque dossier de reglement DIFFERE dont le montant paye depasse la
-- somme imputee, le reliquat est re-impute sur les differes encore ouverts
-- du client (les plus anciens d'abord), avec creation des lignes de detail
-- correspondantes. Si le client n'a plus assez de dettes ouvertes, le solde
-- non re-imputable est signale dans le rapport (argent encaisse d'avance :
-- a arbitrer -- avoir client ou remboursement).
-- ============================================================================
DROP PROCEDURE IF EXISTS proc_reparer_reliquats_differes;
DELIMITER $$
CREATE PROCEDURE proc_reparer_reliquats_differes()
BEGIN
    DECLARE fin_dossiers INT DEFAULT 0;
    DECLARE v_dossier VARCHAR(64);
    DECLARE v_client VARCHAR(64);
    DECLARE v_reliquat DECIMAL(15,3);

    DECLARE cur_dossiers CURSOR FOR
        SELECT d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID,
               d.dbl_AMOUNT - COALESCE((SELECT SUM(dd.dbl_AMOUNT)
                                        FROM t_dossier_reglement_detail dd
                                        WHERE dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID), 0) AS reliquat
        FROM t_dossier_reglement d
        WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
        HAVING reliquat > 0
        ORDER BY d.dt_CREATED;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin_dossiers = 1;

    OPEN cur_dossiers;
    boucle_dossiers: LOOP
        FETCH cur_dossiers INTO v_dossier, v_client, v_reliquat;
        IF fin_dossiers = 1 THEN
            LEAVE boucle_dossiers;
        END IF;

        BEGIN
            DECLARE fin_dettes INT DEFAULT 0;
            DECLARE v_ligne VARCHAR(64);
            DECLARE v_reste INT;
            DECLARE v_applique DECIMAL(15,3);

            DECLARE cur_dettes CURSOR FOR
                SELECT o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, o.int_PRICE_RESTE
                FROM t_preenregistrement_compte_client o
                JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
                JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
                WHERE cp.lg_CLIENT_ID = v_client
                  AND o.str_STATUT = 'is_Closed'
                  AND p.b_IS_CANCEL = 0
                  AND o.int_PRICE_RESTE > 0
                ORDER BY o.dt_CREATED;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin_dettes = 1;

            OPEN cur_dettes;
            boucle_dettes: LOOP
                IF v_reliquat <= 0 THEN
                    LEAVE boucle_dettes;
                END IF;
                FETCH cur_dettes INTO v_ligne, v_reste;
                IF fin_dettes = 1 THEN
                    LEAVE boucle_dettes;
                END IF;

                SET v_applique = LEAST(v_reliquat, v_reste);

                INSERT INTO t_dossier_reglement_detail
                    (lg_DOSSIER_REGLEMENT_DETAIL_ID, str_REF, dbl_AMOUNT, str_STATUT,
                     dt_CREATED, dt_UPDATED, lg_DOSSIER_REGLEMENT_ID)
                VALUES (UUID(), v_ligne, v_applique, 'is_Closed', NOW(), NOW(), v_dossier);

                UPDATE t_preenregistrement_compte_client
                SET int_PRICE_RESTE = int_PRICE_RESTE - v_applique,
                    dt_UPDATED = NOW()
                WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = v_ligne;

                INSERT INTO reparation_differes_rapport (section, reference, client_id, montant, commentaire)
                VALUES ('S2', v_dossier, v_client, v_applique,
                        CONCAT('Reliquat re-impute sur la dette ', v_ligne));

                SET v_reliquat = v_reliquat - v_applique;
            END LOOP;
            CLOSE cur_dettes;

            IF v_reliquat > 0 THEN
                INSERT INTO reparation_differes_rapport (section, reference, client_id, montant, commentaire)
                VALUES ('S2', v_dossier, v_client, v_reliquat,
                        'NON RE-IMPUTABLE: plus de dettes ouvertes pour ce client. A arbitrer (avoir ou remboursement)');
            END IF;
        END;
    END LOOP;
    CLOSE cur_dossiers;
END$$
DELIMITER ;

CALL proc_reparer_reliquats_differes();
DROP PROCEDURE IF EXISTS proc_reparer_reliquats_differes;

-- ============================================================================
-- SECTION 3 : DETTES EFFACEES AU-DELA DU MONTANT PAYE (rapport seulement)
-- Ces dossiers ont solde plus de dettes que d'argent encaisse. Recreer la
-- dette automatiquement penaliserait des clients qu'on a informes qu'ils
-- etaient a jour : la liste est fournie pour arbitrage manuel.
-- ============================================================================
INSERT INTO reparation_differes_rapport (section, reference, client_id, montant, commentaire)
SELECT 'S3', t.dossier_id, t.client_id, -t.reliquat,
       'Dette effacee au-dela du montant paye. Arbitrage manuel requis'
FROM (
    SELECT d.lg_DOSSIER_REGLEMENT_ID AS dossier_id, d.str_ORGANISME_ID AS client_id,
           d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT), 0) AS reliquat
    FROM t_dossier_reglement d
    LEFT JOIN t_dossier_reglement_detail dd ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
    GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID, d.dbl_AMOUNT
) t
WHERE t.reliquat < 0;

-- ============================================================================
-- SECTION 4 : CONSOMMATION DES AVOIRS (restes negatifs)
-- Certaines lignes portent un reste negatif (avoir du client : retour de
-- produits, trop-percu d'arrondi). Aucun ecran de reglement ne les affiche,
-- mais elles faussent le solde net. Chaque avoir est impute sur les dettes
-- ouvertes les plus anciennes du client. S'il ne doit plus rien, l'avoir est
-- conserve tel quel et signale dans le rapport.
-- ============================================================================
DROP PROCEDURE IF EXISTS proc_consommer_avoirs_differes;
DELIMITER $$
CREATE PROCEDURE proc_consommer_avoirs_differes()
BEGIN
    DECLARE fin_avoirs INT DEFAULT 0;
    DECLARE v_avoir_id VARCHAR(64);
    DECLARE v_client VARCHAR(64);
    DECLARE v_credit DECIMAL(15,3);

    DECLARE cur_avoirs CURSOR FOR
        SELECT o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, cp.lg_CLIENT_ID, -o.int_PRICE_RESTE
        FROM t_preenregistrement_compte_client o
        JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
        JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
        WHERE o.int_PRICE_RESTE < 0 AND o.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0
        ORDER BY o.dt_CREATED;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin_avoirs = 1;

    OPEN cur_avoirs;
    boucle_avoirs: LOOP
        FETCH cur_avoirs INTO v_avoir_id, v_client, v_credit;
        IF fin_avoirs = 1 THEN
            LEAVE boucle_avoirs;
        END IF;

        BEGIN
            DECLARE fin_dettes INT DEFAULT 0;
            DECLARE v_ligne VARCHAR(64);
            DECLARE v_reste INT;
            DECLARE v_applique DECIMAL(15,3);

            DECLARE cur_dettes CURSOR FOR
                SELECT o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, o.int_PRICE_RESTE
                FROM t_preenregistrement_compte_client o
                JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
                JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
                WHERE cp.lg_CLIENT_ID = v_client
                  AND o.str_STATUT = 'is_Closed'
                  AND p.b_IS_CANCEL = 0
                  AND o.int_PRICE_RESTE > 0
                ORDER BY o.dt_CREATED;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin_dettes = 1;

            OPEN cur_dettes;
            boucle_dettes: LOOP
                IF v_credit <= 0 THEN
                    LEAVE boucle_dettes;
                END IF;
                FETCH cur_dettes INTO v_ligne, v_reste;
                IF fin_dettes = 1 THEN
                    LEAVE boucle_dettes;
                END IF;

                SET v_applique = LEAST(v_credit, v_reste);

                UPDATE t_preenregistrement_compte_client
                SET int_PRICE_RESTE = int_PRICE_RESTE - v_applique, dt_UPDATED = NOW()
                WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = v_ligne;

                UPDATE t_preenregistrement_compte_client
                SET int_PRICE_RESTE = int_PRICE_RESTE + v_applique, dt_UPDATED = NOW()
                WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = v_avoir_id;

                INSERT INTO reparation_differes_rapport (section, reference, client_id, montant, commentaire)
                VALUES ('S4', v_avoir_id, v_client, v_applique,
                        CONCAT('Avoir impute sur la dette ', v_ligne));

                SET v_credit = v_credit - v_applique;
            END LOOP;
            CLOSE cur_dettes;

            IF v_credit > 0 THEN
                INSERT INTO reparation_differes_rapport (section, reference, client_id, montant, commentaire)
                VALUES ('S4', v_avoir_id, v_client, v_credit,
                        'AVOIR RESTANT: le client ne doit plus rien. Credit conserve, a arbitrer');
            END IF;
        END;
    END LOOP;
    CLOSE cur_avoirs;
END$$
DELIMITER ;

CALL proc_consommer_avoirs_differes();
DROP PROCEDURE IF EXISTS proc_consommer_avoirs_differes;

-- ============================================================================
-- CONSULTATION DU RAPPORT
-- ============================================================================
SELECT section, COUNT(*) AS nb, SUM(montant) AS total
FROM reparation_differes_rapport
GROUP BY section;

SELECT * FROM reparation_differes_rapport ORDER BY section, id;
