package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.Normalisation;

/**
 * Coherence de la lecture de /SavoirPlusJSON sur des milliers de fiches generees (graine fixe) : stocks, prix, CIP,
 * absent / null, absence de HTML dans l'API.
 */
class FicheProduitCoherenceTest {

    private static final long GRAINE = 20261107L;
    private static final int FICHES = 4000;
    private static final Pattern BALISE = Pattern.compile("<\\s*[a-zA-Z/!?]");
    private static final String[] AGENCES = { "BKE", "GNA", "VRI", "YOP", "ABJ", "SPE" };
    private static final String[] PIEGES = { "<b>GRAS</b>", "&lt;script&gt;x&lt;/script&gt;", "<img src=x onerror=1>",
            "A &amp; B", "<!-- c -->", "<?xml?>", "FAIR&W", "1 < 2" };

    /** Stock d'agence genere : valeur JSON et valeur attendue (null = inconnu). */
    private static final class Stock {
        Object json;
        boolean absent;
        Integer attendu;
    }

    @Test
    void fichesGenereesCoherentes() throws Exception {
        Random r = new Random(GRAINE);
        int egal = 0, different = 0, sommeInconnue = 0, prixTexte = 0, prixNombre = 0, cipsZero = 0;
        for (int n = 0; n < FICHES; n++) {
            JSONObject p = new JSONObject();
            p.put("pscode", "P" + n);
            p.put("pslib", libelle(r));
            if (r.nextInt(4) > 0) {
                p.put("pslibc", r.nextInt(5) == 0 ? JSONObject.NULL : libelle(r));
            }
            Object[] prix = new Object[3];
            String[] champsPrix = { "pspven", "psppub", "pspvig" };
            for (int i = 0; i < 3; i++) {
                prix[i] = prix(r);
                if (prix[i] != null) {
                    p.put(champsPrix[i], prix[i]);
                }
            }
            Stock soc = stock(r);
            if (!soc.absent) {
                p.put("psstkSoc", soc.json);
            }
            List<Stock> stocks = new ArrayList<>();
            List<List<Integer>> colis = new ArrayList<>();
            boolean listeAgences = r.nextInt(20) > 0;
            if (listeAgences) {
                JSONArray ag = new JSONArray();
                int k = r.nextInt(6);
                for (int i = 0; i < k; i++) {
                    JSONObject a = new JSONObject();
                    a.put("etcode", AGENCES[r.nextInt(AGENCES.length)]);
                    a.put("etlib", r.nextInt(10) == 0 ? PIEGES[r.nextInt(PIEGES.length)] : "UBIPHARM " + i);
                    Stock s = stock(r);
                    if (!s.absent) {
                        a.put("psstk", s.json);
                    }
                    stocks.add(s);
                    int nc = r.nextInt(4);
                    List<Integer> c = new ArrayList<>();
                    for (int j = 0; j < nc; j++) {
                        c.add(1 + r.nextInt(500));
                    }
                    colis.add(c);
                    a.put("colisages", new JSONArray(c));
                    ag.put(a);
                }
                p.put("infosParEtablissement", ag);
            }
            JSONObject racine = new JSONObject().put("produit", p);
            List<String> cips = new ArrayList<>();
            int nc = r.nextInt(4);
            for (int i = 0; i < nc; i++) {
                String c = String.format("%0" + (5 + r.nextInt(10)) + "d", r.nextInt(1_000_000));
                cips.add(c);
            }
            racine.put("cips", new JSONArray(cips));
            racine.put("promos", r.nextBoolean() ? new JSONArray()
                    : new JSONArray().put(new JSONObject().put("x", PIEGES[r.nextInt(PIEGES.length)])));

            FicheProduitUbipharm f = FicheProduitParseur.lire(racine.toString());

            /* CIP : chaines, zeros de tete gardes */
            assertEquals(cips, f.cips());
            cipsZero += cips.stream().filter(c -> c.startsWith("0")).count();

            /* prix : brut relu = BigDecimal */
            BigDecimal[] lus = { f.pspven(), f.psppub(), f.pspvig() };
            String[] bruts = { f.pspvenBrut(), f.psppubBrut(), f.pspvigBrut() };
            for (int i = 0; i < 3; i++) {
                if (prix[i] == null) {
                    assertTrue(f.absent(champsPrix[i]));
                    assertNull(lus[i]);
                    assertNull(bruts[i]);
                } else if (JSONObject.NULL.equals(prix[i])) {
                    assertFalse(f.absent(champsPrix[i]));
                    assertNull(lus[i]);
                    assertNull(bruts[i]);
                    assertTrue(f.toJson().has(champsPrix[i]) && f.toJson().isNull(champsPrix[i]));
                } else if (prix[i] instanceof String) {
                    prixTexte++;
                    BigDecimal attendu = Normalisation.montant(bruts[i]);
                    assertEquals(attendu, lus[i], bruts[i]);
                } else {
                    prixNombre++;
                    assertEquals(0, new BigDecimal(bruts[i]).compareTo(lus[i]), bruts[i]);
                    assertEquals(0, new BigDecimal(prix[i].toString()).compareTo(lus[i]));
                }
            }

            /* stocks : aucun inconnu change en 0 */
            assertEquals(soc.attendu, f.psstkSoc());
            assertEquals(soc.absent, f.absent("psstkSoc"));
            if (!listeAgences) {
                assertNull(f.agences());
                assertNull(f.sommeStockAgences());
                continue;
            }
            assertEquals(stocks.size(), f.agences().size());
            Integer somme = 0;
            for (int i = 0; i < stocks.size(); i++) {
                StockAgenceUbipharm a = f.agences().get(i);
                assertEquals(stocks.get(i).attendu, a.psstk(), String.valueOf(stocks.get(i).json));
                assertEquals(stocks.get(i).absent, a.absent("psstk"));
                if (stocks.get(i).attendu == null) {
                    somme = null;
                } else if (somme != null) {
                    somme += stocks.get(i).attendu;
                }
                /* colisage distinct du stock */
                assertEquals(colis.get(i), a.colisages());
            }
            assertEquals(somme, f.sommeStockAgences());

            /* la somme et le stock societe sont exposes tous deux, sans supposer l'egalite */
            JSONObject j = f.toJson();
            assertTrue(j.has("sommeStockAgences"));
            if (somme == null) {
                sommeInconnue++;
                assertTrue(j.isNull("sommeStockAgences"));
            } else {
                assertEquals(somme.intValue(), j.getInt("sommeStockAgences"));
                if (soc.attendu != null) {
                    if (soc.attendu.equals(somme)) {
                        egal++;
                    } else {
                        different++;
                    }
                }
            }
            if (!soc.absent) {
                assertTrue(j.has("psstkSoc"));
                assertEquals(soc.attendu == null, j.isNull("psstkSoc"));
            }

            /* jamais de balise HTML dans l'API */
            assertFalse(BALISE.matcher(j.toString()).find(), j.toString());
            /* cles absentes non ecrites, nulles ecrites */
            assertEquals(p.has("pslibc"), j.has("pslibc"));
        }
        /* le jeu couvre bien les deux situations, et les prix ecrits des deux facons */
        assertTrue(egal > 0 && different > 0 && sommeInconnue > 0, egal + " " + different + " " + sommeInconnue);
        assertTrue(prixTexte > 100 && prixNombre > 100);
        assertTrue(cipsZero > 100);
    }

