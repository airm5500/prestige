-- Rendre le parametre SEMOIS_PAR_PRODUIT visible dans l'ecran de parametres
-- (str_TYPE = CUSTOMER au lieu de SYSTEM).
UPDATE t_parameters SET str_TYPE = 'CUSTOMER' WHERE str_KEY = 'SEMOIS_PAR_PRODUIT';
