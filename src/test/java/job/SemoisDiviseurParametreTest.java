package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Parametre SEMOIS_DIVISEUR_MOIS_REELS (decision du 21/11) : 1 (defaut) = division par les mois reellement presents x 4
 * semaines ; 0 = ancienne formule, Q3 x 4 semaines, quel que soit l'historique. Coherence sur des milliers de cas tires
 * au hasard (graine fixe), et rapprochement du descriptif entre t_parameters et parametre_explication.
 */
class SemoisDiviseurParametreTest {

    private static final LocalDate OCTOBRE = LocalDate.of(2026, 10, 1);
    private static final String MIGRATION = "src/main/resources/db/migration/V7.6.41.2111__semois_diviseur_mois_reels.sql";
    private static final String DESCRIPTIF = "Méthode de division du calcul SEMOIS (standard, ABC, par produit). 1 = les ventes"
            + " sont divisées par le nombre de mois réellement présents dans l'historique × 4 semaines (valeur par défaut,"
            + " adaptée à une officine qui démarre). 0 = ancienne formule : division par Q3 × 4 semaines, quel que soit"
            + " l'historique disponible.";

    private static List<LocalDate> mois(int n) {
        List<LocalDate> l = new ArrayList<>();
        for (int i = n - 1; i >= 0; i--) {
            l.add(OCTOBRE.minusMonths(i));
        }
        return l;
    }

    private static String ym(LocalDate m) {
        return String.format("%04d-%02d", m.getYear(), m.getMonthValue());
    }

    @Test
    void moayeAvecAncienneFormule() {
        Map<String, Double> ventes = new HashMap<>();
        ventes.put("2026-10", 336d);
        assertEquals(56, SemoisService.calculProduit(ventes, mois(1), 2, 2, 3, false, false).seuil, "336 / 12 x 2");
        assertEquals(168, SemoisService.calculProduit(ventes, mois(1), 2, 2, 3, false, true).seuil, "336 / 4 x 2");
        assertEquals(168, SemoisService.calculProduit(ventes, mois(1), 2, 2, 3, false).seuil, "defaut : mois reels");
    }

    @Test
    void coherenceDesDeuxMethodes() {
        Random r = new Random(2112);
        int differents = 0;
        for (int i = 0; i < 20000; i++) {
            int n = 1 + r.nextInt(12);
            List<LocalDate> moisAsc = mois(n);
            Map<String, Double> ventes = r.nextInt(8) == 0 ? null : new HashMap<>();
            if (ventes != null) {
                for (LocalDate m : moisAsc) {
                    if (r.nextInt(4) != 0) {
                        ventes.put(ym(m), r.nextInt(5) == 0 ? r.nextInt(40) / 7d : (double) r.nextInt(2000));
                    }
                }
            }
            int q1 = r.nextInt(6), q2 = r.nextInt(6), q3 = 1 + r.nextInt(12);
            boolean jour = r.nextInt(4) == 0;
            SemoisService.Calcul reels = SemoisService.calculProduit(ventes, moisAsc, q1, q2, q3, jour, true);
            SemoisService.Calcul ancien = SemoisService.calculProduit(ventes, moisAsc, q1, q2, q3, jour, false);
            String cas = "n=" + n + " q=" + q1 + "/" + q2 + "/" + q3 + " jour=" + jour;
            /* meme fenetre, memes ventes */
            assertEquals(reels.consoTotale, ancien.consoTotale, 1e-9, cas);
            assertEquals(reels.mois, ancien.mois, cas);
            double attendu = jour ? ancien.consoTotale / ancien.jours : ancien.consoTotale / (q3 * 4d);
            assertEquals(attendu, ancien.conso, 1e-9, "ancienne formule : / (Q3 x 4) " + cas);
            assertEquals((int) Math.ceil(attendu * q1), ancien.seuil, cas);
            assertEquals((int) Math.ceil(attendu * q2), ancien.qte, cas);
            assertTrue(ancien.seuil >= 0 && ancien.qte >= 0, cas);
            if (jour || n >= q3) {
                assertEquals(reels.seuil, ancien.seuil, "historique complet ou calcul au jour : identiques " + cas);
                assertEquals(reels.qte, ancien.qte, cas);
            } else {
                assertTrue(reels.seuil >= ancien.seuil,
                        "historique court : jamais plus bas avec les mois reels " + cas);
                if (reels.seuil != ancien.seuil) {
                    differents++;
                }
            }
        }
        assertTrue(differents > 1000, "assez de cas ou les deux methodes different : " + differents);
    }

    @Test
    void descriptifIdentiqueDansLesDeuxTables() throws Exception {
        String sql = new String(Files.readAllBytes(Paths.get(MIGRATION)), StandardCharsets.UTF_8);
        Matcher d = Pattern.compile("'SEMOIS_DIVISEUR_MOIS_REELS', '1',\\s*'((?:[^']|'')*)'").matcher(sql);
        assertTrue(d.find(), "insertion du parametre");
        assertEquals(DESCRIPTIF, d.group(1).replace("''", "'"), "t_parameters.str_DESCRIPTION = texte valide");
        assertTrue(d.group(1).replace("''", "'").length() <= 1000, "tient dans la colonne elargie");
        Matcher e = Pattern.compile(
                "INSERT INTO parametre_explication[^']*SELECT 'SEMOIS_DIVISEUR_MOIS_REELS',\\s*'((?:[^']|'')*)'")
                .matcher(sql);
        assertTrue(e.find(), "explication du parametre");
        String json = e.group(1).replace("''", "'");
        assertTrue(util.ExplicationParametre.estValide(json), "explication lisible par l'ecran");
        assertEquals(DESCRIPTIF, new JSONObject(json).getString("regle"), "regle de l'explication = texte valide");
    }
}
