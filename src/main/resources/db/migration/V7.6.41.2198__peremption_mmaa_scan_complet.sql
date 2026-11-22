-- Reponses du 22/11 sur le point 16.1 (commande en cours, lot et peremption) :
--  - « 0127 signifie 31/01/2027 » : la forme MMAA (4 chiffres) donne le dernier jour du mois ;
--  - « ajoute la ligne directement apres un scan complet » : un DataMatrix complet (produit, lot, peremption) scanne
--    dans le champ du lot valide la ligne sans Entree, sauf si le code de la boite n'est pas celui du produit choisi.
-- Seule l'explication du parametre change (aucune donnee).
UPDATE parametre_explication
SET explication = REPLACE(REPLACE(explication,
        '["01/27 ou 012027","31/01/2027 (fin du mois)"]',
        '["01/27, 0127 ou 012027","31/01/2027 (fin du mois)"]'),
        '"rappels":["Un même lot saisi deux fois',
        '"rappels":["Un DataMatrix complet (produit, lot et péremption) scanné dans le champ du lot ajoute la ligne tout de suite, avec la quantité tapée ; si la boîte n''est pas celle du produit choisi, un avertissement s''affiche et Entrée valide après vérification.","Un même lot saisi deux fois')
WHERE str_KEY = 'KEY_SAISIE_PEREMPTION_COMMANDE';
