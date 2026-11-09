package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Coherence des regles de normalisation (plan du 07/11, §17) sur des milliers de cas tires au hasard (graine fixe) : un
 * montant affiche a la francaise redonne sa valeur exacte, une date jj/mm/aaaa redonne le jour sans heure, une liste de
 * colisages redonne ses valeurs, et « N/A » ne devient jamais zero.
 */
class NormalisationCoherenceTest {

    private static final long GRAINE = 20261107L;

    /** Montant ecrit comme a l'ecran : milliers separes par un espace (normal, insecable ou fin), virgule decimale. */
    private static String afficher(BigDecimal v, Random r) {
        String brut = v.abs().toPlainString();
        String entier = brut.contains(".") ? brut.substring(0, brut.indexOf('.')) : brut;
        String dec = brut.contains(".") ? brut.substring(brut.indexOf('.') + 1) : null;
        String[] seps = { " ", " ", " ", "" };
        String sep = seps[r.nextInt(seps.length)];
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < entier.length(); i++) {
            if (i > 0 && (entier.length() - i) % 3 == 0) {
                sb.append(sep);
            }
            sb.append(entier.charAt(i));
        }
        if (dec != null) {
            sb.append(',').append(dec);
        }
        String[] devises = { "", " CFA", " FCFA", "" };
        return (v.signum() < 0 ? "-" : "") + sb + devises[r.nextInt(devises.length)];
    }

    @Test
    void montantsAfficheesRedonnentLaValeurExacte() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < 20000; i++) {
            BigDecimal v = BigDecimal.valueOf(r.nextInt(50_000_000), r.nextInt(4) == 0 ? 2 : 0);
            if (r.nextInt(10) == 0) {
                v = v.negate();
            }
            String s = afficher(v, r);
            BigDecimal lu = Normalisation.montant(s);
            assertEquals(0, v.compareTo(lu), s);
        }
    }

    @Test
    void montantsAvecPointDecimal() {
        assertEquals(new BigDecimal("6431"), Normalisation.montant("6431"));
        assertEquals(new BigDecimal("2736"), Normalisation.montant("2 736 CFA"));
        assertEquals(new BigDecimal("1234.50"), Normalisation.montant("1.234,50"));
        assertEquals(new BigDecimal("1234.50"), Normalisation.montant("1,234.50"));
        assertEquals(new BigDecimal("12.5"), Normalisation.montant("12.5"));
        assertEquals(BigDecimal.ZERO, Normalisation.montant("0"));
    }

    @Test
    void inconnuVideEtAbsentNeDeviennentJamaisZero() {
        for (String s : new String[] { null, "", " ", "N/A", "n/a", "NA", "N.A.", "-", "CFA", "1.2.3", "1-2" }) {
            assertNull(Normalisation.montant(s), String.valueOf(s));
            assertNull(Normalisation.entier(s), String.valueOf(s));
        }
        assertNull(Normalisation.entier("2,5"));
        assertEquals(Integer.valueOf(0), Normalisation.entier("0"));
        assertNull(Normalisation.colisages("N/A"));
        assertNull(Normalisation.colisages(null));
        assertEquals(Collections.emptyList(), Normalisation.colisages(""));
        assertNull(Normalisation.colisages("12, douze"));
        assertTrue(Normalisation.inconnu(" N/A "));
        assertTrue(!Normalisation.inconnu("0") && !Normalisation.inconnu("") && !Normalisation.inconnu(null));
    }

    @Test
    void colisagesMultiplesRedonnentChaqueValeur() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < 5000; i++) {
            int n = 1 + r.nextInt(4);
            List<Integer> l = new ArrayList<>();
            StringBuilder sb = new StringBuilder();
            for (int k = 0; k < n; k++) {
                int c = 1 + r.nextInt(500);
                l.add(c);
                sb.append(k == 0 ? "" : r.nextBoolean() ? ", " : ",").append(c);
            }
            assertEquals(l, Normalisation.colisages(sb.toString()), sb.toString());
        }
        assertEquals(List.of(120, 140), Normalisation.colisages("120, 140"));
    }

    @Test
    void datesFrancaisesSansHeureInventee() {
        Random r = new Random(GRAINE + 2);
        LocalDate debut = LocalDate.of(2000, 1, 1);
        for (int i = 0; i < 10000; i++) {
            LocalDate d = debut.plusDays(r.nextInt(12000));
            String s = String.format("%02d/%02d/%04d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
            assertEquals(d, Normalisation.date(s));
            assertNull(Normalisation.dateHeure(s), "une date seule n'a pas d'heure");
        }
        assertNull(Normalisation.date("31/02/2026"));
        assertNull(Normalisation.date("2026-11-06"));
        assertNull(Normalisation.date("6/11/2026"));
        assertEquals("2026-11-06T14:05", Normalisation.dateHeure("06/11/2026 14:05").toString());
    }

    @Test
    void texteNettoyeSansConfondreNullEtVide() {
        assertNull(Normalisation.texte(null));
        assertEquals("", Normalisation.texte("   "));
        assertEquals("RABEMAC 20MG CPR B/14", Normalisation.texte("  RABEMAC  20MG\n CPR B/14 "));
    }
}
