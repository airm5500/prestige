-- =====================================================================
-- Extranets grossistes (08/11, décision de l'utilisateur) : la clé qui chiffre les mots de passe des extranets est
-- rangée en base, et non dans un fichier du poste. Une seule ligne (id = 1), créée par Prestige au premier
-- enregistrement d'identifiants ; jamais renvoyée par l'API ni journalisée. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_cle (
    id TINYINT NOT NULL,
    cle VARCHAR(100) NOT NULL,
    creee_le DATETIME NOT NULL,
    PRIMARY KEY (id)
);
