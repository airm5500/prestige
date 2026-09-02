-- Mouchard des ventes modifiees : date de creation de la vente d'origine, et tableau recapitulatif
-- (element, avant, apres) pour les modifications d'informations client / tiers payant et de date.
ALTER TABLE vente_modifiee ADD COLUMN vente_date DATETIME NULL AFTER vente_ref;
ALTER TABLE vente_modifiee_ligne
    ADD COLUMN valeur_avant VARCHAR(255) NULL AFTER montant_apres,
    ADD COLUMN valeur_apres VARCHAR(255) NULL AFTER valeur_avant;
