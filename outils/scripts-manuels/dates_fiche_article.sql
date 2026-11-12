-- Dates de la fiche article : remplissage des colonnes de t_famille a partir de l'historique (demande du 12/11).
-- A lancer A LA MAIN, une fois par officine, apres le deploiement de la version qui contient
-- R__dates_fiche_article.sql (Flyway pose les declencheurs ; ce script remplit l'existant). Hors Flyway : sur une grosse
-- base, il relit toutes les ventes, et ne doit pas retarder le demarrage.
--
--   dt_DATE_LAST_SORTIE : plus grande date de cloture des ventes cloturees, non annulees, de montant positif, faites par
--                         un utilisateur de l'officine (emplacement '1') ;
--   dt_DATE_LAST_ENTREE : pour chaque ligne de BL cloture, date du mouvement « entree en stock » (type 01), a defaut
--                         date du BL ; la plus recente ;
--   dt_LAST_INVENTAIRE  : plus grande date de cloture des inventaires clotures par l'officine contenant l'article.
--
-- Lancer hors heures d'ouverture (une vente faite pendant le calcul pourrait etre recouverte par une date plus
-- ancienne ; le controle en fin de script la signalerait).
-- Lectures sans verrou (READ COMMITTED) : les ecrans ne sont pas bloques pendant le calcul.
-- Rejouable : une deuxieme execution ne reecrit que ce qui a change.
-- Les mises a jour passent par le repere @prestige_dates_fiche : t_famille_before_upd_tr ne marque pas les articles
-- modifies et n'ecrit pas l'historique des prix. Le script s'arrete si ce declencheur n'est pas la nouvelle version.

SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

DELIMITER @@
BEGIN NOT ATOMIC
  IF NOT EXISTS (SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()
                 AND TRIGGER_NAME = 't_famille_before_upd_tr' AND ACTION_STATEMENT LIKE '%prestige_dates_fiche%') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Deployer d''abord la version avec R__dates_fiche_article.sql (declencheur de t_famille)';
  END IF;
END@@
DELIMITER ;

SELECT NOW() AS debut;

DROP TEMPORARY TABLE IF EXISTS tmp_dates_sortie;
CREATE TEMPORARY TABLE tmp_dates_sortie (lg_FAMILLE_ID VARCHAR(40) CHARACTER SET utf8 PRIMARY KEY, d DATETIME)
SELECT d.lg_FAMILLE_ID, MAX(p.dt_UPDATED) AS d
FROM t_preenregistrement_detail d
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND u.lg_EMPLACEMENT_ID = '1'
GROUP BY d.lg_FAMILLE_ID;

DROP TEMPORARY TABLE IF EXISTS tmp_dates_entree;
CREATE TEMPORARY TABLE tmp_dates_entree (lg_FAMILLE_ID VARCHAR(40) CHARACTER SET utf8 PRIMARY KEY, d DATETIME)
SELECT bld.lg_FAMILLE_ID, MAX(COALESCE(h.m, bl.dt_UPDATED)) AS d
FROM t_bon_livraison_detail bld
JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID
LEFT JOIN (SELECT pkey, MAX(createdAt) m FROM hmvtproduit WHERE typeMvt = '01' GROUP BY pkey) h
  ON h.pkey = bld.lg_BON_LIVRAISON_DETAIL
WHERE bl.str_STATUT = 'is_Closed'
GROUP BY bld.lg_FAMILLE_ID;

DROP TEMPORARY TABLE IF EXISTS tmp_dates_inventaire;
CREATE TEMPORARY TABLE tmp_dates_inventaire (lg_FAMILLE_ID VARCHAR(40) CHARACTER SET utf8 PRIMARY KEY, d DATETIME)
SELECT l.lg_FAMILLE_ID, MAX(i.dt_UPDATED) AS d
FROM t_inventaire_famille l
JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID
JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID
WHERE i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1'
GROUP BY l.lg_FAMILLE_ID;

SELECT NOW() AS calcul_fini;

SET @prestige_dates_fiche = 1;
UPDATE t_famille f
LEFT JOIN tmp_dates_sortie s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID
LEFT JOIN tmp_dates_entree e ON e.lg_FAMILLE_ID = f.lg_FAMILLE_ID
LEFT JOIN tmp_dates_inventaire i ON i.lg_FAMILLE_ID = f.lg_FAMILLE_ID
SET f.dt_DATE_LAST_SORTIE = s.d, f.dt_DATE_LAST_ENTREE = e.d, f.dt_LAST_INVENTAIRE = i.d
WHERE NOT (f.dt_DATE_LAST_SORTIE <=> s.d AND f.dt_DATE_LAST_ENTREE <=> e.d AND f.dt_LAST_INVENTAIRE <=> i.d);
SELECT ROW_COUNT() AS articles_mis_a_jour;
SET @prestige_dates_fiche = NULL;

-- controle : 0 partout attendu
SELECT
  SUM(NOT (f.dt_DATE_LAST_SORTIE <=> s.d)) AS ecarts_vente,
  SUM(NOT (f.dt_DATE_LAST_ENTREE <=> e.d)) AS ecarts_entree,
  SUM(NOT (f.dt_LAST_INVENTAIRE <=> i.d)) AS ecarts_inventaire,
  COUNT(*) AS articles
FROM t_famille f
LEFT JOIN tmp_dates_sortie s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID
LEFT JOIN tmp_dates_entree e ON e.lg_FAMILLE_ID = f.lg_FAMILLE_ID
LEFT JOIN tmp_dates_inventaire i ON i.lg_FAMILLE_ID = f.lg_FAMILLE_ID;

DROP TEMPORARY TABLE IF EXISTS tmp_dates_sortie;
DROP TEMPORARY TABLE IF EXISTS tmp_dates_entree;
DROP TEMPORARY TABLE IF EXISTS tmp_dates_inventaire;
SELECT NOW() AS fin;
