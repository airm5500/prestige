package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import dal.JdbConnexion;
import rest.service.impl.sauvegarde.PoolMariaDb;

/**
 * COHERENCE (regle de test du 05/11) : milliers de cas tires au hasard avec une graine fixe, sur les regles du lot 4.A
 * qui ne dependent d'aucun ecran :
 * <ul>
 * <li>aller-retour du fichier d'options : ce que {@link PoolMariaDb#options()} ecrit, {@link PoolMariaDb#depuisOptions}
 * le relit a l'identique (utilisateur, mot de passe, hote, port), quels que soient les caracteres du mot de passe
 * (guillemets, antislash, #, ;, espaces, =, accents, caracteres hors ASCII) ;</li>
 * <li>chiffrement : {@link IdentifiantsBaseService#chiffrer} ne laisse aucun caractere du clair dans le fichier, et le
 * dechiffrement rend exactement le clair ; un bloc modifie d'un octet ne se dechiffre pas ;</li>
 * <li>journal : {@link JdbConnexion#filtrer} ne laisse jamais passer le mot de passe ni l'URL, ou que le mot de passe
 * soit dans le message.</li>
 * </ul>
 * Jeu varie : longueurs de 1 a 64, alphabet complet, ports de 1 a 65535, mots de passe vides exclus (refuses par
 * {@link IdentifiantsBaseService#lire}).
 */
class IdentifiantsBaseCoherenceTest {

    static final long GRAINE = 20261105L;
    static final int CAS = 5000;
    /** Alphabet : ASCII imprimable complet (dont " \ # ; = espace), accents et symboles hors ASCII. */
    static final String ALPHABET = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"
            + "éèàçùâêîôûëïüÉÈÀÇ€£§µ°ñß";

    static String motAleatoire(Random r, int min, int max) {
        int n = min + r.nextInt(max - min + 1);
        StringBuilder b = new StringBuilder(n);
        for (int i = 0; i < n; i++) {
            b.append(ALPHABET.charAt(r.nextInt(ALPHABET.length())));
        }
        return b.toString();
    }

    static PoolMariaDb poolAleatoire(Random r) {
        PoolMariaDb p = PoolMariaDb.depuisOptions("[client]\n");
        p.utilisateur = "u" + motAleatoire(r, 0, 20).replaceAll("[\\s\"\\\\]", "_");
        p.motDePasse = motAleatoire(r, 1, 64);
        p.hote = r.nextBoolean() ? "localhost"
                : (r.nextInt(256) + "." + r.nextInt(256) + "." + r.nextInt(256) + "." + r.nextInt(256));
        p.port = 1 + r.nextInt(65535);
        p.base = "";
        return p;
    }

