package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import org.junit.jupiter.api.Test;
import util.MessageModele;

/** Plan d'octobre, 4.1 : medicaments cites ou message neutre, selon la fiche client. */
public class MessageTraitementTest {

    @Test
    public void medicamentsCites() {
        assertEquals("A, B", MessageTraitement.medicaments(Arrays.asList("A", "B"), "x"));
        assertEquals("A, B…", MessageTraitement.medicaments(Arrays.asList("A", "B", "C"), "x"));
        assertEquals("x", MessageTraitement.medicaments(Collections.emptyList(), "x"));
    }

    @Test
    public void neutreSansNomDeMedicament() {
        String modele = "Bonjour {client}, votre traitement {medicament} sera bientôt à renouveler.";
        Map<String, String> v = MessageModele.valeurs("KOFFI", "Awa", MessageTraitement.NEUTRE, "P", "", "");
        assertEquals("Bonjour KOFFI Awa, votre traitement habituel sera bientôt à renouveler.",
                MessageModele.personnaliser(MessageTraitement.modeleNeutre(modele), v));
        assertEquals("Rappel : votre traitement habituel.",
                MessageModele.personnaliser(MessageTraitement.modeleNeutre("Rappel : {medicament}."), v));
    }

    @Test
    public void rappelHabitudeEtRenouvellement() {
        java.time.LocalDate d = java.time.LocalDate.of(2026, 10, 9);
        assertEquals(
                "Bonjour KOFFI Awa, votre traitement DOLIPRANE 1000, AMLOR 5 sera bientôt à renouveler (vers le "
                        + "09/10/2026). La pharmacie P peut le préparer pour vous.",
                RappelHabitudeServiceImpl.message(null, "KOFFI", "Awa", Arrays.asList("DOLIPRANE 1000", "AMLOR 5"),
                        true, "P", "", d));
        String neutre = RappelHabitudeServiceImpl.message(null, "KOFFI", "Awa", Arrays.asList("DOLIPRANE 1000"), false,
                "P", "", d);
        assertEquals("Bonjour KOFFI Awa, votre traitement habituel sera bientôt à renouveler (vers le 09/10/2026)."
                + " La pharmacie P peut le préparer pour vous.", neutre);
        assertEquals("Bonjour KOFFI Awa, votre traitement habituel arrive a son terme.",
                OrdonnanceRenouvellementService.messageNeutre(
                        "Bonjour {client}, votre traitement {medicament} arrive a son terme.", "KOFFI", "Awa", "P", "",
                        d));
    }
}
