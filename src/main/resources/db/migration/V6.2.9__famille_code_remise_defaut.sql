-- Les produits crees sans code remise (creation rapide depuis la vue commande)
-- doivent avoir un code remise par defaut a 0
UPDATE t_famille
SET str_CODE_REMISE = '0'
WHERE str_CODE_REMISE IS NULL
   OR str_CODE_REMISE = '';
