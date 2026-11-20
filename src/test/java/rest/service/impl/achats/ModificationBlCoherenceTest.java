package rest.service.impl.achats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.impl.achats.ModificationBl.Champ;
import rest.service.impl.achats.ModificationBl.Etat;

/**
 * Plan du 19/11, point 12 : trace d'une modification de BL, sur 20 000 modifications tirees au hasard (graine fixe) :
 * <ul>
 * <li>un champ est trace si et seulement s'il a change ; aucune trace si rien ne change ;</li>
 * <li>TTC trace = HT + TVA, avant comme apres ;</li>
 * <li>detail du journal relu = champs traces (aller-retour), y compris numeros avec espaces, fleches ou retours a la
 * ligne ;</li>
 * <li>reglement : montant regle garde, reste = max(0, TTC − regle), jamais negatif ; statut REGLE si reste nul, REGLE
 * EN PARTIE sinon ; BL jamais regle : statut et reste absent inchanges.</li>
 * </ul>
 */
class ModificationBlCoherenceTest {

    private static final String[] NUMEROS = { "BL001", "BL 002", "A→B", "X : avant Y", "", null, "LIGNE\nDEUX",
            "bl001" };
    private static final String[] GROSSISTES = { "LABOREX", "COPHARMED", "DPCI", "UBIPHARM", null };

    private static Integer montant(Random r) {
        int t = r.nextInt(10);
        return t == 0 ? null : t == 1 ? 0 : r.nextInt(5_000_000);
    }

    private static Etat etat(Random r) {
        return new Etat(NUMEROS[r.nextInt(NUMEROS.length)],
                r.nextInt(8) == 0 ? null : LocalDate.of(2026, 1, 1).plusDays(r.nextInt(330)), montant(r), montant(r),
                GROSSISTES[r.nextInt(GROSSISTES.length)]);
    }

    private static Etat varier(Random r, Etat e) {
        return new Etat(r.nextInt(4) == 0 ? NUMEROS[r.nextInt(NUMEROS.length)] : e.numero,
                r.nextInt(4) == 0 ? LocalDate.of(2026, 1, 1).plusDays(r.nextInt(330)) : e.date,
                r.nextInt(4) == 0 ? montant(r) : e.ht, r.nextInt(4) == 0 ? montant(r) : e.tva,
                r.nextInt(4) == 0 ? GROSSISTES[r.nextInt(GROSSISTES.length)] : e.grossiste);
    }

    @Test
    void differencesEtAllerRetour() {
        Random r = new Random(20261119L);
        int sansChangement = 0;
        int ttcChange = 0;
        for (int cas = 0; cas < 20000; cas++) {
            Etat a = etat(r);
            Etat b = varier(r, a);
            List<Champ> l = ModificationBl.differences(a, b);
            String ici = "cas " + cas;
            List<String> attendus = new ArrayList<>();
            if (!ModificationBl.texte(a.numero).equals(ModificationBl.texte(b.numero))) {
                attendus.add(ModificationBl.NUMERO);
            }
            if (!ModificationBl.date(a.date).equals(ModificationBl.date(b.date))) {
                attendus.add(ModificationBl.DATE);
            }
            if (!ModificationBl.montant(a.ht).equals(ModificationBl.montant(b.ht))) {
                attendus.add(ModificationBl.HT);
            }
            if (!ModificationBl.montant(a.tva).equals(ModificationBl.montant(b.tva))) {
                attendus.add(ModificationBl.TVA);
            }
            if (!ModificationBl.montant(a.ttc()).equals(ModificationBl.montant(b.ttc()))) {
                attendus.add(ModificationBl.TTC);
                ttcChange++;
            }
            if (!ModificationBl.texte(a.grossiste).equals(ModificationBl.texte(b.grossiste))) {
                attendus.add(ModificationBl.GROSSISTE);
            }
            List<String> obtenus = new ArrayList<>();
            for (Champ c : l) {
                obtenus.add(c.libelle);
                assertTrue(!c.avant.equals(c.apres), ici + " : champ inchange trace " + c);
            }
            assertEquals(attendus, obtenus, ici);
            if (l.isEmpty()) {
                sansChangement++;
                assertEquals("", ModificationBl.detail(l), ici);
            }
            for (Champ c : l) {
                if (ModificationBl.TTC.equals(c.libelle)) {
                    assertEquals(ModificationBl.montant(a.ttc()), c.avant, ici);
                    assertEquals(ModificationBl.montant(b.ttc()), c.apres, ici);
                }
            }
            assertEquals(l, ModificationBl.lire(ModificationBl.detail(l)), ici + " : aller-retour du journal");
        }
        assertTrue(sansChangement > 1000, "modifications sans changement essayees : " + sansChangement);
        assertTrue(ttcChange > 3000, "TTC changes : " + ttcChange);
    }

    @Test
    void reglementApresModification() {
        Random r = new Random(19112026L);
        String[] statuts = { null, ModificationBl.NON_REGLE, ModificationBl.REGLE_EN_PARTIE, ModificationBl.REGLE };
        int partiel = 0;
        int solde = 0;
        for (int cas = 0; cas < 20000; cas++) {
            int ttc = r.nextInt(6) == 0 ? 0 : r.nextInt(3_000_000);
            Integer regle = r.nextInt(5) == 0 ? null : r.nextInt(3) == 0 ? 0 : r.nextInt(3_500_000) + 1;
            String statut = statuts[r.nextInt(statuts.length)];
            Integer restant = r.nextInt(3) == 0 ? null : r.nextInt(3_000_000);
            Object[] res = ModificationBl.reglement(ttc, regle, statut, restant);
            Integer reste = (Integer) res[0];
            String ici = "cas " + cas + " ttc " + ttc + " regle " + regle + " statut " + statut;
            if (regle != null && regle > 0) {
                assertEquals(Math.max(0, ttc - regle), (int) reste, ici);
                assertEquals(reste == 0 ? ModificationBl.REGLE : ModificationBl.REGLE_EN_PARTIE, res[1], ici);
                assertTrue(reste + Math.min(regle, ttc) == ttc, ici + " : reste + regle = TTC");
                if (reste == 0) {
                    solde++;
                } else {
                    partiel++;
                }
            } else if (statut == null || ModificationBl.NON_REGLE.equals(statut)) {
                assertEquals(statut, res[1], ici + " : statut inchange");
                if (restant == null) {
                    assertNull(reste, ici + " : pas de reste cree");
                } else {
                    assertEquals(ttc, (int) reste, ici);
                }
            } else {
                assertEquals(statut, res[1], ici);
            }
            assertTrue(reste == null || reste >= 0, ici + " : jamais negatif");
        }
        assertTrue(partiel > 1000 && solde > 1000, "partiels " + partiel + ", soldes " + solde);
    }

    @Test
    void miseEnForme() {
        assertEquals("1 234 567", ModificationBl.montant(1234567));
        assertEquals("0", ModificationBl.montant(0));
        assertEquals("-1 000", ModificationBl.montant(-1000));
        assertEquals("(vide)", ModificationBl.montant(null));
        assertEquals("05/11/2026", ModificationBl.date(LocalDate.of(2026, 11, 5)));
        assertEquals("Numéro : avant BL1 → après BL2", new Champ(ModificationBl.NUMERO, "BL1", "BL2").toString());
    }
}
