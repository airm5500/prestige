-- Rapport « Evolution mensuelle des achats » par fournisseur (menu achatfourManager et son edition PDF) :
-- plusieurs minutes, souvent plus de 10, avant cette version.
--
-- L'ancienne procedure relancait, pour CHAQUE ligne (annee x grossiste), 24 sous-requetes correlees
-- (12 mois d'achats, 12 mois d'avoirs) filtrees par MONTH() et YEAR() sur les dates : aucun index utilisable,
-- donc toute la table des bons de livraison relue 12 fois par ligne, puis un curseur et une table temporaire.
--
-- Meme signature, memes colonnes (noms, ordre, type DECIMAL(15,0) arrondi comme l'ancienne affectation a
-- NUMERIC(15)), memes lignes et meme tri ; une seule lecture des bons de livraison sur une plage de dates
-- (index statut + date) et une seule des avoirs, agregees mois par mois.

DELIMITER @@

DROP PROCEDURE IF EXISTS proc_statachatfournisseur @@

CREATE PROCEDURE proc_statachatfournisseur(IN dt_start DATE, IN dt_end DATE, IN searchvalue VARCHAR(100))
BEGIN
SELECT CAST(a.annee AS CHAR(8)) AS f_ANNEE,
       LEFT(a.libelle, 100) AS f_LIBELLE,
       CAST(IFNULL(a.m1, 0) AS DECIMAL(15, 0)) AS f_JANVIER,
       CAST(IFNULL(a.m2, 0) AS DECIMAL(15, 0)) AS f_FEVRIER,
       CAST(IFNULL(a.m3, 0) AS DECIMAL(15, 0)) AS f_MARS,
       CAST(IFNULL(a.m4, 0) AS DECIMAL(15, 0)) AS f_AVRIL,
       CAST(IFNULL(a.m5, 0) AS DECIMAL(15, 0)) AS f_MAI,
       CAST(IFNULL(a.m6, 0) AS DECIMAL(15, 0)) AS f_JUIN,
       CAST(IFNULL(a.m7, 0) AS DECIMAL(15, 0)) AS f_JUIELLET,
       CAST(IFNULL(a.m8, 0) AS DECIMAL(15, 0)) AS f_AOUT,
       CAST(IFNULL(a.m9, 0) AS DECIMAL(15, 0)) AS f_SEPT,
       CAST(IFNULL(a.m10, 0) AS DECIMAL(15, 0)) AS f_OCT,
       CAST(IFNULL(a.m11, 0) AS DECIMAL(15, 0)) AS f_NOV,
       CAST(IFNULL(a.m12, 0) AS DECIMAL(15, 0)) AS f_DEC,
       CAST(IFNULL(v.v1, 0) AS DECIMAL(15, 0)) AS f_JANVIER_AVOIR,
       CAST(IFNULL(v.v2, 0) AS DECIMAL(15, 0)) AS f_FEVRIER_AVOIR,
       CAST(IFNULL(v.v3, 0) AS DECIMAL(15, 0)) AS f_MARS_AVOIR,
       CAST(IFNULL(v.v4, 0) AS DECIMAL(15, 0)) AS f_AVRIL_AVOIR,
       CAST(IFNULL(v.v5, 0) AS DECIMAL(15, 0)) AS f_MAI_AVOIR,
       CAST(IFNULL(v.v6, 0) AS DECIMAL(15, 0)) AS f_JUIN_AVOIR,
       CAST(IFNULL(v.v7, 0) AS DECIMAL(15, 0)) AS f_JUIELLET_AVOIR,
       CAST(IFNULL(v.v8, 0) AS DECIMAL(15, 0)) AS f_AOUT_AVOIR,
       CAST(IFNULL(v.v9, 0) AS DECIMAL(15, 0)) AS f_SEPT_AVOIR,
       CAST(IFNULL(v.v10, 0) AS DECIMAL(15, 0)) AS f_OCT_AVOIR,
       CAST(IFNULL(v.v11, 0) AS DECIMAL(15, 0)) AS f_NOV_AVOIR,
       CAST(IFNULL(v.v12, 0) AS DECIMAL(15, 0)) AS f_DEC_AVOIR
  FROM (SELECT YEAR(b.dt_UPDATED) AS annee, g.lg_GROSSISTE_ID AS gid, g.str_LIBELLE AS libelle,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 1 THEN b.int_MHT END) AS m1,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 2 THEN b.int_MHT END) AS m2,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 3 THEN b.int_MHT END) AS m3,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 4 THEN b.int_MHT END) AS m4,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 5 THEN b.int_MHT END) AS m5,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 6 THEN b.int_MHT END) AS m6,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 7 THEN b.int_MHT END) AS m7,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 8 THEN b.int_MHT END) AS m8,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 9 THEN b.int_MHT END) AS m9,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 10 THEN b.int_MHT END) AS m10,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 11 THEN b.int_MHT END) AS m11,
           SUM(CASE WHEN MONTH(b.dt_UPDATED) = 12 THEN b.int_MHT END) AS m12
          FROM t_bon_livraison b
          JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
          JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID
         WHERE b.str_STATUT = 'is_Closed'
           AND b.dt_UPDATED >= MAKEDATE(YEAR(dt_start), 1)
           AND b.dt_UPDATED < MAKEDATE(YEAR(dt_end) + 1, 1)
           AND g.str_LIBELLE LIKE searchvalue
         GROUP BY YEAR(b.dt_UPDATED), g.lg_GROSSISTE_ID) a
  LEFT JOIN (SELECT YEAR(r.dt_UPDATED) AS annee, r.lg_GROSSISTE_ID AS gid,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 1 THEN r.dl_AMOUNT END) AS v1,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 2 THEN r.dl_AMOUNT END) AS v2,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 3 THEN r.dl_AMOUNT END) AS v3,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 4 THEN r.dl_AMOUNT END) AS v4,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 5 THEN r.dl_AMOUNT END) AS v5,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 6 THEN r.dl_AMOUNT END) AS v6,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 7 THEN r.dl_AMOUNT END) AS v7,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 8 THEN r.dl_AMOUNT END) AS v8,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 9 THEN r.dl_AMOUNT END) AS v9,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 10 THEN r.dl_AMOUNT END) AS v10,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 11 THEN r.dl_AMOUNT END) AS v11,
           SUM(CASE WHEN MONTH(r.dt_UPDATED) = 12 THEN r.dl_AMOUNT END) AS v12
               FROM t_retour_fournisseur r
               JOIN t_grossiste gr ON gr.lg_GROSSISTE_ID = r.lg_GROSSISTE_ID
              WHERE r.str_REPONSE_FRS <> '' AND r.str_STATUT = 'enable'
                AND r.dt_UPDATED >= MAKEDATE(YEAR(dt_start), 1)
                AND r.dt_UPDATED < MAKEDATE(YEAR(dt_end) + 1, 1)
              GROUP BY YEAR(r.dt_UPDATED), r.lg_GROSSISTE_ID) v
    ON v.annee = a.annee AND v.gid = a.gid
 ORDER BY f_ANNEE, f_LIBELLE;
END @@

DELIMITER ;
