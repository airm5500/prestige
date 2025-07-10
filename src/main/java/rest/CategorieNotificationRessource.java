/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.CategorieNotification;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.repo.CategorieNotificationRepo;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/categorie-notifications")
@Produces("application/json")
@Consumes("application/json")
public class CategorieNotificationRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private CategorieNotificationRepo categorieNotificationRepo;

    @GET
    public Response findAll() {
        List<CategorieNotification> data = categorieNotificationRepo.findAll();
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    public Response update(CategorieNotification categorieNotification) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        categorieNotification = categorieNotificationRepo.updatecategorieNotification(categorieNotification);
        if (categorieNotification != null) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }

}
