package rest;

import bll.common.Parameter;
import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import rest.service.EtiquetteListeService;
import util.Constant;

/**
 * Ecran « Gestion des etiquettes ».
 *
 * <p>
 * Ces points remplacent, pour ce seul ecran, les pages {@code stockmanagement/etiquette/ws_data.jsp},
 * {@code ws_data_type_etiquette.jsp} et le mode {@code delete} de {@code ws_transaction.jsp}. Les pages restent en
 * place ; verifie avant reprise : aucun autre ecran ne les appelle.
 *
 * @author koben
 */
@Path("v1/etiquette")
@Produces("application/json")
@Consumes("application/json")
public class EtiquetteRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EtiquetteListeService etiquetteListeService;

    private TUser utilisateur() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    /**
     * Lignes de la liste. Les noms des parametres sont ceux que l'ecran envoyait deja a la page JSP : les changer
     * aurait impose de reecrire la barre de filtres.
     */
    @GET
    public Response liste(@QueryParam("search_value") String recherche, @QueryParam("datedebut") String dateDebut,
            @QueryParam("datefin") String dateFin, @QueryParam("lg_TYPEETIQUETTE_ID") String typeEtiquetteId,
            @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        // Meme regle que la couche metier appelee par la page JSP : sans ce privilege, on ne voit que son emplacement.
        boolean touteActivite = Utils.hasAuthorityByName(Utils.getconnectedUserPrivileges(servletRequest),
                Parameter.P_SHOW_ALL_ACTIVITY);
        return Response.ok().entity(etiquetteListeService
                .liste(user, touteActivite, recherche, dateDebut, dateFin, typeEtiquetteId, start, limit).toString())
                .build();
    }

    /**
     * Types d'etiquette proposes dans le filtre.
     *
     * <p>
     * Deux noms pour le meme critere : la liste deroulante d'ExtJS envoie « query » d'elle-meme, alors que la barre de
     * filtres envoie « search_value ». La page JSP ne lisait que le second et ignorait donc la saisie faite dans la
     * liste ; les deux sont acceptes ici.
     */
    @GET
    @Path("types")
    public Response types(@QueryParam("search_value") String recherche, @QueryParam("query") String query,
            @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String critere = (recherche == null || recherche.trim().isEmpty()) ? query : recherche;
        return Response.ok().entity(etiquetteListeService.types(critere, start, limit).toString()).build();
    }

    /** Retire une ligne de la liste. */
    @DELETE
    @Path("{id}")
    public Response supprimer(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok().entity(etiquetteListeService.supprimer(id).toString()).build();
    }
}
