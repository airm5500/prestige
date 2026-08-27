package rest.report;

import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * La ville imprimee en pied des recapitulatifs de facture : « &lt;Ville&gt;, le &lt;date&gt; ».
 *
 * <p>
 * Les modeles portaient cette ville EN DUR - « TAFIRE » - si bien que toute officine imprimait la ville d'une autre.
 * Elle se regle desormais dans l'ecran « Gestion des parametrages », sous la cle {@link Constant#KEY_LIEU_EDITION}.
 * </p>
 *
 * <p>
 * La lecture est ici, et non dans une seule classe d'edition, parce que le recapitulatif s'imprime par deux chemins :
 * la ressource REST et la page ws_rp_facture_tiers_payant.jsp. Le premier passait la ville, le second non : la ville
 * saisie ne sortait donc pas sur le recapitulatif.
 * </p>
 */
public final class LieuEdition {

    private static final Logger LOG = Logger.getLogger(LieuEdition.class.getName());

    /** Nom du parametre lu par les modeles .jrxml. */
    public static final String PARAMETRE = "P_LIEU_EDITION";

    private LieuEdition() {
    }

    /**
     * La ville de l'officine, ou une chaine vide si elle n'a pas encore ete saisie.
     *
     * <p>
     * La ligne du parametre est creee ici si elle n'existe pas encore, et creee VIDE : sans elle l'ecran des
     * parametrages ne l'afficherait pas et l'officine n'aurait aucun endroit ou saisir sa ville. Tant que rien n'est
     * saisi, le recapitulatif se contente de « le &lt;date&gt; », ce qui vaut mieux qu'une ville fausse.
     * </p>
     */
    public static String valeur(EntityManager em) {
        if (em == null) {
            return "";
        }
        try {
            dal.TParameters parametre = em.find(dal.TParameters.class, Constant.KEY_LIEU_EDITION);
            if (parametre == null) {
                parametre = creer(em);
            }
            return parametre == null ? "" : StringUtils.defaultString(parametre.getStrVALUE());
        } catch (Exception e) {
            // Sans gravite pour l'edition en cours : la ville restera simplement vide.
            LOG.log(Level.WARNING, "Le parametre {0} n''a pas pu etre lu : {1}",
                    new Object[] { Constant.KEY_LIEU_EDITION, e.getMessage() });
            return "";
        }
    }

    private static dal.TParameters creer(EntityManager em) {
        try {
            dal.TParameters parametre = new dal.TParameters();
            parametre.setStrKEY(Constant.KEY_LIEU_EDITION);
            parametre.setStrVALUE("");
            parametre.setStrDESCRIPTION("Ville de l'officine, imprimée en pied de récapitulatif de facture");
            parametre.setStrTYPE(commonparameter.PARAMETER_CUSTOMER);
            parametre.setStrSTATUT(commonparameter.statut_enable);
            parametre.setDtCREATED(new Date());
            parametre.setDtUPDATED(new Date());
            em.persist(parametre);
            return parametre;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Le parametre {0} n''a pas pu etre cree : {1}",
                    new Object[] { Constant.KEY_LIEU_EDITION, e.getMessage() });
            return null;
        }
    }
}
