package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.Test;

import rest.service.dto.ActiviteAnalysesDTO;

/**
 * Plan du 08/11, point 15.2 : grossistes de chaque tranche du camembert « Délai de saisie des BL ». Regles verifiees
 * sur des milliers de jeux tires au hasard (graine fixe) :
 * <ul>
 * <li>somme des BL des grossistes d'une tranche = nombre de la tranche ; somme des tranches = nombre de BL ;</li>
 * <li>delai moyen = moyenne des ecarts livraison -> entree du grossiste dans la tranche, arrondi au dixieme ; dans les
 * bornes de la tranche (0 le jour meme, 1 le lendemain, 2 ou plus ensuite) ; absent sans date de livraison ;</li>
 * <li>un grossiste n'apparait qu'une fois par tranche ; tri : BL decroissants, puis nom ; grossiste absent nomme.</li>
 * </ul>
 */
class RetardBlGrossistesCoherenceTest {

    private static final String[] GROSSISTES = { "Laborex", "Copharmed", "Ubipharm", "Tedis", null };

    @Test
    void milliersDeJeux() {
        Random r = new Random(15201);
        LocalDateTime base = LocalDateTime.of(2026, 9, 15, 9, 0);
        for (int essai = 0; essai < 3000; essai++) {
            List<AgregatsActivite.Bl> bls = new ArrayList<>();
            /* attendu : tranche -> grossiste -> [bl, somme des jours] */
            List<Map<String, long[]>> attendu = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                attendu.add(new HashMap<>());
            }
            int n = r.nextInt(40);
            for (int i = 0; i < n; i++) {
                String g = GROSSISTES[r.nextInt(GROSSISTES.length)];
                LocalDateTime creation = base.plusDays(r.nextInt(10)).plusMinutes(r.nextInt(600));
                LocalDate livraison = r.nextInt(8) == 0 ? null : creation.toLocalDate().minusDays(r.nextInt(6) - 1);
                bls.add(new AgregatsActivite.Bl("E" + r.nextInt(3), g, creation.minusHours(1), creation,
                        creation.plusMinutes(5), livraison, 1 + r.nextInt(30)));
                long j = livraison == null ? 0
                        : java.time.temporal.ChronoUnit.DAYS.between(livraison, creation.toLocalDate());
                int t = livraison == null ? 3 : j <= 0 ? 0 : j == 1 ? 1 : 2;
                long[] x = attendu.get(t).computeIfAbsent(g == null ? "Sans grossiste" : g, k -> new long[2]);
                x[0]++;
                x[1] += j;
            }
            List<ActiviteAnalysesDTO.Tranche> tranches = AgregatsActivite.retardBl(bls);
            assertEquals(n, tranches.stream().mapToLong(ActiviteAnalysesDTO.Tranche::getNombre).sum());
            for (ActiviteAnalysesDTO.Tranche tr : tranches) {
                int t = "J0".equals(tr.getCode()) ? 0
                        : "J1".equals(tr.getCode()) ? 1 : "J2".equals(tr.getCode()) ? 2 : 3;
                List<ActiviteAnalysesDTO.RetardGrossiste> l = tr.getGrossistes();
                assertEquals(tr.getNombre(), l.stream().mapToLong(ActiviteAnalysesDTO.RetardGrossiste::getBl).sum());
                assertEquals(attendu.get(t).size(), l.size(), "un grossiste une fois par tranche");
                ActiviteAnalysesDTO.RetardGrossiste avant = null;
                for (ActiviteAnalysesDTO.RetardGrossiste g : l) {
                    long[] x = attendu.get(t).get(g.getNom());
                    assertEquals(x[0], g.getBl());
                    if (t == 3) {
                        assertNull(g.getDelaiMoyen());
                    } else {
                        assertEquals(Math.round(10.0 * x[1] / x[0]) / 10.0, g.getDelaiMoyen());
                        assertTrue(
                                t == 0 ? g.getDelaiMoyen() <= 0
                                        : t == 1 ? g.getDelaiMoyen() == 1 : g.getDelaiMoyen() >= 2,
                                "delai dans les bornes de la tranche");
                    }
                    if (avant != null) {
                        assertTrue(
                                avant.getBl() > g.getBl()
                                        || (avant.getBl() == g.getBl() && avant.getNom().compareTo(g.getNom()) < 0),
                                "tri");
                    }
                    avant = g;
                }
            }
        }
    }

    @Test
    void casLimites() {
        assertEquals(3, AgregatsActivite.retardBl(List.of()).size(),
                "sans BL : trois tranches vides, pas de tranche « absente »");
        AgregatsActivite.retardBl(List.of()).forEach(t -> assertTrue(t.getGrossistes().isEmpty()));
        LocalDateTime c = LocalDateTime.of(2026, 9, 15, 9, 0);
        List<ActiviteAnalysesDTO.Tranche> r = AgregatsActivite
                .retardBl(List.of(new AgregatsActivite.Bl("E", null, c, c, c, c.toLocalDate().minusDays(4), 3),
                        new AgregatsActivite.Bl("E", "Tedis", c, c, c, c.toLocalDate().minusDays(2), 3)));
        assertEquals(2, r.get(2).getGrossistes().size());
        assertEquals("Sans grossiste", r.get(2).getGrossistes().get(0).getNom());
        assertEquals(4.0, r.get(2).getGrossistes().get(0).getDelaiMoyen());
    }
}
