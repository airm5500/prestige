-- Retour du 22/11 sur le point 8.3 du plan du 21/11 : un client peut avoir un numero etranger, et le logiciel peut etre
-- installe hors de Cote d'Ivoire. Indicatif du pays de l'officine, 225 par defaut : rien ne change en Cote d'Ivoire.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
 ('KEY_INDICATIF_PAYS', '225', 'INDICATIF DU PAYS DE L''OFFICINE (225 = COTE D''IVOIRE) : regle des numeros saisis sans indicatif', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT INTO parametre_explication (str_KEY, explication)
SELECT 'KEY_INDICATIF_PAYS',
       '{"regle":"Indicatif téléphonique du pays de l''officine, sans « + » (225 pour la Côte d''Ivoire, 33 pour la France). Un numéro saisi sans indicatif est un numéro de ce pays : à 225, dix chiffres commençant par 01, 05 ou 07 ; ailleurs, 6 à 12 chiffres. Un numéro étranger se saisit avec son indicatif (+32 470 12 34 56 ou 0032 470 12 34 56) et est gardé sous la forme +32470123456 ; les SMS et WhatsApp partent vers cet indicatif. La valeur est relue dans les cinq minutes ; une valeur illisible garde 225.","titre":"Indicatif du pays de l''officine","entetes":["Saisie","Numéro gardé"],"cas":[["07 08 47 37 50 (à 225)","0708473750"],["+225 07 08 47 37 50","0708473750"],["+32 470 12 34 56","+32470123456"],["0033 6 12 34 56 78","+33612345678"],["04 70 12 34 56 (à 225)","refusé : saisir l''indicatif"]],"rappels":["Un numéro étranger reste unique parmi les clients du même type, comme un numéro ivoirien.","Un SMS vers l''étranger peut être facturé plus cher par le fournisseur."]}'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM parametre_explication WHERE str_KEY = 'KEY_INDICATIF_PAYS');
