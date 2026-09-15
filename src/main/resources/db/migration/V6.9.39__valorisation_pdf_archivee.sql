-- =====================================================================
-- Evolution 5, point 2 : valorisation du stock archivee en PDF
-- ---------------------------------------------------------------------
-- La valorisation ne s'obtenait qu'a la demande, depuis l'ecran : rien
-- n'en gardait la trace. Une officine qui voulait comparer la valeur de
-- son stock d'un mois sur l'autre devait avoir pense a imprimer le PDF
-- et a le ranger elle-meme.
--
-- Le traitement produit desormais le PDF tout seul les jours de fin et
-- de debut de mois (27, 28, 29, 30, 31, 1, 2 et 3), soit huit editions
-- par mois, et les range dans le sous-dossier « valorisations » a cote
-- des donnees de support. Douze mois sont conserves, les plus anciennes
-- sont retirees.
--
-- KEY_VALORISATION_PDF_CRITERE reprend le choix de l'ecran : la
-- valorisation se fait soit par EMPLACEMENT, soit par FAMILLE, avec dans
-- les deux cas la totalite des emplacements ou des familles - exactement
-- ce qu'on obtient a la main en ne restreignant rien.
--
-- KEY_VALORISATION_PDF_ACTIF laisse l'officine arreter le traitement
-- sans toucher au code. Actif par defaut : l'archivage n'ecrit que des
-- fichiers, il ne modifie aucune donnee.
-- =====================================================================

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`)
VALUES ('KEY_VALORISATION_PDF_ACTIF', '1',
        'Archivage automatique de la valorisation du stock en PDF les 27, 28, 29, 30, 31, 1, 2 et 3 du mois (1 = actif)',
        'SYSTEME', 'enable');

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`)
VALUES ('KEY_VALORISATION_PDF_CRITERE', 'EMPLACEMENT',
        'Critere de la valorisation archivee : EMPLACEMENT ou FAMILLE (tous les emplacements ou toutes les familles)',
        'SYSTEME', 'enable');

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`)
VALUES ('KEY_VALORISATION_PDF_MOIS_CONSERVES', '12',
        'Nombre de mois de valorisations PDF conservees dans le dossier valorisations (12 par defaut)',
        'SYSTEME', 'enable');

-- Le moniteur de fraicheur du Centre de Support connait le nouveau traitement, et sait qu'il
-- est commande par son propre interrupteur : un archivage volontairement arrete ne doit pas
-- etre signale comme « en retard ».
-- max_age_minutes a 8 jours : le traitement ne passe que les 27-31 et 1-3, l'ecart le plus long
-- entre deux passages est celui du 3 au 27, soit vingt-quatre jours... mais un seul passage reussi
-- par fenetre suffit. 35 jours couvrent donc le pire cas sans jamais crier a tort.
INSERT IGNORE INTO t_support_job (`code`, `libelle`, `requete_sql`, `parametre_actif`, `max_age_minutes`, `actif`, `ordre`)
VALUES ('VALORISATION_PDF', 'Archivage PDF de la valorisation (fin et debut de mois, 01:20)',
        'SELECT last_run_at FROM t_support_job_run WHERE code = ''VALORISATION_PDF''',
        'KEY_VALORISATION_PDF_ACTIF', 50400, 1, 7);
