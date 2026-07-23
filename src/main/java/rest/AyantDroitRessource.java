package rest;

import bll.configManagement.ayantDroitManagement;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.AyantDroitService;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import util.Constant;

/**
 * Gestion des ayants droits en REST. La CONSULTATION passe par un service optimise (pagination SQL) ; la CREATION et la
 * MODIFICATION delegent aux MEMES methodes metier bll.ayantDroitManagement que la JSP historique (createAyantdroit /
 * updateAyantdroit) : memes regles, memes valeurs par defaut. La suppression definitive est remplacee par
 * desactiver/reactiver.
 */
@Path("v1/ayants-droits")
@Produces("application/json")
@Consumes("application/json")
public class AyantDroitRessource {

    private static final Logger LOG = Logger.getLogger(AyantDroitRessource.class.getName());
    /** Valeurs par defaut historiques de ws_transaction.jsp. */
    private static final String CATEGORIE_AYANT_DROIT_DEFAUT = "555146116095894790";
    private static final String RISQUE_DEFAUT = "55181642844215217016";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private AyantDroitService ayantDroitService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    private Response reponseTransaction(String success, String errors) {
        return Response.ok().entity(
                new JSONObject().put("success", success).put("errors", StringUtils.defaultString(errors)).toString())
                .build();
    }

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @QueryParam("lg_CLIENT_ID") String clientId, @QueryParam("lgCLIENTID") String clientIdBis,
            @DefaultValue("true") @QueryParam("actifs") boolean actifs,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        String client = StringUtils.isNotBlank(clientId) ? clientId : clientIdBis;
        return Response.ok().entity(ayantDroitService.list(user, search, client, actifs, start, limit).toString())
                .build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("lg_CLIENT_ID") String clientId,
            @FormParam("lg_CATEGORIE_AYANTDROIT_ID") String categorieId, @FormParam("str_FIRST_NAME") String firstName,
            @FormParam("str_LAST_NAME") String lastName, @FormParam("str_SEXE") String sexe,
            @FormParam("dt_NAISSANCE") String dtNaissance, @FormParam("lg_VILLE_ID") String villeId,
            @FormParam("lg_RISQUE_ID") String risqueId,
            @FormParam("str_NUMERO_SECURITE_SOCIAL") String numeroSecuriteSocial,
            @FormParam("str_CODE_INTERNE") String codeInterne) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            ayantDroitManagement oadm = new ayantDroitManagement(odm);
            String categorie = StringUtils.isNotBlank(categorieId) ? categorieId : CATEGORIE_AYANT_DROIT_DEFAUT;
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            Date naissance = StringUtils.isNotBlank(dtNaissance)
                    ? new date().stringToDate(dtNaissance, date.formatterMysqlShort) : null;
            // MEME methode metier que la JSP historique (mode=create)
            oadm.createAyantdroit(StringUtils.defaultString(clientId), categorie, StringUtils.defaultString(firstName),
                    StringUtils.defaultString(lastName), StringUtils.defaultString(sexe), naissance,
                    StringUtils.defaultString(villeId), risque, StringUtils.defaultString(numeroSecuriteSocial),
                    StringUtils.defaultString(codeInterne));
            return reponseTransaction(oadm.getMessage(), oadm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "createAyantDroit", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de créer l'ayant droit");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_AYANTS_DROITS_ID") String ayantDroitId,
            @FormParam("lg_CLIENT_ID") String clientId, @FormParam("lg_CATEGORIE_AYANTDROIT_ID") String categorieId,
            @FormParam("str_FIRST_NAME") String firstName, @FormParam("str_LAST_NAME") String lastName,
            @FormParam("str_SEXE") String sexe, @FormParam("dt_NAISSANCE") String dtNaissance,
            @FormParam("lg_VILLE_ID") String villeId, @FormParam("lg_RISQUE_ID") String risqueId,
            @FormParam("str_NUMERO_SECURITE_SOCIAL") String numeroSecuriteSocial) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            ayantDroitManagement oadm = new ayantDroitManagement(odm);
            String categorie = StringUtils.isNotBlank(categorieId) ? categorieId : CATEGORIE_AYANT_DROIT_DEFAUT;
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            Date naissance = StringUtils.isNotBlank(dtNaissance)
                    ? new date().stringToDate(dtNaissance, date.formatterMysqlShort) : null;
            // MEME methode metier que la JSP historique (mode=update)
            oadm.updateAyantdroit(StringUtils.defaultString(ayantDroitId), StringUtils.defaultString(clientId),
                    categorie, StringUtils.defaultString(firstName), StringUtils.defaultString(lastName),
                    StringUtils.defaultString(sexe), naissance, StringUtils.defaultString(villeId), risque,
                    StringUtils.defaultString(numeroSecuriteSocial));
            return reponseTransaction(oadm.getMessage(), oadm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateAyantDroit", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de modifier l'ayant droit");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleStatut(@FormParam("lg_AYANTS_DROITS_ID") String ayantDroitId,
            @FormParam("actif") boolean actif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(ayantDroitService.toggleStatus(user, ayantDroitId, actif).toString()).build();
    }
}
