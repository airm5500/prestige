package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.MotifVenteService;

/**
 * Plan du 14/11, point 10 : ventes annulees, voir les caissieres concernees et classer les motifs.
 * <p>
 * COHERENCE sur 3 000 jeux tires au hasard (graine fixe ; 0 a 80 operations ; 1 a 6 caissieres dont une inconnue ;
 * motifs a egalite frequents ; montants varies dont 0) : somme par caissiere = total (nombre, annulations,
 * modifications, montant) ; chaque caissiere a son nombre exact ; ordre du plus grand nombre au plus petit et, a
 * egalite, par libelle (meme ordre d'un appel a l'autre, quel que soit l'ordre des operations) ; jamais negatif ; une
 * ligne de detail par operation, avec sa caissiere. Le bloc par motif suit la meme regle d'ordre.
 * </p>
 */
class MotifVenteParCaissierCoherenceTest {

    private static final String[] MOTIFS = { "Erreur de saisie", "Confusion de produit", "Erreur client", "Autre",
            "Client parti" };

    @Test
    @DisplayName("Par caissiere : sommes = total, ordre decroissant puis par nom ; motifs a egalite par libelle")
    void parCaissier() {
        Random h = new Random(14_1110L);
        for (int cas = 0; cas < 3000; cas++) {
            int n = h.nextInt(81), nbCaissiers = 1 + h.nextInt(6);
            List<MotifVenteServiceImpl.Ligne> l = new ArrayList<>();
            Map<String, Integer> attendu = new HashMap<>();
            int annul = 0, montant = 0;
            for (int i = 0; i < n; i++) {
                boolean a = h.nextBoolean();
                int k = h.nextInt(nbCaissiers);
                /* caissiere 0 : inconnue (vente sans caissier enregistre) */
                String id = k == 0 ? "" : "C" + k, nom = k == 0 ? null : "Caissiere " + (char) ('Z' - k);
                int m = h.nextInt(5) == 0 ? 0 : h.nextInt(250_000);
                l.add(new MotifVenteServiceImpl.Ligne(a ? MotifVenteService.ANNULATION : MotifVenteService.MODIFICATION,
                        MOTIFS[h.nextInt(MOTIFS.length)], "U" + h.nextInt(3), "Nom", "Op", "REF" + i, null,
                        "14/11/2026 10:00", m, id, nom));
                attendu.merge(id, 1, Integer::sum);
                annul += a ? 1 : 0;
                montant += m;
            }
            String cle = "cas " + cas;
            JSONObject o = MotifVenteServiceImpl.agreger(l);
            JSONArray c = o.getJSONArray("parCaissier");
            assertEquals(attendu.size(), c.length(), cle + " : une ligne par caissiere");
            int nb = 0, an = 0, mo = 0, mt = 0;
            for (int i = 0; i < c.length(); i++) {
                JSONObject x = c.getJSONObject(i);
                assertEquals(attendu.get(x.getString("caissierId")).intValue(), x.getInt("nb"), cle);
                assertEquals(x.getInt("annulations") + x.getInt("modifications"), x.getInt("nb"), cle);
                assertTrue(x.getInt("nb") > 0 && x.getInt("montant") >= 0, cle);
                assertEquals(x.getString("caissierId").isEmpty() ? "Inconnu" : x.getString("caissier"),
                        x.getString("caissier"), cle + " : caissiere inconnue nommee « Inconnu »");
                nb += x.getInt("nb");
                an += x.getInt("annulations");
                mo += x.getInt("modifications");
                mt += x.getInt("montant");
            }
            assertEquals(n, nb, cle + " : somme = total");
            assertEquals(annul, an, cle);
            assertEquals(n - annul, mo, cle);
            assertEquals(montant, mt, cle);
            assertEquals(o.getJSONObject("total").getInt("montant"), mt, cle);
            ordre(c, "caissier", cle);
            ordre(o.getJSONArray("parMotif"), "motif", cle);
            JSONArray d = o.getJSONArray("detail");
            assertEquals(n, d.length(), cle);
            for (int i = 0; i < n; i++) {
                assertEquals(l.get(i).caissier, d.getJSONObject(i).getString("caissier"), cle + " detail " + i);
            }
            /* meme resultat quel que soit l'ordre des operations */
            List<MotifVenteServiceImpl.Ligne> melange = new ArrayList<>(l);
            java.util.Collections.shuffle(melange, h);
            JSONObject o2 = MotifVenteServiceImpl.agreger(melange);
            assertEquals(cles(o.getJSONArray("parMotif"), "motif"), cles(o2.getJSONArray("parMotif"), "motif"), cle);
            assertEquals(cles(c, "caissierId"), cles(o2.getJSONArray("parCaissier"), "caissierId"), cle);
        }
    }

    private static void ordre(JSONArray b, String libelle, String cle) {
        for (int i = 1; i < b.length(); i++) {
            JSONObject p = b.getJSONObject(i - 1), x = b.getJSONObject(i);
            assertTrue(
                    p.getInt("nb") > x.getInt("nb") || p.getInt("nb") == x.getInt("nb")
                            && p.getString(libelle).compareTo(x.getString(libelle)) <= 0,
                    cle + " : ordre " + p + " / " + x);
        }
    }

    private static List<String> cles(JSONArray b, String k) {
        List<String> r = new ArrayList<>();
        for (int i = 0; i < b.length(); i++) {
            r.add(b.getJSONObject(i).getString(k));
        }
        return r;
    }
}
