-- =====================================================================
-- Centre de Support - Surveillance de la base de donnees
-- ---------------------------------------------------------------------
-- La supervision regardait la JVM et le disque ; la base ne l'etait pas.
-- C'est pourtant de la que sont venus les effondrements corriges par les
-- migrations d'index (peremptions, articles invendus, ouverture d'un
-- inventaire) : les threads HTTP finissaient satures et plus aucune
-- donnee ne s'affichait. Le filtre des ecrans lents voit le symptome cote
-- HTTP, jamais la cause cote SGBD.
--
-- Trois indicateurs, releves toutes les ~5 min comme les ressources :
--   * connexions ouvertes / max_connections : a saturation, la base
--     refuse toute nouvelle connexion et l'application est indisponible ;
--   * requetes reellement en cours au-dela d'un seuil de duree : signe
--     d'un index manquant ou d'un balayage de table complet ;
--   * attentes de verrou InnoDB : a l'origine des "Lock wait timeout
--     exceeded" deja rencontres au demarrage.
--
-- Anti-bruit : au plus une alerte par indicateur et par jour. Les
-- connexions exigent en plus un depassement soutenu (3 releves), un pic
-- bref etant normal.
--
-- Parametres (str_TYPE = 'SYSTEME' : reglages techniques, masques de
-- l'ecran Parametres, modifiables en base uniquement) :
--   SUPPORT_DB_MONITOR_ENABLED : 1=actif, 0=inactif.
--   SUPPORT_DB_CONN_PCT        : seuil d'alerte connexions (% de
--                                max_connections), def. 80.
--   SUPPORT_DB_SLOW_QUERY_S    : duree (s) au-dela de laquelle une
--                                requete en cours est signalee, def. 10.
--   SUPPORT_DB_LOCK_WAITS      : nombre de transactions en attente d'un
--                                verrou declenchant l'alerte, def. 5.
-- =====================================================================

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_DB_MONITOR_ENABLED', '1', 'Surveillance de la base de donnees (1=actif, 0=inactif)', 'SYSTEME', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_DB_CONN_PCT', '80', 'Seuil d alerte des connexions a la base en pourcentage de max_connections', 'SYSTEME', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_DB_SLOW_QUERY_S', '10', 'Duree en secondes au dela de laquelle une requete en cours est signalee', 'SYSTEME', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_DB_LOCK_WAITS', '5', 'Nombre de transactions en attente d un verrou InnoDB declenchant l alerte', 'SYSTEME', 'enable', NULL, NULL, NOW(), NULL);
