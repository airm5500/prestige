package rest;

import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.FormParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.CampagneClientService;
import rest.service.dto.CampagneRequete;
import util.Constant;

/**
 * Campagnes SMS / WhatsApp depuis le suivi de consommation (point 2). Corps JSON commun : {clientIds:[...],
 * filtres:{...criteres du suivi...}, canal:'SMS'|'WHATSAPP', modeleId, message, medicament}.
 */
@Path("v1/notifications/clients")
@Produces("application/json")
@Consumes("application/json")
public class CampagneClientRessource {

    @EJB
    private CampagneClientService campagneClientService;
    @Context
    private HttpServletRequest servletRequest;

    /** Controle prealable obligatoire des numeros de la population visee. */
    @POST
    @Path("validate-phones")
    public Response controlerNumeros(String corps) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok()
                .entity(campagneClientService.controlerNumeros(CampagneRequete.depuisJson(corps)).toString()).build();
    }

    /** Export Excel des numeros non conformes (envoi de formulaire, champ « corps » = meme JSON). */
    @POST
    @Path("invalid-phones/excel")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces("application/vnd.ms-excel")
    public Response excelNonConformes(@FormParam("corps") String corps) throws java.io.IOException {
        if (utilisateur() == null) {
            return deconnecte();
        }
        byte[] fichier = campagneClientService.excelNonConformes(CampagneRequete.depuisJson(corps));
        return Response.ok(fichier, "application/vnd.ms-excel").encoding("UTF-8")
                .header("Content-Disposition", "attachment; filename=numeros_non_conformes.xls").build();
    }

    /**
     * Envoi SMS aux seuls contacts conformes : une notification par client (message personnalise), preparee dans une
     * transaction puis envoyee de facon asynchrone par le pipeline SMS existant.
     */
    @POST
    @Path("send-sms")
    public Response envoyerSms(String corps) {
        TUser utilisateur = utilisateur();
        if (utilisateur == null) {
            return deconnecte();
        }
        CampagneRequete requete = CampagneRequete.depuisJson(corps);
        JSONObject controle = campagneClientService.controlerNumeros(requete);
        if (!controle.optBoolean("success")) {
            return Response.ok().entity(controle.toString()).build();
        }
        if (controle.optInt("nbConformes") == 0) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("msg", "Aucun numéro conforme : aucun SMS n'a été envoyé").toString()).build();
        }
        List<String> ids = campagneClientService.preparerSms(utilisateur, requete);
        if (ids.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("msg", "Le message est vide : aucun SMS n'a été envoyé").toString()).build();
        }
        campagneClientService.lancerEnvois(ids);
        return Response.ok().entity(new JSONObject().put("success", true).put("envoyes", ids.size())
                .put("ignores", controle.optInt("nbNonConformes"))
                .put("msg", ids.size() + " SMS remis à l'expédition (suivi dans le menu Notifications)").toString())
                .build();
    }

    /** Liens WhatsApp assistes (un par contact conforme), message prerempli. */
    @POST
    @Path("whatsapp-liens")
    public Response liensWhatsapp(String corps) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok().entity(campagneClientService.liensWhatsapp(CampagneRequete.depuisJson(corps)).toString())
                .build();
    }

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
    }
}
