-- =====================================================================
-- Evolution 6, point 1 : LES AGENCES D'UN MEME GROUPE NE FONT PLUS
-- QU'UNE COLONNE.
--
-- Le referentiel des fournisseurs porte deja un rattachement de groupe
-- (t_grossiste.groupeId vers groupefournisseur) : les cinq agences
-- LABOREX sont un seul fournisseur du point de vue de l'officine. Le
-- detail mensuel des achats leur donnait pourtant cinq colonnes, ce qui
-- obligeait a additionner de tete pour repondre a « combien nous a
-- coute LABOREX ce mois-ci ». Demande de l'officine du 20/09.
--
-- Un grossiste SANS groupe reste lui-meme : on ne l'oblige pas a entrer
-- dans un ensemble qui n'existe pas dans le referentiel.
--
-- DEUX CONSEQUENCES SUR CETTE TABLE :
--
--   1. La cle lg_GROSSISTE_ID porte desormais, pour un fournisseur
--      groupe, l'identifiant du GROUPE (« GRP1 ») et non celui de
--      l'agence. Les lignes deja enregistrees portent des identifiants
--      d'agences : elles sont videes pour etre reconstruites a la
--      prochaine ouverture de l'ecran. Aucune donnee n'est perdue -
--      cette table est un cache de calcul, reconstruit a partir des
--      bons de livraison.
--
--   2. Une colonne str_MEMBRES garde le NOM des agences d'un groupe.
--      Regrouper ne doit pas faire disparaitre « LABOREX-CI YOP » de
--      l'ecran : le tableau de repartition nomme le groupe, et dessous,
--      en plus petit, les agences qui le composent.
-- =====================================================================
ALTER TABLE `pilotage_agregat_grossiste`
    ADD COLUMN IF NOT EXISTS `str_MEMBRES` VARCHAR(500) NULL
        COMMENT 'agences composant le groupe, quand il en a plusieurs';

TRUNCATE TABLE `pilotage_agregat_grossiste`;

-- Les agregats MENSUELS sont vides eux aussi, et c'est necessaire : le
-- detail par grossiste n'est reconstruit qu'en meme temps que le mois
-- auquel il appartient. Sans cela, l'onglet Achats afficherait des
-- colonnes vides jusqu'a ce que quelqu'un pense a cliquer sur
-- « Recalculer ». Le travail planifie du demarrage les recalcule avant
-- que l'ecran ne soit ouvert.
TRUNCATE TABLE `pilotage_agregat_mensuel`;
