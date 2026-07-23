package rest;

import bll.configManagement.grossisteManagement;
import dal.TUser;
import dal.dataManager;
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
import rest.service.GrossisteService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Gestion des grossistes en REST. La CONSULTATION passe par un service optimise (pagination SQL) ; la CREATION et la
 * MODIFICATION delegent aux MEMES methodes metier bll.grossisteManagement que la JSP historique (create / update) :
 * memes regles, memes messages. La suppression definitive est remplacee par desactiver/reactiver.
 */
@Path("v1/grossistes")
@Produces("application/json")
@Consumes("application/json")
public class GrossisteRessource {

    private static final Logger LOG = Logger.getLogger(GrossisteRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private GrossisteService grossisteService;

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
            @DefaultValue("true") @QueryParam("actifs") boolean actifs,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(grossisteService.list(user, search, actifs, start, limit).toString()).build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("str_LIBELLE") String libelle, @FormParam("str_DESCRIPTION") String description,
            @FormParam("str_ADRESSE_RUE_1") String adresseRue1, @FormParam("str_ADRESSE_RUE_2") String adresseRue2,
            @FormParam("str_CODE_POSTAL") String codePostal,
            @FormParam("str_BUREAU_DISTRIBUTEUR") String bureauDistributeur, @FormParam("str_MOBILE") String mobile,
            @FormParam("str_TELEPHONE") String telephone,
            @DefaultValue("0") @FormParam("int_DELAI_REGLEMENT_AUTORISE") int delaiReglementAutorise,
            @FormParam("lg_TYPE_REGLEMENT_ID") String typeReglementId, @FormParam("lg_VILLE_ID") String villeId,
            @DefaultValue("0") @FormParam("dbl_CHIFFRE_DAFFAIRE") double chiffreDaffaire,
            @FormParam("str_CODE") String code,
            @DefaultValue("0") @FormParam("int_DELAI_REAPPROVISIONNEMENT") int delaiReapprovisionnement,
            @DefaultValue("0") @FormParam("int_COEF_SECURITY") int coefSecurity,
            @DefaultValue("0") @FormParam("int_DATE_BUTOIR_ARTICLE") int dateButoirArticle,
            @FormParam("groupeId") String groupeId, @FormParam("idrepartiteur") String idRepartiteur,
            @FormParam("str_URL_PHARMAML") String urlPharmaMl,
            @FormParam("str_CODE_RECEPTEUR_PHARMA") String codeRecepteurPharma,
            @FormParam("str_ID_RECEPTEUR_PHARMA") String idRecepteurPharma,
            @FormParam("str_OFFICINE_ID") String officineId) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // MEME methode metier que la JSP historique (mode=create)
            grossisteManagement ogm = new grossisteManagement(odm);
            ogm.create(libelle, description, adresseRue1, adresseRue2, codePostal, bureauDistributeur, mobile,
                    telephone, delaiReglementAutorise, StringUtils.defaultString(typeReglementId),
                    StringUtils.defaultString(villeId), chiffreDaffaire, StringUtils.defaultString(code),
                    delaiReapprovisionnement, coefSecurity, dateButoirArticle, StringUtils.trimToNull(groupeId),
                    StringUtils.trimToNull(idRepartiteur), StringUtils.defaultString(urlPharmaMl),
                    StringUtils.defaultString(codeRecepteurPharma), StringUtils.defaultString(idRecepteurPharma),
                    StringUtils.defaultString(officineId));
            return reponseTransaction(ogm.getMessage(), ogm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "createGrossiste", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de créer le grossiste");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_GROSSISTE_ID") String grossisteId, @FormParam("str_LIBELLE") String libelle,
            @FormParam("str_DESCRIPTION") String description, @FormParam("str_ADRESSE_RUE_1") String adresseRue1,
            @FormParam("str_ADRESSE_RUE_2") String adresseRue2, @FormParam("str_CODE_POSTAL") String codePostal,
            @FormParam("str_BUREAU_DISTRIBUTEUR") String bureauDistributeur, @FormParam("str_MOBILE") String mobile,
            @FormParam("str_TELEPHONE") String telephone,
            @DefaultValue("0") @FormParam("int_DELAI_REGLEMENT_AUTORISE") int delaiReglementAutorise,
            @FormParam("lg_TYPE_REGLEMENT_ID") String typeReglementId, @FormParam("lg_VILLE_ID") String villeId,
            @FormParam("str_CODE") String code,
            @DefaultValue("0") @FormParam("int_DELAI_REAPPROVISIONNEMENT") int delaiReapprovisionnement,
            @DefaultValue("0") @FormParam("int_COEF_SECURITY") int coefSecurity,
            @DefaultValue("0") @FormParam("int_DATE_BUTOIR_ARTICLE") int dateButoirArticle,
            @FormParam("groupeId") String groupeId, @FormParam("idrepartiteur") String idRepartiteur,
            @FormParam("str_URL_PHARMAML") String urlPharmaMl,
            @FormParam("str_CODE_RECEPTEUR_PHARMA") String codeRecepteurPharma,
            @FormParam("str_ID_RECEPTEUR_PHARMA") String idRecepteurPharma,
            @FormParam("str_OFFICINE_ID") String officineId) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // MEME methode metier que la JSP historique (mode=update)
            grossisteManagement ogm = new grossisteManagement(odm);
            ogm.update(grossisteId, libelle, description, adresseRue1, adresseRue2, codePostal, bureauDistributeur,
                    mobile, telephone, delaiReglementAutorise, StringUtils.defaultString(typeReglementId),
                    StringUtils.defaultString(villeId), StringUtils.defaultString(code), delaiReapprovisionnement,
                    coefSecurity, dateButoirArticle, StringUtils.trimToNull(groupeId),
                    StringUtils.trimToNull(idRepartiteur), StringUtils.defaultString(urlPharmaMl),
                    StringUtils.defaultString(codeRecepteurPharma), StringUtils.defaultString(idRecepteurPharma),
                    StringUtils.defaultString(officineId));
            return reponseTransaction(ogm.getMessage(), ogm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateGrossiste", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de modifier le grossiste");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleStatut(@FormParam("lg_GROSSISTE_ID") String grossisteId, @FormParam("actif") boolean actif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(grossisteService.toggleStatus(user, grossisteId, actif).toString()).build();
    }
}
