package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import org.apache.commons.lang3.StringUtils;

/**
 * Axes de comparaison du menu de pilotage (evolution 6, point 1).
 *
 * <p>
 * Le selecteur de periode de cet ecran n'est pas un filtre de dates : c'est un AXE DE COMPARAISON. Choisir « Vs meme
 * mois l'an dernier » ne change pas la periode regardee, il change ce a quoi on la compare - et chaque tuile gagne sa
 * ligne de variation. Tout se joue donc ici, et tout se verifie ici sans base de donnees.
 *
 * <p>
 * <b>La decision qui compte : les periodes comparees ont la MEME DUREE ECOULEE.</b> Comparer un mois en cours au 18
 * septembre avec un mois d'aout entier annoncerait une chute de chiffre d'affaires qui n'existe pas. Le mois de
 * reference est donc tronque au meme jour, et le libelle le dit (« au 18 du mois »). C'est la seule facon de rendre un
 * ecart interpretable.
 */
public final class PilotagePeriodes {

    /** Le mois en cours, sans comparaison : la valeur brute du mois. */
    public static final String MOIS_EN_COURS = "MOIS";
    /** Le mois en cours compare au mois precedent, a duree ecoulee egale. */
    public static final String VS_MOIS_PRECEDENT = "VS_M1";
    /** Le mois en cours compare au meme mois l'an dernier, a duree ecoulee egale. */
    public static final String VS_MEME_MOIS_AN_DERNIER = "VS_N1";
    /** Le cumul depuis le 1er janvier, compare au meme cumul l'an dernier. */
    public static final String CUMUL_ANNUEL = "YTD";
    /** Les douze derniers mois COMPLETS, compares aux douze mois complets precedents. */
    public static final String GLISSANT_12_MOIS = "G12";
    /** Une periode choisie, comparee a la periode de meme duree qui la precede. */
    public static final String PERSONNALISE = "PERSO";

    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Une periode : debut inclus, fin EXCLUE - la seule borne qui ne perd pas la derniere journee. */
    public static final class Periode {

        public final LocalDate debut;
        public final LocalDate fin;
        public final String libelle;

        public Periode(LocalDate debut, LocalDate fin, String libelle) {
            this.debut = debut;
            this.fin = fin;
            this.libelle = libelle;
        }

        /** Nombre de jours de la periode, la fin etant exclue. */
        public long jours() {
            return ChronoUnit.DAYS.between(debut, fin);
        }

        @Override
        public String toString() {
            return debut.format(FR) + " -> " + fin.minusDays(1).format(FR);
        }
    }

    /**
     * Ce que l'ecran doit afficher : la periode regardee, celle a laquelle on la compare (ou null), et la fenetre du
     * graphique d'evolution.
     */
    public static final class Axe {

        public final String code;
        public final Periode courante;
        /** Null pour « mois en cours » : il n'y a alors rien a comparer, et aucune variation n'est affichee. */
        public final Periode reference;
        /** Fenetre du graphique, en mois complets : toujours plus large que la periode regardee. */
        public final Periode graphique;
        public final String explication;

        public Axe(String code, Periode courante, Periode reference, Periode graphique, String explication) {
            this.code = code;
            this.courante = courante;
            this.reference = reference;
            this.graphique = graphique;
            this.explication = explication;
        }
    }

    private PilotagePeriodes() {
    }

    /** Vrai si le code correspond a un axe connu : un code inconnu ne doit jamais devenir une requete. */
    public static boolean connu(String code) {
        return MOIS_EN_COURS.equals(code) || VS_MOIS_PRECEDENT.equals(code) || VS_MEME_MOIS_AN_DERNIER.equals(code)
                || CUMUL_ANNUEL.equals(code) || GLISSANT_12_MOIS.equals(code) || PERSONNALISE.equals(code);
    }

