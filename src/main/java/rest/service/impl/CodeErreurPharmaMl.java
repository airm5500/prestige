package rest.service.impl;

import org.apache.commons.lang3.StringUtils;

/**
 * Retours du 08/10 (8) : codes d'erreur PharmaML (specification CSRP v4.8, tableau 8), portes par l'attribut Statut de
 * la balise ERREUR. 0001-0100 : erreurs techniques ; 0101-0200 : erreurs fonctionnelles ; 1000-9999 : codes propres au
 * grossiste. Libelle lisible et conseil a l'officine.
 */
public final class CodeErreurPharmaMl {

    private CodeErreurPharmaMl() {
    }

    public static String libelle(String code) {
        Integer v = CodeReponsePharmaMl.valeur(code);
        if (v == null) {
            return "";
        }
        switch (v) {
        case 1:
            return "enveloppe non conforme au protocole";
        case 2:
            return "message non conforme";
        case 3:
            return "version du protocole non supportée";
        case 4:
            return "émetteur non identifié";
        case 5:
            return "erreur de destinataire";
        case 6:
            return "message ou service non référencé";
        case 7:
            return "doublon : même message et même document";
        case 8:
            return "doublon : document déjà reçu";
        case 9:
            return "doublon : message déjà traité";
        case 10:
            return "référence de message inconnue";
        case 11:
            return "message non intègre, contrôle d'intégrité";
        case 101:
            return "officine inconnue du grossiste";
        case 102:
            return "officine non autorisée";
        case 103:
            return "service non autorisé pour cette officine";
        default:
            return v >= 1000 ? "code propre au grossiste" : v <= 100 ? "erreur technique" : "erreur fonctionnelle";
        }
    }

    /** Conseil a l'officine selon le code (vide si aucun conseil utile). */
    public static String conseil(String code) {
        Integer v = CodeReponsePharmaMl.valeur(code);
        if (v == null) {
            return "";
        }
        switch (v) {
        case 3:
            return " Changez la version PharmaML dans la fiche du grossiste (1.0.0.0 ou 3.0.0.0).";
        case 4:
        case 101:
            return " Vérifiez dans la fiche du grossiste le code client de l'officine et les codes du grossiste.";
        case 5:
            return " Vérifiez dans la fiche du grossiste son code et son identifiant PharmaML.";
        case 6:
        case 103:
            return " Ce service n'est pas ouvert pour l'officine : contactez le grossiste.";
        case 7:
        case 8:
        case 9:
            return " Le grossiste a déjà reçu cette commande : ne la renvoyez pas, récupérez sa réponse.";
        case 11:
            return " Vérifiez la clé et le réglage « Contrôle PharmaML » dans la fiche du grossiste.";
        case 102:
            return " L'officine est connue mais pas autorisée : contactez le grossiste.";
        default:
            return "";
        }
    }

    /** Doublon (0007 a 0009) : le grossiste a deja la commande. */
    public static boolean doublon(String code) {
        Integer v = CodeReponsePharmaMl.valeur(code);
        return v != null && v >= 7 && v <= 9;
    }
}
