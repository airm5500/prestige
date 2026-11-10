package rest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import util.PostesConnus;

/**
 * Plan du 09/11, point 7 : liste des postes connus de l'officine (Parametrages › Poste), lue dans le journal des
 * connexions des {@value PostesConnus#JOURS} derniers jours. GET v1/postes/connus : 401 sans session ; 403 sans le
 * droit du Parametrage general (ou le profil administrateur) ; 200 {success, data: [{poste, derniere, utilisateur, ip,
 * connexions}], total}. Lecture seule.
 */
@Path("v1/postes")
@Produces(MediaType.APPLICATION_JSON)
@Stateless
public class PosteRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @GET
    @Path("connus")
    public Response connus() {
        Response refus = Droits.refus(servletRequest, "Paramétrage général", "P_SM_PARAMETER_MANAGER",
                "P_PROFIL_ADMIN");
        if (refus != null) {
            return refus;
        }
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = em
                .createNativeQuery("SELECT s.poste, DATE_FORMAT(s.debut, '%Y-%m-%d %H:%i:%s'), s.id, s.ip,"
                        + " CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))"
                        + " FROM t_session_utilisateur s LEFT JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID"
                        + " WHERE s.debut >= NOW() - INTERVAL " + PostesConnus.JOURS
                        + " DAY AND s.poste IS NOT NULL AND s.poste <> ''")
                .getResultList();
        List<PostesConnus.Connexion> c = new ArrayList<>(lignes.size());
        for (Object[] l : lignes) {
            c.add(new PostesConnus.Connexion(texte(l[0]), texte(l[1]), texte(l[2]), texte(l[4]), texte(l[3])));
        }
        JSONArray data = new JSONArray();
        for (Map<String, Object> m : PostesConnus.regrouper(c, PostesConnus.LIMITE)) {
            data.put(new JSONObject(m));
        }
        return Response
                .ok(new JSONObject().put("success", true).put("data", data).put("total", data.length()).toString())
                .build();
    }

    private static String texte(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}
