-- Categorie des types de reglement : MOBILE_MONEY ou STANDARD.
--
-- Le mobile money etait reconnu par des listes d'identifiants codees en dur (7, 8, 9, 10, 19, 70, 80)
-- dans le service des modes de reglement, l'ecran de vente, les rapports de caisse et le ticket Z.
-- Un mode cree par l'officine n'y figurait dans aucun. La categorie devient la reference : les
-- sept operateurs historiques sont classes MOBILE_MONEY pour garder leur comportement, tout le
-- reste est STANDARD.
ALTER TABLE t_type_reglement ADD COLUMN IF NOT EXISTS str_CATEGORIE VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

UPDATE t_type_reglement SET str_CATEGORIE = 'MOBILE_MONEY'
 WHERE lg_TYPE_REGLEMENT_ID IN ('7', '8', '9', '10', '19', '70', '80');
