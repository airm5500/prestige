package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Produits actifs sans vente (decision du 21/11 : « oui aussi en standard »). En SEMOIS standard, les produits actifs
 * qui ne sont pas vendus dans la fenetre passent a seuil 0 et quantite 0, comme en ABC et par produit. Si la lecture
 * des ventes echoue, aucun produit n'est remis a zero : une liste de ventes vide par erreur ne doit pas vider tout le
 * catalogue (les trois modes).
 */
class SemoisNonVendusCoherenceTest {

    private static List<String> tirage(Random r, int n, String prefixe) {
        List<String> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            l.add(prefixe + r.nextInt(3 * n + 1));
        }
        return l;
    }

    @Test
    void standardNonVendusADesListesAuHasard() {
        Random r = new Random(2113);
        int remis = 0;
        for (int i = 0; i < 20000; i++) {
            List<String> actifs = tirage(r, r.nextInt(60), "P");
            Set<String> vendus = new HashSet<>(tirage(r, r.nextInt(60), "P"));
            if (r.nextInt(10) == 0) {
                vendus.addAll(tirage(r, 5, "D")); // details et parents hors liste des actifs
            }
            List<String> zero = SemoisService.aRemettreAZero(actifs, vendus, true);
            String cas = "actifs=" + actifs + " vendus=" + vendus;
            if (vendus.isEmpty()) {
                /* aucune vente lue sur des mois actifs : anormal, personne n'est remis a zero */
                assertTrue(zero.isEmpty(), cas);
                continue;
            }
            /* exactement les actifs non vendus, dans l'ordre des actifs, sans doublon */
            List<String> attendu = new ArrayList<>(new LinkedHashSet<>(actifs));
            attendu.removeAll(vendus);
            assertEquals(attendu, zero, cas);
            assertEquals(new LinkedHashSet<>(zero).size(), zero.size(), "sans doublon " + cas);
            assertTrue(zero.stream().noneMatch(vendus::contains), "jamais un produit vendu " + cas);
            /* partition : vendus actifs + remis a zero = actifs */
            Set<String> union = new HashSet<>(zero);
            actifs.stream().filter(vendus::contains).forEach(union::add);
            assertEquals(new HashSet<>(actifs), union, cas);
            remis += zero.size();
            /* lecture des ventes en echec : personne n'est remis a zero */
            assertTrue(SemoisService.aRemettreAZero(actifs, vendus, false).isEmpty(), cas);
        }
        assertTrue(remis > 10000, "assez de produits remis a zero : " + remis);
    }

    @Test
    void casLimites() {
        assertEquals(Arrays.asList("A", "C"), SemoisService.aRemettreAZero(Arrays.asList("A", "B", "C", "A"),
                new HashSet<>(Collections.singletonList("B")), true));
        assertTrue(SemoisService.aRemettreAZero(Collections.emptyList(), new HashSet<>(), true).isEmpty());
        assertTrue(SemoisService.aRemettreAZero(Arrays.asList("A", "B"), new HashSet<>(), true).isEmpty(),
                "aucune vente lue, sans erreur, sur des mois actifs : situation anormale, personne a zero");
        assertEquals(Arrays.asList("B"), SemoisService.aRemettreAZero(Arrays.asList("A", "B"),
                new HashSet<>(Collections.singletonList("A")), true), "une seule vente suffit");
        assertTrue(SemoisService.aRemettreAZero(Arrays.asList("A", "B"), new HashSet<>(), false).isEmpty(),
                "aucune vente parce que la lecture a echoue : personne a zero");
    }

    @Test
    void explicationRappelleLesNonVendus() throws Exception {
        String sql = new String(
                java.nio.file.Files.readAllBytes(java.nio.file.Paths
                        .get("src/main/resources/db/migration/V7.6.41.2112__semois_standard_non_vendus.sql")),
                java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(sql.contains("JSON_ARRAY_APPEND(explication, '$.rappels',"), "ajout aux rappels, regle intacte");
        assertTrue(
                sql.contains("'Dans les trois modes, un produit actif sans vente sur les mois retenus passe à seuil 0"
                        + " et quantité 0, sauf si le calcul du seuil est désactivé sur sa fiche.'"),
                "texte du rappel");
        assertTrue(sql.contains("WHERE str_KEY = 'SEMOIS_DIVISEUR_MOIS_REELS'"));
        assertTrue(sql.contains("NOT LIKE '%sans vente sur les mois retenus%'"), "rejouable sans doublon");
    }

    /**
     * ABC et par produit (contre-verification du 21/11) : seule la liste des vendus, lue a part sur les mois retenus,
     * decide qu'un produit est remis a zero. Un produit vendu absent de la consommation (vendu seulement par un detail
     * desactive) n'est pas traite ; aucune vente sur les mois retenus (meme avec des ventes dans un mois ecarte, donc
     * une consommation non vide) : rien n'est traite.
     */
    @Test
    void abcEtParProduitSeulsLesNonVendusSontAjoutes() {
        Random r = new Random(2115);
        for (int i = 0; i < 20000; i++) {
            List<String> actifs = tirage(r, 1 + r.nextInt(50), "P");
            List<String> calcules = tirage(r, r.nextInt(30), "P");
            Set<String> vendus = new HashSet<>(tirage(r, r.nextInt(40), "P"));
            if (r.nextInt(3) > 0) {
                vendus.addAll(calcules); // en general la consommation est vendue ; parfois non (mois ecarte)
            }
            List<String> ids = SemoisService.produitsATraiter(calcules, actifs, vendus);
            String cas = "calcules=" + calcules + " vendus=" + vendus + " actifs=" + actifs;
            if (vendus.isEmpty()) {
                assertTrue(ids.isEmpty(), "aucune vente sur les mois retenus : rien " + cas);
                continue;
            }
            List<String> attendu = new ArrayList<>(new LinkedHashSet<>(calcules));
            for (String a : new LinkedHashSet<>(actifs)) {
                if (!vendus.contains(a) && !attendu.contains(a)) {
                    attendu.add(a);
                }
            }
            assertEquals(attendu, ids, cas);
            /* un produit vendu ne vient jamais de la liste des actifs : il n'est traite que par sa consommation */
            for (String id : ids) {
                assertTrue(calcules.contains(id) || !vendus.contains(id),
                        "vendu ajoute comme non vendu " + id + " " + cas);
            }
            assertTrue(SemoisService.produitsATraiter(null, actifs, vendus).isEmpty(), "consommation illisible " + cas);
            assertEquals(new ArrayList<>(new LinkedHashSet<>(calcules)),
                    SemoisService.produitsATraiter(calcules, actifs, null),
                    "liste des vendus illisible : consommation lue recalculee comme avant, aucun actif ajoute " + cas);
        }
        /* boite vendue seulement par un detail desactive : vendue, absente de la consommation, non traitee */
        assertEquals(Arrays.asList("C"), SemoisService.produitsATraiter(Collections.emptyList(),
                Arrays.asList("B", "C"), new HashSet<>(Collections.singletonList("B"))));
    }

    /**
     * Repli ABC et par produit (liste des vendus illisible) : jamais d'ecriture d'un calcul sans vente dans sa fenetre.
     */
    @Test
    void repliSansZero() {
        Random r = new Random(2116);
        for (int i = 0; i < 20000; i++) {
            double conso = r.nextInt(4) == 0 ? 0d : r.nextInt(500) / (1d + r.nextInt(7));
            assertTrue(SemoisService.aEcrire(true, conso), "liste lue : calcul ordinaire, ecrit comme avant");
            assertEquals(conso > 0, SemoisService.aEcrire(false, conso),
                    "repli : ecrit seulement avec des ventes " + conso);
        }
        assertFalse(SemoisService.aEcrire(false, 0d), "repli, aucune vente dans la fenetre : valeurs gardees");
    }

    @Test
    void moisContinusDuStandard() {
        java.time.LocalDate d = java.time.LocalDate.of(2026, 8, 1);
        assertEquals(Arrays.asList(d, d.plusMonths(1), d.plusMonths(2)),
                SemoisService.moisContinus(d, java.time.LocalDate.of(2026, 10, 1)),
                "aout a octobre, septembre compris");
        assertEquals(Collections.singletonList(d), SemoisService.moisContinus(d, d));
        assertEquals(Arrays.asList(java.time.LocalDate.of(2025, 12, 1), java.time.LocalDate.of(2026, 1, 1)),
                SemoisService.moisContinus(java.time.LocalDate.of(2025, 12, 1), java.time.LocalDate.of(2026, 1, 1)),
                "passage d'annee");
    }

    @Test
    void abcEtParProduitLectureEnEchec() {
        Random r = new Random(2114);
        for (int i = 0; i < 2000; i++) {
            List<String> actifs = tirage(r, 1 + r.nextInt(40), "P");
            assertTrue(SemoisService.produitsATraiter(null, actifs).isEmpty(),
                    "ventes illisibles : aucun produit traite, donc aucun remis a zero");
            assertTrue(SemoisService.produitsATraiter(new ArrayList<>(), actifs).isEmpty(),
                    "aucune vente sur des mois actifs : aucun produit traite");
            List<String> vendus = tirage(r, 1 + r.nextInt(40), "P");
            List<String> tous = SemoisService.produitsATraiter(vendus, actifs);
            assertFalse(tous.isEmpty());
            assertEquals(new LinkedHashSet<>(tous).size(), tous.size());
        }
    }
}
