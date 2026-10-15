-- O5 (Prestige Mobile) : journal des lectures avancees d'ordonnances (service externe, avec consentement).
-- Une ligne par demande : date, utilisateur, taille de l'image, fournisseur, modele, resultat, nombre de lignes,
-- jetons et cout estime. JAMAIS l'image ni le texte lu (le serveur ne les enregistre nulle part).
-- Sert aussi au quota par jour. Script rejouable (CREATE TABLE IF NOT EXISTS) ; aucune table existante modifiee.
CREATE TABLE IF NOT EXISTS mobile_lecture_avancee_journal (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    jour          DATE          NOT NULL,
    horodatage    DATETIME      NOT NULL,
    lg_USER_ID    VARCHAR(40)   NULL,
    taille_octets INT           NOT NULL DEFAULT 0,
    fournisseur   VARCHAR(20)   NOT NULL,
    modele        VARCHAR(60)   NULL,
    resultat      VARCHAR(20)   NOT NULL,
    lignes        INT           NOT NULL DEFAULT 0,
    jetons_entree BIGINT        NOT NULL DEFAULT 0,
    jetons_sortie BIGINT        NOT NULL DEFAULT 0,
    cout_estime   DECIMAL(12,6) NOT NULL DEFAULT 0,
    duree_ms      BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_mobile_lecture_avancee_jour (jour, resultat)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;
