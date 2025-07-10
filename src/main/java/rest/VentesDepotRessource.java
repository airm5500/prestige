/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.SalesStatsParams;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.json.JSONArray;
import rest.service.impl.ImportationVente;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/vente-depot")
@Produces({ "application/json", "application/octet-stream" })
@Consumes("application/json")
public class VentesDepotRessource {

    @EJB
    ImportationVente importationVente;

    @GET
    @Path("export-ventestojson")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToJson(@QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "hStart") String hStart, @QueryParam(value = "hEnd") String hEnd,
            @DefaultValue("2") @QueryParam(value = "typeVenteId") String typeVenteId) {
        SalesStatsParams body = new SalesStatsParams();

        body.setQuery(query);
        body.setTypeVenteId(typeVenteId);
        body.setStatut(Constant.STATUT_IS_CLOSED);

        try {
            body.setDtStart(LocalDate.parse(dtStart));
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
        StreamingOutput output = (OutputStream out) -> {
            try {
                JSONArray json = importationVente.exportToJson(body);
                out.write(json.toString().getBytes());
                out.flush();

            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "liste_vente_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss"))
                + ".json";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    @GET
    @Path("as/order/{id}")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportVenteToJson(@PathParam("id") String id) {

        StreamingOutput output = (OutputStream out) -> {
            try {
                String json = importationVente.fromPreenregistrementItems(id);
                out.write(json.getBytes());
                out.flush();

            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "vente_depot_stock_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".json";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    // @GET
    // @Path("import-ventes/json")
    // @Produces(MediaType.APPLICATION_OCTET_STREAM)
    // public Response importFromJson() {
    // }
    // Executor executor;
    // public OrderResource {
    // executor = Executors.newSingleThreadExecutor();
    // }
}
