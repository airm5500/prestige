package rest.service.extranet;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import org.json.JSONObject;
import rest.service.extranet.commun.EtatLectures;
import rest.service.extranet.commun.Periode;

/**
 * Lecture d'une liste en arriere-plan (retours 8 et 9 du 08/11) : meme collecte que « Lire sur l'extranet » (meme
 * journal, meme cache), lancee dans un fil du serveur pour que l'ecran ne reste pas bloque plusieurs minutes. L'appel
 * asynchrone garde l'utilisateur appelant (droits verifies comme pour la lecture directe).
 */
/* sans transaction ici : chaque collecte ouvre la sienne, comme pour la lecture directe */
@Stateless
@javax.ejb.TransactionAttribute(javax.ejb.TransactionAttributeType.NOT_SUPPORTED)
public class LecturesExtranet {

    private static final Logger LOG = Logger.getLogger(LecturesExtranet.class.getName());

    /** Familles de listes de l'onglet : ubipharm, tedis, copharmed, dpci. */
    public static boolean familleConnue(String famille) {
        return "ubipharm".equals(famille) || "tedis".equals(famille) || "copharmed".equals(famille)
                || "dpci".equals(famille);
    }

    @EJB
    private ExtranetService service;

    @Asynchronous
    public void lire(EtatLectures.Lecture lecture, String famille, String code, String utilisateur, Periode periode) {
        JSONObject r;
        try {
            switch (famille) {
            case "tedis":
                r = service.collecterListeTedis(code, utilisateur);
                break;
            case "copharmed":
                r = service.collecterListeCopharmed(code, utilisateur);
                break;
            case "dpci":
                r = service.collecterListeDpci(code, utilisateur, periode);
                break;
            default:
                r = service.collecterListe(code, utilisateur);
            }
        } catch (RuntimeException e) {
            /* le message technique reste au journal du serveur ; jamais de texte de page ni de cookie */
            LOG.log(Level.WARNING, "Lecture en arriere-plan " + lecture.cle + " en erreur", e);
            r = new JSONObject().put("success", false).put("msg", "Erreur pendant la lecture : à relancer");
        }
        EtatLectures.duServeur().terminer(lecture, r);
    }
}
