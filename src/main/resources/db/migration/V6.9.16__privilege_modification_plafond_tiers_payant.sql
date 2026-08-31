-- Privilege « Autorisation modification plafond tiers payant ».
--
-- Sans ce droit, les deux zones de plafond de la fiche d'un organisme (plafond de credit et
-- plafond par tiers payant) sont grisees : elles restent lisibles, mais ne peuvent plus etre
-- saisies. Les plafonds engagent l'officine sur ce qu'un organisme peut consommer ; leur
-- modification n'a pas a etre ouverte a tous les postes.
--
-- Le droit est CREE mais n'est attribue a personne : tant qu'un administrateur ne l'a pas
-- accorde, les zones sont grisees pour tout le monde. C'est volontaire - un droit qui
-- s'attribuerait tout seul ne protegerait rien - et cela se regle dans la gestion des profils.
--
-- str_STATUT = 'enable' est INDISPENSABLE : le chargement des droits d'un profil filtre sur ce
-- statut. Un privilege cree sans statut existe en base mais reste invisible - on peut l'attribuer
-- dans la gestion des profils sans que cela change quoi que ce soit a l'ecran.
--
-- INSERT IGNORE : rejouer la migration sur une base qui a deja le droit ne fait rien.

INSERT IGNORE INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
VALUES ('20260831', 'P_BTN_MODIFIER_PLAFOND_TIERS_PAYANT', 'CUSTOMER',
        'Autorisation modification plafond tiers payant', 'enable', NOW());

-- Rattrapage : sur une base ou le droit aurait ete cree sans statut, il serait inoperant.
UPDATE t_privilege SET str_STATUT = 'enable'
WHERE str_NAME = 'P_BTN_MODIFIER_PLAFOND_TIERS_PAYANT' AND (str_STATUT IS NULL OR str_STATUT = '');
