package rest.service.impl.sauvegarde;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Noms des fichiers de sauvegarde et conservation : toutes les sauvegardes des dernieres heures, puis la plus recente
 * de chaque jour, puis plus rien. Seuls les fichiers nommes par Prestige pour cette base sont concernes (en clair
 * .sql.gz, ou chiffres .sql.gz.aes depuis le lot 4.C) : un autre fichier du dossier n'est jamais retire.
 */
public final class Conservation {

    private static final DateTimeFormatter HORODATAGE = DateTimeFormatter.ofPattern("yyyyMMdd_HHmm");

    private Conservation() {
    }

    public static String nom(String base, LocalDateTime quand) {
        return "prestige_" + base + "_" + HORODATAGE.format(quand) + ".sql.gz";
    }

    /** Date d'une sauvegarde de cette base d'apres son nom ; null pour tout autre fichier. */
    public static LocalDateTime date(String base, String fichier) {
        Matcher m = Pattern.compile("prestige_" + Pattern.quote(base) + "_(\\d{8}_\\d{4})\\.sql\\.gz(\\.aes)?")
                .matcher(fichier);
        if (!m.matches()) {
            return null;
        }
        try {
            return LocalDateTime.parse(m.group(1), HORODATAGE);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Fichiers a retirer parmi ceux du dossier.
     *
     * @param garderHeures
     *            toutes les sauvegardes plus recentes sont gardees
     * @param garderJours
     *            au-dela, la plus recente de chaque jour est gardee jusqu'a ce nombre de jours
     */
    public static List<String> aRetirer(String base, Collection<String> fichiers, LocalDateTime maintenant,
            int garderHeures, int garderJours) {
        LocalDateTime limiteHeures = maintenant.minusHours(Math.max(1, garderHeures));
        LocalDate limiteJours = maintenant.toLocalDate().minusDays(Math.max(0, garderJours));
        Map<LocalDate, String> plusRecenteDuJour = new HashMap<>();
        for (String f : fichiers) {
            LocalDateTime d = date(base, f);
            if (d != null) {
                String deja = plusRecenteDuJour.get(d.toLocalDate());
                if (deja == null || date(base, deja).isBefore(d)) {
                    plusRecenteDuJour.put(d.toLocalDate(), f);
                }
            }
        }
        List<String> retirer = new ArrayList<>();
        for (String f : fichiers) {
            LocalDateTime d = date(base, f);
            if (d == null || !d.isBefore(limiteHeures)) {
                continue;
            }
            boolean gardeDuJour = f.equals(plusRecenteDuJour.get(d.toLocalDate()))
                    && !d.toLocalDate().isBefore(limiteJours);
            if (!gardeDuJour) {
                retirer.add(f);
            }
        }
        return retirer;
    }
}
