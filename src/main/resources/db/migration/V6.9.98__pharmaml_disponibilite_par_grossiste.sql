-- PharmaML (08/10) : l'interrogation de disponibilite (REQ_INFORMATION / REQ_INFOS) se coupe par grossiste.
-- Certains logiciels de grossiste la refusent (LABOREX, GESCOM : HTTP 400 d'apres un autre logiciel en service) :
-- le bouton et la pastille de disponibilite disparaissent alors pour ce grossiste, la commande reste inchangee.
-- 1 = active (defaut), 0 = desactivee. LABOREX est desactive au depart ; la fiche grossiste permet de le reactiver.
ALTER TABLE `t_grossiste` ADD COLUMN IF NOT EXISTS `int_PHARMAML_DISPO` TINYINT(1) NOT NULL DEFAULT 1;
UPDATE `t_grossiste` SET `int_PHARMAML_DISPO` = 0 WHERE UPPER(`str_LIBELLE`) LIKE '%LABOREX%';
