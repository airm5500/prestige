package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Plan du 14/11, point 10 : liste des ventes annulees filtree et triee par motif.
 * <p>
 * COHERENCE sur 5 000 listes tirees au hasard (graine fixe ; 0 a 120 ventes ; 0 a 6 motifs, ventes sans motif) :
 * <ul>
 * <li>sans filtre ni tri : la liste est rendue telle quelle (aucune regression) ;</li>
 * <li>filtre : exactement les ventes du motif, dans leur ordre d'origine ;</li>
 * <li>tri : memes ventes, aucune perdue ni doublee ; motif le plus utilise d'abord, a egalite par libelle, ventes sans
 * motif a la fin ; a l'interieur d'un motif, l'ordre d'origine (chronologique) est garde.</li>
 * </ul>
 * </p>
 */
class AnnulationsParMotifCoherenceTest {

    @Test
    @DisplayName("Filtre et tri par motif : aucune vente perdue, motifs les plus utilises d'abord")
    void filtreEtTri() {
        Random h = new Random(14_1110L);
        for (int cas = 0; cas < 5000; cas++) {
            int n = h.nextInt(121), nbMotifs = h.nextInt(7);
            List<String> ventes = new ArrayList<>();
            Map<String, String> motifs = new HashMap<>();
            for (int i = 0; i < n; i++) {
                String v = "V" + i;
                ventes.add(v);
                if (nbMotifs > 0 && h.nextInt(6) > 0) {
                    motifs.put(v, "Motif " + (char) ('A' + h.nextInt(nbMotifs)));
                }
            }
            String cle = "cas " + cas;
            assertEquals(ventes, SalesStatsServiceImpl.ordonnerParMotif(ventes, motifs, null, false), cle);
            assertEquals(ventes, SalesStatsServiceImpl.ordonnerParMotif(ventes, motifs, "  ", false), cle);

            String choisi = "Motif " + (char) ('A' + h.nextInt(Math.max(1, nbMotifs)));
            List<String> f = SalesStatsServiceImpl.ordonnerParMotif(ventes, motifs, choisi, false);
            List<String> attenduF = new ArrayList<>();
            ventes.stream().filter(v -> choisi.equals(motifs.get(v))).forEach(attenduF::add);
            assertEquals(attenduF, f, cle + " : filtre " + choisi);

            List<String> t = SalesStatsServiceImpl.ordonnerParMotif(ventes, motifs, null, true);
            assertEquals(n, t.size(), cle + " : aucune vente perdue");
            assertEquals(new HashSet<>(ventes), new HashSet<>(t), cle + " : aucune vente doublee ni ajoutee");
            Map<String, Integer> usage = new HashMap<>();
            motifs.values().forEach(m -> usage.merge(m, 1, Integer::sum));
            for (int i = 1; i < t.size(); i++) {
                String a = motifs.get(t.get(i - 1)), b = motifs.get(t.get(i));
                if (a == null) {
                    assertTrue(b == null, cle + " : ventes sans motif a la fin");
                } else if (b != null && !a.equals(b)) {
                    assertTrue(usage.get(a) > usage.get(b) || usage.get(a).equals(usage.get(b)) && a.compareTo(b) < 0,
                            cle + " : " + a + " (" + usage.get(a) + ") avant " + b + " (" + usage.get(b) + ")");
                } else if (a.equals(b)) {
                    assertTrue(Integer.parseInt(t.get(i - 1).substring(1)) < Integer.parseInt(t.get(i).substring(1)),
                            cle + " : ordre d'origine garde dans un motif");
                }
            }
            /* chaque motif forme un seul bloc */
            List<String> blocs = new ArrayList<>();
            for (String v : t) {
                String m = String.valueOf(motifs.get(v));
                if (blocs.isEmpty() || !blocs.get(blocs.size() - 1).equals(m)) {
                    blocs.add(m);
                }
            }
            assertEquals(new HashSet<>(blocs).size(), blocs.size(), cle + " : un bloc par motif");

            /* tri et filtre ensemble : les ventes du motif, dans l'ordre d'origine */
            assertEquals(attenduF, SalesStatsServiceImpl.ordonnerParMotif(ventes, motifs, choisi, true), cle);
        }
    }
}
