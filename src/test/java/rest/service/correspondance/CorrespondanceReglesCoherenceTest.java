package rest.service.correspondance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.correspondance.CorrespondanceRegles.Decision;
import rest.service.correspondance.CorrespondanceRegles.Entree;
import rest.service.correspondance.CorrespondanceRegles.Etat;
import rest.service.correspondance.CorrespondanceRegles.Motif;
import rest.service.correspondance.CorrespondanceRegles.Source;

/**
 * Coherence du moteur de correspondance (lot 1, cles exactes). Des milliers de mondes tires au hasard (graine fixe) :
 * fiches avec CIP / EAN / CIP2-4, codes connus par grossiste, correspondance deja enregistree. La decision du moteur
 * est comparee a un oracle ecrit independamment, puis ses regles sont verifiees une a une.
 */
class CorrespondanceReglesCoherenceTest {

    private static final long GRAINE = 20261108L;
    private static final int CAS = 20_000;

    /** Monde tire au hasard : fiches actives et leurs cles, codes connus du grossiste. */
    private static final class Monde {
        final Map<String, List<String>> clesParFamille = new HashMap<>();
        final Map<String, Set<String>> codesGrossiste = new HashMap<>();
    }

    private static String code(Random r) {
        switch (r.nextInt(6)) {
        case 0:
            return String.valueOf(1_000_000 + r.nextInt(30)); // CIP 7 chiffres, peu de valeurs : collisions voulues
        case 1:
            return "300000" + (1_000_000 + r.nextInt(20)); // EAN 13
        case 2:
            return "0" + (100 + r.nextInt(10)); // zero de tete
        case 3:
            return String.valueOf(100 + r.nextInt(10)); // meme valeur sans zero de tete : jamais egale
        case 4:
            return "abz" + r.nextInt(5); // casse a ignorer
        default:
            return r.nextBoolean() ? "  " : ""; // vide : ne rapproche jamais
        }
    }

    private static Monde monde(Random r) {
        Monde m = new Monde();
        int nf = 1 + r.nextInt(6);
        for (int i = 0; i < nf; i++) {
            List<String> cles = new ArrayList<>();
            int nc = 1 + r.nextInt(3);
            for (int k = 0; k < nc; k++) {
                cles.add(code(r));
            }
            m.clesParFamille.put("F" + i, cles);
        }
        for (String f : m.clesParFamille.keySet()) {
            if (r.nextInt(3) == 0) {
                m.codesGrossiste.computeIfAbsent(code(r), x -> new LinkedHashSet<>()).add(f);
            }
        }
        // meme code grossiste porte par deux fiches (cas reel : 4 a 7 codes par grossiste)
        if (m.clesParFamille.size() > 1 && r.nextInt(4) == 0) {
            m.codesGrossiste.computeIfAbsent(code(r), x -> new LinkedHashSet<>()).addAll(Arrays.asList("F0", "F1"));
        }
        return m;
    }

    private static String n(String c) {
        return c == null ? "" : c.replaceAll("\\s+", "").toUpperCase();
    }

    /** Entree construite comme le fera le service : candidats par code grossiste, puis par cle. */
    private static Entree entree(Monde m, String codeLu, Etat etatExistant, String familleExistante) {
        Set<String> parCode = new LinkedHashSet<>();
        Set<String> parCle = new LinkedHashSet<>();
        String c = n(codeLu);
        if (!c.isEmpty()) {
            m.codesGrossiste.forEach((k, v) -> {
                if (n(k).equals(c)) {
                    parCode.addAll(v);
                }
            });
            m.clesParFamille.forEach((f, cles) -> {
                for (String k : cles) {
                    if (n(k).equals(c)) {
                        parCle.add(f);
                    }
                }
            });
        }
        return new Entree(codeLu, new ArrayList<>(parCode), new ArrayList<>(parCle), etatExistant, familleExistante);
    }

