package util;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Personnalisation d'un modele de message (point 2) : remplace les variables {client}, {prenom}, {nom}, {medicament},
 * {officine}, {telephone_officine}, {dernier_achat} par les valeurs du destinataire. Les accolades sont insensibles a
 * la casse et aux espaces interieurs ; une variable inconnue reste telle quelle, pour que l'utilisateur la voie.
 */
public final class MessageModele {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\s*([a-zA-Z_]+)\\s*}");

    private MessageModele() {
    }

    /** Valeurs d'un destinataire ; les cles sont les noms de variables en minuscules. */
    public static Map<String, String> valeurs(String nom, String prenom, String medicament, String officine,
            String telephoneOfficine, String dernierAchat) {
        Map<String, String> v = new LinkedHashMap<>();
        String n = nom == null ? "" : nom.trim();
        String p = prenom == null ? "" : prenom.trim();
        v.put("nom", n);
        v.put("prenom", p);
        v.put("client", (n + " " + p).trim());
        v.put("medicament", medicament == null ? "" : medicament.trim());
        v.put("officine", officine == null ? "" : officine.trim());
        v.put("telephone_officine", telephoneOfficine == null ? "" : telephoneOfficine.trim());
        v.put("dernier_achat", dernierAchat == null ? "" : dernierAchat.trim());
        return v;
    }

    /** Message personnalise. */
    public static String personnaliser(String modele, Map<String, String> valeurs) {
        if (modele == null) {
            return "";
        }
        Matcher m = VARIABLE.matcher(modele);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String cle = m.group(1).toLowerCase(java.util.Locale.ROOT);
            String valeur = valeurs == null ? null : valeurs.get(cle);
            m.appendReplacement(sb, Matcher.quoteReplacement(valeur == null ? m.group(0) : valeur));
        }
        m.appendTail(sb);
        return sb.toString().replaceAll("[ \\t]{2,}", " ").trim();
    }

    /** Vrai si le modele contient la variable donnee (ex. « medicament »). */
    public static boolean utilise(String modele, String variable) {
        if (modele == null) {
            return false;
        }
        Matcher m = VARIABLE.matcher(modele);
        while (m.find()) {
            if (m.group(1).equalsIgnoreCase(variable)) {
                return true;
            }
        }
        return false;
    }
}
