-- Plan du 21/11, point 16.1 : saisie du lot et de la date de peremption en commande en cours.
-- 0 (defaut) : rien ne change ; 1 : apres la quantite, une petite fenetre demande le lot et la peremption.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
 ('KEY_SAISIE_PEREMPTION_COMMANDE', '0', 'SAISIE DATE DE PEREMPTION COMMANDE EN COURS : 1 = lot et date de peremption demandes apres la quantite', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT INTO parametre_explication (str_KEY, explication)
SELECT 'KEY_SAISIE_PEREMPTION_COMMANDE',
       '{"regle":"À 1, en commande en cours, après la quantité, une petite fenêtre demande le numéro de lot puis la date de péremption ; Entrée passe au champ suivant, Entrée sur la date valide la ligne. Champs vides : la ligne est ajoutée sans lot. Les lots sont rangés comme après un import Tedis et repris tels quels à la création du BL. À 0, rien ne change. La valeur est relue à l''ouverture de l''écran.","titre":"Saisie de la date de péremption","entetes":["Saisie","Date lue"],"cas":[["01/27 ou 012027","31/01/2027 (fin du mois)"],["010127","01/01/2027"],["01012027, 01/01/27, 01-01-2027","01/01/2027"],["13/27, 32/01/27, date passée","refusée, message sous le champ"]],"rappels":["Un même lot saisi deux fois : les quantités s''additionnent.","La somme des quantités des lots ne peut pas dépasser la quantité de la ligne.","Double-clic sur LOTS ou DATE DE PÉREMPTION : la liste des lots de la ligne, modifiable."]}'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM parametre_explication WHERE str_KEY = 'KEY_SAISIE_PEREMPTION_COMMANDE');
