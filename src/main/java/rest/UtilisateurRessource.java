package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.UtilisateurAdminService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Administration des utilisateurs en REST : liste, creation, modification et reinitialisation de mot de passe. Remplace
 * les JSP webservices/sm_user/utilisateur (formats JSON et hachage de mot de passe identiques).
 */
@Path("v1/utilisateurs")
@Produces("application/json")
@Consumes("application/json")
public class UtilisateurRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private UtilisateurAdminService utilisateurAdminService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("true") @QueryParam("etat") boolean etat, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(utilisateurAdminService.listUsers(user, search, etat, start, limit).toString())
                .build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("str_LOGIN") String login, @FormParam("str_PASSWORD") String password,
            @DefaultValue("1") @FormParam("str_IDS") int ids, @FormParam("str_FIRST_NAME") String firstName,
            @FormParam("str_LAST_NAME") String lastName, @FormParam("lg_ROLE_ID") String roleId,
            @DefaultValue("1") @FormParam("lg_Language_ID") String languageId,
            @FormParam("str_LIEU_TRAVAIL") String emplacementId) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(utilisateurAdminService
                .createUser(login, password, ids, firstName, lastName, roleId, languageId, emplacementId).toString())
                .build();
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_USER_ID") String userId, @FormParam("str_LOGIN") String login,
            @DefaultValue("1") @FormParam("str_IDS") int ids, @FormParam("str_FIRST_NAME") String firstName,
            @FormParam("str_LAST_NAME") String lastName,
            @DefaultValue("") @FormParam("lg_Language_ID") String languageId,
            @DefaultValue("") @FormParam("str_LIEU_TRAVAIL") String emplacementId,
            @DefaultValue("") @FormParam("lg_ROLE_ID") String roleId) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(utilisateurAdminService
                .updateUser(userId, login, ids, firstName, lastName, languageId, emplacementId, roleId).toString())
                .build();
    }

    @POST
    @Path("delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response delete(@FormParam("lg_USER_ID") String userId) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(utilisateurAdminService.deleteUser(user, userId).toString()).build();
    }

    @POST
    @Path("update-password")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response updatePassword(@FormParam("lg_USER_ID") String userId, @FormParam("str_PASSWORD") String password) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(utilisateurAdminService.updatePassword(userId, password).toString()).build();
    }
}
