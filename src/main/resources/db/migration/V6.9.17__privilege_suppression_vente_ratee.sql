-- Privilege « Autorisation suppression d'une vente ratee ».
--
-- Le registre des ventes ratees est un document de suivi : il sert a savoir ce que l'officine n'a
-- pas pu vendre, et a decider des commandes. Effacer une ligne fait disparaitre une demande de la
-- statistique du jour comme de l'analyse de la periode ; ce n'est pas un geste de comptoir.
--
-- Sans ce droit, la croix de suppression n'apparait pas sur les lignes, et le service refuse la
-- suppression - l'ecran ne suffit pas a proteger, le controle de fond reste cote serveur.
--
-- Le droit est CREE mais n'est attribue a personne : tant qu'un administrateur ne l'a pas accorde,
-- personne ne peut supprimer. C'est volontaire, et cela se regle dans la gestion des profils.
--
-- str_STATUT = 'enable' est INDISPENSABLE : le chargement des droits d'un profil filtre sur ce
-- statut. Un privilege cree sans statut existe en base mais reste invisible - on peut l'attribuer
-- dans la gestion des profils sans que cela change quoi que ce soit a l'ecran.
--
-- INSERT IGNORE : rejouer la migration sur une base qui a deja le droit ne fait rien.

INSERT IGNORE INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
VALUES ('20260901', 'P_BTN_SUPPRIMER_VENTE_RATEE', 'CUSTOMER',
        'Autorisation suppression d''une vente ratee', 'enable', NOW());

-- Rattrapage : sur une base ou le droit aurait ete cree sans statut, il serait inoperant.
UPDATE t_privilege SET str_STATUT = 'enable'
WHERE str_NAME = 'P_BTN_SUPPRIMER_VENTE_RATEE' AND (str_STATUT IS NULL OR str_STATUT = '');
