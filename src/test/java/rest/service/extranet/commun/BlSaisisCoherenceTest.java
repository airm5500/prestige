package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * BL de l'extranet saisis ou non dans Prestige (demande du 09/11) : regles de comparaison sur les formats releves sur
 * le poste (DPCI : n° de facture R40237756 ; TEDIS : 2629645160-BKE ; Ubipharm : YOP-139749, BKE/765220) et, sur des
 * milliers de lignes tirees au hasard (graine fixe) : saisis + non saisis = lignes, chaque ligne marquee saisie a bien
 * une reference saisie, chaque ligne non marquee n'en a aucune, « autre grossiste » seulement hors des grossistes lies.
 */
class BlSaisisCoherenceTest {

    @Test
    void normalisation() {
        assertEquals("R40237756", BlSaisis.normal(" r40237756 "));
        assertEquals("2629645160BKE", BlSaisis.normal("2629645160-BKE"));
        assertEquals("BKE765220", BlSaisis.normal("BKE/765220"));
        assertEquals(BlSaisis.normal("BKE764648"), BlSaisis.normal("BKE/764648"));
        assertEquals("14912591", BlSaisis.normal("014912591"), "zeros de tete d'un numero");
        assertEquals("0", BlSaisis.normal("000"));
        assertEquals("R0123", BlSaisis.normal("R0123"), "zeros gardes dans un code");
        assertNull(BlSaisis.normal(" - / "));
        assertNull(BlSaisis.normal(null));
    }

    @Test
    void colonnesDeNumero() {
        assertEquals(Arrays.asList(1, 3), BlSaisis
                .colonnes(new JSONArray(Arrays.asList("Date", "N° BL", "N° commande", "N° facture", "Agence"))));
        assertEquals(Collections.singletonList(3), BlSaisis.colonnes(new JSONArray(
                Arrays.asList("Quinzaine", "Date", "Type", "N° Document", "Total HT", "Remise", "TVA", "Total TTC"))));
        assertEquals(Collections.emptyList(), BlSaisis.colonnes(new JSONArray(Arrays.asList("Date", "N° relevé"))));
    }

    private static String ref(Random r) {
        switch (r.nextInt(3)) {
        case 0:
            return "R" + (40_000_000 + r.nextInt(400_000));
        case 1:
            return (2_629_000_000L + r.nextInt(900_000)) + "-" + new String[] { "BKE", "GNA", "VRI" }[r.nextInt(3)];
        default:
            return new String[] { "YOP", "BKE", "GNA" }[r.nextInt(3)] + (r.nextBoolean() ? "/" : "-")
                    + (130_000 + r.nextInt(9000));
        }
    }

    /** Ecriture differente du meme numero (comme une saisie a la main). */
    private static String autreEcriture(Random r, String s) {
        String t = r.nextBoolean() ? s.toLowerCase() : s;
        t = t.replace("-", r.nextBoolean() ? "/" : r.nextBoolean() ? " " : "");
        return r.nextBoolean() ? " " + t + " " : t;
    }

    @Test
    void marquage_regles() {
        Random r = new Random(20261109L);
        int lignesTotal = 0, oui = 0, autres = 0;
        for (int t = 0; t < 30; t++) {
            Map<String, BlSaisis.Saisi> saisis = new HashMap<>();
            Set<String> lies = new HashSet<>(Arrays.asList("G1", "G2"));
            if (t % 5 == 0) {
                lies.clear(); /* aucun grossiste lie : pas de controle du grossiste */
            }
            JSONArray lignes = new JSONArray();
            int n = 1 + r.nextInt(300);
            for (int i = 0; i < n; i++) {
                String bl = ref(r), facture = ref(r);
                int cas = r.nextInt(4);
                String g = "G" + (1 + r.nextInt(3)); /* G3 : grossiste non lie */
                if (cas == 1) {
                    saisis.put(BlSaisis.normal(bl), new BlSaisis.Saisi(autreEcriture(r, bl),
                            "2026-11-0" + (1 + r.nextInt(8)), g, "Grossiste " + g, r.nextInt(10) == 0));
                } else if (cas == 2) {
                    saisis.put(BlSaisis.normal(facture),
                            new BlSaisis.Saisi(autreEcriture(r, facture), "2026-10-20", g, "Grossiste " + g, false));
                }
                lignes.put(new JSONObject().put("cellules",
                        new JSONArray(Arrays.asList("2026-11-08", bl, "C" + i, facture, "Agence"))));
            }
            JSONObject rep = new JSONObject()
                    .put("colonnes",
                            new JSONArray(Arrays.asList("Date", "N° BL", "N° commande", "N° facture", "Agence")))
                    .put("lignes", lignes);
            BlSaisis.marquer(rep, saisis, lies);
            JSONObject s = rep.getJSONObject("saisie");
            assertEquals(n, s.getInt("saisis") + s.getInt("nonSaisis"), "saisis + non saisis = lignes");
            int compteAutre = 0;
            for (int i = 0; i < n; i++) {
                JSONObject l = lignes.getJSONObject(i);
                JSONArray c = l.getJSONArray("cellules");
                BlSaisis.Saisi attendu = saisis.get(BlSaisis.normal(c.getString(1)));
                if (attendu == null) {
                    attendu = saisis.get(BlSaisis.normal(c.getString(3)));
                }
                if (attendu == null) {
                    assertTrue(l.isNull("saisi"), "ligne " + i + " : aucune reference saisie");
                    continue;
                }
                JSONObject m = l.getJSONObject("saisi");
                assertEquals(attendu.reference, m.getString("reference"));
                assertEquals(attendu.date, m.getString("date"));
                assertEquals(attendu.enCours, m.getBoolean("enCours"));
                boolean ailleurs = !lies.isEmpty() && !lies.contains(attendu.grossisteId);
                assertEquals(ailleurs, m.getBoolean("autreGrossiste"), "ligne " + i);
                if (ailleurs) {
                    compteAutre++;
                }
                oui++;
            }
            assertEquals(compteAutre, s.getInt("autreGrossiste"));
            autres += compteAutre;
            lignesTotal += n;
        }
        assertTrue(lignesTotal > 3000 && oui > 1000 && autres > 100, lignesTotal + " / " + oui + " / " + autres);
    }

    @Test
    void listeSansColonneDeNumero_inchangee() {
        JSONObject rep = new JSONObject().put("colonnes", new JSONArray(Arrays.asList("Date", "N° relevé"))).put(
                "lignes", new JSONArray().put(new JSONObject().put("cellules", new JSONArray().put("x").put("1"))));
        String avant = rep.toString();
        BlSaisis.marquer(rep, new HashMap<>(), new HashSet<>());
        assertEquals(avant, rep.toString());
        assertFalse(rep.has("saisie"));
    }
}
