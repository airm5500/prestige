package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.impl.RapprochementBL.Piece;
import rest.service.impl.RapprochementBL.Resultat;
import rest.service.impl.RapprochementBL.Statut;

/**
 * Plan du 09/11, pointage BL : avoirs rapproches par leur propre numero (TEDIS « AV-2627127450-BKE ») et repli « a
 * confirmer » (meme nature, meme montant, date a 3 jours pres) quand aucun numero ne correspond : jamais pointe
 * automatiquement.
 */
class RapprochementAvoirsRepliTest {

    static final LocalDate J = LocalDate.of(2026, 9, 28);

    static ReleveGrossiste.Ligne bl(String num, LocalDate d, long ht) {
        return new ReleveGrossiste.Ligne(ReleveGrossiste.Type.BL, num, "", num, "", "", d, ht);
    }

    static ReleveGrossiste.Ligne av(String num, LocalDate d, long ht) {
        return new ReleveGrossiste.Ligne(ReleveGrossiste.Type.AVOIR, num, "", num, "", "", d, -Math.abs(ht));
    }

    static Resultat de(List<Resultat> r, ReleveGrossiste.Ligne l) {
        return r.stream().filter(x -> x.releve == l).findFirst().orElse(null);
    }

    /** Avoir TEDIS : son numero saisi comme reference d'avoir sur le retour, le retour porte le BL d'origine. */
    @Test
    void avoirParSonPropreNumero() {
        ReleveGrossiste.Ligne a = av("2627127450", J, 347050);
        Piece retour = new Piece("R:1", true, "2626222101-BKE", "AV-2627127450-BKE", "", J, 347050);
        List<Resultat> r = RapprochementBL.rapprocher(Arrays.asList(a), Arrays.asList(retour), 1);
        assertEquals(Statut.RAPPROCHE, de(r, a).statut);
        assertEquals(1, r.size());
    }

    /** Avoir sans reference saisie : meme montant, meme jour -> a confirmer, pas rapproche. */
    @Test
    void avoirSansReferenceAConfirmer() {
        ReleveGrossiste.Ligne a = av("2627127450", J, 347050);
        Piece retour = new Piece("R:1", true, "2626222101-BKE", null, "", J, 347050);
        Piece autre = new Piece("R:2", true, "2626222101-BKE", null, "", J, 0);
        List<Resultat> r = RapprochementBL.rapprocher(Arrays.asList(a), Arrays.asList(retour, autre), 1);
        assertEquals(Statut.PROBABLE, de(r, a).statut);
        assertEquals("R:1", de(r, a).piece.id);
        assertEquals(1, r.stream().filter(x -> x.statut == Statut.ABSENT_RELEVE && x.piece.id.equals("R:2")).count());
    }

    /** N° mal saisi dans Prestige (« 26255910091 » pour 2625910091) : meme montant et date -> a confirmer. */
    @Test
    void numeroMalSaisiAConfirmer() {
        ReleveGrossiste.Ligne b = bl("2625910091", J, 34705);
        Piece p = new Piece("B:1", false, "26255910091-VRI", null, "", J.plusDays(1), 34705);
        List<Resultat> r = RapprochementBL.rapprocher(Arrays.asList(b), Arrays.asList(p), 1);
        assertEquals(Statut.PROBABLE, de(r, b).statut);
        assertEquals(2, r.size() + 1, "une ligne pour le releve, la piece n'est plus absente du releve");
    }

    /** Deux pieces possibles au meme montant : pas de choix au hasard, chacun reste absent. */
    @Test
    void repliAmbiguRefuse() {
        ReleveGrossiste.Ligne b = bl("2625910091", J, 34705);
        Piece p1 = new Piece("B:1", false, "111", null, "", J, 34705);
        Piece p2 = new Piece("B:2", false, "222", null, "", J.minusDays(2), 34705);
        List<Resultat> r = RapprochementBL.rapprocher(Arrays.asList(b), Arrays.asList(p1, p2), 1);
        assertEquals(Statut.ABSENT_PRESTIGE, de(r, b).statut);
        assertNull(de(r, b).piece);
    }

    /** Hors fenetre de 3 jours, ou BL contre avoir : pas de repli. */
    @Test
    void repliBorne() {
        ReleveGrossiste.Ligne b = bl("2625910091", J, 34705);
        List<Resultat> r = RapprochementBL.rapprocher(Arrays.asList(b),
                Arrays.asList(new Piece("B:1", false, "111", null, "", J.plusDays(4), 34705),
                        new Piece("R:1", true, "111", null, "", J, 34705)),
                1);
        assertEquals(Statut.ABSENT_PRESTIGE, de(r, b).statut);
        r = RapprochementBL.rapprocher(Arrays.asList(b),
                Arrays.asList(new Piece("B:1", false, "111", null, "", J.minusDays(3), 34705)), 1);
        assertEquals(Statut.PROBABLE, de(r, b).statut);
    }

