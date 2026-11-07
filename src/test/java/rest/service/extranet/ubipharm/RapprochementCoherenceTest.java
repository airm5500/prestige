package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.extranet.ubipharm.RapprochementProduits.Article;
import rest.service.extranet.ubipharm.RapprochementProduits.Resultat;
import rest.service.extranet.ubipharm.RapprochementProduits.Statut;

/**
 * Coherence de la decision de rapprochement (logique pure, sans base), sur des milliers de cas tires avec une graine
 * fixe : priorite au code grossiste, un seul statut, candidats complets et sans doublon, CIP compares en chaines, code
 * vide jamais rapproche, articles supprimes exclus.
 */
class RapprochementCoherenceTest {

    private static final long GRAINE = 20261107L;
    private static final int CAS = 20000;

    private static final String[] PSCODES = { "FAIR248", "FAIR 248", "fair248", "DOLI500", "AMOX1G", "0042ABC", "42ABC",
            "", " ", null };
    private static final String[] CODES = { "3000001262862", "3000001262862 ", "300 0001262862", "0123456", "123456",
            "00012345", "12345", "3400930000014", "", "  ", null };
    private static final String[] STATUTS = { "enable", "enable", "enable", "disable", "delete", null };

    private static String tirer(Random r, String[] t) {
        return t[r.nextInt(t.length)];
    }

