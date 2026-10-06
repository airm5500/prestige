package rest.service.impl.rh;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import util.FichierTabulaire;

/**
 * Lecture d'un export de pointeuse selon un MODELE (plan d'octobre, section 3, lot L11b), sans base de donnees : une
 * marque de pointeuse = un modele (colonnes du badge, de la date, de l'heure et du sens ; formats ; valeurs du sens),
 * configure une seule fois. Chaque ligne est retenue ou rejetee avec son motif.
 */
public final class ImportPointeuse {

    private ImportPointeuse() {
    }

    /** Le modele : numeros de colonne a partir de 1 ; 0 = absente (heure dans la colonne de la date, sens inconnu). */
    public static final class Modele {
        public int colBadge = 1;
        public int colDate = 2;
        public int colHeure = 3;
        public int colSens;
        public String formatDate = "dd/MM/yyyy";
        public String formatHeure = "HH:mm";
        public boolean entete = true;
        public Set<String> valeursEntree = new HashSet<>(Arrays.asList("ENTREE", "IN", "E", "0", "C/IN", "CHECKIN"));
        public Set<String> valeursSortie = new HashSet<>(Arrays.asList("SORTIE", "OUT", "S", "1", "C/OUT", "CHECKOUT"));

        public static Set<String> valeurs(String liste) {
            Set<String> s = new HashSet<>();
            for (String v : (liste == null ? "" : liste).split("[,;]")) {
                if (!v.trim().isEmpty()) {
                    s.add(v.trim().toUpperCase(Locale.ROOT));
                }
            }
            return s;
        }
    }

    /** Une ligne lue. */
    public static final class Ligne {
        public final int numero;
        public final String badge;
        public final LocalDateTime horodatage;
        public final String sens;
        public final String erreur;

        Ligne(int numero, String badge, LocalDateTime horodatage, String sens, String erreur) {
            this.numero = numero;
            this.badge = badge;
            this.horodatage = horodatage;
            this.sens = sens;
            this.erreur = erreur;
        }

        public boolean retenue() {
            return erreur == null;
        }
    }

    /** Controle du modele : message ou null. */
    public static String controler(Modele m) {
        if (m.colBadge < 1 || m.colDate < 1) {
            return "Les colonnes du badge et de la date sont obligatoires.";
        }
        try {
            format(m.formatDate);
            if (m.colHeure > 0) {
                format(m.formatHeure);
            }
        } catch (IllegalArgumentException e) {
            return "Format de date ou d'heure invalide (ex. dd/MM/yyyy, HH:mm).";
        }
        return null;
    }

    public static List<Ligne> lire(List<List<String>> lignes, Modele m) {
        List<Ligne> sortie = new ArrayList<>();
        DateTimeFormatter fd = format(m.formatDate);
        DateTimeFormatter fh = m.colHeure > 0 ? format(m.formatHeure) : null;
        for (int i = m.entete ? 1 : 0; i < lignes.size(); i++) {
            List<String> l = lignes.get(i);
            int numero = i + 1;
            String badge = FichierTabulaire.cellule(l, m.colBadge - 1);
            String date = FichierTabulaire.cellule(l, m.colDate - 1);
            if (badge.isEmpty() && date.isEmpty()) {
                continue;
            }
            if (badge.isEmpty()) {
                sortie.add(new Ligne(numero, badge, null, null, "badge absent"));
                continue;
            }
            LocalDateTime t;
            try {
                t = horodatage(date, fh == null ? null : FichierTabulaire.cellule(l, m.colHeure - 1), fd, fh);
            } catch (DateTimeParseException | IllegalArgumentException e) {
                sortie.add(new Ligne(numero, badge, null, null, "date ou heure illisible (« " + date
                        + (fh == null ? "" : " " + FichierTabulaire.cellule(l, m.colHeure - 1)) + " »)"));
                continue;
            }
            String sens = AnalysePresence.INCONNU;
            if (m.colSens > 0) {
                String v = FichierTabulaire.cellule(l, m.colSens - 1).toUpperCase(Locale.ROOT);
                sens = m.valeursEntree.contains(v) ? AnalysePresence.ENTREE
                        : m.valeursSortie.contains(v) ? AnalysePresence.SORTIE : AnalysePresence.INCONNU;
            }
            sortie.add(new Ligne(numero, badge, t, sens, null));
        }
        return sortie;
    }

    /** Lecture STRICTE : un 31/02 est une erreur, pas un 28/02 ; « yyyy » est lu comme l'annee. */
    static DateTimeFormatter format(String motif) {
        return DateTimeFormatter.ofPattern(motif.replace("yyyy", "uuuu").replace("yy", "uu"))
                .withResolverStyle(java.time.format.ResolverStyle.STRICT);
    }

    /** Date (et heure) ; accepte aussi un nombre de classeur (jours depuis le 30/12/1899, fraction = heure). */
    static LocalDateTime horodatage(String date, String heure, DateTimeFormatter fd, DateTimeFormatter fh) {
        if (date.matches("\\d+([.,]\\d+)?")) {
            double v = Double.parseDouble(date.replace(',', '.'));
            LocalDateTime t = LocalDate.of(1899, 12, 30).atStartOfDay().plusSeconds(Math.round(v * 86400));
            if (fh != null && !heure.isEmpty()) {
                return t.toLocalDate().atTime(heureDe(heure, fh));
            }
            return t;
        }
        if (fh == null) {
            try {
                return LocalDateTime.parse(date, fd);
            } catch (DateTimeParseException e) {
                return LocalDate.parse(date, fd).atStartOfDay();
            }
        }
        return LocalDate.parse(date, fd).atTime(heureDe(heure, fh));
    }

    private static LocalTime heureDe(String heure, DateTimeFormatter fh) {
        if (heure.matches("0?[.,]\\d+")) {
            return LocalTime.ofSecondOfDay(Math.round(Double.parseDouble(heure.replace(',', '.')) * 86400) % 86400);
        }
        try {
            return LocalTime.parse(heure, fh);
        } catch (DateTimeParseException e) {
            LocalTime t = RegleRh.heure(heure.length() > 5 && heure.charAt(5) == ':' ? heure.substring(0, 5) : heure);
            if (t == null) {
                throw e;
            }
            return t;
        }
    }
}
