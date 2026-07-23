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
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Gestion des profils (roles) en REST : liste, creation, modification, duplication et attribution des privileges.
 * Remplace les JSP webservices/sm_user/role (formats JSON identiques, memes regles de visibilite).
 */
@Path("v1/roles")
@Produces("application/json")
@Consumes("application/json")
public class RoleRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private rest.service.RoleService roleService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("true") @QueryParam("actifs") boolean actifs,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(roleService.listRoles(user, search, actifs, start, limit).toString()).build();
    }

    @GET
    @Path("est-admin")
    public Response estAdmin() {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.isAdmin(user).toString()).build();
    }

    @POST
    @Path("toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleStatut(@FormParam("lg_ROLE_ID") String roleId, @FormParam("actif") boolean actif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.toggleRoleStatus(user, roleId, actif).toString()).build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("str_NAME") String name, @FormParam("str_DESIGNATION") String designation,
            @FormParam("str_TYPE") String type) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.createRole(name, designation, type).toString()).build();
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_ROLE_ID") String roleId, @FormParam("str_NAME") String name,
            @FormParam("str_DESIGNATION") String designation, @FormParam("str_TYPE") String type) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.updateRole(roleId, name, designation, type).toString()).build();
    }

    @POST
    @Path("duplicate")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response duplicate(@FormParam("lg_ROLE_ID") String roleId, @FormParam("str_NAME") String name,
            @FormParam("str_DESIGNATION") String designation) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.duplicateRole(user, roleId, name, designation).toString()).build();
    }

    @POST
    @Path("delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response delete(@FormParam("lg_ROLE_ID") String roleId) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.deleteRole(user, roleId).toString()).build();
    }

    @GET
    @Path("privileges")
    public Response privileges(@QueryParam("lg_ROLE_ID") String roleId, @QueryParam("search_value") String searchValue,
            @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(roleService.rolePrivileges(user, roleId, search, start, limit).toString()).build();
    }

    @POST
    @Path("privileges/toggle")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response togglePrivilege(@FormParam("lg_ROLE_ID") String roleId,
            @FormParam("lg_PRIVELEGE_ID") String privilegeId, @FormParam("checked") boolean checked) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.toggleRolePrivilege(user, roleId, privilegeId, checked).toString())
                .build();
    }

    @POST
    @Path("privileges/toggle-all")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleAll(@FormParam("lg_ROLE_ID") String roleId, @FormParam("search_value") String searchValue,
            @FormParam("checked") boolean checked) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(roleService.toggleAllRolePrivileges(user, roleId, searchValue, checked).toString())
                .build();
    }
}
