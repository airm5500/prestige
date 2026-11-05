package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.GraphicsEnvironment;
import java.awt.image.BufferedImage;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 03/11 : police du nouveau modele reglable dans « Modeles de ticket », cinq polices livrees avec Windows,
 * Segoe UI par defaut ; une police absente du poste retombe sur Arial Narrow.
 */
class TicketPoliceTest {

    private static final Set<String> INSTALLEES = new HashSet<>(
            Arrays.asList(GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames()));

    @Test
    void cinqPolicesArialNarrowParDefaut() {
        assertEquals(Arrays.asList("Segoe UI", "Arial Narrow", "Tahoma", "Calibri", "Verdana"), ReglagesTicket.POLICES);
        // retour du 05/11 : Arial Narrow pour un ticket jamais enregistre ; Segoe UI reste celle des reglages d'avant
        ReglagesTicket r = new ReglagesTicket(ModeleTicket.VENTE);
        assertEquals("Arial Narrow", r.police());
        assertEquals("Arial Narrow", r.json().getString("police"));
        assertEquals("Segoe UI",
                ReglagesTicket.depuis(ModeleTicket.VENTE, new org.json.JSONObject().put("modele", "NOUVEAU")).police());
    }

    @Test
    void policeLueEtRelue() {
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("police", "Tahoma"));
        assertEquals("Tahoma", r.police());
        assertEquals("Tahoma", ReglagesTicket.depuis(ModeleTicket.VENTE, r.json()).police());
        // valeur inconnue ou absente (reglages enregistres avant le 03/11) : le defaut
        assertEquals("Segoe UI",
                ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("police", "Comic Sans MS")).police());
        assertEquals("Segoe UI", ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject()).police());
    }

    @Test
    void policeAbsenteDuPosteRetombeSurArialNarrow() {
        assertEquals("Arial Narrow", RenduTicket.choisirPolice("Police Absente Du Poste", "Arial Narrow"));
        if (INSTALLEES.contains("Segoe UI")) {
            assertEquals("Segoe UI", RenduTicket.choisirPolice("Segoe UI", "Arial Narrow"));
        }
    }

    @Test
    void lApercuSuitLaPoliceChoisie() {
        BufferedImage segoe = apercu(ModeleTicket.VENTE_ASSURANCE, 80, "Segoe UI");
        BufferedImage arial = apercu(ModeleTicket.VENTE_ASSURANCE, 80, "Arial Narrow");
        if (INSTALLEES.contains("Segoe UI") && INSTALLEES.contains("Arial Narrow")) {
            assertFalse(memeImage(segoe, arial), "l'apercu doit changer avec la police");
        }
    }

    @Test
    void aucunDebordementQuelleQueSoitLaPolice() {
        for (String police : ReglagesTicket.POLICES) {
            for (ModeleTicket t : ModeleTicket.values()) {
                if (!t.nouveauDisponible()) {
                    continue;
                }
                for (int mm : new int[] { 80, 58 }) {
                    ReglagesTicket r = ReglagesTicket.depuis(t, new JSONObject().put("police", police));
                    RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
                    RenduTicket.apercu(ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r), r, mm, 1, res);
                    assertTrue(res[0].debordements.isEmpty(),
                            police + " " + t + " " + mm + " : " + res[0].debordements);
                }
            }
        }
    }

    private static BufferedImage apercu(ModeleTicket t, int mm, String police) {
        ReglagesTicket r = ReglagesTicket.depuis(t, new JSONObject().put("police", police));
        return RenduTicket.apercu(ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r), r, mm, 1,
                new RenduTicket.Resultat[1]);
    }

    private static boolean memeImage(BufferedImage a, BufferedImage b) {
        if (a.getWidth() != b.getWidth() || a.getHeight() != b.getHeight()) {
            return false;
        }
        for (int y = 0; y < a.getHeight(); y++) {
            for (int x = 0; x < a.getWidth(); x++) {
                if (a.getRGB(x, y) != b.getRGB(x, y)) {
                    return false;
                }
            }
        }
        return true;
    }
}