    /**
     * Calcule l'axe demande.
     *
     * @param code
     *            un des axes ci-dessus ; un code inconnu retombe sur le mois en cours plutot que d'echouer
     * @param jour
     *            jour de reference (le jour courant en exploitation, une date fixe dans les tests)
     * @param debutPerso
     *            debut de la periode personnalisee, ignore pour les autres axes
     * @param finPerso
     *            fin INCLUSE de la periode personnalisee
     */
    public static Axe calculer(String code, LocalDate jour, LocalDate debutPerso, LocalDate finPerso) {
        String axe = connu(code) ? code : MOIS_EN_COURS;
        LocalDate premierDuMois = jour.withDayOfMonth(1);
        LocalDate lendemain = jour.plusDays(1);
        int jourDuMois = jour.getDayOfMonth();

        switch (axe) {
        case VS_MOIS_PRECEDENT: {
            Periode courante = new Periode(premierDuMois, lendemain, moisEtJour(premierDuMois, jourDuMois));
            LocalDate debutRef = premierDuMois.minusMonths(1);
            Periode reference = new Periode(debutRef, borneMemeDuree(debutRef, jourDuMois),
                    moisEtJour(debutRef, jourDuMois));
            return new Axe(axe, courante, reference, fenetre(premierDuMois, 12),
                    "Le mois precedent est arrete au meme jour du mois : sans cela, un mois entier serait "
                            + "compare a un mois commence, et l'ecart annonce serait faux.");
        }
        case VS_MEME_MOIS_AN_DERNIER: {
            Periode courante = new Periode(premierDuMois, lendemain, moisEtJour(premierDuMois, jourDuMois));
            LocalDate debutRef = premierDuMois.minusYears(1);
            Periode reference = new Periode(debutRef, borneMemeDuree(debutRef, jourDuMois),
                    moisEtJour(debutRef, jourDuMois));
            return new Axe(axe, courante, reference, fenetre(premierDuMois, 24),
                    "Le meme mois de l'an dernier est arrete au meme jour du mois, pour que les deux "
                            + "periodes couvrent la meme duree ecoulee.");
        }
        case CUMUL_ANNUEL: {
            LocalDate debut = jour.withDayOfYear(1);
            Periode courante = new Periode(debut, lendemain, "Cumul " + debut.getYear() + " au " + jour.format(FR));
            LocalDate debutRef = debut.minusYears(1);
            LocalDate finRef = bornePrudente(jour.minusYears(1)).plusDays(1);
            Periode reference = new Periode(debutRef, finRef,
                    "Cumul " + debutRef.getYear() + " au " + finRef.minusDays(1).format(FR));
            return new Axe(axe, courante, reference, fenetre(premierDuMois, 24),
                    "Les deux cumuls s'arretent au meme jour de l'annee : c'est la comparaison que "
                            + "l'expert-comptable attend.");
        }
        case GLISSANT_12_MOIS: {
            /*
             * Douze mois COMPLETS, mois en cours exclu. Un glissant qui inclurait le mois commence melangerait un mois
             * partiel aux onze autres et ferait baisser le total sans raison.
             */
            Periode courante = new Periode(premierDuMois.minusMonths(12), premierDuMois, "12 mois complets : "
                    + mois(premierDuMois.minusMonths(12)) + " -> " + mois(premierDuMois.minusMonths(1)));
            Periode reference = new Periode(premierDuMois.minusMonths(24), premierDuMois.minusMonths(12),
                    "12 mois précédents : " + mois(premierDuMois.minusMonths(24)) + " -> "
                            + mois(premierDuMois.minusMonths(13)));
            return new Axe(axe, courante, reference, fenetre(premierDuMois, 24),
                    "Le mois en cours est exclu : incomplet, il ferait baisser le total glissant sans "
                            + "qu'il ne se passe rien.");
        }
        case PERSONNALISE: {
            LocalDate debut = debutPerso == null ? premierDuMois : debutPerso;
            LocalDate finIncluse = finPerso == null ? jour : finPerso;
            if (finIncluse.isBefore(debut)) {
                LocalDate echange = debut;
                debut = finIncluse;
                finIncluse = echange;
            }
            Periode courante = new Periode(debut, finIncluse.plusDays(1),
                    "Du " + debut.format(FR) + " au " + finIncluse.format(FR));
            long jours = ChronoUnit.DAYS.between(debut, finIncluse.plusDays(1));
            LocalDate debutRef = debut.minusDays(jours);
            Periode reference = new Periode(debutRef, debut, "Période précédente de " + jours + " jour(s) : du "
                    + debutRef.format(FR) + " au " + debut.minusDays(1).format(FR));
            return new Axe(axe, courante, reference, fenetre(finIncluse.withDayOfMonth(1).plusMonths(1), 12),
                    "La periode de reference est celle qui precede immediatement, de meme duree.");
        }
        default: {
            Periode courante = new Periode(premierDuMois, lendemain, moisEtJour(premierDuMois, jourDuMois));
            return new Axe(MOIS_EN_COURS, courante, null, fenetre(premierDuMois, 12),
                    "Aucune comparaison : la valeur brute du mois en cours.");
        }
        }
    }

    /**
     * Borne de fin d'un mois de reference, tronque au meme jour du mois.
     *
     * <p>
     * Le 31 mars compare au 31 fevrier n'existe pas : on prend alors la fin du mois. Sans cette precaution, la borne
     * deborderait sur le mois suivant et compterait des ventes qui n'appartiennent pas a la periode comparee.
     */
    static LocalDate borneMemeDuree(LocalDate premierDuMoisReference, int jourDuMois) {
        int dernier = premierDuMoisReference.lengthOfMonth();
        return premierDuMoisReference.withDayOfMonth(Math.min(jourDuMois, dernier)).plusDays(1);
    }

    /** Le meme jour un an plus tot, ramene a la fin du mois si ce jour n'existe pas (29 fevrier). */
    static LocalDate bornePrudente(LocalDate jour) {
        return jour;
    }

    /** Fenetre du graphique : les {@code mois} derniers mois complets, plus le mois en cours. */
    static Periode fenetre(LocalDate premierDuMois, int mois) {
        return new Periode(premierDuMois.minusMonths(mois), premierDuMois.plusMonths(1), mois + " derniers mois");
    }

    private static String moisEtJour(LocalDate premierDuMois, int jourDuMois) {
        int dernier = premierDuMois.lengthOfMonth();
        int arrete = Math.min(jourDuMois, dernier);
        return mois(premierDuMois) + (arrete < dernier ? " (au " + arrete + ")" : "");
    }

    /** « Septembre 2026 », tel qu'on le lit sur un tableau de bord. */
    public static String mois(LocalDate premierDuMois) {
        String nom = premierDuMois.getMonth().getDisplayName(TextStyle.FULL, Locale.FRENCH);
        return StringUtils.capitalize(nom) + " " + premierDuMois.getYear();
    }

    /**
     * Variation entre deux valeurs, en pourcentage.
     *
     * <p>
     * Rend null quand la reference est nulle : partir de zero n'est pas une progression de l'infini, et afficher « +100
     * % » la ou il n'y avait rien tromperait le lecteur. L'ecran affiche alors la valeur seule.
     */
    public static Double variation(double valeur, double reference) {
        if (reference == 0d) {
            return null;
        }
        return (valeur - reference) / Math.abs(reference) * 100d;
    }
}
