package rest.service.impl.campagne;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Collections;
import org.junit.jupiter.api.Test;

class CampagnesTest {

    @Test
    void paques() {
        assertEquals(LocalDate.of(2024, 3, 31), Campagnes.paques(2024));
        assertEquals(LocalDate.of(2025, 4, 20), Campagnes.paques(2025));
        assertEquals(LocalDate.of(2026, 4, 5), Campagnes.paques(2026));
        assertEquals(LocalDate.of(2027, 3, 28), Campagnes.paques(2027));
        assertEquals(LocalDate.of(2038, 4, 25), Campagnes.paques(2038));
    }

    @Test
    void datesDesFetes() {
        assertEquals(LocalDate.of(2026, 8, 7), Campagnes.dateFete("FIXE", 8, 7, 0, 2026, null));
        assertEquals(LocalDate.of(2026, 5, 14), Campagnes.dateFete("PAQUES", null, null, 39, 2026, null), "Ascension");
        assertEquals(LocalDate.of(2026, 5, 25), Campagnes.dateFete("PAQUES", null, null, 50, 2026, null),
                "Lundi de Pentecôte");
        assertNull(Campagnes.dateFete("SAISIE", null, null, 0, 2026, Collections.emptyMap()));
        assertEquals(LocalDate.of(2026, 5, 27), Campagnes.dateFete("SAISIE", null, null, 0, 2026,
                Collections.singletonMap(2026, LocalDate.of(2026, 5, 27))));
    }

    @Test
    void anniversaires() {
        assertTrue(Campagnes.anniversaire(LocalDate.of(1980, 10, 14), LocalDate.of(2026, 10, 14)));
        assertFalse(Campagnes.anniversaire(LocalDate.of(1980, 10, 15), LocalDate.of(2026, 10, 14)));
        assertTrue(Campagnes.anniversaire(LocalDate.of(2000, 2, 29), LocalDate.of(2026, 2, 28)));
        assertFalse(Campagnes.anniversaire(LocalDate.of(2000, 2, 28), LocalDate.of(2028, 2, 29)));
        assertTrue(Campagnes.anniversaire(LocalDate.of(2000, 2, 29), LocalDate.of(2028, 2, 29)));
        assertFalse(Campagnes.anniversaire(LocalDate.of(2000, 2, 29), LocalDate.of(2028, 2, 28)));
        assertFalse(Campagnes.anniversaire(null, LocalDate.of(2026, 10, 14)));
        assertEquals(46, Campagnes.age(LocalDate.of(1980, 10, 14), LocalDate.of(2026, 10, 14)));
    }

    @Test
    void joignabilite() {
        /* regle actuelle : seul un refus bloque */
        assertNull(Campagnes.motifExclusion("SMS", null, null, false, true));
        assertEquals("A refusé les SMS", Campagnes.motifExclusion("SMS", false, null, false, true));
        assertEquals("Numéro absent ou invalide", Campagnes.motifExclusion("SMS", null, null, false, false));
        /* accord explicite seulement */
        assertEquals("Pas d'accord explicite", Campagnes.motifExclusion("SMS", null, null, true, true));
        assertNull(Campagnes.motifExclusion("SMS", true, null, true, true));
        /* WhatsApp avec repli SMS : un des deux suffit */
        assertNull(Campagnes.motifExclusion("SMS_WHATSAPP", false, null, false, true));
        assertEquals("A refusé WhatsApp et les SMS",
                Campagnes.motifExclusion("SMS_WHATSAPP", false, false, false, true));
        assertEquals("A refusé WhatsApp", Campagnes.motifExclusion("WHATSAPP", true, false, false, true));
        assertNull(Campagnes.motifExclusion("SMS_WHATSAPP", null, true, true, true));
    }

    @Test
    void textesEtCanaux() {
        assertNotNull(Campagnes.controlerTexte("  "));
        assertNotNull(Campagnes.controlerTexte(new String(new char[641]).replace('\0', 'a')));
        assertNull(Campagnes.controlerTexte("Bonjour"));
        assertEquals("SMS", Campagnes.canal("n'importe"));
        assertEquals("SMS_WHATSAPP", Campagnes.canal("sms_whatsapp"));
        assertEquals(Campagnes.Categorie.FETE, Campagnes.Categorie.de("fete"));
        assertNull(Campagnes.Categorie.de("X"));
    }
}
