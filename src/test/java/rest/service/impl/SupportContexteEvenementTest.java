package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Calendar;
import java.util.Date;
import org.junit.jupiter.api.Test;

/**
 * Ce que le Centre de Support doit dire d'un incident pour qu'il soit analysable a distance : de quelle vente il
 * s'agit, dans quel etat elle etait, et le debut du detail technique meme quand le fichier log a disparu.
 */
class SupportContexteEvenementTest {

    private static Date le(int heure, int minute) {
        Calendar c = Calendar.getInstance();
        c.set(2026, Calendar.SEPTEMBER, 3, heure, minute, 0);
        return c.getTime();
    }

    @Test
    void contexteVenteClotureeNommeLaVenteSonEtatEtSonOperateur() {
        String texte = SupportEventServiceImpl.decrireVente("260903_00035", "is_Closed", le(21, 49), le(21, 50),
                "KOFFI ANNE");
        assertTrue(texte.contains("260903_00035"), texte);
        assertTrue(texte.contains("clôturée"), texte);
        assertTrue(texte.contains("créée le 03/09/2026 21:49"), texte);
        assertTrue(texte.contains("dernière écriture le 03/09/2026 21:50"), texte);
        assertTrue(texte.contains("KOFFI ANNE"), texte);
    }

    @Test
    void contexteVenteEnCoursEtValeursAbsentes() {
        assertTrue(SupportEventServiceImpl.decrireVente("260903_00051", "is_Process", null, null, null)
                .contains("en cours"));
        String sansRien = SupportEventServiceImpl.decrireVente(null, null, null, null, null);
        assertFalse(sansRien.contains("null"), sansRien);
        assertTrue(sansRien.contains("sans référence"), sansRien);
    }

    @Test
    void extraitDuDetailConserveEnBase() {
        assertNull(SupportEventServiceImpl.extraitStack(null));
        assertNull(SupportEventServiceImpl.extraitStack("   "));
        assertEquals("java.lang.NullPointerException\n\tat rest.Service.methode(Service.java:12)",
                SupportEventServiceImpl.extraitStack(
                        "\r\njava.lang.NullPointerException\r\n\tat rest.Service.methode(Service.java:12)\r\n"));
        StringBuilder longue = new StringBuilder();
        for (int i = 0; i < 500; i++) {
            longue.append("\tat rest.Service.methode(Service.java:12)\n");
        }
        assertTrue(SupportEventServiceImpl.extraitStack(longue.toString()).length() <= 4000);
    }
}
