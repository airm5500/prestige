package job;

import dal.SmsFournisseur;
import dal.TParameters;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.ejb.DependsOn;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import util.AppParameters;
import util.Constant;
import util.sms.SmsProviderCatalog;

/**
 * Amorçage de la configuration du fournisseur SMS Orange en base.
 *
 * Au premier démarrage après la migration V6.7.9, reprend les valeurs de l'officine depuis dicisms.properties
 * ({@link AppParameters}) et le paramètre KEY_SMS_DR_CALLBACK_URL, afin que l'écran "Fournisseurs SMS" affiche la
 * configuration réellement utilisée. Idempotent : ne touche jamais un paramètre déjà renseigné (les modifications
 * faites depuis l'écran sont conservées).
 *
 * @author koben
 */
@Singleton
@Startup
@DependsOn({ "FlywayStartupBean" })
public class SmsFournisseurBootstrap {

    private static final Logger LOG = Logger.getLogger(SmsFournisseurBootstrap.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @PostConstruct
    public void seedOrangeFromProperties() {
        try {
            SmsFournisseur orange = em.find(SmsFournisseur.class, SmsProviderCatalog.CODE_ORANGE);
            if (orange == null) {
                return;
            }
            AppParameters sp = AppParameters.getInstance();
            boolean changed = false;
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_CLIENT_ID, sp.clientId);
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_CLIENT_SECRET, sp.clientSecret);
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_TOKEN_ENDPOINT, sp.pathsmsapitokenendpoint);
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_SEND_URL, sp.pathsmsapisendmessageurl);
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_SENDER_ADDRESS, sp.senderAddress);
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_ADMIN_BASE_URL, sp.pathsmsapiadminbaseurl);
            changed |= seedParam(orange, SmsProviderCatalog.ORANGE_SUBSCRIPTION_URL, sp.pathsmsapisubscriptionurl);
            if (StringUtils.isBlank(orange.getDlrCallbackUrl())) {
                String callbackUrl = resolveCallbackUrl(sp);
                if (StringUtils.isNotBlank(callbackUrl)) {
                    orange.setDlrCallbackUrl(callbackUrl.trim());
                    changed = true;
                }
            }
            if (changed) {
                em.merge(orange);
                LOG.log(Level.INFO, "Configuration Orange reprise dans sms_fournisseur depuis dicisms.properties");
            }
        } catch (Exception e) {
            // L'amorçage ne doit jamais empêcher le démarrage de l'application.
            LOG.log(Level.SEVERE, "Echec de l'amorçage de la configuration des fournisseurs SMS", e);
        }
    }

    /** Renseigne le paramètre uniquement s'il est vide en base. Retourne true si une valeur a été écrite. */
    private boolean seedParam(SmsFournisseur fournisseur, String cle, String valeur) {
        if (StringUtils.isNotBlank(fournisseur.getParamValue(cle)) || StringUtils.isBlank(valeur)) {
            return false;
        }
        fournisseur.setParamValue(cle, valeur.trim());
        return true;
    }

    /** URL de callback DR effective : paramètre en base si renseigné, sinon dicisms.properties. */
    private String resolveCallbackUrl(AppParameters sp) {
        try {
            TParameters p = em.find(TParameters.class, Constant.KEY_SMS_DR_CALLBACK_URL);
            if (p != null && StringUtils.isNotBlank(p.getStrVALUE())) {
                return p.getStrVALUE();
            }
        } catch (Exception ignore) {
            // repli sur le fichier de propriétés
        }
        return sp.smsdrcallbackurl;
    }

}
