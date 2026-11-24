package util.horloge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Cahier des charges du 24/11, point 1 : dates futures refusées au serveur (date de règlement d'un différé,
 * modification de la date d'une vente). Avant, seul l'écran les bornait (maxValue du calendrier) : un appel direct ou
 * un poste dont l'horloge avançait les laissait passer. La date de référence est l'heure réelle suivie par le serveur.
 */
class DatesFuturesTest {

    private static final LocalDateTime MAINTENANT = LocalDateTime.of(2026, 11, 24, 10, 30);

    @Test
    void jourDeReglement() {
        LocalDate auj = MAINTENANT.toLocalDate();
        assertNull(DatesFutures.refusJour(auj, auj, "règlement"));
        assertNull(DatesFutures.refusJour(auj.minusDays(400), auj, "règlement"));
        String m = DatesFutures.refusJour(auj.plusDays(1), auj, "règlement");
        assertTrue(m != null && m.contains("25/11/2026") && m.contains("24/11/2026"), m);
        assertTrue(DatesFutures.refusJour(LocalDate.of(2189, 1, 1), auj, "règlement") != null);
        assertTrue(DatesFutures.refusJour(null, auj, "règlement") != null, "date absente refusée");
    }

    @Test
    void dateEtHeureDeVente() {
        assertNull(DatesFutures.refusInstant(MAINTENANT, MAINTENANT, "vente"));
        assertNull(DatesFutures.refusInstant(MAINTENANT.plusSeconds(59), MAINTENANT, "vente"), "minute en cours");
        assertNull(DatesFutures.refusInstant(MAINTENANT.minusDays(3), MAINTENANT, "vente"));
        assertTrue(DatesFutures.refusInstant(MAINTENANT.plusMinutes(2), MAINTENANT, "vente") != null);
        assertTrue(DatesFutures.refusInstant(MAINTENANT.plusDays(1).withHour(0), MAINTENANT, "vente") != null);
        assertTrue(DatesFutures.refusInstant(null, MAINTENANT, "vente") != null);
    }

    @Test
    void lecture() {
        assertEquals(LocalDate.of(2026, 11, 24), DatesFutures.jour("2026-11-24"));
        assertEquals(LocalDate.of(2026, 11, 24), DatesFutures.jour("24/11/2026"));
        assertEquals(LocalDate.of(2026, 11, 24), DatesFutures.jour("2026-11-24T00:00:00"));
        assertNull(DatesFutures.jour("pas une date"));
        assertNull(DatesFutures.jour(null));
        assertEquals(LocalDateTime.of(2026, 11, 24, 9, 5), DatesFutures.instant("2026-11-24", "09:05"));
        assertEquals(LocalDateTime.of(2026, 11, 24, 9, 5, 7), DatesFutures.instant("2026-11-24", "09:05:07"));
        assertNull(DatesFutures.instant("2026-11-24", "25:00"));
    }

    /** Milliers de dates tirées : refusée si et seulement si après la référence. */
    @Test
    void coherence() {
        Random r = new Random(20261124L);
        for (int i = 0; i < 20000; i++) {
            LocalDate ref = LocalDate.of(2020, 1, 1).plusDays(r.nextInt(3650));
            LocalDate d = ref.plusDays(r.nextInt(41) - 20);
            assertEquals(d.isAfter(ref), DatesFutures.refusJour(d, ref, "x") != null, d + " / " + ref);
            LocalDateTime refI = ref.atTime(r.nextInt(24), r.nextInt(60));
            LocalDateTime s = refI.plusSeconds(r.nextInt(7201) - 3600);
            assertEquals(s.isAfter(refI.withSecond(59)), DatesFutures.refusInstant(s, refI, "x") != null,
                    s + " / " + refI);
        }
        assertFalse(DatesFutures.refusJour(LocalDate.MIN, LocalDate.of(2026, 1, 1), "x") != null);
    }
}
