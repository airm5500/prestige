package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retour du 06/11 : le recapitulatif du ticket compte des articles, plus des boites (« 1 ligne · 1 article », « 2
 * lignes · 5 articles »). Coherence : le nombre d'articles est la somme des quantites (en valeur absolue pour une
 * annulation), le nombre de lignes celui des lignes du ticket.
 */
class RecapArticlesTest {

    private static ConversionTicket.Article article(int quantite) {
        return new ConversionTicket.Article("PRODUIT", quantite, 1000, 1000 * quantite, "");
    }

    @Test
    void singulierEtPluriel() {
        List<ConversionTicket.Article> l = new ArrayList<>();
        l.add(article(1));
        assertEquals("1 ligne · 1 article", ConversionTicket.recapitulatif(l));
        l.add(article(4));
        assertEquals("2 lignes · 5 articles", ConversionTicket.recapitulatif(l));
    }

    @Test
    void articlesEgaleSommeDesQuantitesSurDesMilliersDeTickets() {
        Random r = new Random(20261106L);
        for (int i = 0; i < 5_000; i++) {
            List<ConversionTicket.Article> l = new ArrayList<>();
            int n = 1 + r.nextInt(12);
            int somme = 0;
            for (int k = 0; k < n; k++) {
                int q = (r.nextInt(6) == 0 ? -1 : 1) * (1 + r.nextInt(9));
                somme += Math.abs(q);
                l.add(article(q));
            }
            String attendu = n + (n > 1 ? " lignes" : " ligne") + " · " + somme
                    + (somme > 1 ? " articles" : " article");
            assertEquals(attendu, ConversionTicket.recapitulatif(l));
        }
    }
}