    /** Une piece deja rapprochee par son numero n'est jamais reprise par le repli. */
    @Test
    void numeroPrioritaireSurRepli() {
        ReleveGrossiste.Ligne b1 = bl("1000001", J, 5000), b2 = bl("1000002", J, 5000);
        Piece p1 = new Piece("B:1", false, "1000001", null, "", J, 5000);
        List<Resultat> r = RapprochementBL.rapprocher(Arrays.asList(b2, b1), Arrays.asList(p1), 1);
        assertEquals(Statut.RAPPROCHE, de(r, b1).statut);
        assertEquals(Statut.ABSENT_PRESTIGE, de(r, b2).statut);
    }

    /**
     * Coherence sur 3 000 releves tires au hasard (graine fixe) : chaque ligne du releve et chaque piece apparaissent
     * une seule fois ; RAPPROCHE / ECART = meme numero et meme nature ; PROBABLE = numero different, meme nature, meme
     * montant a la tolerance pres, date a 3 jours pres, et piece seule candidate.
     */
    @Test
    void coherenceAuHasard() {
        Random h = new Random(20261110L);
        for (int essai = 0; essai < 3000; essai++) {
            int n = 1 + h.nextInt(12);
            long tol = h.nextInt(3);
            List<ReleveGrossiste.Ligne> releve = new ArrayList<>();
            List<Piece> pieces = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                boolean avoir = h.nextInt(4) == 0;
                String num = String.valueOf(100000 + h.nextInt(40));
                long ht = (1 + h.nextInt(6)) * 1000L * (h.nextBoolean() ? 1 : 7);
                LocalDate d = J.plusDays(h.nextInt(9) - 4);
                if (h.nextInt(5) > 0) {
                    releve.add(avoir ? av(num, d, ht) : bl(num, d, ht));
                }
                if (h.nextInt(5) > 0) {
                    String ref = h.nextInt(4) == 0 ? String.valueOf(200000 + h.nextInt(40)) : "BKE-" + num;
                    String refAvoir = avoir && h.nextBoolean() ? "AV-" + num + "-BKE" : null;
                    pieces.add(new Piece((avoir ? "R:" : "B:") + i, avoir, ref, refAvoir, "",
                            d.plusDays(h.nextInt(3) - 1), ht + (h.nextInt(6) == 0 ? h.nextInt(4) : 0)));
                }
            }
            List<Resultat> r = RapprochementBL.rapprocher(releve, pieces, tol);
            Set<ReleveGrossiste.Ligne> vus = new HashSet<>();
            Map<String, Integer> pv = new HashMap<>();
            for (Resultat x : r) {
                if (x.releve != null) {
                    assertTrue(vus.add(x.releve), "ligne du releve en double, essai " + essai);
                }
                if (x.piece != null) {
                    pv.merge(x.piece.id, 1, Integer::sum);
                }
                if (x.releve != null && x.piece != null) {
                    assertEquals(x.releve.type == ReleveGrossiste.Type.AVOIR, x.piece.avoir, "nature, essai " + essai);
                    assertEquals(Math.abs(x.releve.montantHt) - Math.abs(x.piece.montantHt), x.ecart);
                }
                boolean memeNumero = x.piece != null && x.releve != null
                        && (RapprochementBL.numero(x.piece.reference).equals(RapprochementBL.numero(x.releve.numeroBl))
                                || x.piece.referenceAvoir != null && RapprochementBL.numero(x.piece.referenceAvoir)
                                        .equals(RapprochementBL.numero(x.releve.numeroBl)));
                switch (x.statut) {
                case RAPPROCHE:
                    assertTrue(memeNumero && Math.abs(x.ecart) <= tol, "rapproche, essai " + essai);
                    break;
                case ECART:
                    assertTrue(memeNumero && Math.abs(x.ecart) > tol, "ecart, essai " + essai);
                    break;
                case PROBABLE:
                    assertTrue(!memeNumero && Math.abs(x.ecart) <= tol, "a confirmer, essai " + essai);
                    assertTrue(Math.abs(ChronoUnit.DAYS.between(x.releve.date, x.piece.date)) <= 3,
                            "fenetre, essai " + essai);
                    break;
                case ABSENT_PRESTIGE:
                    assertNull(x.piece);
                    break;
                case ABSENT_RELEVE:
                    assertNull(x.releve);
                    break;
                default:
                    break;
                }
            }
            assertEquals(releve.size(), vus.size(), "toutes les lignes du releve, essai " + essai);
            for (Piece p : pieces) {
                assertEquals(1, pv.getOrDefault(p.id, 0), "piece " + p.id + " une seule fois, essai " + essai);
            }
        }
    }
}
