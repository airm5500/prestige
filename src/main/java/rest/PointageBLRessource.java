package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.PointageBLService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Retours du 09/10 (5) : pointage des BL et avoirs grossistes et rapprochement avec le releve PDF du grossiste (droit
 * du menu P_SM_POINTAGE_BL). Modifications directement dans la liste (pas de fenetre de saisie).
 */
@Path("v1/pointage-bl")
@Produces("application/json")
public class PointageBLRessource {

    static final String P_SM_POINTAGE_BL = "P_SM_POINTAGE_BL";
    /** Un releve mensuel fait quelques pages : 10 Mo suffisent largement. */
    static final long TAILLE_MAX = 10L * 1024 * 1024;

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private PointageBLService service;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), P_SM_POINTAGE_BL);
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    /** null si l'acces est permis, sinon la reponse de refus. */
    private JSONObject refus() {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return echec("Vous n'avez pas le droit d'accéder au pointage des BL.").put("interdit", true);
        }
        return null;
    }

    private static String emplacement(TUser u) {
        return u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    private static LocalDate jour(String v, LocalDate defaut) {
        try {
            return StringUtils.isBlank(v) ? defaut : LocalDate.parse(v.trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    @GET
    public Response liste(@QueryParam("grossiste") String grossiste, @QueryParam("du") String du,
            @QueryParam("au") String au, @QueryParam("etat") String etat) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        if (StringUtils.isBlank(grossiste)) {
            return json(echec("Choisissez un grossiste."));
        }
        LocalDate fin = jour(au, LocalDate.now()), debut = jour(du, fin.withDayOfMonth(1));
        if (debut.isAfter(fin)) {
            return json(echec("La date de début est après la date de fin."));
        }
        if (debut.plusYears(1).isBefore(fin)) {
            return json(echec("Période trop longue : un an au plus."));
        }
        return json(service.liste(grossiste.trim(), emplacement(utilisateur()), debut, fin, etat));
    }

    /** type = BL | RETOUR ; pointe = true / false. */
    @PUT
    @Path("pointer/{type}/{id}")
    public Response pointer(@PathParam("type") String type, @PathParam("id") String id,
            @QueryParam("pointe") boolean pointe) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.pointer(type, id, pointe, utilisateur().getLgUSERID()));
    }

    @PUT
    @Path("sequence/{blId}")
    public Response sequence(@PathParam("blId") String blId, @QueryParam("valeur") String valeur) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.sequence(blId, valeur));
    }

    @PUT
    @Path("avoir/{retourId}")
    public Response referenceAvoir(@PathParam("retourId") String retourId, @QueryParam("valeur") String valeur) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.referenceAvoir(retourId, valeur));
    }

    /** Import du releve PDF (reponse text/html : l'envoi de fichier d'ExtJS passe par une iframe cachee). */
    @POST
    @Path("releve")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    public Response importer() {
        JSONObject r = refus();
        if (r != null) {
            return Response.ok(r.toString()).build();
        }
        try {
            ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
            upload.setFileSizeMax(TAILLE_MAX);
            upload.setSizeMax(TAILLE_MAX + 64 * 1024);
            String grossiste = null;
            FileItem pdf = null;
            for (FileItem item : upload.parseRequest(servletRequest)) {
                if (item.isFormField() && "grossiste".equals(item.getFieldName())) {
                    grossiste = StringUtils.trimToNull(item.getString("UTF-8"));
                } else if (!item.isFormField() && pdf == null) {
                    pdf = item;
                }
            }
            if (grossiste == null) {
                return Response.ok(echec("Choisissez le grossiste du relevé.").toString()).build();
            }
            if (pdf == null || pdf.getSize() == 0) {
                return Response.ok(echec("Aucun fichier reçu.").toString()).build();
            }
            String nom = StringUtils.defaultString(pdf.getName());
            nom = nom.substring(Math.max(nom.lastIndexOf('/'), nom.lastIndexOf('\\')) + 1);
            if (!nom.toLowerCase().endsWith(".pdf")) {
                return Response.ok(echec("Le relevé doit être un fichier PDF.").toString()).build();
            }
            TUser u = utilisateur();
            return Response.ok(
                    service.importer(grossiste, emplacement(u), nom, pdf.getInputStream(), u.getLgUSERID()).toString())
                    .build();
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException
                | org.apache.commons.fileupload.FileUploadBase.FileSizeLimitExceededException e) {
            return Response.ok(echec("Le fichier dépasse 10 Mo.").toString()).build();
        } catch (Exception e) {
            return Response.ok(echec("Le PDF n'a pas pu être lu (fichier abîmé ou protégé).").toString()).build();
        }
    }

    @GET
    @Path("releve/{id}")
    public Response releve(@PathParam("id") String id) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.releve(id));
    }

    @GET
    @Path("releves")
    public Response releves(@QueryParam("grossiste") String grossiste) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.releves(StringUtils.defaultString(grossiste), emplacement(utilisateur())));
    }

    @PUT
    @Path("releve/{id}/pointer")
    public Response pointerRapproches(@PathParam("id") String id) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.pointerRapproches(id, utilisateur().getLgUSERID()));
    }
}