    @Test
    void allerRetourDuFichierDOptionsSurDesMilliersDeMotsDePasse() {
        Random r = new Random(GRAINE);
        int guillemets = 0, antislash = 0, diese = 0, nonAscii = 0;
        for (int i = 0; i < CAS; i++) {
            PoolMariaDb p = poolAleatoire(r);
            String texte = p.options();
            PoolMariaDb lu = PoolMariaDb.depuisOptions(texte);
            String cas = "cas " + i + " (mot de passe de " + p.motDePasse.length() + " caractères)";
            assertEquals(p.utilisateur, lu.utilisateur, cas);
            assertEquals(p.motDePasse, lu.motDePasse, cas);
            assertEquals(p.hote, lu.hote, cas);
            assertEquals(p.port, lu.port, cas);
            assertTrue(texte.startsWith("[client]\n") && texte.endsWith("\n"), cas);
            /*
             * une ligne par cle : un mot de passe avec un retour a la ligne est impossible (alphabet), rien ne deborde
             */
            assertEquals(5, texte.split("\n").length, cas);
            if (p.motDePasse.contains("\"")) {
                guillemets++;
            }
            if (p.motDePasse.contains("\\")) {
                antislash++;
            }
            if (p.motDePasse.contains("#") || p.motDePasse.contains(";")) {
                diese++;
            }
            if (!StandardCharsets.US_ASCII.newEncoder().canEncode(p.motDePasse)) {
                nonAscii++;
            }
        }
        /* le jeu est bien varie : chaque famille de caracteres delicats est representee par centaines */
        assertTrue(guillemets > 300 && antislash > 300 && diese > 500 && nonAscii > 1000,
                guillemets + " / " + antislash + " / " + diese + " / " + nonAscii);
        System.out.println("options : " + CAS + " cas, guillemets " + guillemets + ", antislash " + antislash
                + ", # ou ; " + diese + ", hors ASCII " + nonAscii);
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void chiffrementDpapiSurDesMilliersDeCas() throws Exception {
        Random r = new Random(GRAINE + 1);
        Path f = Files.createTempFile("essai-coherence", ".cnf");
        int surFichier = 0;
        try {
            for (int i = 0; i < CAS; i++) {
                PoolMariaDb p = poolAleatoire(r);
                String clair = p.options();
                String chiffre = IdentifiantsBaseService.chiffrer(clair);
                String cas = "cas " + i;
                assertTrue(chiffre.startsWith(IdentifiantsBaseService.ENTETE + "\r\n"), cas);
                /*
                 * rien du clair : ni le mot de passe, ni l'utilisateur (des que 8 caracteres : plus court, une
                 * coincidence dans le base64 est possible), ni l'entete [client]
                 */
                String bloc = chiffre.substring(IdentifiantsBaseService.ENTETE.length());
                assertFalse((p.motDePasse.length() >= 8 && bloc.contains(p.motDePasse))
                        || (p.utilisateur.length() >= 8 && bloc.contains(p.utilisateur)) || bloc.contains("[client]")
                        || bloc.contains("password"), cas);
                assertTrue(bloc.trim().matches("[A-Za-z0-9+/=]+"), cas + " : base64 seul");
                assertEquals(clair, IdentifiantsBaseService.dechiffrer(chiffre, f), cas);
                /* un cas sur vingt passe par le fichier et par lire() : mot de passe retrouve a l'identique */
                if (i % 20 == 0) {
                    Files.write(f, chiffre.getBytes(StandardCharsets.UTF_8));
                    PoolMariaDb lu = IdentifiantsBaseService.lire(f);
                    assertEquals(p.motDePasse, lu.motDePasse, cas);
                    assertEquals(p.utilisateur, lu.utilisateur, cas);
                    assertEquals(p.port, lu.port, cas);
                    surFichier++;
                }
                /* un octet du bloc change : plus dechiffrable, et le message ne contient rien du clair */
                if (i % 50 == 0) {
                    byte[] b = java.util.Base64.getDecoder().decode(bloc.trim());
                    b[b.length / 2] ^= 0x5A;
                    String abime = IdentifiantsBaseService.ENTETE + "\r\n"
                            + java.util.Base64.getEncoder().encodeToString(b) + "\r\n";
                    try {
                        IdentifiantsBaseService.dechiffrer(abime, f);
                        throw new AssertionError(cas + " : un bloc abîmé a été déchiffré");
                    } catch (IllegalStateException e) {
                        assertFalse(e.getMessage().contains(p.motDePasse), cas);
                    }
                }
            }
        } finally {
            Files.deleteIfExists(f);
        }
        System.out.println("DPAPI : " + CAS + " cas chiffrés et relus, dont " + surFichier + " par le fichier, "
                + (CAS / 50) + " blocs abîmés refusés");
    }

    @Test
    void journalSansMotDePasseSurDesMilliersDeCas() {
        Random r = new Random(GRAINE + 2);
        String[] gabarits = { "No suitable driver found for %u", "Access denied for user 'x' (using password: %p)",
                "Could not connect: %u (%p)", "%p", "", "rien", "password=%p&x=1 %u", "URL %u refusée, mdp=%p" };
        for (int i = 0; i < CAS; i++) {
            /* 8 a 40 caracteres, sans & ni espace (interdits dans une URL JDBC), pas uniquement des * (le masque) */
            String mdp = motAleatoire(r, 8, 40).replace("&", "").replace(" ", "");
            if (mdp.replace("*", "").length() < 8) {
                mdp = mdp + "x8";
            }
            String url = "jdbc:mysql://h" + r.nextInt(100) + "/b?user=u&password=" + mdp;
            String message = gabarits[r.nextInt(gabarits.length)].replace("%u", url).replace("%p", mdp);
            String filtre = JdbConnexion.filtrer(message, mdp, url);
            String cas = "cas " + i + " : " + message.replace(mdp, "<mdp>").replace(url, "<url>");
            assertFalse(filtre.contains(mdp), cas);
            assertFalse(filtre.contains(url), cas);
            assertFalse(filtre.matches("(?s).*password=(?!\\*\\*\\*).*"), cas);
        }
        System.out.println("journal : " + CAS + " messages filtrés, aucun mot de passe ni URL");
    }
}
