-- Correspondance produits grossistes / Prestige, lot 5 : source de la disponibilite a la demande, par grossiste.
--   0 = PharmaML seul (comportement d'avant, valeur par defaut), 1 = extranet du grossiste seul, 2 = les deux (chaque
--   resultat affiche avec sa source). Reglable depuis l'ecran « Correspondance grossistes » (droit
--   P_CORRESPONDANCE_GROSSISTES). Rejouable.
ALTER TABLE t_grossiste
    ADD COLUMN IF NOT EXISTS int_SOURCE_DISPO TINYINT NOT NULL DEFAULT 0;
