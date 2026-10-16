package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class NumeroBadgeTest {

    @Test
    void prefixeTireDuNomDeLOfficine() {
        assertEquals("PGB", NumeroBadge.prefixe("PHIE DE GBOGUHE SARL-U"));
        assertEquals("PGB", NumeroBadge.prefixe("Pharmacie de Gboguhé"));
        assertEquals("PSM", NumeroBadge.prefixe("PHARMACIE SAINTE MARIE"));
        assertEquals("PRO", NumeroBadge.prefixe("Pharmacie Rosiers"));
        assertEquals("CPM", NumeroBadge.prefixe("Centre de la Paix Médical"));
        assertEquals("ABI", NumeroBadge.prefixe("ABIDJAN"));
        assertEquals("BDG", NumeroBadge.prefixe(""));
        assertEquals("BDG", NumeroBadge.prefixe(null));
        assertEquals("BDG", NumeroBadge.prefixe("SARL"));
    }

    @Test
    void numeroEtLettreDeControle() {
        String n = NumeroBadge.numero("PGB", 2026, 17);
        assertTrue(n.matches("PGB-26-00017-[A-Z]"), n);
        assertTrue(NumeroBadge.valide(n));
        assertFalse(NumeroBadge.valide(n.replace("00017", "00071")), "chiffres inverses detectes");
        assertFalse(NumeroBadge.valide(n.replace("00017", "00018")), "chiffre faux detecte");
        assertFalse(NumeroBadge.valide("BDG00001"));
        assertFalse(NumeroBadge.valide(null));
        assertFalse(n.contains("I") || n.substring(n.length() - 1).matches("[IOQ]"));
    }
}
