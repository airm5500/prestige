-- Catalogue : produits du dernier import (filtre « Dernier import » du catalogue), y compris les lignes inchangees.
ALTER TABLE produit ADD COLUMN dernier_import BIGINT NULL AFTER modifie_par, ADD KEY ix_produit_import (dernier_import);

-- Journal : nombre de lignes ecartees comme doublons (meme CIP, la derniere ligne est gardee) et champs ajoutes.
ALTER TABLE journal_import ADD COLUMN doublons INT NOT NULL DEFAULT 0 AFTER erreurs,
    ADD COLUMN champs_ajoutes VARCHAR(400) NULL AFTER doublons;
