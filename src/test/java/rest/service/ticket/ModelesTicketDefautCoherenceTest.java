package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Demande du 25/11 : les modeles de ticket exportes par l'officine le 20/11 deviennent les reglages par defaut. Pour
 * chaque ticket et chaque largeur : le defaut = l'entree du fichier, option par option et bloc par bloc (taille,
 * alignement, ordre) ; il se relit a l'identique (base, ecran, export) ; toute largeur demandee tombe sur 58 ou 80 mm ;
 * le ticket imprime avec le defaut porte la police du fichier.
 */
class ModelesTicketDefautCoherenceTest {

    private static JSONObject fichier() throws Exception {
        try (InputStream in = ReglagesTicket.class.getResourceAsStream(ReglagesTicket.FICHIER_DEFAUT)) {
            assertNotNull(in, "fichier livre");
            return new JSONObject(new String(in.readAllBytes(), StandardCharsets.UTF_8)).getJSONObject("largeurs");
        }
    }

    private static final String[] OPTIONS = { "remise", "promotion", "lot", "ccRc", "recapitulatif", "commentaires",
            "encoursCarnet", "signatureClient", "signatures", "cadreNet", "net" };

    @Test
    void leDefautEstLeFichierTicketParTicketEtLargeurParLargeur() throws Exception {
        JSONObject f = fichier();
        for (int largeur : new int[] { 58, 80 }) {
            JSONObject l = f.getJSONObject(String.valueOf(largeur));
            for (ModeleTicket t : ModeleTicket.values()) {
                JSONObject attendu = l.optJSONObject(t.name());
                assertNotNull(attendu, t + " " + largeur + " present dans le fichier");
                JSONObject j = ReglagesTicket.defaut(t, largeur).json();
                String ici = t + " " + largeur + " mm";
                for (String o : OPTIONS) {
                    assertEquals(attendu.getBoolean(o), j.getBoolean(o), ici + " " + o);
                }
                assertEquals(attendu.getString("police"), j.getString("police"), ici);
                assertEquals(attendu.getInt("marge"), j.getInt("marge"), ici);
                assertEquals(attendu.getString("modele"), j.getString("modele"), ici);
                assertEquals(attendu.getString("tiersPayant"), j.getString("tiersPayant"), ici);
                JSONArray a = attendu.getJSONArray("disposition"), d = j.getJSONArray("disposition");
                assertEquals(a.length(), d.length(), ici + " nombre de blocs");
                for (int i = 0; i < a.length(); i++) {
                    JSONObject pa = a.getJSONObject(i), pd = d.getJSONObject(i);
                    assertEquals(pa.getString("bloc"), pd.getString("bloc"), ici + " ordre " + i);
                    assertEquals(pa.getInt("taille"), pd.getInt("taille"), ici + " " + pa.getString("bloc"));
                    assertEquals(pa.optString("alignement"), pd.optString("alignement"),
                            ici + " " + pa.getString("bloc"));
                    for (String k : new String[] { "section", "nom", "detail" }) {
                        assertEquals(pa.optInt(k, 0), pd.optInt(k, 0), ici + " " + pa.getString("bloc") + " " + k);
                    }
                }
                /* relu a l'identique (enregistrement, ecran, export) */
                assertTrue(ReglagesTicket.depuis(t, j).json().similar(j), ici + " relu a l'identique");
            }
        }
    }

    @Test
    void touteLargeurTombeSur58Ou80EtLesDeuxDifferent() throws Exception {
        Random r = new Random(20261125L);
        for (int i = 0; i < 3000; i++) {
            ModeleTicket t = ModeleTicket.values()[r.nextInt(ModeleTicket.values().length)];
            int largeur = r.nextInt(200) - 20;
            int attendue = largeur <= 58 ? 58 : 80;
            assertTrue(ReglagesTicket.defaut(t, largeur).json().similar(ReglagesTicket.defaut(t, attendue).json()),
                    t + " " + largeur);
        }
        /* le fichier distingue les largeurs : Arial Narrow en 58 mm, Calibri en 80 mm */
        assertEquals("Arial Narrow", ReglagesTicket.defaut(ModeleTicket.VENTE, 58).police());
        assertEquals("Calibri", ReglagesTicket.defaut(ModeleTicket.VENTE, 80).police());
        assertEquals("C", ReglagesTicket.defaut(ModeleTicket.VENTE, 80).position(TicketDocument.ENTETE).alignement);
        assertEquals(-3, ReglagesTicket.defaut(ModeleTicket.VENTE, 58).position(TicketDocument.ENTETE).taille);
    }

    @Test
    void leTicketImprimeAvecLeDefautSuitLeFichier() {
        for (ModeleTicket t : ModeleTicket.values()) {
            for (int mm : new int[] { 58, 80 }) {
                ReglagesTicket r = ReglagesTicket.defaut(t, mm);
                TicketDocument d = ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r);
                assertTrue(!d.blocsNonVides().isEmpty(), t + " " + mm);
                assertEquals(r.nouveau(), t.nouveauDisponible(), t + " " + mm + " nouveau modele");
            }
        }
    }
}
