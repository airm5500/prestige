-- Disponibilite PharmaML : horodatage a la milliseconde, pour que le « dernier resultat » d'un produit reste unique
-- quand deux verifications se suivent dans la meme seconde (verification puis reverification).
ALTER TABLE `t_disponibilite_produit` MODIFY `dt_CREATED` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
