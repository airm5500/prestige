package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.OrdonnanceClientSaisie;
import rest.service.impl.OrdonnanceClientService;
import rest.service.impl.OrdonnanceClientSql;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Ordonnances des clients (evolution 6, point 2, vague 1).
 *
 * <p>
 * Chaque service verifie le privilege AVANT de repondre : la consultation demande {@code P_ORDONNANCE_CLIENT},
 * l'ecriture {@code P_ORDONNANCE_CLIENT_MAJ}. Masquer un bouton dans l'ecran n'est pas un controle d'acces - un appel
 * direct au service le contournerait, et il s'agit ici de donnees de sante.
 *
 * <p>
 * Aucun de ces services ne cree de vente, ne bouge de stock ni n'ecrit dans l'ordonnancier reglementaire.
 */
@Path("v1/ordonnance-client")
@Produces("application/json")
@Consumes("application/json")
public class OrdonnanceClientRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private OrdonnanceClientService ordonnanceService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private List<TPrivilege> privilegesSession() {
        return (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    }

    private boolean autorise(String privilege) {
        return CommonUtils.hasAuthorityByName(privilegesSession(), privilege);
    }

    private static Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                .put("message", Constant.DECONNECTED_MESSAGE).toString()).build();
    }

    private static Response refus(String message) {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("total", 0).put("message", message).toString())
                .build();
    }

    private static Response refusConsultation() {
        return refus("Votre profil ne donne pas accès aux ordonnances des clients.");
    }

    private static Response refusEcriture() {
        return refus("Votre profil ne permet pas de saisir ou de modifier une ordonnance.");
    }

    /**
     * Ce a quoi l'operateur a droit : l'ecran s'en sert pour n'offrir que les gestes possibles, le serveur continuant a
     * verifier chaque appel.
     */
    @GET
    @Path("droits")
    public Response droits() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true)
                        .put("consulter", autorise(DateConverter.P_ORDONNANCE_CLIENT))
                        .put("modifier", autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)).toString())
                .build();
    }

    /** Historique, du plus recent au plus ancien, filtre par client, type de client, prescripteur et periode. */
    @GET
    @Path("liste")
    public Response liste(@QueryParam("query") String query, @QueryParam("clientId") String clientId,
            @QueryParam("typeClientId") String typeClientId, @QueryParam("medecinId") String medecinId,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("annulees") @DefaultValue("false") boolean annulees,
            @QueryParam("start") @DefaultValue("0") int start, @QueryParam("limit") @DefaultValue("50") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok()
                .entity(ordonnanceService
                        .liste(criteres(query, clientId, typeClientId, medecinId, debut, fin, annulees), start, limit)
                        .toString())
                .build();
    }

    /** Une ordonnance et ses produits. */
    @GET
    @Path("{id}")
    public Response detail(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.detail(id).toString()).build();
    }

    /** Creation (sans {@code id}) ou modification (avec) d'une ordonnance. */
    @POST
    @Path("enregistrer")
    public Response enregistrer(String corps) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        JSONObject requete;
        try {
            requete = new JSONObject(corps);
        } catch (RuntimeException e) {
            return refus("La saisie n'a pas pu être lue.");
        }
        return Response.ok().entity(ordonnanceService.enregistrer(requete, operateur).toString()).build();
    }

    /**
     * Annulation d'une ordonnance, avec son motif. Il n'y a pas de suppression : le document reste dans l'historique du
     * client, annule et trace.
     */
    @POST
    @Path("annuler")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response annuler(@QueryParam("id") String id, @QueryParam("motif") String motif) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        return Response.ok().entity(ordonnanceService.annuler(id, motif, operateur).toString()).build();
    }

    /** Prescripteurs actifs (referentiel medecins existant). */
    @GET
    @Path("medecins")
    public Response medecins(@QueryParam("query") String query) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.medecins(query).toString()).build();
    }

    /** Types de client (carnet, assurance, standard) pour le filtre de l'historique. */
    @GET
    @Path("types-client")
    public Response typesClient() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.typesClient().toString()).build();
    }

    /** Etablissements deja saisis, proposes a la frappe. */
    @GET
    @Path("etablissements")
    public Response etablissements(@QueryParam("query") String query) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.etablissements(query).toString()).build();
    }

    private static OrdonnanceClientSql.Criteres criteres(String query, String clientId, String typeClientId,
            String medecinId, String debut, String fin, boolean annulees) {
        LocalDate d = OrdonnanceClientSaisie.date(debut);
        LocalDate f = OrdonnanceClientSaisie.date(fin);
        return new OrdonnanceClientSql.Criteres(query, clientId, typeClientId, medecinId, d, f, annulees);
    }
}
