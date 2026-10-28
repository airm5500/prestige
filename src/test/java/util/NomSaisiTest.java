package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 28/10 (point 20) : noms de client et designations de produit. */
class NomSaisiTest {

    @Test
    @DisplayName("Espaces de bord retires, espaces consecutifs reduits a un seul")
    void normaliser() {
        assertEquals("KONAN AYA", NomSaisi.normaliser("  KONAN    AYA  "));
        assertEquals("DOLIPRANE 1000 MG CPR", NomSaisi.normaliser("DOLIPRANE  1000\tMG \n CPR "));
        assertEquals("", NomSaisi.normaliser("   "));
        assertNull(NomSaisi.normaliser(null));
        assertEquals("A B", NomSaisi.normaliser("A B"));
    }

    @Test
    @DisplayName("Saisie a la vente : majuscules et espaces normalises")
    void majuscules() {
        assertEquals("KONAN AYA", rest.Majuscules.texte("  konan   aya "));
    }
}
