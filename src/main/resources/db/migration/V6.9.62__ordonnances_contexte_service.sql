-- =====================================================================
-- Ordonnances clients, retours du 22/09.
--
-- 1. Le CONTEXTE CLINIQUE de l'ordonnance : les memes champs que l'ecran
--    Analyse posologie (age, sexe, grossesse, allaitement, insuffisances
--    renale et hepatique). Ils sont enregistres avec l'ordonnance pour
--    que l'analyse Posos se rejoue sans ressaisie. Aucun n'identifie le
--    patient : le lien au client est deja porte par lg_CLIENT_ID.
--
-- 2. Le SERVICE, LIGNE PAR LIGNE : « partiellement par ligne ».
--    int_QTE_SERVIE est NULLABLE, et c'est voulu : NULL veut dire « pas
--    encore renseigne », 0 veut dire « non servi ». Toutes les
--    ordonnances deja saisies passent ainsi en « a renseigner » au lieu
--    d'etre declarees non servies, ce qui fausserait les taux de
--    l'analyse des le premier jour.
--
-- Rien n'est retire ni renomme : colonnes ajoutees, valeurs par defaut
-- neutres. Rejouable (ADD COLUMN IF NOT EXISTS).
-- =====================================================================

ALTER TABLE `t_ordonnance_client`
    ADD COLUMN IF NOT EXISTS `int_AGE_PATIENT` INT(11) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `str_SEXE_PATIENT` VARCHAR(1) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `bool_GROSSESSE` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `bool_ALLAITEMENT` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `bool_INSUF_RENALE` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `bool_INSUF_HEPATIQUE` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `t_ordonnance_client_detail`
    ADD COLUMN IF NOT EXISTS `int_QTE_SERVIE` INT(11) NULL DEFAULT NULL;
