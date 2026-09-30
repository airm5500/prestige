package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import util.CommonUtils;
import dal.TPrivilege;
import java.util.List;
import rest.service.impl.DossierClientService;
import rest.service.impl.OrdonnanceClientService;
import util.DateConverter;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Suivi de consommation d'un client, depuis l'ECRAN DE VENTE (retour du 30/09) : bouton sur la ligne du client
 * standard.
 *
 * <p>
 * Lecture seule : les memes donnees que le suivi de consommation des ordonnances (achats, frequence, dernier achat,
 * habitude, stock de l'emplacement de l'operateur). Ouvert a tout operateur connecte : la caisse voit deja le client
 * qu'elle sert, sans avoir le droit de gerer les ordonnances.
 */
@Path("v1/vente-suivi-conso")
@Produces("application/json")
public class VenteSuiviConsoRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private OrdonnanceClientService ordonnanceService;

    @EJB
    private DossierClientService dossierService;

    /**
     * Fiche du client en tete du suivi (maquette validee le 30/09). La partie clinique (terrains, allergies,
     * parametres) n'est rendue qu'avec le droit de consulter les ordonnances clients, verifie ici.
     */
    @GET
    @Path("client/{clientId}/fiche")
    @SuppressWarnings("unchecked")
    public Response fiche(@PathParam("clientId") String clientId) {
        TUser operateur = (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
        if (operateur == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        boolean clinique = CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                DateConverter.P_ORDONNANCE_CLIENT);
        return Response.ok().entity(dossierService.ficheVente(clientId, clinique).toString()).build();
    }

    @GET
    @Path("client/{clientId}")
    public Response consommation(@PathParam("clientId") String clientId, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin) {
        TUser operateur = (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
        if (operateur == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        String nom = ordonnanceService.nomClient(clientId);
        if (nom == null) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Choisissez d'abord le client de la vente.").toString()).build();
        }
        String emplacement = operateur.getLgEMPLACEMENTID() == null ? null
                : operateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONObject r = ordonnanceService.consommationClient(clientId, debut, fin, emplacement);
        return Response.ok().entity(r.put("client", nom).toString()).build();
    }
}
