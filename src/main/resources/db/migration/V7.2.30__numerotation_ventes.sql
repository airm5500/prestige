-- =====================================================================
-- Numerotation des ventes : plus de numeros en double
-- ---------------------------------------------------------------------
-- Le compteur du jour (table reference) avait la date seule pour cle
-- primaire. La proforma, qui cherche son propre compteur, et la vente
-- sur un depot d'extension, qui cherchait celui du depot, ne le
-- trouvaient pas : elles en creaient un neuf a la meme date, qui
-- ECRASAIT celui des ventes de l'officine. La suite repartait a 1 et
-- les numeros deja donnes ce jour-la etaient redonnes.
--
-- 1. Une cle technique remplace la date : chaque compteur (jour +
--    emplacement + proforma, deja unique) a sa propre ligne.
-- 2. Les compteurs des deux derniers jours repartent au moins du plus
--    grand numero deja donne, pour que la journee en cours ne
--    redonne pas un numero existant apres la mise a jour.
-- =====================================================================

ALTER TABLE reference
    DROP PRIMARY KEY,
    ADD COLUMN pk BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;

UPDATE reference r
JOIN (SELECT DATE_FORMAT(p.dt_UPDATED, '%Y%m%d') jour, u.lg_EMPLACEMENT_ID emplacement,
             MAX(CAST(SUBSTRING(p.str_REF, 8) AS SIGNED)) dernier
      FROM t_preenregistrement p
      JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
      WHERE p.dt_UPDATED >= CURDATE() - INTERVAL 1 DAY
        AND p.str_STATUT = 'is_Closed'
        AND p.str_REF LIKE CONCAT(DATE_FORMAT(p.dt_UPDATED, '%y%m%d'), '\_%')
      GROUP BY jour, emplacement) v ON v.jour = r.id AND v.emplacement = r.emplacement_id
SET r.last_int_value = GREATEST(r.last_int_value, v.dernier)
WHERE r.devis = 0;
