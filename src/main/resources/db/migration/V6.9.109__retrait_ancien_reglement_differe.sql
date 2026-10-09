-- Retours du 09/10 (1) : l'ancien ecran « Reglement differe » (JSP, deferredpayment) est retire du menu. Son serveur
-- ignorait le type de reglement choisi (mobile money enregistre en especes) et n'etait pas transactionnel. Les
-- reglements de differes passent par « Gestion des differes » (API controlee). Rien n'est supprime : l'entree est
-- seulement desactivee (str_Status) et peut etre reactivee.
UPDATE t_sous_menu SET str_Status = 'disable', dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'deferredpayment' AND str_Status = 'enable';
