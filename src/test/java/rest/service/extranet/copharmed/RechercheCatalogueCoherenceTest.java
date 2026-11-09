package rest.service.extranet.copharmed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Recherche dans le catalogue Copharmed garde (retour du 08/11, point 1) : morceaux de mots, ordre libre, accents et
 * majuscules ignores, sur le nom, le code et la DCI. Verifie contre un oracle ecrit autrement, sur des milliers de
 * catalogues et de saisies tires au hasard (graine fixe).
 */
class RechercheCatalogueCoherenceTest {

    private static final String[] NOMS = { "DOLIPRANE", "EFFERALGAN", "ESOPRA", "AMLOR", "AMLODIPINE", "CÉLESTÈNE",
            "DAFALGAN", "ÉPHYDRION", "PARACETAMOL UBI", "INEXIUM" };
    private static final String[] FORMES = { "CP", "GELU", "SACH", "SIROP", "AMP", "CP EFF" };
    private static final String[] DCI = { "Paracetamol", "Esomeprazole", "Amlodipine", "Bétaméthasone", "",
            "Diclofenac sodique + Paracetamol" };

    private static JSONObject ligne(Random r, int i) {
        String nom = NOMS[r.nextInt(NOMS.length)] + " " + (r.nextInt(20) * 50 + 5) + "MG "
                + FORMES[r.nextInt(FORMES.length)] + " B/" + (1 + r.nextInt(100));
        String code = String.valueOf(1000000 + r.nextInt(9000000));
        JSONArray c = new JSONArray().put(nom).put(code).put(DCI[r.nextInt(DCI.length)])
                .put(String.valueOf(r.nextInt(300))).put(String.valueOf(r.nextInt(20000))).put("0,0%")
                .put(String.valueOf(r.nextInt(20000))).put(String.valueOf(r.nextInt(30000)))
                .put(r.nextBoolean() ? "Disponible" : "Rupture").put("").put("");
        return new JSONObject().put("position", i).put("cellules", c);
    }

    /** Oracle : retire les accents a la main (table), compare mot par mot. */
    private static String plat(String s) {
        String a = "àâäéèêëîïôöùûüç", b = "aaaeeeeiioouuuc";
        StringBuilder o = new StringBuilder();
        for (char ch : s.toLowerCase(Locale.ROOT).toCharArray()) {
            int k = a.indexOf(ch);
            o.append(k >= 0 ? b.charAt(k) : ch);
        }
        return o.toString();
    }

    private static boolean oracle(JSONArray c, String motif) {
        String t = plat(c.getString(0) + " " + c.getString(1) + " " + c.getString(2));
        boolean un = false;
        for (String m : plat(motif).trim().split("\\s+")) {
            if (m.isEmpty()) {
                continue;
            }
            un = true;
            if (!t.contains(m)) {
                return false;
            }
        }
        return un;
    }

    /**
     * Saisie tiree d'une ligne : morceau du nom, du code ou de la DCI, parfois deux mots dans le desordre, casse melee.
     */
    private static String saisie(Random r, JSONArray c) {
        String[] src = { c.getString(0), c.getString(1), c.getString(2).isEmpty() ? c.getString(0) : c.getString(2) };
        String s = src[r.nextInt(3)];
        String[] mots = s.split(" ");
        String m = mots[r.nextInt(mots.length)];
        int a = r.nextInt(Math.max(1, m.length() - 1));
        String morceau = m.substring(a, Math.min(m.length(), a + 2 + r.nextInt(5)));
        if (r.nextInt(3) == 0 && mots.length > 1) {
            morceau = mots[mots.length - 1].substring(0, Math.min(3, mots[mots.length - 1].length())) + " " + morceau;
        }
        return r.nextBoolean() ? morceau.toLowerCase(Locale.ROOT) : morceau.toUpperCase(Locale.ROOT);
    }

