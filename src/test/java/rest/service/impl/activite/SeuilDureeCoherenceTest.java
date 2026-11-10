package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 10 : critere des ventes longues parametrable et enregistre pour tous. Regles verifiees sur des
 * milliers de cas tires au hasard (graine fixe) :
 * <ul>
 * <li>« au moins m » = « plus de m » + les ventes de m min pile ; « moins de » = non « au moins » ; « au plus » = non «
 * plus de » ; le compte des ventes retenues suit ces memes egalites ;</li>
 * <li>lecture des parametres : texte valide = valeur, texte vide, illisible ou hors bornes = defaut (plus de 10 min)
 * ;</li>
 * <li>critere retenu : sans essai, le critere enregistre ; un essai partiel est complete par le critere
 * enregistre.</li>
 * </ul>
 */
class SeuilDureeCoherenceTest {

    private static final String[] OPS = { "GT", "GE", "LT", "LE" };

    @Test
    void lesQuatreOperateursSontCoherentsEntreEux() {
        Random r = new Random(20261110L);
        for (int i = 0; i < 5000; i++) {
            int m = 1 + r.nextInt(240);
            int n = 1 + r.nextInt(60);
            long[] durees = new long[n];
            long gt = 0, ge = 0, lt = 0, le = 0, pile = 0;
            for (int k = 0; k < n; k++) {
                /* un tiers des durees tombent pile sur la borne ou juste a cote */
                durees[k] = r.nextInt(3) == 0 ? m * 60L + r.nextInt(3) - 1 : r.nextInt(4 * 3600);
                long d = durees[k];
                gt += SeuilDuree.de("GT", m).retient(d) ? 1 : 0;
                ge += SeuilDuree.de("GE", m).retient(d) ? 1 : 0;
                lt += SeuilDuree.de("LT", m).retient(d) ? 1 : 0;
                le += SeuilDuree.de("LE", m).retient(d) ? 1 : 0;
                pile += d == m * 60L ? 1 : 0;
                assertEquals(SeuilDuree.de("GE", m).retient(d), !SeuilDuree.de("LT", m).retient(d));
                assertEquals(SeuilDuree.de("LE", m).retient(d), !SeuilDuree.de("GT", m).retient(d));
            }
            assertEquals(ge, gt + pile, "au moins = plus de + pile");
            assertEquals(le, lt + pile, "au plus = moins de + pile");
            assertEquals(n, ge + lt, "au moins + moins de = toutes les ventes");
            assertEquals(n, gt + le, "plus de + au plus = toutes les ventes");
            assertTrue(gt >= 0 && lt >= 0);
        }
    }

    @Test
    void lectureDesParametres() {
        Random r = new Random(7L);
        for (int i = 0; i < 3000; i++) {
            String op = OPS[r.nextInt(4)];
            int m = 1 + r.nextInt(240);
            SeuilDuree s = SeuilDuree.lu(r.nextBoolean() ? op.toLowerCase() : op, (r.nextBoolean() ? " " : "") + m);
            assertEquals(op, s.getOperateur());
            assertEquals(m, s.getMinutes());
        }
        for (String[] t : new String[][] { { null, null }, { "", "" }, { "XX", "8" }, { "GE", "abc" }, { "GE", "0" },
                { "GE", "241" }, { "GE", "-5" }, { "GE", "99999" }, { "GE", "8.5" } }) {
            SeuilDuree s = SeuilDuree.lu(t[0], t[1]);
            boolean opOk = t[0] != null && t[0].matches("GE");
            boolean minOk = t[1] != null && t[1].matches("\\d{1,3}") && Integer.parseInt(t[1]) >= 1
                    && Integer.parseInt(t[1]) <= 240;
            assertEquals(opOk ? "GE" : "GT", s.getOperateur(),
                    String.join("|", String.valueOf(t[0]), String.valueOf(t[1])));
            assertEquals(minOk ? Integer.parseInt(t[1]) : 10, s.getMinutes());
        }
    }

    @Test
    void critereRetenuEssaiOuEnregistre() {
        Random r = new Random(11L);
        for (int i = 0; i < 3000; i++) {
            SeuilDuree e = SeuilDuree.de(OPS[r.nextInt(4)], 1 + r.nextInt(240));
            assertSame(e, SeuilDuree.retenu(null, null, e), "sans essai : le critere enregistre");
            assertSame(e, SeuilDuree.retenu("  ", null, e));
            String op = OPS[r.nextInt(4)];
            int m = 1 + r.nextInt(240);
            SeuilDuree complet = SeuilDuree.retenu(op, m, e);
            assertEquals(op, complet.getOperateur());
            assertEquals(m, complet.getMinutes());
            SeuilDuree sansMin = SeuilDuree.retenu(op, null, e);
            assertEquals(op, sansMin.getOperateur());
            assertEquals(e.getMinutes(), sansMin.getMinutes());
            SeuilDuree sansOp = SeuilDuree.retenu(null, m, e);
            assertEquals(e.getOperateur(), sansOp.getOperateur());
            assertEquals(m, sansOp.getMinutes());
            /* essai invalide : defaut, jamais une valeur hors bornes */
            SeuilDuree invalide = SeuilDuree.retenu(op, 0, e);
            assertTrue(invalide.getMinutes() >= 1 && invalide.getMinutes() <= 240);
        }
    }
}
