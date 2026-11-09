package rest.service.correspondance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.correspondance.CorrespondanceApprochee.Candidat;
import rest.service.correspondance.CorrespondanceRegles.Decision;
import rest.service.correspondance.CorrespondanceRegles.Etat;
import rest.service.correspondance.CorrespondanceRegles.Motif;
import rest.service.correspondance.CorrespondanceRegles.Source;

/**
 * Coherence du rapprochement par la designation (lot 3). Catalogue genere avec une graine fixe (marques, molecules,
 * dosages, formes, conditionnements) ; designations « grossiste » tirees comme variantes d'une fiche (abreviations,
 * casse, accents, blancs, unite collee ou non, virgule decimale, faute de frappe sur la marque, mot en moins). Verifie,
 * sur des milliers de cas :
 * <ul>
 * <li>score de chaque candidat = calcul refait a part (oracle), entre 0 et 1, candidats tries et distincts ;</li>
 * <li>dosage ou quantite differents, ou marque differente : jamais au seuil fort (0,7) ;</li>
 * <li>designation identique a une fiche : cette fiche en tete, score 1 ;</li>
 * <li>abreviations, casse, accents et blancs ne changent rien ;</li>
 * <li>bonne fiche dans les 3 candidats au moins 95 fois sur 100, propositions fortes fausses moins de 2 % ;</li>
 * <li>la decision est toujours « a valider », et une correspondance enregistree autrement est conservee.</li>
 * </ul>
 */
class ApprocheeCoherenceTest {

    private static final long GRAINE = 20261108L;
    private static final String[] MOLECULES = { "PARACETAMOL", "IBUPROFENE", "AMOXICILLINE", "METFORMINE", "OMEPRAZOLE",
            "CETIRIZINE", "ARTEMETHER", "LUMEFANTRINE", "FER", "VITAMINE", "MAGNESIUM", "ZINC", "DICLOFENAC",
            "AZITHROMYCINE", "LORATADINE", "QUININE", "SALBUTAMOL", "AMLODIPINE", "CIPROFLOXACINE", "METRONIDAZOLE" };
    /** forme longue (grossiste) -> forme courte (fiche) ; la normalisation les rend egales */
    private static final String[][] FORMES = { { "COMPRIME", "CPR" }, { "GELULE", "GEL" }, { "SIROP", "SP" },
            { "SUSPENSION", "SUSP" }, { "CREME", "CR" }, { "POMMADE", "POM" }, { "SACHET", "SACH" },
            { "AMPOULE", "AMP" } };
    private static final int[] DOSAGES = { 5, 10, 20, 50, 100, 125, 250, 400, 500, 1000 };
    private static final String[] CONDS = { "B/10", "B/14", "B/20", "B/30", "F/100ML", "F/200ML", "T/30G" };

    /** Une fiche generee : ses parties, pour en tirer des variantes et savoir ce qui differe. */
    private static final class Fiche {
        String id, marque, molecule, dosage, unite, formeLongue, formeCourte, cond, designation;
    }

    private static final Map<String, Fiche> FICHES = new LinkedHashMap<>();
    private static final CorrespondanceApprochee MOTEUR;

    static {
        Random r = new Random(GRAINE);
        List<String> marques = new ArrayList<>();
        while (marques.size() < 400) {
            String m = mot(r, 5 + r.nextInt(4));
            // marques eloignees d'au moins 3 modifications : une faute de frappe n'en rapproche jamais une autre
            if (marques.stream().noneMatch(x -> distance(x, m) < 3)
                    && !CorrespondanceApprochee.SYNONYMES.containsKey(m)) {
                marques.add(m);
            }
        }
        int n = 0;
        for (String m : marques) {
            String mol = MOLECULES[r.nextInt(MOLECULES.length)];
            String[] forme = FORMES[r.nextInt(FORMES.length)];
            int nb = 1 + r.nextInt(5);
            Set<String> vus = new HashSet<>();
            for (int k = 0; k < nb; k++) {
                Fiche f = new Fiche();
                f.marque = m;
                f.molecule = mol;
                f.dosage = String.valueOf(DOSAGES[r.nextInt(DOSAGES.length)]);
                if (r.nextInt(6) == 0) {
                    f.dosage = f.dosage + ".5";
                }
                f.unite = r.nextInt(5) == 0 ? "G" : "MG";
                f.formeLongue = forme[0];
                f.formeCourte = forme[1];
                f.cond = CONDS[r.nextInt(CONDS.length)];
                f.designation = m + " " + mol + " " + f.dosage + f.unite + " " + f.formeCourte + " " + f.cond;
                if (vus.add(f.designation)) {
                    f.id = String.format("F%05d", n++);
                    FICHES.put(f.id, f);
                }
            }
        }
        Map<String, String> d = new LinkedHashMap<>();
        FICHES.forEach((k, v) -> d.put(k, v.designation));
        MOTEUR = new CorrespondanceApprochee(d);
    }

