package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.dto.ActiviteAnalysesDTO;
import rest.service.impl.activite.AgregatsActivite.Bl;
import rest.service.impl.activite.AgregatsActivite.Vente;

/**
 * Plan du 09/11, point 10 : mesures de l'activite corrigees. Regles verifiees sur des milliers de cas tires au hasard
 * (graine fixe), avec des ventes aberrantes (ligne retouchee apres l'encaissement, vente laissee ouverte), des
 * preventes reprises, des quantites de lignes variees et plusieurs operateurs :
 * <ul>
 * <li>saisie d'une vente : 0 &lt;= saisie &lt;= duree ; temps au clavier &lt;= saisie et &lt;= 15 min ;</li>
 * <li>charge du jour : somme des temps au clavier des ventes retenues du jour, jamais plus de 15 min par vente ; somme
 * des jours = somme des ventes ;</li>
 * <li>vitesse d'un operateur : mediane des secondes entre deux lignes (ventes d'au moins 2 lignes) recalculee
 * independamment, entre le min et le max des ventes mesurees ; les preventes reprises n'y entrent pas (ajouter des
 * reprises aberrantes ne la change pas) ;</li>
 * <li>somme des ventes des operateurs = toutes les ventes ;</li>
 * <li>BL : temps = derniere ligne - ouverture du BL, quelle que soit la date de commande.</li>
 * </ul>
 */
class MesuresActiviteCoherenceTest {

    static final LocalDateTime J = LocalDateTime.of(2026, 10, 5, 8, 0);

    static Vente tirer(Random r, String emp, boolean reprise) {
        LocalDateTime o = J.plusDays(r.nextInt(6)).plusMinutes(r.nextInt(600));
        long duree = r.nextInt(10) == 0 ? 3600 + r.nextInt(7200) : r.nextInt(1800);
        /* une fois sur cinq, la derniere ligne est retouchee apres l'encaissement */
        long saisie = r.nextInt(5) == 0 ? duree + r.nextInt(20000) : (duree == 0 ? 0 : r.nextInt((int) duree + 1));
        long lignes = r.nextInt(12) == 0 ? 0 : 1 + r.nextInt(8);
        return new Vente(emp, o, o.plusSeconds(saisie), o.plusSeconds(duree), lignes, 100 + r.nextInt(50000),
                String.valueOf(1 + r.nextInt(4)), false, reprise);
    }

    @Test
    void venteSaisieEtClavierBornes() {
        Random r = new Random(91011L);
        for (int i = 0; i < 20000; i++) {
            Vente v = tirer(r, "A", r.nextBoolean());
            assertTrue(v.saisie() >= 0 && v.saisie() <= Math.max(0, v.duree()), "saisie <= duree");
            assertTrue(v.clavier() <= v.saisie() && v.clavier() <= AgregatsActivite.CLAVIER_VENTE_MAX_SECONDES);
            assertEquals(v.mesuree(), v.retenue() && !v.reprise && v.lignes >= 2);
        }
    }

    @Test
    void chargeDuJourEtVitesseDesOperateurs() {
        Random r = new Random(20261109L);
        for (int cas = 0; cas < 1500; cas++) {
            int nOps = 1 + r.nextInt(4);
            List<Vente> ventes = new ArrayList<>();
            int n = 1 + r.nextInt(60);
            for (int k = 0; k < n; k++) {
                ventes.add(tirer(r, "E" + r.nextInt(nOps), r.nextInt(3) == 0));
            }
            /* charge du jour */
            List<ActiviteAnalysesDTO.Jour> jours = AgregatsActivite.jours(ventes, List.of());
            long attendu = ventes.stream().filter(Vente::retenue).mapToLong(Vente::clavier).sum();
            assertEquals(attendu, jours.stream().mapToLong(ActiviteAnalysesDTO.Jour::getSaisieVentes).sum());
            assertEquals(n, jours.stream().mapToLong(ActiviteAnalysesDTO.Jour::getVentes).sum());
            for (ActiviteAnalysesDTO.Jour j : jours) {
                assertTrue(j.getSaisieVentes() <= j.getVentes() * AgregatsActivite.CLAVIER_VENTE_MAX_SECONDES);
            }
            /* vitesse par operateur */
            List<ActiviteAnalysesDTO.Operateur> ops = AgregatsActivite.operateurs(ventes, Map.of());
            assertEquals(n, ops.stream().mapToLong(ActiviteAnalysesDTO.Operateur::getVentes).sum());
            Map<String, List<Double>> parLigne = new HashMap<>();
            for (Vente v : ventes) {
                if (v.retenue() && !v.reprise && v.lignes >= 2) {
                    parLigne.computeIfAbsent(v.employeId, x -> new ArrayList<>())
                            .add((double) v.saisie() / (v.lignes - 1));
                }
            }
            for (ActiviteAnalysesDTO.Operateur o : ops) {
                List<Double> l = parLigne.getOrDefault(o.getId(), List.of());
                assertEquals(l.size(), o.getVentesMesurees());
                double[] d = l.stream().mapToDouble(Double::doubleValue).toArray();
                Arrays.sort(d);
                double med = d.length == 0 ? 0
                        : d.length % 2 == 1 ? d[d.length / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
                assertEquals(AgregatsActivite.arrondi(med), o.getSecondesParLigne(), 1e-9);
                if (d.length > 0) {
                    assertTrue(o.getSecondesParLigne() >= AgregatsActivite.arrondi(d[0]) - 1e-9
                            && o.getSecondesParLigne() <= AgregatsActivite.arrondi(d[d.length - 1]) + 1e-9);
                    assertTrue(o.getSecondesParLigne() <= AgregatsActivite.VENTE_MAX_SECONDES);
                }
            }
            /* des preventes reprises aberrantes ne changent pas la vitesse des operateurs */
            List<Vente> plus = new ArrayList<>(ventes);
            for (int k = 0; k < 5; k++) {
                LocalDateTime o = J.plusMinutes(r.nextInt(600));
                plus.add(new Vente("E0", o, o.plusSeconds(3000), o.plusSeconds(3500), 1, 1000, "1", false, true));
            }
            Map<String, Double> avant = new HashMap<>(), apres = new HashMap<>();
            ops.forEach(o -> avant.put(o.getId(), o.getSecondesParLigne()));
            AgregatsActivite.operateurs(plus, Map.of()).forEach(o -> apres.put(o.getId(), o.getSecondesParLigne()));
            avant.forEach((id, v) -> assertEquals(v, apres.get(id), "reprises ecartees : " + id));
        }
    }

    @Test
    void blCompteDepuisSonOuverture() {
        Random r = new Random(5L);
        for (int i = 0; i < 5000; i++) {
            LocalDateTime cmd = J.minusDays(r.nextInt(5)).minusMinutes(r.nextInt(600));
            LocalDateTime ouv = J.plusMinutes(r.nextInt(600));
            long t = r.nextInt(6 * 3600);
            Bl b = new Bl("A", "G", cmd, ouv, ouv.plusSeconds(t), LocalDate.from(J), 1 + r.nextInt(30));
            assertEquals(t, b.total());
            assertEquals(t <= AgregatsActivite.BL_MAX_SECONDES, b.retenu());
            List<ActiviteAnalysesDTO.Jour> j = AgregatsActivite.jours(List.of(), List.of(b));
            assertEquals(b.retenu() ? t : 0, j.get(0).getSaisieBl());
        }
    }
}
