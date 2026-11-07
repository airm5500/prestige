package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan du 06/11, point 1 : la date et l'heure du ticket restent a leur place, a cote du code-barres ; seule leur taille
 * se regle a part (« Taille de la date »), sans etre liee a celle du code-barres. Le bloc « Date du ticket » du 06/11
 * (place au-dessus du trait du pied) n'est plus rempli : une disposition enregistree qui le placait en haut ne fait
 * plus monter la date.
 */
class PiedDateSeparesTest {

    private static final String DATE = "02/11/2026 17:42";
    private static final ModeleTicket[] AVEC_CODE = { ModeleTicket.VENTE, ModeleTicket.VENTE_ASSURANCE,
            ModeleTicket.VENTE_DEPOT, ModeleTicket.PREVENTE };

    private static ReglagesTicket reglages(ModeleTicket t, int tailleDate, int taillePied, boolean dateEnHaut) {
        JSONObject j = new ReglagesTicket(t).json();
        JSONArray d = j.getJSONArray("disposition");
        JSONObject date = new JSONObject().put("bloc", TicketDocument.DATE).put("alignement", "").put("taille",
                tailleDate);
        if (dateEnHaut) {
            JSONArray a = new JSONArray().put(date);
            for (int i = 0; i < d.length(); i++) {
                a.put(d.get(i));
            }
            j.put("disposition", a);
            d = a;
        } else {
            d.put(date);
        }
        d.put(new JSONObject().put("bloc", TicketDocument.PIED).put("alignement", "").put("taille", taillePied));
        return ReglagesTicket.depuis(t, j);
    }

    private static RenduTicket.Resultat rendu(ModeleTicket t, int mm, ReglagesTicket r) {
        RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
        RenduTicket.apercu(ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r), r, mm, 1, res);
        return res[0];
    }

    @Test
    void laDateEstACoteDuCodeBarres() {
        for (ModeleTicket t : AVEC_CODE) {
            TicketDocument d = ConversionTicket.convertir(ExemplesTicket.exemple(t, 80), new ReglagesTicket(t));
            TicketDocument.Bloc pied = d.existant(TicketDocument.PIED);
            assertNotNull(pied, t.name());
            assertTrue(
                    pied.elements.stream()
                            .anyMatch(e -> e.genre == TicketDocument.Genre.PIED && String.valueOf(e.c).contains(DATE)),
                    t + " " + pied.elements);
            TicketDocument.Bloc date = d.existant(TicketDocument.DATE);
            assertTrue(date == null || date.vide(),
                    t + " : plus de bloc date a part " + (date == null ? "" : date.elements));
        }
        // ticket Z : « Édité le … » reste au pied
        TicketDocument z = ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.TICKET_Z, 80),
                new ReglagesTicket(ModeleTicket.TICKET_Z));
        assertTrue(
                z.existant(TicketDocument.PIED).elements.stream()
                        .anyMatch(e -> String.valueOf(e.a).startsWith("Édité le")),
                z.existant(TicketDocument.PIED).elements.toString());
    }

    @Test
    void dispositionEnregistreeAvecLaDateEnHaut() {
        for (ModeleTicket t : AVEC_CODE) {
            RenduTicket.Resultat r = rendu(t, 80, reglages(t, 2, 0, true));
            assertNull(r.zones.get(TicketDocument.DATE), t + " : la date ne monte plus en haut " + r.zones.keySet());
            assertTrue(r.policeDate > 0 && r.hauteurCodeBarres > 0, t.name());
        }
    }

    /** Toutes les paires de tailles de -3 a +3, quatre modeles, deux largeurs de papier. */
    @Test
    void lesTaillesSontIndependantes() {
        for (int mm : new int[] { 80, 58 }) {
            for (ModeleTicket t : AVEC_CODE) {
                RenduTicket.Resultat base = rendu(t, mm, reglages(t, 0, 0, false));
                for (int td = -3; td <= 3; td++) {
                    for (int tp = -3; tp <= 3; tp++) {
                        String cas = t + " " + mm + " mm, date " + td + ", code-barres " + tp;
                        RenduTicket.Resultat r = rendu(t, mm, reglages(t, td, tp, false));
                        RenduTicket.Resultat memePied = rendu(t, mm, reglages(t, 0, tp, false));
                        RenduTicket.Resultat memeDate = rendu(t, mm, reglages(t, td, 0, false));
                        assertEquals(memePied.hauteurCodeBarres, r.hauteurCodeBarres,
                                cas + " : le code-barres ne depend pas de la taille de la date");
                        assertEquals(memeDate.policeDate, r.policeDate,
                                cas + " : la date ne depend pas de la taille du code-barres");
                        assertEquals(Integer.signum(td), Integer.signum(r.policeDate - base.policeDate),
                                cas + " : la date suit son reglage");
                        assertEquals(Integer.signum(tp), Integer.signum(r.hauteurCodeBarres - base.hauteurCodeBarres),
                                cas + " : le code-barres suit son reglage");
                        assertTrue(r.debordements.isEmpty(), cas + " : " + r.debordements);
                    }
                }
            }
        }
    }

    @Test
    void uneDateTropGrandePasseSousLeCodeBarresSansEtreCoupee() {
        RenduTicket.Resultat petite = rendu(ModeleTicket.VENTE, 80, reglages(ModeleTicket.VENTE, 0, 0, false));
        assertFalse(petite.dateSousCodeBarres, "taille du modele : a cote du code-barres");
        RenduTicket.Resultat grande = rendu(ModeleTicket.VENTE, 58, reglages(ModeleTicket.VENTE, 3, 3, false));
        int[] z = grande.zones.get(TicketDocument.PIED);
        assertTrue(z[1] - z[0] > grande.hauteurCodeBarres, "le pied contient le code-barres et la date");
        assertTrue(grande.debordements.isEmpty(), grande.debordements.toString());
    }
}
