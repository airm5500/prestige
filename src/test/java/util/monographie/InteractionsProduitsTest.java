package util.monographie;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class InteractionsProduitsTest {

    private static JSONObject doliprane() throws Exception {
        try (InputStream in = InteractionsProduitsTest.class.getResourceAsStream("/monographie/qPX_506504_3.html")) {
            return FichePharmagora.lireFiche(new String(in.readAllBytes(), StandardCharsets.ISO_8859_1), 3);
        }
    }

    /** Fiche minimale d'un produit dont la classe est donnee (sans interactions propres). */
    private static JSONObject classe(String nom) {
        return new JSONObject().put("interactions",
                new JSONArray().put(new JSONObject().put("classe", nom).put("avec", new JSONArray())));
    }

    @Test
    void paracetamolEtAntivitamineK() throws Exception {
        JSONArray a = InteractionsProduits
                .alertes(List.of(new InteractionsProduits.Produit("P1", "DOLIPRANE 500", doliprane()),
                        new InteractionsProduits.Produit("P2", "PREVISCAN", classe("Antivitamines K"))));
        assertEquals(1, a.length());
        JSONObject x = a.getJSONObject(0);
        assertEquals("Précaution d'emploi", x.getString("niveau"));
        assertEquals("DOLIPRANE 500", x.getString("nomA"));
        assertEquals("PREVISCAN", x.getString("nomB"));
        assertTrue(x.getString("conseilDispensateur").contains("INR"));
    }

    @Test
    void triParGraviteSansDoublonEtAccentsPerdus() throws Exception {
        JSONObject flucloxacilline = new JSONObject().put("interactions",
                new JSONArray().put(new JSONObject().put("classe", "Flucloxacilline")
                        /* la meme interaction vue de l'autre cote, avec l'accent present */
                        .put("avec", new JSONArray().put(new JSONObject().put("classe", "Paracétamol")
                                .put("niveau", "Association déconseillée").put("gravite", 3)))));
        JSONArray a = InteractionsProduits
                .alertes(List.of(new InteractionsProduits.Produit("P1", "DOLIPRANE", doliprane()),
                        new InteractionsProduits.Produit("P3", "FLUCLOXACILLINE", flucloxacilline),
                        new InteractionsProduits.Produit("P2", "AVK", classe("Antivitamines K"))));
        assertEquals(2, a.length(), a.toString());
        assertEquals(3, a.getJSONObject(0).getInt("gravite"));
        assertEquals(2, a.getJSONObject(1).getInt("gravite"));
    }

    @Test
    void rienSansInteractionNiFiche() throws Exception {
        assertEquals(0,
                InteractionsProduits.alertes(List.of(new InteractionsProduits.Produit("P1", "DOLIPRANE", doliprane()),
                        new InteractionsProduits.Produit("P2", "VITAMINE C", classe("Vitamines")),
                        new InteractionsProduits.Produit("P4", "SANS FICHE", null))).length());
        assertTrue(InteractionsProduits.memeClasse("Parac?tamol", "Paracétamol"));
        assertFalse(InteractionsProduits.memeClasse("Paracetamol", "Paracetamole"));
    }
}
