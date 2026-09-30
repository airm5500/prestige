package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Date de naissance du patient (30/09) : lecture stricte, controles et age deduit. */
public class DateNaissanceTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 9, 30);

    @Test
    public void lecture() {
        assertEquals(LocalDate.of(1985, 3, 2), DateNaissance.lire("1985-03-02"));
        assertEquals(LocalDate.of(1985, 3, 2), DateNaissance.lire("02/03/1985"));
        assertEquals(LocalDate.of(1985, 3, 2), DateNaissance.lire("1985-03-02 00:00:00.0"));
        assertNull(DateNaissance.lire("2020-02-30"));
        assertNull(DateNaissance.lire("31/02/2020"));
        assertNull(DateNaissance.lire(""));
        assertNull(DateNaissance.lire(null));
    }

    @Test
    public void controles() {
        assertNull(DateNaissance.valider("", AUJOURDHUI));
        assertNull(DateNaissance.valider("2012-06-15", AUJOURDHUI));
        assertTrue(DateNaissance.valider("2026-10-01", AUJOURDHUI).contains("futur"));
        assertTrue(DateNaissance.valider("2020-02-30", AUJOURDHUI).contains("n'existe pas"));
        assertTrue(DateNaissance.valider("1890-01-01", AUJOURDHUI).contains("130"));
    }

    @Test
    public void ageRevolu() {
        assertEquals(14, DateNaissance.age(LocalDate.of(2012, 6, 15), AUJOURDHUI));
        assertEquals(41, DateNaissance.age(LocalDate.of(1985, 3, 2), AUJOURDHUI));
        assertEquals(0, DateNaissance.age(LocalDate.of(2026, 9, 1), AUJOURDHUI));
        /* La veille de l'anniversaire, l'annee n'est pas encore revolue. */
        assertEquals(40, DateNaissance.age(LocalDate.of(1985, 10, 1), AUJOURDHUI));
    }
}
