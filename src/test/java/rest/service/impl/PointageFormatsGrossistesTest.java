package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.impl.RapprochementBL.Piece;
import rest.service.impl.RapprochementBL.Resultat;
import rest.service.impl.RapprochementBL.Statut;
import rest.service.impl.ReleveModele.Champ;

/**
 * Plan du 09/11 : pointage des releves DPCI, TEDIS et Copharmed (Ubipharm deja correct).
 * <ul>
 * <li>avoirs DPCI « AVO R11409455 » et TEDIS « AV-2627127450-BKE » rapproches par leur propre numero (reference d'avoir
 * saisie) ;</li>
 * <li>lignes TEDIS PR-ABO ignorees ;</li>
 * <li>Copharmed : numero lu avec l'agence (10-, 20-, 30-), tirets toleres ;</li>
 * <li>montant compare en TTC quand le reglage du grossiste le demande.</li>
 * </ul>
 */
class PointageFormatsGrossistesTest {

    static final LocalDate D = LocalDate.of(2026, 10, 15);

    /* colonnes : Type | N° | Date | Montant */
    static Map<Champ, Integer> rangs() {
        Map<Champ, Integer> r = new EnumMap<>(Champ.class);
        r.put(Champ.TYPE, 0);
        r.put(Champ.NUMERO, 1);
        r.put(Champ.DATE, 2);
        r.put(Champ.MONTANT, 3);
        return r;
    }

    static ReleveGrossiste.Ligne ligne(String type, String numero, String montant) {
        return ReleveModele.ligne(new String[] { type, numero, "15/10/2026", montant }, rangs(), "AV");
    }

    static Piece bl(String id, String ref, long ht) {
        return new Piece("BL:" + id, false, ref, null, null, D, ht);
    }

    static Piece avoir(String id, String refBl, String refAvoir, long ht) {
        return new Piece("RET:" + id, true, refBl, refAvoir, null, D, ht);
    }

    static Resultat seul(ReleveGrossiste.Ligne l, Piece... p) {
        List<Resultat> r = RapprochementBL.rapprocher(Collections.singletonList(l), Arrays.asList(p), 0);
        return r.get(0);
    }

    // ------------------------------------------------------------------ avoirs par leur propre numero

    @Test
    void avoirTedisRapprocheParSonNumero() {
        ReleveGrossiste.Ligne l = ligne("AV", "AV-2627127450-BKE", "-15 000");
        assertEquals(ReleveGrossiste.Type.AVOIR, l.type);
        Resultat r = seul(l, avoir("1", "BKE-754695", "AV-2627127450-BKE", 15000));
        assertEquals(Statut.RAPPROCHE, r.statut);
        assertEquals("RET:1", r.piece.id);
    }

    @Test
    void avoirTedisEcartSignaleSiMontantDifferent() {
        Resultat r = seul(ligne("AV", "AV-2627127450-BKE", "-15 000"),
                avoir("1", "BKE-754695", "AV 2627127450 BKE", 14000));
        assertEquals(Statut.ECART, r.statut);
        assertEquals(1000, r.ecart);
    }

    @Test
    void avoirDpciRapprocheParSonNumero() {
        ReleveGrossiste.Ligne l = ligne("AVO", "AVO R11409455", "-8 250");
        assertEquals(ReleveGrossiste.Type.AVOIR, l.type);
        Resultat r = seul(l, avoir("1", "R40235168", "R11409455", 8250));
        assertEquals(Statut.RAPPROCHE, r.statut);
    }

    @Test
    void avoirDAutreNumeroNonRapproche() {
        Resultat r = seul(ligne("AVO", "AVO R11409455", "-8 250"), avoir("1", "R40235168", "R11409999", 8250));
        assertEquals(Statut.ABSENT_PRESTIGE, r.statut);
    }

    @Test
    void avoirUbipharmParLeBlToujoursRapproche() {
        /* non-regression : AV/BL 793187 1, avoir saisi sur le BL 793187 sans reference */
        ReleveGrossiste.Ligne l = ReleveGrossiste.lireLigne("AV/BL  GNA 793187 1 / 57  15/09/26  -20 323");
        Resultat r = seul(l, avoir("1", "GNA-793187", null, 20323));
        assertEquals(Statut.RAPPROCHE, r.statut);
        Resultat r2 = seul(l, avoir("2", "GNA-793187", "793187 1", 20323));
        assertEquals(Statut.RAPPROCHE, r2.statut);
    }

    // ------------------------------------------------------------------ PR-ABO

    @Test
    void ligneTedisPrAboIgnoree() {
        assertNull(ligne("PR-ABO", "2627000123", "1 500"));
        assertNull(ligne("FA", "PR-ABO 2627000123", "1 500"));
        assertTrue(ligne("FA", "2627000123", "1 500") != null);
    }

    // ------------------------------------------------------------------ Copharmed : agence

