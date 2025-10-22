/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import bll.Util;
import dal.TPrivilege;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import rest.service.TiersPayantService;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Path("v1/tierspayant")
@Produces("application/json")
@Consumes("application/json")
public class TiersPayantRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private TiersPayantService tiersPayantService;

    @GET
    @Path("list")
    @Produces("application/json")
    public Response fetchList(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "search_value") String search,
            @QueryParam(value = "lg_TYPE_TIERS_PAYANT_ID") String typeTierspayant,
            @QueryParam(value = "cmb_TYPE_TIERS_PAYANT") String id) {
        HttpSession hs = servletRequest.getSession();
        List<TPrivilege> privileges = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean delete = DateConverter.hasAuthorityById(privileges, Util.ACTIONDELETE);
        boolean btnDesactive = DateConverter.hasAuthorityByName(privileges, Constant.P_BTN_DESACTIVER_TIERS_PAYANT);

        if (StringUtils.isNoneEmpty(query)) {
            search = query;
        }

        if (StringUtils.isNoneEmpty(id)) {
            typeTierspayant = id;
        }

        return Response.ok().entity(
                tiersPayantService.fetchList(start, limit, search, typeTierspayant, btnDesactive, delete).toString())
                .build();
    }

    @GET
    @Path("encours")
    @Produces("application/json")
    public Response encours(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search_value") String search, @QueryParam(value = "tp") String lg_TIERS_PAYANT_ID) {
        HttpSession hs = servletRequest.getSession();

        return Response.ok().entity(tiersPayantService.getAccount(lg_TIERS_PAYANT_ID)).build();
    }

}
