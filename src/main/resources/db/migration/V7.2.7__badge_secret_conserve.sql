-- =====================================================================
-- RH, badges (retour du 23/10) : le QR d'un badge reste valable jusqu'a son expiration. La reimpression redonne le
-- meme QR ; seule la regeneration (bouton « Regenerer le QR ») tire un nouveau secret. Pour pouvoir reimprimer, le
-- secret est garde chiffre (AES-256-GCM, cle conservee en base comme pour les empreintes) ; l'empreinte SHA-256 reste
-- celle que la connexion verifie. Rejouable.
-- =====================================================================
ALTER TABLE t_rh_badge ADD COLUMN IF NOT EXISTS secret_chiffre VARBINARY(128) NULL;

CREATE TABLE IF NOT EXISTS t_rh_badge_cle (
    id          INT           NOT NULL,
    cle         VARBINARY(64) NOT NULL,
    dt_creation DATETIME      NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB;
