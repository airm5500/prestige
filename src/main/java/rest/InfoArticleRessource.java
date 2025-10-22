
package rest;

import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.InfoArticleService;
import rest.service.dto.InfoArticleDTO;
import util.DateUtil;

/**
 *
 * @author airman
 */
@Path("v1/info")
@Produces(MediaType.APPLICATION_JSON)

public class InfoArticleRessource {

    @EJB
    private InfoArticleService infoArticleService;

    @GET
    public Response getInfoArticles(@QueryParam("search") String search, @QueryParam("dtStart") String dtStartStr) {

        if (search == null) {
            search = "";
        }

        // Par défaut, on prend les données des 6 derniers mois.
        LocalDate dtStart = DateUtil.getNthLastMonthFromNow(6);
        if (dtStartStr != null && !dtStartStr.isEmpty()) {
            try {
                dtStart = DateUtil.fromString(dtStartStr);
            } catch (Exception e) {
                // Gérer l'erreur de format de date si nécessaire
            }
        }

        List<InfoArticleDTO> data = infoArticleService.fetchInfoArticles(dtStart, search);
        return Response.ok().entity(data).build();
    }
}
