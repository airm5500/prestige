package rest.service.impl.sauvegarde;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Writer;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrait d'une sauvegarde (fichier de mariadb-dump) : l'en-tete (reglages de session) et les tables demandees,
 * structure et donnees, sans leurs declencheurs ; vues, routines et autres tables sont ignorees. Les lignes sont
 * recopiees octet pour octet (lues et ecrites en ISO-8859-1), sans jamais interpreter les donnees.
 */
public final class ExtraitSauvegarde {

    private static final Pattern SECTION = Pattern.compile("^-- (?:(Table structure for table|Dumping data for table)"
            + "|Temporary table structure for view|Final view structure for view|Dumping routines for database"
            + "|Dumping events for database)(?: `([^`]*)`)?");

    private ExtraitSauvegarde() {
    }

    /** Recopie dans {@code sortie} l'en-tete et les tables {@code tables} ; renvoie le nombre de tables recopiees. */
    public static int filtrer(BufferedReader entree, Writer sortie, Set<String> tables) throws IOException {
        boolean enTete = true, garder = true, declencheur = false;
        String derniere = null;
        int nombre = 0;
        String l;
        while ((l = entree.readLine()) != null) {
            if (l.startsWith("-- ")) {
                Matcher m = SECTION.matcher(l);
                if (m.find()) {
                    enTete = false;
                    garder = m.group(1) != null && tables.contains(m.group(2));
                    if (garder && "Table structure for table".equals(m.group(1)) && !m.group(2).equals(derniere)) {
                        derniere = m.group(2);
                        nombre++;
                    }
                }
            }
            if (!enTete && !garder) {
                continue;
            }
            if (l.startsWith("DELIMITER ;;")) {
                declencheur = true;
                continue;
            }
            if (declencheur) {
                if (l.startsWith("DELIMITER ;")) {
                    declencheur = false;
                }
                continue;
            }
            sortie.write(l);
            sortie.write('\n');
        }
        return nombre;
    }
}
