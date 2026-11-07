package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Arrays;
import java.util.Collections;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.extranet.ubipharm.RapprochementProduits;
import rest.service.extranet.ubipharm.RapprochementProduits.Article;
import rest.service.extranet.ubipharm.RapprochementProduits.Statut;

/**
 * Reference Ubipharm (PSCODE) saisie sur la fiche article : la valeur enregistree est celle que le rapprochement
 * retrouve. Regles verifiees sur des milliers de saisies tirees avec une graine fixe : aucun blanc garde, rien d'autre
 * change (casse, zeros de tete), idempotence, absent = inchange, vide = efface.
 */
class CodeUbipharmCoherenceTest {

    private static final String[] MORCEAUX = { "FAIR", "248", "0042", "ABC", "fair", "-", "_", ".", "é" };
    private static final String[] BLANCS = { "", " ", "  ", "\t", " ", " " };

    @Test
    void saisieNormaliseeEtRetrouveeParLeRapprochement() {
        Random r = new Random(20261107L);
        int retrouves = 0;
        for (int cas = 0; cas < 5000; cas++) {
            StringBuilder saisie = new StringBuilder(), attendu = new StringBuilder();
            for (int i = r.nextInt(5); i >= 0; i--) {
                String m = MORCEAUX[r.nextInt(MORCEAUX.length)];
                saisie.append(BLANCS[r.nextInt(BLANCS.length)]).append(m);
                attendu.append(m);
            }
            saisie.append(BLANCS[r.nextInt(BLANCS.length)]);
            String n = FicheArticleRessource.normaliserCodeUbipharm(saisie.toString());
            assertEquals(attendu.toString(), n);
            assertFalse(n.matches(".*[\\s\\u00A0\\u202F].*"));
            assertEquals(n, FicheArticleRessource.normaliserCodeUbipharm(n));
            /* la fiche enregistree avec ce code est retrouvee par le PSCODE lu sur l'extranet, meme avec des blancs */
            Article a = new Article("F1", "Article", "enable", n, Arrays.asList(null, null, null, null, null));
            Statut s = RapprochementProduits.decider(" " + attendu + " ", Collections.emptyList(),
                    Collections.singletonList(a), Collections.emptyList()).statut();
            assertEquals(Statut.PSCODE, s);
            retrouves++;
        }
        assertEquals(5000, retrouves);
    }

    @Test
    void absentInchangeVideEfface() {
        assertNull(FicheArticleRessource.normaliserCodeUbipharm(null));
        for (String b : BLANCS) {
            assertEquals("", FicheArticleRessource.normaliserCodeUbipharm(b));
        }
        /* zeros de tete et casse gardes : « 0042ABC » et « 42abc » sont deux references differentes */
        assertEquals("0042ABC", FicheArticleRessource.normaliserCodeUbipharm(" 0042 ABC "));
        Article a = new Article("F1", "A", "enable", "0042ABC", Arrays.asList(null, null, null, null, null));
        assertEquals(Statut.INTROUVABLE, RapprochementProduits
                .decider("42ABC", Collections.emptyList(), Collections.singletonList(a), Collections.emptyList())
                .statut());
    }
}
