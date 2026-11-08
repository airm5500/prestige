-- =====================================================================
-- Extranets grossistes (demande du 08/11) : rafraichissement automatique des listes gardees en base, pour les avoir en
-- local si Internet manque. Une ligne par liste reglee (Ubipharm ou TEDIS) : delai entre deux lectures, 0 = jamais
-- (defaut : aucune ligne, aucune lecture automatique). Lu par la tache planifiee et par l'ecran. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_rafraichissement (
    liste VARCHAR(40) NOT NULL,
    source VARCHAR(20) NOT NULL,
    delai_minutes INT NOT NULL DEFAULT 0,
    modifie_le DATETIME NULL,
    modifie_par VARCHAR(100) NULL,
    PRIMARY KEY (liste)
);
