package rest.service.impl.sauvegarde;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

/**
 * Horaires de la sauvegarde (retour du 12/11 : « je dois pouvoir definir les horaires plutot que chaque heure »).
 * Coherence : sur des milliers d'horaires et d'instants tires au hasard (graine fixe), exactement une sauvegarde par
 * horaire et par jour, aucune en dehors, precedente <= instant < suivante sans horaire entre les deux.
 */
class HorairesSauvegardeTest {

    private static final LocalDateTime J = LocalDateTime.of(2026, 11, 12, 0, 0);

    @Test
    void videGardeToutesLesHeuresAHh05CommeAvant() {
        HorairesSauvegarde h = HorairesSauvegarde.lire("");
        assertTrue(h.toutesLesHeures());
        assertEquals("", h.texte());
        int lancees = 0;
        for (LocalDateTime t = J; t.isBefore(J.plusDays(1)); t = t.plusMinutes(5)) {
            if (h.estDue(t)) {
                lancees++;
                assertEquals(5, t.getMinute());
            }
        }
        assertEquals(24, lancees);
        assertTrue(HorairesSauvegarde.lire(null).toutesLesHeures());
        assertEquals(LocalDateTime.of(2026, 11, 12, 13, 5), h.attendue(LocalDateTime.of(2026, 11, 12, 14, 20)));
    }

    @Test
    void midiEtSoir() {
        HorairesSauvegarde h = HorairesSauvegarde.lire("20:00, 12:00");
        assertEquals("12:00, 20:00", h.texte());
        assertEquals("à 12:00, à 20:00", h.libelle());
        List<LocalDateTime> lancees = new ArrayList<>();
        for (LocalDateTime t = J; t.isBefore(J.plusDays(2)); t = t.plusMinutes(5)) {
            if (h.estDue(t)) {
                lancees.add(t);
            }
        }
        assertEquals(4, lancees.size());
        assertEquals(LocalDateTime.of(2026, 11, 12, 12, 0), lancees.get(0));
        assertEquals(LocalDateTime.of(2026, 11, 13, 20, 0), lancees.get(3));
        // le planificateur peut passer quelques secondes apres l'heure
        assertTrue(h.estDue(LocalDateTime.of(2026, 11, 12, 12, 0, 7)));
        assertTrue(h.estDue(LocalDateTime.of(2026, 11, 12, 12, 4, 59)));
        assertFalse(h.estDue(LocalDateTime.of(2026, 11, 12, 12, 5)));
        assertEquals(LocalDateTime.of(2026, 11, 12, 20, 0), h.attendue(LocalDateTime.of(2026, 11, 12, 21, 30)));
        assertEquals(LocalDateTime.of(2026, 11, 12, 12, 0), h.attendue(LocalDateTime.of(2026, 11, 12, 20, 30)));
        assertEquals(LocalDateTime.of(2026, 11, 11, 20, 0), h.attendue(LocalDateTime.of(2026, 11, 12, 12, 30)));
        assertEquals(LocalDateTime.of(2026, 11, 13, 12, 0), h.suivante(LocalDateTime.of(2026, 11, 12, 20, 0)));
    }

    @Test
    void ecrituresAcceptees() {
        assertEquals("08:30, 12:00, 20:00", HorairesSauvegarde.lire("12h ; 20 h, 8h30").texte());
        assertEquals("07:05", HorairesSauvegarde.lire(" 7:05 ").texte());
        assertEquals("12:00", HorairesSauvegarde.lire("12, 12:00").texte());
    }

    @Test
    void ecrituresRefusees() {
        for (String s : new String[] { "midi", "24:00", "12:60", "12:07", "12:00, x", "-1" }) {
            assertNotNull(HorairesSauvegarde.erreur(s), s);
            assertTrue(HorairesSauvegarde.lire(s).toutesLesHeures(), "valeur illisible : toutes les heures, " + s);
        }
        assertNull(HorairesSauvegarde.erreur(""));
        assertNull(HorairesSauvegarde.erreur("0:00, 23:55"));
    }

    @Test
    void coherenceSurDesMilliersDeCas() {
        Random r = new Random(20261112L);
        for (int cas = 0; cas < 3000; cas++) {
            TreeSet<LocalTime> attendues = new TreeSet<>();
            int n = r.nextInt(6); // 0 : toutes les heures
            StringBuilder texte = new StringBuilder();
            for (int i = 0; i < n; i++) {
                LocalTime t = LocalTime.of(r.nextInt(24), 5 * r.nextInt(12));
                attendues.add(t);
                texte.append(i == 0 ? "" : (r.nextBoolean() ? ", " : ";"))
                        .append(r.nextBoolean() ? String.format("%02d:%02d", t.getHour(), t.getMinute())
                                : t.getHour() + "h" + (t.getMinute() == 0 ? "" : String.format("%02d", t.getMinute())));
            }
            assertNull(HorairesSauvegarde.erreur(texte.toString()), texte.toString());
            HorairesSauvegarde h = HorairesSauvegarde.lire(texte.toString());
            // relecture du texte range : memes horaires
            assertEquals(h.texte(), HorairesSauvegarde.lire(h.texte()).texte());
            int parJour = h.toutesLesHeures() ? 24 : attendues.size();
            LocalDateTime debut = J.plusDays(r.nextInt(400));
            int lancees = 0;
            for (LocalDateTime t = debut; t.isBefore(debut.plusDays(1)); t = t.plusMinutes(5)) {
                if (h.estDue(t.plusSeconds(r.nextInt(60)))) {
                    lancees++;
                    assertTrue(h.toutesLesHeures() ? t.getMinute() == 5 : attendues.contains(t.toLocalTime()));
                }
            }
            assertEquals(parJour, lancees, texte.toString());
            LocalDateTime instant = debut.plusMinutes(r.nextInt(3 * 24 * 60)).plusSeconds(r.nextInt(60));
            LocalDateTime avant = h.precedente(instant), apres = h.suivante(instant);
            assertFalse(avant.isAfter(instant));
            assertTrue(apres.isAfter(instant));
            assertTrue(h.estDue(avant) && h.estDue(apres));
            for (LocalDateTime t = avant.plusMinutes(5); t.isBefore(apres); t = t.plusMinutes(5)) {
                assertFalse(h.estDue(t), "aucune sauvegarde entre la precedente et la suivante");
            }
            assertFalse(h.attendue(instant).isAfter(instant.minusHours(1)));
        }
    }
}
