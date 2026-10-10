package rest.service.impl.retour;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class TableauRetourFournisseurTest {

    private static TableauRetourFournisseur exemple() {
        TableauRetourFournisseur t = new TableauRetourFournisseur();
        t.ajouter("2026-09", "R1", "P1", "111", "DOLIPRANE", "01", "COLIS AVARIE", 5, 5, 100);
        t.ajouter("2026-09", "R1", "P2", "222", "EFFERALGAN", "02", "COLIS OUVERT", 2, 0, 300);
        t.ajouter("2026-08", "R2", "P1", "111", "DOLIPRANE", "01", "COLIS AVARIE", 3, 1, 100);
        t.ajouter("2026-10", "R3", "P3", "333", "ASPIRINE", null, null, 8, 0, 50);
        t.ajouter("2026-10", "R3", "P2", "222", "EFFERALGAN", "01", "COLIS AVARIE", 1, 0, 300);
        return t;
    }

    @Test
    void totalEtMoisDansLOrdreChronologique() {
        JSONObject j = exemple().json(10);
        JSONObject total = j.getJSONObject("total");
        assertEquals(3, total.getInt("retours"));
        assertEquals(5, total.getInt("lignes"));
        assertEquals(19, total.getInt("quantite"));
        assertEquals(6, total.getInt("acceptee"));
        assertEquals(500 + 600 + 300 + 400 + 300, total.getLong("montant"));
        assertEquals(3, total.getInt("produits"));
        JSONArray mois = j.getJSONArray("mois");
        assertEquals("2026-08", mois.getJSONObject(0).getString("mois"));
        assertEquals("2026-09", mois.getJSONObject(1).getString("mois"));
        assertEquals(1, mois.getJSONObject(1).getInt("retours")); // R1 compte une fois pour deux lignes
        assertEquals(7, mois.getJSONObject(1).getInt("quantite"));
        assertEquals(9, mois.getJSONObject(2).getInt("quantite"));
    }

    @Test
    void produitsLesPlusRetournesParQuantite() {
        JSONArray p = exemple().json(2).getJSONArray("produits");
        assertEquals(2, p.length()); // limite demandee
        assertEquals("DOLIPRANE", p.getJSONObject(0).getString("libelle")); // 8, dans 2 retours
        assertEquals(2, p.getJSONObject(0).getInt("retours"));
        assertEquals("111", p.getJSONObject(0).getString("cip"));
        assertEquals("ASPIRINE", p.getJSONObject(1).getString("libelle")); // 8, dans 1 retour
    }

    @Test
    void motifsLesPlusUtilisesAvecLeurPart() {
        JSONArray m = exemple().json(10).getJSONArray("motifs");
        assertEquals("COLIS AVARIE", m.getJSONObject(0).getString("libelle"));
        assertEquals(3, m.getJSONObject(0).getInt("lignes"));
        assertEquals(60.0, m.getJSONObject(0).getDouble("part"), 1e-9);
        assertEquals(TableauRetourFournisseur.SANS_MOTIF, m.getJSONObject(1).getString("libelle")); // 8 unites
        assertEquals("COLIS OUVERT", m.getJSONObject(2).getString("libelle"));
        assertEquals(20.0, m.getJSONObject(2).getDouble("part"), 1e-9);
    }

    @Test
    void periodeVide() {
        JSONObject j = new TableauRetourFournisseur().json(10);
        assertEquals(0, j.getJSONObject("total").getInt("retours"));
        assertEquals(0, j.getJSONArray("mois").length());
        assertEquals(0, j.getJSONArray("motifs").length());
    }
}
