package rest.service.impl.achats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 19/11, point 16 : reglements fournisseurs, sur 5 000 grossistes tires au hasard (graine fixe ; 0 a 25 BL de 0
 * a 3 000 000, BL deja regles ou en partie, 1 a 6 reglements successifs, BL coches ou non, annulations, montants
 * au-dela du du, date de depart deplacee) :
 * <ul>
 * <li>somme des parts = montant ; aucune part sur un BL deja regle ; restant jamais negatif ;</li>
 * <li>les plus anciens d'abord : un BL ne recoit rien tant qu'un plus ancien n'est pas solde ;</li>
 * <li>reglements successifs : regle cumule, statut derive (NON REGLE / REGLE EN PARTIE / REGLE) ;</li>
 * <li>annulation : rend exactement les parts (regle et restant d'avant) ;</li>
 * <li>montant superieur au du, nul ou negatif : refuse, rien de reparti ;</li>
 * <li>date de depart : total du = somme des restants des BL dates du jour de depart ou apres ;</li>
 * <li>tranches d'age : chaque BL dans une seule tranche, bornes 30 / 60 / 90 jours.</li>
 * </ul>
 */
class ReglementFournisseurCoherenceTest {

    private static final LocalDate JOUR = LocalDate.of(2026, 11, 20);

    @Test
    void reglementsSuccessifsEtAnnulations() {
        Random r = new Random(20261120L);
        int refus = 0, annulations = 0, coches = 0, soldes = 0;
        for (int cas = 0; cas < 5000; cas++) {
            int n = r.nextInt(26);
            Map<String, int[]> bls = new HashMap<>(); /* id -> {ttc, regle} */
            Map<String, LocalDate> dates = new HashMap<>();
            for (int i = 0; i < n; i++) {
                int ttc = r.nextInt(10) == 0 ? 0 : 500 + r.nextInt(3_000_000);
                int etat = r.nextInt(4);
                int regle = etat == 0 ? ttc : etat == 1 && ttc > 0 ? r.nextInt(ttc) : 0;
                String id = "BL" + i;
                bls.put(id, new int[] { ttc, regle });
                dates.put(id, JOUR.minusDays(r.nextInt(200)));
            }
            String ici = "cas " + cas;
            int nbReglements = 1 + r.nextInt(6);
            for (int k = 0; k < nbReglements; k++) {
                List<ReglementFournisseurRegles.Bl> liste = new ArrayList<>();
                bls.forEach((id, v) -> liste.add(new ReglementFournisseurRegles.Bl(id, dates.get(id), v[0], v[1])));
                List<ReglementFournisseurRegles.Bl> ordre;
                if (r.nextInt(3) == 0 && !liste.isEmpty()) {
                    /* BL coches, dans l'ordre de l'ecran */
                    ordre = new ArrayList<>();
                    for (ReglementFournisseurRegles.Bl b : liste) {
                        if (r.nextBoolean()) {
                            ordre.add(b);
                        }
                    }
                    coches++;
                } else {
                    ordre = ReglementFournisseurRegles.plusAnciensDAbord(liste);
                }
                long du = ReglementFournisseurRegles.du(ordre);
                int montant;
                int choix = r.nextInt(10);
                if (choix == 0) {
                    montant = (int) Math.min(Integer.MAX_VALUE, du + 1 + r.nextInt(1000));
                } else if (choix == 1) {
                    montant = -r.nextInt(2);
                } else if (choix == 2) {
                    montant = (int) du;
                } else {
                    montant = du <= 1 ? (int) du : 1 + r.nextInt((int) Math.min(du, Integer.MAX_VALUE - 1));
                }
                if (montant <= 0 || montant > du || du == 0) {
                    final int m = montant;
                    final List<ReglementFournisseurRegles.Bl> o = ordre;
                    assertThrows(ReglementFournisseurRegles.Refus.class,
                            () -> ReglementFournisseurRegles.repartir(m, o),
                            ici + " : refus attendu (" + m + " / du " + du + ")");
                    refus++;
                    continue;
                }
                Map<String, Integer> parts = ReglementFournisseurRegles.repartir(montant, ordre);
                assertEquals(montant, parts.values().stream().mapToInt(Integer::intValue).sum(),
                        ici + " : somme des parts = montant");
                /* ordre : seul le dernier BL servi peut rester en partie paye ; avant lui, tous soldes */
                boolean manque = false;
                for (ReglementFournisseurRegles.Bl b : ordre) {
                    int part = parts.getOrDefault(b.id, 0);
                    assertTrue(part >= 0 && part <= b.restant(), ici + " : part dans le restant");
                    if (b.restant() == 0) {
                        assertEquals(0, part, ici + " : rien sur un BL deja regle");
                    }
                    if (manque) {
                        assertEquals(0, part,
                                ici + " : un BL plus loin dans l'ordre ne recoit rien avant les precedents");
                    }
                    if (part < b.restant()) {
                        manque = true;
                    }
                }
                Map<String, int[]> avant = new HashMap<>();
                bls.forEach((id, v) -> avant.put(id, v.clone()));
                parts.forEach((id, p) -> bls.get(id)[1] += p);
                for (Map.Entry<String, int[]> e : bls.entrySet()) {
                    int ttc = e.getValue()[0], regle = e.getValue()[1];
                    int rest = ReglementFournisseurRegles.restant(ttc, regle);
                    assertTrue(rest >= 0, ici);
                    String st = ReglementFournisseurRegles.statut(ttc, regle);
                    assertEquals(regle <= 0 ? "NON REGLE" : regle >= ttc ? "REGLE" : "REGLE EN PARTIE", st, ici);
                    if (rest == 0 && ttc > 0) {
                        soldes++;
                    }
                }
                if (r.nextInt(4) == 0) {
                    /* annulation : rend exactement les parts */
                    parts.forEach((id, p) -> bls.get(id)[1] -= p);
                    for (String id : bls.keySet()) {
                        assertEquals(avant.get(id)[1], bls.get(id)[1], ici + " : annulation, regle d'avant");
                        assertEquals(ReglementFournisseurRegles.restant(avant.get(id)[0], avant.get(id)[1]),
                                ReglementFournisseurRegles.restant(bls.get(id)[0], bls.get(id)[1]), ici);
                    }
                    annulations++;
                }
            }
            /* date de depart : total du = somme des restants des BL suivis */
            LocalDate depart = JOUR.minusDays(r.nextInt(220));
            long attendu = 0;
            List<ReglementFournisseurRegles.Bl> suivis = new ArrayList<>();
            for (Map.Entry<String, int[]> e : bls.entrySet()) {
                LocalDate d = dates.get(e.getKey());
                if (!d.isBefore(depart)) {
                    attendu += ReglementFournisseurRegles.restant(e.getValue()[0], e.getValue()[1]);
                }
                if (ReglementFournisseurRegles.suivi(d, depart)) {
                    suivis.add(new ReglementFournisseurRegles.Bl(e.getKey(), d, e.getValue()[0], e.getValue()[1]));
                }
            }
            assertEquals(attendu, ReglementFournisseurRegles.du(suivis), ici + " : total du depuis la date de depart");
            /* tranches : une seule, bornes */
            Map<String, Long> parTranche = new HashMap<>();
            for (ReglementFournisseurRegles.Bl b : suivis) {
                parTranche.merge(ReglementFournisseurRegles.tranche(b.date, JOUR), (long) b.restant(), Long::sum);
            }
            assertEquals(attendu, parTranche.values().stream().mapToLong(Long::longValue).sum(),
                    ici + " : somme des tranches = total du");
        }
        assertTrue(refus > 2000 && annulations > 2000 && coches > 3000 && soldes > 10000,
                refus + " refus, " + annulations + " annulations, " + coches + " coches, " + soldes + " soldes");
    }

    @Test
    void tranchesEtModes() {
        assertEquals("0-30", ReglementFournisseurRegles.tranche(JOUR.minusDays(30), JOUR));
        assertEquals("31-60", ReglementFournisseurRegles.tranche(JOUR.minusDays(31), JOUR));
        assertEquals("31-60", ReglementFournisseurRegles.tranche(JOUR.minusDays(60), JOUR));
        assertEquals("61-90", ReglementFournisseurRegles.tranche(JOUR.minusDays(61), JOUR));
        assertEquals("61-90", ReglementFournisseurRegles.tranche(JOUR.minusDays(90), JOUR));
        assertEquals(">90", ReglementFournisseurRegles.tranche(JOUR.minusDays(91), JOUR));
        assertEquals("0-30", ReglementFournisseurRegles.tranche(JOUR.plusDays(3), JOUR));
        assertEquals("ESPECES", ReglementFournisseurRegles.mode("Espèces"));
        assertEquals("CHEQUE", ReglementFournisseurRegles.mode("chèque"));
        assertEquals("MOBILE_MONEY", ReglementFournisseurRegles.mode("mobile money"));
        assertEquals("VIREMENT", ReglementFournisseurRegles.mode("VIREMENT"));
        assertThrows(ReglementFournisseurRegles.Refus.class, () -> ReglementFournisseurRegles.mode("bitcoin"));
        assertEquals(0, ReglementFournisseurRegles.regle(5000, null, "NON REGLE"));
        assertEquals(5000, ReglementFournisseurRegles.regle(5000, null, "REGLE"));
        assertEquals(1200, ReglementFournisseurRegles.regle(5000, 1200, "REGLE"));
        assertEquals(0, ReglementFournisseurRegles.regle(5000, -10, null));
        assertEquals(0,
                ReglementFournisseurRegles.restant(5000, ReglementFournisseurRegles.regle(5000, null, "REGLE")));
        assertTrue(ReglementFournisseurRegles.suivi(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 1)));
        assertTrue(!ReglementFournisseurRegles.suivi(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 11, 1)));
    }
}