    private static int distance(String a, String b) {
        int[] p = new int[b.length() + 1], c = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            p[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            c[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                c[j] = Math.min(Math.min(c[j - 1], p[j]) + 1, p[j - 1] + (a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1));
            }
            int[] t = p;
            p = c;
            c = t;
        }
        return p[b.length()];
    }

    private static String mot(Random r, int n) {
        String c = "BCDFGKLMNPRSTVZ", v = "AEIOU";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append(i % 2 == 0 ? c.charAt(r.nextInt(c.length())) : v.charAt(r.nextInt(v.length())));
        }
        return sb.toString();
    }

    /** Variante « grossiste » d'une fiche ; {@code fidele} : seules des ecritures equivalentes (aucun mot change). */
    private static String variante(Random r, Fiche f, boolean fidele) {
        String marque = f.marque;
        if (!fidele && r.nextInt(8) == 0) { // faute de frappe sur la marque : reste « proche »
            int i = 1 + r.nextInt(marque.length() - 1);
            marque = marque.substring(0, i) + (marque.charAt(i) == 'A' ? 'E' : 'A') + marque.substring(i + 1);
        }
        String dosage = r.nextBoolean() ? f.dosage.replace('.', ',') : f.dosage;
        String unite = r.nextBoolean() ? " " + f.unite : f.unite;
        if (f.unite.equals("MG") && r.nextInt(4) == 0) {
            unite = " milligrammes";
        }
        String forme = r.nextBoolean() ? f.formeLongue : f.formeCourte;
        if (forme.equals("CREME") && r.nextBoolean()) {
            forme = "CRÈME";
        }
        List<String> parts = new ArrayList<>(Arrays.asList(marque, f.molecule, dosage + unite, forme, f.cond));
        if (!fidele && r.nextInt(5) == 0) {
            parts.remove(1); // molecule absente chez le grossiste
        }
        String s = String.join(r.nextBoolean() ? " " : "  ", parts);
        return r.nextBoolean() ? s.toLowerCase(java.util.Locale.ROOT) : s;
    }

    // ---------------------------------------------------------------- oracle ecrit a part

    private static Map<String, Double> idf() {
        Map<String, Integer> df = new HashMap<>();
        for (Fiche f : FICHES.values()) {
            for (String t : CorrespondanceApprochee.signature(CorrespondanceApprochee.normaliser(f.designation)).mots) {
                df.merge(t, 1, Integer::sum);
            }
        }
        Map<String, Double> idf = new HashMap<>();
        df.forEach((t, c) -> idf.put(t, Math.log((double) FICHES.size() / (1 + c))));
        return idf;
    }

    private static final Map<String, Double> IDF = idf();

    private static double oracle(String lu, Fiche f) {
        CorrespondanceApprochee.Signature a = CorrespondanceApprochee.signature(CorrespondanceApprochee.normaliser(lu));
        CorrespondanceApprochee.Signature b = CorrespondanceApprochee
                .signature(CorrespondanceApprochee.normaliser(f.designation));
        Set<String> union = new HashSet<>(a.mots);
        union.addAll(b.mots);
        double i = 0, u = 0;
        for (String t : union) {
            double p = IDF.getOrDefault(t, 8.0);
            u += p;
            i += a.mots.contains(t) && b.mots.contains(t) ? p : 0;
        }
        double s = u == 0 ? 0 : i / u;
        List<String> na = new ArrayList<>(), nb = new ArrayList<>();
        a.nombres.forEach((k, v) -> na.addAll(Collections.nCopies(v, k)));
        b.nombres.forEach((k, v) -> nb.addAll(Collections.nCopies(v, k)));
        if (!na.isEmpty() || !nb.isEmpty()) {
            List<String> reste = new ArrayList<>(nb);
            int communs = 0;
            for (String x : na) {
                if (reste.remove(x)) {
                    communs++;
                }
            }
            s = 0.6 * s + 0.4 * communs / Math.max(na.size(), nb.size());
            if (!na.isEmpty() && !nb.isEmpty() && communs < Math.min(na.size(), nb.size())) {
                s *= 0.6;
            }
        }
        String m1 = CorrespondanceApprochee.marque(lu), m2 = CorrespondanceApprochee.marque(f.designation);
        if (m1 != null && m2 != null && !CorrespondanceApprochee.proches(m1, m2)) {
            s *= 0.5;
        }
        return s;
    }

    private static boolean memeDosage(Fiche a, Fiche b) {
        return a.dosage.equals(b.dosage) && a.unite.equals(b.unite) && a.cond.equals(b.cond);
    }

    @Test
    void variantesEgalesALOracleEtReglesTenues() {
        Random r = new Random(GRAINE + 1);
        List<Fiche> liste = new ArrayList<>(FICHES.values());
        int cas = 6000, top1 = 0, top3 = 0, forts = 0, fortsFaux = 0;
        for (int i = 0; i < cas; i++) {
            Fiche vraie = liste.get(r.nextInt(liste.size()));
            String lu = variante(r, vraie, false);
            List<Candidat> c = MOTEUR.candidats(lu, CorrespondanceApprochee.NB_CANDIDATS);
            String ctx = "cas " + i + " [" + lu + "] " + vraie.designation + " -> " + c;
            assertTrue(c.size() <= 3, ctx);
            Set<String> ids = new HashSet<>();
            for (int k = 0; k < c.size(); k++) {
                Candidat x = c.get(k);
                assertTrue(ids.add(x.familleId), ctx);
                assertTrue(x.score >= 0 && x.score <= 1 + 1e-12, ctx);
                assertEquals(oracle(lu, FICHES.get(x.familleId)), x.score, 1e-9, ctx);
                assertEquals(x.score, MOTEUR.score(lu, x.familleId), 1e-12, ctx);
                if (k > 0) {
                    assertTrue(c.get(k - 1).score >= x.score, ctx);
                }
                Fiche f = FICHES.get(x.familleId);
                // autre dosage, autre quantite ou autre marque : jamais au seuil fort
                if (!memeDosage(f, vraie)) {
                    assertTrue(x.score < CorrespondanceApprochee.SEUIL_FORT, "dosage different au seuil " + ctx);
                }
                if (!f.marque.equals(vraie.marque)) {
                    assertTrue(x.score <= 0.5 + 1e-12, "marque differente au-dessus de 0,5 " + ctx);
                }
            }
            if (!c.isEmpty() && c.get(0).familleId.equals(vraie.id)) {
                top1++;
            }
            if (c.stream().anyMatch(x -> x.familleId.equals(vraie.id))) {
                top3++;
            }
            if (!c.isEmpty() && c.get(0).score >= CorrespondanceApprochee.SEUIL_FORT) {
                forts++;
                fortsFaux += c.get(0).familleId.equals(vraie.id) ? 0 : 1;
            }
            // la decision est toujours a valider
            Decision d = CorrespondanceApprochee.proposer(null, null, c);
            assertEquals(Etat.PROPOSEE, d.etat, ctx);
            assertNull(d.familleId, ctx);
            assertEquals(Source.APPROCHE, d.source, ctx);
            assertEquals(c.isEmpty() ? Motif.INTROUVABLE : Motif.DESIGNATION, d.motif, ctx);
        }
        String bilan = "top1=" + top1 + " top3=" + top3 + " forts=" + forts + " faux=" + fortsFaux + " / " + cas;
        System.out.println("Rapprochement par designation, " + FICHES.size() + " fiches : " + bilan);
        assertTrue(top3 >= cas * 0.95, bilan);
        assertTrue(forts > cas / 2, "trop peu de propositions fortes " + bilan);
        assertTrue(fortsFaux < forts * 0.02, bilan);
    }

    @Test
    void ecrituresEquivalentesSansEffetEtFicheIdentiqueEnTete() {
        Random r = new Random(GRAINE + 2);
        for (Fiche f : FICHES.values()) {
            List<Candidat> ref = MOTEUR.candidats(f.designation, 3);
            assertEquals(f.id, ref.get(0).familleId, f.designation + " " + ref);
            assertEquals(1.0, ref.get(0).score, 1e-12, f.designation);
            // abreviations, casse, accents, blancs, unite collee ou non, virgule decimale : memes candidats
            String lu = variante(r, f, true);
            assertEquals(ref.toString(), MOTEUR.candidats(lu, 3).toString(), lu + " / " + f.designation);
        }
    }

    @Test
    void casNommes() {
        assertEquals(Arrays.asList("AYANFER", "SP", "FL", "200", "ML"),
                CorrespondanceApprochee.normaliser("Ayanfer sirop flacon 200ml"));
        assertEquals(Arrays.asList("KEM", "SUSP", "F", "200", "ML"),
                CorrespondanceApprochee.normaliser("KEM SUS F/200ML"));
        assertEquals(CorrespondanceApprochee.signature(CorrespondanceApprochee.normaliser("X 2,5MG")).nombres,
                CorrespondanceApprochee.signature(CorrespondanceApprochee.normaliser("X 2.50 mg")).nombres);
        assertEquals("PALUMAX", CorrespondanceApprochee.marque("PALUMAX 60 mg CPR"));
        assertNull(CorrespondanceApprochee.marque("500 MG"));
        assertTrue(CorrespondanceApprochee.proches("DOLIPRANE", "DOLIPRAN"));
        assertFalse(CorrespondanceApprochee.proches("APRONAT", "PALUMAX"));
        Map<String, String> f = new LinkedHashMap<>();
        f.put("A", "AYANFER SP F/200ML");
        f.put("B", "APRONAT 60MG CPR B/10");
        f.put("C", "PALUMAX 60MG CPR B/10");
        f.put("D", "KEM SUSP BUV F/200ML");
        CorrespondanceApprochee m = new CorrespondanceApprochee(f);
        assertEquals("A", m.candidats("AYANFER SIROP FL 200ML", 3).get(0).familleId);
        assertEquals("D", m.candidats("KEM SUS F/200ML", 3).get(0).familleId);
        // meme molecule et meme dosage, autre marque : jamais propose fort
        List<Candidat> c = m.candidats("PALUMAX 60 mg comprime boite de 10", 3);
        assertEquals("C", c.get(0).familleId);
        assertTrue(m.score("PALUMAX 60 mg comprime boite de 10", "B") <= 0.5);
        assertTrue(m.candidats("", 3).isEmpty());
        assertTrue(m.candidats(null, 3).isEmpty());
    }

    @Test
    void correspondanceEnregistreeConservee() {
        List<Candidat> c = Collections.singletonList(new Candidat("F1", 0.91));
        for (Etat e : Etat.values()) {
            for (Source s : Source.values()) {
                Decision d = CorrespondanceApprochee.proposer(e, s, c);
                boolean recalculee = e == Etat.PROPOSEE && s == Source.APPROCHE;
                assertEquals(recalculee, d.aEcrire(), e + "/" + s);
                if (!recalculee) {
                    assertEquals(Motif.CONSERVEE, d.motif);
                }
            }
        }
        Decision d = CorrespondanceApprochee.proposer(null, null, c);
        assertEquals(0, CorrespondanceApprochee.arrondi(0.91).compareTo(d.score));
        assertEquals(Collections.singletonList("F1"), d.candidats);
    }
}
