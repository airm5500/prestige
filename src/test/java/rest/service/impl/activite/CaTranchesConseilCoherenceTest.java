package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 10 : CA par employe et tranche horaire, attribution « Conseil ». Regles verifiees sur des
 * milliers de cas tires au hasard (graine fixe), ventes avec et sans conseil, montants et heures varies, tailles de 1 a
 * 6 h :
 * <ul>
 * <li>chaque conseiller : CA et ventes = somme de ses ventes ; ventes sans conseil = ligne « Sans conseil » ;</li>
 * <li>somme des lignes = total = CA de la periode, identique pour les trois attributions ;</li>
 * <li>filtre Employe : seules les ventes qu'il a conseillees ;</li>
 * <li>CONSEIL reconnu sans tenir compte de la casse ; valeur inconnue = CAISSIER.</li>
 * </ul>
 */
class CaTranchesConseilCoherenceTest {

    @Test
    @SuppressWarnings("unchecked")
    void milliersDeVentes() {
        Random r = new Random(1011L);
        Map<String, String> noms = Map.of("A", "Alice", "B", "Bruno", "C", "Carla", "D", "Dina");
        String[] emps = { "A", "B", "C", "D" };
        for (int essai = 0; essai < 1500; essai++) {
            List<CaTranchesEmploye.Vente> ventes = new ArrayList<>();
            Map<String, long[]> attendu = new HashMap<>();
            long ca = 0;
            int n = 1 + r.nextInt(80);
            for (int i = 0; i < n; i++) {
                String conseil = r.nextInt(3) == 0 ? (r.nextBoolean() ? null : " ") : emps[r.nextInt(4)];
                long m = 100 + r.nextInt(90000);
                ventes.add(new CaTranchesEmploye.Vente(emps[r.nextInt(4)], r.nextBoolean() ? emps[r.nextInt(4)] : null,
                        emps[r.nextInt(4)], LocalDateTime.of(2026, 10, 1 + r.nextInt(28), r.nextInt(24), r.nextInt(60)),
                        m, conseil));
                String cle = conseil == null || conseil.isBlank() ? CaTranchesEmploye.SANS_CONSEIL : conseil;
                long[] x = attendu.computeIfAbsent(cle, k -> new long[2]);
                x[0] += m;
                x[1]++;
                ca += m;
            }
            int taille = 1 + r.nextInt(6);
            Map<String, Object> d = CaTranchesEmploye.calculer(ventes, taille, "conseil", noms, null);
            assertEquals(CaTranchesEmploye.CONSEIL, d.get("attribution"));
            List<Map<String, Object>> lignes = (List<Map<String, Object>>) d.get("lignes");
            assertEquals(attendu.size(), lignes.size());
            long somme = 0;
            for (Map<String, Object> l : lignes) {
                long[] x = attendu.get(l.get("id"));
                assertEquals(x[0], l.get("ca"));
                assertEquals(x[1], l.get("ventes"));
                long cellules = ((List<Map<String, Object>>) l.get("cellules")).stream()
                        .mapToLong(c -> (Long) c.get("ca")).sum();
                assertEquals(x[0], cellules, "somme des tranches = total de la ligne");
                if (CaTranchesEmploye.SANS_CONSEIL.equals(l.get("id"))) {
                    assertEquals("Sans conseil", l.get("nom"));
                } else {
                    assertEquals(noms.get(l.get("id")), l.get("nom"));
                }
                somme += x[0];
            }
            assertEquals(ca, somme);
            assertEquals(ca, ((Map<String, Object>) d.get("totaux")).get("ca"));
            for (String a : new String[] { "CAISSIER", "VENDEUR" }) {
                assertEquals(ca,
                        ((Map<String, Object>) CaTranchesEmploye.calculer(ventes, taille, a, noms, null).get("totaux"))
                                .get("ca"),
                        "meme CA quelle que soit l'attribution");
            }
            String e = emps[r.nextInt(4)];
            Map<String, Object> f = CaTranchesEmploye.calculer(ventes, taille, "CONSEIL", noms, e);
            long attenduE = attendu.containsKey(e) ? attendu.get(e)[0] : 0;
            assertEquals(attenduE, ((Map<String, Object>) f.get("totaux")).get("ca"), "filtre Employe : ses conseils");
            assertTrue(((List<Map<String, Object>>) f.get("lignes")).stream().allMatch(l -> e.equals(l.get("id"))));
        }
        assertEquals(CaTranchesEmploye.CAISSIER, CaTranchesEmploye.attribution("inconnu"));
        assertEquals(CaTranchesEmploye.CONSEIL, CaTranchesEmploye.attribution(" Conseil "));
    }
}
