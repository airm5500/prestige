-- =====================================================================
-- Ordonnances clients, retour du 30/09 : SCAN D'UNE ORDONNANCE PAPIER.
--
-- Un scan est une photo ou un PDF depose depuis le poste (ou, plus tard,
-- depuis l'application mobile) et qui attend d'etre TRAITE : l'ecran en
-- 3 parties le montre, on controle les produits, et la validation cree
-- l'ordonnance (le scan y est joint comme piece justificative).
--
-- Le fichier est sur DISQUE (dossier ordonnances-scans), seul son chemin
-- relatif est en base, comme les pieces. str_LECTURE garde ce que la
-- lecture automatique (Posos) a reconnu, pour ne pas la relancer.
--
-- str_STATUT : a_traiter, traite (ordonnance creee), ecarte (doublon,
-- photo ratee...). Rien n'est supprime : un scan ecarte reste trace.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_ordonnance_scan (
    lg_SCAN_ID VARCHAR(40) NOT NULL,
    str_NOM_ORIGINE VARCHAR(150) NOT NULL,
    str_TYPE_MIME VARCHAR(100) NOT NULL,
    int_TAILLE BIGINT NOT NULL DEFAULT 0,
    str_CHEMIN VARCHAR(255) NOT NULL,
    str_SOURCE VARCHAR(20) NOT NULL DEFAULT 'poste',
    str_STATUT VARCHAR(20) NOT NULL DEFAULT 'a_traiter',
    str_ETAT_LECTURE VARCHAR(20) NOT NULL DEFAULT 'non_lu',
    str_LECTURE MEDIUMTEXT NULL,
    lg_ORDONNANCE_ID VARCHAR(40) NULL,
    lg_USER_ID VARCHAR(40) NULL,
    dt_CREATED DATETIME NOT NULL,
    dt_UPDATED DATETIME NULL,
    PRIMARY KEY (lg_SCAN_ID),
    KEY t_ordonnance_scan_ix_statut (str_STATUT, dt_CREATED)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
