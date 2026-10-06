package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/** Controles de saisie a l'enregistrement (07/10). */
public class ControleSaisieTest {

    @Test
    public void montant() {
        assertNull(ControleSaisie.montant("Prix", null));
        assertNull(ControleSaisie.montant("Prix", ""));
        assertNull(ControleSaisie.montant("Prix", " 1500 "));
        assertNull(ControleSaisie.montant("Prix", "0"));
        assertEquals("Prix invalide : « abc » (nombre entier attendu).", ControleSaisie.montant("Prix", "abc"));
        assertEquals("Prix ne peut pas être négatif (-5).", ControleSaisie.montant("Prix", "-5"));
        assertTrue(ControleSaisie.montant("Prix", "99999999999999").startsWith("Prix démesuré"));
        assertTrue(ControleSaisie.montant("Prix", "12.5").startsWith("Prix invalide"));
    }

    @Test
    public void longueurEtDate() {
        assertNull(ControleSaisie.longueur("Nom", "abc", 3));
        assertNull(ControleSaisie.longueur("Nom", null, 3));
        assertEquals("Nom trop long : 4 caractères, 3 au plus.", ControleSaisie.longueur("Nom", "abcd", 3));
        assertNull(ControleSaisie.date("Date", "2026-02-28"));
        assertNull(ControleSaisie.date("Date", ""));
        assertEquals("Date invalide : « 2026-02-31 ».", ControleSaisie.date("Date", "2026-02-31"));
        assertEquals("Date invalide : « abc ».", ControleSaisie.date("Date", "abc"));
        assertEquals("b", ControleSaisie.premier(null, "b", "c"));
        assertNull(ControleSaisie.premier(null, null));
    }
}
