/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.MvtArticleParams;
import commonTasks.dto.Params;
import commonTasks.dto.QueryDTO;
import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MvtProduitService;
import rest.service.ProduitService;
import rest.service.dto.CreationProduitDTO;
import util.DateConverter;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v1/produit")
@Produces("application/json")
@Consumes("application/json")
public class ProduitRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    ProduitService produitService;
    @EJB
    MvtProduitService mvtProduitService;

    @GET
    @Path("produit-desactives")
    public Response produitDesactives(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        QueryDTO body = new QueryDTO();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(Constant.STATUT_DISABLE);
        body.setEmplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        JSONObject jsono = produitService.produitDesactives(body, false);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("enable-desactives/{id}")
    public Response activerProduitDesactiver(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = produitService.activerProduitDesactive(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("disable-produit/{id}")
    public Response desactiverProduitDesactiver(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = produitService.desactiverProduitDesactive(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("remove-desactive/{id}")
    public Response removeProduitDesactiver(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = produitService.supprimerProduitDesactive(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("validerretourfour")
    public Response validerRetourFournisseur(Params params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setOperateur(tu);
        JSONObject json = mvtProduitService.validerRetourFournisseur(params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("fabricants")
    public Response fabricants(@QueryParam(value = "query") String query) throws JSONException {
        JSONObject jsono = produitService.findAllFabricants(query);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("familles")
    public Response familles(@QueryParam(value = "query") String query) throws JSONException {
        JSONObject jsono = produitService.findAllFamilleArticle(query);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("rayons")
    public Response rayons(@QueryParam(value = "query") String query) throws JSONException {
        JSONObject jsono = produitService.findAllRayons(query);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring")
    public Response suivitMvtArticles(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "search") String search, @QueryParam(value = "categorieId") String categorieId,
            @QueryParam(value = "fabricantId") String fabricantId, @QueryParam(value = "rayonId") String rayonId
    // @QueryParam(value = "produitId") String produitId
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        MvtArticleParams params = new MvtArticleParams();
        params.setAll(false);
        params.setCategorieId(categorieId);
        params.setFabricantId(fabricantId);
        params.setSearch(search);
        params.setRayonId(rayonId);
        params.setLimit(limit);
        params.setStart(start);
        params.setDtEnd(LocalDate.parse(dtEnd));
        params.setDtStart(LocalDate.parse(dtStart));
        params.setMagasinId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        JSONObject jsono = produitService.suivitMvtArcticleViewDatas(params);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoringproduct")
    public Response detailMvt(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateViewDatas(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring-vente")
    public Response detailVentes(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateVentes(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring-ajust")
    public Response detailmonitoringajustpositif(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "produitId") String produitId,
            @QueryParam(value = "positif") boolean positif) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateAjustement(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), positif);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring-decon")
    public Response monitoringdecon(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId, @QueryParam(value = "positif") boolean positif)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateDecond(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), positif);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring-retour")
    public Response monitoringretour(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateRetourFour(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoringentresbl")
    public Response monitoringentresbl(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateEntree(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoringinventaire")
    public Response monitoringinventaire(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateInv(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), produitId,
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring-vente-annule")
    public Response monitoringventeannule(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "produitId") String produitId)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateAnnulation(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoringperimes")
    public Response monitoringperimes(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclatePerime(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("monitoring-retourdepot")
    public Response monitoringretourdepot(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "produitId") String produitId)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.suivitEclateRetourDepot(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                produitId, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("valorisation")
    public Response valorisationStock(@QueryParam(value = "mode") int mode,
            @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "lgFAMILLEARTICLEID") String lgFAMILLEARTICLEID,
            @QueryParam(value = "lgGROSSISTEID") String lgGROSSISTEID,
            @QueryParam(value = "lgZONEGEOID") String lgZONEGEOID, @QueryParam(value = "END") String end,
            @QueryParam(value = "BEGIN") String begin) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = produitService.valorisationStock(mode, LocalDate.parse(dtStart), lgGROSSISTEID,
                lgFAMILLEARTICLEID, lgZONEGEOID, end, begin, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        jsono.put("user", tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME()).put("dtCREATED",
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));

        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("retours-data")
    public Response loadRetouFournisseurs(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "fourId") String fourId,
            @QueryParam(value = "query") String query, @QueryParam(value = "filtre") String filtre)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (StringUtils.isEmpty(dtEnd)) {
            dtEnd = LocalDate.now().toString();
        }
        if (StringUtils.isEmpty(dtStart)) {
            dtStart = LocalDate.now().toString();
        }
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = DateConverter.hasAuthorityByName(lstTPrivilege, DateConverter.ACTION_DELETE_RETOUR);
        JSONObject json = mvtProduitService.loadetourFournisseur(dtStart, dtEnd, start, limit, fourId, query,
                asAuthority, filtre);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("create-detail")
    public Response createProduitDetail(CreationProduitDTO produit) {
        return Response.ok().entity(produitService.createProduitDetail(produit).toString()).build();
    }

    @POST
    @Path("create")
    public Response createProduit(CreationProduitDTO produit) {
        return Response.ok().entity(produitService.createProduit(produit).toString()).build();
    }

    @PUT
    @Path("create-detail/{id}")
    public Response updateProduitDetail(@PathParam("id") String id, CreationProduitDTO produit) {
        return Response.ok().entity(produitService.updateProduitDetail(produit, id).toString()).build();
    }

}
