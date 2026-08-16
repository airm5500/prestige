package rest.report;

import java.util.Locale;

/**
 * Traduit une panne technique en une phrase que l'officine peut lire et transmettre au support.
 *
 * Sans cela l'utilisateur reçoit une pile Java : il ne sait ni ce qui s'est passé, ni quoi en dire. Le détail complet
 * reste enregistré dans le journal du serveur ; c'est seulement le message affiché qui est traduit.
 *
 * @author koben
 */
public final class MessageEchec {

    private MessageEchec() {
    }

    /** Le message de l'exception ET de toutes ses causes : le motif réel est souvent au fond de la pile. */
    static String texteDeLaChaine(Throwable e) {
        StringBuilder texte = new StringBuilder();
        Throwable courante = e;
        int garde = 0;
        while (courante != null && garde++ < 20) {
            if (courante.getMessage() != null) {
                texte.append(' ').append(courante.getMessage());
            }
            courante = courante.getCause() == courante ? null : courante.getCause();
        }
        return texte.toString();
    }

    /** Motif en langage courant, ou une phrase neutre quand la cause n'est pas reconnue. */
    public static String pour(Throwable e) {
        String min = texteDeLaChaine(e).toLowerCase(Locale.ROOT);
        if (min.contains("duplicated sql alias") || min.contains("non unique")) {
            return "deux colonnes de la requête portent le même nom, la base ne sait pas les distinguer";
        }
        if (min.contains("unknown column") || min.contains("doesn't exist") || min.contains("does not exist")) {
            return "une colonne ou une table attendue est absente de la base de données";
        }
        if (min.contains("data too long")) {
            return "une valeur dépasse la taille prévue en base";
        }
        if (min.contains("communications link failure") || min.contains("connection refused")
                || min.contains("could not connect")) {
            return "la base de données n'a pas répondu";
        }
        if (min.contains("no space left")) {
            return "le disque du serveur est plein";
        }
        return "une erreur technique est survenue";
    }
}
