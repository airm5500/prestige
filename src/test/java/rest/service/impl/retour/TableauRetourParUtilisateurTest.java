package rest.service.impl.retour;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 29/10 (point 1) : retours fournisseurs par utilisateur, nombre et pourcentage. */
class TableauRetourParUtilisateurTest {

    private static void ligne(TableauRetourFournisseur t, String retour, String user, String nom, int qte) {
        t.ajouter("2026-10", retour, "P1", "1234567", "PRODUIT", "M1", "Perime", qte, 0, 100);
        t.utilisateur(retour, user, nom, qte, 0, qte * 100L);
    }

    @Test
    @DisplayName("Nombre de retours par utilisateur et part du total des retours, du plus grand au plus petit")
    void parUtilisateur() {
        TableauRetourFournisseur t = new TableauRetourFournisseur();
        ligne(t, "R1", "U1", "KOUASSI A", 2);
        ligne(t, "R1", "U1", "KOUASSI A", 1); // meme retour, deux lignes
        ligne(t, "R2", "U1", "KOUASSI A", 1);
        ligne(t, "R3", "U2", "YAO B", 5);
        JSONArray u = t.json(10).getJSONArray("utilisateurs");
        assertEquals(2, u.length());
        JSONObject a = u.getJSONObject(0);
        assertEquals("KOUASSI A", a.getString("libelle"));
        assertEquals(2, a.getInt("retours"));
        assertEquals(3, a.getInt("lignes"));
        assertEquals(66.7, a.getDouble("part"), 0.001);
        JSONObject b = u.getJSONObject(1);
        assertEquals("YAO B", b.getString("libelle"));
        assertEquals(1, b.getInt("retours"));
        assertEquals(33.3, b.getDouble("part"), 0.001);
    }

    @Test
    @DisplayName("Utilisateur inconnu ; aucune ligne : liste vide")
    void casLimites() {
        TableauRetourFournisseur t = new TableauRetourFournisseur();
        assertEquals(0, t.json(10).getJSONArray("utilisateurs").length());
        ligne(t, "R1", null, null, 1);
        assertEquals("Inconnu", t.json(10).getJSONArray("utilisateurs").getJSONObject(0).getString("libelle"));
        assertEquals(100.0, t.json(10).getJSONArray("utilisateurs").getJSONObject(0).getDouble("part"), 0.001);
    }
}
