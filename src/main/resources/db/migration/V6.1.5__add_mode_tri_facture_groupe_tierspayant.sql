-- Ajoute le mode de tri des sous-factures lors de l'edition d'une facture de groupe.
-- Valeurs attendues : 'ALPHABETIQUE' (defaut) ou 'NUMERIQUE'.
-- ALPHABETIQUE : ordre alphabetique du nom de la sous-assurance / tiers payant.
-- NUMERIQUE    : ordre numerique du numero de facture.
ALTER TABLE `t_groupe_tierspayant`
    ADD COLUMN IF NOT EXISTS `str_MODE_TRI_FACTURE` VARCHAR(30) NOT NULL DEFAULT 'ALPHABETIQUE';
