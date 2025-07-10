/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleHeader;
import commonTasks.dto.GenererFactureDTO;
import dal.RuptureDetail;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TUser;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.OrderService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/rupture")
@Produces("application/json")
@Consumes("application/json")
public class RuptureRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    OrderService orderService;

    @GET
    public Response listeRuptures(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "query") String query, @QueryParam(value = "grossisteId") String grossisteId)
            throws JSONException {
        JSONObject json = orderService.listeRuptures(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query,
                grossisteId, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response removeRupture(@PathParam("id") String id) throws JSONException {
        JSONObject json = orderService.removeRupture(id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam("id") String orderId, @QueryParam("organismeId") String organismeId) {
        StreamingOutput output = (OutputStream out) -> {
            try {
                List<RuptureDetail> detailses = orderService.ruptureDetaisDtoByRupture(orderId);
                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';').withHeader(ArticleHeader.class)
                        .print(writer)) {

                    detailses.forEach(f -> {
                        try {
                            TFamille famille = f.getProduit();
                            TFamilleGrossiste tfg = orderService.findOrCreateFamilleGrossisteByFamilleAndGrossiste(
                                    famille, orderService.findGrossiste(organismeId));
                            if (!StringUtils.isEmpty(famille.getIntEAN13()) && famille.getIntEAN13().length() == 13) {
                                printer.printRecord(famille.getIntEAN13(), f.getQty());
                            } else {
                                printer.printRecord(tfg.getStrCODEARTICLE(), f.getQty());
                            }

                        } catch (IOException ex) {

                        }
                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "rupture_liste_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("H_mm_ss"))
                + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    @POST
    @Path("fusionner")
    public Response genererFactureTemporaire(GenererFactureDTO datas) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        datas.setOperateur(tu);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = orderService.creerRupture(datas);
        return Response.ok().entity(jsono.toString()).build();
    }
}
