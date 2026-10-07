package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.MobileService;
import rest.service.SessionHelperService;
import rest.service.impl.ImagesProduit;

/**
 * API des telephones (plan d'octobre, lot L13). Tout passe par {@code Authorization: Bearer <jeton>} (verifie par
 * filter.AuthenticationFilter), sauf la connexion qui le delivre. Les chemins mobiles existants ne changent pas.
 */
@Path("v1/mobile")
@Produces(MediaType.APPLICATION_JSON)
public class MobileRessource {

    @EJB
    private MobileService service;
    @EJB
    private SessionHelperService session;
    @Context
    private HttpServletRequest requete;

    private static JSONObject corps(String c) {
        try {
            return StringUtils.isBlank(c) ? new JSONObject() : new JSONObject(c);
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }

    private TUser utilisateur() {
        return session.getCurrentUser();
    }

    private String jeton() {
        String a = requete.getHeader("Authorization");
        return a != null && a.startsWith("Bearer ") ? a.substring(7).trim() : null;
    }

    /** {login, motDePasse, appareil, nomAppareil} -> {jeton, expiration, utilisateur, employe, droits}. */
    @POST
    @Path("connexion")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response connexion(String c) {
        JSONObject s = corps(c);
        return json(service.connexion(s.optString("login", null), s.optString("motDePasse", null),
                s.optString("appareil", null), s.optString("nomAppareil", null), requete.getRemoteAddr()));
    }

    @GET
    @Path("moi")
    public Response moi() {
        return json(service.moi(utilisateur()));
    }

    /** {sens?: ENTREE|SORTIE, code?: QR scanne, latitude?, longitude?, precision?} */
    @POST
    @Path("pointages")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response pointer(String c) {
        return json(service.pointer(utilisateur(), service.terminalDuJeton(jeton()), corps(c)));
    }

    @GET
    @Path("pointages")
    public Response mesPointages() {
        return json(service.mesPointages(utilisateur()));
    }

    @GET
    @Path("produits")
    public Response produits(@QueryParam("q") String q) {
        return json(service.produits(q));
    }

    /** Photo prise avec le telephone : multipart, champ fichier + « principale » facultatif. */
    @POST
    @Path("produits/{familleId}/images")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response photo(@PathParam("familleId") String familleId) {
        try {
            ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
            upload.setFileSizeMax(ImagesProduit.TAILLE_MAX);
            upload.setSizeMax(ImagesProduit.TAILLE_MAX + 64 * 1024);
            boolean principale = false;
            FileItem image = null;
            for (FileItem item : upload.parseRequest(requete)) {
                if (item.isFormField() && "principale".equals(item.getFieldName())) {
                    principale = "true".equals(item.getString()) || "on".equals(item.getString());
                } else if (!item.isFormField() && image == null) {
                    image = item;
                }
            }
            if (image == null) {
                return json(new JSONObject().put("success", false).put("message", "Aucune image reçue."));
            }
            return json(service.ajouterPhoto(utilisateur(), familleId, image.getInputStream(), principale));
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException
                | org.apache.commons.fileupload.FileUploadBase.FileSizeLimitExceededException e) {
            return json(new JSONObject().put("success", false).put("message", "L'image dépasse 5 Mo."));
        } catch (Exception e) {
            return json(new JSONObject().put("success", false).put("message", "L'image n'a pas pu être lue."));
        }
    }
}
