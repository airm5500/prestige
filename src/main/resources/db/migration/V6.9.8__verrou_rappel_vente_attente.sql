-- Lot 3 : verrou de rappel des ventes en attente.
-- Quand une caisse rappelle une vente en attente, on note qui et quand ;
-- une autre caisse qui tente le rappel est prevenue et bloquee tant que le
-- verrou n'est pas libere (cloture, remise en attente, sortie d'ecran) ou
-- expire. La garde absolue contre la double validation est faite au moment
-- de la cloture (refus si la vente est deja cloturee), ces colonnes ne
-- servent qu'au confort (nommer la caisse qui detient la vente).
ALTER TABLE t_preenregistrement
    ADD COLUMN str_RAPPEL_PAR varchar(120) NULL DEFAULT NULL,
    ADD COLUMN dt_RAPPEL_LE datetime NULL DEFAULT NULL;
