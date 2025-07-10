/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleHeader;
import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.TiersPayantParams;
import dal.TPreenregistrementDetail;
import dal.TPrivilege;
import dal.TUser;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
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
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.GenerateTicketService;
import rest.service.SalesStatsService;
import rest.service.TvaService;
import util.CommonUtils;
import util.Constant;
import util.FunctionUtils;

/**
 *
 * @author Kobena
 */
@Path("v1/ventestats")
@Produces("application/json")
@Consumes("application/json")
public class SalesStatsRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    SalesStatsService salesService;
    @EJB
    GenerateTicketService generateTicketService;

    @EJB
    private TvaService tvaService;

    @GET
    @Path("preventes")
    public Response getDetails(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeVenteId") String typeVenteId,
            @DefaultValue(value = "is_Process") @QueryParam(value = "statut") String statut,
            @QueryParam(value = "nature") String nature) throws JSONException {
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        body.setNature(nature);
        body.setAll(false);
        body.setTypeVenteId(typeVenteId);
        JSONObject jsono = salesService.getPreVentes(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("annulations")
    public Response annulations(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "statut") String statut)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> hsAttribute = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(hsAttribute, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(hsAttribute, Constant.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }

        JSONObject jsono = salesService.annulations(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("remove/{id}")
    public Response delete(@PathParam("id") String id) throws JSONException {

        JSONObject json = salesService.delete(id);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("update/{venteId}/{statut}")
    public Response update(@PathParam("venteId") String venteId, @PathParam("statut") String statut)
            throws JSONException {
        JSONObject json = salesService.trash(venteId, statut);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("devis")
    public Response allDevis(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "statut") String statut)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }

        body.setAll(false);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);

        JSONObject jsono = salesService.getListeTPreenregistrement(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("preventes-depot")
    public Response preventeDepotOnly(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "statut") String statut) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        body.setAll(false);
        body.setTypeVenteId(typeVenteId);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        body.setDepotOnly(true);
        JSONObject jsono = salesService.getListeTPreenregistrement(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("depot/{id}")
    public Response getDepot(@PathParam("id") String id) throws JSONException {

        JSONObject json = salesService.findVenteById(id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("{id}")
    public Response findOne(@PathParam("id") String id) throws JSONException {

        JSONObject json = salesService.reloadVenteById(id);
        return Response.ok().entity(json.toString()).build();
    }

    private SalesStatsParams buildParams(int start, int limit, String query, String dtStart, String dtEnd,
            String hStart, String hEnd, boolean sansBon, boolean onlyAvoir, String typeVenteId, String nature,
            Boolean depotOnly, String typeDepotId, String depotId) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        boolean canCancel = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_ANNULER_VENTE);
        boolean modification = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_MODIFICATION_DE_VENTE);
        boolean modificationClientTp = CommonUtils.hasAuthorityByName(lstTPrivilege,
                Constant.P_BTN_UPDATE_VENTE_CLIENT_TP);
        boolean modificationVenteDate = CommonUtils.hasAuthorityByName(lstTPrivilege,
                Constant.P_BTN_UPDATE_VENTE_CLIENT_DATE);
        SalesStatsParams body = new SalesStatsParams();
        if (Objects.nonNull(depotOnly)) {
            body.setDepotOnly(depotOnly);
        }
        body.setCanCancel(canCancel);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(typeVenteId);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setSansBon(sansBon);
        body.setNature(nature);
        body.setOnlyAvoir(onlyAvoir);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        body.setModification(modification);
        body.setModificationClientTp(modificationClientTp);
        body.setModificationVenteDate(modificationVenteDate);
        body.setTypeDepotId(typeDepotId);
        body.setDepotId(depotId);
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }
        return body;
    }

    @GET
    public Response getAlls(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "sansBon") boolean sansBon,
            @QueryParam(value = "onlyAvoir") boolean onlyAvoir, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "nature") String nature, @QueryParam(value = "depotOnly") Boolean depotOnly,
            @QueryParam(value = "typeDepotId") String typeDepotId, @QueryParam(value = "depotId") String depotId)
            throws JSONException {
        SalesStatsParams body = buildParams(start, limit, query, dtStart, dtEnd, hStart, hEnd, sansBon, onlyAvoir,
                typeVenteId, nature, depotOnly, typeDepotId, depotId);
        JSONObject jsono = salesService.listeVentes(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("ticket/vno/{id}")
    public Response getTicket(@PathParam("id") String id) throws JSONException {
        JSONObject json = generateTicketService.lunchPrinterForTicket(id);
        return Response.ok().entity(json).build();
    }

    @GET
    @Path("ticket/vo/{id}")
    public Response getTicketVo(@PathParam("id") String id) throws JSONException {
        JSONObject json = generateTicketService.lunchPrinterForTicketVo(id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("avoirs")
    public Response getAllsAvoir(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "nature") String nature) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        boolean canCancel = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_ANNULER_VENTE);

        SalesStatsParams body = new SalesStatsParams();
        body.setCanCancel(canCancel);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(null);
        body.setNature(nature);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setSansBon(false);
        body.setOnlyAvoir(true);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtStart(LocalDate.parse(dtStart));
            body.setDtEnd(LocalDate.parse(dtEnd));

        } catch (Exception e) {
        }
        JSONObject jsono = salesService.listeVentes(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("tvastat")
    @Deprecated
    public Response tvastat(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "typeVente") String typeVente) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (!tvaService.isExcludTiersPayantActive()) {
            Params params = new Params();
            params.setDtEnd(dtEnd);
            params.setDtStart(dtStart);
            params.setOperateur(tu);
            params.setRef(typeVente);
            JSONObject json = salesService.tvasViewData2(params);
            return Response.ok().entity(json.toString()).build();
        } else {
            JSONObject json = tvaService.tvaData(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), false, null);
            return Response.ok().entity(json.toString()).build();
        }

    }

    @PUT
    @Path("modifiertierspayant/{id}")
    public Response modifiertpayantvente(@PathParam("id") String venteId, ClotureVenteParams params)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = salesService.modifiertypevente(venteId, params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("venteTierspayantData/{id}")
    public Response venteTierspayantData(@PathParam("id") String venteId) throws JSONException {

        List<TiersPayantParams> data = salesService.venteTierspayantData(venteId);
        JSONObject json = new JSONObject();
        json.put("total", data.size());
        json.put("data", data);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("ventesordonnanciers")
    public Response findAllVenteOrdonnancier(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "medecinId") String medecinId) throws JSONException {

        JSONObject jsono = salesService.findAllVenteOrdonnancier(medecinId, dtStart, dtEnd, query, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("article-vendus")
    public Response articlesVendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "produitId") String produitId) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        SalesStatsParams body = new SalesStatsParams();
        body.setUserId(tu);
        body.setUser(user);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(null);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setStock(stock);
        body.setRayonId(rayonId);
        body.setTypeTransaction(typeTransaction);
        body.setStockFiltre(stockFiltre);
        body.setPrixachatFiltre(prixachatFiltre);
        body.setNbre(nbre);
        body.setProduitId(produitId);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
        } catch (Exception e) {
        }
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtStart(LocalDate.parse(dtStart));

        } catch (Exception e) {
        }
        JSONObject jsono = salesService.articlesVendus(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("article-vendus-recap")
    public Response articlesVendusRecap(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "qteVendu") Integer qteVendu) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        SalesStatsParams body = new SalesStatsParams();
        body.setUserId(tu);
        body.setUser(user);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(null);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setStock(stock);
        body.setRayonId(rayonId);
        body.setTypeTransaction(typeTransaction);
        body.setStockFiltre(stockFiltre);
        body.setPrixachatFiltre(prixachatFiltre);
        body.setQteVendu(qteVendu);
        body.setNbre(nbre);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
        } catch (Exception e) {
        }
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtStart(LocalDate.parse(dtStart));

        } catch (Exception e) {
        }
        body.setDepotOnly(false);
        JSONObject jsono = salesService.articlesVendusRecap(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("suggerer")
    public Response suggerer(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "hStart") String hStart, @QueryParam(value = "hEnd") String hEnd,
            @QueryParam(value = "user") String user, @QueryParam(value = "query") String query,
            @QueryParam(value = "typeTransaction") String typeTransaction, @QueryParam(value = "nbre") int nbre,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "stock") Integer stock, @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "qteVendu") Integer qteVendu, @QueryParam(value = "isReappro") Boolean isReappro) {
        SalesStatsParams body = new SalesStatsParams();
        body.setUser(user);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(null);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setStock(stock);
        body.setRayonId(rayonId);
        body.setTypeTransaction(typeTransaction);
        body.setStockFiltre(stockFiltre);
        body.setPrixachatFiltre(prixachatFiltre);
        body.setNbre(nbre);
        body.setQteVendu(qteVendu);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
        } catch (Exception e) {
        }
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtStart(LocalDate.parse(dtStart));

        } catch (Exception e) {
        }
        JSONObject json = salesService.articleVendusASuggerer(body, Objects.requireNonNullElse(isReappro, false));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("devis/csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam("id") String venteId, @QueryParam("ref") String ref) {
        StreamingOutput output = (OutputStream out) -> {
            try {
                List<TPreenregistrementDetail> detailses = salesService.venteDetailByVenteId(venteId);
                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';').withHeader(ArticleHeader.class)
                        .print(writer)) {

                    detailses.forEach(f -> {
                        try {
                            printer.printRecord(f.getLgFAMILLEID().getIntCIP(), f.getIntQUANTITY());

                        } catch (IOException ex) {

                        }
                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "devis_" + ref + "_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    @GET
    @Path("find-one/{id}")
    public Response getOne(@PathParam("id") String venteId) {

        JSONObject json = FunctionUtils.returnData(salesService.getOne(venteId));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("depot-amount")
    public Response getDepotAmount(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "sansBon") boolean sansBon,
            @QueryParam(value = "onlyAvoir") boolean onlyAvoir, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "nature") String nature, @QueryParam(value = "depotOnly") Boolean depotOnly,
            @QueryParam(value = "typeDepotId") String typeDepotId, @QueryParam(value = "depotId") String depotId)
            throws JSONException {
        SalesStatsParams body = buildParams(start, limit, query, dtStart, dtEnd, hStart, hEnd, sansBon, onlyAvoir,
                typeVenteId, nature, depotOnly, typeDepotId, depotId);
        JSONObject jsono = new JSONObject();
        long amount = salesService.montantDepot(body);
        jsono.put("amount", amount);
        return Response.ok().entity(jsono.toString()).build();
    }

}
