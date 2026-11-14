-- Rapport d'exploitation du 13/11, point 7 : le detail d'un evenement constate sur une caisse etait ecrit sur le disque
-- de cette caisse ; le Centre de support du serveur affichait « Fichier de detail introuvable sur le disque » (6 fois le
-- 13/11). Le detail est maintenant garde avec l'evenement, en base, jusqu'a 64 Ko (photographie d'un blocage comprise).
ALTER TABLE t_application_event MODIFY COLUMN stack_extrait MEDIUMTEXT NULL;
