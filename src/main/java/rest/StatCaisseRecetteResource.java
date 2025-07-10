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
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.json.JSONObject;
import rest.service.StatCaisseRecetteService;
import rest.service.dto.StatCaisseRecetteDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/stats-recette-caisse")
@Produces("application/json")
public class StatCaisseRecetteResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private StatCaisseRecetteService caisseRecetteService;

    @GET
    @Path("/data")
    public Response balanceCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeRglementId") String typeRglementId,
            @QueryParam(value = "groupByYear") Boolean groupByYear) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = caisseRecetteService.getStatCaisseRecettes(dtStart, dtEnd, typeRglementId, groupByYear,
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("export-csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeRglementId") String typeRglementId,
            @QueryParam(value = "groupByYear") Boolean groupByYear) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        StreamingOutput output = (OutputStream out) -> {
            try {
                List<StatCaisseRecetteDTO> data = caisseRecetteService.fetchStatCaisseRecettes(dtStart, dtEnd,
                        typeRglementId, groupByYear, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';')
                        .withHeader(StatCaisseRecetteResource.RecapHeader.class).print(writer)) {

                    data.forEach(f -> {
                        try {
                            // date,
                            // comptant,mobile,cb,cheque,virement,credit,remise,net,nbrClient,reglementTp,reglementDiff,montantBilletage,solde
                            printer.printRecord(f.getDisplayMvtDate(), f.getMontantEspece(), f.getMontantMobile(),
                                    f.getMontantCb(), f.getMontantCheque(), f.getMontantVirement(),
                                    f.getMontantCredit(), f.getMontantRemise(), f.getMontantNet(), f.getNbreClient(),
                                    f.getMontantReglementFacture(), f.getMontantReglementDiff(),
                                    f.getMontantBilletage(), f.getMontantSolde());
                        } catch (IOException ex) {
                            Logger.getLogger(StatCaisseRecetteResource.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "caisse_recette_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("H_mm_ss"))
                + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    enum RecapHeader {
        date, comptant, mobile, cb, cheque, virement, credit, remise, net, nbrClient, reglementTp, reglementDiff,
        billetage, solde
    }
}
