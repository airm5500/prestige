package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.json.JSONObject;
import rest.service.ImagesProduitService;
import rest.service.impl.ImagesProduit;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * IMAGES PRODUIT (plan d'octobre, section 6), utilisables par l'ecran et plus tard par un telephone :
 * <ul>
 * <li>GET {familleId} : liste ;</li>
 * <li>POST {familleId} (multipart, champ « principale » facultatif) : ajout ;</li>
 * <li>PUT {familleId}/{imageId}/principale : devient l'image principale ;</li>
 * <li>DELETE {familleId}/{imageId} : retrait (fichier compris) ;</li>
 * <li>GET {familleId}/{imageId}/fichier?taille=vignette|normale : l'image, en ligne.</li>
 * </ul>
 * Consultation : utilisateur connecte. Ajout, modification, retrait : droit P_PRODUIT_IMAGES_MAJ.
 */
@Path("v1/produit-images")
public class ImagesProduitRessource {

    public static final String DROIT = "P_PRODUIT_IMAGES_MAJ";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private ImagesProduitService service;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean peutModifier() {
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                DROIT);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }

    private static JSONObject echec(String m) {
        return new JSONObject().put("success", false).put("message", m);
    }

    @GET
    @Path("{familleId}")
    public Response lister(@PathParam("familleId") String familleId) {
        if (utilisateur() == null) {
            return json(echec(Constant.DECONNECTED_MESSAGE));
        }
        return json(service.lister(familleId).put("modifiable", peutModifier()));
    }

    /** Reponse en text/html : l'envoi de fichier d'ExtJS passe par une iframe cachee. */
    @POST
    @Path("{familleId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    public Response ajouter(@PathParam("familleId") String familleId) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.ok(echec(Constant.DECONNECTED_MESSAGE).toString()).build();
        }
        if (!peutModifier()) {
            return Response.ok(echec("Vous n'avez pas le droit de modifier les images des produits.").toString())
                    .build();
        }
        try {
            DiskFileItemFactory usine = new DiskFileItemFactory();
            ServletFileUpload upload = new ServletFileUpload(usine);
            /* Garde-fou en amont : la requete entiere est refusee au-dela de la limite (+ marge des champs). */
            upload.setFileSizeMax(ImagesProduit.TAILLE_MAX);
            upload.setSizeMax(ImagesProduit.TAILLE_MAX + 64 * 1024);
            boolean principale = false;
            FileItem image = null;
            for (FileItem item : upload.parseRequest(servletRequest)) {
                if (item.isFormField() && "principale".equals(item.getFieldName())) {
                    principale = "true".equals(item.getString()) || "on".equals(item.getString());
                } else if (!item.isFormField() && image == null) {
                    image = item;
                }
            }
            if (image == null) {
                return Response.ok(echec("Aucune image reçue.").toString()).build();
            }
            return Response.ok(service.ajouter(familleId, image.getInputStream(), principale, u).toString()).build();
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException
                | org.apache.commons.fileupload.FileUploadBase.FileSizeLimitExceededException e) {
            return Response.ok(echec("L'image dépasse 5 Mo.").toString()).build();
        } catch (Exception e) {
            return Response.ok(echec("L'image n'a pas pu être lue.").toString()).build();
        }
    }

    @PUT
    @Path("{familleId}/{imageId}/principale")
    public Response principale(@PathParam("familleId") String familleId, @PathParam("imageId") String imageId) {
        if (utilisateur() == null) {
            return json(echec(Constant.DECONNECTED_MESSAGE));
        }
        if (!peutModifier()) {
            return json(echec("Droit insuffisant."));
        }
        return json(service.definirPrincipale(familleId, imageId));
    }

    @DELETE
    @Path("{familleId}/{imageId}")
    public Response supprimer(@PathParam("familleId") String familleId, @PathParam("imageId") String imageId) {
        if (utilisateur() == null) {
            return json(echec(Constant.DECONNECTED_MESSAGE));
        }
        if (!peutModifier()) {
            return json(echec("Droit insuffisant."));
        }
        return json(service.supprimer(familleId, imageId));
    }

    @GET
    @Path("{familleId}/{imageId}/fichier")
    @Produces(MediaType.WILDCARD)
    public Response fichier(@PathParam("imageId") String imageId,
            @DefaultValue("normale") @QueryParam("taille") String taille) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Object[] f = service.fichier(imageId, "vignette".equals(taille));
        if (f == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        CacheControl cc = new CacheControl();
        cc.setPrivate(true);
        cc.setMaxAge(3600);
        return Response.ok(((java.nio.file.Path) f[0]).toFile()).type((String) f[1]).cacheControl(cc)
                .header("Content-Disposition", "inline").header("X-Content-Type-Options", "nosniff").build();
    }
}
