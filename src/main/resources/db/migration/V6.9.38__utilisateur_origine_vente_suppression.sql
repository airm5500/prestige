-- Evolution 5, point 6 : mouchard des ventes supprimees, utilisateur d'origine de la vente.
--
-- vente_suppression ne portait que l'auteur de la suppression (user_id / user_name). Pour les ventes
-- abandonnees supprimees automatiquement a minuit, cet auteur vaut « Systeme » : la trace ne disait donc plus
-- qui avait ouvert la vente, alors que c'est justement l'information cherchee. L'auteur de la suppression est
-- conserve tel quel ; l'utilisateur d'origine s'ajoute a cote, sur les deux chemins (suppression automatique
-- comme suppression manuelle, ou l'auteur et l'utilisateur d'origine peuvent differer).
--
-- Les lignes deja tracees ne sont pas reprises : la vente ayant ete supprimee, son utilisateur d'origine n'est
-- plus lisible nulle part. Les colonnes restent donc vides pour l'historique, et l'ecran n'affiche rien plutot
-- que d'inventer une valeur.

ALTER TABLE `vente_suppression`
    ADD COLUMN IF NOT EXISTS `origine_user_id` VARCHAR(50) NULL
        COMMENT 'Utilisateur qui a initie la vente, distinct de l auteur de la suppression',
    ADD COLUMN IF NOT EXISTS `origine_user_name` VARCHAR(150) NULL
        COMMENT 'Nom de l utilisateur qui a initie la vente';

CREATE INDEX IF NOT EXISTS `idx_vente_suppression_origine` ON `vente_suppression` (`origine_user_id`);
