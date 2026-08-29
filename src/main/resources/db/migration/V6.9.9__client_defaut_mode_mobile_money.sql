-- Lot 3 : client standard par defaut d'un mode de reglement mobile money.
-- La pharmacie a cree un client standard par operateur (ORANGE, MTN, MOOV...).
-- Ce champ, renseigne dans le menu Mode reglement, permet a la vente de
-- proposer ces clients en selection rapide quand un mode mobile est choisi.
ALTER TABLE t_mode_reglement
    ADD COLUMN lg_CLIENT_DEFAUT_ID varchar(40) NULL DEFAULT NULL;