    /** Oracle ecrit a part : le resultat attendu, regle par regle. */
    private static Object[] oracle(Entree e) {
        if (e.etatExistant == Etat.VALIDEE || e.etatExistant == Etat.REJETEE || e.etatExistant == Etat.CONTREDITE) {
            return new Object[] { null, null, Motif.CONSERVEE };
        }
        if (n(e.code).isEmpty()) {
            return new Object[] { null, null, Motif.CODE_VIDE };
        }
        Set<String> code = new HashSet<>(e.parCodeGrossiste);
        Set<String> cle = new HashSet<>(e.parCle);
        if (code.size() > 1) {
            return new Object[] { Etat.PROPOSEE, null, Motif.CODE_AMBIGU };
        }
        if (code.size() == 1) {
            String f = code.iterator().next();
            if (cle.size() == 1 && !cle.contains(f)) {
                return new Object[] { Etat.PROPOSEE, null, Motif.DESACCORD_CODE_CLE };
            }
            return new Object[] { Etat.AUTO_EXACTE, f, Motif.CODE_GROSSISTE_CONNU };
        }
        if (cle.size() == 1) {
            return new Object[] { Etat.AUTO_EXACTE, cle.iterator().next(), Motif.CLE_UNIQUE };
        }
        if (cle.size() > 1) {
            return new Object[] { Etat.PROPOSEE, null, Motif.CLE_AMBIGUE };
        }
        return new Object[] { null, null, Motif.INTROUVABLE };
    }

    @Test
    void decisionEgaleALOracleSurDesMilliersDeCas() {
        Random r = new Random(GRAINE);
        Map<Motif, Integer> vus = new HashMap<>();
        for (int i = 0; i < CAS; i++) {
            Monde m = monde(r);
            List<String> codes = new ArrayList<>(m.codesGrossiste.keySet());
            m.clesParFamille.values().forEach(codes::addAll);
            codes.add(code(r));
            String lu = codes.get(r.nextInt(codes.size()));
            Etat existant = r.nextInt(4) == 0 ? Etat.values()[r.nextInt(Etat.values().length)] : null;
            String familleExistante = existant == null ? null : "F0";
            Entree e = entree(m, lu, existant, familleExistante);
            Decision d = CorrespondanceRegles.decider(e);
            Object[] attendu = oracle(e);
            String cas = "cas " + i + " code=[" + lu + "] " + e;
            assertEquals(attendu[2], d.motif, cas);
            assertEquals(attendu[0], d.etat, cas);
            assertEquals(attendu[1], d.familleId, cas);
            vus.merge(d.motif, 1, Integer::sum);
            verifierRegles(e, d, cas);
        }
        // le tirage couvre tous les motifs
        for (Motif mo : Motif.values()) {
            if (mo == Motif.RECU_EN_BL) {
                // motif de la reception d'un BL : jamais produit par decider (voir ReceptionBlCoherenceTest)
                assertEquals(0, vus.getOrDefault(mo, 0));
                continue;
            }
            assertTrue(vus.getOrDefault(mo, 0) > 50, "motif peu couvert : " + mo + " " + vus);
        }
    }

    private static void verifierRegles(Entree e, Decision d, String cas) {
        // un seul etat ; une correspondance humaine ou contredite n'est jamais recalculee
        if (e.etatExistant == Etat.VALIDEE || e.etatExistant == Etat.REJETEE || e.etatExistant == Etat.CONTREDITE) {
            assertFalse(d.aEcrire(), cas);
            return;
        }
        // AUTO_EXACTE <=> une famille, score fixe, source coherente
        if (d.etat == Etat.AUTO_EXACTE) {
            assertNotNull(d.familleId, cas);
            assertTrue(d.score.compareTo(java.math.BigDecimal.ONE) <= 0, cas);
            assertTrue(e.parCodeGrossiste.contains(d.familleId) || e.parCle.contains(d.familleId), cas);
            assertEquals(d.source == Source.CODE_GROSSISTE, !e.parCodeGrossiste.isEmpty(), cas);
        }
        // PROPOSEE : pas de famille retenue, au moins deux candidats, sans doublon, tous issus des listes lues
        if (d.etat == Etat.PROPOSEE) {
            assertNull(d.familleId, cas);
            assertTrue(d.candidats.size() >= 2, cas);
            assertEquals(new HashSet<>(d.candidats).size(), d.candidats.size(), "doublon " + cas);
            Set<String> lus = new HashSet<>(e.parCodeGrossiste);
            lus.addAll(e.parCle);
            assertEquals(lus, new HashSet<>(d.candidats), cas);
        }
        // un code vide ne rapproche jamais
        if (n(e.code).isEmpty()) {
            assertNull(d.etat, cas);
        }
        if (d.etat == null) {
            assertFalse(d.aEcrire(), cas);
        }
    }

