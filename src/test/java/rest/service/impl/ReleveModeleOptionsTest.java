package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.ReleveModele.Cellule;
import rest.service.impl.ReleveModele.Champ;
import rest.service.impl.ReleveModele.LigneBrute;
import rest.service.impl.ReleveModele.Modele;

/**
 * Plan du 09/11, pointage BL : options du reglage de releve d'un grossiste. Lignes ignorees (TEDIS « PR-ABO »,
 * abonnement : pas une livraison) et montant compare TTC (Copharmed). Un reglage memorise avant ces options se relit
 * comme avant (HT), avec les abonnements ignores.
 */
class ReleveModeleOptionsTest {

    /** colonnes du releve TEDIS : Type | N° BL | Date | HT Brut | Ristourne | HT Net | TVA | TTC */
    static final float[] X = { 50, 100, 170, 230, 280, 330, 380, 430 };

    static LigneBrute ligne(String... v) {
        List<Cellule> c = new ArrayList<>();
        for (int i = 0; i < v.length; i++) {
            c.add(new Cellule(v[i], X[i], X[i] + 30));
        }
        return new LigneBrute(1, c);
    }

    static List<LigneBrute> tedis() {
        return Arrays.asList(ligne("Type", "N° BL", "Date", "HT Brut", "Ristourne", "HT Net", "TVA", "Montant TTC"),
                ligne("BL", "2625920370-BKE", "16/09/2026", "24 534", "0", "24 534", "3 067", "27 601"),
                ligne("BL", "2626222101-BKE", "19/09/2026", "791 980", "0", "791 980", "0", "791 980"),
                ligne("AV", "AV-2627127450-BKE", "28/09/2026", "-347 050", "0", "-347 050", "0", "-347 050"),
                ligne("PR-ABO", "2627337319-BKE", "30/09/2026", "6 356", "0", "6 356", "1 144", "7 500"));
    }

    static Modele modele(List<LigneBrute> l, int colonneMontant, String ignores, boolean ttc) {
        List<ReleveModele.Colonne> cols = ReleveModele.colonnes(l);
        Map<Champ, Integer> r = new java.util.EnumMap<>(Champ.class);
        r.put(Champ.TYPE, 0);
        r.put(Champ.NUMERO, 1);
        r.put(Champ.DATE, 2);
        r.put(Champ.MONTANT, colonneMontant);
        return ReleveModele.modele(r, cols, "AV", ignores, ttc);
    }

    @Test
    void abonnementIgnore() {
        List<ReleveGrossiste.Ligne> lues = ReleveModele.lire(tedis(), modele(tedis(), 5, "ABO", false));
        assertEquals(3, lues.size());
        assertTrue(lues.stream().noneMatch(x -> x.numeroBl.equals("2627337319")));
        assertEquals(ReleveGrossiste.Type.AVOIR, lues.get(2).type);
        assertEquals(-347050, lues.get(2).montantHt);
        assertEquals(1, ReleveModele.ignorees(tedis(), modele(tedis(), 5, "ABO", false)).size());
    }

    @Test
    void sansMarqueurRienIgnore() {
        assertEquals(4, ReleveModele.lire(tedis(), modele(tedis(), 5, "", false)).size());
        assertEquals(0, ReleveModele.ignorees(tedis(), modele(tedis(), 5, "", false)).size());
    }

    @Test
    void optionsMemorisees() {
        Modele m = Modele.lire(modele(tedis(), 7, "ABO, FRAIS", true).json().toString());
        assertEquals("ABO, FRAIS", m.marqueursIgnores);
        assertTrue(m.montantTtc);
        assertEquals(27601, ReleveModele.lire(tedis(), m).get(0).montantHt);
    }

    /** reglage enregistre avant le 09/11 : HT, abonnements ignores par defaut */
    @Test
    void ancienReglage() {
        Modele m = Modele.lire("{\"version\":1,\"colonnes\":{\"TYPE\":65,\"NUMERO\":115,\"DATE\":185,\"MONTANT\":345},"
                + "\"marqueursAvoir\":\"AV\"}");
        assertFalse(m.montantTtc);
        assertEquals("ABO", m.marqueursIgnores);
        assertEquals(3, ReleveModele.lire(tedis(), m).size());
    }
}
