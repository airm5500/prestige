package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Test;

public class MessageModeleTest {

    private final Map<String, String> valeurs = MessageModele.valeurs("KOUASSI", "Aya", "DOLIPRANE 1G", "LA GRACE",
            "0708473750", "12/08/2026");

    @Test
    public void remplaceToutesLesVariables() {
        String modele = "Bonjour {client}, votre traitement {medicament} est disponible a {officine} ({telephone_officine}). Dernier achat : {dernier_achat}.";
        assertEquals("Bonjour KOUASSI Aya, votre traitement DOLIPRANE 1G est disponible a LA GRACE (0708473750)."
                + " Dernier achat : 12/08/2026.", MessageModele.personnaliser(modele, valeurs));
    }

    @Test
    public void casseEtEspacesTolerees_variableInconnueLaissee() {
        assertEquals("Aya KOUASSI {inconnue}", MessageModele.personnaliser("{ Prenom }  {NOM} {inconnue}", valeurs));
    }

    @Test
    public void valeurAbsenteDonneVide() {
        Map<String, String> sans = MessageModele.valeurs("KOUASSI", null, null, "LA GRACE", null, null);
        assertEquals("Bonjour KOUASSI, produit disponible.",
                MessageModele.personnaliser("Bonjour {client}, produit {medicament} disponible.", sans));
        assertEquals("", MessageModele.personnaliser(null, sans));
    }

    @Test
    public void detecteLUsageDUneVariable() {
        assertTrue(MessageModele.utilise("Rappel {Medicament}", "medicament"));
        assertFalse(MessageModele.utilise("Bonjour {client}", "medicament"));
    }
}