    @Test
    void casLimitesNommes() {
        // zero de tete : "0123" et "123" sont deux codes differents
        Monde m = new Monde();
        m.clesParFamille.put("A", Arrays.asList("0123"));
        m.clesParFamille.put("B", Arrays.asList("123"));
        Decision d = CorrespondanceRegles.decider(entree(m, "0123", null, null));
        assertEquals(Etat.AUTO_EXACTE, d.etat);
        assertEquals("A", d.familleId);
        assertEquals(Source.CIP, d.source);

        // casse ignoree, blancs retires
        m.codesGrossiste.put("ABZ1", new LinkedHashSet<>(Collections.singletonList("B")));
        d = CorrespondanceRegles.decider(entree(m, " abz1 ", null, null));
        assertEquals("B", d.familleId);
        assertEquals(Source.CODE_GROSSISTE, d.source);
        assertEquals(0, d.score.compareTo(java.math.BigDecimal.ONE));

        // code grossiste egal au CIP d'une AUTRE fiche : a valider, jamais applique
        m.codesGrossiste.put("123", new LinkedHashSet<>(Collections.singletonList("A")));
        d = CorrespondanceRegles.decider(entree(m, "123", null, null));
        assertEquals(Etat.PROPOSEE, d.etat);
        assertEquals(Motif.DESACCORD_CODE_CLE, d.motif);
        assertEquals(new HashSet<>(Arrays.asList("A", "B")), new HashSet<>(d.candidats));

        // une validation humaine n'est jamais ecrasee
        d = CorrespondanceRegles.decider(entree(m, "0123", Etat.VALIDEE, "B"));
        assertFalse(d.aEcrire());
        assertEquals(Motif.CONSERVEE, d.motif);

        // EAN : source EAN si la cle trouvee a 13 caracteres ou plus
        m.clesParFamille.put("C", Arrays.asList("3000001000005"));
        d = CorrespondanceRegles.decider(entree(m, "3000001000005", null, null));
        assertEquals(Source.EAN, d.source);
        assertEquals("C", d.familleId);

        // introuvable : rien a ecrire
        d = CorrespondanceRegles.decider(entree(m, "999", null, null));
        assertEquals(Motif.INTROUVABLE, d.motif);
        assertFalse(d.aEcrire());
    }

    @Test
    void decisionInchangeeNeReecritRien() {
        Monde m = new Monde();
        m.clesParFamille.put("A", Arrays.asList("1234567"));
        Decision d = CorrespondanceRegles.decider(entree(m, "1234567", Etat.AUTO_EXACTE, "A"));
        assertEquals(Etat.AUTO_EXACTE, d.etat);
        assertTrue(d.aEcrire());
        assertTrue(d.identiqueA(Etat.AUTO_EXACTE, "A", Source.CIP, Motif.CLE_UNIQUE, CorrespondanceRegles.SCORE_CLE,
                CorrespondanceRegles.candidatsJson(d.candidats)));
        assertFalse(d.identiqueA(Etat.AUTO_EXACTE, "B", Source.CIP, Motif.CLE_UNIQUE, CorrespondanceRegles.SCORE_CLE,
                CorrespondanceRegles.candidatsJson(d.candidats)));
    }
}
