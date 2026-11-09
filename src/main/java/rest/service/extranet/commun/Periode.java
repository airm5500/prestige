package rest.service.extranet.commun;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

/**
 * Periode de lecture choisie a l'ecran (demande du 08/11 : le jour par defaut, pour ne pas relire tout l'historique).
 * Dates au format AAAA-MM-JJ ; absentes toutes les deux : pas de periode (lecture habituelle). Une periode couvre au
 * plus un an et ne commence pas apres sa fin.
 */
public final class Periode {

    /** Un an, annee bissextile comprise. */
    public static final int JOURS_MAX = 366;

    public final LocalDate du;
    public final LocalDate au;

    private Periode(LocalDate du, LocalDate au) {
        this.du = du;
        this.au = au;
    }

    /**
     * @return null si les deux dates sont vides (pas de periode)
     *
     * @throws IllegalArgumentException
     *             date illisible, une seule date, du apres au, plus d'un an
     */
    public static Periode lire(String du, String au) {
        boolean sansDu = du == null || du.trim().isEmpty(), sansAu = au == null || au.trim().isEmpty();
        if (sansDu && sansAu) {
            return null;
        }
        if (sansDu || sansAu) {
            throw new IllegalArgumentException("Indiquez les deux dates de la période");
        }
        LocalDate d, a;
        try {
            d = LocalDate.parse(du.trim());
            a = LocalDate.parse(au.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Date de période illisible (AAAA-MM-JJ attendu)");
        }
        if (d.isAfter(a)) {
            throw new IllegalArgumentException("La période commence après sa fin");
        }
        if (ChronoUnit.DAYS.between(d, a) >= JOURS_MAX) {
            throw new IllegalArgumentException("La période ne peut pas dépasser un an");
        }
        return new Periode(d, a);
    }

    /** Texte garde dans le journal des collectes, relu par l'ecran. */
    public String parametres() {
        return "du=" + du + ";au=" + au;
    }
}
