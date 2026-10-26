package rest;

import filter.AuthenticationFilter;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
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
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.UploadContext;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.BornePointageService;
import rest.service.impl.BornePointageService.Borne;

/**
 * Routes d'une BORNE DE POINTAGE (demande mobile 57) : sans session ni cookie, chaque appel signe et verifie par le
 * filtre d'entree (AuthenticationFilter), qui pose la borne dans la requete. Memes services et memes regles que le
 * terminal de pointage (demande 52).
 */
@Path("v1/borne-pointage")
@Produces(MediaType.APPLICATION_JSON)
public class BornePointageRessource {

    @Context
    private HttpServletRequest requete;
    @EJB
    private BornePointageService bornes;
    @EJB
    private rest.service.RhService rh;
    @EJB
    private rest.service.RhPointageService pointages;
    @EJB
    private rest.service.EmpreinteService empreintes;
    @EJB
    private rest.service.LogService logService;

    private Borne borne() {
        return (Borne) requete.getAttribute(AuthenticationFilter.ATTRIBUT_BORNE);
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static JSONObject corps(String c) {
        try {
            return StringUtils.isBlank(c) ? new JSONObject() : new JSONObject(c);
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }

    @GET
    @Path("moi")
    public Response moi() {
        Borne b = borne();
        return ok(new JSONObject().put("success", true).put("borneId", b.id).put("nom", b.nom).put("statut", b.statut)
                .put("empreintesPartagees", empreintes.partageActif()));
    }

    /** Memes champs reduits que pour le terminal (P_RH_POINTER). */
    @GET
    @Path("employes")
    public Response employes(@QueryParam("query") String query) {
        JSONObject o = rh.employes(query, false);
        JSONArray lu = o.optJSONArray("data"), reduit = new JSONArray();
        for (int i = 0; lu != null && i < lu.length(); i++) {
            JSONObject e = lu.getJSONObject(i), x = new JSONObject();
            for (String k : new String[] { "id", "matricule", "nom", "prenoms", "badge", "statut" }) {
                x.put(k, e.opt(k));
            }
            reduit.put(x);
        }
        return ok(new JSONObject().put("success", true).put("data", reduit));
    }

    @POST
    @Path("pointages")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response pointer(String c) {
        Borne b = borne();
        JSONObject s = corps(c);
        JSONObject r = pointages.saisirPointageBorne(s, b.id, b.nom);
        if (r.optBoolean("success") && !r.optBoolean("deja")) {
            dal.TUser auteur = bornes.enroleur(b);
            if (auteur != null) {
                logService.updateLogFile(auteur, r.optString("id"),
                        "Pointage par la borne " + b.nom + " pour " + bornes.nomEmploye(s.optString("employeId")),
                        dal.enumeration.TypeLog.BORNE_POINTAGE, auteur);
            }
        }
        return ok(r);
    }

    /** Photo de controle : multipart, champ « photo » (JPEG, 150 Ko et 1024 px au plus), « prise » facultatif. */
    @POST
    @Path("pointages/{id}/photo")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response photo(@PathParam("id") String id) {
        /* le corps a ete lu par le filtre (signature) : le multipart est relu depuis ces octets */
        byte[] brut = (byte[]) requete.getAttribute(AuthenticationFilter.ATTRIBUT_BORNE + "_CORPS");
        if (brut == null || brut.length > 2L * 1024 * 1024) {
            return ok(new JSONObject().put("success", false).put("msg", "Photo trop lourde : 150 Ko au plus."));
        }
        byte[] photo = null;
        String prise = null;
        try {
            for (FileItem item : new ServletFileUpload(new DiskFileItemFactory()).parseRequest(contexte(brut))) {
                if (item.isFormField() && "prise".equals(item.getFieldName())) {
                    prise = item.getString("UTF-8");
                } else if (!item.isFormField() && "photo".equals(item.getFieldName())) {
                    photo = item.get();
                }
            }
        } catch (FileUploadException | IOException e) {
            return ok(new JSONObject().put("success", false).put("msg", "Lecture de la photo impossible."));
        }
        return ok(pointages.enregistrerPhotoBorne(id, photo, prise, borne().id));
    }

    private UploadContext contexte(byte[] brut) {
        String type = requete.getContentType();
        return new UploadContext() {
            @Override
            public long contentLength() {
                return brut.length;
            }

            @Override
            public String getCharacterEncoding() {
                return "UTF-8";
            }

            @Override
            public String getContentType() {
                return type;
            }

            @Override
            @Deprecated
            public int getContentLength() {
                return brut.length;
            }

            @Override
            public InputStream getInputStream() {
                return new ByteArrayInputStream(brut);
            }
        };
    }

    /** Comme v1/rh/empreintes (demande 43), si le partage est actif ; lecture tracee. */
    @GET
    @Path("empreintes")
    public Response empreintes(@QueryParam("depuis") String depuis, @QueryParam("format") String format) {
        return Response.ok(empreintes.lireBorne(depuis, format, borne().id)).header("Cache-Control", "no-store")
                .build();
    }

}
