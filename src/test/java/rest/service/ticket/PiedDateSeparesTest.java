package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 06/11 : le code-barres et la date du ticket sont deux blocs distincts (« Code-barres » et « Date du ticket
 * »), chacun avec sa taille et son alignement dans « Modèles de ticket ». Agrandir l'un ne change pas l'autre.
 */
class PiedDateSeparesTest {

    private static final String DATE = "02/11/2026 17:42";

    private static TicketDocument doc(ModeleTicket t, ReglagesTicket r) {
        return ConversionTicket.convertir(ExemplesTicket.exemple(t, 80), r);
    }

    /** Hauteur dessinee de chaque bloc, avec les tailles donnees pour la date et le code-barres. */
    private static int[] hauteurs(ModeleTicket t, int tailleDate, int taillePied) {
        JSONObject j = new ReglagesTicket(t).json();
        JSONArray d = j.getJSONArray("disposition");
        d.put(new JSONObject().put("bloc", TicketDocument.DATE).put("alignement", "").put("taille", tailleDate));
        d.put(new JSONObject().put("bloc", TicketDocument.PIED).put("alignement", "").put("taille", taillePied));
        ReglagesTicket r = ReglagesTicket.depuis(t, j);
        RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
        RenduTicket.apercu(doc(t, r), r, 80, 1, res);
        int[] zd = res[0].zones.get(TicketDocument.DATE);
        int[] zp = res[0].zones.get(TicketDocument.PIED);
        assertNotNull(zd, t + " : pas de bloc date");
        assertNotNull(zp, t + " : pas de bloc code-barres");
        return new int[] { zd[1] - zd[0], zp[1] - zp[0] };
    }

    @Test
    void laDateEstDansSonBlocEtPlusACoteDuCodeBarres() {
        for (ModeleTicket t : new ModeleTicket[] { ModeleTicket.VENTE, ModeleTicket.VENTE_ASSURANCE,
                ModeleTicket.VENTE_DEPOT, ModeleTicket.PREVENTE }) {
            TicketDocument d = doc(t, new ReglagesTicket(t));
            TicketDocument.Bloc date = d.existant(TicketDocument.DATE);
            assertNotNull(date, t.name());
            assertTrue(date.elements.stream().anyMatch(e -> String.valueOf(e.a).contains(DATE)),
                    t + " " + date.elements);
            TicketDocument.Bloc pied = d.existant(TicketDocument.PIED);
            assertTrue(pied.elements.stream().filter(e -> e.genre == TicketDocument.Genre.PIED)
                    .allMatch(e -> e.c == null || e.c.isEmpty()), t + " " + pied.elements);
        }
    }

    @Test
    void laDateVientJusteAvantLeCodeBarresQuiResteLeDernier() {
        List<String> o = RenduTicket.ordre(new ReglagesTicket(ModeleTicket.VENTE));
        assertEquals(TicketDocument.PIED, o.get(o.size() - 1), o.toString());
        assertEquals(TicketDocument.DATE, o.get(o.size() - 2), o.toString());
        assertEquals("Date du ticket", TicketDocument.libelle(TicketDocument.DATE));
        assertTrue(ReglagesTicket.BLOCS_COMMUNS.contains(TicketDocument.DATE), "réglage commun à tous les tickets");
    }

    @Test
    void lesTaillesSontIndependantes() {
        for (ModeleTicket t : new ModeleTicket[] { ModeleTicket.VENTE, ModeleTicket.VENTE_ASSURANCE }) {
            int[] base = hauteurs(t, 0, 0);
            int[] dateGrande = hauteurs(t, 3, 0);
            int[] piedGrand = hauteurs(t, 0, 3);
            assertTrue(dateGrande[0] > base[0], t + " : la date grandit " + base[0] + " -> " + dateGrande[0]);
            assertEquals(base[1], dateGrande[1], t + " : le code-barres ne bouge pas quand la date grandit");
            assertTrue(piedGrand[1] > base[1], t + " : le code-barres grandit " + base[1] + " -> " + piedGrand[1]);
            assertEquals(base[0], piedGrand[0], t + " : la date ne bouge pas quand le code-barres grandit");
        }
    }
}
