package rest;

import bll.configManagement.EmplacementManagement;
import dal.TOfficine;
import dal.TUser;
import dal.dataManager;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.OfficineService;
import toolkits.parameters.commonparameter;
import util.Constant;

@Path("v1/officine")
@Produces("application/json")
public class OfficineRessource {

    private static final Logger LOG = Logger.getLogger(OfficineRessource.class.getName());

    @Inject
    private OfficineService officineService;
    @Inject
    private HttpServletRequest servletRequest;

    @GET
    public Response getAllOfficines() {
        try {
            return Response.ok(officineService.getAllOfficines()).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Erreur lors de la récupération des officines").build();
        }
    }

    @GET
    @Path("principal")
    public Response getOfficine() {

        return Response.ok(new JSONObject(officineService.getOfficine()).toString()).build();

    }

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).toString()).build();
    }

    /**
     * Fiche de l'officine pour l'ecran Informations officine : meme format (tableau JSON) et memes cles que la JSP
     * historique webservices/sm_user/info_officine/ws_data.jsp.
     */
    @GET
    @Path("infos")
    public Response infos() {
        if (currentUser() == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            EmplacementManagement em = new EmplacementManagement(odm);
            TOfficine officine = em.getOfficine();
            JSONObject json = new JSONObject();
            json.put("lg_OFFICINE_ID", officine.getLgOFFICINEID());
            json.put("str_FIRST_NAME", officine.getStrFIRSTNAME());
            json.put("str_PHONE", StringUtils.isNotBlank(officine.getStrAUTRESPHONES())
                    ? officine.getStrPHONE() + ";" + officine.getStrAUTRESPHONES() : officine.getStrPHONE());
            json.put("str_NOM_ABREGE", officine.getStrNOMABREGE());
            json.put("str_NOM_COMPLET", officine.getStrNOMCOMPLET());
            json.put("str_COMMENTAIRE2", officine.getStrCOMMENTAIRE2());
            json.put("str_COMMENTAIRE1", officine.getStrCOMMENTAIRE1());
            json.put("str_ENTETE", officine.getStrENTETE());
            json.put("str_LAST_NAME", officine.getStrLASTNAME());
            json.put("str_ADRESSSE_POSTALE", officine.getStrADRESSSEPOSTALE());
            json.put("str_STATUT", officine.getStrSTATUT());
            json.put("str_NUM_COMPTABLE", officine.getStrNUMCOMPTABLE());
            json.put("str_COMMENTAIREOFFICINE", officine.getStrCOMMENTAIREOFFICINE());
            json.put("str_CENTRE_IMPOSITION", officine.getStrCENTREIMPOSITION());
            json.put("str_REGISTRE_IMPOSITION", officine.getStrREGISTREIMPOSITION());
            json.put("str_REGISTRE_COMMERCE", officine.getStrREGISTRECOMMERCE());
            json.put("str_COMPTE_CONTRIBUABLE", officine.getStrCOMPTECONTRIBUABLE());
            json.put("str_COMPTE_BANCAIRE",
                    officine.getStrCOMPTEBANCAIRE() != null ? officine.getStrCOMPTEBANCAIRE() : "");
            return Response.ok().entity(new JSONArray().put(json).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "infos officine", e);
            return Response.ok().entity(new JSONArray().toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Mise a jour de la fiche officine : delegue a la MEME methode metier bll.EmplacementManagement.updateOfficne que
     * la JSP historique (mode=update), avec les memes parametres.
     */
    @POST
    @Path("infos/update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response updateInfos(@FormParam("lg_OFFICINE_ID") String officineId,
            @FormParam("str_FIRST_NAME") String firstName, @FormParam("str_NOM_ABREGE") String nomAbrege,
            @FormParam("str_NOM_COMPLET") String nomComplet, @FormParam("str_LAST_NAME") String lastName,
            @FormParam("str_ADRESSSE_POSTALE") String adressePostale, @FormParam("str_PHONE") String phone,
            @FormParam("str_COMMENTAIRE1") String commentaire1, @FormParam("str_COMMENTAIRE2") String commentaire2,
            @FormParam("str_ENTETE") String entete, @FormParam("str_PHONE_OFFICINE") String phoneOfficine,
            @FormParam("str_COMPTE_CONTRIBUABLE") String compteContribuable,
            @FormParam("str_REGISTRE_COMMERCE") String registreCommerce,
            @FormParam("str_REGISTRE_IMPOSITION") String registreImposition,
            @FormParam("str_CENTRE_IMPOSITION") String centreImposition,
            @FormParam("str_NUM_COMPTABLE") String numComptable,
            @FormParam("str_COMMENTAIREOFFICINE") String commentaireOfficine,
            @FormParam("str_COMPTE_BANCAIRE") String compteBancaire) {
        if (currentUser() == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            EmplacementManagement em = new EmplacementManagement(odm);
            em.updateOfficne(StringUtils.defaultString(officineId), StringUtils.defaultString(firstName),
                    StringUtils.defaultString(nomAbrege), StringUtils.defaultString(nomComplet),
                    StringUtils.defaultString(lastName), StringUtils.defaultString(adressePostale),
                    StringUtils.defaultString(phone), StringUtils.defaultString(commentaire1),
                    StringUtils.defaultString(commentaire2), StringUtils.defaultString(entete),
                    StringUtils.defaultString(phoneOfficine), StringUtils.defaultString(compteContribuable),
                    StringUtils.defaultString(registreCommerce), StringUtils.defaultString(registreImposition),
                    StringUtils.defaultString(centreImposition), StringUtils.defaultString(numComptable),
                    StringUtils.defaultString(commentaireOfficine), StringUtils.defaultString(compteBancaire));
            return Response.ok().entity(new JSONObject().put("success", em.getMessage())
                    .put("errors", StringUtils.defaultString(em.getDetailmessage())).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "update officine", e);
            return Response.ok()
                    .entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                            .put("errors", "Impossible de mettre à jour les informations de l'officine").toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
