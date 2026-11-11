package rest.service.impl.whatsapp;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Plan du 09/11, point 13 : origine d'un envoi WhatsApp et etapes de son suivi, pour le journal des envois.
 * <p>
 * Chaque envoi porte son origine (ticket Z, campagne, rappel, discussion, avis, essai, lien wa.me) et l'utilisateur qui
 * l'a declenche. Les envois anterieurs a ce point n'ont pas d'origine en base : elle est deduite quand c'est sur (une
 * notification de campagne est une campagne, une autre notification un rappel), sinon « non precisee ».
 * <p>
 * Etapes affichees : prepare, envoye, distribue, lu ; un echec arrete le suivi ; un envoi simule (mode test) s'arrete a
 * « prepare » ; un lien wa.me ne peut que s'ouvrir (Prestige ne voit pas l'envoi reel).
 */
public final class OrigineEnvoi {

    public static final String TICKET_Z = "TICKET_Z";
    public static final String CAMPAGNE = "CAMPAGNE";
    public static final String RAPPEL = "RAPPEL";
    public static final String DISCUSSION = "DISCUSSION";
    public static final String AVIS = "AVIS";
    public static final String ESSAI = "ESSAI";
    public static final String LIEN = "LIEN";
    /** Envoi anterieur au point 13, sans notification : essai, ticket Z, discussion ou avis, indistincts. */
    public static final String NON_PRECISEE = "NON_PRECISEE";

    public static final List<String> ORIGINES = Collections
            .unmodifiableList(Arrays.asList(TICKET_Z, CAMPAGNE, RAPPEL, DISCUSSION, AVIS, ESSAI, LIEN));

    /** Statut d'un lien wa.me ouvert depuis Campagne client. */
    public static final String OUVERT = "OUVERT";

    /** Etapes du suivi, dans l'ordre. */
    public static final List<String> ETAPES = Collections
            .unmodifiableList(Arrays.asList("PREPARE", "ENVOYE", "DELIVRE", "LU"));

    private OrigineEnvoi() {
    }

    /** Origine valide a enregistrer, ou null si la valeur n'en est pas une. */
    public static String valide(String origine) {
        return origine != null && ORIGINES.contains(origine) ? origine : null;
    }

    /**
     * Origine affichee d'une ligne du journal : celle enregistree, sinon deduite pour les envois anterieurs.
     *
     * @param enregistree
     *            colonne origine (null avant le point 13)
     * @param notificationId
     *            notification de l'envoi (campagnes et rappels)
     * @param deCampagne
     *            la notification appartient a une campagne
     */
    public static String afficher(String enregistree, String notificationId, boolean deCampagne) {
        String o = valide(enregistree);
        if (o != null) {
            return o;
        }
        if (notificationId != null) {
            return deCampagne ? CAMPAGNE : RAPPEL;
        }
        return NON_PRECISEE;
    }

    public static String libelle(String origine) {
        if (origine == null) {
            return "Non précisée";
        }
        switch (origine) {
        case TICKET_Z:
            return "Ticket Z";
        case CAMPAGNE:
            return "Campagne";
        case RAPPEL:
            return "Rappel";
        case DISCUSSION:
            return "Discussion";
        case AVIS:
            return "Avis client";
        case ESSAI:
            return "Essai";
        case LIEN:
            return "Lien wa.me";
        default:
            return "Non précisée";
        }
    }

    /**
     * Nombre d'etapes franchies (1 = prepare ... 4 = lu) ; 0 pour un echec. Un envoi simule reste a « prepare » (rien
     * n'est parti) ; un lien ouvert compte deux etapes (prepare, lien ouvert).
     */
    public static int etapes(String statut) {
        if (statut == null) {
            return 1;
        }
        switch (statut) {
        case "ECHEC":
            return 0;
        case "SIMULE":
        case "PREPARE":
            return 1;
        case "ENVOYE":
        case OUVERT:
            return 2;
        case "DELIVRE":
            return 3;
        case "LU":
            return 4;
        default:
            return 1;
        }
    }

    /** Libelle de l'etat d'un envoi, pour l'ecran (jamais le texte du message). */
    public static String etat(String statut) {
        if (statut == null) {
            return "Préparé";
        }
        switch (statut) {
        case "ECHEC":
            return "Échec";
        case "SIMULE":
            return "Simulé (mode test)";
        case "ENVOYE":
            return "Envoyé";
        case "DELIVRE":
            return "Distribué";
        case "LU":
            return "Lu";
        case OUVERT:
            return "Lien ouvert";
        default:
            return "Préparé";
        }
    }
}
