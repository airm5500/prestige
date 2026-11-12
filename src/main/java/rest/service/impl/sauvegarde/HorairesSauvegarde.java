package rest.service.impl.sauvegarde;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;

/**
 * Horaires de la sauvegarde automatique (retour du 12/11 : « je dois pouvoir definir les horaires plutot que chaque
 * heure »). Texte du parametre KEY_SAUVEGARDE_HORAIRES : vide = toutes les heures a hh:05 (comportement d'avant) ;
 * sinon une liste d'heures « 12:00, 20:00 » (ou « 12h, 20h30 », « 12 ») a la minute pres, par pas de 5 minutes, car le
 * planificateur passe toutes les 5 minutes.
 */
public final class HorairesSauvegarde {

    public static final int PAS_MINUTES = 5;
    /** Minute des sauvegardes horaires quand aucun horaire n'est donne (comportement d'avant le 12/11). */
    public static final int MINUTE_HORAIRE = 5;
    private static final Pattern HEURE = Pattern.compile("^(\\d{1,2})(?:\\s*[:hH]\\s*(\\d{1,2})?)?$");

    private final List<LocalTime> heures;

    private HorairesSauvegarde(List<LocalTime> heures) {
        this.heures = heures;
    }

    /** Toutes les heures a hh:05. */
    public static HorairesSauvegarde horaire() {
        return new HorairesSauvegarde(Collections.emptyList());
    }

    /**
     * Lit le parametre ; une valeur illisible garde la sauvegarde toutes les heures (jamais aucune sauvegarde par
     * erreur de saisie : l'ecran refuse deja ces valeurs, voir {@link #erreur(String)}).
     */
    public static HorairesSauvegarde lire(String texte) {
        if (erreur(texte) != null) {
            return horaire();
        }
        return new HorairesSauvegarde(heures(texte));
    }

    /** Message d'erreur pour l'ecran, ou null si le texte est valable (vide compris). */
    public static String erreur(String texte) {
        if (StringUtils.isBlank(texte)) {
            return null;
        }
        for (String morceau : morceaux(texte)) {
            Matcher m = HEURE.matcher(morceau);
            if (!m.matches()) {
                return "Horaire illisible : « " + morceau + " ». Écrivez par exemple 12:00, 20:00.";
            }
            int h = Integer.parseInt(m.group(1));
            int mn = m.group(2) == null ? 0 : Integer.parseInt(m.group(2));
            if (h > 23 || mn > 59) {
                return "Horaire impossible : « " + morceau + " ».";
            }
            if (mn % PAS_MINUTES != 0) {
                return "Horaire « " + morceau + " » : choisissez une minute multiple de " + PAS_MINUTES
                        + " (00, 05, 10…).";
            }
        }
        return null;
    }

    private static List<String> morceaux(String texte) {
        List<String> l = new ArrayList<>();
        for (String s : texte.trim().replaceAll("\\s*([:hH])\\s*", "$1").split("[,;\\s]+")) {
            if (StringUtils.isNotBlank(s)) {
                l.add(s.trim());
            }
        }
        return l;
    }

    private static List<LocalTime> heures(String texte) {
        TreeSet<LocalTime> t = new TreeSet<>();
        if (StringUtils.isNotBlank(texte)) {
            for (String morceau : morceaux(texte)) {
                Matcher m = HEURE.matcher(morceau);
                if (m.matches()) {
                    t.add(LocalTime.of(Integer.parseInt(m.group(1)),
                            m.group(2) == null ? 0 : Integer.parseInt(m.group(2))));
                }
            }
        }
        return Collections.unmodifiableList(new ArrayList<>(t));
    }

    public boolean toutesLesHeures() {
        return heures.isEmpty();
    }

    public List<LocalTime> heures() {
        return heures;
    }

    /** Texte rangé pour le parametre et l'ecran : vide (toutes les heures) ou « 12:00, 20:00 ». */
    public String texte() {
        return heures.stream().map(HorairesSauvegarde::hhmm).collect(Collectors.joining(", "));
    }

    /** Phrase pour l'ecran. */
    public String libelle() {
        return toutesLesHeures() ? "toutes les heures (à hh:05)" : "à " + texte().replace(", ", ", à ");
    }

    private static String hhmm(LocalTime t) {
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    /** Le passage du planificateur a l'instant donne doit-il lancer une sauvegarde ? (pas de 5 minutes) */
    public boolean estDue(LocalDateTime passage) {
        LocalTime t = creneau(passage).toLocalTime();
        if (toutesLesHeures()) {
            return t.getMinute() == MINUTE_HORAIRE;
        }
        return heures.contains(t);
    }

    /** Debut du creneau de 5 minutes qui contient l'instant. */
    static LocalDateTime creneau(LocalDateTime t) {
        return t.withSecond(0).withNano(0).withMinute(t.getMinute() - t.getMinute() % PAS_MINUTES);
    }

    /** Derniere sauvegarde prevue a l'instant donne ou avant. */
    public LocalDateTime precedente(LocalDateTime t) {
        if (toutesLesHeures()) {
            LocalDateTime h = t.withMinute(MINUTE_HORAIRE).withSecond(0).withNano(0);
            return h.isAfter(t) ? h.minusHours(1) : h;
        }
        for (int jour = 0; jour <= 1; jour++) {
            LocalDateTime base = t.toLocalDate().minusDays(jour).atStartOfDay();
            for (int i = heures.size() - 1; i >= 0; i--) {
                LocalDateTime c = base.with(heures.get(i));
                if (!c.isAfter(t)) {
                    return c;
                }
            }
        }
        throw new IllegalStateException("aucun horaire");
    }

    /**
     * Sauvegarde qui doit avoir reussi a l'instant donne : la derniere prevue une heure au moins avant (le temps de la
     * faire). Toutes les heures : a 14:20, celle de 13:05 ; a 12:00 et 20:00 : a 21:30, celle de 20:00, a 20:30, celle
     * de 12:00.
     */
    public LocalDateTime attendue(LocalDateTime maintenant) {
        return precedente(maintenant.minusHours(1));
    }

    /** Prochaine sauvegarde prevue strictement apres l'instant donne. */
    public LocalDateTime suivante(LocalDateTime t) {
        if (toutesLesHeures()) {
            LocalDateTime h = t.withMinute(MINUTE_HORAIRE).withSecond(0).withNano(0);
            return h.isAfter(t) ? h : h.plusHours(1);
        }
        for (int jour = 0; jour <= 1; jour++) {
            LocalDateTime base = t.toLocalDate().plusDays(jour).atStartOfDay();
            for (LocalTime h : heures) {
                LocalDateTime c = base.with(h);
                if (c.isAfter(t)) {
                    return c;
                }
            }
        }
        throw new IllegalStateException("aucun horaire");
    }
}
