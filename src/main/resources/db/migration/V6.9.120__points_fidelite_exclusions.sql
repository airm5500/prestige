-- Retours du 10/10 (section 15) : « Points fidélité ».
-- 1. Libelle du menu.
UPDATE t_sous_menu SET str_VALUE = 'Points fidélité'
 WHERE str_COMPOSANT = 'fideliteclients' AND str_VALUE = 'Fidélité clients';

-- 2. Exclusions des points : par familles d'articles (existant) OU par emplacements de rangement (zone geographique /
--    rayon), l'un ou l'autre, jamais les deux. Les deux listes sont gardees ; seule celle du mode choisi s'applique.
ALTER TABLE t_fidelite_parametre
    ADD COLUMN IF NOT EXISTS str_MODE_EXCLUSION VARCHAR(12) NOT NULL DEFAULT 'FAMILLES';

CREATE TABLE IF NOT EXISTS t_fidelite_exclusion_zone (
    lg_ZONE_GEO_ID VARCHAR(40) NOT NULL,
    dt_CREATED     DATETIME    NULL,
    PRIMARY KEY (lg_ZONE_GEO_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
