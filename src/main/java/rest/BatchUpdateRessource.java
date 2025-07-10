package rest;

import dal.TUser;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.enterprise.concurrent.ManagedExecutorService;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.service.StockReapproService;
import toolkits.parameters.commonparameter;

/**
 *
 * @author koben
 */
@Path("v1/update")
@Produces("application/json")
@Consumes("application/json")
public class BatchUpdateRessource {

    @Resource(name = "concurrent/__defaultManagedExecutorService")
    ManagedExecutorService mes;
    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private StockReapproService stockReapproService;

    @GET
    @Path("/compute-reappro")
    public Response computeReapprovisionnement() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter"))
                    .build();
        }
        mes.submit(stockReapproService::computeReappro);
        return Response.ok().entity(ResultFactory.getFailResult("Traitement en cours")).build();
    }

}
