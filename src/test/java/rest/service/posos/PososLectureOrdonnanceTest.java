package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Lecture d'une ordonnance scannee (30/09) : chaque forme de reponse acceptee sert de contrat. */
public class PososLectureOrdonnanceTest {

    @Test
    public void formeFrancaise() {
        JSONObject r = PososLectureOrdonnance.lire(new JSONObject("{\"produits\":[{\"nom\":\"Amoxicilline 250 mg\","
                + "\"posologie\":\"1 c. mes. matin et soir\",\"quantite\":2,\"duree\":\"7 j\",\"confiance\":0.93}],"
                + "\"patient\":{\"nom\":\"MORRISSON\",\"prenom\":\"Hanae\",\"age\":5},"
                + "\"prescripteur\":{\"nom\":\"KONE Ibrahim\"},\"dateOrdonnance\":\"2026-09-30\"}"));
        JSONObject p = r.getJSONArray("produits").getJSONObject(0);
        assertEquals("Amoxicilline 250 mg", p.getString("texte"));
        assertEquals("1 c. mes. matin et soir", p.getString("posologie"));
        assertEquals(2, p.getInt("quantite"));
        assertEquals(0.93, p.getDouble("confiance"), 1e-9);
        assertEquals("MORRISSON Hanae", r.getJSONObject("patient").getString("nom"));
        assertEquals(5, r.getJSONObject("patient").getInt("age"));
        assertEquals("KONE Ibrahim", r.getJSONObject("prescripteur").getString("nom"));
        assertEquals("2026-09-30", r.getString("dateOrdonnance"));
    }

    @Test
    public void formeAnglaiseEnveloppeeEtConfianceEnPourcent() {
        JSONObject r = PososLectureOrdonnance.lire(new JSONObject("{\"data\":{\"result\":{\"medications\":["
                + "{\"name\":\"Doliprane 2,4%\",\"dosage\":\"si fievre\",\"quantity\":\"1\",\"confidence\":62},"
                + "{\"label\":\"\"}, \"Humex rhume enfant\"],\"doctor\":{\"fullName\":\"Dr Kone\"}}}}"));
        JSONArray produits = r.getJSONArray("produits");
        assertEquals(2, produits.length());
        assertEquals(0.62, produits.getJSONObject(0).getDouble("confiance"), 1e-9);
        assertEquals(1, produits.getJSONObject(0).getInt("quantite"));
        assertEquals("Humex rhume enfant", produits.getJSONObject(1).getString("texte"));
        assertFalse(produits.getJSONObject(1).has("confiance"));
        assertEquals("Dr Kone", r.getJSONObject("prescripteur").getString("nom"));
    }

    @Test
    public void reponseVide() {
        JSONObject r = PososLectureOrdonnance.lire(new JSONObject("{}"));
        assertEquals(0, r.getJSONArray("produits").length());
        assertTrue(!r.has("patient") && !r.has("prescripteur"));
    }
}
