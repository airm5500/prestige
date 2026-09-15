-- Evolution 5, point 5 : reglement du carnet de depot, date de creation distincte de la date choisie.
--
-- Jusqu'ici reglement_carnet n'avait qu'une seule date, createdAt, et la date choisie par l'operateur dans
-- l'ecran (ReglementCarnetDTO.dateReglement) l'ecrasait : le moment reel de la saisie etait perdu. Un reglement
-- saisi aujourd'hui pour une date d'il y a trois semaines etait donc indiscernable d'un reglement saisi ce
-- jour-la. La colonne date_creation porte desormais l'instant de saisie, createdAt gardant la date de
-- reglement choisie (c'est elle qui alimente le dossier de reglement, le mouvement de caisse et le ticket,
-- rien ne change de ce cote).
--
-- Reprise de l'existant : pour les reglements deja enregistres, la seule date connue est createdAt. On l'y
-- recopie plutot que de laisser la colonne vide, en sachant que pour ceux qui portaient une date choisie
-- l'instant de saisie reel n'est pas recuperable.

ALTER TABLE `reglement_carnet`
    ADD COLUMN IF NOT EXISTS `date_creation` DATETIME NULL
        COMMENT 'Instant reel de la saisie, distinct de createdAt qui porte la date de reglement choisie';

UPDATE `reglement_carnet` SET `date_creation` = `createdAt` WHERE `date_creation` IS NULL;

CREATE INDEX IF NOT EXISTS `idx_reglement_carnet_date_creation` ON `reglement_carnet` (`date_creation`);
