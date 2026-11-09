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
 * fixe : priorite a la reference Ubipharm de la fiche, un seul statut, candidats complets et sans doublon, CIP compares
 * en chaines, code vide jamais rapproche, articles supprimes exclus.
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
            List<Article> parReference = new ArrayList<>(), parCodes = new ArrayList<>();
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
                    parReference.add(a);
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
            Resultat res = RapprochementProduits.decider(pscode, cherches, parReference, parCodes);
            parStatut[res.statut().ordinal()]++;
            verifier(res, pscode, cherches, parReference, parCodes);
        }
        /* jeu varie : chaque statut est rencontre de nombreuses fois */
        for (Statut s : Statut.values()) {
            assertTrue(parStatut[s.ordinal()] > 500, s + " : " + parStatut[s.ordinal()]);
        }
    }

    /**
     * Retour 6 du 08/11 : le PSCODE n'est propose a l'ecriture que si aucune fiche active ne le porte deja, qu'une
     * seule fiche active a un des CIP / EAN cherches, que cette fiche n'a pas de PSCODE et que le PSCODE est lisible ;
     * ecrit sans blancs, en majuscules. Oracle independant, 20 000 cas.
     */
    @Test
    void pscodeAEnregistrerSurDesMilliersDeCas() {
        Random r = new Random(GRAINE + 6);
        int oui = 0, non = 0, ficheDejaRemplie = 0;
        for (int cas = 0; cas < CAS; cas++) {
            List<Article> articles = new ArrayList<>();
            for (int i = r.nextInt(6); i > 0; i--) {
                String id = "F" + r.nextInt(5);
                List<String> codes = new ArrayList<>();
                for (int k = 0; k < 5; k++) {
                    codes.add(r.nextInt(3) == 0 ? tirer(r, CODES) : null);
                }
                articles.add(new Article(id, "Article " + id, tirer(r, STATUTS),
                        r.nextInt(3) == 0 ? tirer(r, PSCODES) : null, codes));
            }
            String pscode = tirer(r, PSCODES);
            List<String> cherches = r.nextInt(5) == 0 ? Collections.emptyList()
                    : Collections.singletonList(tirer(r, CODES));
            Resultat res = RapprochementProduits.decider(pscode, cherches, articles, articles);
            Article choisi = RapprochementProduits.aEnregistrer(res);

            String p = sansBlancs(pscode);
            Set<String> c = cherches.stream().map(RapprochementCoherenceTest::sansBlancs).filter(x -> !x.isEmpty())
                    .collect(Collectors.toSet());
            List<Article> actifs = articles.stream()
                    .filter(a -> a.statutArticle() == null || !"delete".equalsIgnoreCase(a.statutArticle().trim()))
                    .collect(Collectors.toList());
            boolean dejaPorte = !p.isEmpty()
                    && actifs.stream().anyMatch(a -> sansBlancs(a.referenceUbipharm()).equalsIgnoreCase(p));
            List<Article> parCode = new ArrayList<>();
            Set<String> vus = new HashSet<>();
            for (Article a : actifs) {
                if (a.codes().stream().anyMatch(x -> c.contains(sansBlancs(x))) && vus.add(a.familleId())) {
                    parCode.add(a);
                }
            }
            String attendu = !p.isEmpty() && !dejaPorte && parCode.size() == 1
                    && sansBlancs(parCode.get(0).referenceUbipharm()).isEmpty() ? parCode.get(0).familleId() : null;
            if (!p.isEmpty() && !dejaPorte && parCode.size() == 1 && attendu == null) {
                ficheDejaRemplie++;
            }
            assertEquals(attendu, choisi == null ? null : choisi.familleId(), "cas " + cas);
            assertEquals(attendu != null, res.toJson().getBoolean("aEnregistrer"));
            if (choisi != null) {
                oui++;
                assertEquals(p.toUpperCase(java.util.Locale.ROOT), RapprochementProduits.pscodeFiche(pscode));
                assertEquals(Statut.CIP, res.statut());
            } else {
                non++;
            }
        }
        assertTrue(oui > 1000 && non > 1000 && ficheDejaRemplie > 100, oui + " / " + non + " / " + ficheDejaRemplie);
        assertNull(RapprochementProduits.aEnregistrer(null));
        assertNull(RapprochementProduits.pscodeFiche("  "));
    }

    /** Oracle ecrit independamment de l'implementation. */
    private static void verifier(Resultat res, String pscode, List<String> cherches, List<Article> parReference,
            List<Article> parCodes) {
        List<String> ids = res.candidats().stream().map(Article::familleId).collect(Collectors.toList());
        /* sans doublon, jamais un article supprime */
        assertEquals(new LinkedHashSet<>(ids).size(), ids.size());
        res.candidats().forEach(a -> assertFalse("delete".equals(a.statutArticle())));
        /* un seul statut, coherent avec le nombre de candidats */
        switch (res.statut()) {
        case PSCODE:
        case CIP:
            assertEquals(1, ids.size());
            assertEquals(res.statut().name(), res.critere());
            break;
        case PLUSIEURS:
            assertTrue(ids.size() >= 2);
            assertTrue("PSCODE".equals(res.critere()) || "CIP".equals(res.critere()));
            break;
        default:
            assertTrue(ids.isEmpty());
            assertNull(res.critere());
        }
        String p = sansBlancs(pscode);
        Set<String> attendusReference = new LinkedHashSet<>();
        if (!p.isEmpty()) {
            for (Article a : parReference) {
                if (!"delete".equals(a.statutArticle()) && p.equalsIgnoreCase(
                        sansBlancs(a.referenceUbipharm())) /* str_PSCODE : casse ignoree, comme en SQL */) {
                    attendusReference.add(a.familleId());
                }
            }
        }
        if (!attendusReference.isEmpty()) {
            /* priorite a la reference Ubipharm de la fiche, tous les candidats listes */
            assertEquals("PSCODE", res.critere());
            assertEquals(new ArrayList<>(attendusReference), ids);
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
    void referenceUbipharmPrioritaireSurUnCipQuiDesigneUnAutreArticle() {
        Article a = new Article("A", "A", "enable", "FAIR248", Arrays.asList("111", null, null, null, null));
        Article b = new Article("B", "B", "enable", null, Arrays.asList("3000001262862", null, null, null, null));
        Resultat r = RapprochementProduits.decider("FAIR248", Collections.singletonList("3000001262862"),
                Collections.singletonList(a), Arrays.asList(a, b));
        assertEquals(Statut.PSCODE, r.statut());
        assertEquals("A", r.candidats().get(0).familleId());
        /* sans reference sur aucune fiche (liste vide), le CIP decide */
        r = RapprochementProduits.decider("FAIR248", Collections.singletonList("3000001262862"),
                Collections.emptyList(), Arrays.asList(a, b));
        assertEquals(Statut.CIP, r.statut());
        assertEquals("B", r.candidats().get(0).familleId());
    }

    /** str_PSCODE est saisi en majuscules sur la fiche ; la requete SQL ignore la casse : la decision aussi. */
    @Test
    void referenceUbipharmSansTenirCompteDeLaCasse() {
        for (String[] c : new String[][] { { "FAIR248", "fair248" }, { "fair248", "FAIR248" }, { "Fort256", "FORT256" },
                { " FAIR 248 ", "FAIR248" } }) {
            Article a = new Article("A", "A", "enable", c[0], Arrays.asList(null, null, null, null, null));
            Resultat r = RapprochementProduits.decider(c[1], null, Collections.singletonList(a), null);
            assertEquals(Statut.PSCODE, r.statut(), c[0] + " / " + c[1]);
            assertEquals("A", r.candidats().get(0).familleId());
        }
        Article a = new Article("A", "A", "enable", "FAIR2480", Arrays.asList(null, null, null, null, null));
        assertEquals(Statut.INTROUVABLE,
                RapprochementProduits.decider("FAIR248", null, Collections.singletonList(a), null).statut());
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
