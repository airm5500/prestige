/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.EntreeStockDetailFiltre;
import commonTasks.dto.Params;
import dal.TUser;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CommandeService;
import rest.service.OrderService;
import rest.service.dto.AddLot;
import rest.service.dto.CommandeCsvDTO;
import rest.service.dto.CommandeFiltre;
import rest.service.dto.CommandeIdsDTO;
import rest.service.dto.DeleteLot;
import rest.service.dto.OrderDetailDTO;
import util.Constant;

/**
 * @author DICI
 */
@Path("v1/commande")
@Produces("application/json")
@Consumes("application/json")
public class CommandeRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    CommandeService commandeService;
    @EJB
    OrderService orderService;

    @PUT
    @Path("validerbl/{id}")
    public Response cloturerBonLivration(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        JSONObject json = commandeService.cloturerBonLivraison(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("clotureinventaire/{id}")
    public Response cloturerInventaire(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        JSONObject json = commandeService.cloturerInvetaire(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("cip")
    public Response updateCip(Params params) throws JSONException {

        JSONObject json = commandeService.createProduct(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("creerbl")
    public Response creerBl(Params params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        params.setOperateur(tu);
        JSONObject json = orderService.creerBonLivraison(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("updateorderitem")
    public Response modifierProduitCommande(ArticleDTO dto) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        try {
            orderService.modificationProduitCommandeEncours(dto, tu);
            return Response.ok().entity(new JSONObject().put("success", true).toString()).build();
        } catch (Exception e) {

            return Response.ok().entity(new JSONObject().put("success", false).toString()).build();
        }

    }

    @POST
    @Path("update/scheduled")
    public Response updateScheduled(Params params) throws JSONException {

        JSONObject json = orderService.updateScheduled(params.getRef(), params.isScheduled());
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("commande-en-cours-items")
    public Response getCommandeEncours(@DefaultValue("ALL") @QueryParam(value = "filtre") CommandeFiltre filtre,
            @QueryParam(value = "orderId") String orderId, @QueryParam(value = "start") int start,
            @QueryParam(value = "query") String query, @QueryParam(value = "limit") int limit) throws JSONException {

        return Response.ok().entity(orderService.fetchOrderItems(filtre, orderId, query, start, limit).toString())
                .build();
    }

    @POST
    @Path("orderitem-prix-vente")
    public Response modifierProduitPrixVenteCommandeEnCours(ArticleDTO dto) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        try {
            orderService.modifierProduitPrixVenteCommandeEnCours(dto, tu);
            return Response.ok().entity(new JSONObject().put("success", true).toString()).build();

        } catch (Exception e) {

            return Response.ok().entity(new JSONObject().put("success", false).toString()).build();
        }

    }

    @GET
    @Path("list")
    public Response findAll(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) {

        return Response.ok().entity(this.orderService
                .fetch(query, Set.of(Constant.STATUT_IS_PROGRESS, Constant.STATUT_PHARMA), start, limit).toString())
                .build();
    }

    @DELETE
    @Path("item/{id}")
    public Response delete(@PathParam("id") String id) throws JSONException {

        this.orderService.removeItem(id);
        return Response.ok().build();
    }

    @GET
    @Path("amount/{id}")
    public Response getCommandeAmount(@PathParam("id") String id) throws JSONException {

        return Response.ok().entity(this.orderService.getCommandeAmount(id).toString()).build();
    }

    @POST
    @Path("item/add")
    public Response addItem(OrderDetailDTO orderDetail) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        return Response.ok().entity(this.orderService.addItem(orderDetail, tu).toString()).build();
    }

    @GET
    @Path("list/passees")
    public Response findCommandePassees(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) {
        return Response.ok()
                .entity(this.orderService.fetch(query, Set.of(Constant.STATUT_PASSED), start, limit).toString())
                .build();
    }

    @GET
    @Path("export-csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam("id") String commandId) {
        Map<String, List<CommandeCsvDTO>> map = orderService.commandeEncoursCsv(commandId);
        StreamingOutput output = (OutputStream out) -> {
            try {

                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';').print(writer)) {

                    map.forEach((k, v) -> {
                        v.forEach(o -> {
                            try {
                                printer.printRecord(o.getCode(), o.getQte());
                            } catch (IOException ex) {
                                Logger.getLogger(CommandeRessource.class.getName()).log(Level.SEVERE, null, ex);
                            }
                        });

                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };

        String filename = "commande_" + map.keySet().stream().findFirst().get() + "_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("H_mm_ss")) + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    @GET
    @Path("statut/{id}/passe")
    public Response passerCommande(@PathParam("id") String id) throws JSONException {

        this.orderService.passerLaCommande(id);
        return Response.ok().build();
    }

    @GET
    @Path("statut/{id}/rollback")
    public Response passerCommandeEnCours(@PathParam("id") String id) throws JSONException {

        this.orderService.changerEnCommandeEnCours(id);
        return Response.ok().build();
    }

    @DELETE
    @Path("order/{id}")
    public Response deleteOrder(@PathParam("id") String id) throws JSONException {

        this.orderService.removeOrder(id);
        return Response.ok().build();
    }

    @GET
    @Path("transform-order/{id}")
    public Response transformSuggestionToOrder(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        this.orderService.transformSuggestionToOrder(id, tu);
        return Response.ok().build();
    }

    @POST
    @Path("merge-order")
    public Response mergeOrder(CommandeIdsDTO commandeIds) throws JSONException {

        this.orderService.mergeOrder(commandeIds);
        return Response.ok().build();
    }

    @GET
    @Path("change-grossiste")
    public Response changeGrossiste(@QueryParam(value = "orderId") String orderId,
            @QueryParam(value = "grossisteId") String grossisteId) throws JSONException {

        this.orderService.changeGrossiste(orderId, grossisteId);
        return Response.ok().build();
    }

    @GET
    @Path("list-bons")
    public Response getListBons(@QueryParam(value = "query") String query) throws JSONException {

        return Response.ok().entity(orderService.getListBons(Constant.STATUT_ENABLE, query).toString()).build();
    }

    @DELETE
    @Path("bon/{id}")
    public Response deleteBon(@PathParam("id") String id) throws JSONException {

        this.orderService.deleteBonLivraison(id);
        return Response.ok().build();
    }

    @GET
    @Path("bon/items/{id}")
    public Response getBonItems(@PathParam("id") String id, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @DefaultValue("") @QueryParam(value = "query") String query,
            @DefaultValue("ALL") @QueryParam(value = "filtre") EntreeStockDetailFiltre filtre,
            @DefaultValue("false") @QueryParam(value = "checkDatePeremption") Boolean checkDatePeremption) {

        return Response.ok().entity(
                orderService.getListBonsDetails(id, query, start, limit, filtre, checkDatePeremption).toString())
                .build();
    }

    @PUT
    @Path("remove-lots")
    public Response removeLots(DeleteLot deleteLot) {
        this.orderService.removeLot(deleteLot);
        return Response.ok().build();
    }

    @POST
    @Path("add-lot")
    public Response addLot(AddLot addLot) {

        return Response.ok(this.orderService.addLot(addLot).toString()).build();
    }

    @GET
    @Path("produit/commande/{id}")
    public Response getListBonsDetailsByProduits(@PathParam("id") String id, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "start") int start, @QueryParam(value = "search") String search,
            @QueryParam(value = "limit") int limit) throws JSONException {

        return Response
                .ok().entity(orderService
                        .getListBonsDetailsByProduits(id, search, dtStart, dtEnd, start, limit, grossisteId).toString())
                .build();
    }
}