    @Test
    void copharmedAgenceDistingue() {
        assertNotEquals(RapprochementBL.numero("30-224710-00"), RapprochementBL.numero("10-224710-00"));
        assertEquals(RapprochementBL.numero("10-298421-00"), RapprochementBL.numero("10298421-00"));
        assertEquals(RapprochementBL.numero("10-298421-00"), RapprochementBL.numero("10 298421 00"));
        Resultat r = seul(ligne("FA", "30-224710-00", "50 000"), bl("a", "10-224710-00", 50000),
                bl("b", "30-224710-00", 50000));
        assertEquals("BL:b", r.piece.id);
        Resultat r2 = seul(ligne("FA", "30-224710-00", "50 000"), bl("a", "10-224710-00", 50000));
        assertEquals(Statut.ABSENT_PRESTIGE, r2.statut);
    }

    @Test
    void autresNumerosInchanges() {
        assertEquals("754695", RapprochementBL.numero("BKE-754695"));
        assertEquals("40235168", RapprochementBL.numero("R40235168"));
        assertEquals("793187", RapprochementBL.numero("GNA 793187 1"));
        assertEquals("2627127450", RapprochementBL.numero("AV-2627127450-BKE"));
    }

    // ------------------------------------------------------------------ TTC

    @Test
    void modeleMemoriseLeTtc() {
        ReleveModele.Modele m = new ReleveModele.Modele();
        assertFalse(m.montantTtc);
        m.montantTtc = true;
        assertTrue(ReleveModele.Modele.lire(m.json().toString()).montantTtc);
        assertFalse(ReleveModele.Modele.lire("{\"version\":1,\"colonnes\":{}}").montantTtc);
    }

    @Test
    void pieceEnTtcOuEnHt() {
        PointageBLService.PieceVue v = new PointageBLService.PieceVue();
        v.type = "BL";
        v.id = "x";
        v.reference = "10-298560-00";
        v.montantHt = 124603;
        v.montantTtc = 144218L;
        assertEquals(124603, v.piece(false).montantHt);
        assertEquals(144218, v.piece(true).montantHt);
        assertEquals(124603, v.piece().montantHt);
    }

    // ------------------------------------------------------------------ coherence (graine fixe)

    @Test
    void coherenceSurDesMilliersDeReleves() {
        Random h = new Random(20261110L);
        String[] agences = { "10", "20", "30" };
        for (int essai = 0; essai < 3000; essai++) {
            List<ReleveGrossiste.Ligne> releve = new ArrayList<>();
            List<Piece> pieces = new ArrayList<>();
            int n = 1 + h.nextInt(8);
            java.util.Set<String> pris = new java.util.HashSet<>();
            int attendusRapproches = 0, absentsReleve = 0;
            for (int i = 0; i < n; i++) {
                int genre = h.nextInt(3);
                long montant = h.nextInt(3) == 0 ? 0 : 1 + h.nextInt(2_000_000);
                String num;
                do {
                    num = String.valueOf(100000 + h.nextInt(900000));
                } while (!pris.add(num));
                boolean present = h.nextInt(5) != 0;
                if (genre == 0) {
                    /* Copharmed : meme numero, deux agences possibles */
                    String ag = agences[h.nextInt(3)];
                    releve.add(ligne("FA", ag + "-" + num + "-00", String.valueOf(montant)));
                    if (present) {
                        pieces.add(bl("c" + i, h.nextBoolean() ? ag + num + "-00" : ag + "-" + num + "-00", montant));
                        attendusRapproches++;
                    }
                    String autre = agences[(Arrays.asList(agences).indexOf(ag) + 1) % 3];
                    pieces.add(bl("o" + i, autre + "-" + num + "-00", montant));
                    absentsReleve++;
                } else if (genre == 1) {
                    /* avoir TEDIS par son numero */
                    String ref = "AV-26" + num + "0-BKE";
                    releve.add(ligne("AV", ref, String.valueOf(-montant)));
                    if (present) {
                        pieces.add(avoir("t" + i, "BKE-" + (num + 1), ref, montant));
                        attendusRapproches++;
                    }
                } else {
                    /* BL Ubipharm */
                    releve.add(ligne("BL", "BKE " + num, String.valueOf(montant)));
                    if (present) {
                        pieces.add(bl("u" + i, "BKE-" + num, montant));
                        attendusRapproches++;
                    }
                }
            }
            Collections.shuffle(pieces, h);
            List<Resultat> r = RapprochementBL.rapprocher(releve, pieces, 0);
            long rap = r.stream().filter(x -> x.statut == Statut.RAPPROCHE).count();
            long abs = r.stream().filter(x -> x.statut == Statut.ABSENT_RELEVE).count();
            assertEquals(attendusRapproches, rap, "essai " + essai);
            assertEquals(absentsReleve, abs, "essai " + essai);
            assertEquals(releve.size() + pieces.size() - rap, r.size(), "essai " + essai);
            java.util.Set<String> ids = new java.util.HashSet<>();
            for (Resultat x : r) {
                if (x.piece != null) {
                    assertTrue(ids.add(x.piece.id), "piece en double, essai " + essai);
                }
                if (x.statut == Statut.RAPPROCHE) {
                    assertEquals(Math.abs(x.releve.montantHt), x.piece.montantHt);
                    assertEquals(x.releve.type == ReleveGrossiste.Type.AVOIR, x.piece.avoir);
                    assertEquals(0, x.ecart);
                }
            }
        }
    }
}
