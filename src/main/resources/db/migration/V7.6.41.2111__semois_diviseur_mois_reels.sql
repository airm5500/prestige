-- =====================================================================
-- Seuils SEMOIS (Moaye, 21/11/2026) : methode de division du calcul, pour les trois modes SEMOIS.
--   SEMOIS_DIVISEUR_MOIS_REELS = 1 (defaut) : ventes / (mois reellement presents dans l'historique x 4 semaines)
--   SEMOIS_DIVISEUR_MOIS_REELS = 0          : ancienne formule, ventes / (Q3 x 4 semaines)
-- Le descriptif valide depasse 254 caracteres : la colonne de description est elargie (l'entite la declare deja en
-- texte long ; colonne sans index).
-- =====================================================================

ALTER TABLE t_parameters MODIFY COLUMN str_DESCRIPTION VARCHAR(1000) NULL DEFAULT NULL;

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'SEMOIS_DIVISEUR_MOIS_REELS', '1',
       'Méthode de division du calcul SEMOIS (standard, ABC, par produit). 1 = les ventes sont divisées par le nombre de mois réellement présents dans l''historique × 4 semaines (valeur par défaut, adaptée à une officine qui démarre). 0 = ancienne formule : division par Q3 × 4 semaines, quel que soit l''historique disponible.',
       'SYSTEM', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'SEMOIS_DIVISEUR_MOIS_REELS');

INSERT INTO parametre_explication (str_KEY, explication)
SELECT 'SEMOIS_DIVISEUR_MOIS_REELS',
       '{"regle":"Méthode de division du calcul SEMOIS (standard, ABC, par produit). 1 = les ventes sont divisées par le nombre de mois réellement présents dans l''historique × 4 semaines (valeur par défaut, adaptée à une officine qui démarre). 0 = ancienne formule : division par Q3 × 4 semaines, quel que soit l''historique disponible.","titre":"Exemple : Q3 = 3 mois, Q1 = 2, 336 boîtes vendues","entetes":["Cas","Consommation par semaine","Seuil"],"cas":[["1, un seul mois d''historique (officine qui démarre)","336 / (1 x 4) = 84","168"],["0, un seul mois d''historique","336 / (3 x 4) = 28","56"],["1 ou 0, trois mois d''historique ou plus","Ventes des 3 mois / 12","Identique dans les deux cas"]],"rappels":["Le mois en cours n''est jamais compté : seuls les mois pleins terminés entrent dans le calcul.","La valeur est relue à chaque calcul : le passage mensuel et le recalcul manuel des seuils.","Le calcul au jour d''une classe ABC n''est pas concerné : il divise toujours par le nombre de jours des mois retenus.","Si le paramètre est absent, il est considéré à 1."]}'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM parametre_explication WHERE str_KEY = 'SEMOIS_DIVISEUR_MOIS_REELS');

-- Les explications existantes donnaient la seule formule Q3 x 4 : elles renvoient maintenant a ce parametre, et disent
-- qu'un produit actif sans vente sur la periode passe a 0 (correction du 21/11).
UPDATE parametre_explication
SET explication = REPLACE(explication, 'Consommation = ventes des Q3 derniers mois pleins / (Q3 x 4).',
        'Consommation = ventes des Q3 derniers mois pleins / (nombre de ces mois réellement présents dans l''historique x 4), ou / (Q3 x 4) si la méthode de division SEMOIS_DIVISEUR_MOIS_REELS vaut 0.')
WHERE str_KEY = 'SEMOIS_ABC';

UPDATE parametre_explication
SET explication = REPLACE(explication, 'Consommation par semaine = ventes des Q3 derniers mois pleins / (Q3 x 4).',
        'Consommation par semaine = ventes des Q3 derniers mois pleins / (nombre de ces mois réellement présents dans l''historique x 4), ou / (Q3 x 4) si la méthode de division SEMOIS_DIVISEUR_MOIS_REELS vaut 0.')
WHERE str_KEY = 'SEMOIS_PAR_PRODUIT';

UPDATE parametre_explication
SET explication = JSON_ARRAY_APPEND(explication, '$.cas',
        JSON_ARRAY('1, produit actif sans vente sur la période', 'Seuil et quantité passent à 0, sauf si le calcul du seuil est désactivé sur sa fiche.'))
WHERE str_KEY IN ('SEMOIS_ABC', 'SEMOIS_PAR_PRODUIT')
  AND explication NOT LIKE '%produit actif sans vente sur la période%';
