/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import org.apache.commons.lang3.StringUtils;

/**
 * Traduit les exceptions techniques Java en explication "terre a terre" en francais, destinee au Centre de Support :
 * l'evenement capture affiche ainsi la cause probable comprehensible par un non-developpeur, en plus du message
 * technique d'origine.
 *
 * @author koben
 */
public final class ErreurExplication {

    private ErreurExplication() {
    }

    /**
     * Remonte la chaine des causes jusqu'a l'exception d'origine (ex. une EJBException enveloppe presque toujours la
     * vraie erreur metier).
     */
    public static Throwable causeRacine(Throwable exception) {
        Throwable courant = exception;
        while (courant != null && courant.getCause() != null && courant.getCause() != courant) {
            courant = courant.getCause();
        }
        return courant == null ? exception : courant;
    }

    /**
     * Explication en francais courant de l'exception (cause racine conseillee en entree). Ne retourne jamais null : une
     * explication generique est fournie pour les cas non repertories.
     */
    public static String expliquer(Throwable exception) {
        if (exception == null) {
            return "Erreur inconnue.";
        }
        String nom = exception.getClass().getSimpleName();
        String message = StringUtils.defaultString(exception.getMessage());

        if (exception instanceof StringIndexOutOfBoundsException) {
            return "Le programme a essayé de lire un caractère dans un texte vide ou trop court "
                    + "(par exemple prendre la première lettre d'un champ vide). "
                    + "Cause typique : une donnée attendue est vide en base (prénom, nom, référence...).";
        }
        if (exception instanceof NullPointerException) {
            return "Le programme a essayé d'utiliser une donnée qui n'existe pas (valeur absente). "
                    + "Causes typiques : enregistrement lié manquant, champ jamais renseigné, ou session expirée.";
        }
        if (exception instanceof IndexOutOfBoundsException) {
            return "Le programme a essayé de lire un élément qui n'existe pas dans une liste "
                    + "(par exemple le 5e élément d'une liste qui n'en contient que 3). "
                    + "Cause typique : moins de données que prévu.";
        }
        if (exception instanceof NumberFormatException) {
            return "Le programme a essayé de convertir en nombre un texte qui n'en est pas un "
                    + "(par exemple un champ vide ou contenant des lettres). "
                    + "Cause typique : une saisie ou une donnée non numérique là où un montant/quantité était attendu.";
        }
        if (exception instanceof ArithmeticException) {
            return "Erreur de calcul, presque toujours une division par zéro. "
                    + "Cause typique : un total ou une quantité à 0 utilisé comme diviseur (ex. calcul de moyenne ou de pourcentage sans données).";
        }
        if (exception instanceof ClassCastException) {
            return "Le programme a reçu un type de donnée différent de celui attendu "
                    + "(par exemple un texte à la place d'un nombre). Cause typique : donnée incohérente en base.";
        }
        if (exception instanceof java.time.format.DateTimeParseException
                || exception instanceof java.text.ParseException) {
            return "Une date (ou un texte à convertir) est dans un format inattendu. "
                    + "Cause typique : date vide, mal saisie ou stockée dans un autre format que celui attendu.";
        }
        if (exception instanceof java.io.FileNotFoundException
                || exception instanceof java.nio.file.NoSuchFileException) {
            return "Un fichier attendu est introuvable sur le disque du serveur "
                    + "(supprimé, déplacé, ou chemin mal configuré dans les paramètres).";
        }
        if (exception instanceof java.net.SocketTimeoutException) {
            return "Un service externe (serveur distant, grossiste, SMS...) n'a pas répondu dans le délai imparti. "
                    + "Cause typique : lenteur réseau ou service distant indisponible.";
        }
        if (exception instanceof java.net.ConnectException || exception instanceof java.net.UnknownHostException) {
            return "Impossible de joindre un service externe (adresse inaccessible ou pas de connexion réseau/Internet).";
        }
        if (exception instanceof java.io.IOException) {
            return "Problème de lecture/écriture (fichier ou réseau) : disque plein, fichier verrouillé, "
                    + "ou connexion interrompue pendant l'opération.";
        }
        // Exceptions JPA / Hibernate / SQL : reconnues par nom pour couvrir toutes les variantes.
        if ("NoResultException".equals(nom)) {
            return "Une recherche en base n'a trouvé AUCUN résultat alors que le programme en attendait un. "
                    + "Causes typiques : identifiants erronés, enregistrement supprimé, ou donnée jamais créée.";
        }
        if ("NonUniqueResultException".equals(nom)) {
            return "Une recherche en base a trouvé PLUSIEURS résultats alors qu'un seul était attendu. "
                    + "Cause typique : doublon dans les données (deux enregistrements pour la même référence).";
        }
        if ("OptimisticLockException".equals(nom) || "StaleObjectStateException".equals(nom)) {
            return "Deux utilisateurs ont modifié la même donnée en même temps : la seconde modification a été refusée "
                    + "pour ne pas écraser la première. Réessayer suffit généralement.";
        }
        if ("LazyInitializationException".equals(nom)) {
            return "Le programme a tenté d'accéder à une donnée liée qui n'était plus chargée en mémoire "
                    + "(la connexion à la base était déjà refermée). Erreur purement technique, à corriger dans le code.";
        }
        // Troncature de donnee : MySQL nomme la COLONNE fautive dans son message, jamais la valeur.
        // On remonte au moins ce nom de colonne a l'utilisateur - sans lui, l'evenement du Centre de
        // Support ne disait pas quelle donnee posait probleme et le diagnostic demandait un aller-retour.
        if (nom.contains("DataTruncation") || StringUtils.containsIgnoreCase(message, "data too long for column")
                || StringUtils.containsIgnoreCase(message, "data truncated for column")) {
            String colonne = colonneCitee(message);
            return "La valeur enregistrée est plus longue que ce que la colonne "
                    + (colonne.isEmpty() ? "concernée" : "« " + colonne + " »") + " peut contenir : "
                    + "l'écriture a été refusée et l'opération annulée. "
                    + "Causes typiques : colonne plus étroite que l'identifiant ou le texte à y écrire "
                    + "(base non alignée sur une mise à jour), ou saisie anormalement longue. "
                    + "A vérifier : la largeur de cette colonne et la longueur de la valeur écrite.";
        }
        if (nom.contains("ConstraintViolation") || nom.contains("IntegrityConstraint")) {
            return "L'écriture en base a violé une règle d'intégrité : doublon sur une valeur qui doit être unique, "
                    + "référence vers un enregistrement inexistant, ou champ obligatoire vide.";
        }
        if ("SQLGrammarException".equals(nom) || "SQLSyntaxErrorException".equals(nom)) {
            return "La requête SQL envoyée à la base est mal formée (table ou colonne inexistante, faute de syntaxe). "
                    + "Cause typique : migration de base non passée ou requête à corriger dans le code.";
        }
        if (nom.contains("SQLTimeout") || (nom.contains("Lock") && nom.contains("Timeout"))
                || StringUtils.containsIgnoreCase(message, "lock wait timeout")) {
            return "La base de données a mis trop de temps à répondre (table verrouillée par un autre traitement "
                    + "ou requête trop lourde). Réessayer plus tard ; si cela se répète, un traitement bloque la table.";
        }
        if (nom.contains("SQL") || nom.contains("Persistence") || nom.contains("JDBC") || nom.contains("Hibernate")
                || nom.contains("Database")) {
            return "Erreur au niveau de la base de données (voir le message technique). "
                    + "Causes typiques : donnée incohérente, base indisponible, ou requête à corriger.";
        }
        if ("OutOfMemoryError".equals(nom)) {
            return "Le serveur d'application n'a plus de mémoire disponible : traitement trop volumineux "
                    + "ou fuite de mémoire. Un redémarrage est souvent nécessaire, puis surveiller la mémoire (Santé application).";
        }
        if ("StackOverflowError".equals(nom)) {
            return "Le programme est entré dans une boucle infinie d'appels (erreur de code à corriger).";
        }
        if (exception instanceof IllegalArgumentException) {
            return "Une valeur inattendue a été transmise à un traitement (paramètre invalide). "
                    + "Cause typique : donnée incohérente ou appel d'écran avec de mauvais paramètres.";
        }
        if (exception instanceof IllegalStateException) {
            return "Un traitement a été appelé à un moment où il ne pouvait pas s'exécuter "
                    + "(état incohérent : par exemple opération sur une commande déjà clôturée).";
        }
        return "Erreur technique non répertoriée (" + nom + "). Transmettez le détail complet au support éditeur "
                + "via un ticket : le fichier log de l'événement contient la trace exacte.";
    }

    /**
     * Nom de la colonne cite entre apostrophes par MySQL dans un message de troncature, par exemple « Data too long for
     * column 'lg_COMPTE_CLIENT_ID' at row 1 ». Chaine vide si le message ne suit pas ce format.
     */
    static String colonneCitee(String message) {
        String texte = StringUtils.defaultString(message);
        int debut = texte.indexOf('\'');
        if (debut < 0) {
            return "";
        }
        int fin = texte.indexOf('\'', debut + 1);
        return fin > debut ? texte.substring(debut + 1, fin) : "";
    }
}
