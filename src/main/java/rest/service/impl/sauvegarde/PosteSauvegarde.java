package rest.service.impl.sauvegarde;

import java.util.Collection;
import java.util.Locale;
import org.apache.commons.lang3.StringUtils;

/**
 * Poste qui fait les sauvegardes (retour du 12/11 : « la sauvegarde doit se faire uniquement sur le serveur pas sur
 * chaque poste »). Chez une officine a plusieurs postes, chaque caisse a son propre Payara branche sur la base du
 * serveur : avant cette regle, chacun lancait sa propre copie complete de la base a hh:05 (appaul : 7 postes, 15
 * sauvegardes en echec entre 23:05 et 01:05 le 11/11).
 * <ul>
 * <li>KEY_SAUVEGARDE_POSTE renseigne : seul le poste de ce nom sauvegarde ;</li>
 * <li>sinon : seul le poste qui heberge la base (adresse du pool locale : localhost, 127.x, ::1, nom ou adresse du
 * poste).</li>
 * </ul>
 */
public final class PosteSauvegarde {

    private PosteSauvegarde() {
    }

    /**
     * @param posteImpose
     *            valeur de KEY_SAUVEGARDE_POSTE (vide : regle de la base locale)
     * @param hoteBase
     *            hote de la base lu dans le pool de Payara
     * @param nomPoste
     *            nom de ce poste
     * @param adressesPoste
     *            adresses IP de ce poste
     */
    public static boolean estServeur(String posteImpose, String hoteBase, String nomPoste,
            Collection<String> adressesPoste) {
        if (StringUtils.isNotBlank(posteImpose)) {
            return memeNom(posteImpose, nomPoste);
        }
        return baseLocale(hoteBase, nomPoste, adressesPoste);
    }

    static boolean baseLocale(String hoteBase, String nomPoste, Collection<String> adressesPoste) {
        String h = StringUtils.trimToEmpty(hoteBase).toLowerCase(Locale.ROOT);
        if (h.startsWith("[") && h.endsWith("]")) {
            h = h.substring(1, h.length() - 1);
        }
        if (h.isEmpty() || "localhost".equals(h) || h.startsWith("127.") || "::1".equals(h)
                || "0:0:0:0:0:0:0:1".equals(h)) {
            return true;
        }
        if (memeNom(h, nomPoste)) {
            return true;
        }
        if (adressesPoste != null) {
            for (String a : adressesPoste) {
                if (h.equalsIgnoreCase(StringUtils.trimToEmpty(a))) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Noms de poste compares sans casse et sans domaine (« SERVEUR » = « serveur.officine.local »). */
    static boolean memeNom(String a, String b) {
        String x = court(a), y = court(b);
        return !x.isEmpty() && x.equals(y);
    }

    private static String court(String nom) {
        String n = StringUtils.trimToEmpty(nom).toLowerCase(Locale.ROOT);
        if (!n.isEmpty() && !Character.isDigit(n.charAt(0)) && n.indexOf('.') > 0) {
            n = n.substring(0, n.indexOf('.'));
        }
        return n;
    }
}
