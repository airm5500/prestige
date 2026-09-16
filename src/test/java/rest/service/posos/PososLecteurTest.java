package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 9 : lecture de la reponse de Posos.
 *
 * <p>
 * La forme exacte de l'API reelle n'a pas pu etre verifiee (documentation injoignable depuis l'environnement de
 * developpement, acces de recette non fournis). La lecture est donc tolerante, et ce test tient le CONTRAT de cette
 * tolerance : chaque forme decrite ici est acceptee. Quand le format reel sera connu, ce test dira tout de suite s'il
 * est deja couvert, et il suffira d'ajouter le nom reel pour le couvrir.
 */
public class PososLecteurTest {

    private static PososResultat lire(String json) {
        return PososLecteur.lire(new JSONObject(json));
    }

    @Test
    public void formeFrancaise() {
        PososResultat r = lire("{\"alertes\":[{\"type\":\"interaction\",\"gravite\":\"majeure\","
                + "\"libelle\":\"Association déconseillée\",\"recommandation\":\"Espacer les prises\","
                + "\"produits\":[\"IBUPROFENE\",\"ASPIRINE\"]}]}");

        assertTrue(r.isDisponible());
        assertEquals(1, r.getAlertes().size());
        PososResultat.Alerte a = r.getAlertes().get(0);
        assertEquals("interaction", a.getType());
        assertEquals("majeure", a.getGravite());
        assertEquals("Association déconseillée", a.getLibelle());
        assertEquals("Espacer les prises", a.getRecommandation());
        assertEquals(java.util.List.of("IBUPROFENE", "ASPIRINE"), a.getProduits());
        assertEquals(1, r.nombreMajeures());
    }

    @Test
    public void formeAnglaise() {
        PososResultat r = lire("{\"alerts\":[{\"category\":\"interaction\",\"severity\":\"major\","
                + "\"description\":\"Avoid concomitant use\",\"recommendation\":\"Monitor\","
                + "\"drugs\":[{\"name\":\"IBUPROFEN\"},{\"name\":\"ASPIRIN\"}]}]}");

        assertEquals(1, r.getAlertes().size());
        PososResultat.Alerte a = r.getAlertes().get(0);
        assertEquals("interaction", a.getType());
        assertEquals("major", a.getGravite());
        assertEquals("Avoid concomitant use", a.getLibelle());
        assertEquals(java.util.List.of("IBUPROFEN", "ASPIRIN"), a.getProduits());
        assertTrue(a.estMajeure());
    }

    @Test
    public void alertesImbriqueesEnProfondeur() {
        // Une reponse qui enveloppe ses alertes : la lecture descend jusqu'a elles.
        PososResultat r = lire("{\"data\":{\"result\":{\"interactions\":"
                + "[{\"level\":\"moderate\",\"title\":\"Surveillance clinique\"}]}}}");

        assertEquals(1, r.getAlertes().size());
        assertEquals("Surveillance clinique", r.getAlertes().get(0).getLibelle());
        assertFalse(r.getAlertes().get(0).estMajeure());
    }

    @Test
    public void tableauDeChainesSimples() {
        PososResultat r = lire("{\"warnings\":[\"Ne pas associer à l'alcool\"]}");

        assertEquals(1, r.getAlertes().size());
        assertEquals("Ne pas associer à l'alcool", r.getAlertes().get(0).getLibelle());
        // Gravite inconnue : on ne minimise pas.
        assertTrue(r.getAlertes().get(0).estMajeure());
    }

    @Test
    public void reponseSansAlerteEstUnResultatDisponibleEtNonUneErreur() {
        PososResultat r = lire("{\"alerts\":[]}");

        assertTrue(r.isDisponible());
        assertTrue(r.getAlertes().isEmpty());
        assertTrue(r.getMessage().contains("Aucune alerte"), r.getMessage());
        assertEquals(0, r.nombreMajeures());
    }

    @Test
    public void reponseInconnueNeFaitPasTomberLaLecture() {
        PososResultat r = lire("{\"quelqueChose\":\"d'inattendu\",\"nombre\":12}");

        assertTrue(r.isDisponible());
        assertTrue(r.getAlertes().isEmpty());
    }

    @Test
    public void reponseNulleEstToleree() {
        PososResultat r = PososLecteur.lire(null);

        assertTrue(r.isDisponible());
        assertTrue(r.getAlertes().isEmpty());
    }

    @Test
    public void lesProduitsNonReconnusSontRemontes() {
        // L'officine doit savoir ce qui n'a PAS ete analyse : un produit muet est plus dangereux qu'une alerte.
        PososResultat r = lire("{\"alerts\":[],\"unmatched\":[\"SIROP MAISON\",\"TISANE\"]}");

        assertEquals(java.util.List.of("SIROP MAISON", "TISANE"), r.getProduitsNonReconnus());
    }

    @Test
    public void unElementSansRienDExploitableEstEcarte() {
        PososResultat r = lire("{\"alerts\":[{\"id\":42},{\"label\":\"Vraie alerte\"}]}");

        assertEquals(1, r.getAlertes().size());
        assertEquals("Vraie alerte", r.getAlertes().get(0).getLibelle());
    }

    @Test
    public void laGraviteEstReconnueDansLesFormulationsUsuelles() {
        for (String majeure : new String[] { "majeure", "major", "contre-indication", "contraindication", "severe",
                "critique", "high", "", "libellé inconnu" }) {
            PososResultat.Alerte a = new PososResultat.Alerte();
            a.setGravite(majeure);
            assertTrue(a.estMajeure(), "doit etre majeure : [" + majeure + "]");
        }
        for (String mineure : new String[] { "mineure", "minor", "faible", "low", "information", "précaution",
                "surveillance", "modéré", "moderate" }) {
            PososResultat.Alerte a = new PososResultat.Alerte();
            a.setGravite(mineure);
            assertFalse(a.estMajeure(), "ne doit pas etre majeure : [" + mineure + "]");
        }
    }

    @Test
    public void uneGraviteAbsenteEstTraiteeCommeMajeure() {
        // Choix delibere : mieux vaut faire lire une alerte de trop qu'en cacher une qui compte.
        PososResultat r = lire("{\"alerts\":[{\"label\":\"Sans gravité annoncée\"}]}");

        assertEquals(1, r.nombreMajeures());
    }

    @Test
    public void laCasseDesClesNEmpechePasLaLecture() {
        PososResultat r = lire("{\"Alerts\":[{\"Severity\":\"Major\",\"Label\":\"Majuscules\"}]}");

        assertEquals(1, r.getAlertes().size());
        assertEquals("Majuscules", r.getAlertes().get(0).getLibelle());
    }
}
