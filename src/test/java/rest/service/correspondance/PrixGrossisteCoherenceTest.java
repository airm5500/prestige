package rest.service.correspondance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.correspondance.PrixGrossisteRegles.Lecture;
import rest.service.correspondance.PrixGrossisteRegles.Nature;

/**
 * Coherence de l'historique des prix grossistes (lot 4). Des milliers de suites de lectures tirees avec une graine fixe
 * (BL successifs : prix repetes, zeros, prix absents, natures HT, TTC et inconnue melangees) sont appliquees a la regle
 * ; on verifie :
 * <ul>
 * <li>nombre de lignes ecrites = oracle ecrit a part (une lecture compte si un de ses prix change par rapport a la
 * derniere lecture de meme nature) ;</li>
 * <li>aucune perte : apres chaque lecture, le dernier prix de chaque nature lu dans l'historique est le dernier prix de
 * cette nature lu ;</li>
 * <li>jamais deux prix egaux de suite pour une meme nature, jamais de ligne vide ni de prix nul ou negatif ;</li>
 * <li>HT et TTC jamais melanges : un prix TTC ne masque jamais un prix HT egal ou different.</li>
 * </ul>
 */
class PrixGrossisteCoherenceTest {

    private static final long GRAINE = 20261109L;
    private static final int[] VALEURS = { 0, -5, 845, 900, 1200, 1500, 2350 };

    private static Nature nature(Random r) {
        return Nature.values()[r.nextInt(Nature.values().length)];
    }

    private static Integer valeur(Random r) {
        return r.nextInt(6) == 0 ? null : VALEURS[r.nextInt(VALEURS.length)];
    }

    @Test
    void historiqueEgalALOracleSansPerteNiDoublon() {
        Random r = new Random(GRAINE);
        int ecrites = 0, lues = 0, ignorees = 0;
        for (int suite = 0; suite < 4_000; suite++) {
            // une seule nature pour toute la suite dans un cas sur deux, sinon melange
            boolean melange = r.nextBoolean();
            Nature na = nature(r), np = nature(r);
            List<Lecture> historique = new ArrayList<>();
            Map<Nature, Integer> oracleAchat = new EnumMap<>(Nature.class), oraclePublic = new EnumMap<>(Nature.class);
            int attendues = 0;
            int n = 1 + r.nextInt(12);
            for (int i = 0; i < n; i++) {
                Lecture l = new Lecture(valeur(r), melange ? nature(r) : na, valeur(r), melange ? nature(r) : np);
                lues++;
                // oracle : derniers prix strictement positifs lus, par nature
                Integer a = l.achat, p = l.pub;
                boolean change = (a != null && !a.equals(oracleAchat.get(l.natureAchat)))
                        || (p != null && !p.equals(oraclePublic.get(l.naturePublic)));
                if (a != null) {
                    oracleAchat.put(l.natureAchat, a);
                }
                if (p != null) {
                    oraclePublic.put(l.naturePublic, p);
                }
                if (change) {
                    attendues++;
                }
                if (PrixGrossisteRegles.aEcrire(historique, l)) {
                    historique.add(l);
                    ecrites++;
                } else {
                    ignorees++;
                }
                for (Nature x : Nature.values()) {
                    assertEquals(oracleAchat.get(x), PrixGrossisteRegles.dernierAchat(historique, x), "perte achat");
                    assertEquals(oraclePublic.get(x), PrixGrossisteRegles.dernierPublic(historique, x), "perte public");
                }
            }
            assertEquals(attendues, historique.size(), "nombre de lignes");
            for (Nature x : Nature.values()) {
                Integer precA = null, precP = null;
                for (Lecture l : historique) {
                    assertFalse(l.vide(), "ligne vide");
                    assertTrue(l.achat == null || l.achat > 0);
                    assertTrue(l.pub == null || l.pub > 0);
                    if (l.achat != null && l.natureAchat == x) {
                        // un prix d'achat repete n'est admis que si la ligne est ecrite pour son prix public
                        assertTrue(
                                !l.achat.equals(precA) || l.pub != null && !l.pub.equals(precP) || l.naturePublic != x,
                                "achat repete sans raison");
                        precA = l.achat;
                    }
                    if (l.pub != null && l.naturePublic == x) {
                        precP = l.pub;
                    }
                }
            }
        }
        // les tirages couvrent les deux issues
        assertTrue(ecrites > 1_000 && ignorees > 1_000, ecrites + " / " + ignorees + " / " + lues);
    }

