package util;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * Controles de saisie communs aux enregistrements (07/10) : le serveur ne compte pas sur l'ecran. Chaque methode rend
 * le MESSAGE a afficher quand la valeur est refusee, ou null quand elle est acceptable. Une valeur absente (null ou
 * vide) est toujours acceptee ici : le caractere obligatoire d'un champ se controle a part.
 */
public final class ControleSaisie {

    /** Plus haut prix accepte (1 milliard) : au-dela, c'est une erreur de frappe. */
    public static final long PRIX_MAX = 1_000_000_000L;

    private ControleSaisie() {
    }

    /** Montant entier, positif ou nul, au plus PRIX_MAX. */
    public static String montant(String libelle, String valeur) {
        if (vide(valeur)) {
            return null;
        }
        String v = valeur.trim();
        long n;
        try {
            n = Long.parseLong(v);
        } catch (NumberFormatException e) {
            return libelle + " invalide : « " + court(v) + " » (nombre entier attendu).";
        }
        if (n < 0) {
            return libelle + " ne peut pas être négatif (" + n + ").";
        }
        if (n > PRIX_MAX) {
            return libelle + " démesuré (" + n + ") : vérifiez la saisie.";
        }
        return null;
    }

    /** Texte d'au plus max caracteres (la taille de la colonne en base). */
    public static String longueur(String libelle, String valeur, int max) {
        if (valeur != null && valeur.trim().length() > max) {
            return libelle + " trop long : " + valeur.trim().length() + " caractères, " + max + " au plus.";
        }
        return null;
    }

    /** Date AAAA-MM-JJ lisible et possible (pas de 31/02). */
    public static String date(String libelle, String valeur) {
        if (vide(valeur)) {
            return null;
        }
        try {
            LocalDate.parse(valeur.trim());
            return null;
        } catch (DateTimeParseException e) {
            return libelle + " invalide : « " + court(valeur.trim()) + " ».";
        }
    }

    /** Le premier message non nul, ou null si tout est acceptable. */
    public static String premier(String... messages) {
        for (String m : messages) {
            if (m != null) {
                return m;
            }
        }
        return null;
    }

    private static boolean vide(String v) {
        return v == null || v.trim().isEmpty();
    }

    private static String court(String v) {
        return v.length() > 30 ? v.substring(0, 30) + "…" : v;
    }
}
