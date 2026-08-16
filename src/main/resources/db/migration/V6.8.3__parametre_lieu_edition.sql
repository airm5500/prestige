-- Ville imprimee en pied des recapitulatifs de facture (« <Ville>, le <date> »).
--
-- Les modeles portaient cette ville EN DUR (« TAFIRE »). Elle se regle desormais dans l'ecran
-- « Gestion des parametrages ». Encore faut-il que la ligne du parametre existe : sinon l'ecran
-- ne l'affiche pas et l'officine n'a nulle part ou saisir sa ville.
--
-- La ligne est creee VIDE : tant que rien n'est saisi, le recapitulatif imprime simplement
-- « le <date> », ce qui vaut mieux qu'une ville fausse. Aucune presentation ne change tant que
-- l'officine n'a pas renseigne sa ville.
--
-- Bloc garde et rejouable (aucun echec si la ligne existe deja, aucune valeur ecrasee).

INSERT INTO `t_parameters` (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `dt_CREATED`, `dt_UPDATED`)
SELECT 'KEY_LIEU_EDITION', '',
       'Ville de l''officine, imprimee en pied de recapitulatif de facture',
       'CUSTOMER', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM `t_parameters` WHERE `str_KEY` = 'KEY_LIEU_EDITION');
