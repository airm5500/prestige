-- Retours du 10/10 : le menu s'appelle « Étiquettage Pro » (deux t).
UPDATE t_sous_menu SET str_VALUE = 'Étiquettage Pro' WHERE str_COMPOSANT = 'etiquetagepro';
UPDATE t_privilege SET str_DESCRIPTION = 'Etiquettage Pro : etiquettes de produits importes (CSV, Excel) ou saisis'
 WHERE str_NAME = 'P_SM_ETIQUETAGE_PRO';
