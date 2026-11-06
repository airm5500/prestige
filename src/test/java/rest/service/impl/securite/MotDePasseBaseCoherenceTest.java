package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.security.SecureRandom;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ApplicationPayara;

/**
 * Cas 4, lot 4.B, test de COHERENCE (règle du 05/11) : des milliers de mots de passe générés et contrôlés, graine fixe,
 * vérifiés par des règles écrites indépendamment du code (alphabet, longueur, une lettre + un chiffre + un symbole,
 * rien que cmd.exe, asadmin, l'URL JDBC ou un fichier .cnf puisse interpréter), puis des milliers de saisies tirées au
 * hasard dont le verdict de {@link MotDePasseBase#valider} doit être celui de la règle de référence, cas par cas.
 */
class MotDePasseBaseCoherenceTest {

    static final long GRAINE = 20261105L;
    static final int GENERES = 10_000, SAISIES = 20_000;
    /** Regle de reference, ecrite a part : ce qu'un mot de passe de la base a le droit de contenir. */
    static final String LETTRES = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", CHIFFRES = "0123456789",
            SYMBOLES_ADMIS = "#*+-./:;=@[]_~";
    /**
     * Ce qui ne doit jamais y figurer (analyse : & ? ' " espace ; cmd.exe : % ! ^ | < > ( ) ; Payara : $ { } ;
     * antislash).
     */
    static final String INTERDITS = "&?'\" %!^|<>(){}$\\`,\téàç";

    static boolean reference(String m) {
        if (m == null || m.length() < 12 || m.length() > 120) {
            return false;
        }
        boolean lettre = false, chiffre = false, symbole = false;
        for (char c : m.toCharArray()) {
            if (LETTRES.indexOf(c) >= 0) {
                lettre = true;
            } else if (CHIFFRES.indexOf(c) >= 0) {
                chiffre = true;
            } else if (SYMBOLES_ADMIS.indexOf(c) >= 0) {
                symbole = true;
            } else {
                return false;
            }
        }
        return lettre && chiffre && symbole;
    }

    static SecureRandom graine() throws Exception {
        SecureRandom r = SecureRandom.getInstance("SHA1PRNG");
        r.setSeed(GRAINE);
        return r;
    }

    @Test
    void milleGeneresRespectentLaRegleEtSontTousDifferents() throws Exception {
        SecureRandom alea = graine();
        Set<String> vus = new HashSet<>();
        int[] parSymbole = new int[SYMBOLES_ADMIS.length()];
        for (int i = 0; i < GENERES; i++) {
            String m = MotDePasseBase.generer(alea);
            assertEquals(24, m.length(), "n° " + i);
            assertTrue(reference(m), "n° " + i + " hors de la règle de référence");
            assertNull(MotDePasseBase.valider(m, m), "n° " + i + " refusé par valider");
            for (char c : INTERDITS.toCharArray()) {
                assertTrue(m.indexOf(c) < 0, "n° " + i + " contient un caractère interdit");
            }
            assertTrue(vus.add(m), "n° " + i + " déjà tiré");
            /* porte sans surprise dans les deux ordres qui le transportent */
            String ordre = MotDePasseBase.ordreAlterUser("prestige", "localhost", m);
            assertEquals("ALTER USER 'prestige'@'localhost' IDENTIFIED BY '" + m + "'", ordre);
            List<String> set = ApplicationPayara.motDePassePool("laborex_pool", m);
            assertEquals("resources.jdbc-connection-pool.laborex_pool.property.password=" + m, set.get(1));
            for (char c : m.toCharArray()) {
                int k = SYMBOLES_ADMIS.indexOf(c);
                if (k >= 0) {
                    parSymbole[k]++;
                }
            }
        }
        assertEquals(GENERES, vus.size());
        for (int k = 0; k < parSymbole.length; k++) {
            assertTrue(parSymbole[k] > 0, "symbole jamais tiré : " + SYMBOLES_ADMIS.charAt(k));
        }
    }

    @Test
    void deuxTiragesAvecLaMemeGraineDonnentLaMemeSerie() throws Exception {
        SecureRandom a = graine(), b = graine();
        for (int i = 0; i < 100; i++) {
            assertEquals(MotDePasseBase.generer(a), MotDePasseBase.generer(b), "n° " + i);
        }
    }

    @Test
    void verdictDeValiderIdentiqueALaRegleSurDesSaisiesAuHasard() {
        Random alea = new Random(GRAINE);
        String tout = LETTRES + CHIFFRES + SYMBOLES_ADMIS + INTERDITS;
        int acceptes = 0, refuses = 0;
        for (int i = 0; i < SAISIES; i++) {
            /* longueurs variees autour des bornes, alphabet admis en majorite pour que des saisies passent */
            int n = alea.nextInt(5) == 0 ? alea.nextInt(14) : 10 + alea.nextInt(16);
            StringBuilder sb = new StringBuilder();
            boolean propre = alea.nextInt(3) != 0;
            for (int j = 0; j < n; j++) {
                String source = propre ? LETTRES + CHIFFRES + SYMBOLES_ADMIS : tout;
                sb.append(source.charAt(alea.nextInt(source.length())));
            }
            String m = sb.toString();
            boolean attendu = reference(m);
            String verdict = MotDePasseBase.valider(m, m);
            assertEquals(attendu, verdict == null, "n° " + i + " verdict « " + verdict + " » pour une saisie de " + n
                    + " caractères (" + (propre ? "alphabet admis" : "alphabet mêlé") + ")");
            if (attendu) {
                acceptes++;
                assertEquals(verdict, null);
                assertTrue(MotDePasseBase.valeurAdmise(m));
                /* la confirmation differente est toujours refusee, et le message ne cite pas la valeur */
                String c = MotDePasseBase.valider(m, m + "x");
                assertNotNull(c);
                assertFalse(c.contains(m));
            } else {
                refuses++;
                /*
                 * une saisie d'un ou deux caracteres peut figurer par hasard dans le texte du message ("12 caractères")
                 */
                assertFalse(m.length() >= 4 && verdict.contains(m), "n° " + i + " : la valeur figure dans le message");
            }
        }
        assertTrue(acceptes > 1000, "trop peu d'acceptés : " + acceptes);
        assertTrue(refuses > 1000, "trop peu de refusés : " + refuses);
    }

    @Test
    void casAuxBornes() {
        assertNull(MotDePasseBase.valider("Abcdefghij1#", "Abcdefghij1#"), "12 caractères exactement");
        assertNotNull(MotDePasseBase.valider("Abcdefghi1#", "Abcdefghi1#"), "11 caractères");
        String long120 = "A1#" + "x".repeat(117), long121 = long120 + "x";
        assertNull(MotDePasseBase.valider(long120, long120));
        assertNotNull(MotDePasseBase.valider(long121, long121));
        assertNotNull(MotDePasseBase.valider(null, null));
        assertNotNull(MotDePasseBase.valider("Abcdefghij1#", null));
    }
}
