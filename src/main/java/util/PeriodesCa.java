package util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Decoupage en tranches de la comparaison du chiffre d'affaires (point 3) : « 3 dernieres semaines », « 3 derniers mois
 * », « 6 derniers mois », « 3 dernieres annees » ou periode libre. Chaque tranche porte une cle qui est celle produite
 * par MySQL avec l'expression {@link Granularite#expressionSql(String)}, ce qui permet de ventiler le SQL en Java sans
 * deuxieme requete.
 *
 * <p>
 * Regles : la tranche en cours est bornee a aujourd'hui ; en periode libre la granularite depend de la longueur (jour
 * jusqu'a 31 jours, semaine jusqu'a 26 semaines, mois jusqu'a 3 ans, annee au-dela) ; les bornes inversees sont remises
 * dans l'ordre. Classe sans dependance, testee unitairement.
 */
public final class PeriodesCa {

    public enum Type {
        TROIS_SEMAINES, TROIS_MOIS, SIX_MOIS, TROIS_ANS, LIBRE;

        /** Lecture tolerante du parametre HTTP ; defaut : 3 derniers mois. */
        public static Type de(String valeur) {
            if (valeur == null) {
                return TROIS_MOIS;
            }
            try {
                return Type.valueOf(valeur.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                return TROIS_MOIS;
            }
        }
    }

    public enum Granularite {
        JOUR("%Y-%m-%d"), SEMAINE("%x-W%v"), MOIS("%Y-%m"), ANNEE("%Y");

        private final String formatSql;

        Granularite(String formatSql) {
            this.formatSql = formatSql;
        }

        /** Expression MySQL qui donne la cle de tranche d'une date (%x-W%v = annee et semaine ISO). */
        public String expressionSql(String colonne) {
            return "DATE_FORMAT(" + colonne + ", '" + formatSql + "')";
        }
    }

    /** Une colonne de la comparaison. */
    public static final class Tranche {

        private final String cle;
        private final String libelle;
        private final LocalDate debut;
        private final LocalDate fin;

        Tranche(String cle, String libelle, LocalDate debut, LocalDate fin) {
            this.cle = cle;
            this.libelle = libelle;
            this.debut = debut;
            this.fin = fin;
        }

        public String getCle() {
            return cle;
        }

        public String getLibelle() {
            return libelle;
        }

        public LocalDate getDebut() {
            return debut;
        }

        public LocalDate getFin() {
            return fin;
        }

        @Override
        public String toString() {
            return cle + " " + libelle + " [" + debut + ".." + fin + "]";
        }
    }

    private static final DateTimeFormatter JJ_MM = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter MM_AAAA = DateTimeFormatter.ofPattern("MM/yyyy");

    private PeriodesCa() {
    }

    /** Granularite retenue pour le type demande (la periode libre depend de sa longueur). */
    public static Granularite granularite(Type type, LocalDate debutLibre, LocalDate finLibre) {
        switch (type) {
        case TROIS_SEMAINES:
            return Granularite.SEMAINE;
        case TROIS_MOIS:
        case SIX_MOIS:
            return Granularite.MOIS;
        case TROIS_ANS:
            return Granularite.ANNEE;
        default:
            LocalDate[] bornes = bornesOrdonnees(debutLibre, finLibre);
            long jours = ChronoUnit.DAYS.between(bornes[0], bornes[1]) + 1;
            if (jours <= 31) {
                return Granularite.JOUR;
            }
            if (jours <= 26 * 7) {
                return Granularite.SEMAINE;
            }
            if (jours <= 3 * 366) {
                return Granularite.MOIS;
            }
            return Granularite.ANNEE;
        }
    }

    /** Les tranches, dans l'ordre chronologique, bornees a aujourd'hui. */
    public static List<Tranche> tranches(Type type, LocalDate debutLibre, LocalDate finLibre, LocalDate aujourdhui) {
        LocalDate debut;
        LocalDate fin;
        switch (type) {
        case TROIS_SEMAINES:
            debut = aujourdhui.minusWeeks(2).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            fin = aujourdhui;
            break;
        case TROIS_MOIS:
            debut = aujourdhui.minusMonths(2).withDayOfMonth(1);
            fin = aujourdhui;
            break;
        case SIX_MOIS:
            debut = aujourdhui.minusMonths(5).withDayOfMonth(1);
            fin = aujourdhui;
            break;
        case TROIS_ANS:
            debut = aujourdhui.minusYears(2).withDayOfYear(1);
            fin = aujourdhui;
            break;
        default:
            LocalDate[] bornes = bornesOrdonnees(debutLibre, finLibre);
            debut = bornes[0];
            fin = bornes[1];
            break;
        }
        return decouper(debut, fin, granularite(type, debutLibre, finLibre));
    }

    /** Decoupe [debut, fin] en tranches de la granularite donnee ; la premiere et la derniere sont bornees. */
    public static List<Tranche> decouper(LocalDate debut, LocalDate fin, Granularite granularite) {
        if (debut == null || fin == null) {
            return Collections.emptyList();
        }
        LocalDate[] bornes = bornesOrdonnees(debut, fin);
        List<Tranche> tranches = new ArrayList<>();
        LocalDate curseur = bornes[0];
        while (!curseur.isAfter(bornes[1])) {
            LocalDate finTranche = finNaturelle(curseur, granularite);
            if (finTranche.isAfter(bornes[1])) {
                finTranche = bornes[1];
            }
            tranches.add(new Tranche(cle(curseur, granularite), libelle(curseur, finTranche, granularite), curseur,
                    finTranche));
            curseur = finTranche.plusDays(1);
        }
        return tranches;
    }

    /** Cle Java d'une date, identique a celle que MySQL produit avec {@link Granularite#expressionSql(String)}. */
    public static String cle(LocalDate date, Granularite granularite) {
        switch (granularite) {
        case JOUR:
            return date.toString();
        case SEMAINE:
            return String.format(Locale.ROOT, "%d-W%02d", date.get(IsoFields.WEEK_BASED_YEAR),
                    date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        case MOIS:
            return String.format(Locale.ROOT, "%d-%02d", date.getYear(), date.getMonthValue());
        default:
            return String.valueOf(date.getYear());
        }
    }

    private static String libelle(LocalDate debut, LocalDate fin, Granularite granularite) {
        switch (granularite) {
        case JOUR:
            return debut.format(JJ_MM);
        case SEMAINE:
            return "S" + String.format(Locale.ROOT, "%02d", debut.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)) + " ("
                    + debut.format(JJ_MM) + "-" + fin.format(JJ_MM) + ")";
        case MOIS:
            return debut.format(MM_AAAA);
        default:
            return String.valueOf(debut.getYear());
        }
    }

    private static LocalDate finNaturelle(LocalDate date, Granularite granularite) {
        switch (granularite) {
        case JOUR:
            return date;
        case SEMAINE:
            return date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        case MOIS:
            return date.with(TemporalAdjusters.lastDayOfMonth());
        default:
            return date.with(TemporalAdjusters.lastDayOfYear());
        }
    }

    private static LocalDate[] bornesOrdonnees(LocalDate a, LocalDate b) {
        LocalDate debut = a == null ? (b == null ? LocalDate.now() : b) : a;
        LocalDate fin = b == null ? debut : b;
        return debut.isAfter(fin) ? new LocalDate[] { fin, debut } : new LocalDate[] { debut, fin };
    }
}
