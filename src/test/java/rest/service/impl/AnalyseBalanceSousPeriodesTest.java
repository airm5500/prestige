package rest.service.impl;

import java.time.LocalDate;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import util.PeriodesCa;

/**
 * Retours des tests 3 : les barres du graphique viennent de balances par mois (trois ans) ou par jour (trois semaines),
 * calculees en parallele, et non plus de series par jour sur toute l'etendue.
 */
public class AnalyseBalanceSousPeriodesTest {

    @Test
    public void troisAnneesDonnentUnMoisParBarreBorneParLaTranche() {
        LocalDate aujourdHui = LocalDate.of(2026, 9, 10);
        List<PeriodesCa.Tranche> tranches = PeriodesCa.tranches(PeriodesCa.Type.TROIS_ANS, null, null, aujourdHui);
        List<LocalDate[]> sous = AnalyseBalance.sousPeriodes(tranches, true);
        // 2023, 2024, 2025 entieres (36 mois) + 2026 jusqu'au 10 septembre (9 mois)
        assertEquals(45, sous.size());
        assertEquals(LocalDate.of(2023, 1, 1), sous.get(0)[0]);
        assertEquals(LocalDate.of(2023, 1, 31), sous.get(0)[1]);
        assertEquals(LocalDate.of(2023, 2, 1), sous.get(1)[0]);
        LocalDate[] dernier = sous.get(sous.size() - 1);
        assertEquals(LocalDate.of(2026, 9, 1), dernier[0]);
        assertEquals(LocalDate.of(2026, 9, 10), dernier[1]);
        // aucune journee perdue ni doublee entre deux sous-periodes
        for (int i = 1; i < sous.size(); i++) {
            if (sous.get(i)[0].getDayOfMonth() != 1) {
                continue;
            }
            assertEquals(sous.get(i - 1)[1].plusDays(1), sous.get(i)[0]);
        }
    }

    @Test
    public void troisSemainesDonnentUnJourParBarre() {
        LocalDate aujourdHui = LocalDate.of(2026, 9, 10);
        List<PeriodesCa.Tranche> tranches = PeriodesCa.tranches(PeriodesCa.Type.TROIS_SEMAINES, null, null, aujourdHui);
        List<LocalDate[]> sous = AnalyseBalance.sousPeriodes(tranches, false);
        long joursAttendus = 0;
        for (PeriodesCa.Tranche t : tranches) {
            joursAttendus += t.getFin().toEpochDay() - t.getDebut().toEpochDay() + 1;
        }
        assertEquals(joursAttendus, sous.size());
        for (LocalDate[] s : sous) {
            assertEquals(s[0], s[1]);
        }
    }

    @Test
    public void laBalanceDUneSousPeriodeDevientUneBarreDuGraphique() {
        JSONObject balance = new JSONObject()
                .put("metaData",
                        new JSONObject().put("montantNet", 35000L).put("nbreVente", 3L).put("montantAchat", 1200L)
                                .put("montantEsp", 11000L).put("montantTp", 15000L))
                .put("ventilation", new JSONObject().put("mobile", new JSONObject().put("montant", 9000L)));
        JSONObject jour = AnalyseBalance.jourDepuisBalance(LocalDate.of(2025, 5, 1), balance);
        assertEquals("2025-05-01", jour.getString("jour"));
        assertEquals(35000L, jour.getLong("montantNet"));
        assertEquals(3L, jour.getLong("ventes"));
        assertEquals(1200L, jour.getLong("montantAchat"));
        assertEquals(11000L, jour.getLong("montantEsp"));
        assertEquals(9000L, jour.getLong("montantMobile"));
        assertEquals(15000L, jour.getLong("montantTp"));
        // une balance vide (periode sans vente) donne une barre a zero, pas une erreur
        JSONObject vide = AnalyseBalance.jourDepuisBalance(LocalDate.of(2025, 6, 1), new JSONObject());
        assertEquals(0L, vide.getLong("montantNet"));

        // et le graphique range la barre dans sa tranche et son mois
        List<PeriodesCa.Tranche> tranches = PeriodesCa.tranches(PeriodesCa.Type.TROIS_ANS, null, null,
                LocalDate.of(2026, 9, 10));
        JSONArray jours = new JSONArray().put(jour).put(vide);
        JSONObject graphique = AnalyseBalance.graphique(PeriodesCa.Type.TROIS_ANS, tranches, new JSONArray(), jours);
        JSONArray series = graphique.getJSONArray("series");
        JSONObject serie2025 = null;
        for (int i = 0; i < series.length(); i++) {
            if (series.getJSONObject(i).getString("libelle").startsWith("2025")) {
                serie2025 = series.getJSONObject(i);
            }
        }
        assertEquals(35000L, serie2025.getJSONObject("valeurs").getJSONArray("montantNet").getLong(4));
        assertEquals(11667L, serie2025.getJSONObject("valeurs").getJSONArray("panierMoyen").getLong(4));
        assertEquals(0L, serie2025.getJSONObject("valeurs").getJSONArray("montantNet").getLong(5));
    }
}
