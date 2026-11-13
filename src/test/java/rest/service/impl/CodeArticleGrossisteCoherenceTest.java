package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Règle du choix « Utiliser le code du produit retrouvé » (réconciliation d'un BL, plan du 12/11) : le code du BL est
 * retenu comme code article du produit chez le grossiste SI ET SEULEMENT SI il a de 6 à 20 caractères (espaces de bord
 * retirés), qu'aucun autre produit ne le porte chez ce grossiste et qu'aucun autre produit ne l'a pour CIP ou EAN13. Un
 * refus nomme toujours la cause ; jamais un code en conflit n'est accepté.
 */
public class CodeArticleGrossisteCoherenceTest {

    private static final String CHIFFRES_LETTRES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    @Test
    public void regleSurDesMilliersDeCasTiresAuHasard() {
        Random r = new Random(20261113L);
        int acceptes = 0;
        int refusLongueur = 0;
        int refusConflit = 0;
        for (int i = 0; i < 20000; i++) {
            int longueur = r.nextInt(26);
            StringBuilder sb = new StringBuilder();
            for (int k = 0; k < longueur; k++) {
                sb.append(CHIFFRES_LETTRES.charAt(r.nextInt(CHIFFRES_LETTRES.length())));
            }
            String code = (r.nextInt(5) == 0 ? "  " : "") + sb + (r.nextInt(5) == 0 ? " " : "");
            if (r.nextInt(50) == 0) {
                code = null;
            }
            String chezGrossiste = r.nextInt(4) == 0 ? "PRODUIT G" + i : null;
            String cipOuEan = r.nextInt(4) == 0 ? "PRODUIT C" + i : null;

            String refus = ProduitServiceImpl.refusCodeArticle(code, chezGrossiste, cipOuEan);

            boolean longueurValide = longueur >= 6 && longueur <= ProduitServiceImpl.LONGUEUR_CODE_ARTICLE
                    && code != null;
            boolean attenduAccepte = longueurValide && chezGrossiste == null && cipOuEan == null;
            assertEquals(attenduAccepte, refus == null,
                    "cas " + i + " : " + code + " / " + chezGrossiste + " / " + cipOuEan);
            if (!longueurValide) {
                assertNotNull(refus);
                assertTrue(refus.contains("caractères"), refus);
                refusLongueur++;
            } else if (chezGrossiste != null) {
                assertEquals("Ce code est déjà utilisé par : " + chezGrossiste, refus);
                refusConflit++;
            } else if (cipOuEan != null) {
                assertEquals("Ce code est déjà utilisé par : " + cipOuEan, refus);
                refusConflit++;
            } else {
                acceptes++;
            }
        }
        assertTrue(acceptes > 1000, "jeu varie : acceptes " + acceptes);
        assertTrue(refusLongueur > 1000, "jeu varie : refus de longueur " + refusLongueur);
        assertTrue(refusConflit > 1000, "jeu varie : refus de conflit " + refusConflit);
    }

    @Test
    public void bornesDeLongueur() {
        assertNotNull(ProduitServiceImpl.refusCodeArticle("12345", null, null));
        assertNull(ProduitServiceImpl.refusCodeArticle("123456", null, null));
        assertNull(ProduitServiceImpl.refusCodeArticle("2999131100011", null, null));
        assertNull(ProduitServiceImpl.refusCodeArticle("12345678901234567890", null, null));
        assertNotNull(ProduitServiceImpl.refusCodeArticle("123456789012345678901", null, null));
        assertNotNull(ProduitServiceImpl.refusCodeArticle("   ", null, null));
        assertNotNull(ProduitServiceImpl.refusCodeArticle(null, null, null));
    }
}
