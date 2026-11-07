package rest.service.extranet;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.commun.CoffreSessions;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SessionExtranet;
import rest.service.extranet.commun.SourceExtranet;

/**
 * Extranets grossistes (plan du 07/11), lecture seule : session de chaque extranet et journal des collectes. Les
 * modules (fiche produit, reapprovisionnements, reclamations, nouveaux produits) s'y ajoutent.
 *
 * <p>
 * La session est un secret : seul un administrateur la renseigne ou l'efface, et aucune reponse ne la contient.
 */
@Stateless
public class ExtranetService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public boolean administrateur(String roleId) {
        if (StringUtils.isBlank(roleId)) {
            return false;
        }
        dal.TRole r = em.find(dal.TRole.class, roleId);
        return bll.userManagement.user.estRoleAdmin(r) || bll.userManagement.user.estRoleSuperAdmin(r);
    }

    /** Etat des sessions de tous les extranets (jamais leur valeur). */
    public JSONObject sessions() {
        JSONArray l = new JSONArray();
        for (SourceExtranet s : SourceExtranet.values()) {
            l.put(CoffreSessions.session(s).publique());
        }
        return new JSONObject().put("success", true).put("data", l);
    }

    public JSONObject definirSession(SourceExtranet s, String cookies, String utilisateur) {
        SessionExtranet session = CoffreSessions.session(s);
        String refus = session.definir(cookies, utilisateur);
        if (refus != null) {
            return new JSONObject().put("success", false).put("msg", refus);
        }
        return new JSONObject().put("success", true).put("session", session.publique());
    }

    public JSONObject effacerSession(SourceExtranet s) {
        SessionExtranet session = CoffreSessions.session(s);
        session.effacer();
        return new JSONObject().put("success", true).put("session", session.publique());
    }

    public JSONObject collectes(SourceExtranet s, String module, int nombre) {
        return new JSONObject().put("success", true).put("data",
                new JournalCollecte(em).dernieres(s, StringUtils.trimToNull(module), nombre));
    }

    public JSONObject collecte(long id) {
        JSONObject c = new JournalCollecte(em).une(id);
        return c == null ? new JSONObject().put("success", false).put("msg", "Collecte introuvable")
                : new JSONObject().put("success", true).put("collecte", c);
    }
}
