package rest.service.impl.serveur;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** Lancement d'asadmin du Payara en cours (sans entree : aucune question possible). */
public final class Asadmin {

    public static final boolean WINDOWS = System.getProperty("os.name", "").toLowerCase(java.util.Locale.ROOT)
            .contains("win");

    private Asadmin() {
    }

    /** Chemin d'asadmin de l'installation en cours ; null hors Payara ou si le fichier manque. */
    public static String chemin() {
        String r = System.getProperty("com.sun.aas.installRoot");
        if (r == null) {
            return null;
        }
        Path p = Paths.get(r, "bin", WINDOWS ? "asadmin.bat" : "asadmin");
        return Files.isRegularFile(p) ? p.toAbsolutePath().toString() : null;
    }

    /**
     * Debut de la ligne de commande d'asadmin : le client Java (modules/admin-cli.jar) lance avec la JVM du serveur,
     * pour que les arguments arrivent tels quels (asadmin.bat passe par cmd.exe, qui interprete % ! ^ &amp; | &lt;
     * &gt;) ; sinon asadmin(.bat).
     */
    public static List<String> lanceur() {
        String r = System.getProperty("com.sun.aas.installRoot");
        if (r != null) {
            Path jar = Paths.get(r, "modules", "admin-cli.jar");
            Path java = Paths.get(System.getProperty("java.home"), "bin", WINDOWS ? "java.exe" : "java");
            if (Files.isRegularFile(jar) && Files.isRegularFile(java)) {
                return Arrays.asList(java.toString(), "-jar", jar.toString());
            }
        }
        String asadmin = chemin();
        if (asadmin == null) {
            throw new IllegalStateException("asadmin introuvable sur ce poste.");
        }
        return Arrays.asList(asadmin);
    }

    /** Lance un programme sans entree, {code, sortie} ; code -1 si le delai est depasse. */
    public static Object[] executer(List<String> commande, int secondes) throws Exception {
        Path sortie = Files.createTempFile("prestige-asadmin", ".txt");
        try {
            Process p = new ProcessBuilder(commande).redirectErrorStream(true)
                    .redirectInput(ProcessBuilder.Redirect.from(new File(WINDOWS ? "NUL" : "/dev/null")))
                    .redirectOutput(sortie.toFile()).start();
            boolean fini = p.waitFor(secondes, TimeUnit.SECONDS);
            if (!fini) {
                p.destroyForcibly();
            }
            return new Object[] { fini ? p.exitValue() : -1,
                    new String(Files.readAllBytes(sortie), StandardCharsets.ISO_8859_1) };
        } finally {
            Files.deleteIfExists(sortie);
        }
    }

    /**
     * asadmin --interactive=false --port N sous-commande arguments... ; IllegalStateException (sortie resumee, sans
     * valeur de mot de passe) si le code de retour n'est pas 0.
     */
    public static String commande(int portAdmin, int secondes, String... arguments) throws Exception {
        List<String> c = new ArrayList<>(lanceur());
        c.addAll(Arrays.asList("--interactive=false", "--port", String.valueOf(portAdmin)));
        c.addAll(Arrays.asList(arguments));
        Object[] r = executer(c, secondes);
        if ((Integer) r[0] != 0) {
            String nom = arguments[0];
            for (int i = 0; i < arguments.length; i++) {
                if (!arguments[i].startsWith("--") && (i == 0 || !"--passwordfile".equals(arguments[i - 1]))) {
                    nom = arguments[i];
                    break;
                }
            }
            throw new IllegalStateException("asadmin " + nom + " : " + resume((String) r[1]));
        }
        return (String) r[1];
    }

    /** Sortie d'asadmin resumee, sans valeur de mot de passe (« set a.password=b » renvoie la ligne : masquee). */
    public static String resume(String sortie) {
        String s = sortie == null ? "" : sortie.trim().replaceAll("(?im)^(\\S*password)=.*$", "$1=***")
                .replaceAll("(?i)password=[^\\s]+", "password=***");
        return s.length() > 300 ? s.substring(0, 300) + "…" : s;
    }
}
