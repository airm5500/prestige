package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.Test;

/**
 * Retour du 30/09 : renouvellements d'ordonnance (nouvelle ordonnance liee) et rappel SMS par le module existant.
 */
public class RenouvellementOrdonnanceTest {

    private static final LocalDate J = LocalDate.of(2026, 9, 30);

    @Test
    public void saisieDesRenouvellements() {
        assertNull(RenouvellementOrdonnance.valider(0, null), "non renouvelable : pas de periodicite");
        assertNull(RenouvellementOrdonnance.valider(2, 30));
        assertTrue(RenouvellementOrdonnance.valider(2, null).contains("tous les combien de jours"));
        assertTrue(RenouvellementOrdonnance.valider(2, 0).contains("tous les combien de jours"));
        assertTrue(RenouvellementOrdonnance.valider(13, 30).contains("0 à 12"));
        assertTrue(RenouvellementOrdonnance.valider(-1, 30).contains("0 à 12"));
    }

    @Test
    public void echeanceDepuisLaDerniereDelivrance() {
        assertEquals(LocalDate.of(2026, 10, 30), RenouvellementOrdonnance.prochaine(2, 0, J, 30));
        assertEquals(LocalDate.of(2026, 10, 30), RenouvellementOrdonnance.prochaine(2, 1, J, 30),
                "un renouvellement servi le 30/09 : le suivant compte depuis lui");
        assertNull(RenouvellementOrdonnance.prochaine(2, 2, J, 30), "tout est fait");
        assertNull(RenouvellementOrdonnance.prochaine(0, 0, J, 30), "non renouvelable");
        assertNull(RenouvellementOrdonnance.prochaine(2, 0, J, null));
    }

    @Test
    public void aRenouvelerDansLaSemaine() {
        assertTrue(RenouvellementOrdonnance.aRenouveler(J.plusDays(7), J, 7));
        assertTrue(RenouvellementOrdonnance.aRenouveler(J.minusDays(3), J, 7), "echeance depassee");
        assertFalse(RenouvellementOrdonnance.aRenouveler(J.plusDays(8), J, 7));
        assertFalse(RenouvellementOrdonnance.aRenouveler(null, J, 7));
    }

    @Test
    public void unRappelParRenouvellement() {
        LocalDate echeance = J.plusDays(2);
        assertTrue(RenouvellementOrdonnance.aRappeler(2, 0, 0, echeance, J, 2), "a 2 jours : on rappelle");
        assertFalse(RenouvellementOrdonnance.aRappeler(2, 0, 0, echeance, J, 1), "trop tot");
        assertFalse(RenouvellementOrdonnance.aRappeler(2, 0, 1, echeance, J, 2), "rang 1 deja rappele");
        assertTrue(RenouvellementOrdonnance.aRappeler(2, 1, 1, echeance, J, 2), "rang 2 pas encore rappele");
        assertFalse(RenouvellementOrdonnance.aRappeler(2, 2, 1, echeance, J, 2), "plus rien a renouveler");
        assertTrue(RenouvellementOrdonnance.aRappeler(2, 0, 0, J.minusDays(5), J, 2),
                "echeance passee, jamais rappele");
    }

    @Test
    public void libelles() {
        assertEquals("Renouvellement 1/2", RenouvellementOrdonnance.libelle(1, 2, 1));
        assertEquals("0/2 renouvellement(s) fait(s)", RenouvellementOrdonnance.libelle(0, 2, 0));
        assertEquals("", RenouvellementOrdonnance.libelle(0, 0, 0));
    }

    @Test
    public void texteDuRappelDepuisLeModeleDeLOfficine() {
        String t = OrdonnanceRenouvellementService.message(
                "Bonjour {client}, votre traitement {medicament} arrive a son terme. Il est disponible a la pharmacie {officine}.",
                "KOUA", "AYA", Arrays.asList("DOLIPRANE 1G", "AMOXICILLINE 500", "VITAMINE C"), "PHCIE DE ZAZA",
                "0102030405", J.plusDays(2));
        assertEquals("Bonjour KOUA AYA, votre traitement DOLIPRANE 1G, AMOXICILLINE 500… arrive a son terme. Il est"
                + " disponible a la pharmacie PHCIE DE ZAZA.", t);
        String defaut = OrdonnanceRenouvellementService.message(null, "KOUA", "AYA", Collections.emptyList(), "ZAZA",
                "", J.plusDays(2));
        assertTrue(defaut.contains("02/10/2026") && defaut.contains("KOUA AYA") && defaut.contains("ZAZA"), defaut);
    }
}
