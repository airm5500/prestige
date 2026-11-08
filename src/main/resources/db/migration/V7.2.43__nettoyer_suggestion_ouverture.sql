-- Plan du 08/11, point 11.5 : parametre KEY_NETTOYER_SUGGESTION_OUVERTURE, a 0 par defaut (comportement inchange).
-- A 1 : l'ouverture d'une suggestion de reapprovisionnement lance « Nettoyer la suggestion » (meme regle : rayon, plus
-- la reserve quand le produit y est gere, compare au seuil), puis affiche la liste et un court message.
-- Rejouable (insertion conditionnelle).
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_NETTOYER_SUGGESTION_OUVERTURE', '0',
       'Suggestion de reapprovisionnement : nettoyer la suggestion a son ouverture (1) ; 0 = nettoyage par le bouton seulement',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_NETTOYER_SUGGESTION_OUVERTURE');
