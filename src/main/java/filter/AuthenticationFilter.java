package filter;

import dal.TUser;
import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.Provider;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.PrivilegeService;
import rest.service.SessionHelperService;
import rest.service.UserService;
import rest.service.dto.SessionHelperData;
import util.Constant;

/**
 *
 * @author koben
 */
@Provider
public class AuthenticationFilter implements ContainerRequestFilter {

    private static final Set<String> SKIP_PATHS = Set.of("v1/user/auth", "v1/user/logout", "v1/ws/", "v1/valorisation",
            "v1/valorisation/all", "v1/ca-comptant", "v1/ca-credit", "v1/reglements", "v1/factures", "v1/fournisseurs",
            "v1/achats-fournisseurs", "v1/stock", "v1/tierspayants", "v1/avoirs-fournisseurs", "v1/whareouse-vno",
            "v1/whareouse-maxmin", "v1/ca-all", "v1/checkproduit", "v1/ws/ca-achats-ventes", "v1/ws/inventaires",
            "v1/ws/inventaires/rayons", "v1/ws/inventaires/details", "v1/balance/etat-annuel",
            "v1/etat-control-bon/etat-annuel", "v1/balance/balanceventecaisse", "v1/recap/dashboardmob",
            "v1/recap/creditsmob", "v1/recap/credits/totauxmob", "v3/tvamobile", "v1/produit/stats/vente-annuellep",
            "v1/evaluation-vente/produit", "v1/info", "v1/officine", "v1/modereglement", "v1/licence/find",
            "v1/licence/save/", "v1/motifreglement", "v1/modereglement/all");

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private SessionHelperService sessionHelperService;
    @EJB
    private UserService userService;
    @EJB
    private PrivilegeService privilegeService;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();
        TUser currentUser;
        String userS = requestContext.getHeaderString("X-User-Info");
        String token = requestContext.getHeaderString("X-Token-Exp");
        String client = requestContext.getHeaderString("X-client");

        String userId = null;
        if (StringUtils.isNotEmpty(userS)) {
            userId = new JSONObject(userS).getString("id");
        }
        if (StringUtils.isNotEmpty(userId) && StringUtils.isNotEmpty(token) && StringUtils.isNotEmpty(client)
                && Instant.parse(token).isAfter(Instant.now())) {
            currentUser = userService.findById(userId);

            sessionHelperService.setCurrentUser(currentUser);
            Set<String> lstTPrivilege = privilegeService.getPrivilegeByNames(
                    Set.of(Constant.P_BT_UPDATE_PRICE_EDIT, Constant.SHOW_VENTE, Constant.P_SHOW_ALL_ACTIVITY), userId);

            boolean canUpdatePrice = lstTPrivilege.contains(Constant.P_BT_UPDATE_PRICE_EDIT);

            boolean asAuthorityVente = lstTPrivilege.contains(Constant.SHOW_VENTE);
            boolean allActivitis = lstTPrivilege.contains(Constant.P_SHOW_ALL_ACTIVITY);

            SessionHelperData data = new SessionHelperData(canUpdatePrice, asAuthorityVente, allActivitis);
            sessionHelperService.setData(data);

        } else {
            HttpSession session = servletRequest.getSession();
            currentUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);

            if (currentUser != null) {
                sessionHelperService.setCurrentUser(currentUser);

                SessionHelperData data = new SessionHelperData(getBooleanAttribute(session, Constant.UPDATE_PRICE),
                        getBooleanAttribute(session, Constant.SHOW_VENTE),
                        getBooleanAttribute(session, Constant.P_SHOW_ALL_ACTIVITY));
                sessionHelperService.setData(data);
            }
        }
        if (!shouldSkipPath(path) && currentUser == null) {
            requestContext.abortWith(
                    Response.status(Response.Status.UNAUTHORIZED).entity(Constant.DECONNECTED_MESSAGE).build());

        }

    }

    private boolean shouldSkipPath(String path) {
        return SKIP_PATHS.contains(path);
    }

    private boolean getBooleanAttribute(HttpSession session, String attributeName) {
        Object attr = session.getAttribute(attributeName);
        if (attr instanceof Boolean) {
            return (Boolean) attr;
        }
        return false;
    }

}
