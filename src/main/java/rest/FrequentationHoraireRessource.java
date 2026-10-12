package rest;

import dal.TUser;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.FrequentationHoraireService;
import util.Constant;

/** Analyse de frequentation horaire (besoins du 11/10, point 12), en REST. */
@Path("v1/frequentation-horaire")
@Produces(MediaType.APPLICATION_JSON)
public class FrequentationHoraireRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private FrequentationHoraireService service;

    @GET
    public Response analyser(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("tranche") int tranche) {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        LocalDate d, f;
        try {
            f = fin == null || fin.isBlank() ? LocalDate.now() : LocalDate.parse(fin);
            d = debut == null || debut.isBlank() ? f : LocalDate.parse(debut);
        } catch (DateTimeParseException e) {
            return Response.ok(new JSONObject().put("success", false).put("msg", "Dates invalides.").toString())
                    .build();
        }
        if (d.isAfter(f)) {
            return Response.ok(new JSONObject().put("success", false)
                    .put("msg", "La date de début est après la date de fin.").toString()).build();
        }
        if (tranche < 0 || tranche > 6) {
            return Response.ok(new JSONObject().put("success", false).put("msg", "Tranche de 1 à 6 heures.").toString())
                    .build();
        }
        return Response.ok(service.analyser(d, f, tranche).toString()).build();
    }
}
