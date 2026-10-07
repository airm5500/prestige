package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Modeles WhatsApp (retours du 07/10) : regles de Meta controlees avant la soumission. */
public class ModeleWhatsAppTest {

    private static ModeleWhatsApp bon() {
        ModeleWhatsApp m = new ModeleWhatsApp();
        m.nom = "rappel_traitement";
        m.langue = "fr";
        m.categorie = ModeleWhatsApp.UTILITY;
        m.entete = "Votre pharmacie";
        m.corps = "Bonjour {{1}}, votre traitement habituel sera prêt le {{2}}. À bientôt !";
        m.pied = "Répondez STOP pour ne plus recevoir";
        m.exemples = List.of("Awa", "12/10");
        m.boutons.add(new String[] { "QUICK_REPLY", "Merci" });
        return m;
    }

    @Test
    public void modeleConformeEtSoumission() {
        ModeleWhatsApp m = bon();
        assertTrue(m.erreurs().isEmpty(), m.erreurs().toString());
        JSONObject s = m.soumission();
        assertEquals("rappel_traitement", s.getString("name"));
        assertEquals(4, s.getJSONArray("components").length());
        assertEquals("Awa", s.getJSONArray("components").getJSONObject(1).getJSONObject("example")
                .getJSONArray("body_text").getJSONArray(0).getString(0));
    }

    @Test
    public void reglesDeMeta() {
        ModeleWhatsApp m = bon();
        m.nom = "Rappel Traitement";
        m.corps = "{{1}}, votre traitement {{3}}";
        m.exemples = List.of("Awa");
        m.pied = "Code {{1}}";
        m.boutons.add(new String[] { "URL", "Voir", "http://non-securise" });
        String t = String.join(" | ", m.erreurs());
        assertTrue(t.contains("minuscules"), t);
        assertTrue(t.contains("se suivre"), t);
        assertTrue(t.contains("commencer ni finir"), t);
        assertTrue(t.contains("Exemples"), t);
        assertTrue(t.contains("Pied : pas de variable"), t);
        assertTrue(t.contains("https://"), t);
    }

    @Test
    public void statutsLisibles() {
        assertEquals("Approuvé", ModeleWhatsApp.statutLisible("APPROVED"));
        assertEquals("Rejeté", ModeleWhatsApp.statutLisible("rejected"));
        assertEquals("Brouillon", ModeleWhatsApp.statutLisible(null));
    }
}
