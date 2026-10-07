-- Retours du 07/10 (« oui, passe les autres menus en libelle court ») : le libelle affiche (str_DESCRIPTION) devient
-- court ; l'explication passe en info-bulle (str_VALUE, affichee au survol quand elle est plus longue que le libelle).
-- Seuls les menus dont le libelle etait une phrase d'explication sont touches ; les autres libelles ne changent pas.
UPDATE t_sous_menu SET str_DESCRIPTION = 'Ressources humaines',
       str_VALUE = 'Employés, planning de la semaine, congés et absences, pointages, connexions, pointage mobile'
 WHERE str_COMPOSANT = 'rhmanager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Gestion des gardes',
       str_VALUE = 'Périodes de garde et leur analyse : activité, commandés non vendus, comparaison'
 WHERE str_COMPOSANT = 'gardemanager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Analyse article',
       str_VALUE = 'Matrice marge × rotation, produits achetés ensemble et suivi des équivalences'
 WHERE str_COMPOSANT = 'analysearticle';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Comptes WhatsApp',
       str_VALUE = 'Comptes WhatsApp (API officielle / WhatsApp Web), connexion par QR code, règles d''envoi et modèles'
 WHERE str_COMPOSANT = 'whatsappcomptes';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Modèles de messages',
       str_VALUE = 'Modèles de SMS / WhatsApp pour les campagnes clients'
 WHERE str_COMPOSANT = 'modelemessagemanager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Détails',
       str_VALUE = 'Produits détaillés et historique des déconditionnements'
 WHERE str_COMPOSANT = 'detailsmanager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Ventes modifiées',
       str_VALUE = 'Mouchard des ventes modifiées, avec le détail des produits'
 WHERE str_COMPOSANT = 'ventesmodifieesmanager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Évolution des rétrocessions',
       str_VALUE = 'Évolution mensuelle du solde des rétrocessions'
 WHERE str_COMPOSANT = 'RetrocessionsManager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Fréquentation officine',
       str_VALUE = 'Analyse de la fréquentation de l''officine par plage horaire'
 WHERE str_COMPOSANT = 'analyseFrequentationOffManager';
UPDATE t_sous_menu SET str_DESCRIPTION = 'Activité opérateurs',
       str_VALUE = 'Statistiques d''activité par opérateur'
 WHERE str_COMPOSANT = 'statActiviteOperateurManager';
