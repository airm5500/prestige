package rest;

import javax.ejb.EJB;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.mobile.MobileCatalogueDeltaService;
import rest.service.mobile.MobileClientRefService;
import rest.service.mobile.MobileOrdonnanceCorrectionService;

/**
 * Capacites du serveur pour Prestige Mobile : l'application n'utilise une evolution du serveur que si celui-ci
 * l'annonce ici (un ancien serveur repond 401/404 : l'application garde alors son fonctionnement d'origine). Prefixe
 * {@code v1/app-vente/} : session habituelle (cookie), sans exception dans filter.AuthenticationFilter.
 * <p>
 * {@code clientRef} (H4) : en-tete {@code X-Client-Ref} pris en compte sur {@code v1/vente/add/vno},
 * {@code v1/vente/add/assurance}, {@code v1/vente/add/depot} et {@code v1/retourfournisseur/new}, et relecture par
 * {@code GET v1/app-vente/client-ref/{ref}}. Faux si la table mobile_client_ref n'existe pas.
 * <p>
 * {@code catalogueDelta} (H5) : {@code GET v1/app-vente/catalogue/changements} (produits modifies depuis un instant) ;
 * {@code serveurMaintenant} donne l'horloge du serveur (point de depart d'une copie complete du catalogue).
 * <p>
 * {@code ordonnanceCorrections} (O4) : {@code POST/GET v1/app-vente/ordonnances/corrections} (apprentissages des
 * ordonnances partages entre terminaux). Faux si la table mobile_ordonnance_correction n'existe pas.
 */
@Path("v1/app-vente/capacites")
@Produces(MediaType.APPLICATION_JSON)
public class MobileCapacitesRessource {

    @EJB
    private MobileClientRefService clientRefService;
    @EJB
    private MobileCatalogueDeltaService catalogueDeltaService;
    @EJB
    private MobileOrdonnanceCorrectionService ordonnanceCorrectionService;

    @GET
    public Response capacites() {
        boolean clientRef = clientRefService.disponible();
        JSONObject o = new JSONObject().put("success", true).put("clientRef", clientRef).put("clientRefVersion",
                clientRef ? 1 : 0);
        o.put("catalogueDelta", true).put("catalogueDeltaVersion", 1).put("serveurMaintenant",
                MobileCatalogueDeltaService.format(catalogueDeltaService.maintenant()));
        boolean corrections = ordonnanceCorrectionService.disponible();
        o.put("ordonnanceCorrections", corrections).put("ordonnanceCorrectionsVersion", corrections ? 1 : 0);
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }
}
