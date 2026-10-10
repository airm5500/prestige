package rest.service.impl;

import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SupportEventService;
import rest.service.dto.SupportEventDTO;

/**
 * Retours du 10/10 : mesure de l'impression des tickets de vente. Chaque impression est chronometree etape par etape
 * (voir {@link MesureImpression}) ; au-dela du seuil (parametre KEY_TICKET_LENT_SEUIL_MS, 5 s par defaut), le detail
 * est ecrit dans le journal du serveur et dans le Centre de Support (« Impression du ticket lente », compteur
 * d'occurrences par etape fautive). L'impression elle-meme ne change pas : meme appel, meme reponse.
 */
@Stateless
public class SuiviImpressionTicket {

    private static final Logger LOG = Logger.getLogger(SuiviImpressionTicket.class.getName());
    static final String KEY_SEUIL = "KEY_TICKET_LENT_SEUIL_MS";
    static final long SEUIL_DEFAUT_MS = 5000L;

    @FunctionalInterface
    public interface Impression {
        JSONObject imprimer() throws JSONException;
    }

    @EJB
    private SupportEventService supportEventService;

    /**
     * Imprime en mesurant. Hors transaction : l'impression ouvre la sienne, exactement comme lorsqu'elle etait appelee
     * directement.
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public JSONObject mesurer(String libelle, String utilisateur, Impression impression) throws JSONException {
        MesureImpression.demarrer(libelle);
        try {
            return impression.imprimer();
        } finally {
            MesureImpression m = MesureImpression.terminer();
            try {
                signalerSiLente(m, utilisateur);
            } catch (RuntimeException e) {
                LOG.warning("mesure de l'impression du ticket : " + e);
            }
        }
    }

    void signalerSiLente(MesureImpression m, String utilisateur) {
        if (m == null || m.totalMs() < seuilMs()) {
            return;
        }
        String detail = m.detail();
        String imprimante = StringUtils.defaultIfBlank(m.getImprimante(), "inconnue");
        LOG.warning(
                "Impression lente du ticket (" + m.getLibelle() + ") : " + detail + " ; imprimante : " + imprimante);
        SupportEventDTO dto = new SupportEventDTO();
        dto.setType("JAVA");
        dto.setNiveau("WARN");
        dto.setModule("TICKET");
        dto.setMessageCourt(StringUtils.abbreviate(
                "Impression du ticket lente (" + m.getLibelle() + ") : retenue par « " + m.etapeLaPlusLongue() + " »",
                500));
        dto.setUrlOuEcran(StringUtils.abbreviate(m.getLibelle(), 255));
        dto.setPayloadJson(StringUtils.abbreviate("Explication : l'impression du ticket a pris " + detail
                + ". Imprimante : " + imprimante + ". Si « recherche de l'imprimante » domine, Windows met du temps à"
                + " trouver l'imprimante par défaut (imprimante réseau ou partagée injoignable, pilote en erreur) ; si"
                + " c'est « envoi au spouleur », c'est le spouleur ou l'imprimante qui répond lentement ; sinon c'est la"
                + " lecture de la vente (base de données chargée).", 4000));
        supportEventService.record(dto, utilisateur);
    }

    private long seuilMs() {
        try {
            String v = StringUtils.trimToNull(supportEventService.getParameter(KEY_SEUIL));
            return v == null ? SEUIL_DEFAUT_MS : Long.parseLong(v);
        } catch (RuntimeException e) {
            return SEUIL_DEFAUT_MS;
        }
    }
}