    @Test
    void milliersDeRecherchesConformesALOracle() {
        Random r = new Random(20261108L);
        int verifiees = 0;
        for (int cat = 0; cat < 60; cat++) {
            JSONArray lignes = new JSONArray();
            int n = 50 + r.nextInt(400);
            for (int i = 0; i < n; i++) {
                lignes.put(ligne(r, i));
            }
            for (int k = 0; k < 60; k++) {
                String motif = r.nextInt(10) == 0 ? "zzz" + r.nextInt(99)
                        : saisie(r, lignes.getJSONObject(r.nextInt(n)).getJSONArray("cellules"));
                int max = r.nextInt(4) == 0 ? 5 : 1000;
                List<JSONObject> trouve = RechercheCatalogue.chercher(lignes, motif, max);
                List<String> attendus = new ArrayList<>();
                for (int i = 0; i < n; i++) {
                    JSONArray c = lignes.getJSONObject(i).getJSONArray("cellules");
                    if (oracle(c, motif)) {
                        attendus.add(c.getString(1) + "|" + c.getString(0));
                    }
                }
                /*
                 * meme ensemble (au plafond pres), chaque ligne trouvee contient tous les mots, jamais au-dela du
                 * plafond
                 */
                assertEquals(Math.min(max, attendus.size()), trouve.size(), motif);
                for (JSONObject p : trouve) {
                    assertTrue(attendus.contains(p.getString("code") + "|" + p.getString("designation")),
                            motif + " " + p);
                }
                if (max >= attendus.size()) {
                    List<String> vus = new ArrayList<>();
                    for (JSONObject p : trouve) {
                        vus.add(p.getString("code") + "|" + p.getString("designation"));
                    }
                    assertTrue(vus.containsAll(attendus), motif);
                }
                /* rangement : les noms commencant par le premier mot d'abord */
                String premier = RechercheCatalogue.mots(motif).isEmpty() ? "" : RechercheCatalogue.mots(motif).get(0);
                boolean finDebuts = false;
                for (JSONObject p : trouve) {
                    boolean debut = RechercheCatalogue.normal(p.getString("designation")).startsWith(premier);
                    assertTrue(!(debut && finDebuts), "rangement " + motif);
                    finDebuts |= !debut;
                }
                verifiees++;
            }
        }
        assertTrue(verifiees >= 3000);
    }

    @Test
    void casDuRetourDeLUtilisateur() {
        JSONArray l = new JSONArray().put(new JSONObject().put("cellules", new JSONArray(
                "[\"DOLIPRANE 1000MG SACH/8\",\"3624698\",\"Paracetamol\",\"\",\"1\",\"\",\"1\",\"1\",\"Disponible\",\"\",\"\"]")))
                .put(new JSONObject().put("cellules", new JSONArray(
                        "[\"ESOPRA 40MG CP B/14\",\"1277821\",\"Esomeprazole\",\"\",\"1\",\"\",\"1\",\"1\",\"Disponible\",\"\",\"\"]")))
                .put(new JSONObject().put("cellules", new JSONArray(
                        "[\"CÉLESTÈNE 0,05% SOL\",\"3000001\",\"Bétaméthasone\",\"\",\"1\",\"\",\"1\",\"1\",\"Rupture\",\"\",\"\"]")));
        assertEquals("3624698", RechercheCatalogue.chercher(l, "doliprane 1000", 10).get(0).getString("code"));
        assertEquals("3624698", RechercheCatalogue.chercher(l, "36246", 10).get(0).getString("code"));
        assertEquals("1277821", RechercheCatalogue.chercher(l, "esop", 10).get(0).getString("code"));
        assertEquals("1277821", RechercheCatalogue.chercher(l, "40mg esopra", 10).get(0).getString("code"));
        assertEquals("3000001", RechercheCatalogue.chercher(l, "celestene", 10).get(0).getString("code"));
        assertEquals("3000001", RechercheCatalogue.chercher(l, "betametha", 10).get(0).getString("code"));
        assertEquals(0, RechercheCatalogue.chercher(l, "doliprane 500", 10).size());
        assertEquals(0, RechercheCatalogue.chercher(l, "   ", 10).size());
        assertEquals("Disponible", RechercheCatalogue.chercher(l, "doli", 10).get(0).getString("dispo"));
    }
}
