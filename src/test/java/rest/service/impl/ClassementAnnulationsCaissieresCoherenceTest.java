package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

import rest.service.MotifVenteService;

/**
 * Retour du 15/11 : « quelle caissiere occasionne le plus d'annulations ».
 * <p>
 * COHERENCE sur 5 000 jeux tires au hasard (graine fixe ; 0 a 60 operations dont des modifications ; 1 a 7 caissieres
 * dont une inconnue ; ventes encaissees 0 a 400, parfois absentes ; montants varies dont 0 ; egalites frequentes) :
 * </p>
 * <ul>
 * <li>une ligne par caissiere ayant au moins une annulation ; les modifications ne comptent pas ;</li>
 * <li>somme des annulations = annulations du jeu = total d'agreger ; montant = somme de ses annulations ;</li>
 * <li>annulations de chaque caissiere = colonne annulations du bloc « par caissiere » d'agreger ;</li>
 * <li>taux = annulations / ventes au dixieme, absent sans vente (et pour la caissiere inconnue), jamais negatif ;</li>
 * <li>ordre : annulations, taux, montant decroissants, puis nom ; rang 1 en tete, partage a egalite d'annulations,
 * sinon egal a la position ;</li>
 * <li>meme resultat quel que soit l'ordre des operations.</li>
 * </ul>
 */
class ClassementAnnulationsCaissieresCoherenceTest {

    @Test
    void milliersDeJeux() {
        Random h = new Random(15_11_2026L);
        for (int cas = 0; cas < 5000; cas++) {
            int n = h.nextInt(61), nb = 1 + h.nextInt(7);
            List<MotifVenteServiceImpl.Ligne> l = new ArrayList<>();
            Map<String, Long> ventes = new HashMap<>();
            for (int k = 1; k < nb; k++) {
                if (h.nextInt(6) != 0) {
                    ventes.put("C" + k, (long) (h.nextInt(8) == 0 ? 0 : h.nextInt(400)));
                }
            }
            Map<String, long[]> attendu = new HashMap<>();
            long annulations = 0;
            for (int i = 0; i < n; i++) {
                boolean a = h.nextInt(4) != 0;
                int k = h.nextInt(nb);
                String id = k == 0 ? "" : "C" + k, nom = k == 0 ? null : "Caissiere " + (char) ('A' + k);
                int m = h.nextInt(5) == 0 ? 0 : h.nextInt(60_000);
                l.add(new MotifVenteServiceImpl.Ligne(a ? MotifVenteService.ANNULATION : MotifVenteService.MODIFICATION,
                        "Motif " + h.nextInt(3), "U" + h.nextInt(3), "Auteur", "Op", "REF" + i, null,
                        "15/11/2026 10:00", m, id, nom));
                if (a) {
                    long[] x = attendu.computeIfAbsent(id, z -> new long[2]);
                    x[0]++;
                    x[1] += m;
                    annulations++;
                }
            }
            String cle = "cas " + cas;
            JSONArray c = MotifVenteServiceImpl.classementAnnulations(l, ventes);
            assertEquals(attendu.size(), c.length(), cle + " : une ligne par caissiere ayant annule");
            long somme = 0;
            for (int i = 0; i < c.length(); i++) {
                JSONObject x = c.getJSONObject(i);
                long[] e = attendu.get(x.getString("caissierId"));
                assertEquals(e[0], x.getLong("annulations"), cle);
                assertEquals(e[1], x.getLong("montant"), cle);
                assertTrue(x.getLong("annulations") > 0 && x.getLong("montant") >= 0 && x.getLong("ventes") >= 0, cle);
                long v = x.getString("caissierId").isEmpty() ? 0 : ventes.getOrDefault(x.getString("caissierId"), 0L);
                assertEquals(v, x.getLong("ventes"), cle);
                if (v > 0) {
                    assertEquals(Math.round(1000.0 * e[0] / v) / 10.0, x.getDouble("taux"), 1e-9, cle);
                    assertTrue(x.getDouble("taux") >= 0, cle);
                } else {
                    assertFalse(x.has("taux"), cle + " : taux absent sans vente");
                }
                somme += x.getLong("annulations");
                if (i == 0) {
                    assertEquals(1, x.getInt("rang"), cle);
                } else {
                    JSONObject p = c.getJSONObject(i - 1);
                    assertTrue(ordre(p, x) <= 0, cle + " : ordre " + p + " / " + x);
                    assertEquals(p.getLong("annulations") == x.getLong("annulations") ? p.getInt("rang") : i + 1,
                            x.getInt("rang"), cle + " : rang");
                }
            }
            assertEquals(annulations, somme, cle + " : somme = annulations du jeu");
            JSONObject agrege = MotifVenteServiceImpl.agreger(l);
            assertEquals(annulations, agrege.getJSONObject("total").getLong("annulations"), cle);
            JSONArray pc = agrege.getJSONArray("parCaissier");
            for (int i = 0; i < pc.length(); i++) {
                JSONObject y = pc.getJSONObject(i);
                long[] e = attendu.get(y.getString("caissierId"));
                assertEquals(e == null ? 0 : e[0], y.getLong("annulations"),
                        cle + " : meme nombre que « par caissiere »");
            }
            List<MotifVenteServiceImpl.Ligne> melange = new ArrayList<>(l);
            Collections.shuffle(melange, h);
            assertEquals(c.toString(), MotifVenteServiceImpl.classementAnnulations(melange, ventes).toString(),
                    cle + " : independant de l'ordre des operations");
        }
    }

    /** Negatif ou nul si p doit preceder x. */
    private static int ordre(JSONObject p, JSONObject x) {
        int r = Long.compare(x.getLong("annulations"), p.getLong("annulations"));
        if (r == 0) {
            r = Double.compare(x.optDouble("taux", -1), p.optDouble("taux", -1));
        }
        if (r == 0) {
            r = Long.compare(x.getLong("montant"), p.getLong("montant"));
        }
        return r != 0 ? r : p.getString("caissier").compareTo(x.getString("caissier"));
    }
}
