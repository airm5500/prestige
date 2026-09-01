/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.MvtCaisseDTO;
import commonTasks.dto.Params;
import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
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
import rest.service.BalanceService;
import rest.service.CaisseService;
import rest.service.GenerateTicketService;
import rest.service.ListCaisseService;
import rest.service.dto.BalanceParamsDTO;
import rest.service.dto.CoffreCaisseDTO;
import rest.service.dto.MvtCaisseSummaryDTO;
import util.DateConverter;
import util.Constant;

/**
 *
 * @author Kobena
 */
@Path("v1/caisse")
@Produces("application/json")
@Consumes("application/json")
public class CaisseRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private CaisseService caisseService;

    @EJB
    GenerateTicketService generateTicketService;
    @EJB
    private BalanceService balanceService;
    @EJB
    private ListCaisseService listCaisseService;

    public TUser getUser() {
        return Utils.getConnectedUser(servletRequest);
    }

    @GET
    @Path("listecaisse")
    public Response geListeCaisse(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "page") int p, @QueryParam(value = "user") String lgUserId,
            @QueryParam(value = "reglement") String lgTypeReglementId,
            @QueryParam(value = "startDate") String dtDateDebut, @QueryParam(value = "endDate") String dtDateFin,
            @QueryParam(value = "startH") String hdebut, @QueryParam(value = "endH") String hfin,
            @QueryParam(value = "findClient") boolean findClient) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        CaisseParamsDTO caisseParams = new CaisseParamsDTO();
        caisseParams.setLimit(limit);
        caisseParams.setStart(start);
        caisseParams.setAll(false);

        if (!StringUtils.isEmpty(dtDateFin)) {
            caisseParams.setEnd(LocalDate.parse(dtDateFin));
        }
        if (!StringUtils.isEmpty(dtDateDebut)) {
            caisseParams.setStartDate(LocalDate.parse(dtDateDebut));
        }
        if (!StringUtils.isEmpty(hdebut)) {
            caisseParams.setStartHour(LocalTime.parse(hdebut));
        }
        if (!StringUtils.isEmpty(hfin)) {
            caisseParams.setStartEnd(LocalTime.parse(hfin));
        }
        if (!StringUtils.isEmpty(lgTypeReglementId)) {
            caisseParams.setTypeReglementId(lgTypeReglementId);
        }
        if (!StringUtils.isEmpty(lgUserId)) {
            caisseParams.setUtilisateurId(lgUserId);
        }
        caisseParams.setFindClient(findClient);
        caisseParams.setEmplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

        JSONObject json = listCaisseService.donneeCaisses(caisseParams);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("balancesalecash")
    public Response balanceCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("point-mobile-money/autorisation")
    public Response pointMobileMoneyAutorisation() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        boolean authorize = (tu != null) && caisseService.hasPointMobileMoneyPrivilege(tu);
        return Response.ok().entity(new JSONObject().put("authorize", authorize).toString()).build();
    }

    @GET
    @Path("point-mobile-money")
    public Response pointMobileMoney() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (!caisseService.hasPointMobileMoneyPrivilege(tu)) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Vous n'avez pas le privilège requis pour le point mobile money").toString())
                    .build();
        }
        return Response.ok().entity(caisseService.pointMobileMoney(tu).toString()).build();
    }

    @PUT
    @Path("validatecloture/{id}")
    public Response closeResumeCaisse(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = caisseService.closeCaisse(tu, id);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("rollbackclose/{id}")
    public Response rolBack(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = caisseService.rollbackcloseCaisse(tu, id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("resumecaisse")
    public Response resumecaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "userId") String userId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        LocalDate dtSt = LocalDate.now();
        LocalDate dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean cancel = DateConverter.hasAuthorityByName(lstTPrivilege, Constant.P_BT_ANNULER_CLOTURE_CAISSE);
        boolean allActivitis = Constant.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        JSONObject json = caisseService.getResumeCaisse(dtSt, dtEn, tu, cancel, allActivitis, start, limit, false,
                userId);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("tableauboard")
    public Response tableauBoard(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd,
            @DefaultValue("false") @QueryParam(value = "monthly") boolean monthly) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = this.balanceService.tableauBoardDatas(BalanceParamsDTO.builder().dtStart(dtStart).dtEnd(dtEnd)
                .byMonth(monthly).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());

        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("addmvtCaisse")
    public Response addMvtCaisse(MvtCaisseDTO caisseDTO) throws Exception {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = caisseService.createMvt(caisseDTO, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("attribuerfondcaisse/{id}")
    public Response attribuerFondCaisse(@PathParam("id") String id, Params p) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = caisseService.attribuerFondDeCaisse(id, tu, p.getValue());
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("ouvrir-caisse")
    public Response validationFondCaisse(CoffreCaisseDTO coffreCaisse) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = new JSONObject();

        json.put("mvtId", caisseService.ouvrirCaisse(tu, coffreCaisse));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("rapport-gestion")
    public Response rapportGestion(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Params p = new Params();
        p.setDtStart(dtStart);
        p.setDtEnd(dtEnd);
        p.setOperateur(tu);
        JSONObject json = caisseService.rapportGestionViewData(p);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("tickez")
    public Response ticketZ(Params params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setOperateur(tu);
        JSONObject json = generateTicketService.ticketZ(params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("mvtcaisses")
    public Response mvtcaisses(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "user") String lgUSERID, @QueryParam(value = "dtStart") String dtDebut,
            @QueryParam(value = "dtEnd") String dtFin, @QueryParam(value = "typeMvtId") String typeMvtId) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        CaisseParamsDTO caisseParams = new CaisseParamsDTO();
        caisseParams.setLimit(limit);
        caisseParams.setStart(start);

        if (!StringUtils.isEmpty(dtFin)) {
            caisseParams.setEnd(LocalDate.parse(dtFin));
        }
        if (!StringUtils.isEmpty(dtDebut)) {
            caisseParams.setStartDate(LocalDate.parse(dtDebut));
        }
        if (!StringUtils.isEmpty(lgUSERID)) {
            caisseParams.setUtilisateurId(lgUSERID);
        }
        if (!StringUtils.isEmpty(typeMvtId)) {
            caisseParams.setTypeMvtId(typeMvtId);
        }

        caisseParams.setEmplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

        JSONObject json = caisseService.mouvementCaisses(caisseParams);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("ca/ug")
    public Response ugs(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        JSONObject json = caisseService.venteUg(dtSt, dtEn, null);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("balancesalecash/carnet")
    public Response balanceCaisseCarnet(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("balancesalecash/carnet-depot")
    public Response balanceCaisseCarnetDepot(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {

        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).showAllAmount(true).build());

        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Types demandes par l'ecran, ou les trois natures du journal de caisse quand il n'en demande aucun.
     *
     * <p>
     * L'ecran envoyait lui-meme la liste des trois identifiants, tiree de sa liste deroulante. Tant que celle-ci
     * n'etait pas chargee, il n'envoyait rien et le journal montrait TOUTES les natures - acomptes, avoirs, reglements
     * differes compris. Le filtre par defaut est desormais pose ici : il ne depend plus de l'ordre d'arrivee des
     * requetes de l'ecran. Un type explicitement choisi reste prioritaire.
     */
    private String typesDuJournal(String typeMvtId) {
        return typeMvtId == null || typeMvtId.trim().isEmpty() ? caisseService.typesDuJournalCaisse() : typeMvtId;
    }

    @GET
    @Path("mvts-others")
    public Response fetchMvtcaisses(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "user") String lgUSERID, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "userId") String userId, @QueryParam(value = "checked") boolean checked,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeMvtId") String typeMvtId) {
        JSONObject json = caisseService.getAllMvtCaisses(dtStart, dtEnd, checked, userId, typesDuJournal(typeMvtId),
                limit, start);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("mvts-others-summary")
    public Response fetchMvtcaisseSummary(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "user") String lgUSERID,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "userId") String userId,
            @QueryParam(value = "checked") boolean checked, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "typeMvtId") String typeMvtId) {
        JSONObject json = new JSONObject();
        // Meme filtre par defaut que la liste : sans cela les totaux porteraient sur des natures
        // que la grille n'affiche pas, et ne correspondraient plus a ce qui est sous les yeux.
        MvtCaisseSummaryDTO caisseSummary = caisseService.getAllMvtCaissesSummary(dtStart, dtEnd, userId,
                typesDuJournal(typeMvtId), checked);
        json.put("data", new JSONObject(caisseSummary));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("ticke-mvt-caisse")
    public Response ticketMvtCaisse(@QueryParam(value = "mvtCaisseId") String mvtCaisseId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        generateTicketService.printMvtCaisse(mvtCaisseId, tu);
        return Response.ok().build();
    }

    @POST
    @Path("fetch-tickez")
    public Response fetchTicketZ(Params params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setOperateur(tu);
        JSONObject json = generateTicketService.fetchTicketZ(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("send-sms")
    public Response sendSms(Params params) throws JSONException {
        generateTicketService.sendToSms(params);
        return Response.ok().entity("Envoie en cours").build();
    }
}
