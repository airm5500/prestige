package rest;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;

/**
 * Lecture de ce que l'ecran de mise a jour selective envoie : la liste des tiers payants coches, et les reglages a leur
 * appliquer.
 *
 * <p>
 * Une mise a jour en masse ne pardonne pas : si une liste mal formee etait lue comme « tous », ou si un champ vide
 * etait lu comme zero, l'officine perdrait d'un coup le reglage de dizaines d'organismes. Les deux regles tenues ici
 * sont donc :
 * </p>
 * <ul>
 * <li>ce qu'on ne comprend pas ne donne aucun identifiant, et l'appel s'arrete faute de destinataire ;</li>
 * <li>un champ vide vaut « ne pas y toucher », jamais zero.</li>
 * </ul>
 */
public final class MiseAJourSelectiveUtil {

    private static final Logger LOG = Logger.getLogger(MiseAJourSelectiveUtil.class.getName());

    private MiseAJourSelectiveUtil() {
    }

    /**
     * Les identifiants de tiers payants transmis par l'ecran, sans doublon et dans l'ordre de saisie.
     *
     * @param json
     *            tableau JSON d'identifiants ; toute autre forme renvoie une liste vide
     */
    public static List<String> identifiants(String json) {
        if (StringUtils.isBlank(json)) {
            return Collections.emptyList();
        }
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        try {
            JSONArray tableau = new JSONArray(json);
            for (int i = 0; i < tableau.length(); i++) {
                String id = StringUtils.trimToEmpty(String.valueOf(tableau.get(i)));
                if (!id.isEmpty() && !"null".equals(id)) {
                    ids.add(id);
                }
            }
        } catch (Exception e) {
            // Liste illisible : on ne devine pas. L'appelant refusera faute de destinataire.
            LOG.log(Level.WARNING, "liste de tiers payants illisible : {0}", json);
            return Collections.emptyList();
        }
        return new ArrayList<>(ids);
    }

    /**
     * Un reglage numerique laisse vide, ou illisible, vaut {@code null} : le champ correspondant ne sera pas touche.
     */
    public static Integer entierOuNull(String valeur) {
        if (StringUtils.isBlank(valeur)) {
            return null;
        }
        try {
            return Integer.valueOf(valeur.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