    @Test
    void ecartPublicEnTtcSeulementEtAlerteAuDelaDuSeuil() {
        Random r = new Random(GRAINE + 1);
        int alertes = 0, comparees = 0, nonComparees = 0;
        for (int i = 0; i < 20_000; i++) {
            Integer pub = r.nextInt(8) == 0 ? null : r.nextInt(5) == 0 ? 0 : r.nextInt(30_000) - 1_000;
            Integer prestige = r.nextInt(8) == 0 ? null
                    : r.nextInt(5) == 0 ? (pub == null ? 0 : pub) : r.nextInt(30_000);
            Nature n = Nature.values()[r.nextInt(Nature.values().length)];
            int seuil = r.nextInt(6) == 0 ? -r.nextInt(50) : r.nextInt(4) == 0 ? 0 : r.nextInt(2_000);
            PrixGrossisteRegles.Ecart e = PrixGrossisteRegles.ecartPublic(pub, n, prestige, seuil);
            boolean comparable = n == Nature.TTC && pub != null && pub > 0 && prestige != null && prestige > 0;
            if (!comparable) {
                assertEquals(null, e, "HT, inconnue, absent ou nul : jamais compare");
                nonComparees++;
                continue;
            }
            comparees++;
            // ecart = public - prestige ; alerte <=> |ecart| > max(0, seuil) ; seuil 0 : tout ecart non nul
            assertEquals(pub - prestige, e.valeur);
            assertEquals(Math.abs(pub - prestige) > Math.max(0, seuil), e.alerte);
            if (seuil <= 0) {
                assertEquals(pub.intValue() != prestige.intValue(), e.alerte);
            }
            if (e.valeur == 0) {
                assertFalse(e.alerte, "aucun ecart, aucune alerte");
            }
            alertes += e.alerte ? 1 : 0;
        }
        assertTrue(comparees > 3_000 && nonComparees > 3_000 && alertes > 1_000 && alertes < comparees,
                comparees + " / " + nonComparees + " / " + alertes);
        assertEquals(0, PrixGrossisteRegles.seuil(null));
        assertEquals(0, PrixGrossisteRegles.seuil("abc"));
        assertEquals(0, PrixGrossisteRegles.seuil("-5"));
        assertEquals(150, PrixGrossisteRegles.seuil(" 150 "));
    }

    @Test
    void casDeBase() {
        List<Lecture> h = new ArrayList<>();
        Lecture l1 = new Lecture(845, Nature.INCONNUE, 1200, Nature.INCONNUE);
        assertTrue(PrixGrossisteRegles.aEcrire(h, l1));
        h.add(l1);
        // meme BL rejoue, ou BL suivant au meme prix : rien
        assertFalse(PrixGrossisteRegles.aEcrire(h, new Lecture(845, Nature.INCONNUE, 1200, Nature.INCONNUE)));
        // ligne d'unites gratuites (prix 0) : rien
        assertFalse(PrixGrossisteRegles.aEcrire(h, new Lecture(0, Nature.INCONNUE, 0, Nature.INCONNUE)));
        assertTrue(new Lecture(0, Nature.HT, null, Nature.TTC).vide());
        // meme valeur, autre nature : ecrite, jamais comparee a l'autre nature
        assertTrue(PrixGrossisteRegles.aEcrire(h, new Lecture(845, Nature.HT, null, Nature.TTC)));
        // seul le prix public change
        assertTrue(PrixGrossisteRegles.aEcrire(h, new Lecture(845, Nature.INCONNUE, 1250, Nature.INCONNUE)));
        // retour a un ancien prix apres un changement : ecrit
        h.add(new Lecture(900, Nature.INCONNUE, null, Nature.INCONNUE));
        assertTrue(PrixGrossisteRegles.aEcrire(h, new Lecture(845, Nature.INCONNUE, null, Nature.INCONNUE)));
        assertEquals(Integer.valueOf(1200), PrixGrossisteRegles.dernierPublic(h, Nature.INCONNUE));
        assertNotEquals(PrixGrossisteRegles.dernierAchat(h, Nature.HT),
                PrixGrossisteRegles.dernierAchat(h, Nature.INCONNUE));
    }
}
