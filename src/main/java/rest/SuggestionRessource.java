/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.TUser;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
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
import rest.service.SuggestionService;
import rest.service.dto.ArticleCsvDTO;
import rest.service.dto.SuggestionDTO;
import rest.service.dto.SuggestionOrderDetailDTO;
import util.Constant;

/**
 * @author kkoffi
 */
@Path("v1/suggestion")
@Produces("application/json")
@Consumes("application/json")
public class SuggestionRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SuggestionService suggestionService;

    @GET
    @Path("csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam("id") String suggestionId) {
        StreamingOutput output = (OutputStream out) -> {
            try {
                List<ArticleCsvDTO> detailses = suggestionService.buildBySuggestion(suggestionId);
                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';').withHeader(ArticleHeader.class)
                        .print(writer)) {

                    detailses.forEach(f -> {
                        try {

                            printer.printRecord(f.getCodeCip(), f.getQty());
                        } catch (IOException ex) {
                            Logger.getLogger(SuggestionRessource.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "suggestion_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("H_mm_ss")) + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    enum ArticleHeader {
        CIP, QTE
    }

    @GET
    @Path("qty-detail/{id}")
    public Response tvastatCriterion(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = suggestionService.findCHDetailStock(id, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(json.toString()).build();
    }

    @DELETE
    @Path("item/{id}")
    public Response delete(@PathParam("id") String id) throws JSONException {

        this.suggestionService.removeItem(id);
        return Response.ok().build();
    }

    @GET
    @Path("amount/{id}")
    public Response getSuggestionAmount(@PathParam("id") String id) throws JSONException {

        return Response.ok().entity(new JSONObject(this.suggestionService.getSuggestionAmount(id)).toString()).build();
    }

    @POST
    @Path("item/add")
    public Response addItem(SuggestionOrderDetailDTO suggestionOrderDetail) {

        this.suggestionService.addItem(suggestionOrderDetail);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("item/update-seuil")
    public Response updateItemSeuil(SuggestionOrderDetailDTO suggestionOrderDetail) {

        this.suggestionService.updateItemSeuil(suggestionOrderDetail);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("item/update-qte-cmde")
    public Response updateItemQteCmde(SuggestionOrderDetailDTO suggestionOrderDetail) {

        this.suggestionService.updateItemQteCmde(suggestionOrderDetail);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("item/update-prixachat")
    public Response updateItemQtePrixPaf(SuggestionOrderDetailDTO suggestionOrderDetail) {

        this.suggestionService.updateItemQtePrixPaf(suggestionOrderDetail);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("item/update-prixvente")
    public Response updateItemQtePrixVente(SuggestionOrderDetailDTO suggestionOrderDetail) {

        this.suggestionService.updateItemQtePrixVente(suggestionOrderDetail);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("add")
    public Response create(SuggestionDTO suggestion) {

        SuggestionDTO result = this.suggestionService.create(suggestion);
        return Response.ok().entity(new JSONObject(result).toString()).build();
    }

    @GET
    @Path("list")
    public Response findAll(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) {

        return Response.ok().entity(this.suggestionService.fetch(query, start, limit).toString()).build();
    }

    @GET
    @Path("set-pending/{id}")
    public Response setToPending(@PathParam("id") String id) throws JSONException {

        this.suggestionService.setToPending(id);
        return Response.ok().build();
    }

    @GET
    @Path("list/items")
    public Response fetchItems(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String search, @QueryParam(value = "orderId") String orderId) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        return Response.ok().entity(this.suggestionService.fetchItems(orderId, search, tu, start, limit).toString())
                .build();
    }

    @DELETE
    @Path("suggestion/{id}")
    public Response deleteSuggestion(@PathParam("id") String id) throws JSONException {

        this.suggestionService.deleteSuggestion(id);
        return Response.ok().build();
    }

    @GET
    @Path("change-grossiste")
    public Response changeGrossiste(@QueryParam(value = "suggestionId") String suggestionId,
            @QueryParam(value = "grossisteId") String grossisteId) throws JSONException {

        boolean resp = this.suggestionService.changeGrossiste(suggestionId, grossisteId);
        return Response.ok(new JSONObject().put("response", resp).toString()).build();
    }

    @GET
    @Path("merge-suggestion")
    public Response mergeSuggestion(@QueryParam(value = "suggestionId") String suggestionId,
            @QueryParam(value = "grossisteId") String grossisteId) throws JSONException {

        this.suggestionService.mergeSuggestion(suggestionId, grossisteId);
        return Response.ok().build();
    }
}
