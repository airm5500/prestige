-- Retours du 07/10 : libelles de menu courts, l'explication passe en info-bulle (str_VALUE, affiche au survol
-- quand il est plus long que le libelle : voir webservices/menumanagement/ws_tree_menu.jsp).
UPDATE t_sous_menu
   SET str_DESCRIPTION = 'Rappels traitement',
       str_VALUE = 'Rappels de traitement habituel (SMS, WhatsApp) et piluliers à préparer'
 WHERE str_COMPOSANT = 'rappelshabitude';

UPDATE t_sous_menu
   SET str_DESCRIPTION = 'Prévisions vente / achat / analyse',
       str_VALUE = 'Prévisions de ventes, quantité recommandée à commander et alertes sur une suggestion ou une commande'
 WHERE str_COMPOSANT = 'analysecommande';