    static String sansBlancs(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (!Character.isWhitespace(c) && c != ' ' && c != ' ') {
                b.append(c);
            }
        }
        return b.toString();
    }

    @Test
    void reglesVerifieesSurDesMilliersDeCas() {
        Random r = new Random(GRAINE);
        int parStatut[] = new int[Statut.values().length];
        for (int cas = 0; cas < CAS; cas++) {
            int n = r.nextInt(8);
            List<Article> parGrossiste = new ArrayList<>(), parCodes = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                /* identifiants parfois repetes : une meme fiche peut revenir plusieurs fois */
                String id = "F" + r.nextInt(6);
                String statut = tirer(r, STATUTS);
                List<String> codes = new ArrayList<>();
                for (int k = 0; k < 5; k++) {
                    codes.add(tirer(r, CODES));
                }
                Article a = new Article(id, "Article " + id, statut, tirer(r, PSCODES), codes);
                if (r.nextBoolean()) {
                    parGrossiste.add(a);
                }
                if (r.nextInt(3) > 0) {
                    parCodes.add(a);
                }
            }
            String pscode = tirer(r, PSCODES);
            List<String> cherches = new ArrayList<>();
            for (int k = r.nextInt(4); k > 0; k--) {
                cherches.add(tirer(r, CODES));
            }
            Resultat res = RapprochementProduits.decider(pscode, cherches, parGrossiste, parCodes);
            parStatut[res.statut().ordinal()]++;
            verifier(res, pscode, cherches, parGrossiste, parCodes);
        }
        /* jeu varie : chaque statut est rencontre de nombreuses fois */
        for (Statut s : Statut.values()) {
            assertTrue(parStatut[s.ordinal()] > 500, s + " : " + parStatut[s.ordinal()]);
        }
    }

    /** Oracle ecrit independamment de l'implementation. */
    private static void verifier(Resultat res, String pscode, List<String> cherches, List<Article> parGrossiste,
            List<Article> parCodes) {
        List<String> ids = res.candidats().stream().map(Article::familleId).collect(Collectors.toList());
        /* sans doublon, jamais un article supprime */
        assertEquals(new LinkedHashSet<>(ids).size(), ids.size());
        res.candidats().forEach(a -> assertFalse("delete".equals(a.statutArticle())));
        /* un seul statut, coherent avec le nombre de candidats */
        switch (res.statut()) {
        case CODE_GROSSISTE:
        case CIP:
            assertEquals(1, ids.size());
            assertEquals(res.statut().name(), res.critere());
            break;
        case PLUSIEURS:
            assertTrue(ids.size() >= 2);
            assertTrue("CODE_GROSSISTE".equals(res.critere()) || "CIP".equals(res.critere()));
            break;
        default:
            assertTrue(ids.isEmpty());
            assertNull(res.critere());
        }
        String p = sansBlancs(pscode);
        Set<String> attendusGrossiste = new LinkedHashSet<>();
        if (!p.isEmpty()) {
            for (Article a : parGrossiste) {
                if (!"delete".equals(a.statutArticle()) && p.equals(sansBlancs(a.codeGrossiste()))) {
                    attendusGrossiste.add(a.familleId());
                }
            }
        }
        if (!attendusGrossiste.isEmpty()) {
            /* priorite au code grossiste, tous les candidats listes */
            assertEquals("CODE_GROSSISTE", res.critere());
            assertEquals(new ArrayList<>(attendusGrossiste), ids);
            return;
        }
        Set<String> c = new HashSet<>();
        cherches.forEach(x -> {
            if (!sansBlancs(x).isEmpty()) {
                c.add(sansBlancs(x));
            }
        });
        Set<String> attendusCip = new LinkedHashSet<>();
        for (Article a : parCodes) {
            if ("delete".equals(a.statutArticle())) {
                continue;
            }
            for (String x : a.codes()) {
                if (!sansBlancs(x).isEmpty() && c.contains(sansBlancs(x))) {
                    attendusCip.add(a.familleId());
                }
            }
        }
        assertEquals(new ArrayList<>(attendusCip), ids);
        if (!attendusCip.isEmpty()) {
            assertEquals("CIP", res.critere());
        }
    }

    @Test
    void codeGrossistePrioritaireSurUnCipQuiDesigneUnAutreArticle() {
        Article a = new Article("A", "A", "enable", "FAIR248", Arrays.asList("111", null, null, null, null));
        Article b = new Article("B", "B", "enable", null, Arrays.asList("3000001262862", null, null, null, null));
        Resultat r = RapprochementProduits.decider("FAIR248", Collections.singletonList("3000001262862"),
                Collections.singletonList(a), Arrays.asList(a, b));
        assertEquals(Statut.CODE_GROSSISTE, r.statut());
        assertEquals("A", r.candidats().get(0).familleId());
        /* sans grossiste connu (liste vide), le CIP decide */
        r = RapprochementProduits.decider("FAIR248", Collections.singletonList("3000001262862"),
                Collections.emptyList(), Arrays.asList(a, b));
        assertEquals(Statut.CIP, r.statut());
        assertEquals("B", r.candidats().get(0).familleId());
    }

    @Test
    void zerosDeTeteComparesEnChaine() {
        Article a = new Article("A", "A", "enable", null, Arrays.asList("123456", null, null, null, null));
        assertEquals(Statut.INTROUVABLE, RapprochementProduits
                .decider(null, Collections.singletonList("0123456"), null, Collections.singletonList(a)).statut());
        Article z = new Article("Z", "Z", "enable", null, Arrays.asList(null, null, null, null, "0123456"));
        Resultat r = RapprochementProduits.decider(null, Collections.singletonList(" 0123456 "), null,
                Arrays.asList(a, z));
        assertEquals(Statut.CIP, r.statut());
        assertEquals("Z", r.candidats().get(0).familleId());
    }

    @Test
    void codeVideNeRapprocheJamais() {
        Article vide = new Article("V", "V", "enable", "", Arrays.asList("", " ", null, "", ""));
        for (String code : Arrays.asList("", " ", null)) {
            Resultat r = RapprochementProduits.decider(code, Arrays.asList(code, ""), Collections.singletonList(vide),
                    Collections.singletonList(vide));
            assertEquals(Statut.INTROUVABLE, r.statut());
            assertTrue(r.candidats().isEmpty());
        }
    }

    @Test
    void plusieursCandidatsTousListesSansDoublon() {
        Article a = new Article("A", "A", "enable", null, Arrays.asList("3000001262862", null, null, null, null));
        Article a2 = new Article("A", "A", "enable", null, Arrays.asList(null, "3000001262862", null, null, null));
        Article b = new Article("B", "B", "disable", null, Arrays.asList(null, null, null, null, "3000001262862"));
        Article d = new Article("D", "D", "delete", null, Arrays.asList("3000001262862", null, null, null, null));
        Resultat r = RapprochementProduits.decider("X", Collections.singletonList("3000001262862"),
                Collections.emptyList(), Arrays.asList(a, a2, b, d));
        assertEquals(Statut.PLUSIEURS, r.statut());
        assertEquals(Arrays.asList("A", "B"),
                r.candidats().stream().map(Article::familleId).collect(Collectors.toList()));
        /* l'article desactive reste candidat, avec son statut ; le supprime est exclu */
        assertEquals("disable", r.candidats().get(1).statutArticle());
        assertEquals("PLUSIEURS", r.toJson().getString("statut"));
        assertEquals(2, r.toJson().getJSONArray("candidats").length());
    }
}
