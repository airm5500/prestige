package rest.service.impl;

import java.time.LocalDate;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import util.PeriodesCa;

/** Taux d'evolution, total general et series des graphiques de l'analyse comparative (retour des tests du 09/09). */
public class AnalyseBalanceTest {

    private static JSONObject ligne(String libelle, long ventes, long net, long especes, long orange) {
        return new JSONObject().put("libelle", libelle).put("nbreVente", ventes).put("montantNet", net)
                .put("montantTTC", net).put("montantMobile", orange)
                .put("parModes", new JSONObject().put("1", especes).put("7", orange));
    }

    @Test
    public void evolutionsEtTotal() {
        JSONArray lignes = new JSONArray().put(ligne("06/2026", 100, 200000, 150000, 50000))
                .put(ligne("07/2026", 110, 250000, 150000, 100000)).put(ligne("08/2026", 55, 125000, 0, 0));
        JSONObject total = AnalyseBalance.evolutionsEtTotal(lignes, List.of("nbreVente", "montantNet", "montantTTC"),
                List.of("1", "7"));
        // premiere ligne : pas d'evolution
        assertTrue(lignes.getJSONObject(0).getJSONObject("evolutions").isNull("montantNet"));
        // 200 000 -> 250 000 : +25 % ; 100 -> 110 ventes : +10 %
        assertEquals(25.0, lignes.getJSONObject(1).getJSONObject("evolutions").getDouble("montantNet"), 0.001);
        assertEquals(10.0, lignes.getJSONObject(1).getJSONObject("evolutions").getDouble("nbreVente"), 0.001);
        // par mode : especes stables (0 %), ORANGE double (+100 %)
        JSONObject modes = lignes.getJSONObject(1).getJSONObject("evolutions").getJSONObject("parModes");
        assertEquals(0.0, modes.getDouble("1"), 0.001);
        assertEquals(100.0, modes.getDouble("7"), 0.001);
        assertEquals(100.0, lignes.getJSONObject(1).getJSONObject("evolutions").getDouble("montantMobile"), 0.001);
        // 250 000 -> 125 000 : -50 % ; une valeur precedente nulle ne donne pas de taux
        assertEquals(-50.0, lignes.getJSONObject(2).getJSONObject("evolutions").getDouble("montantNet"), 0.001);
        assertEquals(-100.0,
                lignes.getJSONObject(2).getJSONObject("evolutions").getJSONObject("parModes").getDouble("7"), 0.001);
        // total general
        assertEquals(265, total.getLong("nbreVente"));
        assertEquals(575000, total.getLong("montantNet"));
        assertEquals(300000, total.getJSONObject("parModes").getLong("1"));
        assertEquals(150000, total.getLong("montantMobile"));
        // panier moyen du total = chiffre / ventes, pas la somme des paniers
        assertEquals(Math.round(575000D / 265), total.getLong("panierMoyen"));
    }

    @Test
    public void graphiqueTroisAnnees() {
        List<PeriodesCa.Tranche> tranches = PeriodesCa.tranches(PeriodesCa.Type.TROIS_ANS, null, null,
                LocalDate.of(2026, 9, 9));
        JSONArray jours = new JSONArray().put(new JSONObject().put("jour", "2024-03-10").put("montantNet", 1000))
                .put(new JSONObject().put("jour", "2024-03-20").put("montantNet", 500))
                .put(new JSONObject().put("jour", "2025-12-31").put("montantNet", 700))
                .put(new JSONObject().put("jour", "2026-01-02").put("montantNet", 300));
        JSONObject g = AnalyseBalance.graphique(PeriodesCa.Type.TROIS_ANS, tranches, new JSONArray(), jours);
        assertEquals("ANNEES", g.getString("type"));
        assertEquals(12, g.getJSONArray("categories").length());
        assertEquals("Janv", g.getJSONArray("categories").getString(0));
        // une serie par annee : 2023, 2024, 2025 completes + 2026 en cours
        assertEquals(4, g.getJSONArray("series").length());
        JSONObject s2024 = g.getJSONArray("series").getJSONObject(1);
        assertTrue(s2024.getString("libelle").contains("2024"));
        assertEquals(1500, s2024.getJSONArray("valeurs").getLong(2)); // mars
        assertEquals(700, g.getJSONArray("series").getJSONObject(2).getJSONArray("valeurs").getLong(11));
        JSONObject s2026 = g.getJSONArray("series").getJSONObject(3);
        assertTrue(s2026.getBoolean("enCours"));
        assertEquals(300, s2026.getJSONArray("valeurs").getLong(0));
    }

    @Test
    public void graphiqueTroisSemaines() {
        // le 9 septembre 2026 est un mercredi : semaine en cours du lundi 7
        List<PeriodesCa.Tranche> tranches = PeriodesCa.tranches(PeriodesCa.Type.TROIS_SEMAINES, null, null,
                LocalDate.of(2026, 9, 9));
        JSONArray jours = new JSONArray().put(new JSONObject().put("jour", "2026-08-18").put("montantNet", 900)) // mardi
                                                                                                                 // S-3
                .put(new JSONObject().put("jour", "2026-09-08").put("montantNet", 400)); // mardi en cours
        JSONObject g = AnalyseBalance.graphique(PeriodesCa.Type.TROIS_SEMAINES, tranches, new JSONArray(), jours);
        assertEquals("SEMAINES", g.getString("type"));
        assertEquals(7, g.getJSONArray("categories").length());
        assertEquals("Lun", g.getJSONArray("categories").getString(0));
        assertEquals(4, g.getJSONArray("series").length());
        assertEquals(900, g.getJSONArray("series").getJSONObject(0).getJSONArray("valeurs").getLong(1));
        assertEquals(400, g.getJSONArray("series").getJSONObject(3).getJSONArray("valeurs").getLong(1));
    }

    @Test
    public void graphiqueParPeriode() {
        JSONArray lignes = new JSONArray().put(ligne("06/2026", 1, 200000, 0, 0))
                .put(ligne("07/2026", 1, 250000, 0, 0));
        JSONObject g = AnalyseBalance.graphique(PeriodesCa.Type.TROIS_MOIS, List.of(), lignes, null);
        assertEquals("PERIODES", g.getString("type"));
        assertEquals(List.of("06/2026", "07/2026"), g.getJSONArray("categories").toList());
        assertEquals(1, g.getJSONArray("series").length());
        assertEquals(250000, g.getJSONArray("series").getJSONObject(0).getJSONArray("valeurs").getLong(1));
    }
}
