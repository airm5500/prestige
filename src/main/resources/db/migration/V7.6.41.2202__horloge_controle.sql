-- Cahier des charges du 24/11, point 1 : date et heure du serveur.
--
-- 1. horloge_repere (une seule ligne, id = 1) : heure réelle suivie par le serveur, enregistrée chaque minute (elle
--    avance du temps réellement écoulé, jamais de l'horloge de Windows) ; état de la régularisation à date passée
--    (ouverte par le super administrateur seulement, refermée seule après le délai).
-- 2. horloge_trace : apparition, changement et levée du blocage, affichage sur un poste, tentatives de mise à jour et
--    leur résultat, ouverture et fermeture de la régularisation. Ni modifiée ni supprimée par l'application.
-- 3. Paramètres : seuils d'écart et de recul (30 min), durée de la régularisation (24 h) et recul maximal (7 jours).
--    Bornés par le serveur (seuils 1 à 120 min, durée 1 à 24 h, recul 1 à 7 jours). L'autorisation de régulariser
--    n'est PAS un paramètre de l'écran des paramètres : elle est dans horloge_repere, derrière une route réservée au
--    super administrateur.
--
-- Rejouable.

CREATE TABLE IF NOT EXISTS horloge_repere (
    id INT NOT NULL,
    estimation_ms BIGINT NULL,
    maj_le DATETIME(3) NULL,
    regularisation TINYINT NOT NULL DEFAULT 0,
    regularisation_ouverture_ms BIGINT NULL,
    regularisation_par VARCHAR(40) NULL,
    PRIMARY KEY (id)
);

INSERT IGNORE INTO horloge_repere (id, estimation_ms, maj_le, regularisation) VALUES (1, NULL, NULL, 0);

CREATE TABLE IF NOT EXISTS horloge_trace (
    id BIGINT NOT NULL AUTO_INCREMENT,
    serveur_le DATETIME(3) NOT NULL,
    reference_ms BIGINT NULL,
    evenement VARCHAR(40) NOT NULL,
    causes VARCHAR(100) NULL,
    poste VARCHAR(100) NULL,
    utilisateur_id VARCHAR(40) NULL,
    detail VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_horloge_trace_date (serveur_le)
);

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
 ('KEY_HORLOGE_SEUIL_ECART_MIN', '30', 'HEURE DU SERVEUR : ECART MAXIMAL AVEC L''HEURE D''INTERNET, EN MINUTES (1 A 120), AU-DELA L''APPLICATION EST BLOQUEE', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_HORLOGE_SEUIL_RECUL_MIN', '30', 'HEURE DU SERVEUR : RECUL OU AVANCE MAXIMAL DE L''HORLOGE, EN MINUTES (1 A 120), AU-DELA L''APPLICATION EST BLOQUEE', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_HORLOGE_REGULARISATION_DUREE_H', '24', 'HEURE DU SERVEUR : DUREE D''OUVERTURE D''UNE REGULARISATION A DATE PASSEE, EN HEURES (1 A 24)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
 ('KEY_HORLOGE_REGULARISATION_RECUL_J', '7', 'HEURE DU SERVEUR : RECUL MAXIMAL ADMIS PENDANT UNE REGULARISATION, EN JOURS (1 A 7)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
