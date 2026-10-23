package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import javax.json.bind.JsonbException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Journal du poste caisse 3 (03/09, 23/08, 26/08) : une donnee de saisie illisible DANS LE CORPS de la requete
 * (quantite decimale, texte a la place d'un nombre) donnait « erreur interne » et un incident au Centre de support.
 */
class CorpsIllisibleTest {

    /** Exception telle que Jersey la leve en lisant le corps de la requete (JsonBindingProvider.readFrom). */
    private static RuntimeException lectureDuCorps(JsonbException cause) {
        RuntimeException e = new javax.ws.rs.ProcessingException(cause);
        e.setStackTrace(new StackTraceElement[] { new StackTraceElement(
                "org.glassfish.jersey.jsonb.internal.JsonBindingProvider", "readFrom", "J.java", 77) });
        return e;
    }

    @Test
    @DisplayName("Propriete nommee, entier attendu : le message nomme le champ")
    void entierAttendu() {
        assertEquals("Valeur saisie invalide pour « qte » : un nombre entier est attendu.",
                SaisieInvalide.corpsIllisible(lectureDuCorps(new JsonbException(
                        "Unable to deserialize property 'qte' because of: Error deserialize JSON value into type: class java.lang.Integer."))));
    }

    @Test
    @DisplayName("Propriete nommee, autre type : le message nomme le champ")
    void autreType() {
        assertEquals("Valeur saisie invalide pour « dtStart ».",
                SaisieInvalide.corpsIllisible(lectureDuCorps(new JsonbException(
                        "Unable to deserialize property 'dtStart' because of: Error parsing class java.time.LocalDate"))));
    }

    @Test
    @DisplayName("Corps illisible sans propriete : message general")
    void sansPropriete() {
        assertEquals("Données envoyées illisibles : actualisez l'écran et recommencez.",
                SaisieInvalide.corpsIllisible(lectureDuCorps(new JsonbException("Internal error: null"))));
    }

    @Test
    @DisplayName("JsonbException hors lecture du corps (ecriture d'une reponse) : reste une erreur interne")
    void horsLecture() {
        assertNull(SaisieInvalide.corpsIllisible(new RuntimeException(new JsonbException("Internal error: null"))));
        assertNull(SaisieInvalide.corpsIllisible(new NullPointerException()));
    }
}
