-- Modele de facture « bons + detail des medicaments » (facturation des carnets depot).
--
-- L'onglet FACTURES de « Gerer carnet depot » propose deux impressions : les bons seuls, avec le
-- modele rattache au tiers payant, et les bons ACCOMPAGNES du detail des medicaments de chaque
-- vente. La seconde s'appuie sur un modele actif dont le type d'affichage est DETAIL_ARTICLE.
--
-- Aucun modele ne portait ce type : l'action detaillee affichait donc un message expliquant que la
-- configuration etait incomplete. Ce modele est cree ici, une fois pour toutes, et pointe vers le
-- fichier Jasper embarque dans le war (src/main/resources/reports/facture_detail_articles.jrxml) :
-- l'impression detaillee fonctionne donc des la mise a jour, sans deploiement de modele sur site.
--
-- Le modele n'est PAS rattache a un tiers payant : il ne change donc rien aux impressions
-- existantes, qui continuent d'utiliser le modele de leur tiers payant. Il n'est retenu que par
-- l'action detaillee, qui le cherche par son type d'affichage.

-- Idempotent : rejouee, la migration ne cree pas de doublon. Un modele DETAIL_ARTICLE deja
-- configure par l'officine est respecte - c'est le sien qui doit servir, pas celui-ci.
INSERT INTO t_model_facture (lg_MODEL_FACTURE_ID, str_VALUE, str_DESCRIPTION, str_STATUT, dt_CREATED,
                             nomFichier, nomFichierRemiseTierspayant, typeAffichage)
SELECT '90', '90', 'Bons + détail des médicaments', 'enable', NOW(),
       'facture_detail_articles', 'facture_detail_articles', 'DETAIL_ARTICLE'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM t_model_facture WHERE typeAffichage = 'DETAIL_ARTICLE'
                                                  AND str_STATUT = 'enable');

-- Le modele existe deja mais sans fichier Jasper : on le complete plutot que d'en creer un second.
UPDATE t_model_facture
   SET nomFichier = 'facture_detail_articles'
 WHERE typeAffichage = 'DETAIL_ARTICLE' AND str_STATUT = 'enable'
   AND (nomFichier IS NULL OR TRIM(nomFichier) = '');
