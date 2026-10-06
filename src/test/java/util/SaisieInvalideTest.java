package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Controle de saisie (07/10) : une valeur tapee illisible est un refus, pas une panne. */
public class SaisieInvalideTest {

    private static Throwable erreur(Runnable r) {
        try {
            r.run();
            return null;
        } catch (RuntimeException e) {
            return e;
        }
    }

    @Test
    public void valeurIllisible() {
        assertEquals("abc", SaisieInvalide.valeurIllisible(erreur(() -> LocalDate.parse("abc"))));
        assertEquals("", SaisieInvalide.valeurIllisible(erreur(() -> LocalDate.parse(""))));
        assertEquals("12x", SaisieInvalide.valeurIllisible(erreur(() -> Integer.parseInt("12x"))));
        assertEquals("", SaisieInvalide.valeurIllisible(erreur(() -> Integer.parseInt(""))));
        assertNull(SaisieInvalide.valeurIllisible(new NullPointerException()));
        assertNull(SaisieInvalide.valeurIllisible(new IllegalStateException("x")));
    }

    @Test
    public void seulementSiLaValeurVientDeLaSaisie() {
        Map<String, String[]> p = new HashMap<>();
        p.put("dtStart", new String[] { "2026-13-45" });
        p.put("query", new String[] { "" });
        assertTrue(SaisieInvalide.estSaisie("2026-13-45", p, "/prestige/api/v1/x"));
        assertTrue(SaisieInvalide.estSaisie("", p, "/prestige/api/v1/x"), "champ vide envoye");
        assertTrue(SaisieInvalide.estSaisie("l'a b", new HashMap<>(), "/prestige/api/v1/x/l%27a%20b"));
        assertFalse(SaisieInvalide.estSaisie("valeur-de-la-base", p, "/prestige/api/v1/x"),
                "une valeur illisible venue d'ailleurs reste une erreur interne");
        assertFalse(SaisieInvalide.estSaisie("", new HashMap<>(), "/prestige/api/v1/x"));
        assertFalse(SaisieInvalide.estSaisie(null, p, "/x"));
    }

    @Test
    public void messageLisible() {
        assertEquals("Valeur saisie invalide : « abc » (date ou nombre attendu).", SaisieInvalide.message("abc"));
        assertTrue(SaisieInvalide.message("").startsWith("Un champ obligatoire est vide"));
        assertTrue(SaisieInvalide.message("x".repeat(300)).length() < 100);
    }

    @Test
    public void autresErreursDeSaisie() {
        Map<String, String[]> p = new HashMap<>();
        p.put("query", new String[] { "abc\ud83d\ude00" });
        assertTrue(SaisieInvalide.autreSaisie(new RuntimeException("Illegal mix of collations (utf8mb3)"), p)
                .contains("émojis"));
        Map<String, String[]> sansEmoji = new HashMap<>();
        sansEmoji.put("query", new String[] { "abc" });
        assertNull(SaisieInvalide.autreSaisie(new RuntimeException("Illegal mix of collations (utf8mb3)"), sansEmoji),
                "sans emoji saisi : vraie erreur interne");
        Map<String, String[]> page = new HashMap<>();
        page.put("start", new String[] { "-50" });
        assertEquals("Numéro de page ou de ligne invalide.", SaisieInvalide
                .autreSaisie(new IllegalArgumentException("first-result value cannot be negative : -50"), page));
        Map<String, String[]> d = new HashMap<>();
        d.put("dtStart", new String[] { "2026-13-45" });
        d.put("query", new String[] { "x" });
        assertTrue(SaisieInvalide.autreSaisie(new java.time.DateTimeException("Invalid value for MonthOfYear: 13"), d)
                .contains("2026-13-45"));
        Map<String, String[]> bonne = new HashMap<>();
        bonne.put("dtStart", new String[] { "2026-02-01" });
        assertNull(SaisieInvalide.autreSaisie(new java.time.DateTimeException("x"), bonne),
                "dates saisies correctes : l'erreur vient d'ailleurs");
        assertNull(SaisieInvalide.autreSaisie(new NullPointerException(), d));
    }

    @Test
    public void parametresRelusEnUtf8() {
        Map<String, String[]> p = SaisieInvalide.parametresUtf8("query=%C3%A9t%C3%A9%F0%9F%98%80&start=0", null);
        assertEquals("été\ud83d\ude00", p.get("query")[0]);
        assertEquals("0", p.get("start")[0]);
        assertTrue(SaisieInvalide.horsJeuDeCaracteres(p.get("query")[0]));
    }
}
