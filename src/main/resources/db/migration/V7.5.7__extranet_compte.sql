-- =====================================================================
-- Extranets grossistes (07/11, décision de l'utilisateur) : identifiant et mot de passe de chaque extranet, saisis
-- par l'administrateur dans l'onglet Sessions. Le serveur s'en sert pour se connecter seul et se reconnecter quand
-- la session expire.
--  - mot_de_passe_chiffre : AES-GCM, clé dans un fichier du serveur hors base et hors dépôt (D:\prestige\cles) ;
--    jamais en clair en base, jamais renvoyé par l'API, jamais journalisé.
--  - une ligne par extranet ; supprimer la ligne efface les identifiants. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_compte (
    source VARCHAR(20) NOT NULL,
    identifiant VARCHAR(200) NOT NULL,
    mot_de_passe_chiffre VARCHAR(1000) NOT NULL,
    modifie_le DATETIME NOT NULL,
    modifie_par VARCHAR(40) NULL,
    PRIMARY KEY (source)
);
