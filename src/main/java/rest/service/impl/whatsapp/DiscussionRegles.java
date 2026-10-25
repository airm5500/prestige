package rest.service.impl.whatsapp;

import org.apache.commons.lang3.StringUtils;
import util.Constant;

/**
 * Fils de discussion WhatsApp (demande du 25/10) : regles sans base de donnees, testees a part. Le texte des messages
 * n'est jamais journalise ; il est seulement garde, nettoye et borne, pour l'ecran.
 */
public final class DiscussionRegles {

    public static final String ENTRANT = "E";
    public static final String SORTANT = "S";

    private DiscussionRegles() {
    }

    /** Texte garde : caracteres de controle retires (retours a la ligne gardes), borne a la taille maximale. */
    public static String nettoyer(String texte) {
        if (texte == null) {
            return "";
        }
        String t = texte.replace("\r\n", "\n").replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", "").trim();
        return StringUtils.left(t, Constant.WHATSAPP_DISCUSSION_TEXTE_MAX);
    }

    /** Debut du dernier message, sur une ligne, pour la liste des discussions. */
    public static String extrait(String texte) {
        String t = StringUtils.normalizeSpace(StringUtils.defaultString(texte));
        return t.length() <= Constant.WHATSAPP_DISCUSSION_EXTRAIT ? t
                : t.substring(0, Constant.WHATSAPP_DISCUSSION_EXTRAIT - 1) + "…";
    }

    /** Type garde (TEXTE, IMAGE, VIDEO, DOCUMENT, AUDIO, AUTRE) ; TEXTE par defaut. */
    public static String type(String type) {
        String t = StringUtils.defaultString(type).trim().toUpperCase();
        switch (t) {
        case "IMAGE":
        case "VIDEO":
        case "DOCUMENT":
        case "AUDIO":
        case "AUTRE":
            return t;
        default:
            return "TEXTE";
        }
    }

    /**
     * Une reponse a envoyer : texte ou piece jointe, et pas plus long que la limite. Rend le motif du refus, ou null.
     */
    public static String refusReponse(String texte, boolean avecPiece) {
        if (StringUtils.isBlank(texte) && !avecPiece) {
            return "Écrivez un message ou joignez un fichier.";
        }
        if (texte != null && texte.trim().length() > Constant.WHATSAPP_DISCUSSION_TEXTE_MAX) {
            return "Message trop long (" + Constant.WHATSAPP_DISCUSSION_TEXTE_MAX + " caractères au plus).";
        }
        return null;
    }
}
