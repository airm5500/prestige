package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Regles de l'auteur d'un article retrouve dans le journal (retours du 23/11), sur 20 000 cas tires au hasard (graine
 * fixe) :
 * <ul>
 * <li>une ligne correspond si et seulement si elle est ecrite de 5 s avant a 60 s apres la creation, et porte « cip
 * [CIP » suivi d'une espace, ou « NOM par » ;</li>
 * <li>le CIP l'emporte sur le nom ; parmi plusieurs lignes du meme CIP, la premiere ; un CIP qui ne fait que commencer
 * comme celui de l'article ne correspond pas ; « % », « _ » et « [ » sont pris a la lettre ;</li>
 * <li>aucune ligne qui correspond : pas d'auteur.</li>
 * </ul>
 */
class CreateurArticleCoherenceTest {

    private static final String[] MORCEAUX = { "8014527", "3000001239734", "84675650D", "12_4", "50%", "AB[C", "1",
            "R-LUME", "FINSTAM 0,4MG", "DOLIPRANE 500MG", "X" };

    private static String tirer(Random r) {
        StringBuilder s = new StringBuilder(MORCEAUX[r.nextInt(MORCEAUX.length)]);
        if (r.nextInt(3) == 0) {
            s.append(r.nextInt(10));
        }
        return s.toString();
    }

    private static String description(String cip, String nom, String auteur) {
        return "Création du produit  cip [" + cip + " " + nom + " par " + auteur + " ]";
    }

    /** Regle ecrite independamment : fenetre, puis « cip [CIP » + espace, ou « NOM par ». */
    private static boolean attendu(String cipJ, String nomJ, long ecartMs, String cip, String nom) {
        if (ecartMs < -5_000L || ecartMs > 60_000L) {
            return false;
        }
        boolean parCip = cip != null && !cip.isEmpty() && (cipJ + " " + nomJ).startsWith(cip + " ");
        boolean parNom = nom != null && !nom.isEmpty() && (" " + nomJ + " par ").contains(" " + nom + " par ")
                || nom != null && !nom.isEmpty() && (cipJ + " " + nomJ + " par ").contains(" " + nom + " par ");
        return parCip || parNom;
    }

    @Test
    void correspondanceSurVingtMilleCas() {
        Random r = new Random(20261123L);
        Date creeLe = new Date(1_800_000_000_000L);
        int vrais = 0;
        for (int i = 0; i < 20_000; i++) {
            String cip = tirer(r);
            String nom = tirer(r) + " " + tirer(r);
            String cipJ = r.nextInt(3) == 0 ? tirer(r) : (r.nextBoolean() ? cip : cip + r.nextInt(10));
            String nomJ = r.nextInt(3) == 0 ? tirer(r) : nom;
            long ecart = (long) (r.nextInt(140_000) - 20_000);
            if (r.nextInt(10) == 0) {
                ecart = r.nextBoolean() ? -5_000L : 60_000L; // bornes incluses
            }
            if (r.nextInt(10) == 0) {
                ecart = r.nextBoolean() ? -5_001L : 60_001L; // juste dehors
            }
            Date le = new Date(creeLe.getTime() + ecart);
            boolean vu = CreateurArticle.correspond(description(cipJ, nomJ, "AUTEUR"), le, cip, nom, creeLe);
            boolean att = attendu(cipJ, nomJ, ecart, cip, nom);
            assertEquals(att, vu,
                    "cas " + i + " : " + cipJ + " / " + nomJ + " / " + ecart + " ms pour " + cip + " / " + nom);
            if (vu) {
                vrais++;
            }
        }
        // jeu varie : beaucoup de cas qui correspondent et beaucoup qui ne correspondent pas
        assertEquals(true, vrais > 3_000 && vrais < 17_000, "cas qui correspondent : " + vrais);
    }

    @Test
    void priorites() {
        Random r = new Random(20261124L);
        Date creeLe = new Date(1_800_000_000_000L);
        for (int i = 0; i < 2_000; i++) {
            String cip = "C" + r.nextInt(1000);
            String nom = "NOM " + r.nextInt(1000);
            CreateurArticle.Fiche f = new CreateurArticle.Fiche("id", cip, nom, creeLe);
            List<CreateurArticle.Creation> l = new ArrayList<>();
            int n = 1 + r.nextInt(6);
            String premierCip = null;
            String premierNom = null;
            for (int k = 0; k < n; k++) {
                int genre = r.nextInt(4); // 0 meme CIP, 1 meme nom (CIP change), 2 autre article, 3 meme CIP hors
                                          // fenetre
                long ecart = genre == 3 ? 61_000L + r.nextInt(100_000) : r.nextInt(60_000);
                String auteur = "U" + k;
                String c = genre == 0 || genre == 3 ? cip : (genre == 1 ? "OLD" + cip : cip + "9");
                String nm = genre == 2 ? "AUTRE " + k : nom;
                l.add(new CreateurArticle.Creation(new Date(creeLe.getTime() + ecart), description(c, nm, auteur),
                        auteur));
                if (genre == 0 && premierCip == null) {
                    premierCip = auteur;
                }
                if (genre == 1 && premierNom == null) {
                    premierNom = auteur;
                }
            }
            Collections.sort(l, (a, b) -> a.le.compareTo(b.le));
            // l'ordre du journal compte : on recalcule les premiers apres le tri par date
            premierCip = null;
            premierNom = null;
            for (CreateurArticle.Creation c : l) {
                long ecart = c.le.getTime() - creeLe.getTime();
                boolean fenetre = ecart >= -5_000L && ecart <= 60_000L;
                if (fenetre && premierCip == null && c.description.contains("cip [" + cip + " ")) {
                    premierCip = c.auteur;
                }
                if (fenetre && premierNom == null && c.description.contains(" " + nom + " par ")) {
                    premierNom = c.auteur;
                }
            }
            String att = premierCip != null ? premierCip : premierNom;
            assertEquals(att, CreateurArticle.parJournal(f, l), "cas " + i);
        }
        assertNull(
                CreateurArticle.parJournal(new CreateurArticle.Fiche("id", "1", "A", creeLe), Collections.emptyList()));
    }
}
