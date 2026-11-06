package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Cas 4, lot 4.C : rappel de l'essai de restauration mensuel ({@link SecuriteBaseService#rappelEssai}), verifie par une
 * regle ecrite a part sur des milliers de dates tirees au hasard (graine fixe), plus les cas limites (vide, illisible,
 * pile un mois).
 */
class EssaiRestaurationRappelTest {

    static final DateTimeFormatter F = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** Regle de reference : rappel si plus d'un mois civil s'est ecoule. */
    static boolean reference(LocalDateTime essai, LocalDateTime maintenant) {
        return essai.plusMonths(1).isBefore(maintenant);
    }

    @Test
    void milliersDeDates() {
        Random r = new Random(20261106L);
        LocalDateTime maintenant = LocalDateTime.of(2026, 11, 6, 10, 30);
        int rappels = 0;
        for (int i = 0; i < 5000; i++) {
            LocalDateTime essai = maintenant.minusMinutes(r.nextInt(120 * 24 * 60));
            boolean attendu = reference(essai, maintenant);
            assertEquals(attendu, SecuriteBaseService.rappelEssai(essai.format(F), maintenant),
                    "cas " + i + " : " + essai);
            assertEquals(essai.plusMonths(1).format(F).substring(0, 10),
                    SecuriteBaseService.prochainEssai(essai.format(F)));
            rappels += attendu ? 1 : 0;
        }
        assertTrue(rappels > 1000 && rappels < 4000, "jeu varié : " + rappels + " rappels sur 5000");
    }

    @Test
    void casLimites() {
        LocalDateTime maintenant = LocalDateTime.of(2026, 11, 6, 10, 30);
        assertTrue(SecuriteBaseService.rappelEssai(null, maintenant), "jamais");
        assertTrue(SecuriteBaseService.rappelEssai("", maintenant));
        assertTrue(SecuriteBaseService.rappelEssai("hier", maintenant), "illisible : on rappelle");
        assertFalse(SecuriteBaseService.rappelEssai("2026-10-06 10:30", maintenant), "pile un mois : pas encore");
        assertTrue(SecuriteBaseService.rappelEssai("2026-10-06 10:29", maintenant), "une minute de plus");
        assertFalse(SecuriteBaseService.rappelEssai("2026-11-06 09:00", maintenant), "ce matin");
        assertEquals("", SecuriteBaseService.prochainEssai(null));
        assertEquals("2026-12-06", SecuriteBaseService.prochainEssai("2026-11-06 09:00"));
    }
}
