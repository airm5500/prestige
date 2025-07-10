/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.CategorieAyantdroitDTO;
import commonTasks.dto.ComboDTO;
import commonTasks.dto.ReglementDTO;
import commonTasks.dto.RemiseDTO;
import commonTasks.dto.RisqueDTO;
import commonTasks.dto.TypeRemiseDTO;
import commonTasks.dto.UserDTO;
import dal.TEmplacement;
import dal.TMotifRetour;
import dal.TNatureVente;
import dal.TPrivilege;
import dal.TTypeVente;
import dal.TUser;
import dal.TVille;
import dal.MotifAjustement;
import dal.MotifRetourCarnet;
import java.time.LocalDate;
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
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CommonService;
import rest.service.LogService;
import util.CommonUtils;

import util.Constant;

/**
 *
 * @author Kobena
 */
@Path("v1/common")
@Produces("application/json")
@Consumes("application/json")
public class CommonRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    CommonService commonService;
    @EJB
    LogService logService;

    @GET
    @Path("reglement")
    public Response getAll() {
        List<ReglementDTO> data = commonService.findReglements();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("groupefournisseurs")
    public Response getGroupefournisseurs() {
        List<ComboDTO> data = commonService.loadGroupeFournisseur();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("autorisation-prix-vente")
    public Response autorisationPrixVente() {
        HttpSession hs = servletRequest.getSession();
        Boolean hasAutority = (Boolean) hs.getAttribute(Constant.UPDATE_PRICE);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(hasAutority, 1)).build();
    }

    @GET
    @Path("natures")
    public Response natures() {
        List<TNatureVente> data = commonService.findNatureVente();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("alltypeventes")
    public Response findAlltypeVentes() {
        List<TTypeVente> data = commonService.findAllTypeVente();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("typeventes")
    public Response typeVentes() {
        List<TTypeVente> data = commonService.findTypeVente();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("typeremises")
    public Response typeRemises() {
        List<TypeRemiseDTO> data = commonService.findAllTTypeRemises();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("remises-client")
    public Response remisesclient() {
        List<RemiseDTO> data = commonService.findAllRemise();
        data.add(new RemiseDTO(null, "SANS REMISE"));
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("remises")
    public Response remises(@QueryParam("typeId") String typeId) {
        List<RemiseDTO> data = commonService.findAllRemise(typeId);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("users")
    public Response getUsers(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        TEmplacement emplacement = tu.getLgEMPLACEMENTID();
        long total = commonService.findUsers(query, emplacement.getLgEMPLACEMENTID());
        List<UserDTO> data = commonService.findUsers(start, limit, query, emplacement.getLgEMPLACEMENTID());
        return Response.ok().entity(ResultFactory.getSuccessResult(data, total)).build();
    }

    @GET
    @Path("villes")
    public Response getVille(@QueryParam(value = "query") String query) {
        List<TVille> data = commonService.findVilles(query);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("categorie-ayant-droit")
    public Response getCategorieAyantDroits(@QueryParam(value = "query") String query) {
        List<CategorieAyantdroitDTO> data = commonService.findCategorieAyantdroits(query);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("risques")
    public Response getRisques(@QueryParam(value = "query") String query) {
        List<RisqueDTO> data = commonService.findRisques(query);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("vente-sansbon")
    public Response venteSansBon() {
        Boolean btn = commonService.sansBon();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(btn, 1)).build();
    }

    @GET
    @Path("maximun-produit")
    public Response maximunproduit() throws JSONException {
        Integer maxi = commonService.maximunproduit();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        JSONObject json = new JSONObject();
        json.put("data", maxi).put("success", true);
        return Response.ok().cacheControl(cc).entity(json.toString()).build();
    }

    @GET
    @Path("reglement-differes")
    public Response listeReglementDifferes() {
        List<ReglementDTO> data = commonService.findReglements("");
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("typedevis")
    public Response typedevis() {
        List<TTypeVente> data = commonService.typeventeDevis();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("log-filtres")
    public Response logFilters(@QueryParam(value = "query") String query) throws JSONException {

        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        JSONObject json = logService.filtres(query);

        return Response.ok().cacheControl(cc).entity(json.toString()).build();
    }

    @GET
    @Path("logs")
    public Response logs(@QueryParam(value = "query") String query, @QueryParam(value = "userId") String userId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "criteria") int criteria) throws JSONException {
        LocalDate dtSt = LocalDate.now();
        LocalDate dtEd = dtSt;
        if (dtStart != null && !"".equals(dtStart)) {
            dtSt = LocalDate.parse(dtStart);
        }
        if (dtEnd != null && !"".equals(dtEnd)) {
            dtEd = LocalDate.parse(dtEnd);
        }
        JSONObject json = logService.logs(query, dtSt, dtEd, start, limit, userId, criteria);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("grossiste")
    public Response loadFournisseur(@QueryParam(value = "query") String query) throws JSONException {
        List<ComboDTO> data = commonService.loadFournisseur(query);
        data.add(new ComboDTO("ALL", "Tous"));
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("rayons")
    public Response loadRayons(@QueryParam(value = "query") String query) throws JSONException {
        List<ComboDTO> data = commonService.loadRayons(query);
        data.add(new ComboDTO("ALL", "Tous"));
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("famillearticles")
    public Response familleArticles(@QueryParam(value = "query") String query) throws JSONException {
        List<ComboDTO> data = commonService.familleArticles(query);
        data.add(new ComboDTO("ALL", "Tous"));
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("laboratoireproduits")
    public Response laboratoireproduits(@QueryParam(value = "query") String query) throws JSONException {
        List<ComboDTO> data = commonService.laboratoiresProduits(query);
        data.add(new ComboDTO(" ", "Tous"));
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("gammeproduits")
    public Response gammeProduits(@QueryParam(value = "query") String query) throws JSONException {
        List<ComboDTO> data = commonService.gammeProduits(query);
        data.add(new ComboDTO(" ", "Tous"));
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("datemisajour")
    public Response datemisajour() throws JSONException {
        JSONObject json = commonService.findDateMiseAJour();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(json.toString()).build();
    }

    @GET
    @Path("autorisations/showstock")
    public Response autorisationAfficherStock() {
        HttpSession hs = servletRequest.getSession();
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean afficherStockVente = CommonUtils.hasAuthorityByName(lstTPrivilege,
                Constant.P_AFFICHER_STOCK_A_LA_VENTE);
        return Response.ok().entity(ResultFactory.getSuccessResult(afficherStockVente, 1)).build();
    }

    @GET
    @Path("checkug")
    public Response checkUg() throws JSONException {
        boolean checkug = commonService.checkUg();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(checkug, 1)).build();
    }

    @GET
    @Path("motifs-retour")
    public Response motifRetour() {
        List<TMotifRetour> data = commonService.motifsRetour();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("type-ajustements")
    public Response allTypeAjustement() {
        List<MotifAjustement> data = commonService.findAllTypeAjustements();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("motif-retour-carnet")
    public Response motifRetourcarnet() {
        List<MotifRetourCarnet> data = commonService.motifRetourCarnets();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("common")
    public Response gestionParticuliere() throws JSONException {
        boolean checkug = commonService.isNormalUse();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(checkug, 1)).build();
    }

    @GET
    @Path("type-reglements")
    public Response listeTypeReglements() {
        List<ComboDTO> data = commonService.findAllTypeReglement();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("is-authorized")
    public Response checkAction(@QueryParam(value = "action") String action) {
        HttpSession hs = servletRequest.getSession();
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean allowed = CommonUtils.hasAuthorityByName(lstTPrivilege, action);

        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(allowed)).build();

    }
}
