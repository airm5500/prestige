-- =====================================================================
-- Evolution 6, point 1 : ANNULATIONS du menu de pilotage, alignees sur
-- l'etat « LISTE DES VENTES ANNULEES » du logiciel.
--
-- POURQUOI CE CHANGEMENT
--
-- Retour de l'officine du 19/09 : l'onglet Qualite annoncait 250 ventes
-- annulees pour 5 967 742 F, la ou l'etat imprime en annonce 315 et
-- 1 715 820 F. Les deux chiffres etaient « justes » et ne parlaient pas
-- de la meme chose :
--
--   1. LA DATE. L'agregat comptait l'annulation dans le mois de
--      dt_UPDATED (la vente), l'etat la compte dans le mois de
--      dt_ANNULER (l'annulation). Une vente de juillet annulee en aout
--      change de mois d'un calcul a l'autre.
--   2. LE STATUT. L'agregat comptait toutes les ventes marquees
--      annulees, l'etat ne compte que les ventes CLOTUREES.
--   3. LE MONTANT. 5 967 742 F est le montant des VENTES annulees
--      (int_PRICE, soit VO + VNO du pied de l'etat) ; 1 715 820 F est
--      la part reglee en ESPECES, c'est-a-dire ce qui sort reellement
--      du tiroir. Ce ne sont pas deux mesures de la meme grandeur.
--
-- Le pilotage adopte donc la definition de l'etat (date d'annulation +
-- vente cloturee) et rend EN PLUS le montant especes, pour que l'ecran
-- et l'etat se rapprochent sans calcul intermediaire.
--
-- Les agregats deja calcules portent l'ancienne definition : ils sont
-- vides ici pour etre recalcules a la premiere ouverture de l'ecran.
-- =====================================================================
ALTER TABLE `pilotage_agregat_mensuel`
    ADD COLUMN `int_ANNULE_ESPECE` BIGINT(20) NOT NULL DEFAULT 0 AFTER `int_MONTANT_ANNULE`;

-- Recalcul force : la definition des annulations a change.
TRUNCATE TABLE `pilotage_agregat_mensuel`;