    private static String libelle(Random r) {
        return r.nextInt(8) == 0 ? PIEGES[r.nextInt(PIEGES.length)] : "PRODUIT " + r.nextInt(100000);
    }

    /** Prix : absent (null), nombre entier, nombre decimal, texte affiche, inconnu. */
    private static Object prix(Random r) {
        switch (r.nextInt(7)) {
        case 0:
            return null;
        case 1:
            return r.nextInt(100000);
        case 2:
            return new BigDecimal(r.nextInt(10000000)).movePointLeft(2);
        case 3:
            return String.format("%,d", r.nextInt(1000000)).replace(',', ' ') + " CFA";
        case 4:
            return "N/A";
        case 5:
            return JSONObject.NULL;
        default:
            return String.valueOf(r.nextInt(100000)) + "," + r.nextInt(10) + r.nextInt(10);
        }
    }

    private static Stock stock(Random r) {
        Stock s = new Stock();
        switch (r.nextInt(9)) {
        case 0:
            s.absent = true;
            break;
        case 1:
            s.json = JSONObject.NULL;
            break;
        case 2:
            s.json = "N/A";
            break;
        case 3:
            s.json = 0;
            s.attendu = 0;
            break;
        case 4:
            int v = r.nextInt(1000);
            s.json = String.valueOf(v);
            s.attendu = v;
            break;
        case 5:
            s.json = new BigDecimal("2.5");
            break;
        default:
            int w = r.nextInt(60);
            s.json = w;
            s.attendu = w;
        }
        return s;
    }
}
