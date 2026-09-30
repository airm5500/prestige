package rest.service.impl;

import java.time.LocalDate;

/**
 * Regles des RENOUVELLEMENTS d'ordonnance (retour du 30/09), sans base de donnees pour etre verifiables une a une.
 *
 * <p>
 * L'ordonnance d'origine porte le nombre de renouvellements autorises et leur periodicite. Chaque renouvellement est
 * une nouvelle ordonnance liee a l'origine, avec son rang. L'echeance du renouvellement suivant se compte depuis la
 * DERNIERE delivrance de la chaine (origine ou dernier renouvellement), pas depuis l'origine : un renouvellement servi
 * en retard decale les suivants, comme au comptoir.
 */
public final class RenouvellementOrdonnance {

    public static final int MAX_RENOUVELLEMENTS = 12;
    public static final int MAX_PERIODICITE = 365;
    /** Periodicite proposee par defaut : un traitement mensuel. */
    public static final int PERIODICITE_DEFAUT = 30;
    /** L'historique signale « a renouveler » les echeances des N prochains jours. */
    public static final int FENETRE_A_RENOUVELER = 7;

    private RenouvellementOrdonnance() {
    }

    /** Le motif du refus, ou null si la saisie est valable. Periodicite obligatoire des qu'il y a un renouvellement. */
    public static String valider(int renouvellements, Integer periodicite) {
        if (renouvellements < 0 || renouvellements > MAX_RENOUVELLEMENTS) {
            return "Le nombre de renouvellements va de 0 à " + MAX_RENOUVELLEMENTS + ".";
        }
        if (renouvellements > 0 && (periodicite == null || periodicite < 1 || periodicite > MAX_PERIODICITE)) {
            return "Indiquez tous les combien de jours l'ordonnance se renouvelle (1 à " + MAX_PERIODICITE + ").";
        }
        return null;
    }

    /** Date du renouvellement suivant, ou null s'il n'en reste pas. */
    public static LocalDate prochaine(int autorises, int faits, LocalDate derniereDelivrance, Integer periodicite) {
        if (autorises <= faits || derniereDelivrance == null || periodicite == null || periodicite <= 0) {
            return null;
        }
        return derniereDelivrance.plusDays(periodicite);
    }

    /** Il reste au moins un renouvellement. */
    public static boolean resteARenouveler(int autorises, int faits) {
        return faits < autorises;
    }

    /** L'echeance est passee ou tombe dans les {@code fenetre} prochains jours. */
    public static boolean aRenouveler(LocalDate prochaine, LocalDate aujourdhui, int fenetre) {
        return prochaine != null && !prochaine.isAfter(aujourdhui.plusDays(fenetre));
    }

    /**
     * Faut-il envoyer le rappel SMS du prochain renouvellement ? Oui si il en reste un, s'il n'a pas deja ete rappele
     * (un rappel par rang, jamais deux), et si l'on est a {@code joursAvant} jours de l'echeance ou apres.
     */
    public static boolean aRappeler(int autorises, int faits, int rangRappele, LocalDate prochaine,
            LocalDate aujourdhui, int joursAvant) {
        if (!resteARenouveler(autorises, faits) || prochaine == null) {
            return false;
        }
        int rangSuivant = faits + 1;
        return rangRappele < rangSuivant && !aujourdhui.isBefore(prochaine.minusDays(Math.max(0, joursAvant)));
    }

    /** « Renouvellement 1/2 », ou « Renouvelable 2 fois » sur l'origine. */
    public static String libelle(int rang, int autorises, int faits) {
        if (rang > 0) {
            return "Renouvellement " + rang + "/" + autorises;
        }
        if (autorises <= 0) {
            return "";
        }
        return faits + "/" + autorises + " renouvellement(s) fait(s)";
    }
}
