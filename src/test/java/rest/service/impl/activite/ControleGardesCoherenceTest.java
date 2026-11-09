package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 15.8 : controle des gardes. Regles verifiees sur des milliers de periodes tirees au hasard
 * (graine fixe) :
 * <ul>
 * <li>une garde est « sans vente » si et seulement si aucune vente n'est ouverte dans [debut, fin[ ;</li>
 * <li>une nuit est signalee si et seulement si au moins une vente ouverte entre 21 h et 6 h n'est couverte par aucune
 * garde ; son compte = ces ventes-la, exactement ;</li>
 * <li>ventes de nuit = ventes couvertes par une garde + ventes signalees (rien n'est perdu ni compte deux fois) ;</li>
 * <li>la carte d'une garde ne contient que ses ventes, et toutes.</li>
 * </ul>
 */
class ControleGardesCoherenceTest {

    @Test
    @SuppressWarnings("unchecked")
    void controleParSesRegles() {
        Random h = new Random(15_0811L);
        for (int cas = 0; cas < 3000; cas++) {
            LocalDate debut = LocalDate.of(2026, 1 + h.nextInt(12), 1 + h.nextInt(28));
            LocalDate fin = debut.plusDays(h.nextInt(10));
            List<LocalDateTime> ventes = new ArrayList<>();
            for (int i = 0, n = h.nextInt(60); i < n; i++) {
                ventes.add(debut.atStartOfDay().plusMinutes(h.nextInt((int) (java.time.Duration
                        .between(debut.atStartOfDay(), fin.plusDays(1).atTime(6, 0)).toMinutes()))));
            }
            List<ControleGardes.Garde> gardes = new ArrayList<>();
            for (int i = 0, n = h.nextInt(4); i < n; i++) {
                LocalDateTime de = debut.plusDays(h.nextInt(10)).atTime(18 + h.nextInt(4), 0);
                gardes.add(new ControleGardes.Garde("g" + i, "Garde " + i, de, de.plusHours(6 + h.nextInt(10))));
            }
            Map<String, Object> r = ControleGardes.analyser(ventes, gardes, debut, fin);
            List<Map<String, Object>> sansVente = (List<Map<String, Object>>) r.get("gardesSansVente");
            List<Map<String, Object>> nuits = (List<Map<String, Object>>) r.get("nuitsSansGarde");
            /* gardes sans vente */
            long attendusSansVente = gardes.stream()
                    .filter(g -> ventes.stream().noneMatch(t -> !t.isBefore(g.debut) && t.isBefore(g.fin))).count();
            assertEquals(attendusSansVente, sansVente.size(), "cas " + cas);
            assertTrue(sansVente.stream().allMatch(m -> ((Number) m.get("ventes")).longValue() == 0), "cas " + cas);
            /* nuits : couvertes + signalees = toutes les ventes de nuit de la periode */
            long deNuit = 0, couvertes = 0;
            for (LocalDate d = debut; !d.isAfter(fin); d = d.plusDays(1)) {
                LocalDateTime de = d.atTime(21, 0), a = d.plusDays(1).atTime(6, 0);
                for (LocalDateTime t : ventes) {
                    if (!t.isBefore(de) && t.isBefore(a)) {
                        deNuit++;
                        if (gardes.stream().anyMatch(g -> g.couvre(t))) {
                            couvertes++;
                        }
                    }
                }
            }
            long signalees = nuits.stream().mapToLong(m -> ((Number) m.get("ventes")).longValue()).sum();
            assertEquals(deNuit, couvertes + signalees, "cas " + cas);
            assertTrue(nuits.stream().allMatch(m -> ((Number) m.get("ventes")).longValue() > 0), "cas " + cas);
            /* carte d'une garde : ses ventes, toutes */
            for (ControleGardes.Garde g : gardes) {
                List<AgregatsActivite.Vente> v = new ArrayList<>();
                ventes.forEach(t -> v.add(new AgregatsActivite.Vente("e", t, t, t.plusMinutes(1), 1, 100)));
                List<AgregatsActivite.Vente> pendant = ControleGardes.pendant(v, g.debut, g.fin);
                assertEquals(ControleGardes.ventesEntre(ventes, g.debut, g.fin), pendant.size(), "cas " + cas);
                assertTrue(pendant.stream().allMatch(x -> g.couvre(x.ouvertureVente())), "cas " + cas);
            }
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void casLimites() {
        LocalDate j = LocalDate.of(2026, 11, 3);
        List<LocalDateTime> ventes = List.of(j.atTime(21, 0), j.atTime(20, 59), j.plusDays(1).atTime(5, 59),
                j.plusDays(1).atTime(6, 0));
        /* sans garde : 21 h 00 et 5 h 59 signalees ; 20 h 59 et 6 h 00 hors nuit */
        Map<String, Object> r = ControleGardes.analyser(ventes, List.of(), j, j);
        List<Map<String, Object>> nuits = (List<Map<String, Object>>) r.get("nuitsSansGarde");
        assertEquals(1, nuits.size());
        assertEquals(2L, ((Number) nuits.get(0).get("ventes")).longValue());
        assertEquals("Nuit du 03/11 au 04/11", nuits.get(0).get("libelle"));
        /* garde 20 h - 8 h : tout est couvert ; garde sans vente le lendemain */
        r = ControleGardes.analyser(ventes,
                List.of(new ControleGardes.Garde("a", "A", j.atTime(20, 0), j.plusDays(1).atTime(8, 0)),
                        new ControleGardes.Garde("b", "B", j.plusDays(1).atTime(20, 0), j.plusDays(2).atTime(8, 0))),
                j, j);
        assertEquals(0, ((List<?>) r.get("nuitsSansGarde")).size());
        assertEquals(1, ((List<?>) r.get("gardesSansVente")).size());
        assertEquals("B", ((List<Map<String, Object>>) r.get("gardesSansVente")).get(0).get("libelle"));
    }
}
