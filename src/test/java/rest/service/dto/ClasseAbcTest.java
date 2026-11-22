package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 4.5 : lettre de la classe ABC affichee apres le nom (suggestion, commande en cours). Regles :
 * identifiant de t_classe_abc -> son code (partie apres le dernier tiret bas) ; sans classe -> rien ; valeur inattendue
 * -> rien (jamais un morceau d'identifiant affiche).
 */
public class ClasseAbcTest {

    @Test
    public void classesDeLaBase() {
        assertEquals("A", ClasseAbc.lettre("ABC_CLASSE_A"));
        assertEquals("B", ClasseAbc.lettre("ABC_CLASSE_B"));
        assertEquals("C", ClasseAbc.lettre("ABC_CLASSE_C"));
        assertEquals("A", ClasseAbc.lettre(" ABC_CLASSE_a "));
    }

    @Test
    public void sansClasseRienNEstAffiche() {
        assertEquals("", ClasseAbc.lettre(null));
        assertEquals("", ClasseAbc.lettre(""));
        assertEquals("", ClasseAbc.lettre("   "));
        assertEquals("", ClasseAbc.lettre("ABC_CLASSE_"));
        assertEquals("", ClasseAbc.lettre("ABC_CLASSE_<b>"));
        assertEquals("", ClasseAbc.lettre("2f609bc4a-6a7e-4d3c-9b3e-0c1d2e3f4a5b"));
    }

    /** Coherence sur 5 000 identifiants tires au hasard (graine fixe) : la lettre est toujours le code attendu. */
    @Test
    public void coherenceSurDesMilliersDeCas() {
        Random r = new Random(2111L);
        String[] codes = { "A", "B", "C" };
        for (int i = 0; i < 5000; i++) {
            String code = codes[r.nextInt(3)];
            String prefixe = r.nextBoolean() ? "ABC_CLASSE_" : "ABC_" + (char) ('A' + r.nextInt(26)) + "_";
            String id = (r.nextInt(5) == 0 ? " " : "") + prefixe + (r.nextBoolean() ? code : code.toLowerCase());
            String l = ClasseAbc.lettre(id);
            assertEquals(code, l, id);
            /* jamais plus de 3 caracteres, jamais de caractere de balise */
            assertEquals(true, l.length() <= 3 && l.indexOf('<') < 0, id);
        }
    }
}
