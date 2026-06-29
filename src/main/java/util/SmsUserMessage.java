package util;

import org.apache.commons.lang3.StringUtils;

/**
 * Traduit un échec d'envoi SMS Orange (code + message technique) en un message
 * d'action clair pour l'utilisateur final (caissier/pharmacien).
 *
 * Exemple : un 403 / POL0001 « You consumed all available units... » devient
 * « Crédit SMS épuisé : rechargez votre bundle... ».
 *
 * @author koben
 */
public final class SmsUserMessage {

    private SmsUserMessage() {
    }

    /**
     * @param code         code d'erreur Orange (messageId ou HTTP_xxx), peut être null
     * @param orangeMessage message technique Orange, peut être null
     * @return message lisible et orienté action pour l'utilisateur
     */
    public static String friendly(String code, String orangeMessage) {
        String c = StringUtils.trimToEmpty(code);
        String m = StringUtils.lowerCase(StringUtils.trimToEmpty(orangeMessage));

        // Crédit / bundle épuisé : cas le plus important côté métier.
        if (m.contains("consumed all available units") || m.contains("buy a new bundle")
                || m.contains("reactivate your contract") || m.contains("out of quota")
                || m.contains("insufficient") || m.contains("credit")
                || "POL0009".equalsIgnoreCase(c) || "POL0050".equalsIgnoreCase(c)) {
            return "Crédit SMS épuisé : vous n'avez plus d'unités. "
                    + "Veuillez recharger votre bundle SMS (sur developer.orange.com) "
                    + "ou contacter Orange pour réactiver le contrat. Le SMS n'a pas été envoyé.";
        }

        // Authentification Orange (token / identifiants).
        if ("HTTP_401".equalsIgnoreCase(c) || "invalid_token".equalsIgnoreCase(c)
                || "invalid_client".equalsIgnoreCase(c) || "invalid_grant".equalsIgnoreCase(c)) {
            return "Problème d'authentification avec Orange (token ou identifiants). "
                    + "Veuillez contacter l'administrateur.";
        }

        // Débit / trop d'envois.
        if ("HTTP_429".equalsIgnoreCase(c) || "POL0013".equalsIgnoreCase(c)) {
            return "Trop d'envois en peu de temps. Veuillez réessayer dans un instant.";
        }

        // Numéro destinataire invalide.
        if ("SVC0004".equalsIgnoreCase(c) || "SVC0007".equalsIgnoreCase(c)) {
            return "Le numéro du destinataire est invalide ou mal formaté. Le SMS n'a pas été envoyé.";
        }

        // Sender non autorisé / interdiction générique.
        if ("HTTP_403".equalsIgnoreCase(c)) {
            return "Envoi refusé par Orange (sender non autorisé ou droits insuffisants). "
                    + "Veuillez vérifier la configuration ou contacter l'administrateur.";
        }

        // Repli : on remonte le message Orange s'il existe, sinon un message générique.
        if (StringUtils.isNotBlank(orangeMessage)) {
            return "Échec de l'envoi : " + orangeMessage;
        }
        return "Échec de l'envoi du SMS" + (StringUtils.isNotBlank(c) ? " (code " + c + ")" : "") + ".";
    }
}
