
package rest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.AnalyseInvExportService;

/**
 *
 * @author airman
 */
@Path("v1")
public class AnalyseInvRessourceDataExport {

    private static final Logger LOG = Logger.getLogger(AnalyseInvRessourceDataExport.class.getName());

    @Inject
    private AnalyseInvExportService exportService;

    @GET
    @Path("analyse-inventaire-pdf")
    @Produces("application/pdf")
    public Response exportPdf(@QueryParam("inventaireId") String inventaireId,
            @QueryParam("inventaireName") String inventaireName, @QueryParam("filterType") String filterType) {
        try {
            byte[] pdfData = exportService.generatePdfReport(inventaireId, filterType);
            String fileName = "analyse_inventaire_"
                    + (inventaireName != null ? inventaireName.replaceAll("\\s+", "_") : inventaireId) + ".pdf";

            return Response.ok(pdfData, MediaType.APPLICATION_OCTET_STREAM)
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la generation de l'inventaire: " + inventaireId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("erreur creation pdf: " + e.getMessage()).build();
        }
    }

    @GET
    @Path("analyse-inventaire-excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam("inventaireId") String inventaireId,
            @QueryParam("inventaireName") String inventaireName, @QueryParam("filterType") String filterType) {
        try {
            byte[] excelData = exportService.generateExcelReport(inventaireId, filterType);
            String fileName = "analyse_inventaire_"
                    + (inventaireName != null ? inventaireName.replaceAll("\\s+", "_") : inventaireId) + ".xls";

            return Response.ok(excelData, "application/vnd.ms-excel")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la generation de l'inventaire: " + inventaireId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("erreur exportation excel: " + e.getMessage()).build();
        }
    }

    @GET
    @Path("analyse-inventaire-avancee-excel")
    @Produces("application/vnd.ms-excel")
    public Response exportAdvancedExcel(@QueryParam("inventaireId") String inventaireId,
            @QueryParam("inventaireName") String inventaireName) {
        try {
            byte[] excelData = exportService.generateAdvancedExcelReport(inventaireId);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String safeName = (inventaireName != null ? inventaireName.replaceAll("\\s+", "_") : inventaireId);
            String fileName = "analyse_avancee_" + safeName + "_" + timestamp + ".xls";

            return Response.ok(excelData, "application/vnd.ms-excel")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la generation de l'inventaire: " + inventaireId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Excel generation failed: " + e.getMessage()).build();
        }
    }
}
