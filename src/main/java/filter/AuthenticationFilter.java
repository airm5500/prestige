package filter;

import dal.TUser;
import java.io.IOException;
import java.util.Objects;
import java.util.Set;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.Provider;
import rest.service.SessionHelperService;
import rest.service.dto.SessionHelperData;
import util.Constant;

/**
 *
 * @author koben
 */
@Provider
public class AuthenticationFilter implements ContainerRequestFilter {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SessionHelperService sessionHelperService;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (!skipPath(requestContext.getUriInfo().getPath()) && Objects.isNull(tu)) {

            requestContext.abortWith(
                    Response.status(Response.Status.UNAUTHORIZED).entity(Constant.DECONNECTED_MESSAGE).build());

        }

        if (Objects.nonNull(tu)) {
            this.sessionHelperService.setCurrentUser(tu);

            SessionHelperData data = new SessionHelperData(
                    Objects.isNull(hs.getAttribute(Constant.UPDATE_PRICE)) ? false
                            : (boolean) hs.getAttribute(Constant.UPDATE_PRICE),
                    Objects.isNull(hs.getAttribute(Constant.SHOW_VENTE)) ? false
                            : (boolean) hs.getAttribute(Constant.SHOW_VENTE),
                    Objects.isNull(hs.getAttribute(Constant.P_SHOW_ALL_ACTIVITY)) ? false
                            : (boolean) hs.getAttribute(Constant.P_SHOW_ALL_ACTIVITY));
            this.sessionHelperService.setData(data);
        }

    }

    private boolean skipPath(String path) {
        Set<String> paths = Set.of("v1/user/auth", "v1/user/logout", "v1/ws/", "v1/valorisation", "v1/valorisation/all",
                "v1/ca-comptant", "v1/ca-credit", "v1/reglements", "v1/factures", "v1/fournisseurs",
                "v1/achats-fournisseurs", "v1/stock", "v1/tierspayants", "v1/avoirs-fournisseurs", "v1/whareouse-vno",
                "v1/whareouse-maxmin", "v1/ca-all", "v1/checkproduit", "v1/ws/ca-achats-ventes", "v1/ws/inventaires",
                "v1/ws/inventaires/rayons", "v1/ws/inventaires/details", "v1/balance/etat-annuel",
                "v1/etat-control-bon/etat-annuel", "v1/balance/balanceventecaisse", "v1/recap/dashboardmob",
                "v1/recap/creditsmob", "v1/recap/credits/totauxmob", "v3/tvamobile", "v1/produit/stats/vente-annuellep",
                "v1/evaluation-vente/produit", "v1/info", "v1/officine");
        return paths.contains(path);
    }
}
