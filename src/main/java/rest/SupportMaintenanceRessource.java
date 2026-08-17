/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.TRoleUser;
import dal.TUser;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportMaintenanceService;
import util.Constant;

/**
 * Actions de maintenance du Centre de Support. Reservees aux profils Administrateur / Super Administrateur (verifie
 * cote serveur en plus de la restriction de menu).
 *
 * @author koben
 */
@Path("v1/support/maintenance")
@Produces("application/json")
@Consumes("application/json")
public class SupportMaintenanceRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SupportMaintenanceService supportMaintenanceService;

    @GET
    @Path("counts")
    public Response counts() {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (!isAdmin(user)) {
            return Response.ok().entity(ResultFactory.getFailResult("Action réservée aux administrateurs")).build();
        }
        Map<String, Object> counts = supportMaintenanceService.counts();
        return Response.ok().entity(ResultFactory.getSuccessResult(counts, 1)).build();
    }

    /**
     * Etat du dossier des pieces jointes et volume liberable, a consulter AVANT de lancer la purge.
     */
    @GET
    @Path("pieces-jointes")
    public Response piecesJointes(@QueryParam("jours") Integer jours) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (!isAdmin(user)) {
            return Response.ok().entity(ResultFactory.getFailResult("Action réservée aux administrateurs")).build();
        }
        Map<String, Object> comptes = supportMaintenanceService.comptesPiecesJointes(anciennete(jours));
        return Response.ok().entity(ResultFactory.getSuccessResult(comptes, 1)).build();
    }

    @POST
    @Path("vider")
    public Response vider(@QueryParam("action") String action, @QueryParam("jours") Integer jours) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (!isAdmin(user)) {
            return Response.ok().entity(ResultFactory.getFailResult("Action réservée aux administrateurs")).build();
        }
        try {
            String auteur = StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                    + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")";
            Map<String, Object> resultat;
            if (SupportMaintenanceService.ACTION_PIECES_JOINTES.equals(action)) {
                resultat = supportMaintenanceService.viderPiecesJointes(anciennete(jours), auteur);
            } else {
                resultat = supportMaintenanceService.vider(action, auteur);
            }
            return Response.ok().entity(ResultFactory.getSuccessResult(resultat, 1)).build();
        } catch (IllegalArgumentException e) {
            return Response.ok().entity(ResultFactory.getFailResult(e.getMessage())).build();
        }
    }

    private int anciennete(Integer jours) {
        return jours != null && jours > 0 ? jours : SupportMaintenanceService.PIECES_JOINTES_JOURS_DEFAUT;
    }

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    /**
     * Vrai pour le compte systeme '00' et les profils Administrateur / Super Administrateur (detection par prefixe,
     * couvre les noms suffixes "... du systeme").
     */
    private boolean isAdmin(TUser user) {
        if ("00".equals(user.getLgUSERID())) {
            return true;
        }
        try {
            for (TRoleUser roleUser : user.getTRoleUserCollection()) {
                if (roleUser.getLgROLEID() != null
                        && Constant.STATUT_ENABLE.equalsIgnoreCase(roleUser.getLgROLEID().getStrSTATUT())) {
                    String name = roleUser.getLgROLEID().getStrNAME();
                    if (bll.userManagement.user.isAdminRole(name) || bll.userManagement.user.isSuperAdminRole(name)) {
                        return true;
                    }
                }
            }
        } catch (Exception ignore) {
        }
        return false;
    }
}
