package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Tri de l'analyse tiers payants.
 *
 * <p>
 * Deux garanties tenues ici. D'abord la regle metier : marge, chiffre d'affaires TTC ou quantite, toujours du plus
 * grand au plus petit, et la marge par defaut - c'etait le seul tri avant, l'ecran doit s'ouvrir comme avant.
 *
 * <p>
 * Ensuite la surete : la valeur vient du navigateur et la requete est du SQL natif. Elle ne doit JAMAIS s'y retrouver
 * telle quelle, sous aucune forme.
 */
class OrdreDeTriAnalyseTest {

    @Test
    void margeParDefaut() {
        assertEquals(" ORDER BY marge DESC", AnalyseTiersPayantServiceImpl.ordreDeTri(null));
        assertEquals(" ORDER BY marge DESC", AnalyseTiersPayantServiceImpl.ordreDeTri(""));
        assertEquals(" ORDER BY marge DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("MARGE"));
    }

    @Test
    void chiffreDAffairesTtc() {
        assertEquals(" ORDER BY ca_ttc DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("CA"));
    }

    @Test
    void quantite() {
        assertEquals(" ORDER BY quantite DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("QUANTITE"));
    }

    @Test
    void casEtEspacesIndifferents() {
        assertEquals(" ORDER BY ca_ttc DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("  ca  "));
        assertEquals(" ORDER BY quantite DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("Quantite"));
    }

    @Test
    void valeurInconnue_retombeSurLaMarge() {
        assertEquals(" ORDER BY marge DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("caHt"));
        assertEquals(" ORDER BY marge DESC", AnalyseTiersPayantServiceImpl.ordreDeTri("n'importe quoi"));
    }

    @Test
    void tentativeDInjection_neRessortJamais() {
        String malveillant = "marge DESC; DROP TABLE t_preenregistrement --";
        String clause = AnalyseTiersPayantServiceImpl.ordreDeTri(malveillant);
        assertEquals(" ORDER BY marge DESC", clause);
        assertTrue(clause.indexOf("DROP") < 0, "la saisie ne doit jamais atteindre le SQL");
    }
}
