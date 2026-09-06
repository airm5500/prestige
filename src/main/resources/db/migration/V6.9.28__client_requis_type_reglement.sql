-- Le parcours « choisir ou creer un client » etait declenche par une liste de types de reglement
-- codee en dur dans l'ecran de vente : cheque (2), carte bancaire (3), differe (4), virement (6),
-- plus les operateurs mobile money. Un mode cree par l'officine - Wyzall, par exemple - n'y
-- figurait pas et ne demandait donc jamais de client.
--
-- L'exigence devient une donnee du type de reglement. Les types qui declenchaient deja le parcours
-- sont marques ici, categorie MOBILE_MONEY comprise : le comportement du jour de la mise a jour est
-- identique a celui de la veille, et un nouveau mode se regle desormais dans l'ecran des modes de
-- reglement au lieu de demander une livraison.
ALTER TABLE t_type_reglement ADD COLUMN IF NOT EXISTS bool_CLIENT_REQUIS TINYINT(1) NOT NULL DEFAULT 0;

UPDATE t_type_reglement SET bool_CLIENT_REQUIS = 1
 WHERE lg_TYPE_REGLEMENT_ID IN ('2', '3', '4', '6')
    OR str_CATEGORIE = 'MOBILE_MONEY';
