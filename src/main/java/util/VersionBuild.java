package util;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Version du build qui tourne sur ce poste : horodatage UTC ecrit par Maven dans prestige-build.properties.
 * <p>
 * Rapport du 26/10 (SC8) : chaque caisse a son propre serveur, et les postes ne sont pas mis a jour en meme temps. Sans
 * la version dans l'evenement, un signalement posterieur a un correctif ne disait pas si le correctif avait echoue ou
 * si le poste tournait encore l'ancien code.
 */
public final class VersionBuild {

    private static volatile String libelle;

    private VersionBuild() {
    }

    /** Version du build (« 2026-10-28 17:09 UTC »), ou chaine vide si elle est inconnue. Ne leve jamais. */
    public static String libelle() {
        if (libelle == null) {
            try (InputStream in = VersionBuild.class.getClassLoader()
                    .getResourceAsStream("prestige-build.properties")) {
                libelle = lire(in);
            } catch (IOException | RuntimeException e) {
                libelle = "";
            }
        }
        return libelle;
    }

    /** Valeur lue dans le fichier ; vide s'il manque ou s'il n'a pas ete rempli par Maven. */
    static String lire(InputStream in) throws IOException {
        if (in == null) {
            return "";
        }
        Properties p = new Properties();
        p.load(in);
        String build = p.getProperty("build", "").trim();
        return build.isEmpty() || build.contains("${") ? "" : build + " UTC";
    }
}
