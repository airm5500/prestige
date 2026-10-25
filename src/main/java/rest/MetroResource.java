package rest;

import dal.TPrivilege;
import java.util.LinkedHashMap;
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
import util.CommonUtils;

/**
 * Metro (choix du 25/10) : menus et sous-menus de l'utilisateur connecte, pour la page general/metro/. Meme regle que
 * le menu de navigation (ws_tree_menu.jsp) : menus et sous-menus actifs du module 1, droit du menu et droit du
 * sous-menu portes par la session. Un menu sans aucun sous-menu permis n'est pas rendu.
 *
 * <p>
 * GET v1/metro -> {success, menus: [{id, libelle, sousMenus: [{composant, libelle, aide}]}]} ; sans session : 401.
 */
@Path("v1/metro")
@Produces(MediaType.APPLICATION_JSON)
@Stateless
public class MetroResource {

    @Inject
    private HttpServletRequest servletRequest;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @GET
    public Response menus() {
        if (Droits.utilisateur(servletRequest) == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new JSONObject().put("success", false).put("code", "SESSION").toString()).build();
        }
        List<TPrivilege> droits = Droits.privileges(servletRequest);
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = em.createNativeQuery(
                "SELECT m.lg_MENU_ID AS menu, m.str_DESCRIPTION AS menu_libelle, m.P_KEY AS menu_droit,"
                        + " s.str_COMPOSANT AS composant, s.str_DESCRIPTION AS libelle, s.str_VALUE AS aide, s.P_KEY AS droit"
                        + " FROM t_menu m JOIN t_sous_menu s ON s.lg_MENU_ID = m.lg_MENU_ID"
                        + " WHERE m.str_Status = 'enable' AND s.str_Status = 'enable' AND m.lg_MODULE_ID = '1'"
                        + " ORDER BY m.int_PRIORITY, m.lg_MENU_ID, s.int_PRIORITY, s.str_DESCRIPTION")
                .getResultList();
        Map<String, JSONObject> menus = new LinkedHashMap<>();
        for (Object[] l : lignes) {
            String pMenu = texte(l[2]), pSous = texte(l[6]), composant = texte(l[3]);
            if (composant.isEmpty() || !CommonUtils.hasAuthorityByName(droits, pMenu)
                    || !CommonUtils.hasAuthorityByName(droits, pSous)) {
                continue;
            }
            JSONObject menu = menus.computeIfAbsent(texte(l[0]),
                    id -> new JSONObject().put("id", id).put("libelle", texte(l[1])).put("sousMenus", new JSONArray()));
            String libelle = texte(l[4]), aide = texte(l[5]);
            JSONObject sous = new JSONObject().put("composant", composant).put("libelle", libelle);
            // comme le menu de navigation : l'explication, quand str_VALUE la porte (plus long que le libelle)
            if (aide.length() > libelle.length() + 5) {
                sous.put("aide", aide);
            }
            menu.getJSONArray("sousMenus").put(sous);
        }
        return Response.ok(new JSONObject().put("success", true).put("menus", new JSONArray(menus.values())).toString())
                .build();
    }

    private static String texte(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
