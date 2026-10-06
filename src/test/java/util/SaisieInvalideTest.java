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
}
